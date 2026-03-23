import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { AppConfig } from '../config/env.config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Response } from 'express';
import { COOKIE_NAME } from '../common/guards/jwt-auth.guard';
import {
  rotateCsrfToken,
  clearCsrfCookie,
} from '../common/middleware/csrf.middleware';
import { generateUserName } from '../common/utils/name-generator.util';

const DUMMY_HASH = bcrypt.hashSync('__dummy__', 10);

/** How recent "unread" content must be (3 days). */
const UNREAD_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

@Injectable()
export class GroupService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly appConfig: AppConfig,
  ) {}

  private setAuthToken(
    res: Response,
    userId: string,
    email: string,
    globalRole: string,
    activeGroupId: string | null,
  ) {
    const payload = {
      sub: userId,
      email,
      gRole: globalRole || 'user',
      gId: activeGroupId || null,
    };
    const token = jwt.sign(payload, this.appConfig.jwtSecret, {
      expiresIn: '7d',
    });
    res.cookie(COOKIE_NAME, token, {
      ...this.appConfig.baseCookieOptions,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearAuthToken(res: Response) {
    res.clearCookie(COOKIE_NAME, {
      ...this.appConfig.baseCookieOptions,
      httpOnly: true,
    });
  }

  async joinGroup(
    userId: string,
    email: string,
    globalRole: string,
    groupName: string,
    password: string,
    res: Response,
    ip: string,
    ua: string,
  ) {
    const sb = this.supabaseService.getClient();
    const { data: group } = await sb
      .from('groups')
      .select('id, name, passcode_hash')
      .eq('name', groupName)
      .maybeSingle();

    const hashToCompare = group?.passcode_hash || DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);
    const isAuthenticated = group && isValid;

    const { error: secEventErr } = await sb.from('security_events').insert({
      event_type: 'group_join',
      event_status: isAuthenticated ? 'success' : 'failure',
      ip_address: ip,
      user_agent: ua,
      metadata: { groupName, groupId: group?.id || null, userId },
    });
    if (secEventErr) {
      throw new InternalServerErrorException(
        'An unexpected database error occurred.',
      );
    }

    if (!isAuthenticated)
      throw new UnauthorizedException('Invalid group name or password.');

    const { data: existingRoles } = await sb
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role_id', 4)
      .eq('tenant_id', group.id)
      .limit(1);

    if (!existingRoles?.[0]) {
      const { error: roleErr } = await sb
        .from('user_roles')
        .insert({ user_id: userId, role_id: 4, tenant_id: group.id });
      if (roleErr)
        throw new InternalServerErrorException('Failed to join group.');
    }

    this.setAuthToken(res, userId, email, globalRole, group.id);
    const newCsrfToken = rotateCsrfToken(res, this.appConfig);

    return { ok: true, csrfToken: newCsrfToken };
  }

  async createGroup(
    userId: string,
    email: string,
    globalRole: string,
    groupName: string,
    password: string,
    res: Response,
    ip: string,
    ua: string,
  ) {
    const sb = this.supabaseService.getClient();
    const { data: existingGroup } = await sb
      .from('groups')
      .select('id')
      .eq('name', groupName)
      .maybeSingle();

    if (existingGroup) {
      await sb.from('security_events').insert({
        event_type: 'group_create',
        event_status: 'failure',
        ip_address: ip,
        user_agent: ua,
        metadata: { groupName },
      });
      throw new ConflictException('This group name is already taken.');
    }

    const passcodeHash = await bcrypt.hash(password, 12);
    const { data: newGroup, error: createGroupErr } = await sb
      .from('groups')
      .insert({
        name: groupName,
        passcode_hash: passcodeHash,
        owner_id: userId,
      })
      .select('id, name')
      .single();

    if (createGroupErr || !newGroup?.id) {
      throw new InternalServerErrorException('Failed to create group.');
    }

    const { error: insertErr } = await sb
      .from('user_roles')
      .insert({ user_id: userId, role_id: 2, tenant_id: newGroup.id });
    if (insertErr) {
      throw new InternalServerErrorException('Failed to assign admin role.');
    }

    await sb.from('security_events').insert({
      event_type: 'group_create',
      event_status: 'success',
      ip_address: ip,
      user_agent: ua,
      metadata: {
        groupName: newGroup.name,
        groupId: newGroup.id,
        createdBy: userId,
      },
    });

    this.setAuthToken(res, userId, email, globalRole, newGroup.id);
    const newCsrfToken = rotateCsrfToken(res, this.appConfig);

    return { ok: true, csrfToken: newCsrfToken };
  }

  async getStatus(
    userId: string | undefined,
    activeGroupId: string | null,
    globalRole?: string,
  ) {
    if (!userId) return { authenticated: false, groups: [] };

    const sb = this.supabaseService.getClient();
    try {
      const { data: userRoles } = await sb
        .from('user_roles')
        .select('tenant_id, groups(id, name, owner_id), roles(name)')
        .eq('user_id', userId)
        .not('tenant_id', 'is', null);

      const groups = (userRoles || [])
        .filter((ur: any) => ur.groups?.id)
        .map((ur: any) => ({
          id: ur.groups.id as string,
          name: ur.groups.name as string,
          ownerId: ur.groups.owner_id as string,
          role: ur.roles?.name as string,
          generatedName: generateUserName(userId, ur.groups.id),
          hasUnreadContent: false,
        }));

      // Determine unread status via direct queries (no RPC).
      // A group is considered to have unread content when there are new
      // announcements or timetable substitutions within the last 3 days.
      if (groups.length > 0) {
        const thresholdDate = new Date(
          Date.now() - UNREAD_THRESHOLD_MS,
        ).toISOString();
        const tenantIds = groups.map((g) => g.id);

        const [{ data: recentAnnouncements }, { data: recentSubs }] =
          await Promise.all([
            sb
              .from('announcements')
              .select('tenant_id')
              .in('tenant_id', tenantIds)
              .gte('created_at', thresholdDate),
            sb
              .from('timetable_subs')
              .select('tenant_id')
              .in('tenant_id', tenantIds)
              .gte('created_at', thresholdDate),
          ]);

        const tenantIdsWithUnread = new Set<string>([
          ...(recentAnnouncements || []).map((r: any) => r.tenant_id as string),
          ...(recentSubs || []).map((r: any) => r.tenant_id as string),
        ]);

        for (const g of groups) {
          g.hasUnreadContent = tenantIdsWithUnread.has(g.id);
        }
      }

      let activeGroup: (typeof groups)[number] | null =
        groups.find((g) => g.id === activeGroupId) ?? null;

      // Super-admins can be active in groups they are not a member of.
      if (!activeGroup && activeGroupId && globalRole === 'superadmin') {
        const { data: adminGroup } = await sb
          .from('groups')
          .select('id, name, owner_id')
          .eq('id', activeGroupId)
          .maybeSingle();

        if (adminGroup) {
          activeGroup = {
            id: adminGroup.id as string,
            name: adminGroup.name as string,
            ownerId: adminGroup.owner_id as string,
            role: 'superadmin',
            generatedName: generateUserName(userId, adminGroup.id as string),
            hasUnreadContent: false,
          };
        }
      }

      return {
        authenticated: true,
        group: activeGroup
          ? {
              id: activeGroup.id,
              name: activeGroup.name,
              ownerId: activeGroup.ownerId,
            }
          : null,
        groups,
      };
    } catch {
      return { authenticated: false, groups: [] };
    }
  }

  async switchGroup(
    userId: string,
    email: string,
    globalRole: string,
    groupId: string,
    res: Response,
  ) {
    const sb = this.supabaseService.getClient();

    if (globalRole === 'superadmin') {
      const { data: group } = await sb
        .from('groups')
        .select('id, name')
        .eq('id', groupId)
        .maybeSingle();

      if (!group) throw new NotFoundException('Group not found.');

      this.setAuthToken(res, userId, email, globalRole, group.id);
      const newCsrfToken = rotateCsrfToken(res, this.appConfig);
      return { ok: true, csrfToken: newCsrfToken };
    }

    const { data: memberships } = await sb
      .from('user_roles')
      .select('tenant_id, groups(id, name, owner_id)')
      .eq('user_id', userId)
      .eq('tenant_id', groupId)
      .limit(1);

    const membership = memberships?.[0];

    if (!(membership as any)?.groups) {
      throw new ForbiddenException('You do not have access to this group.');
    }

    this.setAuthToken(
      res,
      userId,
      email,
      globalRole,
      (membership as any).groups.id,
    );
    const newCsrfToken = rotateCsrfToken(res, this.appConfig);

    return { ok: true, csrfToken: newCsrfToken };
  }

  async logout(res: Response, ip: string, ua: string) {
    const sb = this.supabaseService.getClient();
    const { error: secEventErr } = await sb.from('security_events').insert({
      event_type: 'group_logout',
      event_status: 'success',
      ip_address: ip,
      user_agent: ua,
      metadata: {},
    });
    if (secEventErr) {
      throw new InternalServerErrorException(
        'An unexpected database error occurred.',
      );
    }

    this.clearAuthToken(res);
    clearCsrfCookie(res, this.appConfig);
    return { ok: true };
  }
}
