use super::dto::{AccessStatusDto, AdminAccessControlsDto, UpdateAccessControlsDto};
use crate::{
    common::role::Role,
    error::{AppError, AppResult},
    state::AppState,
    super_admin::service::log_admin_action,
};
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

/// The switches as stored. Maintenance closes sign-ups without touching
/// `registration_paused`, so ending it restores what sign-ups were set to.
#[derive(Debug, Clone, Copy)]
pub struct AccessControls {
    pub registration_paused: bool,
    pub maintenance: bool,
}

impl AccessControls {
    pub const fn registration_open(self) -> bool {
        !self.registration_paused && !self.maintenance
    }
}

impl From<AccessControls> for AccessStatusDto {
    fn from(controls: AccessControls) -> Self {
        Self {
            registration_open: controls.registration_open(),
            maintenance: controls.maintenance,
        }
    }
}

pub async fn load(db: &PgPool) -> AppResult<AccessControls> {
    let controls = sqlx::query_as!(
        AccessControls,
        r#"SELECT registration_paused, maintenance FROM access_controls"#
    )
    .fetch_one(db)
    .await?;

    Ok(controls)
}

pub async fn ensure_registration_open(db: &PgPool) -> AppResult<()> {
    if load(db).await?.registration_open() {
        Ok(())
    } else {
        Err(AppError::RegistrationPaused)
    }
}

/// Whether the user may get a session. Superadmins are exempt from
/// maintenance, so they can still look into whatever it is for and end it.
pub async fn ensure_admitted(db: &PgPool, user_id: Uuid) -> AppResult<()> {
    let admitted = sqlx::query_scalar!(
        r#"SELECT NOT ac.maintenance OR EXISTS (
                      SELECT 1 FROM user_roles
                      WHERE user_id = $1 AND tenant_id IS NULL AND role_id = $2
                  ) AS "admitted!"
           FROM access_controls ac"#,
        user_id,
        Role::Superadmin.db_id_i32()
    )
    .fetch_one(db)
    .await?;

    if admitted {
        Ok(())
    } else {
        Err(AppError::Maintenance)
    }
}

pub struct AccessControlService {
    db: PgPool,
}

impl AccessControlService {
    pub fn from_state(s: &AppState) -> Self {
        Self { db: s.db.clone() }
    }

    pub async fn get_for_admin(&self) -> AppResult<AdminAccessControlsDto> {
        let controls = sqlx::query_as!(
            AdminAccessControlsDto,
            r#"SELECT ac.registration_paused, ac.maintenance, ac.updated_at,
                      u.email AS "updated_by_email?"
               FROM access_controls ac
               LEFT JOIN users u ON u.id = ac.updated_by"#
        )
        .fetch_one(&self.db)
        .await?;

        Ok(controls)
    }

    pub async fn update(
        &self,
        changes: &UpdateAccessControlsDto,
        admin_id: Uuid,
    ) -> AppResult<AdminAccessControlsDto> {
        if changes.is_empty() {
            return Err(AppError::bad_request("No switch to change."));
        }

        let mut tx = self.db.begin().await?;

        sqlx::query!(
            r#"UPDATE access_controls
               SET registration_paused = COALESCE($1, registration_paused),
                   maintenance = COALESCE($2, maintenance),
                   updated_by = $3,
                   updated_at = now()"#,
            changes.registration_paused,
            changes.maintenance,
            admin_id
        )
        .execute(&mut *tx)
        .await?;

        log_admin_action(
            &mut tx,
            admin_id,
            "admin:access_controls:update",
            json!(changes),
        )
        .await?;

        tx.commit().await?;

        self.get_for_admin().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const fn controls(registration_paused: bool, maintenance: bool) -> AccessControls {
        AccessControls {
            registration_paused,
            maintenance,
        }
    }

    #[test]
    fn registration_is_open_only_without_either_switch() {
        assert!(controls(false, false).registration_open());
        assert!(!controls(true, false).registration_open());
        assert!(!controls(false, true).registration_open());
        assert!(!controls(true, true).registration_open());
    }
}
