use serde::{Deserialize, Serialize};

/// What the sign-in and sign-up pages need to know before anyone signs in.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessStatusDto {
    pub registration_open: bool,
    pub maintenance: bool,
}

/// Each switch is changed only when sent, so two admins flipping different
/// switches at once never undo each other. Serialized as is for the audit log.
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct UpdateAccessControlsDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub registration_paused: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub maintenance: Option<bool>,
}

impl UpdateAccessControlsDto {
    pub const fn is_empty(&self) -> bool {
        self.registration_paused.is_none() && self.maintenance.is_none()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn parse(body: serde_json::Value) -> UpdateAccessControlsDto {
        serde_json::from_value(body).unwrap()
    }

    #[test]
    fn only_sent_switches_are_changed_and_logged() {
        let changes = parse(json!({ "maintenance": true }));
        assert_eq!(changes.registration_paused, None);
        assert_eq!(json!(changes), json!({ "maintenance": true }));
    }

    #[test]
    fn a_body_without_switches_is_empty() {
        assert!(parse(json!({})).is_empty());
        assert!(!parse(json!({ "registrationPaused": false })).is_empty());
    }

    #[test]
    fn unknown_switches_are_rejected() {
        let body = json!({ "lockdown": true });
        assert!(serde_json::from_value::<UpdateAccessControlsDto>(body).is_err());
    }
}
