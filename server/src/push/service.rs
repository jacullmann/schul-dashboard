use super::{
    sender::{Delivery, WebPush},
    subscription::PushSubscription,
};
use crate::{error::AppResult, state::AppState};
use serde::Serialize;
use sqlx::PgPool;
use std::sync::Arc;
use tokio::task::JoinSet;
use uuid::Uuid;

/// Keeps the encrypted payload well below the 4 KB push services accept.
const MAX_BODY_CHARS: usize = 180;

/// What the service worker renders. The shape is shared with
/// `app/src/modules/notifications/types`.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PushPayload {
    pub title: String,
    pub body: String,
    /// Notifications with the same tag replace each other instead of piling up.
    pub tag: String,
    /// Unix milliseconds of the event, so late deliveries show when it happened.
    pub timestamp: i64,
    pub target: PushTarget,
}

/// The screen a click on the notification opens.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum PushTarget {
    #[serde(rename_all = "camelCase")]
    GroupMessages { group_id: Uuid },
}

pub struct GroupMessageNotice<'a> {
    pub group_id: Uuid,
    pub sender_id: Uuid,
    pub sender_name: &'a str,
    pub content: &'a str,
}

struct Recipient {
    id: Uuid,
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

    /// Notifies every other member of the group in the background, so the
    /// sender's request never waits on push services.
    pub fn spawn_group_message(self, notice: GroupMessageNotice<'_>) {
        if self.web_push.is_none() {
            return;
        }

        let group_id = notice.group_id;
        let sender_id = notice.sender_id;
        let body = truncate_chars(
            &format!("{}: {}", notice.sender_name, notice.content.trim()),
            MAX_BODY_CHARS,
        );
        let timestamp = chrono::Utc::now().timestamp_millis();

        tokio::spawn(async move {
            if let Err(e) = self
                .notify_group_message(group_id, sender_id, body, timestamp)
                .await
            {
                tracing::warn!("Group message push fan-out failed: {e}");
            }
        });
    }

    async fn notify_group_message(
        &self,
        group_id: Uuid,
        sender_id: Uuid,
        body: String,
        timestamp: i64,
    ) -> AppResult<()> {
        let Some(group_name) =
            sqlx::query_scalar!(r#"SELECT name FROM groups WHERE id = $1"#, group_id)
                .fetch_optional(&self.db)
                .await?
        else {
            return Ok(());
        };

        let recipients = self.group_recipients(group_id, sender_id).await?;
        if recipients.is_empty() {
            return Ok(());
        }

        let payload = PushPayload {
            title: group_name,
            body,
            tag: format!("group-messages:{group_id}"),
            timestamp,
            target: PushTarget::GroupMessages { group_id },
        };
        // A simple UUID is 32 base64url-safe characters, the most RFC 8030
        // allows for a topic. Undelivered messages of one chat collapse into
        // the newest while the device is offline.
        let topic = group_id.simple().to_string();

        self.deliver(recipients, &payload, Some(&topic)).await
    }

    /// Members of the group other than `exclude_user`, on devices whose login
    /// session is still active.
    async fn group_recipients(
        &self,
        group_id: Uuid,
        exclude_user: Uuid,
    ) -> AppResult<Vec<Recipient>> {
        let rows = sqlx::query!(
            r#"SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
               FROM push_subscriptions ps
               JOIN user_roles ur ON ur.user_id = ps.user_id AND ur.tenant_id = $1
               WHERE ps.user_id <> $2
                 AND EXISTS (
                     SELECT 1 FROM refresh_tokens rt
                     WHERE rt.family_id = ps.session_family_id
                       AND rt.revoked_at IS NULL
                       AND rt.expires_at > now()
                 )"#,
            group_id,
            exclude_user,
        )
        .fetch_all(&self.db)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| Recipient {
                id: row.id,
                subscription: PushSubscription::parse(&row.endpoint, &row.p256dh, &row.auth).ok(),
            })
            .collect())
    }

    async fn deliver(
        &self,
        recipients: Vec<Recipient>,
        payload: &PushPayload,
        topic: Option<&str>,
    ) -> AppResult<()> {
        let Some(web_push) = &self.web_push else {
            return Ok(());
        };
        let payload: Arc<[u8]> = serde_json::to_vec(payload)
            .map_err(anyhow::Error::from)?
            .into();
        let topic: Option<Arc<str>> = topic.map(Into::into);

        let mut gone = Vec::new();
        let mut deliveries = JoinSet::new();
        for recipient in recipients {
            let Some(subscription) = recipient.subscription else {
                gone.push(recipient.id);
                continue;
            };
            let web_push = web_push.clone();
            let payload = Arc::clone(&payload);
            let topic = topic.clone();
            deliveries.spawn(async move {
                let delivery = web_push
                    .send(&subscription, &payload, topic.as_deref())
                    .await;
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

fn truncate_chars(text: &str, max_chars: usize) -> String {
    match text.char_indices().nth(max_chars) {
        Some((end, _)) => format!("{}…", text[..end].trim_end()),
        None => text.to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn truncates_on_char_boundaries() {
        assert_eq!(truncate_chars("kurz", 10), "kurz");
        assert_eq!(truncate_chars("äöüäöü", 3), "äöü…");
        assert_eq!(truncate_chars("ab cd", 3), "ab…");
    }

    #[test]
    fn payload_matches_the_service_worker_contract() {
        let group_id = Uuid::nil();
        let payload = PushPayload {
            title: "10b".into(),
            body: "Fox: Hallo".into(),
            tag: format!("group-messages:{group_id}"),
            timestamp: 1,
            target: PushTarget::GroupMessages { group_id },
        };

        assert_eq!(
            serde_json::to_value(&payload).unwrap(),
            serde_json::json!({
                "title": "10b",
                "body": "Fox: Hallo",
                "tag": format!("group-messages:{group_id}"),
                "timestamp": 1,
                "target": { "type": "groupMessages", "groupId": group_id },
            })
        );
    }
}
