//! Named path parameters for routes nested under `/groups/{group_id}`.
//!
//! Axum hands every captured segment of a nested route to `Path`, including
//! the outer `group_id`, so handlers deserialize named fields instead of
//! positional tuples; unknown fields such as `group_id` are simply ignored.

use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct GroupPath {
    pub group_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct IdPath {
    pub id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct MemberPath {
    pub user_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct SubjectPath {
    pub subject_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct ItemImagePath {
    pub id: Uuid,
    pub public_id: String,
}
