use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("{0}")]
    BadRequest(String),

    #[error("Validation error")]
    Validation(Vec<String>),

    #[error("{0}")]
    Unauthorized(String),

    #[error("Authentication required.")]
    AuthRequired,

    #[error("Access token is invalid or has expired.")]
    TokenExpired,

    #[error("{0}")]
    Forbidden(String),

    #[error("{0}")]
    NotFound(String),

    #[error("An unexpected error occurred.")]
    Internal(#[from] anyhow::Error),

    #[error("Database error.")]
    Database(#[from] sqlx::Error),
}

impl AppError {
    pub fn bad_request(msg: impl Into<String>) -> Self {
        Self::BadRequest(msg.into())
    }

    pub fn forbidden(msg: impl Into<String>) -> Self {
        Self::Forbidden(msg.into())
    }

    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::NotFound(msg.into())
    }

    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(anyhow::anyhow!(msg.into()))
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, body) = match &self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, json!({ "error": msg })),
            AppError::Validation(errs) => (
                StatusCode::BAD_REQUEST,
                json!({ "error": "Validation Error.", "errors": errs }),
            ),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, json!({ "error": msg })),
            AppError::AuthRequired => (
                StatusCode::UNAUTHORIZED,
                json!({ "error": "Authentication required.", "requiresAuth": true }),
            ),
            AppError::TokenExpired => (
                StatusCode::UNAUTHORIZED,
                json!({ "error": "Access token is invalid or has expired.", "requiresAuth": true }),
            ),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, json!({ "error": msg })),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, json!({ "error": msg })),
            AppError::Internal(e) => {
                tracing::error!("Internal error: {e:#}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    json!({ "error": "An unexpected error occurred." }),
                )
            }
            AppError::Database(e) => {
                tracing::error!("Database error: {e}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    json!({ "error": "An unexpected error occurred." }),
                )
            }
        };

        (status, Json(body)).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
