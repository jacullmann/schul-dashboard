use crate::config::Config;
use chrono::Utc;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Arc;
use uuid::Uuid;

/// Office documents are uploaded as raw assets, whose public ID keeps the file
/// extension; images and PDFs never carry one.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RawExtension {
    Docx,
    Pptx,
    Xlsx,
}

impl RawExtension {
    const ALL: [Self; 3] = [Self::Docx, Self::Pptx, Self::Xlsx];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Docx => "docx",
            Self::Pptx => "pptx",
            Self::Xlsx => "xlsx",
        }
    }

    pub fn parse(extension: &str) -> Option<Self> {
        Self::ALL
            .into_iter()
            .find(|raw| raw.as_str().eq_ignore_ascii_case(extension))
    }
}

/// Everything a client needs to upload exactly one file, under the public ID
/// the server chose for it.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadSignature {
    cloud_name: String,
    api_key: String,
    timestamp: i64,
    signature: String,
    public_id: String,
}

/// The delivery URL of an image this deployment uploaded, as checked by
/// [`Cloudinary::own_image_url`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OwnImageUrl(String);

impl OwnImageUrl {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

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

    /// `url` if it delivers an image of this deployment in the form an upload
    /// response's `secure_url` names it: `…/image/upload/v<version>/<public
    /// ID>.<format>`. Clients load stored URLs as they are, so anything else,
    /// such as another host or a file outside this deployment's folder, must
    /// never be stored. The `referenced_assets` view reads the public ID back
    /// out of this same shape.
    pub fn own_image_url(&self, url: &str) -> Option<OwnImageUrl> {
        let path = url
            .strip_prefix("https://res.cloudinary.com/")?
            .strip_prefix(self.0.cloud_name.as_str())?
            .strip_prefix("/image/upload/")?;

        let path = match path.split_once('/') {
            Some((version, rest)) if is_version(version) => rest,
            _ => path,
        };

        let (public_id, format) = path.rsplit_once('.')?;
        let is_own_image = !format.is_empty()
            && format.bytes().all(|b| b.is_ascii_alphanumeric())
            && ResourceType::of(public_id) == ResourceType::Image
            && self.owns(public_id)
            && is_well_formed_public_id(public_id);

        is_own_image.then(|| OwnImageUrl(url.to_owned()))
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

    /// A fresh, unguessable public ID in this deployment's folder. Raw assets
    /// keep their extension in the ID, as Cloudinary requires.
    pub fn new_public_id(&self, raw_extension: Option<RawExtension>) -> String {
        let stem = format!("{}/{}", self.0.folder, Uuid::new_v4().simple());
        match raw_extension {
            Some(raw) => format!("{stem}.{}", raw.as_str()),
            None => stem,
        }
    }

    /// Signing the public ID binds the upload to it: the client can upload one
    /// file, and only under the ID the server recorded.
    pub fn sign_upload(&self, public_id: &str) -> UploadSignature {
        let timestamp = Utc::now().timestamp();
        let signature = self.sign(&mut [
            ("public_id", public_id),
            ("timestamp", &timestamp.to_string()),
        ]);

        UploadSignature {
            cloud_name: self.0.cloud_name.clone(),
            api_key: self.0.api_key.clone(),
            timestamp,
            signature,
            public_id: public_id.to_owned(),
        }
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

/// Whether the public ID uses only the characters this deployment generates,
/// plus the extension of a raw office document.
pub fn is_well_formed_public_id(public_id: &str) -> bool {
    let stem = match public_id.rsplit_once('.') {
        Some((stem, extension)) if RawExtension::parse(extension).is_some() => stem,
        Some(_) => return false,
        None => public_id,
    };
    stem.chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '/' | '_' | '-'))
}

/// The `v<digits>` segment Cloudinary puts in front of a public ID.
fn is_version(segment: &str) -> bool {
    segment
        .strip_prefix('v')
        .is_some_and(|digits| !digits.is_empty() && digits.bytes().all(|b| b.is_ascii_digit()))
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
    fn new_public_ids_are_owned_and_keep_raw_extensions() {
        let c = cloudinary();
        let image = c.new_public_id(None);
        let raw = c.new_public_id(Some(RawExtension::Docx));

        assert!(c.owns(&image) && c.owns(&raw));
        assert_eq!(ResourceType::of(&image), ResourceType::Image);
        assert_eq!(ResourceType::of(&raw), ResourceType::Raw);
        assert!(raw.ends_with(".docx"));
        assert_ne!(image, c.new_public_id(None));
    }

    #[test]
    fn accepts_own_image_urls_as_uploads_return_them() {
        let c = cloudinary();
        for url in [
            "https://res.cloudinary.com/cloud/image/upload/v1712345678/hausaufgaben/abc123.jpg",
            "https://res.cloudinary.com/cloud/image/upload/hausaufgaben/abc.png",
        ] {
            assert_eq!(c.own_image_url(url).unwrap().as_str(), url);
        }
    }

    #[test]
    fn rejects_foreign_or_malformed_image_urls() {
        let c = cloudinary();
        for url in [
            "",
            "javascript:alert(1)",
            "https://evil.example/hausaufgaben/abc.jpg",
            "http://res.cloudinary.com/cloud/image/upload/v1/hausaufgaben/abc.jpg",
            "https://res.cloudinary.com/other/image/upload/v1/hausaufgaben/abc.jpg",
            "https://res.cloudinary.com/cloudx/image/upload/v1/hausaufgaben/abc.jpg",
            "https://res.cloudinary.com/cloud/raw/upload/v1/hausaufgaben/abc.docx",
            "https://res.cloudinary.com/cloud/image/upload/v1/other/abc.jpg",
            "https://res.cloudinary.com/cloud/image/upload/v1/hausaufgaben/abc",
            "https://res.cloudinary.com/cloud/image/upload/v1/hausaufgaben/abc.docx.jpg",
            "https://res.cloudinary.com/cloud/image/upload/v1/hausaufgaben/../x/abc.jpg",
            "https://res.cloudinary.com/cloud/image/upload/v1/hausaufgaben/abc.jpg?x=1",
            "https://res.cloudinary.com/cloud/image/upload/w_9999/hausaufgaben/abc.jpg",
        ] {
            assert!(c.own_image_url(url).is_none(), "accepted {url:?}");
        }
    }

    #[test]
    fn accepts_image_and_office_public_ids() {
        assert!(is_well_formed_public_id("hausaufgaben/abc_123-x"));
        assert!(is_well_formed_public_id("hausaufgaben/abc123.docx"));
        assert!(is_well_formed_public_id("hausaufgaben/abc123.PPTX"));
    }

    #[test]
    fn rejects_other_extensions_and_characters() {
        assert!(!is_well_formed_public_id("hausaufgaben/abc.exe"));
        assert!(!is_well_formed_public_id("hausaufgaben/abc.docx.docx"));
        assert!(!is_well_formed_public_id("hausaufgaben/../abc.docx"));
        assert!(!is_well_formed_public_id("hausaufgaben/a b"));
    }

    #[test]
    fn parses_raw_extensions_case_insensitively() {
        assert_eq!(RawExtension::parse("PPTX"), Some(RawExtension::Pptx));
        assert_eq!(RawExtension::parse("pdf"), None);
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
