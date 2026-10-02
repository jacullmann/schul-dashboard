//! Client for the Cloudinary upload API. Only the server talks to it: clients
//! never receive upload credentials, so every stored file has passed the
//! server's checks first.

use crate::config::Config;
use chrono::Utc;
use reqwest::{
    Client,
    multipart::{Form, Part},
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{sync::Arc, time::Duration};
use uuid::Uuid;

/// Uploads carry up to a few megabytes, far more than the default timeout of
/// the shared HTTP client is meant for.
const UPLOAD_TIMEOUT: Duration = Duration::from_secs(60);

/// Cloudinary keeps images, which it can transform on delivery, apart from raw
/// files, which it serves as they are.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "text", rename_all = "lowercase")]
pub enum ResourceType {
    Image,
    Raw,
}

impl ResourceType {
    const fn as_str(self) -> &'static str {
        match self {
            Self::Image => "image",
            Self::Raw => "raw",
        }
    }
}

/// What Cloudinary measured for an uploaded image; raw files have no size.
#[derive(Debug, Deserialize)]
pub struct UploadResult {
    pub width: Option<i32>,
    pub height: Option<i32>,
}

#[derive(Debug, thiserror::Error)]
pub enum CloudinaryError {
    #[error(transparent)]
    Http(#[from] reqwest::Error),
    #[error("Cloudinary rejected the request: {0}")]
    Rejected(String),
}

#[derive(Deserialize)]
struct ErrorResponse {
    error: ErrorMessage,
}

#[derive(Deserialize)]
struct ErrorMessage {
    message: String,
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

    /// A fresh, unguessable public ID in this deployment's folder. Raw assets
    /// keep their extension in the ID, as Cloudinary requires.
    pub fn new_public_id(&self, raw_extension: Option<&str>) -> String {
        let stem = format!("{}/{}", self.0.folder, Uuid::new_v4().simple());
        match raw_extension {
            Some(extension) => format!("{stem}.{extension}"),
            None => stem,
        }
    }

    /// The URL clients load an image from, in the best format the browser
    /// accepts.
    pub fn image_url(&self, public_id: &str) -> String {
        format!(
            "https://res.cloudinary.com/{}/image/upload/f_auto,q_auto/{public_id}",
            self.0.cloud_name
        )
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

    /// Stores `bytes` under `public_id`. The caller has already verified the
    /// content, so the resource type is never left for Cloudinary to guess.
    pub async fn upload(
        &self,
        public_id: &str,
        resource_type: ResourceType,
        bytes: Vec<u8>,
    ) -> Result<UploadResult, CloudinaryError> {
        let url = format!(
            "https://api.cloudinary.com/v1_1/{}/{}/upload",
            self.0.cloud_name,
            resource_type.as_str()
        );
        let timestamp = Utc::now().timestamp().to_string();
        let signature =
            self.sign(&mut [("public_id", public_id), ("timestamp", timestamp.as_str())]);

        // The file name only names the part; Cloudinary stores the file under
        // the signed public ID.
        let form = Form::new()
            .text("api_key", self.0.api_key.clone())
            .text("public_id", public_id.to_owned())
            .text("timestamp", timestamp)
            .text("signature", signature)
            .part("file", Part::bytes(bytes).file_name("upload"));

        let response = self
            .0
            .http
            .post(url)
            .timeout(UPLOAD_TIMEOUT)
            .multipart(form)
            .send()
            .await?;

        // A 400 means Cloudinary could not process the file itself, e.g. an
        // image whose signature is valid but whose content is broken.
        if response.status() == reqwest::StatusCode::BAD_REQUEST {
            let message = response
                .json::<ErrorResponse>()
                .await
                .map_or_else(|_| "unreadable error".to_owned(), |body| body.error.message);
            return Err(CloudinaryError::Rejected(message));
        }

        Ok(response.error_for_status()?.json().await?)
    }

    /// Deletes the asset and purges it from the CDN. An asset that is already
    /// gone counts as deleted.
    pub async fn destroy(
        &self,
        public_id: &str,
        resource_type: ResourceType,
    ) -> Result<(), CloudinaryError> {
        let url = format!(
            "https://api.cloudinary.com/v1_1/{}/{}/destroy",
            self.0.cloud_name,
            resource_type.as_str()
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
    fn new_public_ids_live_in_the_folder_and_keep_raw_extensions() {
        let c = cloudinary();
        let image = c.new_public_id(None);
        let raw = c.new_public_id(Some("docx"));

        assert!(image.starts_with("hausaufgaben/") && !image.contains('.'));
        assert!(raw.starts_with("hausaufgaben/") && raw.ends_with(".docx"));
        assert_ne!(image, c.new_public_id(None));
    }

    #[test]
    fn image_urls_point_at_the_cloud() {
        assert_eq!(
            cloudinary().image_url("hausaufgaben/abc"),
            "https://res.cloudinary.com/cloud/image/upload/f_auto,q_auto/hausaufgaben/abc"
        );
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
