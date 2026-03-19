import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import dayjs from 'dayjs';
import { authenticator } from '@otplib/preset-v11';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../common/supabase/supabase.service';
import { EmailService } from '../common/email/email.service';
import { ConfigService } from '@nestjs/config';
import { generateUserName } from '../common/utils/name-generator.util';
import { decryptData } from '../common/utils/encryption.util';
import { rotateCsrfToken } from '../common/middleware/csrf.middleware';
import { COOKIE_NAME } from '../common/guards/jwt-auth.guard';
import { MFA_PENDING_COOKIE } from '../common/guards/mfa-auth.guard';
import { Request, Response } from 'express';

const DUMMY_HASH = bcrypt.hashSync('__dummy__', 10);

function isWeakPassword(password: string): boolean {
  if (password.length < 8) return true;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return !(hasLetter && hasNumber);
}

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    authenticator.options = { step: 30, window: 1 };
  }

  private setAuthToken(
    res: Response,
    userId: string,
    email: string,
    globalRole: string,
    activeGroupId: string | null,
  ) {
    const secret = this.configService.get<string>('USER_JWT_SECRET')!;
    const payload = {
      sub: userId,
      email,
      gRole: globalRole || 'user',
      gId: activeGroupId || null,
    };

    const token = jwt.sign(payload, secret, { expiresIn: '7d' });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private generateMfaPendingToken(
    res: Response,
    userId: string,
    email: string,
  ) {
    const secret = this.configService.get<string>('MFA_PENDING_JWT_SECRET')!;
    const token = jwt.sign(
      { sub: userId, email, purpose: 'mfa_pending' },
      secret,
      { expiresIn: '5m' },
    );

    res.cookie(MFA_PENDING_COOKIE, token, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'none',
      maxAge: 5 * 60 * 1000,
    });
  }

  private clearMfaPendingToken(res: Response) {
    res.clearCookie(MFA_PENDING_COOKIE, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'none',
    });
  }

  private clearAuthToken(res: Response) {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'none',
    });
  }

  async login(email: string, password: string, res: Response, _ip?: string) {
    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select(
        'id, email, password_hash, email_verified, mfa_enabled, mfa_secret, user_roles(roles(name), tenant_id)',
      )
      .eq('email', email.toLowerCase())
      .maybeSingle();

    const hashToCompare = user?.password_hash || DUMMY_HASH;
    const ok = await bcrypt.compare(password, hashToCompare as string);

    if (!user || !ok) {
      throw new UnauthorizedException('Ungültige Zugangsdaten');
    }

    if (!user.email_verified) {
      throw new UnauthorizedException('Bitte E-Mail zuerst verifizieren');
    }

    const { data: ban } = await sb
      .from('banned_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (ban) {
      throw new ForbiddenException('Dein Account ist gesperrt.');
    }

    if (user.mfa_enabled && user.mfa_secret) {
      this.generateMfaPendingToken(res, user.id as string, email);
      return {
        ok: true,
        requiresMfa: true,
        message: 'MFA-Verifizierung erforderlich',
      };
    }

    const newCsrfToken = rotateCsrfToken(res);
    await sb
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);
    const { error: err_a0k7i } = await sb
      .from('mfa_pending_secrets')
      .delete()
      .eq('user_id', user.id);
    if (err_a0k7i) throw new InternalServerErrorException(err_a0k7i.message);

    const userRoles = user.user_roles as any[];
    const globalRole =
      userRoles?.find((ur) => !ur.tenant_id)?.roles?.name || 'user';

    const { data: firstGroup } = await sb
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .not('tenant_id', 'is', null)
      .limit(1)
      .maybeSingle();

    this.setAuthToken(
      res,
      user.id as string,
      user.email as string,
      globalRole,
      firstGroup?.tenant_id || null,
    );

    return { ok: true, csrfToken: newCsrfToken };
  }

  async verifyMfa(
    code: string,
    userId: string,
    email: string,
    res: Response,
    ip?: string,
  ) {
    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select(
        'id, email, mfa_enabled, mfa_secret, user_roles(roles(name), tenant_id)',
      )
      .eq('id', userId)
      .maybeSingle();

    if (!user || !user.mfa_enabled || !user.mfa_secret) {
      this.clearMfaPendingToken(res);
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 100));
      throw new UnauthorizedException('Authentifizierung fehlgeschlagen');
    }

    const secret = await decryptData(user.mfa_secret, userId);
    const isValid = authenticator.check(code, secret);

    if (!isValid) {
      const { error: err_jq95x } = await sb.from('user_activity').insert({
        user_id: userId,
        type: 'auth:mfa_login_failed',
        meta: { ip },
      });
      if (err_jq95x) throw new InternalServerErrorException(err_jq95x.message);
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 100));
      throw new UnauthorizedException('Authentifizierung fehlgeschlagen');
    }

    this.clearMfaPendingToken(res);
    const newCsrfToken = rotateCsrfToken(res);

    await sb
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);
    const { error: err_n0hht } = await sb
      .from('mfa_pending_secrets')
      .delete()
      .eq('user_id', userId);
    if (err_n0hht) throw new InternalServerErrorException(err_n0hht.message);
    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'auth:mfa_login', meta: {} });

    const userRoles = user.user_roles as any[];
    const globalRole =
      userRoles?.find((ur) => !ur.tenant_id)?.roles?.name || 'user';
    const { data: firstGroup } = await sb
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', userId)
      .not('tenant_id', 'is', null)
      .limit(1)
      .maybeSingle();

    this.setAuthToken(
      res,
      user.id as string,
      user.email as string,
      globalRole,
      firstGroup?.tenant_id || null,
    );

    return { ok: true, csrfToken: newCsrfToken };
  }

  cancelMfa(res: Response) {
    this.clearMfaPendingToken(res);
    return { ok: true };
  }

  async register(
    email: string,
    password: string,
    preferences?: Record<string, any>,
  ) {
    if (isWeakPassword(password)) {
      throw new BadRequestException(
        'Passwort muss mindestens 8 Zeichen lang sein und Buchstaben sowie Zahlen enthalten.',
      );
    }

    const sb = this.supabaseService.getClient();
    const { data: exists } = await sb
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (exists) {
      throw new BadRequestException('E-Mail bereits registriert');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Set default preferences and merge with user-provided preferences
    const defaultPreferences = {
      theme: 'system',
      language: 'de',
      personalized: 'true',
    };
    const mergedPreferences = { ...defaultPreferences, ...(preferences || {}) };

    const { data: user, error } = await sb
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        email_verified: false,
        preferences: mergedPreferences,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = dayjs().add(2, 'day').toISOString();
    await sb
      .from('verifications')
      .insert({ email: user.email, token, expires_at: expiresAt });

    const clientVerifyUrl =
      this.configService.get<string>('CLIENT_VERIFY_URL') ||
      `http://localhost:5173/verify`;
    const verifyUrl = `${clientVerifyUrl}?token=${token}`;

    try {
      await this.emailService.sendVerificationEmail(user.email, verifyUrl);
      return {
        ok: true,
        message:
          'Registriert. Bitte überprüfe deine E-Mail sowie deinen Spamordner.',
      };
    } catch (_mailErr) {
      return {
        ok: true,
        message:
          'Registriert. E-Mail konnte nicht versendet werden. Bitte später erneut oder Support kontaktieren.',
      };
    }
  }

  logout(res: Response) {
    this.clearAuthToken(res);
    this.clearMfaPendingToken(res);
    const newCsrfToken = rotateCsrfToken(res);
    return { ok: true, csrfToken: newCsrfToken };
  }

  async getMe(userId: string, activeGroupId: string | null) {
    if (!userId) return { authenticated: false };

    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select('*, user_roles(tenant_id, roles(name))')
      .eq('id', userId)
      .maybeSingle();

    if (!user) return { authenticated: false };

    const userRoles = user.user_roles as any[];
    const globalRoleName =
      userRoles?.find((ur) => !ur.tenant_id)?.roles?.name || 'user';
    const tenantRoleName =
      userRoles?.find((ur) => ur.tenant_id === activeGroupId)?.roles?.name ||
      null;

    return {
      authenticated: true,
      id: user.id,
      email: user.email,
      role: globalRoleName,
      tenantRole: tenantRoleName,
      emailVerified: !!user.email_verified,
      enrKurs: user.enr_kurs,
      wpuKurs1: user.wpu_kurs_1,
      wpuKurs2: user.wpu_kurs_2,
      theater: user.theater,
      doneSetup: !!user.done_setup,
      personalized: user.personalized !== false,
      mfaEnabled: !!user.mfa_enabled,
      preferences: user.preferences,
    };
  }

  async deleteMe(userId: string, res: Response) {
    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select('id, user_roles(roles(name))')
      .eq('id', userId)
      .maybeSingle();
    if (!user) throw new BadRequestException('Nutzer nicht gefunden');

    const userRoles = user.user_roles as any[];
    if (userRoles?.some((ur) => ur.roles?.name === 'superadmin')) {
      throw new ForbiddenException('Adminkonten können nicht gelöscht werden.');
    }

    const { error: err_lfvg5 } = await sb
      .from('users')
      .delete()
      .eq('id', userId);
    if (err_lfvg5) throw new InternalServerErrorException(err_lfvg5.message);

    this.clearAuthToken(res);
    this.clearMfaPendingToken(res);
    rotateCsrfToken(res);
    return { ok: true };
  }

  async verifyEmail(token: string) {
    const sb = this.supabaseService.getClient();
    const { data: ver } = await sb
      .from('verifications')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (!ver) throw new BadRequestException('Ungültiger Token');
    if (dayjs(ver.expires_at).isBefore(dayjs()))
      throw new BadRequestException('Token abgelaufen');

    const { data: user } = await sb
      .from('users')
      .select('id')
      .eq('email', ver.email)
      .maybeSingle();
    if (!user) throw new BadRequestException('Nutzer nicht gefunden');

    const { error: err_rmh0v } = await sb
      .from('users')
      .update({ email_verified: true })
      .eq('id', user.id);
    if (err_rmh0v) throw new InternalServerErrorException(err_rmh0v.message);
    const { error: err_5wa7e } = await sb
      .from('verifications')
      .delete()
      .eq('email', ver.email);
    if (err_5wa7e) throw new InternalServerErrorException(err_5wa7e.message);

    return { ok: true };
  }

  async forgotPassword(email: string) {
    email = email.toLowerCase();
    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (!user) {
      return {
        ok: true,
        message: 'Wenn die E-Mail existiert, wurde ein Code versendet.',
      };
    }

    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = dayjs().add(30, 'minute').toISOString();

    await sb
      .from('password_resets')
      .update({ used: true })
      .eq('email', email)
      .eq('used', false);
    await sb
      .from('password_resets')
      .insert({ email, code, expires_at: expiresAt });

    try {
      await this.emailService.sendPasswordResetEmail(email, code);
    } catch (_mailErr) {
      // Ignore mail errors to prevent user enumeration or leakage
    }

    return {
      ok: true,
      message: 'Wenn die E-Mail existiert, wurde ein Code versendet.',
    };
  }

  async verifyResetToken(email: string, code: string) {
    email = email.toLowerCase();
    code = code.trim();
    const sb = this.supabaseService.getClient();

    const { data: pr } = await sb
      .from('password_resets')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pr) throw new BadRequestException('Ungültiger Code');
    if (dayjs(pr.expires_at).isBefore(dayjs()))
      throw new BadRequestException('Code abgelaufen');

    const { error: err_ybmnb } = await sb
      .from('password_resets')
      .update({ used: true })
      .eq('id', pr.id);
    if (err_ybmnb) throw new InternalServerErrorException(err_ybmnb.message);

    const secret = this.configService.get<string>('PASSWORD_RESET_JWT_SECRET')!;
    const resetToken = jwt.sign({ email, purpose: 'password_reset' }, secret, {
      expiresIn: '15m',
    });

    return { ok: true, resetToken };
  }

  async resetPassword(resetToken: string, password: string) {
    if (isWeakPassword(password)) {
      throw new BadRequestException(
        'Passwort muss mindestens 8 Zeichen lang sein und Buchstaben sowie Zahlen enthalten.',
      );
    }

    const secret = this.configService.get<string>('PASSWORD_RESET_JWT_SECRET')!;
    let payload: any;
    try {
      payload = jwt.verify(resetToken, secret);
    } catch {
      throw new BadRequestException('Ungültiger oder abgelaufener Reset-Token');
    }

    if (payload?.purpose !== 'password_reset' || !payload?.email) {
      throw new BadRequestException('Ungültiger Reset-Token');
    }

    const email = String(payload.email).toLowerCase();
    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select('id, mfa_enabled')
      .eq('email', email)
      .maybeSingle();

    if (!user) throw new BadRequestException('Nutzer nicht gefunden');

    const passwordHash = await bcrypt.hash(password, 12);
    await sb
      .from('users')
      .update({
        password_hash: passwordHash,
        mfa_enabled: false,
        mfa_secret: null,
      })
      .eq('id', user.id);

    const { error: err_b7j06 } = await sb.from('user_activity').insert({
      user_id: user.id,
      type: 'account:password_reset',
      meta: {
        by: 'self',
        mfaWasEnabled: !!user.mfa_enabled,
        mfaDisabled: true,
      },
    });
    if (err_b7j06) throw new InternalServerErrorException(err_b7j06.message);

    try {
      await this.emailService.sendSecurityEmail(email);
    } catch {
      // Security email failure is non-critical for the password reset flow
    }

    return {
      ok: true,
      message: 'Passwort wurde geändert. MFA wurde deaktiviert.',
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    if (isWeakPassword(newPassword)) {
      throw new BadRequestException(
        'Passwort muss mindestens 8 Zeichen lang sein und Buchstaben sowie Zahlen enthalten.',
      );
    }

    const sb = this.supabaseService.getClient();
    const { data: user } = await sb
      .from('users')
      .select('id, password_hash')
      .eq('id', userId)
      .maybeSingle();
    if (!user) throw new BadRequestException('Nutzer nicht gefunden');

    const isCorrect = await bcrypt.compare(
      currentPassword,
      user.password_hash as string,
    );
    if (!isCorrect)
      throw new ForbiddenException('Aktuelles Passwort ist falsch');

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await sb
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId);
    const { error: err_h6x8v } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'account:password_change',
      meta: { by: 'self' },
    });
    if (err_h6x8v) throw new InternalServerErrorException(err_h6x8v.message);

    return { ok: true, message: 'Passwort erfolgreich geändert.' };
  }

  async getGroups(userId: string) {
    const sb = this.supabaseService.getClient();
    const { data: userRoles, error } = await sb
      .from('user_roles')
      .select('tenant_id, groups(id, name), roles(name)')
      .eq('user_id', userId)
      .not('tenant_id', 'is', null);

    if (error) throw new BadRequestException('Fehler beim Laden der Gruppen');

    const groups = (userRoles || [])
      .filter((ur: any) => ur.groups?.id)
      .map((ur: any) => ({
        id: ur.groups.id,
        name: ur.groups.name,
        role: ur.roles?.name,
        generatedName: generateUserName(userId, ur.groups.id),
      }));

    return { groups };
  }
}
