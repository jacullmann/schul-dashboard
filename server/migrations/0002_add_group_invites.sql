-- Add group_invites table to support single-use group invitation links
CREATE TABLE public.group_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    token text NOT NULL UNIQUE,
    tenant_id uuid NOT NULL,
    created_by uuid,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX idx_group_invites_token ON public.group_invites USING btree (token);
CREATE INDEX idx_group_invites_tenant_id ON public.group_invites USING btree (tenant_id);

ALTER TABLE ONLY public.group_invites
    ADD CONSTRAINT group_invites_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.group_invites
    ADD CONSTRAINT group_invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
