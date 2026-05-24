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

    const { error: err_i5fxl } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'profile:personalization:update',
      meta: { personalized },
    });
    if (err_i5fxl)
      throw new InternalServerErrorException('Error saving user activity.');

    return { ok: true, personalized: updatedUser.personalized };
  }

  async updatePreferences(userId: string, preferences: Record<string, any>) {
    const sb = this.supabaseService.getClient();

    const { data: user } = await sb
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle();

    if (!user) throw new NotFoundException('User not found');

    const defaultPreferences = {
      theme: 'system',
      language: 'de',
      personalized: 'true',
    };
    let currentPrefs: Record<string, any> = { ...defaultPreferences };

    if (user.preferences) {
      if (typeof user.preferences === 'string') {
        try {
          currentPrefs = {
            ...currentPrefs,
            ...(JSON.parse(user.preferences) as Record<string, any>),
          };
        } catch {}
      } else if (
        typeof user.preferences === 'object' &&
        !Array.isArray(user.preferences)
      ) {
        currentPrefs = {
          ...currentPrefs,
          ...(user.preferences as Record<string, any>),
        };
      }
    }

    const newPrefs = { ...preferences };
    Object.keys(newPrefs).forEach((key) => {
      if (newPrefs[key] === undefined) {
        delete newPrefs[key];
      }
    });

    const mergedPreferences = {
      ...currentPrefs,
      ...newPrefs,
    };

    const { data: updatedUser } = await sb
      .from('users')
      .update({ preferences: mergedPreferences as any })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (!updatedUser) throw new NotFoundException('User not found');

    const { error: err_n0ld2 } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'profile:preferences:update',
      meta: { preferences },
    });
    if (err_n0ld2)
      throw new InternalServerErrorException('Error saving user activity.');

    return { ok: true, preferences: updatedUser.preferences };
  }

  async updateSetup(
    userId: string,
    globalRole: string,
    courses: { subjectId: string; courseId: string }[],
  ) {
    const sb = this.supabaseService.getClient();

    const { data: updatedUser } = await sb
      .from('users')
      .update({
        done_setup: true,
      })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (!updatedUser) throw new NotFoundException('User not found.');

    const { error: delErr } = await sb
      .from('user_courses')
      .delete()
      .eq('user_id', userId);

    if (delErr) {
      console.error('Delete user_courses error', delErr);
    }

    if (courses && courses.length > 0) {
      const inserts = courses.map((c) => ({
        user_id: userId,
        subject_id: c.subjectId,
        course_id: c.courseId,
      }));
      const { error: insErr } = await sb.from('user_courses').insert(inserts);
      if (insErr) {
        console.error('Insert user_courses error', insErr);
        throw new InternalServerErrorException('Error saving courses.');
      }
    }

    const { error: err_2yf4u } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'profile:setup:complete',
      meta: { courses },
    });
    if (err_2yf4u)
      throw new InternalServerErrorException('Error saving user activity.');

    return {
      ok: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: globalRole,
        courses,
        doneSetup: updatedUser.done_setup,
      },
    };
  }

  async getChecks(userId: string) {
    const sb = this.supabaseService.getClient();
    const { data, error } = await sb
      .from('keep_checked')
      .select('item_id')
      .eq('user_id', userId);

    if (error) {
      throw new InternalServerErrorException('Error loading checked items.');
    }

    return { itemIds: (data || []).map((d) => d.item_id) };
  }

  async getPins(userId: string) {
    const sb = this.supabaseService.getClient();
    const { data, error } = await sb
      .from('pinned_items')
      .select('item_id')
      .eq('user_id', userId);

    if (error) {
      throw new InternalServerErrorException('Error loading pinned items.');
    }

    return { itemIds: (data || []).map((d) => d.item_id) };
  }

  async getVisibility(userId: string) {
    const sb = this.supabaseService.getClient();
    const { data, error } = await sb
      .from('user_item_visibility')
      .select('item_id, status')
      .eq('user_id', userId);

    if (error) {
      throw new InternalServerErrorException(
        'Error loading visibility status.',
      );
    }

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
    const { data: item, error: itemError } = await sb
      .from('items')
      .select('id')
      .eq('id', itemId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (itemError) {
      console.error('Check item existence error:', itemError);
      throw new InternalServerErrorException('Error verifying item.');
    }
    if (!item) throw new NotFoundException('Item not found.');

    const { error: deleteError } = await sb
      .from('user_item_visibility')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Manual upsert delete phase error:', deleteError);
    }

    const { error: insertError } = await sb
      .from('user_item_visibility')
      .insert({ item_id: itemId, user_id: userId, status });

    if (insertError) {
      console.error('Manual upsert insert phase error:', insertError);
      throw new InternalServerErrorException('Error saving visibility status.');
    }

    const { error: err_t7zxy } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'item:visibility:set',
      meta: { itemId, status },
    });
    if (err_t7zxy) {
      console.error('Activity set visibility error:', err_t7zxy);
      throw new InternalServerErrorException('Error saving user activity.');
    }

    return { ok: true };
  }

  async removeVisibility(itemId: string, userId: string) {
    const sb = this.supabaseService.getClient();

    const { error: deleteError } = await sb
      .from('user_item_visibility')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Delete visibility error:', deleteError);
      throw new InternalServerErrorException(
        'Error removing visibility status.',
      );
    }

    const { error: err_nkgjw } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'item:visibility:remove',
      meta: { itemId },
    });
    if (err_nkgjw) {
      console.error('Activity remove visibility error:', err_nkgjw);
      throw new InternalServerErrorException('Error saving user activity.');
    }
    return { ok: true };
  }

  async logPageLoad(userId: string, userAgent: string) {
    const sb = this.supabaseService.getClient();
    try {
      const { error: err_gnz6e } = await sb.from('user_activity').insert({
        user_id: userId,
        type: 'page:load',
        meta: {
          userAgent: userAgent.substring(0, 100) || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
      if (err_gnz6e) {
        console.error('Activity log page load error:', err_gnz6e);
        throw new InternalServerErrorException('Error saving user activity.');
      }
      return { ok: true };
    } catch (e) {
      console.error('Catch logPageLoad error:', e);
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
    if (!item) throw new NotFoundException('Not found.');

    const { error: err_pukxk_del } = await sb
      .from('keep_checked')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId);

    if (err_pukxk_del) {
      console.error('Delete checkItem phase error:', err_pukxk_del);
    }

    const { error: err_pukxk } = await sb.from('keep_checked').insert({
      item_id: itemId,
      user_id: userId,
      checked_at: new Date().toISOString(),
    });
    if (err_pukxk) {
      console.error('Insert checkItem error:', err_pukxk);
      throw new InternalServerErrorException(
        'An unexpected database error occurred.',
      );
    }

    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'item:check', meta: { itemId } });
    return { ok: true };
  }

  async uncheckItem(itemId: string, userId: string) {
    const sb = this.supabaseService.getClient();
    const { error: delErr } = await sb
      .from('keep_checked')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId);
    if (delErr) {
      console.error('Uncheck delete error:', delErr);
    }
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
    if (!item) throw new NotFoundException('Not found.');

    const { error: err_sj9mc_del } = await sb
      .from('pinned_items')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId);

    if (err_sj9mc_del) {
      console.error('Delete pinItem phase error:', err_sj9mc_del);
    }

    const { error: err_sj9mc } = await sb.from('pinned_items').insert({
      item_id: itemId,
      user_id: userId,
      pinned_at: new Date().toISOString(),
    });
    if (err_sj9mc) {
      console.error('Insert pinItem error:', err_sj9mc);
      throw new InternalServerErrorException(
        'An unexpected database error occurred.',
      );
    }

    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'item:pin', meta: { itemId } });
    return { ok: true };
  }

  async unpinItem(itemId: string, userId: string) {
    const sb = this.supabaseService.getClient();
    const { error: delErr } = await sb
      .from('pinned_items')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId);
    if (delErr) {
      console.error('Unpin delete error:', delErr);
    }
    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'item:unpin', meta: { itemId } });
    return { ok: true };
  }
}
