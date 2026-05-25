CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS roles (
                                     id   BIGSERIAL PRIMARY KEY,
                                     name TEXT NOT NULL UNIQUE,
                                     description TEXT
);

INSERT INTO roles (name) VALUES ('superadmin'), ('admin'), ('moderator'), ('user')
    ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
                                     id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    mfa_enabled    BOOLEAN NOT NULL DEFAULT false,
    mfa_secret     JSONB,
    done_setup     BOOLEAN NOT NULL DEFAULT false,
    personalized   BOOLEAN NOT NULL DEFAULT true,
    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    preferences    JSONB NOT NULL DEFAULT '{"theme":"system","language":"de","personalized":"true"}'
    );

CREATE TABLE IF NOT EXISTS banned_users (
                                            id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    banned_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS groups (
                                      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL UNIQUE,
    passcode_hash   TEXT NOT NULL,
    owner_id        UUID NOT NULL REFERENCES users(id),
    schedule_config JSONB NOT NULL DEFAULT '{"breaks":{"2":25,"3":5,"5":40,"7":10},"startTime":"08:00","totalSlots":9,"lessonDurationMins":45}',
    avatar_url      TEXT,
    permissions     JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS user_roles (
                                          id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     BIGINT NOT NULL REFERENCES roles(id),
    tenant_id   UUID REFERENCES groups(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS refresh_tokens (
                                              id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash     TEXT NOT NULL UNIQUE,
    family_id      UUID NOT NULL,
    parent_id      UUID REFERENCES refresh_tokens(id),
    issued_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at     TIMESTAMPTZ NOT NULL,
    used_at        TIMESTAMPTZ,
    revoked_at     TIMESTAMPTZ,
    revoked_reason TEXT CHECK (revoked_reason IN (
                               'logout','logout_all','reuse_detected','password_change',
                               'admin_revoke','account_deleted','mfa_change'
                                                 )),
    user_agent     TEXT,
    ip_address     INET,
    last_used_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id ON refresh_tokens(family_id);

CREATE TABLE IF NOT EXISTS verifications (
                                             id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT NOT NULL,
    token      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS password_resets (
                                               id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT NOT NULL,
    code       TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS user_activity (
                                             id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    meta       JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS mfa_pending_secrets (
                                                   id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    encrypted_secret JSONB NOT NULL,
    expires_at       TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS oauth_accounts (
                                              id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider         TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    provider_email   TEXT NOT NULL,
    linked_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS subjects (
                                        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    tenant_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    category   TEXT NOT NULL DEFAULT 'core' CHECK (category IN ('core','elective','extra')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS courses (
                                       id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    tenant_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS user_courses (
                                            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id  UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, subject_id)
    );

CREATE TABLE IF NOT EXISTS items (
                                     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        TEXT NOT NULL CHECK (type IN ('homework','dalton','exam')),
    title       TEXT NOT NULL,
    subject     TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    images      JSONB NOT NULL DEFAULT '[]',
    due_date    TIMESTAMPTZ NOT NULL,
    created_by  UUID NOT NULL REFERENCES users(id),
    editor_note TEXT NOT NULL DEFAULT '',
    tenant_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_items_tenant_id ON items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_due_date ON items(due_date);

CREATE TABLE IF NOT EXISTS keep_checked (
                                            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id    UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS pinned_items (
                                            id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id   UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pinned_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS user_item_visibility (
                                                    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id     UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      TEXT CHECK (status IN ('archived','kept')),
    archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS reports (
                                       id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id        UUID NOT NULL,
    item_title     TEXT NOT NULL,
    category       TEXT NOT NULL DEFAULT 'illegal' CHECK (category IN ('illegal','falschinfo')),
    reason         TEXT,
    reporter_id    UUID REFERENCES users(id),
    reporter_email TEXT NOT NULL DEFAULT 'anonymous',
    reported_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed      BOOLEAN NOT NULL DEFAULT false,
    processed_at   TIMESTAMPTZ,
    processed_by   UUID REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS encrypted_todos (
                                               id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_title       JSONB NOT NULL,
    encrypted_description JSONB DEFAULT '{"iv":"","data":"","authTag":""}',
    completed             BOOLEAN NOT NULL DEFAULT false,
    position              TEXT DEFAULT '',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON encrypted_todos(user_id);

CREATE TABLE IF NOT EXISTS schedules (
                                         id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day        INTEGER NOT NULL,
    slot       INTEGER NOT NULL,
    duration   INTEGER NOT NULL DEFAULT 1,
    room       TEXT,
    subject_id UUID REFERENCES subjects(id),
    course_id  UUID REFERENCES courses(id),
    tenant_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS schedule_subs (
                                             id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id  UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    day        TEXT,
    slot       INTEGER,
    duration   INTEGER,
    subject    TEXT,
    room       TEXT,
    cancelled  BOOLEAN NOT NULL DEFAULT false,
    hide       BOOLEAN NOT NULL DEFAULT false,
    tenant_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS announcements (
                                             id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content    TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT 'warn',
    created_by UUID REFERENCES users(id),
    tenant_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS user_announcement_read_status (
                                                             id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    read_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS group_messages (
                                              id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    parent_id  UUID REFERENCES group_messages(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
    );

CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON group_messages(tenant_id);

CREATE TABLE IF NOT EXISTS group_bans (
                                          id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    banned_by UUID REFERENCES users(id),
    banned_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS user_tenant_state (
                                                 user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id              UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    last_group_visit_at    TIMESTAMPTZ DEFAULT '1970-01-01 00:00:00+00',
    last_schedule_visit_at TIMESTAMPTZ DEFAULT '1970-01-01 00:00:00+00',
    last_messages_visit_at TIMESTAMPTZ DEFAULT '1970-01-01 00:00:00+00',
    PRIMARY KEY (user_id, tenant_id)
    );

CREATE TABLE IF NOT EXISTS security_events (
                                               id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type  VARCHAR NOT NULL,
    event_status VARCHAR NOT NULL,
    ip_address  INET,
    user_agent  TEXT,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
    );

