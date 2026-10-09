//! Age rules for sign-up. Only the birth year is asked for, so ages are counted
//! in calendar years: someone whose birthday is still ahead this year can be
//! counted one year older than they are.

use crate::error::AuthFailure;
use chrono::{DateTime, Datelike, Utc};

/// Younger than this, no account can be created.
pub const MIN_AGE: i32 = 13;

/// Younger than this, the account needs a guardian's consent.
pub const GUARDIAN_CONSENT_BELOW: i32 = 16;

const MAX_AGE: i32 = 120;

/// What a sign-up stores about its applicant's age.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AgeDeclaration {
    pub birth_year: i32,
    pub guardian_consent_at: Option<DateTime<Utc>>,
}

/// Checks the declared birth year against `now` and returns what to store.
/// Nothing is stored for an applicant who is refused.
pub fn declare(
    birth_year: i32,
    guardian_consent: bool,
    now: DateTime<Utc>,
) -> Result<AgeDeclaration, AuthFailure> {
    let current_year = now.year();

    if !(current_year - MAX_AGE..=current_year).contains(&birth_year) {
        return Err(AuthFailure::InvalidBirthYear);
    }

    let age = current_year - birth_year;
    if age < MIN_AGE {
        return Err(AuthFailure::TooYoung);
    }

    if age >= GUARDIAN_CONSENT_BELOW {
        return Ok(AgeDeclaration {
            birth_year,
            guardian_consent_at: None,
        });
    }

    if !guardian_consent {
        return Err(AuthFailure::GuardianConsentRequired);
    }

    Ok(AgeDeclaration {
        birth_year,
        guardian_consent_at: Some(now),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn now() -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, 10, 9, 12, 0, 0).unwrap()
    }

    #[test]
    fn refuses_applicants_below_the_minimum_age() {
        assert_eq!(declare(2014, true, now()), Err(AuthFailure::TooYoung));
    }

    #[test]
    fn accepts_the_minimum_age_only_with_guardian_consent() {
        assert_eq!(
            declare(2013, false, now()),
            Err(AuthFailure::GuardianConsentRequired)
        );
        assert_eq!(
            declare(2013, true, now()).unwrap().guardian_consent_at,
            Some(now())
        );
    }

    #[test]
    fn asks_for_guardian_consent_below_sixteen() {
        assert_eq!(
            declare(2011, false, now()),
            Err(AuthFailure::GuardianConsentRequired)
        );
    }

    #[test]
    fn stores_no_consent_from_sixteen_on() {
        let declared = declare(2010, false, now()).unwrap();
        assert_eq!(declared.birth_year, 2010);
        assert_eq!(declared.guardian_consent_at, None);
    }

    #[test]
    fn refuses_implausible_birth_years() {
        assert_eq!(
            declare(2027, true, now()),
            Err(AuthFailure::InvalidBirthYear)
        );
        assert_eq!(
            declare(1905, true, now()),
            Err(AuthFailure::InvalidBirthYear)
        );
        assert_eq!(
            declare(i32::MIN, true, now()),
            Err(AuthFailure::InvalidBirthYear)
        );
    }
}
