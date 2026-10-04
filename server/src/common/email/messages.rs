use crate::common::locale::Locale;

pub(super) const CONTACT_EMAIL: &str = "kontakt@schul-dashboard.com";

/// Links point at the public homepage in every environment: the legal pages
/// only exist there, and the homepage prefixes every non-English route with
/// its locale.
pub(super) struct LegalFooter {
    pub privacy_label: &'static str,
    pub privacy_url: &'static str,
    pub imprint_label: &'static str,
    pub imprint_url: &'static str,
    pub contact_label: &'static str,
    pub automated_notice: &'static str,
    pub sender: &'static str,
}

impl LegalFooter {
    pub fn for_locale(locale: Locale) -> Self {
        match locale {
            Locale::De => Self {
                privacy_label: "Datenschutz",
                privacy_url: "https://schul-dashboard.com/de/legal/datenschutz",
                imprint_label: "Impressum",
                imprint_url: "https://schul-dashboard.com/de/legal/impressum",
                contact_label: "Kontakt",
                automated_notice: "Diese E-Mail wurde automatisch versendet. Bitte antworte nicht darauf.",
                sender: "schul-dashboard · Berlin, Deutschland",
            },
            Locale::En => Self {
                privacy_label: "Privacy Policy",
                privacy_url: "https://schul-dashboard.com/legal/privacy-policy",
                imprint_label: "Imprint",
                imprint_url: "https://schul-dashboard.com/legal/imprint",
                contact_label: "Contact",
                automated_notice: "This email was sent automatically. Please don't reply to it.",
                sender: "schul-dashboard · Berlin, Germany",
            },
        }
    }
}

pub(super) enum Action {
    Button {
        label: &'static str,
        url: String,
        fallback_hint: &'static str,
    },
    Code(String),
}

pub(super) struct Message {
    pub locale: Locale,
    pub subject: &'static str,
    pub preheader: &'static str,
    pub heading: &'static str,
    pub paragraphs: &'static [&'static str],
    pub action: Option<Action>,
    pub note: Option<String>,
    pub disclaimer: Option<&'static str>,
}

impl Message {
    pub fn verification(locale: Locale, verify_url: &str, valid_hours: u64) -> Self {
        let url = verify_url.to_owned();

        match locale {
            Locale::De => Self {
                locale,
                subject: "Bitte bestätige deine E-Mail-Adresse",
                preheader: "Bestätige deine E-Mail-Adresse, um dein schul-dashboard-Konto zu aktivieren.",
                heading: "Nur noch ein letzter Schritt",
                paragraphs: &[
                    "Willkommen beim schul-dashboard. Bevor es losgehen kann, bestätige bitte deine E-Mail-Adresse.",
                ],
                action: Some(Action::Button {
                    label: "E-Mail bestätigen",
                    url,
                    fallback_hint: "Funktioniert der Button nicht? Kopiere diesen Link in deinen Browser:",
                }),
                note: Some(format!("Der Link ist {valid_hours} Stunden gültig.")),
                disclaimer: Some(
                    "Du hast dich nicht beim schul-dashboard registriert? Dann kannst du diese E-Mail einfach ignorieren.",
                ),
            },
            Locale::En => Self {
                locale,
                subject: "Please confirm your email address",
                preheader: "Confirm your email address to activate your schul-dashboard account.",
                heading: "Just one last step",
                paragraphs: &[
                    "Welcome to schul-dashboard. Before you get started, please confirm your email address.",
                ],
                action: Some(Action::Button {
                    label: "Confirm email",
                    url,
                    fallback_hint: "Button not working? Copy this link into your browser:",
                }),
                note: Some(format!("The link is valid for {valid_hours} hours.")),
                disclaimer: Some(
                    "Didn't sign up for schul-dashboard? You can safely ignore this email.",
                ),
            },
        }
    }

    pub fn password_reset(locale: Locale, code: &str, valid_minutes: u64) -> Self {
        let action = Some(Action::Code(code.to_owned()));

        match locale {
            Locale::De => Self {
                locale,
                subject: "Passwort zurücksetzen",
                preheader: "Dein Code zum Zurücksetzen deines Passworts.",
                heading: "Passwort zurücksetzen",
                paragraphs: &[
                    "Gib diesen Code auf der schul-dashboard-Seite ein, um ein neues Passwort festzulegen:",
                ],
                action,
                note: Some(format!("Der Code ist {valid_minutes} Minuten gültig.")),
                disclaimer: Some(
                    "Du hast kein neues Passwort angefordert? Dann kannst du diese E-Mail ignorieren, dein Passwort bleibt unverändert.",
                ),
            },
            Locale::En => Self {
                locale,
                subject: "Reset your password",
                preheader: "Your code to reset your password.",
                heading: "Reset your password",
                paragraphs: &[
                    "Enter this code on the schul-dashboard page to choose a new password:",
                ],
                action,
                note: Some(format!("The code is valid for {valid_minutes} minutes.")),
                disclaimer: Some(
                    "Didn't request a new password? You can ignore this email, your password stays unchanged.",
                ),
            },
        }
    }

    pub fn password_setup(locale: Locale, code: &str, valid_minutes: u64) -> Self {
        let action = Some(Action::Code(code.to_owned()));

        match locale {
            Locale::De => Self {
                locale,
                subject: "Passwort festlegen",
                preheader: "Dein Code, um ein Passwort für dein Konto festzulegen.",
                heading: "Passwort festlegen",
                paragraphs: &[
                    "Gib diesen Code auf der schul-dashboard-Seite ein, um ein Passwort für dein Konto festzulegen:",
                ],
                action,
                note: Some(format!("Der Code ist {valid_minutes} Minuten gültig.")),
                disclaimer: Some(
                    "Du hast das nicht angefordert? Dann kannst du diese E-Mail einfach ignorieren.",
                ),
            },
            Locale::En => Self {
                locale,
                subject: "Set your password",
                preheader: "Your code to set a password for your account.",
                heading: "Set your password",
                paragraphs: &[
                    "Enter this code on the schul-dashboard page to set a password for your account:",
                ],
                action,
                note: Some(format!("The code is valid for {valid_minutes} minutes.")),
                disclaimer: Some("Didn't request this? You can safely ignore this email."),
            },
        }
    }

    pub fn password_reset_notice(locale: Locale) -> Self {
        match locale {
            Locale::De => Self {
                locale,
                subject: "Dein Passwort wurde zurückgesetzt",
                preheader: "Das Passwort deines schul-dashboard-Kontos wurde soeben zurückgesetzt.",
                heading: "Wichtige Sicherheitsmeldung",
                paragraphs: &[
                    "Soeben wurde das Passwort deines Kontos erfolgreich zurückgesetzt.",
                    "Falls du dies nicht warst, kontaktiere sofort den Support.",
                ],
                action: None,
                note: None,
                disclaimer: None,
            },
            Locale::En => Self {
                locale,
                subject: "Your password was reset",
                preheader: "The password for your schul-dashboard account was just reset.",
                heading: "Important security notice",
                paragraphs: &[
                    "The password for your account was just reset successfully.",
                    "If this wasn't you, contact support immediately.",
                ],
                action: None,
                note: None,
                disclaimer: None,
            },
        }
    }
}
