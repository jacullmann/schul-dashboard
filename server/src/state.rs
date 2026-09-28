use crate::{
    common::{email::EmailService, encryption::EncryptionService, jwt::JwtService},
    config::Config,
    messages::gateway::MessageBus,
    push::sender::WebPush,
};
use reqwest::Client;
use sqlx::PgPool;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
    pub http: Client,
    pub jwt: JwtService,
    pub email: EmailService,
    pub encryption: EncryptionService,
    pub message_bus: MessageBus,
    pub web_push: Option<WebPush>,
}

impl AppState {
    pub fn new(db: PgPool, config: Config) -> Self {
        let http = Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .user_agent("schul-dashboard-api/v2")
            .build()
            .expect("Failed to build HTTP client");

        let jwt = JwtService::new(&config);

        let email = EmailService::new(
            Some(config.resend_api_key.clone()),
            config.email_from.clone(),
        );

        let encryption = EncryptionService::new(
            config.encryption_key.clone(),
            config.user_key_pepper.clone(),
        );

        // Push is optional; a bad key disables it rather than the whole server.
        let web_push = config
            .vapid
            .as_ref()
            .and_then(|vapid| match WebPush::from_config(vapid) {
                Ok(web_push) => Some(web_push),
                Err(e) => {
                    tracing::warn!("{e:#}; push notifications are disabled.");
                    None
                }
            });

        Self {
            db,
            config: Arc::new(config),
            http,
            jwt,
            email,
            encryption,
            message_bus: MessageBus::default(),
            web_push,
        }
    }
}
