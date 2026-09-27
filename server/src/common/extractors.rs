use crate::{
    common::{
        path_params::GroupPath,
        permission::{GroupPermissions, Permission},
        role::Role,
    },
    config::ACCESS_COOKIE,
    error::{AppError, AppResult},
    state::AppState,
};
use axum::{
    Json,
    extract::{
        FromRef, FromRequest, FromRequestParts, Path, Request, State, rejection::JsonRejection,
    },
    http::request::Parts,
    middleware::Next,
    response::Response,
};
use axum_extra::extract::CookieJar;
use serde::de::DeserializeOwned;
use sqlx::PgPool;
use std::convert::Infallible;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub email: String,
    pub global_role: String,
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

        Ok(AuthUser {
            user_id,
            email: claims.email,
            global_role: claims.g_role,
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

/// The caller's standing in the group named by the request path. The tenant
/// middleware resolves it once for every route nested under
/// `/groups/{group_id}`, so a handler can only be reached by a member (or a
/// superadmin) and never has to repeat the check.
#[derive(Debug, Clone)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub tenant_role: Role,
    pub group_owner_id: Uuid,
    pub group_permissions: GroupPermissions,
    /// Read from the database, not the access token, so a revoked superadmin
    /// loses group access immediately instead of when the token expires.
    pub is_superadmin: bool,
    pub user: AuthUser,
}

impl TenantContext {
    pub async fn resolve(db: &PgPool, user: AuthUser, tenant_id: Uuid) -> AppResult<Self> {
        let row = sqlx::query!(
            r#"
            SELECT g.owner_id,
                   g.permissions,
                   membership.role_name AS "tenant_role?",
                   EXISTS (
                       SELECT 1 FROM user_roles ur
                       JOIN roles r ON r.id = ur.role_id
                       WHERE ur.user_id = $1 AND ur.tenant_id IS NULL AND r.name = 'superadmin'
                   ) AS "is_superadmin!"
            FROM groups g
            LEFT JOIN LATERAL (
                SELECT r.name AS role_name FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = $1 AND ur.tenant_id = g.id
                LIMIT 1
            ) membership ON true
            WHERE g.id = $2
            "#,
            user.user_id,
            tenant_id
        )
        .fetch_optional(db)
        .await?;

        // Non-members get the same answer as for a missing group, so group ids
        // cannot be probed for existence.
        let not_found = || AppError::not_found("Group not found.");
        let row = row.ok_or_else(not_found)?;

        let tenant_role = match (row.is_superadmin, row.tenant_role.as_deref()) {
            (true, _) => Role::Superadmin,
            (false, Some(role)) => Role::from_str_or_user(role),
            (false, None) => return Err(not_found()),
        };

        Ok(Self {
            tenant_id,
            tenant_role,
            group_owner_id: row.owner_id,
            group_permissions: GroupPermissions::from_json_with_defaults(&row.permissions),
            is_superadmin: row.is_superadmin,
            user,
        })
    }

    pub fn is_owner(&self) -> bool {
        self.group_owner_id == self.user.user_id
    }

    pub fn can(&self, permission: Permission) -> bool {
        if self.has_owner_rights() {
            return true;
        }
        let required = self.group_permissions.required_role(permission);
        self.tenant_role.dominates(required)
    }

    /// Superadmins act with the owner's rights in every group, whether or not
    /// they are a member of it.
    pub fn has_owner_rights(&self) -> bool {
        self.is_superadmin || self.is_owner()
    }

    pub fn effective_permission_keys(&self) -> Vec<&'static str> {
        self.group_permissions
            .effective_keys(self.tenant_role, self.has_owner_rights())
    }
}

/// Route layer for everything nested under `/groups/{group_id}`.
pub async fn resolve_tenant(
    State(state): State<AppState>,
    user: AuthUser,
    Path(GroupPath { group_id }): Path<GroupPath>,
    mut request: Request,
    next: Next,
) -> AppResult<Response> {
    let tenant = TenantContext::resolve(&state.db, user, group_id).await?;
    request.extensions_mut().insert(tenant);
    Ok(next.run(request).await)
}

impl<S> FromRequestParts<S> for TenantContext
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<TenantContext>()
            .cloned()
            .ok_or_else(|| {
                AppError::internal("TenantContext used on a route outside /groups/{group_id}")
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

/// `Json<T>` that runs the DTO's `validate()` before the handler sees it, so
/// handlers never carry validation boilerplate.
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

        value.validate().map_err(|e| {
            AppError::Validation(e.field_errors().keys().map(ToString::to_string).collect())
        })?;

        Ok(ValidatedJson(value))
    }
}
