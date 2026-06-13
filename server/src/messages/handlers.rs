use super::{dto::*, gateway::BusEvent, service::MessagesService};
use crate::{
    common::{extractors::TenantContext, permission::Permission},
    error::AppResult,
    reports::service::ReportsService,
    require_permission,
    state::AppState,
};
use axum::{
    Json,
    extract::{Path, State},
};
use serde_json::{Value, json};
use uuid::Uuid;

pub async fn get_messages(State(s): State<AppState>, tc: TenantContext) -> AppResult<Json<Value>> {
    Ok(Json(
        MessagesService::from_state(&s)
            .get_messages(tc.tenant_id, tc.user.user_id)
            .await?,
    ))
}

pub async fn mark_read(State(s): State<AppState>, tc: TenantContext) -> AppResult<Json<Value>> {
    MessagesService::from_state(&s)
        .mark_read(tc.tenant_id, tc.user.user_id)
        .await?;

    Ok(Json(json!({ "ok": true })))
}

pub async fn create_message(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<CreateMessageDto>,
) -> AppResult<Json<Value>> {
    require_permission!(tc, Permission::SendMessages);

    let msg = MessagesService::from_state(&s)
        .create_message(tc.tenant_id, tc.user.user_id, &dto.content, dto.parent_id)
        .await?;

    s.message_bus
        .broadcast(
            tc.tenant_id,
            BusEvent::NewMessage {
                message: msg.clone(),
            },
        )
        .await;

    Ok(Json(msg))
}

pub async fn delete_message(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(msg_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let can_delete_others = tc.can(Permission::DeleteOtherContent);

    MessagesService::from_state(&s)
        .delete_message(tc.tenant_id, tc.user.user_id, msg_id, can_delete_others)
        .await?;

    s.message_bus
        .broadcast(
            tc.tenant_id,
            BusEvent::MessageDeleted { message_id: msg_id },
        )
        .await;

    Ok(Json(json!({ "ok": true })))
}

pub async fn report_message(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<ReportMessageDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ReportsService::from_state(&s)
            .report_message(
                tc.tenant_id,
                tc.user.user_id,
                &tc.user.email,
                dto.message_id,
                dto.reason.as_deref(),
            )
            .await?,
    ))
}
