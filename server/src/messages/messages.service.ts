import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { generateUserName } from '../common/utils/name-generator.util';
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

@Injectable()
export class MessagesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getMessages(tenantId: string): Promise<GroupMessageResponse[]> {
    const sb = this.supabaseService.getClient();

    const { data: messages, error } = await sb
      .from('group_messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new InternalServerErrorException('Fehler beim Laden der Nachrichten');
    }

    if (!messages || messages.length === 0) {
      return [];
    }

    // Chronological order: reverse the fetched messages
    const chronologicalMessages = [...messages].reverse();

    // Fetch parent messages to display reply context
    const parentIds = [
      ...new Set(
        chronologicalMessages
          .map((m) => m.parent_id)
          .filter((id): id is string => !!id),
      ),
    ];

    const parentMap = new Map<string, { content: string; senderName: string }>();

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

    return chronologicalMessages.map((m) => {
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
  }

  async createMessage(
    tenantId: string,
    userId: string,
    payload: CreateMessageDto,
  ): Promise<GroupMessageResponse> {
    const sb = this.supabaseService.getClient();

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
      throw new InternalServerErrorException('Nachricht konnte nicht gesendet werden');
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
        response.parentSenderName = generateUserName(parent.user_id, parent.tenant_id);
      }
    }

    return response;
  }
}
