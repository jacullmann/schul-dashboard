use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize)]
pub struct UpdateUserRoleDto {
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct ProcessReportDto {
    pub processed: bool,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateSubjectDto {
    #[validate(length(min = 2, max = 50))]
    pub name: String,
}
