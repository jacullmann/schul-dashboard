use super::messages::{Action, CONTACT_EMAIL, LegalFooter, Message};

const LAYOUT: &str = include_str!("layout.html");

impl Message {
    pub fn to_html(&self) -> String {
        LAYOUT
            .replace("{{lang}}", self.locale.as_str())
            .replace("{{title}}", self.subject)
            .replace("{{preheader}}", self.preheader)
            .replace("{{content}}", &self.content_html())
            .replace(
                "{{disclaimer}}",
                &self.disclaimer.map(disclaimer_html).unwrap_or_default(),
            )
            .replace("{{legal}}", &self.legal_footer().to_html())
    }

    fn legal_footer(&self) -> LegalFooter {
        LegalFooter::for_locale(self.locale)
    }

    pub fn to_text(&self) -> String {
        let mut blocks = vec![self.heading.to_owned()];
        blocks.extend(self.paragraphs.iter().map(|p| (*p).to_owned()));

        match &self.action {
            Some(Action::Button { url, .. }) => blocks.push(url.clone()),
            Some(Action::Code(code)) => blocks.push(code.clone()),
            None => {}
        }

        blocks.extend(self.note.clone());
        blocks.extend(self.disclaimer.map(str::to_owned));
        blocks.push(self.legal_footer().to_text());

        blocks.join("\n\n") + "\n"
    }

    fn content_html(&self) -> String {
        let mut html = format!(
            r#"<h1 class="text-strong" style="margin: 0; font-size: 24px; line-height: 32px; font-weight: 700; letter-spacing: -0.02em; color: #0f0f0f;">{}</h1>"#,
            self.heading
        );

        for paragraph in self.paragraphs {
            html.push_str(&format!(
                r#"<p class="text-body" style="margin: 12px 0 0; font-size: 15px; line-height: 24px; color: #414141;">{paragraph}</p>"#
            ));
        }

        match &self.action {
            Some(Action::Button { label, url, .. }) => html.push_str(&button_html(label, url)),
            Some(Action::Code(code)) => html.push_str(&code_html(code)),
            None => {}
        }

        if let Some(note) = &self.note {
            html.push_str(&format!(
                r#"<p class="text-muted" style="margin: 24px 0 0; font-size: 13px; line-height: 20px; color: #666666;">{note}</p>"#
            ));
        }

        if let Some(Action::Button {
            url, fallback_hint, ..
        }) = &self.action
        {
            html.push_str(&fallback_link_html(fallback_hint, url));
        }

        html
    }
}

fn button_html(label: &str, url: &str) -> String {
    let url = escape_html(url);
    format!(
        r##"<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-top: 32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="button-cell" align="center" bgcolor="#000000" style="border-radius: 9999px; background-color: #000000; mso-padding-alt: 12px 28px;"><a class="button-link" href="{url}" target="_blank" rel="noopener" style="display: inline-block; padding: 12px 28px; font-size: 15px; line-height: 20px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 9999px; mso-padding-alt: 0;">{label}</a></td></tr></table></td></tr></table>"##
    )
}

fn code_html(code: &str) -> String {
    let code = escape_html(code);
    format!(
        r#"<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-top: 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="code-box text-strong" style="padding: 16px 18px 16px 24px; background-color: #f5f5f5; border: 1px solid #e6e6e6; border-radius: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; font-size: 28px; line-height: 36px; font-weight: 700; letter-spacing: 0.2em; color: #0f0f0f;">{code}</td></tr></table></td></tr></table>"#
    )
}

fn fallback_link_html(hint: &str, url: &str) -> String {
    let url = escape_html(url);
    format!(
        r#"<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="divider" style="padding-top: 32px; border-bottom: 1px solid #e6e6e6; font-size: 0; line-height: 0;">&nbsp;</td></tr></table><p class="text-muted" style="margin: 24px 0 8px; font-size: 13px; line-height: 20px; color: #666666;">{hint}</p><p style="margin: 0; font-size: 13px; line-height: 20px; word-break: break-all;"><a class="fallback-link" href="{url}" target="_blank" rel="noopener" style="color: #414141; text-decoration: underline;">{url}</a></p>"#
    )
}

fn disclaimer_html(disclaimer: &str) -> String {
    format!(
        r#"<tr><td style="padding: 24px 4px 0;"><p class="text-muted" style="margin: 0; font-size: 12px; line-height: 18px; color: #888888;">{disclaimer}</p></td></tr>"#
    )
}

impl LegalFooter {
    fn to_html(&self) -> String {
        let link = |label: &str, href: &str| {
            format!(
                r#"<a class="footer-link" href="{href}" target="_blank" rel="noopener" style="color: #666666; text-decoration: underline;">{label}</a>"#
            )
        };
        let separator = "&nbsp;&nbsp;&middot;&nbsp;&nbsp;";
        let links = [
            link(self.privacy_label, self.privacy_url),
            link(self.imprint_label, self.imprint_url),
            link(self.contact_label, &format!("mailto:{CONTACT_EMAIL}")),
        ]
        .join(separator);

        format!(
            r#"<tr><td style="padding: 32px 4px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="divider" style="padding-top: 24px; border-top: 1px solid #e6e6e6;"><p class="text-muted" style="margin: 0; font-size: 12px; line-height: 18px; color: #666666;">{links}</p><p class="text-muted" style="margin: 12px 0 0; font-size: 12px; line-height: 18px; color: #888888;">{notice}<br>{sender}</p></td></tr></table></td></tr>"#,
            notice = self.automated_notice,
            sender = self.sender,
        )
    }

    fn to_text(&self) -> String {
        format!(
            "---\n{}: {}\n{}: {}\n{}: {CONTACT_EMAIL}\n\n{}\n{}",
            self.privacy_label,
            self.privacy_url,
            self.imprint_label,
            self.imprint_url,
            self.contact_label,
            self.automated_notice,
            self.sender,
        )
    }
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::common::locale::Locale;

    #[test]
    fn html_fills_every_placeholder() {
        for locale in [Locale::De, Locale::En] {
            for message in [
                Message::verification(locale, "https://example.test/verify?token=abc", 48),
                Message::password_reset(locale, "A1B2C3", 30),
                Message::password_setup(locale, "A1B2C3", 30),
                Message::password_reset_notice(locale),
            ] {
                let html = message.to_html();
                assert!(
                    !html.contains("{{"),
                    "unfilled placeholder in {}",
                    message.subject
                );
                assert!(html.contains(&format!(r#"lang="{}""#, locale.as_str())));

                let legal = LegalFooter::for_locale(locale);
                assert!(html.contains(legal.privacy_url));
                assert!(message.to_text().contains(legal.privacy_url));
            }
        }
    }

    #[test]
    fn dynamic_values_reach_both_bodies() {
        let message = Message::verification(Locale::En, "https://example.test/verify?a=1&b=2", 48);
        assert!(
            message
                .to_html()
                .contains("https://example.test/verify?a=1&amp;b=2")
        );
        assert!(
            message
                .to_text()
                .contains("https://example.test/verify?a=1&b=2")
        );

        let message = Message::password_reset(Locale::De, "A1B2C3", 30);
        assert!(message.to_html().contains("A1B2C3"));
        assert!(message.to_text().contains("A1B2C3"));
    }
}
