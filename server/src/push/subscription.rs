use base64::prelude::*;
use url::Url;
use web_push_native::{Auth, p256::PublicKey};

/// Push endpoints are client-supplied URLs the server later POSTs to. Only the
/// browser vendors' push services are accepted, so a crafted subscription
/// cannot point the server at internal hosts (SSRF).
const PUSH_SERVICE_HOSTS: &[&str] = &[
    "fcm.googleapis.com",
    "push.services.mozilla.com",
    "notify.windows.com",
    "push.apple.com",
];

const MAX_ENDPOINT_LEN: usize = 2048;
const AUTH_SECRET_LEN: usize = 16;

#[derive(Debug, thiserror::Error)]
pub enum InvalidSubscription {
    #[error("endpoint is not a supported push service URL")]
    Endpoint,
    #[error("p256dh is not a base64url P-256 public key")]
    PublicKey,
    #[error("auth is not a base64url 16-byte secret")]
    AuthSecret,
}

/// A browser's `PushSubscription`, validated and decoded. Holding one means the
/// endpoint is a trusted push service and the keys can encrypt a payload.
#[derive(Debug, Clone)]
pub struct PushSubscription {
    endpoint: Url,
    p256dh: PublicKey,
    auth: Auth,
}

impl PushSubscription {
    pub fn parse(endpoint: &str, p256dh: &str, auth: &str) -> Result<Self, InvalidSubscription> {
        let endpoint = parse_endpoint(endpoint).ok_or(InvalidSubscription::Endpoint)?;

        let p256dh = decode_base64url(p256dh)
            .and_then(|bytes| PublicKey::from_sec1_bytes(&bytes).ok())
            .ok_or(InvalidSubscription::PublicKey)?;

        let auth = decode_base64url(auth)
            .filter(|bytes| bytes.len() == AUTH_SECRET_LEN)
            .map(|bytes| Auth::clone_from_slice(&bytes))
            .ok_or(InvalidSubscription::AuthSecret)?;

        Ok(Self {
            endpoint,
            p256dh,
            auth,
        })
    }

    pub fn endpoint(&self) -> &str {
        self.endpoint.as_str()
    }

    pub fn p256dh(&self) -> &PublicKey {
        &self.p256dh
    }

    pub fn auth(&self) -> &Auth {
        &self.auth
    }

    pub fn p256dh_base64url(&self) -> String {
        BASE64_URL_SAFE_NO_PAD.encode(self.p256dh.to_sec1_bytes())
    }

    pub fn auth_base64url(&self) -> String {
        BASE64_URL_SAFE_NO_PAD.encode(self.auth)
    }
}

fn parse_endpoint(raw: &str) -> Option<Url> {
    if raw.len() > MAX_ENDPOINT_LEN {
        return None;
    }

    let url = Url::parse(raw).ok()?;
    let trusted = url.scheme() == "https"
        && url.port().is_none()
        && url.username().is_empty()
        && url.password().is_none()
        && url.domain().is_some_and(is_push_service_host);

    trusted.then_some(url)
}

fn is_push_service_host(host: &str) -> bool {
    PUSH_SERVICE_HOSTS.iter().any(|allowed| {
        host.strip_suffix(allowed)
            .is_some_and(|prefix| prefix.is_empty() || prefix.ends_with('.'))
    })
}

/// Browsers serialize subscription keys as unpadded base64url; padding is
/// tolerated for clients that add it.
fn decode_base64url(value: &str) -> Option<Vec<u8>> {
    BASE64_URL_SAFE_NO_PAD
        .decode(value.trim_end_matches('='))
        .ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    const P256DH: &str =
        "BLn9b-VR0ca83knDNZ32dCHGyjJp-1riX9ZTN40MqV8K_LpQmLqxC_DoHvqvFXO_nGdAB4W9dogZb_sM-uV4JbY";
    const AUTH: &str = "_ordMnz7uTCmrpBTeUV4Bw";

    fn parse(endpoint: &str) -> Result<PushSubscription, InvalidSubscription> {
        PushSubscription::parse(endpoint, P256DH, AUTH)
    }

    #[test]
    fn accepts_vendor_push_services() {
        for endpoint in [
            "https://fcm.googleapis.com/fcm/send/abc:def",
            "https://updates.push.services.mozilla.com/wpush/v2/gAAAA",
            "https://wns2-par02p.notify.windows.com/w/?token=abc",
            "https://web.push.apple.com/QGk3",
        ] {
            assert!(parse(endpoint).is_ok(), "{endpoint}");
        }
    }

    #[test]
    fn rejects_endpoints_outside_the_allowlist() {
        for endpoint in [
            "http://fcm.googleapis.com/fcm/send/abc",
            "https://fcm.googleapis.com:8443/fcm/send/abc",
            "https://user@fcm.googleapis.com/fcm/send/abc",
            "https://evilfcm.googleapis.com.attacker.test/",
            "https://notfcm.googleapis.com/",
            "https://geoip-service/lookup/1.1.1.1",
            "https://127.0.0.1/",
            "not a url",
        ] {
            assert!(
                matches!(parse(endpoint), Err(InvalidSubscription::Endpoint)),
                "{endpoint}"
            );
        }
    }

    #[test]
    fn rejects_malformed_keys() {
        let endpoint = "https://fcm.googleapis.com/fcm/send/abc";
        assert!(matches!(
            PushSubscription::parse(endpoint, "AAAA", AUTH),
            Err(InvalidSubscription::PublicKey)
        ));
        assert!(matches!(
            PushSubscription::parse(endpoint, P256DH, "AAAA"),
            Err(InvalidSubscription::AuthSecret)
        ));
    }

    #[test]
    fn round_trips_keys_as_unpadded_base64url() {
        let sub = parse("https://fcm.googleapis.com/fcm/send/abc").unwrap();
        assert_eq!(sub.p256dh_base64url(), P256DH);
        assert_eq!(sub.auth_base64url(), AUTH);
    }
}
