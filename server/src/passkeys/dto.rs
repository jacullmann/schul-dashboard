use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;
use webauthn_rs::prelude::{PublicKeyCredential, RegisterPublicKeyCredential};

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct FinishRegistrationDto {
    pub name: String,
    pub credential: RegisterPublicKeyCredential,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct RenamePasskeyDto {
    pub name: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct SignInDto {
    pub challenge_id: Uuid,
    pub credential: PublicKeyCredential,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PasskeySummary {
    pub id: Uuid,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
    /// Base64url, as the browser reports it, so the client can tell the
    /// passkey manager which credentials still exist.
    pub credential_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PasskeyList {
    pub passkeys: Vec<PasskeySummary>,
    pub rp_id: String,
    /// The user handle the passkeys carry, base64url-encoded.
    pub user_handle: String,
}
