use super::{archive, service::DataExportService};
use crate::{common::extractors::RecentAuth, error::AppResult, state::AppState};
use axum::{
    extract::State,
    http::header::{CACHE_CONTROL, CONTENT_DISPOSITION, CONTENT_TYPE},
    response::IntoResponse,
};

/// The archive holds everything about the account, so it needs a recent
/// sign-in, as a stolen session must not be enough to take it.
pub async fn export_data(
    State(s): State<AppState>,
    RecentAuth(user): RecentAuth,
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
