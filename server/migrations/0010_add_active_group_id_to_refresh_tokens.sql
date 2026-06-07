ALTER TABLE refresh_tokens
    ADD COLUMN active_group_id uuid
        REFERENCES groups (id) ON DELETE SET NULL;
