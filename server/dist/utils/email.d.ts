import type { Resend } from 'resend';
import type { EmailService } from '../types/index.js';
interface EmailServiceConfig {
    resendClient: Resend | null;
    emailConfigured: boolean;
    emailFrom: string;
}
export declare function createEmailService({ resendClient, emailConfigured, emailFrom, }: EmailServiceConfig): EmailService;
export {};
//# sourceMappingURL=email.d.ts.map