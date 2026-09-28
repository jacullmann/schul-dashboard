//! Notification wording. Push services deliver text the service worker shows
//! as is, so it is written here in each recipient's language.

/// Keeps the encrypted payload well below the 4 KB push services accept.
const MAX_BODY_CHARS: usize = 180;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Locale {
    De,
    En,
}

impl Locale {
    /// German is the account default (`users.preferences.language`).
    pub fn from_preference(language: Option<&str>) -> Self {
        match language {
            Some("en") => Self::En,
            _ => Self::De,
        }
    }

    fn weekday(self, day: i32) -> Option<&'static str> {
        let names = match self {
            Self::De => [
                "Montag",
                "Dienstag",
                "Mittwoch",
                "Donnerstag",
                "Freitag",
                "Samstag",
                "Sonntag",
            ],
            Self::En => [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
            ],
        };
        usize::try_from(day - 1)
            .ok()
            .and_then(|i| names.get(i).copied())
    }
}

/// A timetable lesson, by the numbering the schedule uses: Monday = 1, first
/// lesson = 1.
pub struct Lesson<'a> {
    pub subject: Option<&'a str>,
    pub is_dalton: bool,
    pub day: i32,
    pub slot: i32,
}

/// What a substitution changes about a lesson; unset fields keep the lesson's
/// value, as in the timetable.
#[derive(Debug, Clone, Default)]
pub struct ScheduleChange {
    pub cancelled: bool,
    pub day: Option<i32>,
    pub slot: Option<i32>,
    pub subject: Option<String>,
    pub room: Option<String>,
}

pub fn announcement_title(locale: Locale, group: &str) -> String {
    match locale {
        Locale::De => format!("Neue Ankündigung · {group}"),
        Locale::En => format!("New announcement · {group}"),
    }
}

pub fn announcement_body(content: &str) -> String {
    truncate_chars(content.trim(), MAX_BODY_CHARS)
}

pub fn schedule_change_title(locale: Locale, group: &str) -> String {
    match locale {
        Locale::De => format!("Stundenplanänderung · {group}"),
        Locale::En => format!("Schedule change · {group}"),
    }
}

/// E.g. "Mathe, Montag 3. Stunde: entfällt".
pub fn schedule_change_body(
    locale: Locale,
    lesson: &Lesson<'_>,
    change: &ScheduleChange,
) -> String {
    let body = format!(
        "{}, {}: {}",
        lesson_name(locale, lesson),
        when(locale, lesson.day, lesson.slot),
        describe_change(locale, lesson, change),
    );
    truncate_chars(&body, MAX_BODY_CHARS)
}

fn lesson_name<'a>(locale: Locale, lesson: &Lesson<'a>) -> &'a str {
    match (lesson.subject, lesson.is_dalton, locale) {
        (Some(subject), _, _) => subject,
        (None, true, _) => "Dalton",
        (None, false, Locale::De) => "Unterricht",
        (None, false, Locale::En) => "Lesson",
    }
}

fn when(locale: Locale, day: i32, slot: i32) -> String {
    let weekday = locale.weekday(day);
    match (locale, weekday) {
        (Locale::De, Some(weekday)) => format!("{weekday} {slot}. Stunde"),
        (Locale::De, None) => format!("{slot}. Stunde"),
        (Locale::En, Some(weekday)) => format!("{weekday} period {slot}"),
        (Locale::En, None) => format!("period {slot}"),
    }
}

fn describe_change(locale: Locale, lesson: &Lesson<'_>, change: &ScheduleChange) -> String {
    if change.cancelled {
        return match locale {
            Locale::De => "entfällt",
            Locale::En => "cancelled",
        }
        .to_owned();
    }

    let mut parts = Vec::new();

    let day = change.day.unwrap_or(lesson.day);
    let slot = change.slot.unwrap_or(lesson.slot);
    if (day, slot) != (lesson.day, lesson.slot) {
        let to = when(locale, day, slot);
        parts.push(match locale {
            Locale::De => format!("verlegt auf {to}"),
            Locale::En => format!("moved to {to}"),
        });
    }
    if let Some(subject) = &change.subject {
        parts.push(match locale {
            Locale::De => format!("Vertretung {subject}"),
            Locale::En => format!("substitute {subject}"),
        });
    }
    if let Some(room) = &change.room {
        parts.push(match locale {
            Locale::De => format!("Raum {room}"),
            Locale::En => format!("room {room}"),
        });
    }

    if parts.is_empty() {
        return match locale {
            Locale::De => "geändert",
            Locale::En => "changed",
        }
        .to_owned();
    }
    parts.join(", ")
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

    const MATHS: Lesson<'static> = Lesson {
        subject: Some("Mathe"),
        is_dalton: false,
        day: 1,
        slot: 3,
    };

    #[test]
    fn describes_a_cancellation() {
        let change = ScheduleChange {
            cancelled: true,
            room: Some("B12".into()),
            ..Default::default()
        };
        assert_eq!(
            schedule_change_body(Locale::De, &MATHS, &change),
            "Mathe, Montag 3. Stunde: entfällt"
        );
        assert_eq!(
            schedule_change_body(Locale::En, &MATHS, &change),
            "Mathe, Monday period 3: cancelled"
        );
    }

    #[test]
    fn lists_every_changed_field() {
        let change = ScheduleChange {
            day: Some(2),
            slot: Some(5),
            subject: Some("Deutsch".into()),
            room: Some("B12".into()),
            ..Default::default()
        };
        assert_eq!(
            schedule_change_body(Locale::De, &MATHS, &change),
            "Mathe, Montag 3. Stunde: verlegt auf Dienstag 5. Stunde, Vertretung Deutsch, Raum B12"
        );
    }

    #[test]
    fn same_day_and_slot_is_not_a_move() {
        let change = ScheduleChange {
            day: Some(1),
            slot: Some(3),
            ..Default::default()
        };
        assert_eq!(
            schedule_change_body(Locale::En, &MATHS, &change),
            "Mathe, Monday period 3: changed"
        );
    }

    #[test]
    fn names_lessons_without_a_subject() {
        let dalton = Lesson {
            subject: None,
            is_dalton: true,
            ..MATHS
        };
        let change = ScheduleChange {
            room: Some("Aula".into()),
            ..Default::default()
        };
        assert_eq!(
            schedule_change_body(Locale::De, &dalton, &change),
            "Dalton, Montag 3. Stunde: Raum Aula"
        );
    }

    #[test]
    fn falls_back_to_german() {
        assert_eq!(Locale::from_preference(Some("en")), Locale::En);
        assert_eq!(Locale::from_preference(Some("fr")), Locale::De);
        assert_eq!(Locale::from_preference(None), Locale::De);
    }

    #[test]
    fn truncates_on_char_boundaries() {
        assert_eq!(truncate_chars("kurz", 10), "kurz");
        assert_eq!(truncate_chars("äöüäöü", 3), "äöü…");
        assert_eq!(truncate_chars("ab cd", 3), "ab…");
    }
}
