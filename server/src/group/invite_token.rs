use crate::error::AppError;
use std::str::FromStr;

const TOKEN_BYTES: usize = 32;

/// A syntactically valid invite token. Malformed input is rejected before it
/// reaches the database, with the same error as an unknown token so callers
/// cannot tell the two apart.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InviteToken(String);

impl InviteToken {
    pub fn generate() -> Self {
        Self(hex::encode(rand::random::<[u8; TOKEN_BYTES]>()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl FromStr for InviteToken {
    type Err = AppError;

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        let well_formed = raw.len() == TOKEN_BYTES * 2
            && raw.bytes().all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'f'));

        if well_formed {
            Ok(Self(raw.to_owned()))
        } else {
            Err(invalid_invite())
        }
    }
}

pub fn invalid_invite() -> AppError {
    AppError::bad_request("Invalid or expired invite token.")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_tokens_round_trip_through_parse() {
        let token = InviteToken::generate();
        assert_eq!(token.as_str().parse::<InviteToken>().unwrap(), token);
    }

    #[test]
    fn rejects_malformed_tokens() {
        let valid = "a".repeat(TOKEN_BYTES * 2);
        assert!(valid.parse::<InviteToken>().is_ok());

        for raw in [
            "",
            "abc",
            &"a".repeat(TOKEN_BYTES * 2 + 1),
            &"A".repeat(TOKEN_BYTES * 2),
            &"g".repeat(TOKEN_BYTES * 2),
            &format!("{}'", "a".repeat(TOKEN_BYTES * 2 - 1)),
        ] {
            assert!(raw.parse::<InviteToken>().is_err(), "accepted {raw:?}");
        }
    }
}
