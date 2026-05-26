use petname::Petnames;
use rand::{SeedableRng, rngs::StdRng};
use sha2::{Digest, Sha256};

pub fn generate_user_name(user_id: &str, group_id: &str) -> String {
    let mut hasher = Sha256::new();

    hasher.update(user_id.as_bytes());
    hasher.update(group_id.as_bytes());

    let hash_result = hasher.finalize();

    let mut seed_bytes = [0u8; 8];
    seed_bytes.copy_from_slice(&hash_result[..8]);
    let seed = u64::from_le_bytes(seed_bytes);

    let mut rng = StdRng::seed_from_u64(seed);
    let petnames = Petnames::default();

    let raw_name = petnames
        .namer(3, "-")
        .iter(&mut rng)
        .next()
        .unwrap_or_else(|| "anonymous-user-name".to_string());

    let mut result = String::with_capacity(raw_name.len());

    for word in raw_name.split('-') {
        let mut chars = word.chars();

        if let Some(first) = chars.next() {
            result.extend(first.to_uppercase());
            result.push_str(chars.as_str());
        }
    }

    result
}
