import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { generateUserName } from '../common/utils/name-generator.util';
import { withThumb, timeLeftColor } from '../common/utils/model.util';
import dayjs from 'dayjs';

@Injectable()
export class ItemsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async getItems(
    tenantId: string,
    userId: string,
    type: string,
    filter?: string,
  ) {
    const sb = this.supabaseService.getClient();
    const cutoff = dayjs().toISOString();

    const { data: visData } = await sb
      .from('user_item_visibility')
      .select('item_id, status')
      .eq('user_id', userId);
    const archived: string[] = [];
    const kept: string[] = [];
    (visData || []).forEach((row) => {
      if (row.status === 'archived') archived.push(row.item_id);
      if (row.status === 'kept') kept.push(row.item_id);
    });

    let q = sb
      .from('items')
      .select('*, creator:users!items_created_by_fkey(email)')
      .eq('tenant_id', tenantId);

    if (type && type !== 'all') {
      q = q.eq('type', type);
    }

    if (filter === 'old') {
      if (archived.length > 0) {
        q = q.or(`due_date.lt.${cutoff},id.in.(${archived.join(',')})`);
      } else {
        q = q.lt('due_date', cutoff);
      }
      if (kept.length > 0) q = q.not('id', 'in', `(${kept.join(',')})`);
      q = q.order('due_date', { ascending: false });
    } else {
      if (kept.length > 0) {
        q = q.or(`due_date.gte.${cutoff},id.in.(${kept.join(',')})`);
      } else {
        q = q.gte('due_date', cutoff);
      }
      if (archived.length > 0) q = q.not('id', 'in', `(${archived.join(',')})`);
      q = q.order('due_date', { ascending: true });
    }

    const { data: rows, error } = await q.limit(100);

    if (error) {
      console.error('Supabase getItems error:', error);
    }

    return (rows || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      subject: row.subject,
      description: row.description,
      images: (row.images || []).map((img: any) => withThumb(img)),
      dueDate: row.due_date,
      createdBy: row.created_by,
      createdByEmail: row.creator?.email || 'Unbekannt',
      createdByName: generateUserName(row.created_by, tenantId),
      timeColor: timeLeftColor(row.due_date),
      editorNote: row.editor_note || '',
    }));
  }

  async getItemById(tenantId: string, id: string) {
    const sb = this.supabaseService.getClient();
    const { data: row } = await sb
      .from('items')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!row) throw new NotFoundException('Eintrag nicht gefunden');

    const { data: creator } = await sb
      .from('users')
      .select('email')
      .eq('id', row.created_by)
      .maybeSingle();

    return {
      id: row.id,
      type: row.type,
      title: row.title,
      subject: row.subject,
      description: row.description,
      images: (row.images || []).map((img: any) => withThumb(img)),
      dueDate: row.due_date,
      createdBy: row.created_by,
      createdByEmail: creator?.email || 'Unbekannt',
      createdByName: generateUserName(row.created_by, tenantId),
      timeColor: timeLeftColor(row.due_date),
      editorNote: row.editor_note || '',
    };
  }

  async createItem(tenantId: string, userId: string, payload: any) {
    const rawImages = payload.images || [];
    for (const img of rawImages) {
      if (!img.publicId)
        throw new BadRequestException('Fehlendes publicId im Bild');
    }

    const images = rawImages.map((img: any) => ({
      publicId: img.publicId,
      createdBy: userId,
      metadata: img.metadata || {},
    }));

    const sb = this.supabaseService.getClient();
    const { data: item, error } = await sb
      .from('items')
      .insert({
        type: payload.type,
        title: payload.title.trim(),
        subject: payload.subject.trim(),
        description: (payload.description || '').trim(),
        images,
        due_date: payload.dueDate,
        created_by: userId,
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (error || !item)
      throw new InternalServerErrorException(
        'Fehler beim Erstellen des Eintrags',
      );

    const { error: err_j4g3x } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'item:create',
      meta: { id: item.id, type: item.type },
    });
    if (err_j4g3x) throw new InternalServerErrorException(err_j4g3x.message);

    return { ok: true, id: item.id };
  }

  async updateItem(tenantId: string, id: string, userId: string, payload: any) {
    const sb = this.supabaseService.getClient();
    const { data: item } = await sb
      .from('items')
      .select('id, created_by')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!item) throw new NotFoundException('Nicht gefunden');
    if (item.created_by !== userId)
      throw new ForbiddenException(
        'Nur der Ersteller kann diesen Eintrag bearbeiten.',
      );

    if (payload.dueDate) {
      const due = dayjs(payload.dueDate);
      if (due.isBefore(dayjs().subtract(2, 'day')))
        throw new BadRequestException(
          'Datum liegt zu weit in der Vergangenheit',
        );
      if (due.isAfter(dayjs().add(365, 'day')))
        throw new BadRequestException('Datum liegt zu weit in der Zukunft');
    }

    if (payload.images) {
      if (payload.images.length > 12)
        throw new BadRequestException('Max 12 Bilder');
      const userCount = payload.images.filter(
        (i: any) => i.createdBy === userId || !i.createdBy,
      ).length;
      if (userCount > 8) throw new BadRequestException('Max 8 eigene Bilder');
    }

    const update: any = {};
    if (payload.title !== undefined) update.title = payload.title;
    if (payload.subject !== undefined) update.subject = payload.subject;
    if (payload.description !== undefined)
      update.description = payload.description;
    if (payload.dueDate !== undefined) update.due_date = payload.dueDate;
    if (payload.images !== undefined) {
      for (const img of payload.images) {
        if (!img.publicId) throw new BadRequestException('Fehlendes publicId');
      }
      update.images = payload.images.map((img: any) => ({
        publicId: img.publicId,
        createdBy: img.createdBy || userId,
        metadata: img.metadata || {},
      }));
    }

    await sb
      .from('items')
      .update(update)
      .eq('id', item.id)
      .eq('tenant_id', tenantId);
    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'item:update', meta: { id: item.id } });

    return { ok: true };
  }

  async deleteItem(
    tenantId: string,
    id: string,
    userId: string,
    globalRole: string,
    tenantRole: string | undefined,
  ) {
    const sb = this.supabaseService.getClient();
    const { data: item } = await sb
      .from('items')
      .select('id, created_by, images')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!item) throw new NotFoundException('Nicht gefunden');

    const isSuperadmin = globalRole === 'superadmin';
    const isGroupAdmin = tenantRole === 'admin' || tenantRole === 'moderator';
    if (!isSuperadmin && !isGroupAdmin && item.created_by !== userId) {
      throw new ForbiddenException('Nicht autorisiert.');
    }

    if (item.images?.length > 0) {
      const pids = item.images.map((i: any) => i.publicId).filter(Boolean);
      if (pids.length > 0) {
        try {
          await cloudinary.api.delete_resources(pids);
        } catch (e) {
          console.error('Cloudinary error', e);
        }
      }
    }

    const { error: err_tzewj } = await sb
      .from('items')
      .delete()
      .eq('id', item.id)
      .eq('tenant_id', tenantId);
    if (err_tzewj) throw new InternalServerErrorException(err_tzewj.message);
    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'item:delete', meta: { id: item.id } });

    return { ok: true };
  }

  async updateItemNote(
    tenantId: string,
    id: string,
    userId: string,
    editorNote: string,
  ) {
    const sb = this.supabaseService.getClient();
    const { data: item } = await sb
      .from('items')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!item) throw new NotFoundException('Nicht gefunden');

    const noteContent = editorNote.trim();
    await sb
      .from('items')
      .update({ editor_note: noteContent })
      .eq('id', item.id)
      .eq('tenant_id', tenantId);
    const { error: err_o6pcp } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'item:note:update',
      meta: { itemId: item.id },
    });
    if (err_o6pcp) throw new InternalServerErrorException(err_o6pcp.message);

    return { ok: true, editorNote: noteContent };
  }

  async addImage(tenantId: string, id: string, userId: string, imgBody: any) {
    const sb = this.supabaseService.getClient();
    const { data: item } = await sb
      .from('items')
      .select('id, images')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!item) throw new NotFoundException('Nicht gefunden');

    const images = item.images || [];
    if (images.length >= 12) throw new BadRequestException('Max 12 Bilder');

    const userCount = images.filter((i: any) => i.createdBy === userId).length;
    if (userCount >= 8) throw new BadRequestException('Max 8 eigene Bilder');

    const newImage: any = {
      publicId: imgBody.publicId,
      createdBy: userId,
      metadata: imgBody.metadata || {},
    };
    images.push(newImage);

    await sb
      .from('items')
      .update({ images })
      .eq('id', item.id)
      .eq('tenant_id', tenantId);
    const { error: err_vgxbj } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'item:image:add',
      meta: { itemId: item.id },
    });
    if (err_vgxbj) throw new InternalServerErrorException(err_vgxbj.message);

    return { ok: true, image: withThumb(newImage) };
  }

  async deleteImage(
    tenantId: string,
    itemId: string,
    publicIdRaw: string,
    userId: string,
    globalRole: string,
    tenantRole: string | undefined,
  ) {
    const sb = this.supabaseService.getClient();
    const { data: item } = await sb
      .from('items')
      .select('id, images, created_by')
      .eq('id', itemId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!item) throw new NotFoundException('Nicht gefunden');

    let publicId: string;
    try {
      publicId = decodeURIComponent(publicIdRaw);
    } catch {
      publicId = publicIdRaw;
    }

    const images = item.images || [];
    const idx = images.findIndex((i: any) => i.publicId === publicId);

    if (idx === -1) throw new NotFoundException('Bild nicht gefunden');

    const image = images[idx];
    const isSuperadmin = globalRole === 'superadmin';
    const isGroupAdmin = tenantRole === 'admin' || tenantRole === 'moderator';
    const isImageOwner = image.createdBy === userId;
    const isItemOwner = item.created_by === userId;

    if (!isSuperadmin && !isGroupAdmin && !isImageOwner && !isItemOwner) {
      throw new ForbiddenException('Nicht autorisiert.');
    }

    try {
      await cloudinary.uploader.destroy(image.publicId);
    } catch (e) {
      console.error('Cloudinary error', e);
    }

    images.splice(idx, 1);
    await sb
      .from('items')
      .update({ images })
      .eq('id', item.id)
      .eq('tenant_id', tenantId);
    const { error: err_oj0tc } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'item:image:delete',
      meta: { itemId: item.id },
    });
    if (err_oj0tc) throw new InternalServerErrorException(err_oj0tc.message);

    return { ok: true };
  }

  async reportItem(userId: string, email: string, payload: any) {
    const { itemId, itemTitle, category, reason } = payload;

    if (category === 'falschinfo' && (!reason || !reason.trim())) {
      throw new BadRequestException('Bitte füge einen Grund hinzu.');
    }

    const sb = this.supabaseService.getClient();
    const { error: err_wypce } = await sb.from('reports').insert({
      item_id: itemId,
      item_title: itemTitle,
      category,
      reason: reason?.trim() || null,
      reporter_id: userId,
      reporter_email: email,
    });
    if (err_wypce) throw new InternalServerErrorException(err_wypce.message);

    const { error: err_at81w } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'item:report',
      meta: { itemId, category },
    });
    if (err_at81w) throw new InternalServerErrorException(err_at81w.message);

    return { ok: true, message: 'Eintrag erfolgreich gemeldet.' };
  }

  createUploadSignature() {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET')!;
    const folder =
      this.configService.get<string>('CLOUDINARY_FOLDER') || 'hausaufgaben';

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      apiSecret,
    );

    return {
      cloudName: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      apiKey: this.configService.get<string>('CLOUDINARY_API_KEY'),
      timestamp,
      signature,
      folder,
    };
  }
}
