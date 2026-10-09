//! Locks that grow with every run of consecutive failures on one account.
//!
//! Counting per account rather than per IP address keeps an attacker from
//! spreading guesses over as many addresses as they control. Each completed run
//! locks twice as long as the previous one, which keeps the expected number of
//! guesses negligible while a user who mistypes a few times is barely slowed
//! down.
//!
//! Every factor keeps its own [`Counter`] (its own pair of columns on the
//! account), so failures at one factor never lock another: a stranger guessing
//! the password cannot block the second factor or a signed-in confirmation.

use chrono::{DateTime, TimeDelta, Utc};

const MISSES_PER_LOCK: i32 = 5;
const FIRST_LOCK: TimeDelta = TimeDelta::minutes(5);
const LONGEST_LOCK: TimeDelta = TimeDelta::hours(24);

/// One factor's consecutive misses and the lock they started, as stored on the
/// account.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Counter {
    pub misses: i32,
    pub locked_until: Option<DateTime<Utc>>,
}

impl Counter {
    /// How much longer the factor stays locked, if it is locked at `now`.
    pub fn locked_for(&self, now: DateTime<Utc>) -> Option<TimeDelta> {
        self.locked_until
            .filter(|&until| until > now)
            .map(|until| until - now)
    }

    /// The counter once one more miss happened at `now`. If that miss
    /// completes a run, the result is locked from `now` on.
    #[must_use]
    pub fn after_miss(self, now: DateTime<Utc>) -> Self {
        let misses = self.misses.saturating_add(1);

        Self {
            misses,
            locked_until: lock_after(misses).map(|lock| now + lock),
        }
    }
}

/// How long the account locks after `consecutive_misses`, if this miss
/// completes a run.
fn lock_after(consecutive_misses: i32) -> Option<TimeDelta> {
    if consecutive_misses <= 0 || consecutive_misses % MISSES_PER_LOCK != 0 {
        return None;
    }

    let doublings = u32::try_from(consecutive_misses / MISSES_PER_LOCK - 1).ok()?;
    let lock = 2_i32
        .checked_pow(doublings)
        .and_then(|factor| FIRST_LOCK.checked_mul(factor))
        .unwrap_or(LONGEST_LOCK);

    Some(lock.min(LONGEST_LOCK))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn misses_within_a_run_do_not_lock() {
        for misses in [0, 1, 2, 3, 4, 6, 9, 11] {
            assert_eq!(lock_after(misses), None, "locked after {misses}");
        }
    }

    #[test]
    fn each_completed_run_doubles_the_lock() {
        assert_eq!(lock_after(5), Some(TimeDelta::minutes(5)));
        assert_eq!(lock_after(10), Some(TimeDelta::minutes(10)));
        assert_eq!(lock_after(15), Some(TimeDelta::minutes(20)));
        assert_eq!(lock_after(20), Some(TimeDelta::minutes(40)));
    }

    #[test]
    fn locks_never_exceed_a_day() {
        assert_eq!(lock_after(50), Some(LONGEST_LOCK));
        assert_eq!(lock_after(5 * 40), Some(LONGEST_LOCK));
        assert_eq!(lock_after(i32::MAX - i32::MAX % 5), Some(LONGEST_LOCK));
    }

    fn now() -> DateTime<Utc> {
        DateTime::from_timestamp(1_800_000_000, 0).unwrap()
    }

    fn counter(misses: i32, locked_until: Option<DateTime<Utc>>) -> Counter {
        Counter {
            misses,
            locked_until,
        }
    }

    #[test]
    fn only_a_lock_still_ahead_holds() {
        let ahead = now() + TimeDelta::minutes(3);
        assert_eq!(
            counter(5, Some(ahead)).locked_for(now()),
            Some(TimeDelta::minutes(3))
        );
        assert_eq!(counter(5, Some(now())).locked_for(now()), None);
        assert_eq!(counter(4, None).locked_for(now()), None);
    }

    #[test]
    fn the_miss_that_completes_a_run_locks_from_now() {
        let locked = counter(4, None).after_miss(now());

        assert_eq!(locked.misses, 5);
        assert_eq!(locked.locked_for(now()), Some(FIRST_LOCK));
    }

    #[test]
    fn a_miss_after_an_expired_lock_clears_it() {
        let expired = now() - TimeDelta::minutes(1);
        let next = counter(5, Some(expired)).after_miss(now());

        assert_eq!(next, counter(6, None));
    }

    #[test]
    fn misses_saturate_instead_of_overflowing() {
        assert_eq!(counter(i32::MAX, None).after_miss(now()).misses, i32::MAX);
    }
}
