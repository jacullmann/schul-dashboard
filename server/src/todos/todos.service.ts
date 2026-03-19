import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { generateKeyBetween } from 'fractional-indexing';
import { SupabaseService } from '../common/supabase/supabase.service';
import { encryptData, decryptData } from '../common/utils/encryption.util';

@Injectable()
export class TodosService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getTodos(userId: string) {
    const sb = this.supabaseService.getClient();
    const { data: todos } = await sb
      .from('encrypted_todos')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (!todos) return [];

    const decryptedTodos = await Promise.all(
      todos.map(async (todo) => ({
        id: todo.id,
        title: await decryptData(todo.encrypted_title, userId),
        description: todo.encrypted_description?.data
          ? await decryptData(todo.encrypted_description, userId)
          : '',
        completed: todo.completed,
        position: todo.position || '',
        createdAt: todo.created_at,
        updatedAt: todo.updated_at,
      })),
    );
    return decryptedTodos;
  }

  async createTodo(userId: string, title: string, description?: string) {
    const sb = this.supabaseService.getClient();

    const { data: firstTodo } = await sb
      .from('encrypted_todos')
      .select('position')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    let newPosition: string;
    try {
      newPosition =
        firstTodo && firstTodo.position
          ? generateKeyBetween(null, firstTodo.position)
          : generateKeyBetween(null, null);
    } catch {
      newPosition = generateKeyBetween(null, null);
    }

    const encryptedTitle = await encryptData(title.trim(), userId);
    const encryptedDescription = await encryptData(
      description?.trim() || '',
      userId,
    );

    const { data: todo, error } = await sb
      .from('encrypted_todos')
      .insert({
        user_id: userId,
        encrypted_title: encryptedTitle,
        encrypted_description: encryptedDescription,
        position: newPosition,
      })
      .select()
      .single();

    if (error)
      throw new InternalServerErrorException(
        'Fehler beim Erstellen des privaten Eintrags',
      );

    const { error: err_vz8t0 } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'todo:create',
      meta: { todoId: todo.id },
    });
    if (err_vz8t0) throw new InternalServerErrorException(err_vz8t0.message);

    return {
      id: todo.id,
      title: title.trim(),
      description: description?.trim() || '',
      completed: false,
      position: newPosition,
      createdAt: todo.created_at,
      updatedAt: todo.updated_at,
    };
  }

  async updateTodo(
    userId: string,
    id: string,
    title: string,
    description?: string,
  ) {
    const sb = this.supabaseService.getClient();
    const { data: todo } = await sb
      .from('encrypted_todos')
      .select('id, completed, position, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (!todo) throw new NotFoundException('Privater Eintrag nicht gefunden');

    const encryptedTitle = await encryptData(title.trim(), userId);
    const encryptedDescription = await encryptData(
      description?.trim() || '',
      userId,
    );

    const { data: updated } = await sb
      .from('encrypted_todos')
      .update({
        encrypted_title: encryptedTitle,
        encrypted_description: encryptedDescription,
      })
      .eq('id', id)
      .select()
      .single();

    const { error: err_y4457 } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'todo:update',
      meta: { todoId: todo.id },
    });
    if (err_y4457) throw new InternalServerErrorException(err_y4457.message);

    return {
      id: updated!.id,
      title: title.trim(),
      description: description?.trim() || '',
      completed: updated!.completed,
      position: updated!.position || '',
      createdAt: updated!.created_at,
      updatedAt: updated!.updated_at,
    };
  }

  async toggleTodo(userId: string, id: string) {
    const sb = this.supabaseService.getClient();
    const { data: todo } = await sb
      .from('encrypted_todos')
      .select('id, completed')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (!todo) throw new NotFoundException('Privater Eintrag nicht gefunden');

    const newCompleted = !todo.completed;
    const { data: updated } = await sb
      .from('encrypted_todos')
      .update({ completed: newCompleted })
      .eq('id', id)
      .select()
      .single();

    const { error: err_3ryur } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'todo:toggle',
      meta: { todoId: todo.id, completed: newCompleted },
    });
    if (err_3ryur) throw new InternalServerErrorException(err_3ryur.message);

    return {
      id: updated!.id,
      completed: updated!.completed,
      position: updated!.position || '',
      updatedAt: updated!.updated_at,
    };
  }

  async reorderTodo(
    userId: string,
    id: string,
    prevPosition?: string | null,
    nextPosition?: string | null,
  ) {
    const sb = this.supabaseService.getClient();
    const { data: todo } = await sb
      .from('encrypted_todos')
      .select('id, position')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (!todo) throw new NotFoundException('Privater Eintrag nicht gefunden');

    const { data: allTodos } = await sb
      .from('encrypted_todos')
      .select('id, position')
      .eq('user_id', userId)
      .order('position', { ascending: true });
    const todosList = allTodos || [];

    const unpositioned = todosList.filter((t) => !t.position);
    if (unpositioned.length > 0) {
      const positioned = todosList
        .filter((t) => t.position)
        .map((t) => t.position)
        .sort();
      let cursor: string | null = null;
      const unpositionedUpdates = unpositioned.map((t) => {
        const nextAnchor = positioned[0] || null;
        try {
          cursor = generateKeyBetween(cursor, nextAnchor);
        } catch {
          cursor = generateKeyBetween(null, null);
        }
        positioned.unshift(cursor);
        positioned.sort();
        return { id: t.id, position: cursor };
      });
      await Promise.all(
        unpositionedUpdates.map((u) =>
          sb
            .from('encrypted_todos')
            .update({ position: u.position })
            .eq('id', u.id),
        ),
      );
    }

    let newPosition: string;
    try {
      newPosition = generateKeyBetween(
        prevPosition || null,
        nextPosition || null,
      );
    } catch {
      throw new BadRequestException('Ungültige Positionen für Re-Ordering');
    }

    const { data: updated } = await sb
      .from('encrypted_todos')
      .update({ position: newPosition })
      .eq('id', id)
      .select()
      .single();

    if (newPosition && newPosition.length > 20) {
      const { data: allIncomplete } = await sb
        .from('encrypted_todos')
        .select('id')
        .eq('user_id', userId)
        .eq('completed', false)
        .order('position', { ascending: true });
      let p: string | null = null;
      const fallbackUpdates = (allIncomplete || [])
        .map((t) => {
          try {
            p = generateKeyBetween(p, null);
            return { id: t.id, position: p };
          } catch {
            return null;
          }
        })
        .filter((u): u is { id: string; position: string } => u !== null);

      await Promise.all(
        fallbackUpdates.map(async (u) => {
          try {
            await sb
              .from('encrypted_todos')
              .update({ position: u.position })
              .eq('id', u.id);
          } catch {
            // Ignore reordering errors for individual items
          }
        }),
      );

      const { data: refreshed } = await sb
        .from('encrypted_todos')
        .select('position')
        .eq('id', id)
        .maybeSingle();
      if (refreshed) newPosition = refreshed.position;
    }

    return {
      id: todo.id,
      position: newPosition,
      updatedAt: updated!.updated_at,
    };
  }

  async deleteTodo(userId: string, id: string) {
    const sb = this.supabaseService.getClient();
    const { data: todo } = await sb
      .from('encrypted_todos')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (!todo) throw new NotFoundException('Privater Eintrag nicht gefunden');

    await sb
      .from('encrypted_todos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    await sb
      .from('user_activity')
      .insert({ user_id: userId, type: 'todo:delete', meta: { todoId: id } });

    return { ok: true };
  }
}
