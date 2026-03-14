import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class UserService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async updatePersonalization(userId: string, personalized: boolean) {
    const sb = this.supabaseService.getClient();
    const { data: updatedUser } = await sb
      .from('users')
      .update({ personalized })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (!updatedUser) throw new NotFoundException('User not found');

    await sb.from('user_activity').insert({
      user_id: userId,
      type: 'profile:personalization:update',
      meta: { personalized },
    });

    return { ok: true, personalized: updatedUser.personalized };
  }

  async updatePreferences(userId: string, preferences: Record<string, any>) {
    const sb = this.supabaseService.getClient();

    // Fetch the existing user preferences
    const { data: user } = await sb
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle();

    if (!user) throw new NotFoundException('User not found');

    // Merge incoming preferences with existing preferences
    const mergedPreferences = {
      ...(user.preferences || {}),
      ...preferences,
    };

    const { data: updatedUser } = await sb
      .from('users')
      .update({ preferences: mergedPreferences })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (!updatedUser) throw new NotFoundException('User not found');

    await sb.from('user_activity').insert({
      user_id: userId,
      type: 'profile:preferences:update',
      meta: { preferences },
    });

    return { ok: true, preferences: updatedUser.preferences };
  }

  async updateSetup(
    userId: string,
    globalRole: string,
    enrKurs?: string,
    wpuKurs1?: string,
    wpuKurs2?: string,
    theater: number = 0,
  ) {
    const sb = this.supabaseService.getClient();
    const isDone = Boolean(enrKurs && wpuKurs1 && wpuKurs2 && theater > 0);

    const { data: updatedUser } = await sb
      .from('users')
      .update({
        enr_kurs: enrKurs || null,
        wpu_kurs_1: wpuKurs1 || null,
        wpu_kurs_2: wpuKurs2 || null,
        theater,
        done_setup: isDone,
      })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (!updatedUser) throw new NotFoundException('Nutzer nicht gefunden');

    await sb.from('user_activity').insert({
      user_id: userId,
      type: 'profile:setup:complete',
      meta: { enrKurs, wpuKurs1, wpuKurs2, theater },
    });

    return {
      ok: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: globalRole,
        enrKurs: updatedUser.enr_kurs,
        wpuKurs1: updatedUser.wpu_kurs_1,
        wpuKurs2: updatedUser.wpu_kurs_2,
        theater: updatedUser.theater,
        doneSetup: updatedUser.done_setup,
      },
    };
  }

  async getChecks(userId: string) {
    const sb = this.supabaseService.getClient();
    const { data } = await sb
      .from('keep_checked')
      .select('item_id')
      .eq('user_id', userId);
    return { itemIds: (data || []).map((d) => d.item_id) };
  }

  async getPins(userId: string) {
    const sb = this.supabaseService.getClient();
    const { data } = await sb
      .from('pinned_items')
      .select('item_id')
      .eq('user_id', userId);
    return { itemIds: (data || []).map((d) => d.item_id) };
  }

  async getVisibility(userId: string) {
    const sb = this.supabaseService.getClient();
    const { data } = await sb
      .from('user_item_visibility')
      .select('item_id, status')
      .eq('user_id', userId);
    const archived = [] as string[];
    const kept = [] as string[];
    (data || []).forEach((row) => {
      if (row.status === 'archived') archived.push(row.item_id);
      if (row.status === 'kept') kept.push(row.item_id);
    });
    return { archived, kept };
  }

  async setVisibility(
    tenantId: string,
    itemId: string,
    userId: string,
    status: string,
  ) {
    const sb = this.supabaseService.getClient();
    const { data: item } = await sb
      .from('items')
      .select('id')
      .eq('id', itemId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!item) throw new NotFoundException('Nicht gefunden');

    await sb
      .from('user_item_visibility')
      .upsert(
        { item_id: itemId, user_id: userId, status },
        { onConflict: 'item_id,user_id' },
      )
      .select();

    await sb.from('user_activity').insert({
      user_id: userId,
      type: 'item:visibility:set',
      meta: { itemId, status },
    });

    return { ok: true };
  }

  async removeVisibility(itemId: string, userId: string) {
    const sb = this.supabaseService.getClient();
    await sb
      .from('user_item_visibility')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId);
    await sb.from('user_activity').insert({
      user_id: userId,
      type: 'item:visibility:remove',
      meta: { itemId },
    });
    return { ok: true };
  }

  async logPageLoad(userId: string, userAgent: string) {
    const sb = this.supabaseService.getClient();
    try {
      await sb.from('user_activity').insert({
        user_id: userId,
        type: 'page:load',
        meta: {
          userAgent: userAgent.substring(0, 100) || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  async checkItem(tenantId: string, itemId: string, userId: string) {
    const sb = this.supabaseService.getClient();
    const { data: item } = await sb
      .from('items')
      .select('id')
      .eq('id', itemId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!item) throw new NotFoundException('Nicht gefunden');

    await sb.from('keep_checked').upsert(
      {
        item_id: itemId,
        user_id: userId,
        checked_at: new Date().toISOString(),
      },
      { onConflict: 'item_id,user_id' },
    );

    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'item:check', meta: { itemId } });
    return { ok: true };
  }

  async uncheckItem(itemId: string, userId: string) {
    const sb = this.supabaseService.getClient();
    await sb
      .from('keep_checked')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId);
    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'item:uncheck', meta: { itemId } });
    return { ok: true };
  }

  async pinItem(tenantId: string, itemId: string, userId: string) {
    const sb = this.supabaseService.getClient();
    const { data: item } = await sb
      .from('items')
      .select('id')
      .eq('id', itemId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!item) throw new NotFoundException('Nicht gefunden');

    await sb.from('pinned_items').upsert(
      {
        item_id: itemId,
        user_id: userId,
        pinned_at: new Date().toISOString(),
      },
      { onConflict: 'item_id,user_id' },
    );

    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'item:pin', meta: { itemId } });
    return { ok: true };
  }

  async unpinItem(itemId: string, userId: string) {
    const sb = this.supabaseService.getClient();
    await sb
      .from('pinned_items')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId);
    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'item:unpin', meta: { itemId } });
    return { ok: true };
  }
}
