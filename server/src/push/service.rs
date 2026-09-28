use super::{
    content::{self, Locale, ScheduleChange},
    sender::{Delivery, Urgency, WebPush},
    subscription::PushSubscription,
};
use crate::{error::AppResult, state::AppState};
use serde::Serialize;
use sqlx::PgPool;
use std::sync::Arc;
use tokio::task::JoinSet;
use uuid::Uuid;

/// What the service worker renders. The shape is shared with
/// `app/src/modules/notifications/types`.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PushPayload {
    pub title: String,
    pub body: String,
    /// Notifications with the same tag replace each other instead of piling up.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag: Option<String>,
    /// Unix milliseconds of the event, so late deliveries show when it happened.
    pub timestamp: i64,
    pub target: PushTarget,
}

/// The screen a click on the notification opens.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum PushTarget {
    #[serde(rename_all = "camelCase")]
    GroupAnnouncements { group_id: Uuid },
    #[serde(rename_all = "camelCase")]
    GroupSchedule { group_id: Uuid },
}

pub struct AnnouncementNotice {
    pub group_id: Uuid,
    pub author_id: Uuid,
    pub content: String,
}

/// A substitution entered for a timetable lesson.
pub struct ScheduleChangeNotice {
    pub group_id: Uuid,
    pub author_id: Uuid,
    pub lesson_id: Uuid,
    /// Set when the change only applies to one course of the lesson.
    pub course_id: Option<Uuid>,
    pub change: ScheduleChange,
}

struct Recipient {
    id: Uuid,
    locale: Locale,
    subscription: Option<PushSubscription>,
}

pub struct PushService {
    db: PgPool,
    web_push: Option<WebPush>,
}

impl PushService {
    pub fn from_state(s: &AppState) -> Self {
        Self {
            db: s.db.clone(),
            web_push: s.web_push.clone(),
        }
    }

    pub fn public_key(&self) -> Option<&str> {
        self.web_push.as_ref().map(WebPush::public_key)
    }

    /// A browser holds one subscription per login session, so registering one
    /// replaces whatever the session registered before (e.g. a rotated
    /// endpoint). Re-subscribing from another account or session moves the
    /// endpoint over.
    pub async fn upsert_subscription(
        &self,
        user_id: Uuid,
        session_family_id: Uuid,
        subscription: &PushSubscription,
    ) -> AppResult<()> {
        sqlx::query!(
            r#"WITH replaced AS (
                   DELETE FROM push_subscriptions
                   WHERE session_family_id = $2 AND endpoint <> $3
               )
               INSERT INTO push_subscriptions (user_id, session_family_id, endpoint, p256dh, auth)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (endpoint) DO UPDATE
               SET user_id = EXCLUDED.user_id,
                   session_family_id = EXCLUDED.session_family_id,
                   p256dh = EXCLUDED.p256dh,
                   auth = EXCLUDED.auth,
                   updated_at = now()"#,
            user_id,
            session_family_id,
            subscription.endpoint(),
            subscription.p256dh_base64url(),
            subscription.auth_base64url(),
        )
        .execute(&self.db)
        .await?;
        Ok(())
    }

    pub async fn remove_subscription(&self, user_id: Uuid, endpoint: &str) -> AppResult<()> {
        sqlx::query!(
            r#"DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2"#,
            user_id,
            endpoint,
        )
        .execute(&self.db)
        .await?;
        Ok(())
    }

    /// Drops subscriptions whose login session ended; delivery already skips
    /// them, this only reclaims the rows.
    pub async fn prune_inactive_sessions(&self) -> AppResult<u64> {
        let result = sqlx::query!(
            r#"DELETE FROM push_subscriptions ps
               WHERE NOT EXISTS (
                   SELECT 1 FROM refresh_tokens rt
                   WHERE rt.family_id = ps.session_family_id
                     AND rt.revoked_at IS NULL
                     AND rt.expires_at > now()
               )"#
        )
        .execute(&self.db)
        .await?;
        Ok(result.rows_affected())
    }

    /// Notifies the group in the background, so the author's request never
    /// waits on push services.
    pub fn spawn_announcement(self, notice: AnnouncementNotice) {
        if self.web_push.is_none() {
            return;
        }
        tokio::spawn(async move {
            if let Err(e) = self.notify_announcement(notice).await {
                tracing::warn!("Announcement push fan-out failed: {e}");
            }
        });
    }

    /// Notifies the members whose timetable shows the lesson, in the background.
    pub fn spawn_schedule_change(self, notice: ScheduleChangeNotice) {
        if self.web_push.is_none() {
            return;
        }
        tokio::spawn(async move {
            if let Err(e) = self.notify_schedule_change(notice).await {
                tracing::warn!("Schedule change push fan-out failed: {e}");
            }
        });
    }

    async fn notify_announcement(&self, notice: AnnouncementNotice) -> AppResult<()> {
        let Some(group_name) =
            sqlx::query_scalar!(r#"SELECT name FROM groups WHERE id = $1"#, notice.group_id)
                .fetch_optional(&self.db)
                .await?
        else {
            return Ok(());
        };

        let recipients = self
            .recipients(notice.group_id, notice.author_id, None)
            .await?;
        let body = content::announcement_body(&notice.content);
        let timestamp = chrono::Utc::now().timestamp_millis();

        self.deliver(recipients, Urgency::Normal, |locale| PushPayload {
            title: content::announcement_title(locale, &group_name),
            body: body.clone(),
            tag: None,
            timestamp,
            target: PushTarget::GroupAnnouncements {
                group_id: notice.group_id,
            },
        })
        .await
    }

    async fn notify_schedule_change(&self, notice: ScheduleChangeNotice) -> AppResult<()> {
        let Some(lesson) = sqlx::query!(
            r#"SELECT s.day, s.slot, s.course_id, s.is_dalton,
                      sub.name AS "subject?", g.name AS group_name
               FROM schedules s
               JOIN groups g ON g.id = s.tenant_id
               LEFT JOIN subjects sub ON sub.id = s.subject_id
               WHERE s.id = $1 AND s.tenant_id = $2"#,
            notice.lesson_id,
            notice.group_id
        )
        .fetch_optional(&self.db)
        .await?
        else {
            return Ok(());
        };

        let course_id = notice.course_id.or(lesson.course_id);
        let recipients = self
            .recipients(notice.group_id, notice.author_id, course_id)
            .await?;
        let timetable_lesson = content::Lesson {
            subject: lesson.subject.as_deref(),
            is_dalton: lesson.is_dalton,
            day: lesson.day,
            slot: lesson.slot,
        };
        let timestamp = chrono::Utc::now().timestamp_millis();

        // A cancelled first lesson matters before the phone's next routine sync.
        self.deliver(recipients, Urgency::High, |locale| PushPayload {
            title: content::schedule_change_title(locale, &lesson.group_name),
            body: content::schedule_change_body(locale, &timetable_lesson, &notice.change),
            // Correcting a change replaces its notification.
            tag: Some(format!("schedule-change:{}", notice.lesson_id)),
            timestamp,
            target: PushTarget::GroupSchedule {
                group_id: notice.group_id,
            },
        })
        .await
    }

    /// Members of the group other than `exclude_user`, on devices whose login
    /// session is still active. With a `course_id`, members who narrowed their
    /// timetable to their courses only count if they take that course, the
    /// same rule the timetable itself applies.
    async fn recipients(
        &self,
        group_id: Uuid,
        exclude_user: Uuid,
        course_id: Option<Uuid>,
    ) -> AppResult<Vec<Recipient>> {
        let rows = sqlx::query!(
            r#"SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth,
                      u.preferences->>'language' AS language
               FROM push_subscriptions ps
               JOIN user_roles ur ON ur.user_id = ps.user_id AND ur.tenant_id = $1
               JOIN users u ON u.id = ps.user_id
               WHERE ps.user_id <> $2
                 AND (
                     $3::uuid IS NULL
                     OR NOT (u.personalized AND u.done_setup)
                     OR EXISTS (
                         SELECT 1 FROM user_courses uc
                         WHERE uc.user_id = u.id AND uc.course_id = $3
                     )
                 )
                 AND EXISTS (
                     SELECT 1 FROM refresh_tokens rt
                     WHERE rt.family_id = ps.session_family_id
                       AND rt.revoked_at IS NULL
                       AND rt.expires_at > now()
                 )"#,
            group_id,
            exclude_user,
            course_id,
        )
        .fetch_all(&self.db)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| Recipient {
                id: row.id,
                locale: Locale::from_preference(row.language.as_deref()),
                subscription: PushSubscription::parse(&row.endpoint, &row.p256dh, &row.auth).ok(),
            })
            .collect())
    }

    async fn deliver(
        &self,
        recipients: Vec<Recipient>,
        urgency: Urgency,
        payload_for: impl Fn(Locale) -> PushPayload,
    ) -> AppResult<()> {
        let Some(web_push) = &self.web_push else {
            return Ok(());
        };
        if recipients.is_empty() {
            return Ok(());
        }

        let encode = |locale| -> AppResult<Arc<[u8]>> {
            let payload = serde_json::to_vec(&payload_for(locale)).map_err(anyhow::Error::from)?;
            Ok(payload.into())
        };
        let german = encode(Locale::De)?;
        let english = encode(Locale::En)?;

        let mut gone = Vec::new();
        let mut deliveries = JoinSet::new();
        for recipient in recipients {
            let Some(subscription) = recipient.subscription else {
                gone.push(recipient.id);
                continue;
            };
            let web_push = web_push.clone();
            let payload = Arc::clone(match recipient.locale {
                Locale::De => &german,
                Locale::En => &english,
            });
            deliveries.spawn(async move {
                let delivery = web_push.send(&subscription, &payload, urgency).await;
                (recipient.id, delivery)
            });
        }

        while let Some(result) = deliveries.join_next().await {
            if let Ok((id, Delivery::Gone)) = result {
                gone.push(id);
            }
        }

        if !gone.is_empty() {
            sqlx::query!(
                r#"DELETE FROM push_subscriptions WHERE id = ANY($1)"#,
                &gone
            )
            .execute(&self.db)
            .await?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn payload_matches_the_service_worker_contract() {
        let group_id = Uuid::nil();
        let payload = PushPayload {
            title: "Schedule change · 10b".into(),
            body: "Mathe, Monday period 3: cancelled".into(),
            tag: Some("schedule-change:x".into()),
            timestamp: 1,
            target: PushTarget::GroupSchedule { group_id },
        };
        assert_eq!(
            serde_json::to_value(&payload).unwrap(),
            serde_json::json!({
                "title": "Schedule change · 10b",
                "body": "Mathe, Monday period 3: cancelled",
                "tag": "schedule-change:x",
                "timestamp": 1,
                "target": { "type": "groupSchedule", "groupId": group_id },
            })
        );
    }

    #[test]
    fn untagged_payloads_omit_the_tag() {
        let payload = PushPayload {
            title: "t".into(),
            body: "b".into(),
            tag: None,
            timestamp: 1,
            target: PushTarget::GroupAnnouncements {
                group_id: Uuid::nil(),
            },
        };
        let json = serde_json::to_value(&payload).unwrap();
        assert!(json.get("tag").is_none());
        assert_eq!(json["target"]["type"], "groupAnnouncements");
    }
}
