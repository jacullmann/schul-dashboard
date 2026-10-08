use super::handlers::*;
use crate::{common::rate_limit, state::AppState};
use axum::{
    Router,
    routing::{delete, get, post},
};
use std::time::Duration;

pub fn router() -> Router<AppState> {
    // A separate bucket from the password routes, so mistyped 2FA codes do not
    // eat into the login budget of everyone sharing an IP (e.g. a school NAT).
    let mfa = Router::new()
        .route("/auth/mfa/verify", post(verify_mfa))
        .route("/auth/mfa/passkey/challenge", post(start_mfa_passkey))
        .route("/auth/mfa/passkey/verify", post(verify_mfa_passkey))
        .layer(rate_limit::per_client(20, Duration::from_secs(1)));

    // Kept apart from the password routes, so mistyped codes and passwords do
    // not use up a client's email budget, and the stricter email budget does
    // not hold up sign-ins.
    let outgoing_mail = Router::new()
        .route("/auth/register", post(register))
        .route("/auth/verify/resend", post(resend_verification))
        .route("/auth/forgot", post(forgot_password))
        .layer(rate_limit::outgoing_mail());

    let sensitive = Router::new()
        .route("/auth/login", post(login))
        .route("/auth/reset/verify", post(verify_reset_token))
        .route("/auth/reset", post(reset_password))
        .route("/auth/set-password/code", post(request_password_setup_code))
        .route("/auth/set-password", post(set_password))
        .layer(rate_limit::per_client(30, Duration::from_secs(3)));

    let normal = Router::new()
        .route("/auth/mfa/challenge", get(get_mfa_challenge))
        .route("/auth/mfa/cancel", post(cancel_mfa))
        .route("/auth/me", get(get_me).delete(delete_me))
        .route("/auth/verify", get(verify_email))
        .route("/auth/change-password", post(change_password))
        .route("/auth/password", delete(remove_password))
        .route("/auth/sign-in-methods", get(get_sign_in_methods))
        .route("/auth/groups", get(get_groups))
        .route("/auth/refresh", post(refresh))
        .route("/auth/logout", post(logout))
        .route("/auth/logout-all", post(logout_all))
        .route("/auth/logout-others", post(logout_all_others))
        .route("/auth/sessions", get(list_sessions))
        .route("/auth/sessions/{family_id}", delete(revoke_session));

    Router::new()
        .merge(mfa)
        .merge(outgoing_mail)
        .merge(sensitive)
        .merge(normal)
}
