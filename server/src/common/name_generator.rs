use petname::Petnames;
use rand::{SeedableRng, rngs::StdRng};

pub fn generate_user_name(user_id: &str, group_id: &str) -> String {
    let combined = format!("{}{}", user_id, group_id);

    let mut seed: i32 = 0;
    for b in combined.bytes() {
        seed = (seed << 5).wrapping_sub(seed).wrapping_add(b as i32);
    }

    let abs_seed = seed.unsigned_abs() as u64;

    let mut rng = StdRng::seed_from_u64(abs_seed);

    let petnames = Petnames::default();

    let raw_name = petnames
        .generate(&mut rng, 3, "-")
        .unwrap_or_else(|| "AnonymousUser".to_string());

    raw_name
        .split('-')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first_char) => first_char.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .collect::<String>()
}
