use crate::{
    common::{email::EmailService, encryption::EncryptionService, jwt::JwtService},
    config::Config,
    messages::gateway::MessageBus,
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

        Self {
            db,
            config: Arc::new(config),
            http,
            jwt,
            email,
            encryption,
            message_bus: MessageBus::default(),
        }
    }
}
