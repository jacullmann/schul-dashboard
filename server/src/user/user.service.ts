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
      throw new InternalServerErrorException(
        'Fehler beim Speichern der Benutzeraktivität',
      );

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

    // Parse existing preferences safely, accounting for stringified JSON or objects
    // Fall back to schema defaults if the user has a null/empty preferences column
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
        } catch {
          // Ignore invalid JSON in existing preferences
        }
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

    // Clean incoming preferences to remove undefined keys
    const newPrefs = { ...preferences };
    Object.keys(newPrefs).forEach((key) => {
      if (newPrefs[key] === undefined) {
        delete newPrefs[key];
      }
    });

    // Merge incoming preferences with existing preferences
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
      throw new InternalServerErrorException(
        'Fehler beim Speichern der Benutzeraktivität',
      );

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

    const { error: err_2yf4u } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'profile:setup:complete',
      meta: { enrKurs, wpuKurs1, wpuKurs2, theater },
    });
    if (err_2yf4u)
      throw new InternalServerErrorException(
        'Fehler beim Speichern der Benutzeraktivität',
      );

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
    const { data, error } = await sb
      .from('keep_checked')
      .select('item_id')
      .eq('user_id', userId);

    if (error) {
      throw new InternalServerErrorException(
        'Fehler beim Laden der abgehakten Einträge',
      );
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
      throw new InternalServerErrorException(
        'Fehler beim Laden der fixierten Einträge',
      );
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
        'Fehler beim Laden des Sichtbarkeitsstatus',
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
      throw new InternalServerErrorException(
        'Fehler beim Überprüfen des Eintrags',
      );
    }
    if (!item) throw new NotFoundException('Eintrag nicht gefunden');

    const { error: upsertError } = await sb
      .from('user_item_visibility')
      .upsert(
        { item_id: itemId, user_id: userId, status },
        { onConflict: 'item_id,user_id' },
      );

    if (upsertError) {
      throw new InternalServerErrorException(
        'Fehler beim Speichern des Sichtbarkeitsstatus',
      );
    }

    const { error: err_t7zxy } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'item:visibility:set',
      meta: { itemId, status },
    });
    if (err_t7zxy)
      throw new InternalServerErrorException(
        'Fehler beim Speichern der Benutzeraktivität',
      );

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
      throw new InternalServerErrorException(
        'Fehler beim Entfernen des Sichtbarkeitsstatus',
      );
    }

    const { error: err_nkgjw } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'item:visibility:remove',
      meta: { itemId },
    });
    if (err_nkgjw)
      throw new InternalServerErrorException(
        'Fehler beim Speichern der Benutzeraktivität',
      );
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
      if (err_gnz6e)
        throw new InternalServerErrorException(
          'Fehler beim Speichern der Benutzeraktivität',
        );
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

    const { error: err_pukxk } = await sb.from('keep_checked').upsert(
      {
        item_id: itemId,
        user_id: userId,
        checked_at: new Date().toISOString(),
      },
      { onConflict: 'item_id,user_id' },
    );
    if (err_pukxk)
      throw new InternalServerErrorException(
        'Ein unerwarteter Datenbankfehler ist aufgetreten',
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

    const { error: err_sj9mc } = await sb.from('pinned_items').upsert(
      {
        item_id: itemId,
        user_id: userId,
        pinned_at: new Date().toISOString(),
      },
      { onConflict: 'item_id,user_id' },
    );
    if (err_sj9mc)
      throw new InternalServerErrorException(
        'Ein unerwarteter Datenbankfehler ist aufgetreten',
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
