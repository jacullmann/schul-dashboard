import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { authenticator } from '@otplib/preset-v11';
import * as QRCode from 'qrcode';
import { encryptData, decryptData } from '../common/utils/encryption.util';

@Injectable()
export class MfaService {
  constructor(private readonly supabaseService: SupabaseService) {
    authenticator.options = { step: 30, window: 1 };
  }

  async getStatus(userId: string) {
    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select('mfa_enabled')
      .eq('id', userId)
      .maybeSingle();

    if (!user) throw new NotFoundException('Nutzer nicht gefunden');

    return { ok: true, mfaEnabled: !!user.mfa_enabled };
  }

  async setup(userId: string) {
    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select('email, mfa_enabled')
      .eq('id', userId)
      .maybeSingle();

    if (!user) throw new NotFoundException('Nutzer nicht gefunden');
    if (user.mfa_enabled)
      throw new BadRequestException('MFA ist bereits aktiviert');

    // Delete old pending secret if exists
    await sb.from('mfa_pending_secrets').delete().eq('user_id', userId);

    // Generate new secret
    const secret = authenticator.generateSecret();
    const encryptedSecret = await encryptData(secret, userId);

    // Store pending secret (valid for 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await sb.from('mfa_pending_secrets').upsert({
      user_id: userId,
      encrypted_secret: encryptedSecret,
      expires_at: expiresAt,
    });

    // Generate QR code
    const issuer = 'Schul-Dashboard';
    const accountName = user.email as string;
    const otpauthUrl = authenticator.keyuri(accountName, issuer, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'mfa:setup:started', meta: {} });

    return { ok: true, qrCode: qrCodeDataUrl, secret, expiresAt };
  }

  async activate(userId: string, code: string) {
    const sb = this.supabaseService.getClient();

    // Fetch pending secret
    const { data: pending } = await sb
      .from('mfa_pending_secrets')
      .select('encrypted_secret')
      .eq('user_id', userId)
      .maybeSingle();

    if (!pending) {
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 100));
      throw new BadRequestException('Authentifizierung fehlgeschlagen');
    }

    // Decrypt and verify code
    const secret = await decryptData(pending.encrypted_secret, userId);
    const isValid = authenticator.check(code, secret);

    if (!isValid) {
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 100));
      throw new BadRequestException('Authentifizierung fehlgeschlagen');
    }

    // Enable MFA: store encrypted secret on user
    const encryptedSecret = await encryptData(secret, userId);
    await sb
      .from('users')
      .update({ mfa_enabled: true, mfa_secret: encryptedSecret })
      .eq('id', userId);

    // Delete pending secret
    await sb.from('mfa_pending_secrets').delete().eq('user_id', userId);

    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'mfa:activated', meta: {} });

    return { ok: true, message: 'MFA erfolgreich aktiviert' };
  }

  async deactivate(userId: string, code: string, ip?: string) {
    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select('mfa_enabled, mfa_secret')
      .eq('id', userId)
      .maybeSingle();

    if (!user) throw new NotFoundException('Nutzer nicht gefunden');

    if (!user.mfa_enabled || !user.mfa_secret) {
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 100));
      throw new BadRequestException('Authentifizierung fehlgeschlagen');
    }

    // Decrypt and verify code
    const secret = await decryptData(user.mfa_secret, userId);
    const isValid = authenticator.check(code, secret);

    if (!isValid) {
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 100));
      throw new BadRequestException('Authentifizierung fehlgeschlagen');
    }

    // Disable MFA
    await sb
      .from('users')
      .update({ mfa_enabled: false, mfa_secret: null })
      .eq('id', userId);

    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'mfa:deactivated', meta: { ip } });

    return { ok: true, message: 'MFA erfolgreich deaktiviert' };
  }
}
