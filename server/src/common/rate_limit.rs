//! Per-IP rate limits for the routes that check a secret (password, code or
//! OAuth round trip) or that create content.
//!
//! Schools reach the internet through one shared public IP, so a whole class
//! signing in at the start of a lesson looks like a single client. The burst
//! therefore covers a class, while the refill still caps sustained guessing.

use axum::body::Body;
use governor::{clock::QuantaInstant, middleware::NoOpMiddleware};
use std::time::Duration;
use tower_governor::{
    GovernorLayer, governor::GovernorConfigBuilder, key_extractor::SmartIpKeyExtractor,
};

pub type IpRateLimit = GovernorLayer<SmartIpKeyExtractor, NoOpMiddleware<QuantaInstant>, Body>;

/// Allows `burst` requests at once per IP and refills one request every
/// `replenish_every`.
pub fn per_ip(burst: u32, replenish_every: Duration) -> IpRateLimit {
    let config = GovernorConfigBuilder::default()
        .burst_size(burst)
        .period(replenish_every)
        .key_extractor(SmartIpKeyExtractor)
        .finish()
        .expect("rate limits use a non-zero burst and period");

    GovernorLayer::new(config)
}

/// Every file reaching Cloudinary needs a signature first, so this bounds
/// storage abuse even by clients that never attach their uploads to anything.
/// The burst covers a class sharing photos at once; an Office file takes two
/// signatures (file and thumbnail).
pub fn upload_signatures() -> IpRateLimit {
    per_ip(60, Duration::from_secs(2))
}
