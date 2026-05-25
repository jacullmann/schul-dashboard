use crate::{
    config::{BaseCookieOptions, CSRF_COOKIE, CSRF_HEADER},
    error::AppError,
};
use axum::{extract::Request, http::Method, middleware::Next, response::Response};
use axum_extra::extract::CookieJar;
use subtle::ConstantTimeEq;
use tower_cookies::{Cookie, Cookies};

pub fn generate_csrf_token() -> String {
    use rand::RngCore;
    let mut bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

pub fn csrf_cookie(token: &str, opts: &BaseCookieOptions) -> Cookie<'static> {
    let mut c = Cookie::new(CSRF_COOKIE, token.to_owned());
    c.set_path("/");
    c.set_domain(opts.domain.clone());
    c.set_secure(opts.secure);
    c.set_http_only(false);
    c.set_same_site(tower_cookies::cookie::SameSite::Lax);
    c.set_max_age(tower_cookies::cookie::time::Duration::days(30));
    c
}

pub async fn csrf_middleware(
    cookies: CookieJar,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let method = request.method().clone();

    if matches!(method, Method::GET | Method::HEAD | Method::OPTIONS) {
        return Ok(next.run(request).await);
    }

    let cookie_token = cookies.get(CSRF_COOKIE).map(|c| c.value().to_owned());

    let header_token = request
        .headers()
        .get(CSRF_HEADER)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_owned());

    match (cookie_token, header_token) {
        (Some(ct), Some(ht)) => {
            let cb = ct.as_bytes();
            let hb = ht.as_bytes();
            if cb.len() != hb.len() || !bool::from(cb.ct_eq(hb)) {
                return Err(AppError::Forbidden("Invalid CSRF token.".into()));
            }
            Ok(next.run(request).await)
        }
        _ => Err(AppError::Forbidden("CSRF token missing.".into())),
    }
}
