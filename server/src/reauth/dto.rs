use crate::{auth::sign_in_methods::SignInMethods, mfa::second_factor::SecondFactorProof};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;
use webauthn_rs::prelude::PublicKeyCredential;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReauthStatus {
    pub methods: SignInMethods,
    /// Until when the last confirmation still counts; `None` once it lapsed.
    pub recent_until: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct PasswordReauthDto {
    #[validate(length(min = 1, max = 255))]
    pub password: String,
    /// Required when the account has two-factor authentication on.
    #[validate(nested)]
    pub second_factor: Option<SecondFactorProof>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PasskeyReauthDto {
    pub challenge_id: Uuid,
    pub credential: PublicKeyCredential,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GoogleReauthStart {
    pub url: String,
}
