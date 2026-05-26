use crate::{
    common::encryption::EncryptionService,
    error::{AppError, AppResult},
    state::AppState,
};
use serde_json::{Value, json};
use sqlx::PgPool;
use totp_rs::{Algorithm, TOTP};
use uuid::Uuid;

pub struct MfaService {
    db: PgPool,
    enc: EncryptionService,
}

impl MfaService {
    pub fn from_state(state: &AppState) -> Self {
        Self {
            db: state.db.clone(),
            enc: state.encryption.clone(),
        }
    }

    fn make_totp(secret_bytes: &[u8], account: &str) -> AppResult<TOTP> {
        TOTP::new(
            Algorithm::SHA1,
            6,
            1,
            30,
            secret_bytes.to_vec(),
            Some("Schul-Dashboard".to_string()),
            account.to_string(),
        )
        .map_err(|e| AppError::internal(format!("TOTP init failed: {e}")))
    }

    pub async fn get_status(&self, user_id: Uuid) -> AppResult<Value> {
        let user = sqlx::query!(r#"SELECT mfa_enabled FROM users WHERE id = $1"#, user_id)
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("User not found."))?;

        Ok(json!({ "ok": true, "mfaEnabled": user.mfa_enabled }))
    }

    pub async fn setup(&self, user_id: Uuid) -> AppResult<Value> {
        let user = sqlx::query!(
            r#"SELECT email, mfa_enabled FROM users WHERE id = $1"#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("User not found."))?;

        if user.mfa_enabled {
            return Err(AppError::bad_request("MFA is already enabled."));
        }

        sqlx::query!(
            r#"DELETE FROM mfa_pending_secrets WHERE user_id = $1"#,
            user_id
        )
        .execute(&self.db)
        .await?;

        let secret_bytes: Vec<u8> = (0..20).map(|_| rand::random::<u8>()).collect();

        let secret_b32 =
            base32::encode(base32::Alphabet::Rfc4648 { padding: false }, &secret_bytes);

        let uid = user_id.to_string();

        let enc = self.enc.encrypt(&secret_b32, &uid).await?;

        let expires_at = chrono::Utc::now() + chrono::Duration::minutes(15);

        sqlx::query!(
            r#"INSERT INTO mfa_pending_secrets (user_id, encrypted_secret, expires_at) VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET encrypted_secret = $2, expires_at = $3"#,
            user_id,
            serde_json::to_value(&enc).unwrap(),
            expires_at,
        ).execute(&self.db).await?;

        let totp = Self::make_totp(&secret_bytes, &user.email)?;

        let otpauth = totp.get_url();

        let qr = qrcode_generator::to_png_to_vec(
            otpauth.as_bytes(),
            qrcode_generator::QrCodeEcc::Low,
            200,
        )
        .map_err(|e| AppError::internal(format!("QR generation failed: {e}")))?;

        let qr_b64 = format!(
            "data:image/png;base64,{}",
            base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &qr)
        );

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'mfa:setup:started', '{}'::jsonb)"#,
            user_id
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true, "qrCode": qr_b64, "secret": secret_b32, "expiresAt": expires_at }))
    }

    pub async fn activate(&self, user_id: Uuid, code: &str) -> AppResult<Value> {
        let row = sqlx::query!(
            r#"SELECT p.encrypted_secret, u.email
               FROM mfa_pending_secrets p
               JOIN users u ON u.id = p.user_id
               WHERE p.user_id = $1 AND p.expires_at > now()"#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::bad_request("Authentication failed."))?;

        let uid = user_id.to_string();

        let enc: crate::common::encryption::EncryptedPayload =
            serde_json::from_value(row.encrypted_secret)
                .map_err(|_| AppError::internal("Invalid encrypted secret"))?;

        let secret_b32 = self.enc.decrypt(&enc, &uid).await?;

        let secret_bytes =
            base32::decode(base32::Alphabet::Rfc4648 { padding: false }, &secret_b32)
                .ok_or_else(|| AppError::internal("Invalid TOTP secret encoding"))?;

        let totp = Self::make_totp(&secret_bytes, &row.email)?;

        if !totp
            .check_current(code)
            .map_err(|_| AppError::bad_request("Authentication failed."))?
        {
            tokio::time::sleep(std::time::Duration::from_millis(
                100 + rand::random::<u64>() % 100,
            ))
            .await;

            return Err(AppError::bad_request("Authentication failed."));
        }

        let enc_for_storage = self.enc.encrypt(&secret_b32, &uid).await?;

        sqlx::query!(
            r#"UPDATE users SET mfa_enabled = true, mfa_secret = $1 WHERE id = $2"#,
            serde_json::to_value(&enc_for_storage).unwrap(),
            user_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"DELETE FROM mfa_pending_secrets WHERE user_id = $1"#,
            user_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'mfa:activated', '{}'::jsonb)"#,
            user_id
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true, "message": "MFA activated successfully." }))
    }

    pub async fn deactivate(
        &self,
        user_id: Uuid,
        code: &str,
        ip: Option<&str>,
    ) -> AppResult<Value> {
        let user = sqlx::query!(
            r#"SELECT email, mfa_enabled, mfa_secret FROM users WHERE id = $1"#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("User not found."))?;

        if !user.mfa_enabled || user.mfa_secret.is_none() {
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            return Err(AppError::bad_request("Authentication failed."));
        }

        let uid = user_id.to_string();

        let enc: crate::common::encryption::EncryptedPayload =
            serde_json::from_value(user.mfa_secret.unwrap())
                .map_err(|_| AppError::internal("Invalid encrypted secret"))?;

        let secret_b32 = self.enc.decrypt(&enc, &uid).await?;

        let secret_bytes =
            base32::decode(base32::Alphabet::Rfc4648 { padding: false }, &secret_b32)
                .ok_or_else(|| AppError::internal("Invalid TOTP secret encoding"))?;

        let totp = Self::make_totp(&secret_bytes, &user.email)?;

        if !totp
            .check_current(code)
            .map_err(|_| AppError::bad_request("Authentication failed."))?
        {
            tokio::time::sleep(std::time::Duration::from_millis(
                100 + rand::random::<u64>() % 100,
            ))
            .await;
            return Err(AppError::bad_request("Authentication failed."));
        }

        sqlx::query!(
            r#"UPDATE users SET mfa_enabled = false, mfa_secret = NULL WHERE id = $1"#,
            user_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'mfa:deactivated', $2)"#,
            user_id,
            json!({ "ip": ip })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true, "message": "MFA deactivated successfully." }))
    }
}
