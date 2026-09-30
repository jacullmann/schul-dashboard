use crate::config::Config;
use chrono::Utc;
use reqwest::Client;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::sync::Arc;

/// The Admin API accepts at most this many public IDs per delete request.
const DELETE_BATCH_SIZE: usize = 100;

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

    pub fn folder(&self) -> &str {
        &self.0.folder
    }

    /// Only assets in this deployment's folder may ever be deleted, so a
    /// tampered image record cannot reach anything else in the account.
    pub fn owns(&self, public_id: &str) -> bool {
        let in_folder = public_id
            .strip_prefix(self.0.folder.as_str())
            .is_some_and(|rest| rest.starts_with('/'));
        let well_formed = !public_id.contains("..")
            && public_id
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || matches!(c, '/' | '_' | '-' | '.'));
        in_folder && well_formed
    }

    pub fn sign_upload(&self) -> Value {
        let Inner {
            cloud_name,
            api_key,
            api_secret,
            folder,
            ..
        } = &*self.0;
        let timestamp = Utc::now().timestamp();

        let signature = hex::encode(Sha256::digest(format!(
            "folder={folder}&timestamp={timestamp}{api_secret}"
        )));

        json!({
            "cloudName": cloud_name,
            "apiKey": api_key,
            "timestamp": timestamp,
            "signature": signature,
            "folder": folder,
        })
    }

    /// Deletes the assets and purges them from the CDN cache. IDs outside this
    /// deployment's folder are skipped.
    pub async fn delete(&self, public_ids: &[String]) -> reqwest::Result<()> {
        let owned = public_ids.iter().filter(|id| self.owns(id));
        let (raw, image): (Vec<&String>, Vec<&String>) =
            owned.partition(|id| ResourceType::of(id) == ResourceType::Raw);

        for (resource_type, ids) in [(ResourceType::Image, image), (ResourceType::Raw, raw)] {
            for batch in ids.chunks(DELETE_BATCH_SIZE) {
                self.delete_batch(resource_type, batch).await?;
            }
        }

        Ok(())
    }

    async fn delete_batch(
        &self,
        resource_type: ResourceType,
        public_ids: &[&String],
    ) -> reqwest::Result<()> {
        let Inner {
            http,
            cloud_name,
            api_key,
            api_secret,
            ..
        } = &*self.0;
        let url = format!(
            "https://api.cloudinary.com/v1_1/{cloud_name}/resources/{}/upload",
            resource_type.as_str()
        );
        let query: Vec<(&str, &str)> = public_ids
            .iter()
            .map(|id| ("public_ids[]", id.as_str()))
            .chain([("invalidate", "true")])
            .collect();

        http.delete(url)
            .basic_auth(api_key, Some(api_secret))
            .query(&query)
            .send()
            .await?
            .error_for_status()?;

        Ok(())
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
        assert!(!c.owns("hausaufgaben/../other/abc"));
        assert!(!c.owns("http://localhost:3000/mock/upload/worksheet-mathe.svg"));
    }

    #[test]
    fn raw_assets_keep_their_extension() {
        assert_eq!(ResourceType::of("hausaufgaben/abc.docx"), ResourceType::Raw);
        assert_eq!(ResourceType::of("hausaufgaben/abc"), ResourceType::Image);
        assert_eq!(ResourceType::of("hausaufgaben.v2/abc"), ResourceType::Image);
    }
}
