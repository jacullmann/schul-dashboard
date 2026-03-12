/**
 * db.ts — Supabase data-access layer.
 *
 * Every function receives the Supabase client (service-role) so there is
 * exactly ONE place where SQL conventions live. Route handlers stay clean.
 */

import dayjs from 'dayjs';
import type {
  Supabase,
  DbGroup,
  DbUser,
  DbBannedUser,
  DbUserActivity,
  DbVerification,
  DbPasswordReset,
  DbMfaPendingSecret,
  DbItem,
  DbEncryptedTodo,
  DbSubject,
  DbAnnouncement,
  DbSorge,
  DbTimetableLesson,
  DbTimetableSub,
  DbPerson,
  DbDaltonSchedule,
  DbAdminSharedDoc,
  DbReport,
  ItemVisibility,
  SecurityEventInput,
  ReportInput,
  AnnouncementInput,
  ItemCreateInput,
  TimetableSubInput,
  TodoCreateInput,
  GroupCreateInput,
  UserCreateInput,
  VerificationCreateInput,
  PasswordResetCreateInput,
  MfaPendingInput,
  SharedDocInput,
  EncryptedPayload,
  ItemImage,
} from '../types/index.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
}

interface SupabaseResult<T> {
  data: T;
  error: SupabaseError | null;
}

interface DbError extends Error {
  code?: string;
  details?: string;
}

/** Throw a typed error when a Supabase call fails. Strips `null` from the return type. */
function throwOnError<T>({ data, error }: SupabaseResult<T>): NonNullable<T> {
  if (error) {
    const err: DbError = new Error(error.message);
    err.code = error.code;
    err.details = error.details;
    throw err;
  }
  return data as NonNullable<T>;
}

// ─── Groups ─────────────────────────────────────────────────────────────────

export async function findGroupByName(
  sb: Supabase,
  name: string,
): Promise<Pick<DbGroup, 'id' | 'name' | 'passcode_hash'> | null> {
  const { data } = await sb
    .from('groups')
    .select('id, name, passcode_hash')
    .eq('name', name)
    .maybeSingle();
  return data;
}

export async function createGroup(
  sb: Supabase,
  { name, passcodeHash }: GroupCreateInput,
): Promise<DbGroup> {
  return throwOnError(
    await sb
      .from('groups')
      .insert({
        name,
        passcode_hash: passcodeHash,
      })
      .select()
      .single(),
  );
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function createUser(
  sb: Supabase,
  { email, passwordHash }: UserCreateInput,
): Promise<DbUser> {
  return throwOnError(
    await sb
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        email_verified: false,
      })
      .select()
      .single(),
  );
}

export async function findUserByEmail(
  sb: Supabase,
  email: string,
  selectCols: string = '*',
): Promise<Record<string, unknown> | null> {
  const { data } = await sb
    .from('users')
    .select(selectCols)
    .eq('email', email.toLowerCase())
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

export async function findUserById(
  sb: Supabase,
  id: string,
  selectCols: string = '*',
): Promise<Record<string, unknown> | null> {
  const { data } = await sb
    .from('users')
    .select(selectCols)
    .eq('id', id)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

export async function updateUser(
  sb: Supabase,
  id: string,
  fields: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return throwOnError(
    await sb.from('users').update(fields).eq('id', id).select().single(),
  );
}

export async function deleteUser(sb: Supabase, id: string): Promise<unknown> {
  return throwOnError(await sb.from('users').delete().eq('id', id));
}

export async function countUsers(
  sb: Supabase,
  filters: Record<string, unknown> = {},
): Promise<number> {
  let q = sb.from('users').select('*', { count: 'exact', head: true });
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countUsersSince(
  sb: Supabase,
  dateISO: string,
): Promise<number> {
  const { count, error } = await sb
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', dateISO);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listUsers(
  sb: Supabase,
  {
    select = '*',
    orderBy = 'created_at',
    ascending = false,
    limit,
  }: {
    select?: string;
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
  } = {},
): Promise<Record<string, unknown>[]> {
  let q = sb.from('users').select(select).order(orderBy, { ascending });
  if (limit) q = q.limit(limit);
  return throwOnError(await q) as unknown as Record<string, unknown>[];
}

// ─── Banned Users ───────────────────────────────────────────────────────────

export async function isBanned(sb: Supabase, userId: string): Promise<boolean> {
  const { data } = await sb
    .from('banned_users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function banUser(
  sb: Supabase,
  userId: string,
): Promise<DbBannedUser> {
  return throwOnError(
    await sb
      .from('banned_users')
      .upsert(
        { user_id: userId, banned_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      .select()
      .single(),
  );
}

export async function unbanUser(
  sb: Supabase,
  userId: string,
): Promise<unknown> {
  return throwOnError(
    await sb.from('banned_users').delete().eq('user_id', userId),
  );
}

export async function listBannedUserIds(sb: Supabase): Promise<string[]> {
  const data = throwOnError(await sb.from('banned_users').select('user_id'));
  return (data as Array<{ user_id: string }>).map((b) => b.user_id);
}

export async function countBanned(sb: Supabase): Promise<number> {
  const { count, error } = await sb
    .from('banned_users')
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ─── Activity ───────────────────────────────────────────────────────────────

export async function logActivity(
  sb: Supabase,
  userId: string,
  type: string,
  meta: Record<string, unknown> = {},
): Promise<unknown> {
  return throwOnError(
    await sb.from('user_activity').insert({
      user_id: userId,
      type,
      meta,
    }),
  );
}

export async function getUserActivity(
  sb: Supabase,
  userId: string,
  { limit = 50, before }: { limit?: number; before?: string } = {},
): Promise<DbUserActivity[]> {
  let q = sb
    .from('user_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (before) q = q.lt('created_at', before);
  return throwOnError(await q);
}

export async function pruneActivity(
  sb: Supabase,
  userId: string,
  olderThanDays: number = 30,
): Promise<unknown> {
  const cutoff = dayjs().subtract(olderThanDays, 'day').toISOString();
  return throwOnError(
    await sb
      .from('user_activity')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', cutoff),
  );
}

// ─── Verifications ──────────────────────────────────────────────────────────

export async function createVerification(
  sb: Supabase,
  { email, token, expiresAt }: VerificationCreateInput,
): Promise<DbVerification> {
  return throwOnError(
    await sb
      .from('verifications')
      .insert({ email, token, expires_at: expiresAt })
      .select()
      .single(),
  );
}

export async function findVerification(
  sb: Supabase,
  token: string,
): Promise<DbVerification | null> {
  const { data } = await sb
    .from('verifications')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  return data;
}

export async function deleteVerificationsByEmail(
  sb: Supabase,
  email: string,
): Promise<unknown> {
  return throwOnError(
    await sb.from('verifications').delete().eq('email', email),
  );
}

// ─── Password Resets ────────────────────────────────────────────────────────

export async function createPasswordReset(
  sb: Supabase,
  { email, code, expiresAt }: PasswordResetCreateInput,
): Promise<DbPasswordReset> {
  return throwOnError(
    await sb
      .from('password_resets')
      .insert({ email, code, expires_at: expiresAt })
      .select()
      .single(),
  );
}

export async function markAllResetsUsed(
  sb: Supabase,
  email: string,
): Promise<unknown> {
  return throwOnError(
    await sb
      .from('password_resets')
      .update({ used: true })
      .eq('email', email)
      .eq('used', false),
  );
}

export async function findValidReset(
  sb: Supabase,
  email: string,
  code: string,
): Promise<DbPasswordReset | null> {
  const { data } = await sb
    .from('password_resets')
    .select('*')
    .eq('email', email)
    .eq('code', code)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function markResetUsed(
  sb: Supabase,
  id: string,
): Promise<unknown> {
  return throwOnError(
    await sb.from('password_resets').update({ used: true }).eq('id', id),
  );
}

// ─── MFA Pending Secrets ────────────────────────────────────────────────────

export async function upsertMfaPending(
  sb: Supabase,
  { userId, encryptedSecret, expiresAt }: MfaPendingInput,
): Promise<DbMfaPendingSecret> {
  return throwOnError(
    await sb
      .from('mfa_pending_secrets')
      .upsert(
        {
          user_id: userId,
          encrypted_secret: encryptedSecret,
          expires_at: expiresAt,
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single(),
  );
}

export async function findMfaPending(
  sb: Supabase,
  userId: string,
): Promise<DbMfaPendingSecret | null> {
  const { data } = await sb
    .from('mfa_pending_secrets')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  return data;
}

export async function deleteMfaPending(
  sb: Supabase,
  userId: string,
): Promise<unknown> {
  return throwOnError(
    await sb.from('mfa_pending_secrets').delete().eq('user_id', userId),
  );
}

export async function cleanupExpiredMfaPending(sb: Supabase): Promise<unknown> {
  return throwOnError(
    await sb
      .from('mfa_pending_secrets')
      .delete()
      .lt('expires_at', new Date().toISOString()),
  );
}

// ─── Items ──────────────────────────────────────────────────────────────────

export async function createItem(
  sb: Supabase,
  tenantId: string,
  item: ItemCreateInput,
): Promise<DbItem> {
  return throwOnError(
    await sb
      .from('items')
      .insert({
        type: item.type,
        title: item.title,
        subject: item.subject,
        description: item.description || '',
        images: item.images || [],
        due_date: item.dueDate,
        created_by: item.createdBy,
        editor_note: item.editorNote || '',
        tenant_id: tenantId,
      })
      .select()
      .single(),
  );
}

export async function findItemById(
  sb: Supabase,
  tenantId: string,
  id: string,
): Promise<DbItem | null> {
  const { data } = await sb
    .from('items')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  return data;
}

export async function listItems(
  sb: Supabase,
  tenantId: string,
  {
    type,
    filter,
    limit = 100,
    userId,
  }: {
    type: string;
    filter?: string;
    limit?: number;
    userId?: string | null;
  },
): Promise<Array<DbItem & { creator?: { email: string } }>> {
  const cutoff = dayjs().subtract(24, 'hour').toISOString();

  let visibility: ItemVisibility = { archived: [], kept: [] };
  if (userId) {
    visibility = await getItemVisibility(sb, userId);
  }

  let q = sb
    .from('items')
    .select('*, creator:users!items_created_by_fkey(email)')
    .eq('tenant_id', tenantId);

  if (type && type !== 'ALLE') {
    q = q.eq('type', type);
  }

  if (filter === 'old') {
    const conds = [`due_date.lt.${cutoff}`];
    if (visibility.archived.length > 0)
      conds.push(`id.in.(${visibility.archived.join(',')})`);

    q = q.or(conds.join(','));
    if (visibility.kept.length > 0)
      q = q.not('id', 'in', `(${visibility.kept.join(',')})`);
    q = q.order('due_date', { ascending: false });
  } else {
    const conds = [`due_date.gte.${cutoff}`];
    if (visibility.kept.length > 0)
      conds.push(`id.in.(${visibility.kept.join(',')})`);

    q = q.or(conds.join(','));
    if (visibility.archived.length > 0)
      q = q.not('id', 'in', `(${visibility.archived.join(',')})`);
    q = q.order('due_date', { ascending: true });
  }
  q = q.limit(limit);
  return throwOnError(await q);
}

export async function updateItem(
  sb: Supabase,
  tenantId: string,
  id: string,
  fields: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return throwOnError(
    await sb
      .from('items')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single(),
  );
}

export async function deleteItem(
  sb: Supabase,
  tenantId: string,
  id: string,
): Promise<unknown> {
  return throwOnError(
    await sb.from('items').delete().eq('id', id).eq('tenant_id', tenantId),
  );
}

export async function countItems(
  sb: Supabase,
  tenantId: string,
  filters: Record<string, unknown> = {},
): Promise<number> {
  let q = sb
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countItemsOlderThan(
  sb: Supabase,
  tenantId: string,
  dateISO: string,
): Promise<number> {
  const { count, error } = await sb
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .lt('created_at', dateISO);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countItemsSince(
  sb: Supabase,
  tenantId: string,
  dateISO: string,
): Promise<number> {
  const { count, error } = await sb
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', dateISO);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function findOldItems(
  sb: Supabase,
  tenantId: string,
  olderThanISO: string,
): Promise<Array<{ id: string; images: ItemImage[] }>> {
  return throwOnError(
    await sb
      .from('items')
      .select('id, images')
      .eq('tenant_id', tenantId)
      .lt('created_at', olderThanISO),
  );
}

export async function deleteItemsOlderThan(
  sb: Supabase,
  tenantId: string,
  olderThanISO: string,
): Promise<unknown> {
  return throwOnError(
    await sb
      .from('items')
      .delete()
      .eq('tenant_id', tenantId)
      .lt('created_at', olderThanISO),
  );
}

export async function getItemsByTypeCount(
  sb: Supabase,
  tenantId: string,
): Promise<Array<{ type: string; count: number }>> {
  const types = ['HAUSAUFGABE', 'DALTON', 'PRUEFUNG'];
  const counts = await Promise.all(
    types.map(async (type) => {
      const { count, error } = await sb
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('type', type);
      if (error) throw new Error(error.message);
      return { type, count: count ?? 0 };
    }),
  );
  return counts.filter((c) => c.count > 0);
}

export async function getTopCreators(
  sb: Supabase,
  tenantId: string,
  limit: number = 5,
): Promise<Array<{ _id: string; count: number; email: string }>> {
  const data = throwOnError(
    await sb.from('items').select('created_by').eq('tenant_id', tenantId),
  ) as Array<{ created_by: string }>;
  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.created_by] = (counts[row.created_by] || 0) + 1;
  }
  const sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);

  const userIds = sorted.map(([userId]) => userId);
  const users =
    userIds.length > 0
      ? (throwOnError(
        await sb.from('users').select('id, email').in('id', userIds),
      ) as Array<{ id: string; email: string }>)
      : [];
  const userMap = new Map(users.map((u) => [u.id, u.email]));

  return sorted.map(([userId, count]) => ({
    _id: userId,
    count,
    email: userMap.get(userId) || 'Unbekannt',
  }));
}

// ─── Keep Checked ───────────────────────────────────────────────────────────

export async function getCheckedItemIds(
  sb: Supabase,
  userId: string,
): Promise<string[]> {
  const data = throwOnError(
    await sb.from('keep_checked').select('item_id').eq('user_id', userId),
  ) as Array<{ item_id: string }>;
  return data.map((d) => d.item_id);
}

export async function checkItem(
  sb: Supabase,
  itemId: string,
  userId: string,
): Promise<unknown> {
  return throwOnError(
    await sb.from('keep_checked').upsert(
      {
        item_id: itemId,
        user_id: userId,
        checked_at: new Date().toISOString(),
      },
      { onConflict: 'item_id,user_id' },
    ),
  );
}

export async function uncheckItem(
  sb: Supabase,
  itemId: string,
  userId: string,
): Promise<unknown> {
  return throwOnError(
    await sb
      .from('keep_checked')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId),
  );
}

export async function deleteChecksForItems(
  sb: Supabase,
  itemIds: string[],
): Promise<void> {
  if (!itemIds.length) return;
  throwOnError(await sb.from('keep_checked').delete().in('item_id', itemIds));
}

export async function deleteChecksForUser(
  sb: Supabase,
  userId: string,
): Promise<unknown> {
  return throwOnError(
    await sb.from('keep_checked').delete().eq('user_id', userId),
  );
}

// ─── Pinned Items ───────────────────────────────────────────────────────────

export async function getPinnedItemIds(
  sb: Supabase,
  userId: string,
): Promise<string[]> {
  const data = throwOnError(
    await sb.from('pinned_items').select('item_id').eq('user_id', userId),
  ) as Array<{ item_id: string }>;
  return data.map((d) => d.item_id);
}

export async function pinItem(
  sb: Supabase,
  itemId: string,
  userId: string,
): Promise<unknown> {
  return throwOnError(
    await sb.from('pinned_items').upsert(
      {
        item_id: itemId,
        user_id: userId,
        pinned_at: new Date().toISOString(),
      },
      { onConflict: 'item_id,user_id' },
    ),
  );
}

export async function unpinItem(
  sb: Supabase,
  itemId: string,
  userId: string,
): Promise<unknown> {
  return throwOnError(
    await sb
      .from('pinned_items')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId),
  );
}

export async function deletePinsForUser(
  sb: Supabase,
  userId: string,
): Promise<unknown> {
  return throwOnError(
    await sb.from('pinned_items').delete().eq('user_id', userId),
  );
}

// ─── Reports ────────────────────────────────────────────────────────────────

export async function createReport(
  sb: Supabase,
  report: ReportInput,
): Promise<DbReport> {
  return throwOnError(
    await sb
      .from('reports')
      .insert({
        item_id: report.itemId,
        item_title: report.itemTitle,
        category: report.category,
        reason: report.reason || null,
        reporter_id: report.reporterId || null,
        reporter_email: report.reporterEmail || 'anonymous',
        reported_at: new Date().toISOString(),
      })
      .select()
      .single(),
  );
}

export async function listReports(
  sb: Supabase,
  { limit = 100 }: { limit?: number } = {},
): Promise<DbReport[]> {
  return throwOnError(
    await sb
      .from('reports')
      .select('*')
      .order('processed', { ascending: true })
      .order('reported_at', { ascending: false })
      .limit(limit),
  );
}

export async function updateReport(
  sb: Supabase,
  id: string,
  fields: Record<string, unknown>,
): Promise<DbReport> {
  return throwOnError(
    await sb.from('reports').update(fields).eq('id', id).select().single(),
  );
}

export async function deleteReport(sb: Supabase, id: string): Promise<unknown> {
  return throwOnError(await sb.from('reports').delete().eq('id', id));
}

export async function countReports(
  sb: Supabase,
  filters: Record<string, unknown> = {},
): Promise<number> {
  let q = sb.from('reports').select('*', { count: 'exact', head: true });
  for (const [k, v] of Object.entries(filters)) {
    if (v === false) q = q.or(`${k}.eq.false,${k}.is.null`);
    else q = q.eq(k, v);
  }
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ─── Encrypted Todos ────────────────────────────────────────────────────────

export async function listTodos(
  sb: Supabase,
  userId: string,
): Promise<DbEncryptedTodo[]> {
  return throwOnError(
    await sb
      .from('encrypted_todos')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false }),
  );
}

export async function createTodo(
  sb: Supabase,
  todo: TodoCreateInput,
): Promise<DbEncryptedTodo> {
  return throwOnError(
    await sb
      .from('encrypted_todos')
      .insert({
        user_id: todo.userId,
        encrypted_title: todo.encryptedTitle,
        encrypted_description: todo.encryptedDescription,
        completed: false,
        position: todo.position || '',
      })
      .select()
      .single(),
  );
}

export async function findTodoById(
  sb: Supabase,
  id: string,
  userId: string,
): Promise<DbEncryptedTodo | null> {
  const { data } = await sb
    .from('encrypted_todos')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function updateTodo(
  sb: Supabase,
  id: string,
  fields: Record<string, unknown>,
): Promise<DbEncryptedTodo> {
  return throwOnError(
    await sb
      .from('encrypted_todos')
      .update(fields)
      .eq('id', id)
      .select()
      .single(),
  );
}

export async function deleteTodo(
  sb: Supabase,
  id: string,
  userId: string,
): Promise<unknown> {
  return throwOnError(
    await sb
      .from('encrypted_todos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId),
  );
}

export async function deleteTodosForUser(
  sb: Supabase,
  userId: string,
): Promise<unknown> {
  return throwOnError(
    await sb.from('encrypted_todos').delete().eq('user_id', userId),
  );
}

export async function listIncompleteTodos(
  sb: Supabase,
  userId: string,
): Promise<DbEncryptedTodo[]> {
  return throwOnError(
    await sb
      .from('encrypted_todos')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false }),
  );
}

export async function getFirstTodo(
  sb: Supabase,
  userId: string,
): Promise<DbEncryptedTodo | null> {
  const { data } = await sb
    .from('encrypted_todos')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// ─── Subjects ───────────────────────────────────────────────────────────────

export async function listSubjects(
  sb: Supabase,
  tenantId: string,
): Promise<DbSubject[]> {
  return throwOnError(
    await sb
      .from('subjects')
      .select('id, name, is_active, courses(id, name)')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true }),
  ) as unknown as DbSubject[];
}

export async function upsertSubject(
  sb: Supabase,
  tenantId: string,
  name: string,
): Promise<unknown> {
  return throwOnError(
    await sb
      .from('subjects')
      .upsert({ name, tenant_id: tenantId }, { onConflict: 'name' }),
  );
}

export async function deleteSubject(
  sb: Supabase,
  tenantId: string,
  name: string,
): Promise<unknown> {
  return throwOnError(
    await sb
      .from('subjects')
      .delete()
      .eq('name', name)
      .eq('tenant_id', tenantId),
  );
}

// ─── Announcements ──────────────────────────────────────────────────────────

export async function listAnnouncements(
  sb: Supabase,
  tenantId: string,
  limit: number = 5,
): Promise<DbAnnouncement[]> {
  return throwOnError(
    await sb
      .from('announcements')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit),
  );
}

export async function createAnnouncement(
  sb: Supabase,
  tenantId: string,
  ann: AnnouncementInput,
): Promise<DbAnnouncement> {
  return throwOnError(
    await sb
      .from('announcements')
      .insert({
        content: ann.content,
        color: ann.color || 'warn',
        show_as_popup: ann.showAsPopup || false,
        created_by: ann.createdBy,
        tenant_id: tenantId,
      })
      .select()
      .single(),
  );
}

export async function findAnnouncementById(
  sb: Supabase,
  tenantId: string,
  id: string,
): Promise<DbAnnouncement | null> {
  const { data } = await sb
    .from('announcements')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  return data;
}

export async function deleteAnnouncement(
  sb: Supabase,
  tenantId: string,
  id: string,
): Promise<unknown> {
  return throwOnError(
    await sb
      .from('announcements')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId),
  );
}

// ─── Sorgen ─────────────────────────────────────────────────────────────────

export async function createSorge(
  sb: Supabase,
  message: string,
): Promise<DbSorge> {
  return throwOnError(
    await sb.from('sorgen').insert({ message }).select().single(),
  );
}

export async function listSorgen(
  sb: Supabase,
  limit: number = 100,
): Promise<DbSorge[]> {
  return throwOnError(
    await sb
      .from('sorgen')
      .select('*')
      .order('processed', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit),
  );
}

export async function updateSorge(
  sb: Supabase,
  id: string,
  fields: Record<string, unknown>,
): Promise<DbSorge> {
  return throwOnError(
    await sb.from('sorgen').update(fields).eq('id', id).select().single(),
  );
}

export async function deleteSorge(sb: Supabase, id: string): Promise<unknown> {
  return throwOnError(await sb.from('sorgen').delete().eq('id', id));
}

export async function countSorgen(
  sb: Supabase,
  filters: Record<string, unknown> = {},
): Promise<number> {
  let q = sb.from('sorgen').select('*', { count: 'exact', head: true });
  for (const [k, v] of Object.entries(filters)) {
    if (v === false) q = q.or(`${k}.eq.false,${k}.is.null`);
    else q = q.eq(k, v);
  }
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ─── Timetable ──────────────────────────────────────────────────────────────

export async function getTimetableLessons(
  sb: Supabase,
  tenantId: string,
): Promise<DbTimetableLesson[]> {
  return throwOnError(
    await sb
      .from('timetables')
      .select(
        `
                id,
                day,
                slot,
                duration,
                room,
                course_id,
                persons ( id, name, title, short ),
                subjects ( id, name ),
                courses ( id, name )
            `,
      )
      .eq('tenant_id', tenantId),
  ) as unknown as DbTimetableLesson[];
}

export async function listTimetableSubs(
  sb: Supabase,
  tenantId: string,
): Promise<DbTimetableSub[]> {
  return throwOnError(
    await sb
      .from('timetable_subs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }),
  );
}

export async function createTimetableSub(
  sb: Supabase,
  tenantId: string,
  sub: TimetableSubInput,
): Promise<DbTimetableSub> {
  return throwOnError(
    await sb
      .from('timetable_subs')
      .insert({
        lesson_id: sub.lessonId,
        day: sub.day || null,
        slot: sub.slot || null,
        duration: sub.duration || null,
        subject: sub.subject || null,
        teacher: sub.teacher || null,
        room: sub.room || null,
        cancelled: sub.cancelled || false,
        hide: sub.hide || false,
        tenant_id: tenantId,
      })
      .select()
      .single(),
  );
}

export async function deleteTimetableSub(
  sb: Supabase,
  tenantId: string,
  id: string,
): Promise<DbTimetableSub> {
  return throwOnError(
    await sb
      .from('timetable_subs')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single(),
  );
}

// ─── Shared Doc ─────────────────────────────────────────────────────────────

export async function getSharedDoc(
  sb: Supabase,
): Promise<DbAdminSharedDoc | null> {
  const { data } = await sb
    .from('admin_shared_doc')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  return data;
}

export async function upsertSharedDoc(
  sb: Supabase,
  doc: SharedDocInput,
): Promise<unknown> {
  return throwOnError(
    await sb.from('admin_shared_doc').upsert(
      {
        id: 1,
        content: doc.content,
        version: doc.version,
        last_edited_by: doc.lastEditedBy,
        last_edited_at: doc.lastEditedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    ),
  );
}

// ─── Security Events ────────────────────────────────────────────────────────

export async function logSecurityEvent(
  sb: Supabase,
  event: SecurityEventInput,
): Promise<void> {
  try {
    await sb.from('security_events').insert({
      event_type: event.eventType,
      event_status: event.eventStatus,
      ip_address: event.ip,
      user_agent: event.userAgent,
      metadata: event.metadata || {},
    });
  } catch (err) {
    console.error('Failed to log security event:', err);
  }
}

// ─── Reference Tables (persons, dalton_schedule) ────────────────────────────

export async function listPersons(
  sb: Supabase,
  tenantId: string,
): Promise<DbPerson[]> {
  return throwOnError(
    await sb
      .from('persons')
      .select('*, person_subjects(subjects(name))')
      .eq('tenant_id', tenantId)
      .order('id', { ascending: true }),
  );
}

export async function listDaltonSchedule(
  sb: Supabase,
  tenantId: string,
): Promise<DbDaltonSchedule[]> {
  return throwOnError(
    await sb.from('dalton_schedule').select('*').eq('tenant_id', tenantId),
  );
}

// ─── Item Visibility ────────────────────────────────────────────────────────

export async function getItemVisibility(
  sb: Supabase,
  userId: string,
): Promise<ItemVisibility> {
  const data = throwOnError(
    await sb
      .from('user_item_visibility')
      .select('item_id, status')
      .eq('user_id', userId),
  ) as Array<{ item_id: string; status: string }>;
  const archived = data
    .filter((d) => d.status === 'archived')
    .map((d) => d.item_id);
  const kept = data.filter((d) => d.status === 'kept').map((d) => d.item_id);
  return { archived, kept };
}

export async function setItemVisibility(
  sb: Supabase,
  itemId: string,
  userId: string,
  status: string,
): Promise<unknown> {
  // Delete any existing override to safely bypass the lack of a UNIQUE constraint
  await sb
    .from('user_item_visibility')
    .delete()
    .eq('item_id', itemId)
    .eq('user_id', userId);

  // Insert the new status
  return throwOnError(
    await sb.from('user_item_visibility').insert({
      item_id: itemId,
      user_id: userId,
      status,
    }),
  );
}

export async function removeItemVisibility(
  sb: Supabase,
  itemId: string,
  userId: string,
): Promise<unknown> {
  return throwOnError(
    await sb
      .from('user_item_visibility')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId),
  );
}
