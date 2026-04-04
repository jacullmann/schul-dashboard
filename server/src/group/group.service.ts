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
import { JwtService } from '../common/jwt/jwt.service';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { COOKIE_NAME } from '../common/guards/jwt-auth.guard';
import { rotateCsrfToken } from '../common/middleware/csrf.middleware';
import { generateUserName } from '../common/utils/name-generator.util';

const DUMMY_HASH = bcrypt.hashSync('__dummy__', 10);

/** Epoch used as "never visited" sentinel for user_tenant_state rows that don't exist yet. */
const EPOCH_ISO = '1970-01-01T00:00:00.000Z';

@Injectable()
export class GroupService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly appConfig: AppConfig,
    private readonly jwtService: JwtService,
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
    const token = this.jwtService.signUserToken(payload, {
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

    if (group) {
      const { data: ban } = await sb
        .from('group_bans')
        .select('id')
        .eq('tenant_id', group.id)
        .eq('user_id', userId)
        .limit(1);

      if (ban && ban.length > 0) {
        throw new ForbiddenException('You have been banned from this group.');
      }
    }

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

      // Determine unread status per-user:
      //   Announcements — unread if not present in user_announcement_read_status.
      //   Schedule subs — unread if created after the user's last schedule visit
      //                    (tracked in user_tenant_state.last_schedule_visit_at).
      if (groups.length > 0) {
        const tenantIds = groups.map((g) => g.id);

        // Phase 1: parallel fetch (all announcements, all subs, user visit state)
        const [
          { data: allAnnouncements },
          { data: allSubs },
          { data: userStates },
        ] = await Promise.all([
          sb
            .from('announcements')
            .select('id, tenant_id')
            .in('tenant_id', tenantIds),
          sb
            .from('schedule_subs')
            .select('tenant_id, created_at')
            .in('tenant_id', tenantIds),
          sb
            .from('user_tenant_state')
            .select('tenant_id, last_schedule_visit_at')
            .eq('user_id', userId)
            .in('tenant_id', tenantIds),
        ]);

        // Phase 2: fetch which announcements this user has already read
        const announcementIds = (allAnnouncements || []).map(
          (a: any) => a.id as string,
        );
        let readIds = new Set<string>();
        if (announcementIds.length > 0) {
          const { data: readRows } = await sb
            .from('user_announcement_read_status')
            .select('announcement_id')
            .eq('user_id', userId)
            .in('announcement_id', announcementIds);
          readIds = new Set(
            (readRows || []).map((r: any) => r.announcement_id as string),
          );
        }

        // Build per-group last-schedule-visit lookup
        const lastVisitMap = new Map<string, string>(
          (userStates || []).map((s: any) => [
            s.tenant_id as string,
            (s.last_schedule_visit_at as string) ?? EPOCH_ISO,
          ]),
        );

        for (const g of groups) {
          const hasUnreadAnn = (allAnnouncements || []).some(
            (a: any) => a.tenant_id === g.id && !readIds.has(a.id as string),
          );
          const lastVisit = lastVisitMap.get(g.id) ?? EPOCH_ISO;
          const hasNewSubs = (allSubs || []).some(
            (s: any) =>
              s.tenant_id === g.id && (s.created_at as string) > lastVisit,
          );
          g.hasUnreadContent = hasUnreadAnn || hasNewSubs;
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
    // Rotate (not clear) the CSRF token so the browser immediately has a valid
    // token for the next request (e.g. the login form POST after logout).
    // Clearing the cookie would leave a gap until ensureCsrf() re-initialises it.
    rotateCsrfToken(res, this.appConfig);
    return { ok: true };
  }
}
