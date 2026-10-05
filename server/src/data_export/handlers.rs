use super::{archive, service::DataExportService};
use crate::{common::extractors::AuthUser, error::AppResult, state::AppState};
use axum::{
    extract::State,
    http::header::{CACHE_CONTROL, CONTENT_DISPOSITION, CONTENT_TYPE},
    response::IntoResponse,
};

pub async fn export_data(
    State(s): State<AppState>,
    user: AuthUser,
) -> AppResult<impl IntoResponse> {
    let svc = DataExportService::from_state(&s);

    let export = svc.collect(user.user_id).await?;
    let file_name = archive::file_name(export.exported_at);
    let bytes = archive::build(export).await?;

    svc.log_export(user.user_id).await?;

    Ok((
        [
            (CONTENT_TYPE, "application/zip".to_owned()),
            (
                CONTENT_DISPOSITION,
                format!("attachment; filename=\"{file_name}\""),
            ),
            (CACHE_CONTROL, "no-store".to_owned()),
        ],
        bytes,
    ))
}
