export function createEmailService({ resendClient, emailConfigured, emailFrom }) {

    async function sendVerificationEmail(to, verifyUrl) {
        if (!emailConfigured) throw new Error('E-Mail-Service nicht konfiguriert');

        const { data, error } = await resendClient.emails.send({
            from: emailFrom,
            to: [to],
            subject: 'Bitte bestätige deine E-Mail-Adresse',
            html: `
            <h3>Nur noch ein letzter Schritt</h3>
            <p>Willkommen beim Schul Dashboard. Bevor es losgehen kann, musst du noch deine E-Mail-Adresse bestätigen.</p>
            <p>Klicke auf den Link unten und melde dich mit deinem neuen Account an.</p>
            <p><a href="${verifyUrl}">E-Mail bestätigen</a></p>
            <p>Der Link ist für 48 Stunden gültig.</p>
            <p>Sobald deine E-Mail-Adresse bestätigt wurde, kannst du dich beim Schul Dashboard anmelden und loslegen.</p>
            <p>
              Danke, dass du dich für uns entschieden hast.
              <br>
              Das Schul Dashboard-Team
            </p>
        `
        });

        if (error) {
            console.error('Resend verification email error:', error);
            throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
        }
        if (data?.id) {
            console.log(`Verification email sent successfully. Resend ID: ${data.id}`);
        }
        return data;
    }

    async function sendPasswordResetEmail(to, code) {
        if (!emailConfigured) throw new Error('E-Mail-Service nicht konfiguriert');

        const { data, error } = await resendClient.emails.send({
            from: emailFrom,
            to: [to],
            subject: 'Passwort zurücksetzen',
            html: `
            <h3>Bestätigungscode</h3>
            <p>Um dein Passwort zurückzusetzen, gebe folgenden Code auf der Schul Dashboard Seite ein:</p>
            <p><strong>${code}</strong></p>
            <p>Dieser Code ist für 30 Minuten gültig.</p>
            <p>Falls du diesen Code nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
        `
        });

        if (error) {
            console.error('Resend password reset email error:', error);
            throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
        }

        return data;
    }

    async function sendSecurityEmail(to) {
        if (!emailConfigured) throw new Error('E-Mail-Service nicht konfiguriert');

        const { data, error } = await resendClient.emails.send({
            from: emailFrom,
            to: [to],
            subject: 'Dein Passwort wurde zurückgesetzt',
            html: `
            <h3>Wichtige Sicherheitsmeldung</h3>
            <p>Soeben wurde ein erfolgreiches Passwortreset deines Kontos durchgeführt. Wenn die Zwei-Faktor-Authentifizierung für dein Konto aktiviert war, ist es dies nun NICHT mehr.</p>
            <p>Wenn du die Zwei-Faktor-Authentifizierung wieder aktivieren willst, kannst du dies jederzeit manuell in den Accounteinstellungen tun.</p>
            <p>Falls du den Passwortreset nicht veranlasst hast, kontaktiere sofort den Support.</p>
        `
        });

        if (error) {
            console.error('Security email error:', error);
            throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
        }

        return data;
    }

    return {
        sendVerificationEmail,
        sendPasswordResetEmail,
        sendSecurityEmail
    };
}