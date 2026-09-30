use crate::config::Config;
use chrono::Utc;
use reqwest::Client;
use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::sync::Arc;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ResourceType {
    Image,
    Raw,
}

impl ResourceType {
    /// Cloudinary keeps the file extension in a raw asset's public ID but never
    /// in an image's, so the ID alone tells which endpoint owns the asset.
    fn of(public_id: &str) -> Self {
        let file_name = public_id.rsplit('/').next().unwrap_or(public_id);
        if file_name.contains('.') {
            Self::Raw
        } else {
            Self::Image
        }
    }

    const fn as_str(self) -> &'static str {
        match self {
            Self::Image => "image",
            Self::Raw => "raw",
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum CloudinaryError {
    #[error(transparent)]
    Http(#[from] reqwest::Error),
    #[error("Cloudinary rejected the request: {0}")]
    Rejected(String),
}

#[derive(Deserialize)]
struct DestroyResponse {
    result: String,
}

#[derive(Clone)]
pub struct Cloudinary(Arc<Inner>);

struct Inner {
    http: Client,
    cloud_name: String,
    api_key: String,
    api_secret: String,
    folder: String,
}

impl Cloudinary {
    pub fn new(http: Client, config: &Config) -> Self {
        Self(Arc::new(Inner {
            http,
            cloud_name: config.cloudinary_cloud_name.clone(),
            api_key: config.cloudinary_api_key.clone(),
            api_secret: config.cloudinary_api_secret.clone(),
            folder: config.cloudinary_folder.clone(),
        }))
    }

    /// Whether the asset lives in this deployment's folder. Nothing outside it
    /// may be attached to a task or deleted, so a tampered image record cannot
    /// reach other assets in the account.
    pub fn owns(&self, public_id: &str) -> bool {
        public_id
            .strip_prefix(self.0.folder.as_str())
            .is_some_and(|rest| rest.starts_with('/'))
    }

    /// Signs `params` as Cloudinary expects: sorted by name, joined as a query
    /// string suffixed with the API secret. Only `&` is escaped, so a value
    /// cannot smuggle in another signed parameter.
    fn sign(&self, params: &mut [(&str, &str)]) -> String {
        params.sort_unstable_by_key(|&(name, _)| name);
        let joined = params
            .iter()
            .map(|(name, value)| format!("{name}={}", value.replace('&', "%26")))
            .collect::<Vec<_>>()
            .join("&");
        hex::encode(Sha256::digest(format!("{joined}{}", self.0.api_secret)))
    }

    pub fn sign_upload(&self) -> Value {
        let folder = &self.0.folder;
        let timestamp = Utc::now().timestamp();
        let signature = self.sign(&mut [("folder", folder), ("timestamp", &timestamp.to_string())]);

        json!({
            "cloudName": self.0.cloud_name,
            "apiKey": self.0.api_key,
            "timestamp": timestamp,
            "signature": signature,
            "folder": folder,
        })
    }

    /// Deletes the asset and purges it from the CDN. An asset that is already
    /// gone counts as deleted.
    pub async fn destroy(&self, public_id: &str) -> Result<(), CloudinaryError> {
        let url = format!(
            "https://api.cloudinary.com/v1_1/{}/{}/destroy",
            self.0.cloud_name,
            ResourceType::of(public_id).as_str()
        );
        let timestamp = Utc::now().timestamp().to_string();
        let mut params = [
            ("public_id", public_id),
            ("invalidate", "true"),
            ("timestamp", timestamp.as_str()),
        ];
        let signature = self.sign(&mut params);
        let form = [
            params.as_slice(),
            &[("api_key", &self.0.api_key), ("signature", &signature)],
        ]
        .concat();

        let response: DestroyResponse = self
            .0
            .http
            .post(url)
            .form(&form)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        match response.result.as_str() {
            "ok" | "not found" => Ok(()),
            other => Err(CloudinaryError::Rejected(other.to_owned())),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cloudinary() -> Cloudinary {
        Cloudinary(Arc::new(Inner {
            http: Client::new(),
            cloud_name: "cloud".into(),
            api_key: "key".into(),
            api_secret: "secret".into(),
            folder: "hausaufgaben".into(),
        }))
    }

    #[test]
    fn owns_only_assets_in_its_folder() {
        let c = cloudinary();
        assert!(c.owns("hausaufgaben/abc_123-x"));
        assert!(c.owns("hausaufgaben/abc.docx"));
        assert!(!c.owns("hausaufgaben"));
        assert!(!c.owns("hausaufgaben-other/abc"));
        assert!(!c.owns("other/abc"));
        assert!(!c.owns("http://localhost:3000/mock/upload/worksheet-mathe.svg"));
    }

    #[test]
    fn raw_assets_keep_their_extension() {
        assert_eq!(ResourceType::of("hausaufgaben/abc.docx"), ResourceType::Raw);
        assert_eq!(ResourceType::of("hausaufgaben/abc"), ResourceType::Image);
        assert_eq!(ResourceType::of("hausaufgaben.v2/abc"), ResourceType::Image);
    }

    /// Expected value computed with the official Python SDK's `api_sign_request`.
    #[test]
    fn signs_like_the_official_sdk() {
        let signature = cloudinary().sign(&mut [
            ("timestamp", "1"),
            ("public_id", "a/b"),
            ("invalidate", "true"),
        ]);
        assert_eq!(
            signature,
            "c72af05206ba30163c7595bfd0025674f705077a7c99fdb9a8fdbce395161b50"
        );
    }

    #[test]
    fn escapes_ampersands_in_signed_values() {
        let signature = cloudinary().sign(&mut [("public_id", "a&timestamp=2")]);
        assert_eq!(
            signature,
            hex::encode(Sha256::digest("public_id=a%26timestamp=2secret"))
        );
    }
}
