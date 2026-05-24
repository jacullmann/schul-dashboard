use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use std::net::{IpAddr, SocketAddr};
use std::path::Path as StdPath;
use std::sync::Arc;
use std::time::SystemTime;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod geoip;
mod update;

use crate::geoip::{GeoIpState, LookupResponse};

struct AppConfig {
    port: u16,
    license_key: Option<String>,
    mirror_url: String,
    database_path: String,
}

impl AppConfig {
    fn from_env() -> Self {
        let _ = dotenvy::dotenv();

        let port = std::env::var("PORT")
            .ok()
            .and_then(|p| p.parse::<u16>().ok())
            .unwrap_or(8080);

        let license_key = std::env::var("MAXMIND_LICENSE_KEY")
            .ok()
            .filter(|s| !s.trim().is_empty());

        let mirror_url = std::env::var("GEOIP_DATABASE_URL")
            .unwrap_or_else(|_| "https://raw.githubusercontent.com/P3TERX/GeoLite.mmdb/download/GeoLite2-City.mmdb".to_string());

        let database_path = std::env::var("GEOIP_DATABASE_PATH")
            .unwrap_or_else(|_| "data/GeoLite2-City.mmdb".to_string());

        Self {
            port,
            license_key,
            mirror_url,
            database_path,
        }
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,geoip_service=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Starting GeoIP Microservice...");

    let config = Arc::new(AppConfig::from_env());
    let geoip_state = GeoIpState::new();

    if StdPath::new(&config.database_path).exists() {
        info!("Found existing database at startup. Loading...");
        if let Err(e) = geoip_state.load_database(&config.database_path) {
            error!("Failed to load existing database at startup: {}", e);
        }
    }

    if !geoip_state.is_loaded() {
        info!("No valid database found at startup. Performing initial download...");
        match update::download_and_extract_db(
            config.license_key.as_deref(),
            &config.mirror_url,
            &config.database_path,
        )
        .await
        {
            Ok(_) => {
                if let Err(e) = geoip_state.load_database(&config.database_path) {
                    error!("Failed to load newly downloaded database: {}", e);
                }
            }
            Err(e) => {
                error!("Critical failure during initial database download: {}", e);
                warn!("Service will start, but lookups will fail until database is downloaded successfully.");
            }
        }
    }

    let cron_state = geoip_state.clone();
    let cron_config = config.clone();
    tokio::spawn(async move {
        info!("Background update scheduler initialized. Checking database age every hour.");
        loop {
            sleep(Duration::from_secs(3600)).await;
            
            let should_update = match get_file_age_in_days(&cron_config.database_path) {
                Some(age_days) => {
                    info!("Database file age is {} days.", age_days);
                    age_days >= 7
                }
                None => {
                    warn!("Failed to determine database file age (or file missing). Triggering download.");
                    true
                }
            };

            if should_update {
                info!("Database is 7 or more days old, or missing. Commencing automated weekly update...");
                match update::download_and_extract_db(
                    cron_config.license_key.as_deref(),
                    &cron_config.mirror_url,
                    &cron_config.database_path,
                )
                .await
                {
                    Ok(_) => {
                        if let Err(e) = cron_state.load_database(&cron_config.database_path) {
                            error!("Failed to hot-swap database during automated update: {}", e);
                        } else {
                            info!("Automated weekly database update and hot-reload succeeded!");
                        }
                    }
                    Err(e) => {
                        error!("Automated weekly database update failed: {}", e);
                    }
                }
            }
        }
    });

    let app = Router::new()
        .route("/health", get(health_handler))
        .route("/lookup/:ip", get(lookup_handler))
        .route("/update", post(update_handler))
        .with_state((geoip_state, config.clone()));

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    info!("HTTP server listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn get_file_age_in_days(path: &str) -> Option<u64> {
    let metadata = std::fs::metadata(path).ok()?;
    let modified = metadata.modified().ok()?;
    let duration = SystemTime::now().duration_since(modified).ok()?;
    Some(duration.as_secs() / 86400)
}

async fn health_handler(
    State((geoip_state, config)): State<(GeoIpState, Arc<AppConfig>)>,
) -> impl IntoResponse {
    let database_loaded = geoip_state.is_loaded();
    let database_age_days = get_file_age_in_days(&config.database_path);

    let body = serde_json::json!({
        "status": "ok",
        "database_loaded": database_loaded,
        "database_age_days": database_age_days,
    });

    (StatusCode::OK, Json(body))
}

async fn lookup_handler(
    State((geoip_state, _config)): State<(GeoIpState, Arc<AppConfig>)>,
    Path(ip_str): Path<String>,
) -> impl IntoResponse {
    let ip: IpAddr = match ip_str.parse() {
        Ok(addr) => addr,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": format!("Invalid IP address format: '{}'", ip_str) })),
            )
                .into_response();
        }
    };

    if !geoip_state.is_loaded() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({ "error": "GeoIP database is not loaded yet" })),
        )
            .into_response();
    }

    match geoip_state.lookup(ip) {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(e) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": e })),
        )
            .into_response(),
    }
}

async fn update_handler(
    State((geoip_state, config)): State<(GeoIpState, Arc<AppConfig>)>,
) -> impl IntoResponse {
    info!("Manual database update triggered via HTTP request.");

    tokio::spawn(async move {
        match update::download_and_extract_db(
            config.license_key.as_deref(),
            &config.mirror_url,
            &config.database_path,
        )
        .await
        {
            Ok(_) => {
                if let Err(e) = geoip_state.load_database(&config.database_path) {
                    error!("Failed to reload database after manual update: {}", e);
                } else {
                    info!("Manual database update and hot-reload completed successfully!");
                }
            }
            Err(e) => {
                error!("Manual database update failed: {}", e);
            }
        }
    });

    (
        StatusCode::ACCEPTED,
        Json(serde_json::json!({
            "status": "update_triggered",
            "message": "Database update has been triggered in the background."
        })),
    )
}
