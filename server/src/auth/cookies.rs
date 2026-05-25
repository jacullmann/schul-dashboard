use crate::config::{
    ACCESS_COOKIE, ACCESS_TOKEN_TTL, MFA_PENDING_COOKIE, MFA_PENDING_TTL,
    REFRESH_COOKIE, REFRESH_COOKIE_PATH, REFRESH_TOKEN_TTL, BaseCookieOptions,
};
use axum_extra::extract::cookie::{Cookie, SameSite};

fn base_cookie(name: &'static str, value: String, opts: &BaseCookieOptions) -> Cookie<'static> {
    let mut c = Cookie::new(name, value);
    c.set_http_only(true);
    c.set_secure(opts.secure);
    c.set_same_site(SameSite::Lax);
    c.set_domain(opts.domain.clone());
    c
}

fn with_ttl(mut c: Cookie<'static>, secs: u64) -> Cookie<'static> {
    c.set_max_age(axum_extra::extract::cookie::time::Duration::seconds(secs as i64));
    c
}

pub fn access_cookie(token: String, opts: &BaseCookieOptions) -> Cookie<'static> {
    let c = base_cookie(ACCESS_COOKIE, token, opts);
    let mut c = with_ttl(c, ACCESS_TOKEN_TTL.as_secs());
    c.set_path("/");
    c
}

pub fn refresh_cookie(token: String, opts: &BaseCookieOptions) -> Cookie<'static> {
    let c = base_cookie(REFRESH_COOKIE, token, opts);
    let mut c = with_ttl(c, REFRESH_TOKEN_TTL.as_secs());
    c.set_path(REFRESH_COOKIE_PATH);
    c
}

pub fn clear_access_cookie(opts: &BaseCookieOptions) -> Cookie<'static> {
    let c = base_cookie(ACCESS_COOKIE, String::new(), opts);
    let mut c = with_ttl(c, 0);
    c.set_path("/");
    c
}

pub fn clear_refresh_cookie(opts: &BaseCookieOptions) -> Cookie<'static> {
    let c = base_cookie(REFRESH_COOKIE, String::new(), opts);
    let mut c = with_ttl(c, 0);
    c.set_path(REFRESH_COOKIE_PATH);
    c
}

pub fn mfa_pending_cookie(token: String, opts: &BaseCookieOptions) -> Cookie<'static> {
    let c = base_cookie(MFA_PENDING_COOKIE, token, opts);
    let mut c = with_ttl(c, MFA_PENDING_TTL.as_secs());
    c.set_path("/");
    c
}

pub fn clear_mfa_pending_cookie(opts: &BaseCookieOptions) -> Cookie<'static> {
    let c = base_cookie(MFA_PENDING_COOKIE, String::new(), opts);
    let mut c = with_ttl(c, 0);
    c.set_path("/");
    c
}
