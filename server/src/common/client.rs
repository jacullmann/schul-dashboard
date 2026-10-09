use axum::{extract::FromRequestParts, http::request::Parts};
use std::{convert::Infallible, net::IpAddr};

/// Bounds what a client can make us store per session or security event.
const USER_AGENT_MAX_BYTES: usize = 512;

/// Where a request comes from, recorded with sessions and security events.
///
/// The address is the first `X-Forwarded-For` entry, so it is only as
/// trustworthy as the reverse proxy that sets the header. Anything that is not
/// an IP address is dropped rather than stored.
#[derive(Debug, Clone, Default)]
pub struct ClientInfo {
    pub ip: Option<IpAddr>,
    pub user_agent: Option<String>,
}

impl<S> FromRequestParts<S> for ClientInfo
where
    S: Send + Sync,
{
    type Rejection = Infallible;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let header = |name: &str| parts.headers.get(name).and_then(|v| v.to_str().ok());

        let ip = header("x-forwarded-for")
            .and_then(|forwarded| forwarded.split(',').next())
            .and_then(|first| first.trim().parse().ok());
        let user_agent = header("user-agent")
            .map(|ua| ua[..ua.floor_char_boundary(USER_AGENT_MAX_BYTES)].to_owned());

        Ok(Self { ip, user_agent })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request;

    async fn extract(headers: &[(&str, &str)]) -> ClientInfo {
        let mut request = Request::builder();
        for (name, value) in headers {
            request = request.header(*name, *value);
        }
        let (mut parts, ()) = request.body(()).unwrap().into_parts();
        let Ok(client) = ClientInfo::from_request_parts(&mut parts, &()).await;
        client
    }

    #[tokio::test]
    async fn takes_the_first_forwarded_address() {
        let client = extract(&[("x-forwarded-for", "2001:db8::1, 10.0.0.1")]).await;
        assert_eq!(client.ip, Some("2001:db8::1".parse().unwrap()));
    }

    #[tokio::test]
    async fn drops_a_forwarded_value_that_is_no_address() {
        let client = extract(&[("x-forwarded-for", "<script>, 10.0.0.1")]).await;
        assert_eq!(client.ip, None);
    }

    #[tokio::test]
    async fn bounds_the_user_agent() {
        let long = "a".repeat(USER_AGENT_MAX_BYTES + 1);
        let client = extract(&[("user-agent", long.as_str())]).await;
        assert_eq!(client.user_agent.unwrap().len(), USER_AGENT_MAX_BYTES);
    }

    #[tokio::test]
    async fn knows_nothing_without_headers() {
        let client = extract(&[]).await;
        assert!(client.ip.is_none() && client.user_agent.is_none());
    }
}
