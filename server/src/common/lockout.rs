//! Locks that grow with every run of consecutive failures on one account.
//!
//! Counting per account rather than per IP address keeps an attacker from
//! spreading guesses over as many addresses as they control. Each completed run
//! locks twice as long as the previous one, which keeps the expected number of
//! guesses negligible while a user who mistypes a few times is barely slowed
//! down.

use chrono::TimeDelta;

const MISSES_PER_LOCK: i32 = 5;
const FIRST_LOCK: TimeDelta = TimeDelta::minutes(5);
const LONGEST_LOCK: TimeDelta = TimeDelta::hours(24);

/// How long the account locks after `consecutive_misses`, if this miss
/// completes a run.
pub fn lock_after(consecutive_misses: i32) -> Option<TimeDelta> {
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
}
