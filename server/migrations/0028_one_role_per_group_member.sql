-- A member holds exactly one role per group. The old unique index included
-- role_id and so allowed several roles side by side; keep the most
-- privileged one (lowest role id) before tightening it.
DELETE FROM public.user_roles ur
USING public.user_roles keep
WHERE ur.tenant_id IS NOT NULL
  AND keep.user_id = ur.user_id
  AND keep.tenant_id = ur.tenant_id
  AND (keep.role_id, keep.id) < (ur.role_id, ur.id);

DROP INDEX IF EXISTS public.unique_user_role_tenant;

CREATE UNIQUE INDEX unique_user_role_tenant
    ON public.user_roles USING btree (user_id, tenant_id)
    WHERE (tenant_id IS NOT NULL);

-- Member lists, counts and cascades look rows up by group.
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id
    ON public.user_roles USING btree (tenant_id)
    WHERE (tenant_id IS NOT NULL);
