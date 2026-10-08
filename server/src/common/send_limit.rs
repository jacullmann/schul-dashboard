//! Caps on how much mail one address receives from us. They keep strangers
//! from flooding someone's inbox through us and bound how many guesses an
//! emailed code allows.

use chrono::{DateTime, TimeDelta, Utc};
use std::num::NonZeroUsize;

/// At most `max_sends` mails to one address within any `window`.
pub struct SendLimit {
    pub window: TimeDelta,
    pub max_sends: NonZeroUsize,
}

/// Three an hour and ten a day: enough for a mail that went astray, too few to
/// be a nuisance. The longest window must not outlast how long the rows that
/// record the sends are kept.
pub const MAIL_LIMITS: [SendLimit; 2] = [
    SendLimit {
        window: TimeDelta::hours(1),
        max_sends: NonZeroUsize::new(3).unwrap(),
    },
    SendLimit {
        window: TimeDelta::days(1),
        max_sends: NonZeroUsize::new(10).unwrap(),
    },
];

/// The longest window of `limits`: sends older than this never count.
pub fn longest_window(limits: &[SendLimit]) -> TimeDelta {
    limits
        .iter()
        .map(|limit| limit.window)
        .max()
        .unwrap_or_default()
}

/// How long until the address may receive another mail, given when its mails
/// of the longest window were sent, newest first.
pub fn retry_after(
    limits: &[SendLimit],
    sent_newest_first: &[DateTime<Utc>],
    now: DateTime<Utc>,
) -> Option<TimeDelta> {
    limits
        .iter()
        .filter_map(|limit| {
            // Once this mail leaves the window, the window has room again.
            let oldest_counted = sent_newest_first.get(limit.max_sends.get() - 1)?;
            let frees_up_at = *oldest_counted + limit.window;
            (frees_up_at > now).then(|| frees_up_at - now)
        })
        .max()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        DateTime::from_timestamp(1_800_000_000, 0).unwrap()
    }

    /// Mails sent the given number of minutes ago, newest first.
    fn sent(minutes_ago: &[i64]) -> Vec<DateTime<Utc>> {
        minutes_ago
            .iter()
            .map(|&m| now() - TimeDelta::minutes(m))
            .collect()
    }

    fn retry(minutes_ago: &[i64]) -> Option<TimeDelta> {
        retry_after(&MAIL_LIMITS, &sent(minutes_ago), now())
    }

    #[test]
    fn mails_below_every_limit_are_sent() {
        assert_eq!(retry(&[]), None);
        assert_eq!(retry(&[1, 2]), None);
    }

    #[test]
    fn the_hourly_limit_waits_for_its_oldest_mail_to_leave_the_hour() {
        assert_eq!(retry(&[1, 2, 40]), Some(TimeDelta::minutes(20)));
    }

    #[test]
    fn mails_older_than_an_hour_only_count_towards_the_day() {
        assert_eq!(retry(&[1, 2, 61]), None);
    }

    #[test]
    fn the_daily_limit_holds_once_hours_apart_mails_add_up() {
        assert_eq!(
            retry(&[70, 140, 210, 280, 350, 420, 490, 560, 630, 700]),
            Some(TimeDelta::days(1) - TimeDelta::minutes(700))
        );
    }

    #[test]
    fn the_longer_wait_wins_when_both_limits_are_reached() {
        assert_eq!(
            retry(&[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
            Some(TimeDelta::days(1) - TimeDelta::minutes(10))
        );
    }

    #[test]
    fn the_longest_window_is_a_day() {
        assert_eq!(longest_window(&MAIL_LIMITS), TimeDelta::days(1));
    }
}
