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
/// lesson = 1. `subject` and `course` are the stored names, which double as
/// translation keys where the app has one.
pub struct Lesson<'a> {
    pub subject: Option<&'a str>,
    pub course: Option<&'a str>,
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

pub fn announcement_body(content: &str) -> String {
    truncate_chars(content.trim(), MAX_BODY_CHARS)
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

/// Mirrors how the timetable names a lesson (`getDisplayName` in the app).
fn lesson_name(locale: Locale, lesson: &Lesson<'_>) -> String {
    if lesson.is_dalton {
        return "Dalton".to_owned();
    }
    let Some(subject) = lesson.subject.filter(|s| !s.is_empty()) else {
        return match locale {
            Locale::De => "Unterricht",
            Locale::En => "Lesson",
        }
        .to_owned();
    };

    let wpu_number = [(1, "wpu1"), (2, "wpu2")]
        .into_iter()
        .find_map(|(number, key)| subject.eq_ignore_ascii_case(key).then_some(number));
    if let Some(number) = wpu_number {
        return match lesson.course.filter(|c| !c.is_empty()) {
            Some(course) => format!("WPU {}", translate_subject(locale, course)),
            None => format!("WPU {number}"),
        };
    }

    translate_subject(locale, subject).to_owned()
}

/// The app's `common.subjects.*` translations; other names are shown as stored.
fn translate_subject(locale: Locale, name: &str) -> &str {
    match (locale, name) {
        (Locale::De, "art") => "Kunst",
        (Locale::De, "biology") => "Biologie",
        (Locale::De, "chemistry") => "Chemie",
        (Locale::De, "homeroom") => "Klassenstunde",
        (Locale::De, "cs") => "Informatik",
        (Locale::De, "english") => "Englisch",
        (Locale::De, "ethics") => "Ethik",
        (Locale::De, "french") => "Französisch",
        (Locale::De, "geography") => "Erdkunde",
        (Locale::De, "german") => "Deutsch",
        (Locale::De, "history") => "Geschichte",
        (Locale::De, "latin") => "Latein",
        (Locale::De, "math") => "Mathe",
        (Locale::De, "music") => "Musik",
        (Locale::De, "pe") => "Sport",
        (Locale::De, "philosophy") => "Philosophie",
        (Locale::De, "physics") => "Physik",
        (Locale::De, "politics") => "Politik",
        (Locale::De, "wpu") => "WPU",
        (Locale::De, "wpu1") => "WPU 1",
        (Locale::De, "wpu2") => "WPU 2",
        (Locale::De, "wpu3") => "WPU 3",
        (Locale::En, "art") => "Art",
        (Locale::En, "biology") => "Biology",
        (Locale::En, "chemistry") => "Chemistry",
        (Locale::En, "homeroom") => "Homeroom",
        (Locale::En, "cs") => "Computer Science",
        (Locale::En, "english") => "English",
        (Locale::En, "ethics") => "Ethics",
        (Locale::En, "french") => "French",
        (Locale::En, "geography") => "Geography",
        (Locale::En, "german") => "German",
        (Locale::En, "history") => "History",
        (Locale::En, "latin") => "Latin",
        (Locale::En, "math") => "Math",
        (Locale::En, "music") => "Music",
        (Locale::En, "pe") => "PE",
        (Locale::En, "philosophy") => "Philosophy",
        (Locale::En, "physics") => "Physics",
        (Locale::En, "politics") => "Politics",
        (Locale::En, "wpu") => "Elective",
        (Locale::En, "wpu1") => "Elective 1",
        (Locale::En, "wpu2") => "Elective 2",
        (Locale::En, "wpu3") => "Elective 3",
        (_, "dalton") => "Dalton",
        (_, "enrichment") => "Enrichment",
        (_, "religion") => "Religion",
        (_, "theater") => "Theater",
        _ => name,
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
        subject: Some("math"),
        course: None,
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
            "Math, Monday period 3: cancelled"
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
            "Math, Monday period 3: changed"
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
    fn names_subjects_as_the_timetable_does() {
        let name = |locale, subject, course| {
            lesson_name(
                locale,
                &Lesson {
                    subject,
                    course,
                    ..MATHS
                },
            )
        };
        assert_eq!(name(Locale::De, Some("german"), None), "Deutsch");
        assert_eq!(name(Locale::En, Some("pe"), None), "PE");
        assert_eq!(name(Locale::De, Some("Astronomie"), None), "Astronomie");
        assert_eq!(
            name(Locale::En, Some("WPU1"), Some("cs")),
            "WPU Computer Science"
        );
        assert_eq!(
            name(Locale::De, Some("wpu2"), Some("Robotik")),
            "WPU Robotik"
        );
        assert_eq!(name(Locale::En, Some("wpu2"), None), "WPU 2");
        assert_eq!(name(Locale::En, None, None), "Lesson");
    }

    #[test]
    fn keeps_the_substitute_subject_as_entered() {
        let change = ScheduleChange {
            subject: Some("german".into()),
            ..Default::default()
        };
        assert_eq!(
            schedule_change_body(Locale::De, &MATHS, &change),
            "Mathe, Montag 3. Stunde: Vertretung german"
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
