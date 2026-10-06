mod announcements;
mod assets;
mod auth;
mod common;
mod config;
mod data_export;
mod error;
mod group;
mod items;
mod messages;
mod mfa;
mod oauth;
mod reports;
mod schedule;
mod state;
mod super_admin;
mod system;
mod system_announcements;
mod todos;
mod user;

use anyhow::Context;
use axum::{Router, middleware};
use common::{csrf::csrf_middleware, extractors::resolve_tenant};
use config::Config;
use sqlx::postgres::PgPoolOptions;
use state::AppState;
use std::time::Duration;
use tower_http::{
    compression::CompressionLayer,
    cors::{AllowHeaders, AllowMethods, CorsLayer},
    request_id::{MakeRequestUuid, SetRequestIdLayer},
    trace::TraceLayer,
};
use tracing::info;
use tracing_subscriber::{EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,server=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    let config = Config::from_env().context("Failed to load configuration")?;

    let port = config.port;

    let cors_origin = config.cors_origin.clone();

    let db = PgPoolOptions::new()
        .max_connections(20)
        .connect(&config.database_url)
        .await
        .context("Failed to connect to database")?;

    sqlx::migrate!("./migrations")
        .run(&db)
        .await
        .context("Failed to run migrations")?;

    info!("Database connected and migrations applied.");

    let state = AppState::new(db, config);

    assets::sweep::spawn(state.db.clone(), state.cloudinary.clone());

    let cors = CorsLayer::new()
        .allow_origin(
            cors_origin
                .parse::<axum::http::HeaderValue>()
                .context("Invalid CORS_ORIGIN")?,
        )
        .allow_credentials(true)
        .allow_methods(AllowMethods::list([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::PATCH,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ]))
        .allow_headers(AllowHeaders::list([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::HeaderName::from_static("x-csrf-token"),
        ]))
        .expose_headers([common::personalization::HIDDEN_BY_COURSES]);

    // Every group-bound endpoint names its group in the path. The layer checks
    // membership once per request, so no handler below can be reached for a
    // group the caller does not belong to.
    let group_scoped = Router::new()
        .merge(announcements::routes::group_router())
        .merge(assets::routes::group_router())
        .merge(group::routes::group_router())
        .merge(items::routes::group_router())
        .merge(messages::routes::group_router())
        .merge(schedule::routes::group_router())
        .merge(user::routes::group_router())
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            resolve_tenant,
        ));

    let api = Router::new()
        .nest("/groups/{group_id}", group_scoped)
        .merge(system::routes::router())
        .merge(system_announcements::routes::router())
        .merge(assets::routes::router())
        .merge(auth::routes::router())
        .merge(user::routes::router())
        .merge(data_export::routes::router())
        .merge(group::routes::router())
        .merge(todos::routes::router())
        .merge(messages::routes::router())
        .merge(mfa::routes::router())
        .merge(oauth::routes::router())
        .merge(super_admin::routes::router(state.clone()))
        .layer(common::rate_limit::global())
        .layer(middleware::from_fn_with_state(
            state.clone(),
            csrf_middleware,
        ))
        .with_state(state);

    #[allow(deprecated)]
    let app = Router::new()
        .merge(api)
        .layer(cors)
        .layer(CompressionLayer::new())
        .layer(tower_http::timeout::TimeoutLayer::new(Duration::from_secs(
            30,
        )))
        .layer(TraceLayer::new_for_http())
        .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid));

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .context("Failed to bind TCP listener")?;

    info!("Server listening on {addr}");

    axum::serve(listener, app).await.context("Server error")?;

    Ok(())
}
