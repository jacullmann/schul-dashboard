import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resendClient: Resend | null = null;
  private readonly emailConfigured: boolean;
  private readonly emailFrom: string;

  constructor(private readonly configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    this.emailFrom =
      this.configService.get<string>('EMAIL_FROM') ||
      'Schul Dashboard <noreply@schul-dashboard.com>';

    if (resendApiKey) {
      this.resendClient = new Resend(resendApiKey);
      this.emailConfigured = true;
      this.resendClient.domains
        .list()
        .then(() => this.logger.log('Resend API erreichbar und konfiguriert.'))
        .catch((err) =>
          this.logger.error(
            'Resend API Test fehlgeschlagen:',
            err instanceof Error ? err.stack : String(err),
          ),
        );
    } else {
      this.emailConfigured = false;
      this.logger.warn(
        'RESEND_API_KEY nicht gesetzt. E-Mails können nicht versendet werden.',
      );
    }
  }

  async sendVerificationEmail(to: string, verifyUrl: string): Promise<unknown> {
    if (!this.emailConfigured || !this.resendClient) {
      throw new Error('E-Mail-Service nicht konfiguriert');
    }

    const { data, error } = await this.resendClient.emails.send({
      from: this.emailFrom,
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
        `,
    });

    if (error) {
      this.logger.error('Resend verification email error:', error);
      throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
    }
    if (data && 'id' in data) {
      this.logger.log(
        `Verification email sent successfully. Resend ID: ${data.id}`,
      );
    }
    return data;
  }

  async sendPasswordResetEmail(to: string, code: string): Promise<unknown> {
    if (!this.emailConfigured || !this.resendClient) {
      throw new Error('E-Mail-Service nicht konfiguriert');
    }

    const { data, error } = await this.resendClient.emails.send({
      from: this.emailFrom,
      to: [to],
      subject: 'Passwort zurücksetzen',
      html: `
            <h3>Bestätigungscode</h3>
            <p>Um dein Passwort zurückzusetzen, gebe folgenden Code auf der Schul Dashboard Seite ein:</p>
            <p><strong>${code}</strong></p>
            <p>Dieser Code ist für 30 Minuten gültig.</p>
            <p>Falls du diesen Code nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
        `,
    });

    if (error) {
      this.logger.error('Resend password reset email error:', error);
      throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
    }

    return data;
  }

  async sendSecurityEmail(to: string): Promise<unknown> {
    if (!this.emailConfigured || !this.resendClient) {
      throw new Error('E-Mail-Service nicht konfiguriert');
    }

    const { data, error } = await this.resendClient.emails.send({
      from: this.emailFrom,
      to: [to],
      subject: 'Dein Passwort wurde zurückgesetzt',
      html: `
            <h3>Wichtige Sicherheitsmeldung</h3>
            <p>Soeben wurde ein erfolgreiches Passwortreset deines Kontos durchgeführt. Wenn die Zwei-Faktor-Authentifizierung für dein Konto aktiviert war, ist es dies nun NICHT mehr.</p>
            <p>Wenn du die Zwei-Faktor-Authentifizierung wieder aktivieren willst, kannst du dies jederzeit manuell in den Accounteinstellungen tun.</p>
            <p>Falls du den Passwortreset nicht veranlasst hast, kontaktiere sofort den Support.</p>
        `,
    });

    if (error) {
      this.logger.error('Security email error:', error);
      throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
    }

    return data;
  }
}
