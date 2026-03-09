/**
 * types/index.ts — Shared type definitions for the entire backend.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { v2 as cloudinaryType } from 'cloudinary';
import type { Resend } from 'resend';
import type { Server as SocketIOServer } from 'socket.io';

// ─── Express augmentations ──────────────────────────────────────────────────

/** User context attached by requireAuth / checkAuth middleware. */
export interface AuthUser {
  sub: string;
  email: string;
  globalRole: 'superadmin' | 'user';
}

/** MFA pending context attached by verifyMfaPendingToken middleware. */
export interface MfaPendingContext {
  sub: string;
  email: string;
}

/**
 * Augment Express Request with custom properties set by middleware.
 * Using module augmentation so every handler sees these fields.
 */
declare global {
  namespace Express {
    interface Request {
      user: AuthUser | null;
      userId: string | null;
      activeGroupId: string | null;
      tenantId?: string;
      tenantRole?: string;
      mfaPending?: MfaPendingContext;
    }
  }
}

// ─── Encryption ─────────────────────────────────────────────────────────────

export interface EncryptedPayload {
  iv: string;
  data: string;
  authTag: string;
}

// ─── DB model types (based on Supabase schema) ─────────────────────────────

export interface DbGroup {
  id: string;
  name: string;
  passcode_hash: string;
  created_at: string;
}

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  email_verified: boolean;
  mfa_enabled: boolean;
  mfa_secret: EncryptedPayload | null;
  theater: number;
  done_setup: boolean;
  personalized: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  preferences: Record<string, unknown>;
  enr_kurs: string | null;
  wpu_kurs_1: string | null;
  wpu_kurs_2: string | null;
  // Joined relations (optional, depends on select)
  user_roles?: Array<{
    tenant_id: string | null;
    roles: { name: string } | null;
  }>;
  creator?: { email: string };
}

export interface DbBannedUser {
  id: string;
  user_id: string;
  banned_at: string;
}

export interface DbUserActivity {
  id: string;
  user_id: string;
  type: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface DbVerification {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface DbPasswordReset {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface DbMfaPendingSecret {
  id: string;
  user_id: string;
  encrypted_secret: EncryptedPayload;
  expires_at: string;
  created_at: string;
}

export type ItemType = 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG';

export interface ItemImage {
  publicId: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
  url?: string;
  thumbUrl?: string;
}

export interface DbItem {
  id: string;
  type: ItemType;
  title: string;
  subject: string;
  description: string;
  images: ItemImage[];
  due_date: string;
  created_by: string;
  editor_note: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  // Joined
  creator?: { email: string };
}

export interface DbKeepChecked {
  id: string;
  item_id: string;
  user_id: string;
  checked_at: string;
}

export interface DbPinnedItem {
  id: string;
  item_id: string;
  user_id: string;
  pinned_at: string;
}

export type ReportCategory = 'illegal' | 'falschinfo';

export interface DbReport {
  id: string;
  item_id: string;
  item_title: string;
  category: ReportCategory;
  reason: string | null;
  reporter_id: string | null;
  reporter_email: string;
  reported_at: string;
  processed: boolean;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
}

export interface DbEncryptedTodo {
  id: string;
  user_id: string;
  encrypted_title: EncryptedPayload;
  encrypted_description: EncryptedPayload | null;
  completed: boolean;
  position: string;
  created_at: string;
  updated_at: string;
}

export interface DbSubject {
  id: string;
  name: string;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  courses?: Array<{ id: string; name: string }>;
}

export interface DbAnnouncement {
  id: string;
  content: string;
  color: string;
  show_as_popup: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

export interface DbSorge {
  id: string;
  message: string;
  processed: boolean;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
}

export interface DbTimetableLesson {
  id: string;
  day: number;
  slot: number;
  duration: number;
  room: string | null;
  course_id: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  persons?: {
    id: string;
    name?: string;
    title?: string;
    short?: string;
  } | null;
  subjects?: { id: string; name: string } | null;
  courses?: { id: string; name: string } | null;
}

export interface DbTimetableSub {
  id: string;
  lesson_id: string;
  day: string | null;
  slot: number | null;
  duration: number | null;
  subject: string | null;
  teacher: string | null;
  room: string | null;
  cancelled: boolean;
  hide: boolean;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

export interface DbPerson {
  id: string;
  name: string;
  title: string | null;
  short: string | null;
  tenant_id: string;
  person_subjects?: Array<{ subjects: { name: string } }>;
}

export interface DbDaltonSchedule {
  id: string;
  room: string;
  size: number;
  mo_person_id: string | null;
  di_person_id: string | null;
  mi_person_id: string | null;
  do_person_id: string | null;
  fr_person_id: string | null;
  tenant_id: string;
}

export interface DbAdminSharedDoc {
  id: number;
  content: string;
  version: number;
  last_edited_by: string | null;
  last_edited_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface DbSecurityEvent {
  id: string;
  event_type: string;
  event_status: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbUserItemVisibility {
  id: string;
  item_id: string;
  user_id: string;
  archived_at: string;
  status: 'archived' | 'kept';
}

export interface DbRole {
  id: number;
  name: string;
  description: string | null;
}

export interface DbUserRole {
  user_id: string;
  role_id: number;
  assigned_at: string;
  tenant_id: string | null;
  id: string;
  // Joined
  groups?: { id: string; name: string } | null;
  roles?: { name: string } | null;
}

export interface DbCourse {
  id: string;
  name: string;
  subject_id: string;
  tenant_id: string;
  created_at: string;
}

// ─── Item visibility result ─────────────────────────────────────────────────

export interface ItemVisibility {
  archived: string[];
  kept: string[];
}

// ─── Email service ──────────────────────────────────────────────────────────

export interface EmailService {
  sendVerificationEmail(to: string, verifyUrl: string): Promise<unknown>;
  sendPasswordResetEmail(to: string, code: string): Promise<unknown>;
  sendSecurityEmail(to: string): Promise<unknown>;
}

// ─── Image helpers ──────────────────────────────────────────────────────────

export type TimeColor = 'expired' | 'danger' | 'warn' | 'normal' | 'ok';

export interface ImageWithThumb {
  url: string;
  thumbUrl: string;
  publicId: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

// ─── User filter settings (for timetable personalization) ───────────────────

export interface UserCourseSettings {
  enrKurs: string | null;
  wpuKurs1: string | null;
  wpuKurs2: string | null;
  theater: number;
}

// ─── Doc state ──────────────────────────────────────────────────────────────

export interface DocState {
  content: string;
  version: number;
  lastEditedBy: string | null;
  lastEditedAt: string | null;
}

// ─── Security event input ───────────────────────────────────────────────────

export interface SecurityEventInput {
  eventType: string;
  eventStatus: string;
  ip: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}

// ─── Report input ───────────────────────────────────────────────────────────

export interface ReportInput {
  itemId: string;
  itemTitle: string;
  category: ReportCategory;
  reason?: string | null;
  reporterId?: string | null;
  reporterEmail?: string;
}

// ─── Announcement input ────────────────────────────────────────────────────

export interface AnnouncementInput {
  content: string;
  color?: string;
  showAsPopup?: boolean;
  createdBy: string;
}

// ─── Item creation input ────────────────────────────────────────────────────

export interface ItemCreateInput {
  type: ItemType;
  title: string;
  subject: string;
  description?: string;
  images?: ItemImage[];
  dueDate: string | Date;
  createdBy: string;
  editorNote?: string;
}

// ─── Timetable sub input ───────────────────────────────────────────────────

export interface TimetableSubInput {
  lessonId: string;
  day?: string | null;
  slot?: number | null;
  duration?: number | null;
  subject?: string | null;
  teacher?: string | null;
  room?: string | null;
  cancelled?: boolean;
  hide?: boolean;
}

// ─── Todo creation input ────────────────────────────────────────────────────

export interface TodoCreateInput {
  userId: string;
  encryptedTitle: EncryptedPayload;
  encryptedDescription: EncryptedPayload;
  position?: string;
}

// ─── Group creation input ───────────────────────────────────────────────────

export interface GroupCreateInput {
  name: string;
  passcodeHash: string;
}

// ─── User creation input ────────────────────────────────────────────────────

export interface UserCreateInput {
  email: string;
  passwordHash: string;
}

// ─── Verification creation input ────────────────────────────────────────────

export interface VerificationCreateInput {
  email: string;
  token: string;
  expiresAt: string;
}

// ─── Password reset creation input ──────────────────────────────────────────

export interface PasswordResetCreateInput {
  email: string;
  code: string;
  expiresAt: string;
}

// ─── MFA pending input ─────────────────────────────────────────────────────

export interface MfaPendingInput {
  userId: string;
  encryptedSecret: EncryptedPayload;
  expiresAt: string;
}

// ─── Shared doc input ──────────────────────────────────────────────────────

export interface SharedDocInput {
  content: string;
  version: number;
  lastEditedBy: string | null;
  lastEditedAt: string | null;
}

// ─── Type alias for Supabase client ────────────────────────────────────────

export type Supabase = SupabaseClient;

// ─── Middleware function types ──────────────────────────────────────────────

export type MiddlewareFunction = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;
export type AsyncMiddlewareFunction = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export type RequireAuthFn = (
  secret: string,
  supabase: Supabase,
  requiredRole?: string | string[],
) => RequestHandler;

export type CheckAuthFn = (secret: string) => RequestHandler;

export type SetAuthTokenFn = (
  res: Response,
  secret: string,
  payload: {
    userId: string;
    email: string;
    globalRole: string;
    activeGroupId: string | null;
  },
) => string;

export type ClearAuthTokenFn = (res: Response) => void;

export type ValidateCsrfFn = () => RequestHandler;
export type RotateCsrfTokenFn = (res: Response) => string;
export type ClearCsrfCookieFn = (res: Response) => void;
export type GenerateCsrfTokenFn = () => string;

export type RequireTenantFn = (supabase: Supabase) => RequestHandler;

export type SendJSONErrorFn = (
  res: Response,
  status: number,
  msg: string,
  errors?: unknown[],
) => void;

export type ValidateMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;
export type ValidateItemCreationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;

export type EncryptDataFn = (
  data: string,
  userId: string,
) => Promise<EncryptedPayload>;
export type DecryptDataFn = (
  encryptedData: EncryptedPayload,
  userId: string,
) => Promise<string>;

export type FilterLessonsForUserFn = (
  lessons: DbTimetableLesson[],
  user: UserCourseSettings,
) => DbTimetableLesson[];

export type WithThumbFn = (img: ItemImage) => ImageWithThumb;
export type TimeLeftColorFn = (dueDate: string) => TimeColor;

// ─── RouteDeps — dependency bag passed to all route factories ───────────────

export interface RouteDeps {
  supabase: Supabase;
  cloudinary: typeof cloudinaryType;
  resendClient: Resend | null;
  emailConfigured: boolean;
  emailFrom: string;
  authSecret: string;
  passwordResetSecret: string;
  mfaPendingSecret: string;
  emailService: EmailService;

  // Middleware
  requireAuth: RequireAuthFn;
  checkAuth: CheckAuthFn;
  setAuthToken: SetAuthTokenFn;
  clearAuthToken: ClearAuthTokenFn;
  validateCsrf: ValidateCsrfFn;
  rotateCsrfToken: RotateCsrfTokenFn;
  clearCsrfCookie: ClearCsrfCookieFn;
  generateCsrfToken: GenerateCsrfTokenFn;
  requireTenant: RequireTenantFn;

  // Rate limiters
  dashboardLimiter: RequestHandler;
  authLimiter: RequestHandler;
  passwordResetLimiter: RequestHandler;

  // Validation
  sendJSONError: SendJSONErrorFn;
  validate: ValidateMiddleware;
  validateItemCreation: ValidateItemCreationMiddleware;

  // Utils
  encryptData: EncryptDataFn;
  decryptData: DecryptDataFn;
  filterLessonsForUser: FilterLessonsForUserFn;
  withThumb: WithThumbFn;
  timeLeftColor: TimeLeftColorFn;
}

// ─── DocSocket deps ─────────────────────────────────────────────────────────

export interface DocSocketDeps {
  authSecret: string;
}
