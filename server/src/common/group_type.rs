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

/// The category that makes every course below it a Zusatzkurs.
pub const ZUSATZKURS_CATEGORY: &str = "zk";

/// Course types an editor may pick. `zk` is missing on purpose: it follows from
/// the subject category instead of being chosen per course.
pub const SELECTABLE_COURSE_TYPES: &[&str] = &["gk", "lk"];

pub const DEFAULT_COURSE_TYPE: &str = "gk";

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

    /// The subject categories that may be assigned in this kind of group. Both
    /// sets describe how a member picks a course, never how a course is graded.
    pub const fn subject_categories(self) -> &'static [&'static str] {
        match self {
            Self::Regular => &["core", "elective", "extra"],
            Self::Abitur => &["mandatory", "optional", ZUSATZKURS_CATEGORY],
        }
    }

    pub fn allows_category(self, category: &str) -> bool {
        self.subject_categories().contains(&category)
    }

    /// Only Abitur courses carry a GK/LK/ZK type.
    pub const fn uses_course_types(self) -> bool {
        matches!(self, Self::Abitur)
    }
}

/// The type a course ends up with. A Zusatzkurs subject forces `zk` on all of
/// its courses, a regular group has no course types at all, and every other
/// Abitur subject lets the editor pick between GK and LK.
pub fn resolve_course_type(
    group_type: GroupType,
    subject_category: &str,
    requested: Option<&str>,
) -> Result<Option<&'static str>, String> {
    if !group_type.uses_course_types() {
        return Ok(None);
    }

    if subject_category == ZUSATZKURS_CATEGORY {
        return Ok(Some("zk"));
    }

    let Some(requested) = requested else {
        return Ok(Some(DEFAULT_COURSE_TYPE));
    };

    SELECTABLE_COURSE_TYPES
        .iter()
        .find(|t| **t == requested)
        .copied()
        .map(Some)
        .ok_or_else(|| {
            format!(
                "Course type '{requested}' is not available. Allowed: {}.",
                SELECTABLE_COURSE_TYPES.join(", ")
            )
        })
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
        assert!(!GroupType::Regular.allows_category("mandatory"));
        assert!(GroupType::Abitur.allows_category("mandatory"));
        assert!(!GroupType::Abitur.allows_category("core"));
    }

    #[test]
    fn regular_courses_have_no_type() {
        assert_eq!(
            resolve_course_type(GroupType::Regular, "elective", Some("lk")),
            Ok(None)
        );
    }

    #[test]
    fn zusatzkurs_subjects_force_zk_on_their_courses() {
        assert_eq!(
            resolve_course_type(GroupType::Abitur, ZUSATZKURS_CATEGORY, Some("lk")),
            Ok(Some("zk"))
        );
    }

    #[test]
    fn abitur_courses_pick_between_gk_and_lk() {
        assert_eq!(
            resolve_course_type(GroupType::Abitur, "mandatory", Some("lk")),
            Ok(Some("lk"))
        );
        assert_eq!(
            resolve_course_type(GroupType::Abitur, "optional", None),
            Ok(Some("gk"))
        );
        assert!(resolve_course_type(GroupType::Abitur, "mandatory", Some("zk")).is_err());
    }
}
