use serde::Deserialize;

/// `PushSubscription.toJSON()` as the browser produces it.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscribeDto {
    pub endpoint: String,
    pub keys: SubscriptionKeysDto,
}

#[derive(Debug, Deserialize)]
pub struct SubscriptionKeysDto {
    pub p256dh: String,
    pub auth: String,
}

#[derive(Debug, Deserialize)]
pub struct UnsubscribeDto {
    pub endpoint: String,
}
