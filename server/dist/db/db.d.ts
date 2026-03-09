/**
 * db.ts — Supabase data-access layer.
 *
 * Every function receives the Supabase client (service-role) so there is
 * exactly ONE place where SQL conventions live. Route handlers stay clean.
 */
import type { Supabase, DbGroup, DbUser, DbBannedUser, DbUserActivity, DbVerification, DbPasswordReset, DbMfaPendingSecret, DbItem, DbEncryptedTodo, DbSubject, DbAnnouncement, DbSorge, DbTimetableLesson, DbTimetableSub, DbPerson, DbDaltonSchedule, DbAdminSharedDoc, DbReport, ItemVisibility, SecurityEventInput, ReportInput, AnnouncementInput, ItemCreateInput, TimetableSubInput, TodoCreateInput, GroupCreateInput, UserCreateInput, VerificationCreateInput, PasswordResetCreateInput, MfaPendingInput, SharedDocInput, ItemImage } from '../types/index.js';
export declare function findGroupByName(sb: Supabase, name: string): Promise<Pick<DbGroup, 'id' | 'name' | 'passcode_hash'> | null>;
export declare function createGroup(sb: Supabase, { name, passcodeHash }: GroupCreateInput): Promise<DbGroup>;
export declare function createUser(sb: Supabase, { email, passwordHash }: UserCreateInput): Promise<DbUser>;
export declare function findUserByEmail(sb: Supabase, email: string, selectCols?: string): Promise<Record<string, unknown> | null>;
export declare function findUserById(sb: Supabase, id: string, selectCols?: string): Promise<Record<string, unknown> | null>;
export declare function updateUser(sb: Supabase, id: string, fields: Record<string, unknown>): Promise<Record<string, unknown>>;
export declare function deleteUser(sb: Supabase, id: string): Promise<unknown>;
export declare function countUsers(sb: Supabase, filters?: Record<string, unknown>): Promise<number>;
export declare function countUsersSince(sb: Supabase, dateISO: string): Promise<number>;
export declare function listUsers(sb: Supabase, { select, orderBy, ascending, limit, }?: {
    select?: string;
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
}): Promise<Record<string, unknown>[]>;
export declare function isBanned(sb: Supabase, userId: string): Promise<boolean>;
export declare function banUser(sb: Supabase, userId: string): Promise<DbBannedUser>;
export declare function unbanUser(sb: Supabase, userId: string): Promise<unknown>;
export declare function listBannedUserIds(sb: Supabase): Promise<string[]>;
export declare function countBanned(sb: Supabase): Promise<number>;
export declare function logActivity(sb: Supabase, userId: string, type: string, meta?: Record<string, unknown>): Promise<unknown>;
export declare function getUserActivity(sb: Supabase, userId: string, { limit, before }?: {
    limit?: number;
    before?: string;
}): Promise<DbUserActivity[]>;
export declare function pruneActivity(sb: Supabase, userId: string, olderThanDays?: number): Promise<unknown>;
export declare function createVerification(sb: Supabase, { email, token, expiresAt }: VerificationCreateInput): Promise<DbVerification>;
export declare function findVerification(sb: Supabase, token: string): Promise<DbVerification | null>;
export declare function deleteVerificationsByEmail(sb: Supabase, email: string): Promise<unknown>;
export declare function createPasswordReset(sb: Supabase, { email, code, expiresAt }: PasswordResetCreateInput): Promise<DbPasswordReset>;
export declare function markAllResetsUsed(sb: Supabase, email: string): Promise<unknown>;
export declare function findValidReset(sb: Supabase, email: string, code: string): Promise<DbPasswordReset | null>;
export declare function markResetUsed(sb: Supabase, id: string): Promise<unknown>;
export declare function upsertMfaPending(sb: Supabase, { userId, encryptedSecret, expiresAt }: MfaPendingInput): Promise<DbMfaPendingSecret>;
export declare function findMfaPending(sb: Supabase, userId: string): Promise<DbMfaPendingSecret | null>;
export declare function deleteMfaPending(sb: Supabase, userId: string): Promise<unknown>;
export declare function cleanupExpiredMfaPending(sb: Supabase): Promise<unknown>;
export declare function createItem(sb: Supabase, tenantId: string, item: ItemCreateInput): Promise<DbItem>;
export declare function findItemById(sb: Supabase, tenantId: string, id: string): Promise<DbItem | null>;
export declare function listItems(sb: Supabase, tenantId: string, { type, filter, limit, userId, }: {
    type: string;
    filter?: string;
    limit?: number;
    userId?: string | null;
}): Promise<Array<DbItem & {
    creator?: {
        email: string;
    };
}>>;
export declare function updateItem(sb: Supabase, tenantId: string, id: string, fields: Record<string, unknown>): Promise<Record<string, unknown>>;
export declare function deleteItem(sb: Supabase, tenantId: string, id: string): Promise<unknown>;
export declare function countItems(sb: Supabase, tenantId: string, filters?: Record<string, unknown>): Promise<number>;
export declare function countItemsOlderThan(sb: Supabase, tenantId: string, dateISO: string): Promise<number>;
export declare function countItemsSince(sb: Supabase, tenantId: string, dateISO: string): Promise<number>;
export declare function findOldItems(sb: Supabase, tenantId: string, olderThanISO: string): Promise<Array<{
    id: string;
    images: ItemImage[];
}>>;
export declare function deleteItemsOlderThan(sb: Supabase, tenantId: string, olderThanISO: string): Promise<unknown>;
export declare function getItemsByTypeCount(sb: Supabase, tenantId: string): Promise<Array<{
    type: string;
    count: number;
}>>;
export declare function getTopCreators(sb: Supabase, tenantId: string, limit?: number): Promise<Array<{
    _id: string;
    count: number;
    email: string;
}>>;
export declare function getCheckedItemIds(sb: Supabase, userId: string): Promise<string[]>;
export declare function checkItem(sb: Supabase, itemId: string, userId: string): Promise<unknown>;
export declare function uncheckItem(sb: Supabase, itemId: string, userId: string): Promise<unknown>;
export declare function deleteChecksForItems(sb: Supabase, itemIds: string[]): Promise<void>;
export declare function deleteChecksForUser(sb: Supabase, userId: string): Promise<unknown>;
export declare function getPinnedItemIds(sb: Supabase, userId: string): Promise<string[]>;
export declare function pinItem(sb: Supabase, itemId: string, userId: string): Promise<unknown>;
export declare function unpinItem(sb: Supabase, itemId: string, userId: string): Promise<unknown>;
export declare function deletePinsForUser(sb: Supabase, userId: string): Promise<unknown>;
export declare function createReport(sb: Supabase, report: ReportInput): Promise<DbReport>;
export declare function listReports(sb: Supabase, { limit }?: {
    limit?: number;
}): Promise<DbReport[]>;
export declare function updateReport(sb: Supabase, id: string, fields: Record<string, unknown>): Promise<DbReport>;
export declare function deleteReport(sb: Supabase, id: string): Promise<unknown>;
export declare function countReports(sb: Supabase, filters?: Record<string, unknown>): Promise<number>;
export declare function listTodos(sb: Supabase, userId: string): Promise<DbEncryptedTodo[]>;
export declare function createTodo(sb: Supabase, todo: TodoCreateInput): Promise<DbEncryptedTodo>;
export declare function findTodoById(sb: Supabase, id: string, userId: string): Promise<DbEncryptedTodo | null>;
export declare function updateTodo(sb: Supabase, id: string, fields: Record<string, unknown>): Promise<DbEncryptedTodo>;
export declare function deleteTodo(sb: Supabase, id: string, userId: string): Promise<unknown>;
export declare function deleteTodosForUser(sb: Supabase, userId: string): Promise<unknown>;
export declare function listIncompleteTodos(sb: Supabase, userId: string): Promise<DbEncryptedTodo[]>;
export declare function getFirstTodo(sb: Supabase, userId: string): Promise<DbEncryptedTodo | null>;
export declare function listSubjects(sb: Supabase, tenantId: string): Promise<DbSubject[]>;
export declare function upsertSubject(sb: Supabase, tenantId: string, name: string): Promise<unknown>;
export declare function deleteSubject(sb: Supabase, tenantId: string, name: string): Promise<unknown>;
export declare function listAnnouncements(sb: Supabase, tenantId: string, limit?: number): Promise<DbAnnouncement[]>;
export declare function createAnnouncement(sb: Supabase, tenantId: string, ann: AnnouncementInput): Promise<DbAnnouncement>;
export declare function findAnnouncementById(sb: Supabase, tenantId: string, id: string): Promise<DbAnnouncement | null>;
export declare function deleteAnnouncement(sb: Supabase, tenantId: string, id: string): Promise<unknown>;
export declare function createSorge(sb: Supabase, message: string): Promise<DbSorge>;
export declare function listSorgen(sb: Supabase, limit?: number): Promise<DbSorge[]>;
export declare function updateSorge(sb: Supabase, id: string, fields: Record<string, unknown>): Promise<DbSorge>;
export declare function deleteSorge(sb: Supabase, id: string): Promise<unknown>;
export declare function countSorgen(sb: Supabase, filters?: Record<string, unknown>): Promise<number>;
export declare function getTimetableLessons(sb: Supabase, tenantId: string): Promise<DbTimetableLesson[]>;
export declare function listTimetableSubs(sb: Supabase, tenantId: string): Promise<DbTimetableSub[]>;
export declare function createTimetableSub(sb: Supabase, tenantId: string, sub: TimetableSubInput): Promise<DbTimetableSub>;
export declare function deleteTimetableSub(sb: Supabase, tenantId: string, id: string): Promise<DbTimetableSub>;
export declare function getSharedDoc(sb: Supabase): Promise<DbAdminSharedDoc | null>;
export declare function upsertSharedDoc(sb: Supabase, doc: SharedDocInput): Promise<unknown>;
export declare function logSecurityEvent(sb: Supabase, event: SecurityEventInput): Promise<void>;
export declare function listPersons(sb: Supabase, tenantId: string): Promise<DbPerson[]>;
export declare function listDaltonSchedule(sb: Supabase, tenantId: string): Promise<DbDaltonSchedule[]>;
export declare function getItemVisibility(sb: Supabase, userId: string): Promise<ItemVisibility>;
export declare function setItemVisibility(sb: Supabase, itemId: string, userId: string, status: string): Promise<unknown>;
export declare function removeItemVisibility(sb: Supabase, itemId: string, userId: string): Promise<unknown>;
//# sourceMappingURL=db.d.ts.map