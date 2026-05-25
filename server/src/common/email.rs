use crate::error::AppError;
use resend_rs::{Resend, types::CreateEmailBaseOptions};
use tracing::warn;

#[derive(Clone)]
pub struct EmailService {
    resend: Option<Resend>,
    from: String,
}

impl EmailService {
    pub fn new(api_key: Option<String>, from: String) -> Self {
        let resend = api_key
            .map(|k| {
                if k.is_empty() {
                    warn!("RESEND_API_KEY is empty — emails will not be sent.");
                    None
                } else {
                    Some(Resend::new(&k))
                }
            })
            .flatten();

        if resend.is_none() {
            warn!("Email service not configured — emails will not be sent.");
        }

        Self { resend, from }
    }

    async fn send(&self, to: &str, subject: &str, html: &str) -> Result<(), AppError> {
        let resend = self
            .resend
            .as_ref()
            .ok_or_else(|| AppError::internal("Email service not configured."))?;

        let email = CreateEmailBaseOptions::new(&self.from, [to], subject).with_html(html);

        resend
            .emails
            .send(email)
            .await
            .map_err(|e| AppError::internal(format!("Email delivery failed: {e}")))?;

        Ok(())
    }

    pub async fn send_verification_email(
        &self,
        to: &str,
        verify_url: &str,
    ) -> Result<(), AppError> {
        self.send(
            to,
            "Bitte bestätige deine E-Mail-Adresse",
            &format!(r#"
                <h3>Nur noch ein letzter Schritt</h3>
                <p>Willkommen beim schul-dashboard. Bevor es losgehen kann, musst du noch deine E-Mail-Adresse bestätigen.</p>
                <p><a href="{verify_url}">E-Mail bestätigen</a></p>
                <p>Der Link ist für 48 Stunden gültig.</p>
                <p>Das schul-dashboard-Team</p>
            "#),
        ).await
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
