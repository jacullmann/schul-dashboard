use crate::{
    common::{
        cloudinary::Cloudinary, email::EmailService, encryption::EncryptionService,
        hetzner::HetznerCloud, jwt::JwtService,
    },
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
    pub cloudinary: Cloudinary,
    pub hetzner: Option<HetznerCloud>,
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

        let cloudinary = Cloudinary::new(http.clone(), &config);
        let hetzner = config
            .hetzner
            .as_ref()
            .map(|hetzner| HetznerCloud::new(http.clone(), hetzner));
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
            cloudinary,
            hetzner,
            jwt,
            email,
            encryption,
            message_bus: MessageBus::default(),
        }
    }
}
