import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../common/supabase/supabase.service';
import { JwtService } from '../common/jwt/jwt.service';
import { AppConfig } from '../config/env.config';

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  family_id: string;
  parent_id: string | null;
  issued_at: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  user_agent: string | null;
  ip_address: string | null;
  last_used_at: string;
}

export interface IssueOptions {
  userId: string;
  email: string;
  globalRole: string;
  activeGroupId: string | null;
  userAgent?: string;
  ipAddress?: string;
  parent?: { id: string; familyId: string };
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  familyId: string;
  refreshTokenExpiresAt: Date;
}

export type RevokeReason =
  | 'logout'
  | 'logout_all'
  | 'reuse_detected'
  | 'password_change'
  | 'admin_revoke'
  | 'account_deleted'
  | 'mfa_change';

const REFRESH_TOKEN_BYTES = 32;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly appConfig: AppConfig,
  ) {}

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private generateOpaqueToken(): string {
    return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  }

  private sanitizeUserAgent(ua?: string): string | null {
    if (!ua) return null;
    return ua.length > 512 ? ua.slice(0, 512) : ua;
  }

  async issueTokenPair(opts: IssueOptions): Promise<IssuedTokens> {
    const refreshToken = this.generateOpaqueToken();
    const refreshTokenHash = this.hash(refreshToken);
    const familyId = opts.parent?.familyId ?? crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const sb = this.supabaseService.getClient();
    const { data, error } = await sb
      .from('refresh_tokens')
      .insert({
        user_id: opts.userId,
        token_hash: refreshTokenHash,
        family_id: familyId,
        parent_id: opts.parent?.id ?? null,
        expires_at: expiresAt.toISOString(),
        user_agent: this.sanitizeUserAgent(opts.userAgent),
        ip_address: opts.ipAddress ?? null,
      })
      .select('id, family_id')
      .single();

    if (error || !data) {
      this.logger.error('Failed to persist refresh token', error);
      throw new Error('Could not issue refresh token.');
    }

    const accessToken = this.jwtService.signUserToken(
      {
        sub: opts.userId,
        email: opts.email,
        gRole: opts.globalRole,
        gId: opts.activeGroupId,
      },
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    return {
      accessToken,
      refreshToken,
      refreshTokenId: data.id,
      familyId: data.family_id,
      refreshTokenExpiresAt: expiresAt,
    };
  }

  async rotate(
    presentedToken: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<IssuedTokens | null> {
    const presentedHash = this.hash(presentedToken);
    const sb = this.supabaseService.getClient();

    const { data: row, error: lookupError } = await sb
      .from('refresh_tokens')
      .select('*')
      .eq('token_hash', presentedHash)
      .maybeSingle<RefreshTokenRow>();

    if (lookupError) {
      this.logger.error('refresh_tokens lookup failed', lookupError);
      return null;
    }
    if (!row) return null;

    if (row.used_at || row.revoked_at) {
      this.logger.warn(
        `Refresh token reuse detected for user ${row.user_id}, family ${row.family_id}`,
      );
      await this.revokeFamily(row.family_id, 'reuse_detected');
      return null;
    }

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      return null;
    }

    const { data: updated, error: updateError } = await sb
      .from('refresh_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('used_at', null)
      .is('revoked_at', null)
      .select('id')
      .maybeSingle();

    if (updateError) {
      this.logger.error('refresh_tokens used_at update failed', updateError);
      return null;
    }
    if (!updated) {
      this.logger.warn(
        `Refresh rotation race on token ${row.id} (user ${row.user_id}). Revoking family.`,
      );
      await this.revokeFamily(row.family_id, 'reuse_detected');
      return null;
    }

    const user = await this.loadUserClaims(row.user_id);
    if (!user) {
      await this.revokeFamily(row.family_id, 'admin_revoke');
      return null;
    }

    return this.issueTokenPair({
      userId: user.id,
      email: user.email,
      globalRole: user.globalRole,
      activeGroupId: user.activeGroupId,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      parent: { id: row.id, familyId: row.family_id },
    });
  }

  async revokeByToken(
    presentedToken: string,
    reason: RevokeReason,
  ): Promise<void> {
    const sb = this.supabaseService.getClient();
    await sb
      .from('refresh_tokens')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('token_hash', this.hash(presentedToken))
      .is('revoked_at', null);
  }

  async revokeFamily(familyId: string, reason: RevokeReason): Promise<void> {
    const sb = this.supabaseService.getClient();
    await sb
      .from('refresh_tokens')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('family_id', familyId)
      .is('revoked_at', null);
  }

  async revokeAllForUser(
    userId: string,
    reason: RevokeReason,
    exceptFamilyId?: string,
  ): Promise<void> {
    const sb = this.supabaseService.getClient();
    let query = sb
      .from('refresh_tokens')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('user_id', userId)
      .is('revoked_at', null);

    if (exceptFamilyId) {
      query = query.neq('family_id', exceptFamilyId);
    }
    await query;
  }

  private async lookupIp(
    ip: string,
  ): Promise<{
    city: string | null;
    country: string | null;
    countryCode: string | null;
  } | null> {
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
      return {
        city: 'Lokaler Host',
        country: 'Lokales Netzwerk',
        countryCode: null,
      };
    }

    const serviceUrl = this.appConfig.geoipServiceUrl || 'http://geoip:8080';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);

      const res = await fetch(`${serviceUrl}/lookup/${ip}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as any;
        return {
          city: data.city || null,
          country: data.country || null,
          countryCode: data.country_code || null,
        };
      }
    } catch (e) {
      this.logger.debug(`Failed to lookup IP ${ip}: ${e}`);
    }
    return null;
  }

  async listActiveSessions(userId: string): Promise<
    Array<{
      familyId: string;
      issuedAt: string;
      lastUsedAt: string;
      userAgent: string | null;
      ipAddress: string | null;
      location: {
        city: string | null;
        country: string | null;
        countryCode: string | null;
      } | null;
    }>
  > {
    const sb = this.supabaseService.getClient();
    const { data } = await sb
      .from('refresh_tokens')
      .select(
        'family_id, issued_at, last_used_at, user_agent, ip_address, revoked_at, used_at, expires_at',
      )
      .eq('user_id', userId)
      .is('revoked_at', null)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('last_used_at', { ascending: false });

    const sessions = data ?? [];

    return Promise.all(
      sessions.map(async (r) => {
        let location = null;
        if (r.ip_address) {
          location = await this.lookupIp(r.ip_address);
        }
        return {
          familyId: r.family_id,
          issuedAt: r.issued_at,
          lastUsedAt: r.last_used_at,
          userAgent: r.user_agent,
          ipAddress: r.ip_address,
          location,
        };
      }),
    );
  }

  private async loadUserClaims(userId: string): Promise<{
    id: string;
    email: string;
    globalRole: string;
    activeGroupId: string | null;
  } | null> {
    const sb = this.supabaseService.getClient();

    const [
      { data: user },
      { data: ban },
      { data: globalRoleRow },
      { data: firstGroup },
    ] = await Promise.all([
      sb.from('users').select('id, email').eq('id', userId).maybeSingle(),
      sb.from('banned_users').select('id').eq('user_id', userId).maybeSingle(),
      sb
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', userId)
        .is('tenant_id', null)
        .limit(1)
        .maybeSingle(),
      sb
        .from('user_roles')
        .select('tenant_id')
        .eq('user_id', userId)
        .not('tenant_id', 'is', null)
        .limit(1)
        .maybeSingle(),
    ]);

    if (!user || ban) return null;

    return {
      id: user.id as string,
      email: user.email as string,
      globalRole:
        ((globalRoleRow as any)?.roles?.name as string | undefined) ?? 'user',
      activeGroupId: (firstGroup?.tenant_id as string | null) ?? null,
    };
  }
}
