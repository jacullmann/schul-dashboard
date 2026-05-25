import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { generateUserName } from '../common/utils/name-generator.util';
import { checkRolePermission } from '../common/utils/permission.util';
import { CreateMessageDto } from './dto/create-message.dto';

export interface GroupMessageResponse {
  id: string;
  tenantId: string;
  userId: string;
  senderName: string;
  content: string;
  parentId: string | null;
  parentContent?: string;
  parentSenderName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetMessagesResponse {
  messages: GroupMessageResponse[];
  lastVisitAt: string | null;
}

@Injectable()
export class MessagesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getMessages(
    tenantId: string,
    userId: string,
  ): Promise<GetMessagesResponse> {
    const sb = this.supabaseService.getClient();

    // 1. Fetch user's previous last_messages_visit_at
    const { data: userState } = await sb
      .from('user_tenant_state')
      .select('last_messages_visit_at')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const lastVisitAt = userState?.last_messages_visit_at || null;

    // 2. Fetch messages first to avoid race condition
    const { data: messages, error } = await sb
      .from('group_messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new InternalServerErrorException(
        'Fehler beim Laden der Nachrichten',
      );
    }

    // 3. Upsert user's last_messages_visit_at to now after messages are fetched
    await sb
      .from('user_tenant_state')
      .upsert(
        {
          user_id: userId,
          tenant_id: tenantId,
          last_messages_visit_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,tenant_id' },
      );

    if (!messages || messages.length === 0) {
      return { messages: [], lastVisitAt };
    }

    const chronologicalMessages = [...messages].reverse();

    const parentIds = [
      ...new Set(
        chronologicalMessages
          .map((m) => m.parent_id)
          .filter((id): id is string => !!id),
      ),
    ];

    const parentMap = new Map<
      string,
      { content: string; senderName: string }
    >();

    if (parentIds.length > 0) {
      const { data: parents } = await sb
        .from('group_messages')
        .select('*')
        .in('id', parentIds);

      if (parents) {
        for (const p of parents) {
          parentMap.set(p.id, {
            content: p.content,
            senderName: generateUserName(p.user_id, p.tenant_id),
          });
        }
      }
    }

    const formattedMessages = chronologicalMessages.map((m) => {
      const response: GroupMessageResponse = {
        id: m.id,
        tenantId: m.tenant_id,
        userId: m.user_id,
        senderName: generateUserName(m.user_id, m.tenant_id),
        content: m.content,
        parentId: m.parent_id,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      };

      if (m.parent_id && parentMap.has(m.parent_id)) {
        const parent = parentMap.get(m.parent_id)!;
        response.parentContent = parent.content;
        response.parentSenderName = parent.senderName;
      }

      return response;
    });

    return {
      messages: formattedMessages,
      lastVisitAt,
    };
  }

  async markRead(tenantId: string, userId: string): Promise<void> {
    const sb = this.supabaseService.getClient();
    await sb
      .from('user_tenant_state')
      .upsert(
        {
          user_id: userId,
          tenant_id: tenantId,
          last_messages_visit_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,tenant_id' },
      );
  }

  async createMessage(
    tenantId: string,
    userId: string,
    tenantRole: string | undefined,
    globalRole: string,
    payload: CreateMessageDto,
  ): Promise<GroupMessageResponse> {
    const sb = this.supabaseService.getClient();

    const { data: group } = await sb
      .from('groups')
      .select('permissions, owner_id')
      .eq('id', tenantId)
      .maybeSingle();

    if (!group) {
      throw new NotFoundException('Gruppe nicht gefunden');
    }

    if (globalRole !== 'superadmin' && group.owner_id !== userId) {
      const allowedRole = group.permissions?.send_messages || 'user';
      const isAllowed = checkRolePermission(tenantRole || 'user', allowedRole);
      if (!isAllowed) {
        throw new ForbiddenException(
          'Du hast keine Berechtigung, in dieser Gruppe Nachrichten zu senden.',
        );
      }
    }

    const { data: message, error } = await sb
      .from('group_messages')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        content: payload.content.trim(),
        parent_id: payload.parentId || null,
      })
      .select()
      .single();

    if (error || !message) {
      throw new InternalServerErrorException(
        'Nachricht konnte nicht gesendet werden',
      );
    }

    const response: GroupMessageResponse = {
      id: message.id,
      tenantId: message.tenant_id,
      userId: message.user_id,
      senderName: generateUserName(message.user_id, message.tenant_id),
      content: message.content,
      parentId: message.parent_id,
      createdAt: message.created_at,
      updatedAt: message.updated_at,
    };

    if (message.parent_id) {
      const { data: parent } = await sb
        .from('group_messages')
        .select('*')
        .eq('id', message.parent_id)
        .maybeSingle();

      if (parent) {
        response.parentContent = parent.content;
        response.parentSenderName = generateUserName(
          parent.user_id,
          parent.tenant_id,
        );
      }
    }

    return response;
  }

  async deleteMessage(
    tenantId: string,
    userId: string,
    tenantRole: string | undefined,
    globalRole: string,
    messageId: string,
  ): Promise<void> {
    const sb = this.supabaseService.getClient();

    const { data: message, error: fetchError } = await sb
      .from('group_messages')
      .select('*')
      .eq('id', messageId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (fetchError || !message) {
      throw new NotFoundException('Nachricht nicht gefunden');
    }

    const isOwner = message.user_id === userId;
    const isSuperAdmin = globalRole === 'superadmin';

    if (!isOwner && !isSuperAdmin) {
      const { data: group } = await sb
        .from('groups')
        .select('permissions, owner_id')
        .eq('id', tenantId)
        .maybeSingle();

      if (!group) throw new NotFoundException('Gruppe nicht gefunden');

      if (group.owner_id !== userId) {
        const allowedRole = group.permissions?.delete_other_content || 'moderator';
        const isAllowed = checkRolePermission(tenantRole || 'user', allowedRole);
        if (!isAllowed) {
          throw new ForbiddenException(
            'Keine Berechtigung zum Löschen der Nachricht eines anderen Nutzers',
          );
        }
      }
    }

    const { error: updateError } = await sb
      .from('group_messages')
      .update({ parent_id: null })
      .eq('parent_id', messageId);

    if (updateError) {
      throw new InternalServerErrorException(
        'Fehler beim Entfernen der Referenzen',
      );
    }

    const { error: deleteError } = await sb
      .from('group_messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) {
      throw new InternalServerErrorException(
        'Fehler beim Löschen der Nachricht',
      );
    }
  }
}
