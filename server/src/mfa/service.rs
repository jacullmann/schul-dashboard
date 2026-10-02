use super::{
    second_factor::{self, CodeCheck},
    totp::Totp,
};
use crate::{
    auth::token::{MFA_CHANGE, TokenService},
    common::{encryption::EncryptionService, jwt::now_secs},
    error::{AppError, AppResult},
    state::AppState,
};
use serde_json::{Value, json};
use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

pub struct MfaService {
    db: PgPool,
    enc: EncryptionService,
    state: AppState,
}

impl MfaService {
    pub fn from_state(state: &AppState) -> Self {
        Self {
            db: state.db.clone(),
            enc: state.encryption.clone(),
            state: state.clone(),
        }
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

        let secret_b32 = Totp::generate_secret();

        let uid = user_id.to_string();

        let enc = self.enc.encrypt(&secret_b32, &uid).await?;

        let expires_at = chrono::Utc::now() + chrono::Duration::minutes(15);

        sqlx::query!(
            r#"INSERT INTO mfa_pending_secrets (user_id, encrypted_secret, expires_at) VALUES ($1, $2, $3)
               ON CONFLICT (user_id) DO UPDATE SET encrypted_secret = $2, expires_at = $3"#,
            user_id,
            enc.to_json(),
            expires_at,
        )
            .execute(&self.db)
            .await?;

        let otpauth = Totp::from_base32(&secret_b32, &user.email)?.otpauth_url();

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
        )
            .execute(&self.db)
            .await?;

        Ok(json!({ "ok": true, "qrCode": qr_b64, "secret": secret_b32, "expiresAt": expires_at }))
    }

    pub async fn activate(&self, user_id: Uuid, code: &str) -> AppResult<Value> {
        let pending = sqlx::query!(
            r#"SELECT p.encrypted_secret, u.email
               FROM mfa_pending_secrets p
               JOIN users u ON u.id = p.user_id
               WHERE p.user_id = $1 AND p.expires_at > now()"#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(invalid_code)?;

        // The secret was only just shown to the signed-in user, so guessing a
        // code would gain nothing; the per-IP limit is enough here.
        let totp = Totp::from_stored(
            &self.enc,
            pending.encrypted_secret.clone(),
            user_id,
            &pending.email,
        )
        .await?;
        let step = totp
            .matching_step(code, now_secs())
            .ok_or_else(invalid_code)?;

        let mut tx = self.db.begin().await?;

        // The confirming code counts as used, so it cannot sign in afterwards.
        sqlx::query!(
            r#"UPDATE users
               SET mfa_enabled = true, mfa_secret = $2, mfa_last_used_step = $3,
                   mfa_failed_attempts = 0, mfa_locked_until = NULL
               WHERE id = $1"#,
            user_id,
            pending.encrypted_secret,
            step.as_db()
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query!(
            r#"DELETE FROM mfa_pending_secrets WHERE user_id = $1"#,
            user_id
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'mfa:activated', '{}'::jsonb)"#,
            user_id
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        TokenService::from_state(&self.state)
            .revoke_all_for_user(user_id, MFA_CHANGE, None)
            .await?;

        Ok(json!({ "ok": true, "message": "MFA activated successfully." }))
    }

    pub async fn deactivate(
        &self,
        user_id: Uuid,
        code: &str,
        ip: Option<&str>,
    ) -> AppResult<Value> {
        if second_factor::check_code(&self.db, &self.enc, user_id, code).await?
            == CodeCheck::Rejected
        {
            return Err(invalid_code());
        }

        let mut tx = self.db.begin().await?;

        disable_mfa(&mut tx, user_id).await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'mfa:deactivated', $2)"#,
            user_id,
            json!({ "ip": ip })
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        TokenService::from_state(&self.state)
            .revoke_all_for_user(user_id, MFA_CHANGE, None)
            .await?;

        Ok(json!({ "ok": true, "message": "MFA deactivated successfully." }))
    }
}

/// Removes the second factor together with its attempt state, so a factor set
/// up later starts without inherited misses or a stale last-used step.
pub async fn disable_mfa(conn: &mut PgConnection, user_id: Uuid) -> AppResult<()> {
    sqlx::query!(
        r#"UPDATE users
           SET mfa_enabled = false, mfa_secret = NULL, mfa_failed_attempts = 0,
               mfa_locked_until = NULL, mfa_last_used_step = NULL
           WHERE id = $1"#,
        user_id
    )
    .execute(conn)
    .await?;

    Ok(())
}

/// Codes for setting up or removing the factor come from a signed-in user, who
/// must not be sent to refresh their session, so this is no 401.
fn invalid_code() -> AppError {
    AppError::bad_request("Authentication failed.")
}
