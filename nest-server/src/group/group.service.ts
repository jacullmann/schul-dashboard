import { Injectable, UnauthorizedException, ForbiddenException, ConflictException, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { COOKIE_NAME } from '../common/guards/jwt-auth.guard';
import { rotateCsrfToken, clearCsrfCookie } from '../common/middleware/csrf.middleware';
import { generateUserName } from '../common/utils/name-generator.util';

const DUMMY_HASH = bcrypt.hashSync('__dummy__', 10);

@Injectable()
export class GroupService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  private setAuthToken(res: Response, userId: string, email: string, globalRole: string, activeGroupId: string | null) {
    const secret = this.configService.get<string>('USER_JWT_SECRET')!;
    const payload = { sub: userId, email, gRole: globalRole || 'user', gId: activeGroupId || null };
    const token = jwt.sign(payload, secret, { expiresIn: '7d' });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearAuthToken(res: Response) {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: true, path: '/', sameSite: 'none' });
  }

  async joinGroup(userId: string, email: string, globalRole: string, groupName: string, password: string, res: Response, ip: string, ua: string) {
    const sb = this.supabaseService.getClient();
    const { data: group } = await sb.from('groups').select('id, name, passcode_hash').eq('name', groupName).maybeSingle();

    const hashToCompare = group?.passcode_hash || DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);
    const isAuthenticated = group && isValid;

    await sb.from('security_events').insert({
      event_type: 'group_join',
      event_status: isAuthenticated ? 'success' : 'failure',
      ip_address: ip,
      user_agent: ua,
      user_id: userId,
      metadata: { groupName, groupId: group?.id || null, userId }
    });

    if (!isAuthenticated) throw new UnauthorizedException('Authentifizierung fehlgeschlagen');

    const { data: existingRole } = await sb
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role_id', 4) // 'user' role
      .eq('tenant_id', group.id)
      .maybeSingle();

    if (!existingRole) {
      const { error } = await sb.from('user_roles').insert({ user_id: userId, role_id: 4, tenant_id: group.id });
      if (error) throw new InternalServerErrorException('Fehler beim Beitritt zur Gruppe.');
    }

    this.setAuthToken(res, userId, email, globalRole, group.id);
    const newCsrfToken = rotateCsrfToken(res);

    return { ok: true, csrfToken: newCsrfToken };
  }

  async createGroup(userId: string, email: string, globalRole: string, groupName: string, password: string, res: Response, ip: string, ua: string) {
    const sb = this.supabaseService.getClient();
    const { data: existingGroup } = await sb.from('groups').select('id').eq('name', groupName).maybeSingle();
    
    if (existingGroup) {
      await sb.from('security_events').insert({
        event_type: 'group_create', event_status: 'failure', ip_address: ip, user_agent: ua, user_id: userId, metadata: { groupName }
      });
      throw new ConflictException('Dieser Gruppenname ist bereits vergeben.');
    }

    const passcodeHash = await bcrypt.hash(password, 12);
    const { data: newGroup, error: createGroupErr } = await sb
      .from('groups')
      .insert({ name: groupName, passcode_hash: passcodeHash })
      .select('id, name')
      .single();

    if (createGroupErr || !newGroup?.id) {
      throw new InternalServerErrorException('Gruppe konnte nicht erstellt werden.');
    }

    const { error: insertErr } = await sb.from('user_roles').insert({ user_id: userId, role_id: 2, tenant_id: newGroup.id });
    if (insertErr) {
      throw new InternalServerErrorException('Fehler bei der Zuweisung der Administratorrechte.');
    }

    await sb.from('security_events').insert({
      event_type: 'group_create',
      event_status: 'success',
      ip_address: ip,
      user_agent: ua,
      user_id: userId,
      metadata: { groupName: newGroup.name, groupId: newGroup.id, createdBy: userId }
    });

    this.setAuthToken(res, userId, email, globalRole, newGroup.id);
    const newCsrfToken = rotateCsrfToken(res);

    return { ok: true, csrfToken: newCsrfToken };
  }

  async getStatus(userId: string | undefined, activeGroupId: string | null) {
    if (!userId) return { authenticated: false, groups: [] };

    const sb = this.supabaseService.getClient();
    try {
      const { data: userRoles } = await sb
        .from('user_roles')
        .select('tenant_id, groups(id, name), roles(name)')
        .eq('user_id', userId)
        .not('tenant_id', 'is', null);

      const groups = (userRoles || [])
        .filter((ur: any) => ur.groups?.id)
        .map((ur: any) => ({
          id: ur.groups.id,
          name: ur.groups.name,
          role: ur.roles?.name,
          generatedName: generateUserName(userId, ur.groups.id),
        }));

      const activeGroup = groups.find((g) => g.id === activeGroupId);

      return {
        authenticated: true,
        group: activeGroup ? { id: activeGroup.id, name: activeGroup.name } : null,
        groups,
      };
    } catch {
      return { authenticated: false, groups: [] };
    }
  }

  async switchGroup(userId: string, email: string, globalRole: string, groupId: string, res: Response) {
    const sb = this.supabaseService.getClient();
    const { data: membership } = await sb
      .from('user_roles')
      .select('tenant_id, groups(id, name)')
      .eq('user_id', userId)
      .eq('tenant_id', groupId)
      .maybeSingle();

    if (!(membership as any)?.groups) {
      throw new ForbiddenException('Zugriff auf diese Gruppe nicht erlaubt.');
    }

    this.setAuthToken(res, userId, email, globalRole, (membership as any).groups.id);
    const newCsrfToken = rotateCsrfToken(res);

    return { ok: true, csrfToken: newCsrfToken };
  }

  async logout(res: Response, ip: string, ua: string) {
    const sb = this.supabaseService.getClient();
    await sb.from('security_events').insert({
      event_type: 'group_logout',
      event_status: 'success',
      ip_address: ip,
      user_agent: ua,
      metadata: {}
    });

    this.clearAuthToken(res);
    clearCsrfCookie(res);
    return { ok: true };
  }
}
