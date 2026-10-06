use axum::{
    Json,
    http::{StatusCode, header},
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

    /// The second-factor challenge is missing, expired or invalid. Every case
    /// means the same to the client: the sign-in has to start over.
    #[error("Two-factor sign-in has expired. Please sign in again.")]
    MfaChallengeExpired,

    /// Too many wrong second-factor codes in a row; the factor accepts none
    /// until the lock ends.
    #[error("Too many incorrect codes. Please try again later.")]
    MfaLocked { retry_after: chrono::TimeDelta },

    /// The address received as many emailed codes as it may for now.
    #[error("Too many codes requested. Please try again later.")]
    EmailCodeThrottled { retry_after: chrono::TimeDelta },

    #[error("{0}")]
    Passkey(PasskeyFailure),

    #[error("{0}")]
    Forbidden(String),

    #[error("{0}")]
    NotFound(String),

    #[error("The file is larger than {max_bytes} bytes.")]
    FileTooLarge { max_bytes: u64 },

    #[error("Only images, PDFs and Word, PowerPoint or Excel documents can be uploaded.")]
    UnsupportedFile,

    #[error("Conflict: {0}")]
    Conflict(String, serde_json::Value),

    #[error("{0}")]
    NameTaken(String),

    /// A service this server relies on failed; `code` tells the client which
    /// failure it was, so it can say what needs fixing.
    #[error("{message}")]
    Upstream {
        code: &'static str,
        message: &'static str,
    },

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

    /// Turns a unique violation into [`AppError::NameTaken`] so a racing
    /// duplicate gets the same answer as one caught upfront.
    pub fn name_taken_on_conflict(err: sqlx::Error, msg: &str) -> Self {
        match err.as_database_error() {
            Some(db) if db.is_unique_violation() => Self::NameTaken(msg.to_owned()),
            _ => Self::Database(err),
        }
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
            AppError::MfaChallengeExpired => (
                StatusCode::UNAUTHORIZED,
                json!({ "error": self.to_string(), "code": "MFA_CHALLENGE_EXPIRED" }),
            ),
            AppError::MfaLocked { retry_after } => {
                return too_many_requests(&self, "MFA_LOCKED", *retry_after);
            }
            AppError::EmailCodeThrottled { retry_after } => {
                return too_many_requests(&self, "EMAIL_CODE_THROTTLED", *retry_after);
            }
            AppError::Passkey(failure) => (
                failure.status(),
                json!({ "error": self.to_string(), "code": failure.code() }),
            ),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, json!({ "error": msg })),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, json!({ "error": msg })),
            AppError::FileTooLarge { max_bytes } => (
                StatusCode::PAYLOAD_TOO_LARGE,
                json!({ "error": self.to_string(), "code": "FILE_TOO_LARGE", "maxBytes": max_bytes }),
            ),
            AppError::UnsupportedFile => (
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                json!({ "error": self.to_string(), "code": "UNSUPPORTED_FILE" }),
            ),
            AppError::Conflict(msg, item) => (
                StatusCode::CONFLICT,
                json!({ "error": msg, "code": "DUPLICATE_ITEM", "item": item }),
            ),
            AppError::NameTaken(msg) => (
                StatusCode::CONFLICT,
                json!({ "error": msg, "code": "NAME_TAKEN" }),
            ),
            AppError::Upstream { code, message } => (
                StatusCode::BAD_GATEWAY,
                json!({ "error": message, "code": code }),
            ),
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

/// A 429 that tells the client when to try again, in whole seconds rounded up
/// so a client that waits exactly this long is never refused again.
fn too_many_requests(error: &AppError, code: &str, retry_after: chrono::TimeDelta) -> Response {
    let secs = (retry_after.num_milliseconds().max(0) + 999) / 1000;

    (
        StatusCode::TOO_MANY_REQUESTS,
        [(header::RETRY_AFTER, secs.to_string())],
        Json(json!({ "error": error.to_string(), "code": code, "retryAfter": secs })),
    )
        .into_response()
}

/// Why a passkey registration or sign-in was refused. Each case has its own
/// code, so the client can explain it in the user's language.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum PasskeyFailure {
    /// The ceremony is unknown, already answered or past its deadline; the
    /// client has to start a new one.
    #[error("The passkey request has expired. Please try again.")]
    ChallengeExpired,

    /// No account holds the credential, e.g. because its passkey was removed
    /// from the account but not from the device.
    #[error("This passkey is not registered.")]
    UnknownCredential,

    #[error("The passkey could not be verified.")]
    SignInRejected,

    #[error("The passkey could not be registered.")]
    RegistrationRejected,

    #[error("This passkey is already registered.")]
    AlreadyRegistered,

    #[error("You have reached the maximum number of passkeys.")]
    LimitReached,
}

impl PasskeyFailure {
    // Failed registrations come from a signed-in user, who must not be sent
    // to refresh their session, so only sign-in failures are a 401.
    fn status(self) -> StatusCode {
        match self {
            Self::UnknownCredential | Self::SignInRejected => StatusCode::UNAUTHORIZED,
            Self::AlreadyRegistered => StatusCode::CONFLICT,
            Self::ChallengeExpired | Self::RegistrationRejected | Self::LimitReached => {
                StatusCode::BAD_REQUEST
            }
        }
    }

    fn code(self) -> &'static str {
        match self {
            Self::ChallengeExpired => "PASSKEY_CHALLENGE_EXPIRED",
            Self::UnknownCredential => "PASSKEY_UNKNOWN",
            Self::SignInRejected => "PASSKEY_REJECTED",
            Self::RegistrationRejected => "PASSKEY_REGISTRATION_REJECTED",
            Self::AlreadyRegistered => "PASSKEY_ALREADY_REGISTERED",
            Self::LimitReached => "PASSKEY_LIMIT_REACHED",
        }
    }
}

impl From<PasskeyFailure> for AppError {
    fn from(failure: PasskeyFailure) -> Self {
        Self::Passkey(failure)
    }
}

pub type AppResult<T> = Result<T, AppError>;
