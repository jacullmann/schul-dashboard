use crate::error::AppError;
use aes_gcm::{
    Aes256Gcm, Key, Nonce,
    aead::{Aead, KeyInit, OsRng, rand_core::RngCore},
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EncryptedPayload {
    pub iv: String,
    pub data: String,
    pub auth_tag: String,
}

const KEY_CACHE_TTL: Duration = Duration::from_secs(5 * 60);
const KEY_CACHE_MAX: usize = 500;

struct CacheEntry {
    key: [u8; 32],
    at: Instant,
}

#[derive(Clone)]
pub struct EncryptionService {
    encryption_key: String,
    pepper: String,
    cache: Arc<Mutex<HashMap<String, CacheEntry>>>,
}

impl EncryptionService {
    pub fn new(encryption_key: String, pepper: String) -> Self {
        Self {
            encryption_key,
            pepper,
            cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    async fn derive_key(&self, user_id: &str) -> Result<[u8; 32], AppError> {
        {
            let cache = self.cache.lock().unwrap();

            if let Some(entry) = cache.get(user_id)
                && entry.at.elapsed() < KEY_CACHE_TTL
            {
                return Ok(entry.key);
            }
        }

        let key_material = format!("{}{}{}", self.encryption_key, self.pepper, user_id);

        let salt = Sha256::new()
            .chain_update(self.encryption_key.as_bytes())
            .chain_update(user_id.as_bytes())
            .finalize();

        let key_material = key_material.clone();

        let salt = salt.to_vec();

        let derived = tokio::task::spawn_blocking(move || {
            let params = scrypt::Params::new(14, 8, 1).expect("valid scrypt params");

            let mut key = [0u8; 32];

            scrypt::scrypt(key_material.as_bytes(), &salt, &params, &mut key)
                .expect("scrypt failed");
            key
        })
        .await
        .map_err(|e| AppError::internal(format!("Key derivation spawn failed: {e}")))?;

        let mut cache = self.cache.lock().unwrap();

        if cache.len() >= KEY_CACHE_MAX
            && let Some(oldest) = cache
                .iter()
                .min_by_key(|(_, v)| v.at)
                .map(|(k, _)| k.clone())
        {
            cache.remove(&oldest);
        }
        cache.insert(
            user_id.to_string(),
            CacheEntry {
                key: derived,
                at: Instant::now(),
            },
        );

        Ok(derived)
    }

    pub async fn encrypt(&self, data: &str, user_id: &str) -> Result<EncryptedPayload, AppError> {
        let key_bytes = self.derive_key(user_id).await?;

        let key = Key::<Aes256Gcm>::from_slice(&key_bytes);

        let cipher = Aes256Gcm::new(key);

        let mut iv_bytes = [0u8; 12];

        OsRng.fill_bytes(&mut iv_bytes);

        let nonce = Nonce::from_slice(&iv_bytes);

        let mut ciphertext = cipher
            .encrypt(nonce, data.as_bytes())
            .map_err(|e| AppError::internal(format!("Encryption failed: {e}")))?;

        let auth_tag = ciphertext.split_off(ciphertext.len() - 16);

        Ok(EncryptedPayload {
            iv: hex::encode(iv_bytes),
            data: hex::encode(&ciphertext),
            auth_tag: hex::encode(auth_tag),
        })
    }

    pub async fn decrypt(
        &self,
        payload: &EncryptedPayload,
        user_id: &str,
    ) -> Result<String, AppError> {
        let key_bytes = self.derive_key(user_id).await?;

        let key = Key::<Aes256Gcm>::from_slice(&key_bytes);

        let cipher = Aes256Gcm::new(key);

        let iv = hex::decode(&payload.iv).map_err(|_| AppError::internal("Invalid IV encoding"))?;

        let mut ciphertext = hex::decode(&payload.data)
            .map_err(|_| AppError::internal("Invalid ciphertext encoding"))?;

        let auth_tag = hex::decode(&payload.auth_tag)
            .map_err(|_| AppError::internal("Invalid auth tag encoding"))?;

        ciphertext.extend_from_slice(&auth_tag);

        let nonce = Nonce::from_slice(&iv);

        let plaintext = cipher
            .decrypt(nonce, ciphertext.as_ref())
            .map_err(|_| AppError::internal("Decryption failed"))?;

        String::from_utf8(plaintext)
            .map_err(|_| AppError::internal("Decrypted data is not valid UTF-8"))
    }
}
