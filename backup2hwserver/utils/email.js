// utils/email.js
import sgClient from '@sendgrid/mail';
import { SENDGRID_API_KEY, SENDGRID_FROM } from '../config/index.js';

export async function sendVerificationEmail(to, verifyUrl) {
    if (!SENDGRID_API_KEY) throw new Error('SendGrid nicht konfiguriert');
    const msg = {
        to,
        from: SENDGRID_FROM,
        subject: 'Bitte E-Mail bestätigen',
        html: `<p>Hallo,</p><p>Bitte bestätige deine E-Mail durch Klick auf diesen Link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Der Link ist 48 Stunden gültig.</p>`
    };
    return sgClient.send(msg);
}

export async function sendPasswordResetEmail(to, code) {
    if (!SENDGRID_API_KEY) throw new Error('SendGrid nicht konfiguriert');
    const msg = {
        to,
        from: SENDGRID_FROM,
        subject: 'Passwort zurücksetzen — Dein Bestätigungscode',
        html: `<p>Hallo,</p>
           <p>Dein Passwort-Zurücksetz-Code: <strong>${code}</strong></p>
           <p>Dieser Code ist 30 Minuten gültig.</p>`
    };
    return sgClient.send(msg);
}