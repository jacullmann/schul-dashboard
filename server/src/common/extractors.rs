use crate::{
    common::{
        permission::{GroupPermissions, Permission},
        role::Role,
    },
    config::ACCESS_COOKIE,
    error::AppError,
    state::AppState,
};
use axum::{
    Json,
    extract::{FromRef, FromRequest, FromRequestParts, Request, rejection::JsonRejection},
    http::request::Parts,
};
use axum_extra::extract::CookieJar;
use serde::de::DeserializeOwned;
use std::convert::Infallible;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub email: String,
    pub global_role: String,
    pub active_group_id: Option<Uuid>,
}

impl AuthUser {
    pub fn is_superadmin(&self) -> bool {
        self.global_role == "superadmin"
    }

    #[allow(dead_code)]
    pub fn role(&self) -> Role {
        Role::from_str_or_user(&self.global_role)
    }
}

impl<S> FromRequestParts<S> for AuthUser
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);

        let jar = CookieJar::from_request_parts(parts, state)
            .await
            .map_err(|_| AppError::AuthRequired)?;

        let token = jar
            .get(ACCESS_COOKIE)
            .map(|c| c.value().to_owned())
            .ok_or(AppError::AuthRequired)?;

        let claims = app_state.jwt.verify_access(&token)?;

        let user_id = claims
            .sub
            .parse::<Uuid>()
            .map_err(|_| AppError::TokenExpired)?;

        let active_group_id = claims.g_id.as_deref().and_then(|s| s.parse::<Uuid>().ok());

        Ok(AuthUser {
            user_id,
            email: claims.email,
            global_role: claims.g_role,
            active_group_id,
        })
    }
}

#[derive(Debug, Clone)]
pub struct OptionalAuth(pub Option<AuthUser>);

impl<S> FromRequestParts<S> for OptionalAuth
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = Infallible;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        Ok(OptionalAuth(
            AuthUser::from_request_parts(parts, state).await.ok(),
        ))
    }
}

#[derive(Debug, Clone)]
pub struct MfaPending {
    pub user_id: Uuid,
    pub email: String,
}

impl<S> FromRequestParts<S> for MfaPending
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        use crate::config::MFA_PENDING_COOKIE;

        let app_state = AppState::from_ref(state);

        let jar = CookieJar::from_request_parts(parts, state)
            .await
            .map_err(|_| AppError::Unauthorized("Authentication failed.".into()))?;

        let token = jar
            .get(MFA_PENDING_COOKIE)
            .map(|c| c.value().to_owned())
            .ok_or_else(|| AppError::Unauthorized("Authentication failed.".into()))?;

        let claims = app_state.jwt.verify_mfa_pending(&token)?;

        if claims.purpose != "mfa_pending" {
            return Err(AppError::Unauthorized("Authentication failed.".into()));
        }

        let user_id = claims
            .sub
            .parse::<Uuid>()
            .map_err(|_| AppError::Unauthorized("Authentication failed.".into()))?;

        Ok(MfaPending {
            user_id,
            email: claims.email,
        })
    }
}

#[derive(Debug, Clone)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub tenant_role: Role,
    pub group_owner_id: Option<Uuid>,
    pub group_permissions: GroupPermissions,
    pub user: AuthUser,
}

impl TenantContext {
    pub fn is_owner(&self) -> bool {
        self.group_owner_id
            .map(|id| id == self.user.user_id)
            .unwrap_or(false)
    }

    pub fn can(&self, permission: Permission) -> bool {
        if self.user.is_superadmin() {
            return true;
        }
        if self.is_owner() {
            return true;
        }
        let required = self.group_permissions.required_role(permission);
        self.tenant_role.dominates(required)
    }

    pub fn can_bypass_tenant_checks(&self) -> bool {
        self.user.is_superadmin() || self.is_owner()
    }

    #[allow(dead_code)]
    pub fn effective_permission_keys(&self) -> Vec<&'static str> {
        if self.can_bypass_tenant_checks() {
            return Permission::ALL.iter().map(|p| p.as_str()).collect();
        }
        self.group_permissions
            .allowed_keys_for_role(self.tenant_role)
    }
}

impl<S> FromRequestParts<S> for TenantContext
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);

        let user = AuthUser::from_request_parts(parts, state).await?;

        let tenant_id: Uuid = if user.is_superadmin() {
            if let Some(hdr) = parts.headers.get("x-tenant-id") {
                hdr.to_str()
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .ok_or_else(|| AppError::BadRequest("Invalid x-tenant-id header.".into()))?
            } else {
                user.active_group_id
                    .ok_or_else(|| AppError::Forbidden("Tenant context missing.".into()))?
            }
        } else {
            user.active_group_id
                .ok_or_else(|| AppError::Forbidden("Tenant context missing.".into()))?
        };

        if user.is_superadmin() {
            let row = sqlx::query!(
                r#"SELECT owner_id, permissions FROM groups WHERE id = $1"#,
                tenant_id
            )
            .fetch_optional(&app_state.db)
            .await?
            .ok_or_else(|| AppError::NotFound("Group not found.".into()))?;

            return Ok(TenantContext {
                tenant_id,
                tenant_role: Role::Superadmin,
                group_owner_id: Some(row.owner_id),
                group_permissions: GroupPermissions::from_json_with_defaults(&row.permissions),
                user,
            });
        }

        let row = sqlx::query!(
            r#"
            SELECT r.name as role_name, g.owner_id, g.permissions
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            JOIN groups g ON g.id = ur.tenant_id
            WHERE ur.user_id = $1 AND ur.tenant_id = $2
            LIMIT 1
            "#,
            user.user_id,
            tenant_id
        )
        .fetch_optional(&app_state.db)
        .await?
        .ok_or_else(|| AppError::Forbidden("Kein Zugriff auf diesen Tenant.".into()))?;

        Ok(TenantContext {
            tenant_id,
            tenant_role: Role::from_str_or_user(&row.role_name),
            group_owner_id: Some(row.owner_id),
            group_permissions: GroupPermissions::from_json_with_defaults(&row.permissions),
            user,
        })
    }
}

pub struct ClientIp(pub Option<String>);
pub struct UserAgent(pub Option<String>);

impl<S> FromRequestParts<S> for ClientIp
where
    S: Send + Sync,
{
    type Rejection = Infallible;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let ip = parts
            .headers
            .get("x-forwarded-for")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.split(',').next())
            .map(|s| s.trim().to_string());

        Ok(ClientIp(ip))
    }
}

impl<S> FromRequestParts<S> for UserAgent
where
    S: Send + Sync,
{
    type Rejection = Infallible;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let ua = parts
            .headers
            .get("user-agent")
            .and_then(|v| v.to_str().ok())
            .map(String::from);

        Ok(UserAgent(ua))
    }
}

pub struct ValidatedJson<T>(pub T);

impl<T, S> FromRequest<S> for ValidatedJson<T>
where
    T: DeserializeOwned + Validate,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        let Json(value) = Json::<T>::from_request(req, state)
            .await
            .map_err(|e: JsonRejection| AppError::BadRequest(e.body_text()))?;

        value
            .validate()
            .map_err(|e| AppError::BadRequest(format!("Validation failed: {e}")))?;

        Ok(ValidatedJson(value))
    }
}
