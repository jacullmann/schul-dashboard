//! Fields of PATCH bodies that can be left alone, set or cleared.

use serde::{Deserialize, Deserializer};

/// Tells an absent field from an explicit `null`: with `#[serde(default,
/// deserialize_with = "patch::nullable")]` a missing field stays `None`
/// (unchanged), `null` becomes `Some(None)` (cleared) and a value becomes
/// `Some(Some(value))` (set).
pub fn nullable<'de, D, T>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    Option::<T>::deserialize(deserializer).map(Some)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Deserialize)]
    struct Body {
        #[serde(default, deserialize_with = "nullable")]
        field: Option<Option<String>>,
    }

    fn field(json: &str) -> Option<Option<String>> {
        serde_json::from_str::<Body>(json).unwrap().field
    }

    #[test]
    fn tells_absent_null_and_value_apart() {
        assert_eq!(field("{}"), None);
        assert_eq!(field(r#"{"field":null}"#), Some(None));
        assert_eq!(field(r#"{"field":"x"}"#), Some(Some("x".to_owned())));
    }
}
