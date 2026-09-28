use super::subscription::PushSubscription;
use crate::config::VapidConfig;
use anyhow::Context;
use axum::http::{HeaderValue, StatusCode, Uri};
use base64::prelude::*;
use std::{sync::Arc, time::Duration};
use web_push_native::{
    WebPushBuilder,
    jwt_simple::algorithms::{ECDSAP256PublicKeyLike, ES256KeyPair},
};

const DELIVERY_TIMEOUT: Duration = Duration::from_secs(10);

/// RFC 8030 §5.3: how eagerly the push service may wake a device, e.g. a
/// phone in battery-saving mode.
#[derive(Debug, Clone, Copy)]
pub enum Urgency {
    Normal,
    High,
}

impl Urgency {
    fn header_value(self) -> HeaderValue {
        HeaderValue::from_static(match self {
            Self::Normal => "normal",
            Self::High => "high",
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Delivery {
    Accepted,
    /// The push service no longer knows the subscription; it must be dropped.
    Gone,
    Failed,
}

/// Signs, encrypts and delivers Web Push messages for one VAPID identity.
#[derive(Clone)]
pub struct WebPush {
    inner: Arc<Inner>,
}

struct Inner {
    key_pair: ES256KeyPair,
    public_key: String,
    subject: String,
    http: reqwest::Client,
}

impl WebPush {
    pub fn from_config(config: &VapidConfig) -> anyhow::Result<Self> {
        let raw_key = BASE64_URL_SAFE_NO_PAD
            .decode(config.private_key.trim_end_matches('='))
            .context("VAPID_PRIVATE_KEY is not base64url")?;
        let key_pair = ES256KeyPair::from_bytes(&raw_key)
            .map_err(|e| anyhow::anyhow!("VAPID_PRIVATE_KEY is not a P-256 key: {e}"))?;
        let public_key = BASE64_URL_SAFE_NO_PAD
            .encode(key_pair.public_key().public_key().to_bytes_uncompressed());

        // Push services answer directly; following a redirect would let a
        // compromised endpoint steer requests past the endpoint allowlist.
        let http = reqwest::Client::builder()
            .timeout(DELIVERY_TIMEOUT)
            .redirect(reqwest::redirect::Policy::none())
            .user_agent("schul-dashboard-api/v2")
            .build()
            .context("Failed to build Web Push HTTP client")?;

        Ok(Self {
            inner: Arc::new(Inner {
                key_pair,
                public_key,
                subject: config.subject.clone(),
                http,
            }),
        })
    }

    /// The `applicationServerKey` browsers subscribe with.
    pub fn public_key(&self) -> &str {
        &self.inner.public_key
    }

    pub async fn send(
        &self,
        subscription: &PushSubscription,
        payload: &[u8],
        urgency: Urgency,
    ) -> Delivery {
        let request = match self.build_request(subscription, payload, urgency) {
            Ok(request) => request,
            Err(e) => {
                tracing::warn!("Failed to build push request: {e:#}");
                return Delivery::Failed;
            }
        };

        match self.inner.http.execute(request).await {
            Ok(response) => classify(response.status()),
            Err(e) => {
                tracing::warn!("Push delivery failed: {e}");
                Delivery::Failed
            }
        }
    }

    fn build_request(
        &self,
        subscription: &PushSubscription,
        payload: &[u8],
        urgency: Urgency,
    ) -> anyhow::Result<reqwest::Request> {
        let endpoint: Uri = subscription.endpoint().parse()?;

        let mut request =
            WebPushBuilder::new(endpoint, *subscription.p256dh(), *subscription.auth())
                .with_vapid(&self.inner.key_pair, &self.inner.subject)
                .build(payload)?;

        request
            .headers_mut()
            .insert("urgency", urgency.header_value());

        Ok(reqwest::Request::try_from(request)?)
    }
}

fn classify(status: StatusCode) -> Delivery {
    match status {
        s if s.is_success() => Delivery::Accepted,
        StatusCode::NOT_FOUND | StatusCode::GONE => Delivery::Gone,
        s => {
            tracing::warn!("Push service rejected message: {s}");
            Delivery::Failed
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expired_subscriptions_are_gone() {
        assert_eq!(classify(StatusCode::CREATED), Delivery::Accepted);
        assert_eq!(classify(StatusCode::GONE), Delivery::Gone);
        assert_eq!(classify(StatusCode::NOT_FOUND), Delivery::Gone);
        assert_eq!(classify(StatusCode::TOO_MANY_REQUESTS), Delivery::Failed);
        assert_eq!(classify(StatusCode::PAYLOAD_TOO_LARGE), Delivery::Failed);
    }

    #[test]
    fn derives_public_key_from_private_key() {
        let push = WebPush::from_config(&VapidConfig {
            private_key: "RS0WdYWWo1HajXg3NZR1olzCf31i-ZBGDkFyCs7j1jw".into(),
            subject: "mailto:admin@example.com".into(),
        })
        .unwrap();

        let public_key = BASE64_URL_SAFE_NO_PAD.decode(push.public_key()).unwrap();
        assert_eq!(public_key.len(), 65);
        assert_eq!(public_key[0], 0x04);
    }
}
