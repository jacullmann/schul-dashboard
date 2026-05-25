use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

impl PaginationQuery {
    pub fn limit(&self) -> i64 {
        self.limit.unwrap_or(50).min(200)
    }

    pub fn offset(&self) -> i64 {
        self.offset.unwrap_or(0)
    }
}