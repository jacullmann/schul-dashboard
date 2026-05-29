CREATE FUNCTION public.cleanup_expired_mfa_pending() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
DELETE FROM public.mfa_pending_secrets WHERE expires_at < now();
END;
$$;

CREATE FUNCTION public.cleanup_expired_refresh_tokens() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
deleted_count integer;
BEGIN
WITH del AS (
DELETE FROM public.refresh_tokens
WHERE (expires_at < now() - interval '30 days')
   OR (revoked_at IS NOT NULL AND revoked_at < now() - interval '30 days')
    RETURNING 1
  )
SELECT count(*) INTO deleted_count FROM del;
RETURN deleted_count;
END;
$$;

CREATE FUNCTION public.get_unread_status(p_user_id uuid) RETURNS TABLE(tenant_id uuid, has_unread_announcements boolean, has_unread_timetable_subs boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$BEGIN
  RETURN QUERY
SELECT
    ur.tenant_id,
    EXISTS (
        SELECT 1 FROM announcements a
        WHERE a.tenant_id = ur.tenant_id
          AND a.show_as_popup = true
          AND a.created_at > COALESCE(t.last_group_visit_at, '1970-01-01'::timestamptz)
    ) as has_unread_announcements,
    EXISTS (
        SELECT 1 FROM schedule_subs ts
        WHERE ts.tenant_id = ur.tenant_id
          AND ts.created_at > COALESCE(t.last_schedule_visit_at, '1970-01-01'::timestamptz)
    ) as has_unread_schedule_subs
FROM user_roles ur
         LEFT JOIN user_tenant_state t ON t.tenant_id = ur.tenant_id AND t.user_id = ur.user_id
WHERE ur.user_id = p_user_id
  AND ur.tenant_id IS NOT NULL;
END;$$;

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
RETURN NEW;
END;
$$;

CREATE FUNCTION public.upsert_user_tenant_visit(p_user_id uuid, p_tenant_id uuid, p_visit_type text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$BEGIN
  IF p_visit_type = 'group' THEN
    INSERT INTO user_tenant_state (user_id, tenant_id, last_group_visit_at)
    VALUES (p_user_id, p_tenant_id, now())
    ON CONFLICT (user_id, tenant_id)
    DO UPDATE SET last_group_visit_at = now();
ELSIF p_visit_type = 'timetable' THEN
    INSERT INTO user_tenant_state (user_id, tenant_id, last_schedule_visit_at)
    VALUES (p_user_id, p_tenant_id, now())
    ON CONFLICT (user_id, tenant_id)
    DO UPDATE SET last_schedule_visit_at = now();
END IF;
END;$$;

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public.announcements (
                                      id uuid DEFAULT gen_random_uuid() NOT NULL,
                                      content text NOT NULL,
                                      color text DEFAULT 'warn'::text NOT NULL,
                                      created_by uuid,
                                      created_at timestamp with time zone DEFAULT now() NOT NULL,
                                      updated_at timestamp with time zone DEFAULT now() NOT NULL,
                                      tenant_id uuid NOT NULL
);

CREATE TABLE public.banned_users (
                                     id uuid DEFAULT gen_random_uuid() NOT NULL,
                                     user_id uuid NOT NULL,
                                     banned_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.courses (
                                id uuid DEFAULT gen_random_uuid() NOT NULL,
                                name text NOT NULL,
                                subject_id uuid NOT NULL,
                                tenant_id uuid NOT NULL,
                                created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.encrypted_todos (
                                        id uuid DEFAULT gen_random_uuid() NOT NULL,
                                        user_id uuid NOT NULL,
                                        encrypted_title jsonb NOT NULL,
                                        encrypted_description jsonb DEFAULT '{"iv": "", "data": "", "authTag": ""}'::jsonb,
                                        completed boolean DEFAULT false NOT NULL,
                                        "position" text DEFAULT ''::text,
                                        created_at timestamp with time zone DEFAULT now() NOT NULL,
                                        updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.group_bans (
                                   id uuid DEFAULT gen_random_uuid() NOT NULL,
                                   user_id uuid NOT NULL,
                                   tenant_id uuid NOT NULL,
                                   banned_by uuid,
                                   banned_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.group_messages (
                                       id uuid DEFAULT gen_random_uuid() NOT NULL,
                                       tenant_id uuid NOT NULL,
                                       user_id uuid NOT NULL,
                                       content text NOT NULL,
                                       parent_id uuid,
                                       created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
                                       updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.groups (
                               id uuid DEFAULT gen_random_uuid() NOT NULL,
                               name text NOT NULL,
                               created_at timestamp with time zone DEFAULT now() NOT NULL,
                               passcode_hash text NOT NULL,
                               owner_id uuid NOT NULL,
                               schedule_config jsonb DEFAULT '{"breaks": {"2": 25, "3": 5, "5": 40, "7": 10}, "startTime": "08:00", "totalSlots": 9, "lessonDurationMins": 45}'::jsonb NOT NULL,
                               avatar_url text,
                               permissions jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public.items (
                              id uuid DEFAULT gen_random_uuid() NOT NULL,
                              type text NOT NULL,
                              title text NOT NULL,
                              subject text NOT NULL,
                              description text DEFAULT ''::text,
                              images jsonb DEFAULT '[]'::jsonb,
                              due_date timestamp with time zone NOT NULL,
                              created_by uuid NOT NULL,
                              editor_note text DEFAULT ''::text,
                              created_at timestamp with time zone DEFAULT now() NOT NULL,
                              updated_at timestamp with time zone DEFAULT now() NOT NULL,
                              tenant_id uuid NOT NULL,
                              CONSTRAINT items_type_check CHECK ((type = ANY (ARRAY['homework'::text, 'dalton'::text, 'exam'::text])))
);

CREATE TABLE public.keep_checked (
                                     id uuid DEFAULT gen_random_uuid() NOT NULL,
                                     item_id uuid NOT NULL,
                                     user_id uuid NOT NULL,
                                     checked_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.mfa_pending_secrets (
                                            id uuid DEFAULT gen_random_uuid() NOT NULL,
                                            user_id uuid NOT NULL,
                                            encrypted_secret jsonb NOT NULL,
                                            expires_at timestamp with time zone NOT NULL,
                                            created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.oauth_accounts (
                                       id uuid DEFAULT gen_random_uuid() NOT NULL,
                                       user_id uuid NOT NULL,
                                       provider text NOT NULL,
                                       provider_user_id text NOT NULL,
                                       provider_email text NOT NULL,
                                       linked_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.password_resets (
                                        id uuid DEFAULT gen_random_uuid() NOT NULL,
                                        email text NOT NULL,
                                        code text NOT NULL,
                                        expires_at timestamp with time zone NOT NULL,
                                        used boolean DEFAULT false NOT NULL,
                                        created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.pinned_items (
                                     id uuid DEFAULT gen_random_uuid() NOT NULL,
                                     item_id uuid NOT NULL,
                                     user_id uuid NOT NULL,
                                     pinned_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.refresh_tokens (
                                       id uuid DEFAULT gen_random_uuid() NOT NULL,
                                       user_id uuid NOT NULL,
                                       token_hash text NOT NULL,
                                       family_id uuid NOT NULL,
                                       parent_id uuid,
                                       issued_at timestamp with time zone DEFAULT now() NOT NULL,
                                       expires_at timestamp with time zone NOT NULL,
                                       used_at timestamp with time zone,
                                       revoked_at timestamp with time zone,
                                       revoked_reason text,
                                       user_agent text,
                                       ip_address inet,
                                       last_used_at timestamp with time zone DEFAULT now() NOT NULL,
                                       CONSTRAINT refresh_tokens_revoked_reason_check CHECK ((revoked_reason = ANY (ARRAY['logout'::text, 'logout_all'::text, 'reuse_detected'::text, 'password_change'::text, 'admin_revoke'::text, 'account_deleted'::text, 'mfa_change'::text, 'session_limit'::text])))
);

COMMENT ON TABLE public.refresh_tokens IS 'Opaque refresh tokens with rotation + reuse detection (RFC 9700).';

COMMENT ON COLUMN public.refresh_tokens.token_hash IS 'SHA-256 hex digest of the raw token string.';

COMMENT ON COLUMN public.refresh_tokens.family_id IS 'Shared by all rotated descendants of one login session.';

CREATE TABLE public.reports (
                                id uuid DEFAULT gen_random_uuid() NOT NULL,
                                item_id uuid NOT NULL,
                                item_title text NOT NULL,
                                category text DEFAULT 'illegal'::text NOT NULL,
                                reason text,
                                reporter_id uuid,
                                reporter_email text DEFAULT 'anonymous'::text,
                                reported_at timestamp with time zone DEFAULT now() NOT NULL,
                                processed boolean DEFAULT false NOT NULL,
                                processed_at timestamp with time zone,
                                processed_by uuid,
                                created_at timestamp with time zone DEFAULT now() NOT NULL,
                                CONSTRAINT reports_category_check CHECK ((category = ANY (ARRAY['illegal'::text, 'falschinfo'::text])))
);

CREATE TABLE public.roles (
                              id bigint NOT NULL,
                              name text NOT NULL,
                              description text
);

ALTER TABLE public.roles ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.schedule_subs (
                                      id uuid DEFAULT gen_random_uuid() NOT NULL,
                                      lesson_id uuid NOT NULL,
                                      day text,
                                      slot integer,
                                      duration integer,
                                      subject text,
                                      room text,
                                      cancelled boolean DEFAULT false NOT NULL,
                                      hide boolean DEFAULT false NOT NULL,
                                      created_at timestamp with time zone DEFAULT now() NOT NULL,
                                      updated_at timestamp with time zone DEFAULT now() NOT NULL,
                                      tenant_id uuid NOT NULL
);

CREATE TABLE public.schedules (
                                  id uuid DEFAULT gen_random_uuid() NOT NULL,
                                  day integer NOT NULL,
                                  slot integer NOT NULL,
                                  duration integer DEFAULT 1 NOT NULL,
                                  room text,
                                  subject_id uuid,
                                  course_id uuid,
                                  tenant_id uuid NOT NULL,
                                  created_at timestamp with time zone DEFAULT now() NOT NULL,
                                  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.security_events (
                                        id uuid DEFAULT gen_random_uuid() NOT NULL,
                                        event_type character varying(100) NOT NULL,
                                        event_status character varying(50) NOT NULL,
                                        ip_address inet,
                                        user_agent text,
                                        metadata jsonb DEFAULT '{}'::jsonb,
                                        created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.subjects (
                                 id uuid DEFAULT gen_random_uuid() NOT NULL,
                                 name text NOT NULL,
                                 created_at timestamp with time zone DEFAULT now() NOT NULL,
                                 tenant_id uuid NOT NULL,
                                 is_active boolean DEFAULT true NOT NULL,
                                 category text DEFAULT 'core'::text NOT NULL,
                                 CONSTRAINT subjects_category_check CHECK ((category = ANY (ARRAY['core'::text, 'elective'::text, 'extra'::text])))
);

CREATE TABLE public.user_activity (
                                      id uuid DEFAULT gen_random_uuid() NOT NULL,
                                      user_id uuid NOT NULL,
                                      type text NOT NULL,
                                      meta jsonb DEFAULT '{}'::jsonb,
                                      created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_announcement_read_status (
                                                      id uuid DEFAULT gen_random_uuid() NOT NULL,
                                                      user_id uuid NOT NULL,
                                                      announcement_id uuid NOT NULL,
                                                      read_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_courses (
                                     user_id uuid NOT NULL,
                                     subject_id uuid NOT NULL,
                                     course_id uuid NOT NULL,
                                     enrolled_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_item_visibility (
                                             id uuid DEFAULT gen_random_uuid() NOT NULL,
                                             item_id uuid NOT NULL,
                                             user_id uuid NOT NULL,
                                             archived_at timestamp with time zone DEFAULT now() NOT NULL,
                                             status text,
                                             CONSTRAINT user_item_visibility_status_check CHECK ((status = ANY (ARRAY['archived'::text, 'kept'::text])))
);

CREATE TABLE public.user_roles (
                                   user_id uuid NOT NULL,
                                   role_id integer NOT NULL,
                                   assigned_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
                                   tenant_id uuid,
                                   id uuid DEFAULT gen_random_uuid() NOT NULL
);

CREATE TABLE public.user_tenant_state (
                                          user_id uuid NOT NULL,
                                          tenant_id uuid NOT NULL,
                                          last_group_visit_at timestamp with time zone DEFAULT '1970-01-01 00:00:00+00'::timestamp with time zone,
                                          last_schedule_visit_at timestamp with time zone DEFAULT '1970-01-01 00:00:00+00'::timestamp with time zone,
                                          last_messages_visit_at timestamp with time zone DEFAULT '1970-01-01 00:00:00+00'::timestamp with time zone
);

CREATE TABLE public.users (
                              id uuid DEFAULT gen_random_uuid() NOT NULL,
                              email text NOT NULL,
                              password_hash text,
                              email_verified boolean DEFAULT false NOT NULL,
                              mfa_enabled boolean DEFAULT false NOT NULL,
                              mfa_secret jsonb,
                              done_setup boolean DEFAULT false NOT NULL,
                              personalized boolean DEFAULT true NOT NULL,
                              last_login_at timestamp with time zone,
                              created_at timestamp with time zone DEFAULT now() NOT NULL,
                              updated_at timestamp with time zone DEFAULT now() NOT NULL,
                              preferences jsonb DEFAULT '{"theme": "system", "language": "de", "personalized": "true"}'::jsonb NOT NULL
);

CREATE TABLE public.verifications (
                                      id uuid DEFAULT gen_random_uuid() NOT NULL,
                                      email text NOT NULL,
                                      token text NOT NULL,
                                      expires_at timestamp with time zone NOT NULL,
                                      created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_item_visibility
    ADD CONSTRAINT archived_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.banned_users
    ADD CONSTRAINT banned_users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.banned_users
    ADD CONSTRAINT banned_users_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_id_subject_id_key UNIQUE (id, subject_id);

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_name_subject_unique UNIQUE (name, subject_id);

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.encrypted_todos
    ADD CONSTRAINT encrypted_todos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.group_bans
    ADD CONSTRAINT group_bans_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.group_bans
    ADD CONSTRAINT group_bans_user_tenant_unique UNIQUE (user_id, tenant_id);

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key UNIQUE (name);

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.keep_checked
    ADD CONSTRAINT keep_checked_item_id_user_id_key UNIQUE (item_id, user_id);

ALTER TABLE ONLY public.keep_checked
    ADD CONSTRAINT keep_checked_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.mfa_pending_secrets
    ADD CONSTRAINT mfa_pending_secrets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.mfa_pending_secrets
    ADD CONSTRAINT mfa_pending_secrets_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.oauth_accounts
    ADD CONSTRAINT oauth_accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.oauth_accounts
    ADD CONSTRAINT oauth_accounts_provider_provider_user_id_key UNIQUE (provider, provider_user_id);

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pinned_items
    ADD CONSTRAINT pinned_items_item_id_user_id_key UNIQUE (item_id, user_id);

ALTER TABLE ONLY public.pinned_items
    ADD CONSTRAINT pinned_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_name_tenant_unique UNIQUE (name, tenant_id);

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.schedule_subs
    ADD CONSTRAINT timetable_subs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT timetables_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_activity
    ADD CONSTRAINT user_activity_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_announcement_read_status
    ADD CONSTRAINT user_announcement_read_status_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_announcement_read_status
    ADD CONSTRAINT user_announcement_read_status_user_id_announcement_id_key UNIQUE (user_id, announcement_id);

ALTER TABLE ONLY public.user_courses
    ADD CONSTRAINT user_courses_pkey PRIMARY KEY (user_id, subject_id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_tenant_state
    ADD CONSTRAINT user_tenant_state_pkey PRIMARY KEY (user_id, tenant_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_token_key UNIQUE (token);

CREATE INDEX idx_announcements_created_by ON public.announcements USING btree (created_by);

CREATE INDEX idx_announcements_tenant_id ON public.announcements USING btree (tenant_id);

CREATE INDEX idx_banned_users_user_id ON public.banned_users USING btree (user_id);

CREATE INDEX idx_courses_subject_id ON public.courses USING btree (subject_id);

CREATE INDEX idx_courses_tenant_id ON public.courses USING btree (tenant_id);

CREATE INDEX idx_encrypted_todos_user_id ON public.encrypted_todos USING btree (user_id);

CREATE INDEX idx_group_messages_created_at ON public.group_messages USING btree (created_at);

CREATE INDEX idx_group_messages_tenant_id ON public.group_messages USING btree (tenant_id);

CREATE INDEX idx_items_created_by ON public.items USING btree (created_by);

CREATE INDEX idx_items_due_date ON public.items USING btree (due_date);

CREATE INDEX idx_items_tenant_id ON public.items USING btree (tenant_id);

CREATE INDEX idx_items_type ON public.items USING btree (type);

CREATE INDEX idx_items_type_due ON public.items USING btree (type, due_date);

CREATE INDEX idx_keep_checked_item_id ON public.keep_checked USING btree (item_id);

CREATE INDEX idx_keep_checked_user_id ON public.keep_checked USING btree (user_id);

CREATE INDEX idx_messages_tenant_id ON public.group_messages USING btree (tenant_id);

CREATE INDEX idx_mfa_pending_expires ON public.mfa_pending_secrets USING btree (expires_at);

CREATE INDEX idx_mfa_pending_user ON public.mfa_pending_secrets USING btree (user_id);

CREATE INDEX idx_oauth_accounts_user_id ON public.oauth_accounts USING btree (user_id);

CREATE INDEX idx_password_resets_email_code ON public.password_resets USING btree (email, code);

CREATE INDEX idx_pinned_items_item_id ON public.pinned_items USING btree (item_id);

CREATE INDEX idx_pinned_items_user_id ON public.pinned_items USING btree (user_id);

CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens USING btree (expires_at);

CREATE INDEX idx_refresh_tokens_family_id ON public.refresh_tokens USING btree (family_id);

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);

CREATE INDEX idx_reports_item_id ON public.reports USING btree (item_id);

CREATE INDEX idx_reports_processed ON public.reports USING btree (processed);

CREATE INDEX idx_reports_processed_by ON public.reports USING btree (processed_by);

CREATE INDEX idx_reports_reporter_id ON public.reports USING btree (reporter_id);

CREATE INDEX idx_security_events_created_at ON public.security_events USING btree (created_at DESC);

CREATE INDEX idx_security_events_event_status ON public.security_events USING btree (event_status);

CREATE INDEX idx_security_events_event_type ON public.security_events USING btree (event_type);

CREATE INDEX idx_security_events_ip_address ON public.security_events USING btree (ip_address);

CREATE INDEX idx_security_events_type_status_created ON public.security_events USING btree (event_type, event_status, created_at DESC);

CREATE INDEX idx_subjects_tenant_id ON public.subjects USING btree (tenant_id);

CREATE INDEX idx_timetable_subs_lesson_id ON public.schedule_subs USING btree (lesson_id);

CREATE INDEX idx_timetable_subs_tenant_id ON public.schedule_subs USING btree (tenant_id);

CREATE INDEX idx_timetables_course_id ON public.schedules USING btree (course_id);

CREATE INDEX idx_timetables_subject_id ON public.schedules USING btree (subject_id);

CREATE INDEX idx_timetables_tenant_id ON public.schedules USING btree (tenant_id);

CREATE INDEX idx_todos_user_id ON public.encrypted_todos USING btree (user_id);

CREATE INDEX idx_todos_user_position ON public.encrypted_todos USING btree (user_id, "position");

CREATE INDEX idx_uar_announcement_id ON public.user_announcement_read_status USING btree (announcement_id);

CREATE INDEX idx_uar_user_id ON public.user_announcement_read_status USING btree (user_id);

CREATE INDEX idx_user_activity_created_at ON public.user_activity USING btree (created_at DESC);

CREATE INDEX idx_user_activity_user_created ON public.user_activity USING btree (user_id, created_at DESC);

CREATE INDEX idx_user_activity_user_id ON public.user_activity USING btree (user_id);

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);

CREATE INDEX idx_users_email ON public.users USING btree (email);

CREATE INDEX idx_verifications_email ON public.verifications USING btree (email);

CREATE INDEX idx_verifications_token ON public.verifications USING btree (token);

CREATE UNIQUE INDEX unique_user_role_global ON public.user_roles USING btree (user_id, role_id) WHERE (tenant_id IS NULL);

CREATE UNIQUE INDEX unique_user_role_tenant ON public.user_roles USING btree (user_id, role_id, tenant_id) WHERE (tenant_id IS NOT NULL);

CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_encrypted_todos_updated_at BEFORE UPDATE ON public.encrypted_todos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_timetable_subs_updated_at BEFORE UPDATE ON public.schedule_subs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_timetables_updated_at BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_item_visibility
    ADD CONSTRAINT archived_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_item_visibility
    ADD CONSTRAINT archived_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.banned_users
    ADD CONSTRAINT banned_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON UPDATE RESTRICT ON DELETE CASCADE;

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.encrypted_todos
    ADD CONSTRAINT encrypted_todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_tenant_state
    ADD CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_tenant_state
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.group_bans
    ADD CONSTRAINT group_bans_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.group_bans
    ADD CONSTRAINT group_bans_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.group_bans
    ADD CONSTRAINT group_bans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.group_messages(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.keep_checked
    ADD CONSTRAINT keep_checked_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.keep_checked
    ADD CONSTRAINT keep_checked_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.mfa_pending_secrets
    ADD CONSTRAINT mfa_pending_secrets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.oauth_accounts
    ADD CONSTRAINT oauth_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pinned_items
    ADD CONSTRAINT pinned_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pinned_items
    ADD CONSTRAINT pinned_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.refresh_tokens(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.schedule_subs
    ADD CONSTRAINT timetable_subs_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.schedules(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.schedule_subs
    ADD CONSTRAINT timetable_subs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT timetables_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE RESTRICT ON DELETE SET NULL;

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT timetables_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON UPDATE RESTRICT ON DELETE SET NULL;

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT timetables_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_activity
    ADD CONSTRAINT user_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_announcement_read_status
    ADD CONSTRAINT user_announcement_read_status_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_announcement_read_status
    ADD CONSTRAINT user_announcement_read_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_courses
    ADD CONSTRAINT user_courses_course_subject_fkey FOREIGN KEY (course_id, subject_id) REFERENCES public.courses(id, subject_id) ON DELETE CASCADE;


ALTER TABLE ONLY public.user_courses
    ADD CONSTRAINT user_courses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
