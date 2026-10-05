use super::{dto::ScheduleSubsQuery, service::ScheduleService};
use crate::{
    common::{extractors::TenantContext, personalization::hidden_by_courses_header},
    error::AppResult,
    state::AppState,
};
use axum::{
    Json,
    extract::{Query, State},
    response::IntoResponse,
};
use serde_json::Value;

pub async fn get_schedule(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<impl IntoResponse> {
    let schedule = ScheduleService::from_state(&s)
        .get_schedule(tc.tenant_id, Some(tc.user.user_id))
        .await?;

    Ok((
        hidden_by_courses_header(schedule.hidden_by_courses),
        Json(schedule.lessons),
    ))
}
pub async fn get_subs(
    State(s): State<AppState>,
    tc: TenantContext,
    Query(weeks): Query<ScheduleSubsQuery>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ScheduleService::from_state(&s)
            .get_subs(tc.tenant_id, weeks)
            .await?,
    ))
}
pub async fn get_subjects(State(s): State<AppState>, tc: TenantContext) -> AppResult<Json<Value>> {
    Ok(Json(
        ScheduleService::from_state(&s)
            .get_subjects(tc.tenant_id)
            .await?,
    ))
}
