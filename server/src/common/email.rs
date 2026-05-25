use crate::error::AppError;
use reqwest::Client;
use serde_json::json;
use tracing::{error, warn};

#[derive(Clone)]
pub struct EmailService {
    client: Client,
    api_key: String,
    from: String,
    configured: bool,
}

impl EmailService {
    pub fn new(api_key: Option<String>, from: String, client: Client) -> Self {
        let configured = api_key.is_some();
        if !configured {
            warn!("RESEND_API_KEY not set — emails will not be sent.");
        }
        Self {
            client,
            api_key: api_key.unwrap_or_default(),
            from,
            configured,
        }
    }

    async fn send(&self, to: &str, subject: &str, html: &str) -> Result<(), AppError> {
        if !self.configured {
            return Err(AppError::internal("Email service not configured."));
        }

        let resp = self
            .client
            .post("https://api.resend.com/emails")
            .bearer_auth(&self.api_key)
            .json(&json!({
                "from": self.from,
                "to": [to],
                "subject": subject,
                "html": html,
            }))
            .send()
            .await
            .map_err(|e| AppError::internal(format!("Email send failed: {e}")))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            error!("Resend API error {status}: {body}");
            return Err(AppError::internal(format!("Email delivery failed: {body}")));
        }

        Ok(())
    }

    pub async fn send_verification_email(&self, to: &str, verify_url: &str) -> Result<(), AppError> {
        self.send(
            to,
            "Bitte bestätige deine E-Mail-Adresse",
            &format!(
                r#"
                <h3>Nur noch ein letzter Schritt</h3>
                <p>Willkommen beim schul-dashboard. Bevor es losgehen kann, musst du noch deine E-Mail-Adresse bestätigen.</p>
                <p><a href="{verify_url}">E-Mail bestätigen</a></p>
                <p>Der Link ist für 48 Stunden gültig.</p>
                <p>Das schul-dashboard-Team</p>
                "#
            ),
        )
            .await
    }

    pub async fn send_password_reset_email(&self, to: &str, code: &str) -> Result<(), AppError> {
        self.send(
            to,
            "Passwort zurücksetzen",
            &format!(
                r#"
                <h3>Bestätigungscode</h3>
                <p>Gib folgenden Code auf der schul-dashboard Seite ein:</p>
                <p><strong>{code}</strong></p>
                <p>Dieser Code ist für 30 Minuten gültig.</p>
                "#
            ),
        )
            .await
    }

    pub async fn send_security_email(&self, to: &str) -> Result<(), AppError> {
        self.send(
            to,
            "Dein Passwort wurde zurückgesetzt",
            r#"
            <h3>Wichtige Sicherheitsmeldung</h3>
            <p>Soeben wurde erfolgreich das Passwort deines Kontos zurückgesetzt.</p>
            <p>Falls du dies nicht warst, kontaktiere sofort den Support.</p>
            "#,
        )
            .await
    }
}
