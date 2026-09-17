use serde::{Deserialize, Serialize};

/// How a group organises its subjects and its schedule.
///
/// A regular group is one class that attends every lesson together. An Abitur
/// group is a whole year in which nearly every lesson belongs to a single
/// course, so lessons are scheduled per course instead of per subject.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum GroupType {
    #[default]
    Regular,
    Abitur,
}

impl GroupType {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Regular => "regular",
            Self::Abitur => "abitur",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "regular" => Some(Self::Regular),
            "abitur" => Some(Self::Abitur),
            _ => None,
        }
    }

    /// Unknown values from older rows degrade to a regular group instead of
    /// failing the request they appear in.
    pub fn from_str_or_regular(s: &str) -> Self {
        Self::from_str(s).unwrap_or(Self::Regular)
    }

    /// The subject categories that may be assigned in this kind of group.
    pub const fn subject_categories(self) -> &'static [&'static str] {
        match self {
            Self::Regular => &["core", "elective", "extra"],
            Self::Abitur => &["gk", "lk", "zk"],
        }
    }

    pub fn allows_category(self, category: &str) -> bool {
        self.subject_categories().contains(&category)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unknown_type_falls_back_to_regular() {
        assert_eq!(
            GroupType::from_str_or_regular("gymnasium"),
            GroupType::Regular
        );
        assert_eq!(GroupType::from_str_or_regular("abitur"), GroupType::Abitur);
    }

    #[test]
    fn categories_are_scoped_to_the_group_type() {
        assert!(GroupType::Regular.allows_category("core"));
        assert!(!GroupType::Regular.allows_category("lk"));
        assert!(GroupType::Abitur.allows_category("lk"));
        assert!(!GroupType::Abitur.allows_category("core"));
    }
}
