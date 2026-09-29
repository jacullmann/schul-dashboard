-- Tasks used to name their subject and course in one free-text column
-- ("<subject> - <course>"), so renaming either silently detached every task
-- from it. They now point at both by id; only a subject typed in by hand that
-- the group does not offer keeps a free-text label.

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS subject_id uuid;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS course_id uuid;
ALTER TABLE public.items RENAME COLUMN subject TO custom_subject;
ALTER TABLE public.items ALTER COLUMN custom_subject DROP NOT NULL;

-- Matching the whole label against "<subject> - <course>" keeps names that
-- contain " - " themselves intact.
UPDATE public.items i
SET subject_id = s.id, course_id = c.id
FROM public.subjects s
JOIN public.courses c ON c.subject_id = s.id
WHERE s.tenant_id = i.tenant_id
  AND lower(btrim(i.custom_subject)) = lower(btrim(s.name) || ' - ' || btrim(c.name));

UPDATE public.items i
SET subject_id = s.id
FROM public.subjects s
WHERE i.subject_id IS NULL
  AND s.tenant_id = i.tenant_id
  AND lower(btrim(i.custom_subject)) = lower(btrim(s.name));

UPDATE public.items SET custom_subject = NULL WHERE subject_id IS NOT NULL;
UPDATE public.items SET custom_subject = btrim(custom_subject) WHERE custom_subject IS NOT NULL;

-- Names are compared case-insensitively everywhere, so "Mathe" and "mathe" may
-- no longer coexist. Later duplicates get a numbered suffix instead of failing.
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_name_tenant_unique;
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_name_subject_unique;

WITH ranked AS (
    SELECT id,
           btrim(name) AS trimmed,
           row_number() OVER (PARTITION BY tenant_id, lower(btrim(name)) ORDER BY created_at, id) AS rn
    FROM public.subjects
)
UPDATE public.subjects s
SET name = CASE WHEN r.rn = 1 THEN r.trimmed ELSE r.trimmed || ' (' || r.rn || ')' END
FROM ranked r
WHERE s.id = r.id AND (r.rn > 1 OR s.name <> r.trimmed);

WITH ranked AS (
    SELECT id,
           btrim(name) AS trimmed,
           row_number() OVER (PARTITION BY subject_id, lower(btrim(name)) ORDER BY created_at, id) AS rn
    FROM public.courses
)
UPDATE public.courses c
SET name = CASE WHEN r.rn = 1 THEN r.trimmed ELSE r.trimmed || ' (' || r.rn || ')' END
FROM ranked r
WHERE c.id = r.id AND (r.rn > 1 OR c.name <> r.trimmed);

CREATE UNIQUE INDEX IF NOT EXISTS subjects_tenant_name_ci_key
    ON public.subjects USING btree (tenant_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS courses_subject_name_ci_key
    ON public.courses USING btree (subject_id, lower(name));

-- Composite keys let the database itself guarantee that a task's subject lives
-- in the task's group and that its course belongs to that subject.
ALTER TABLE public.subjects
    ADD CONSTRAINT subjects_id_tenant_id_key UNIQUE (id, tenant_id);

-- NO ACTION instead of SET NULL: deleting a subject has to hand its name down
-- to the tasks first (see GroupAdminService::delete_subject), and the check
-- runs at the end of the statement, so deleting a whole group still cascades.
ALTER TABLE public.items
    ADD CONSTRAINT items_subject_tenant_fkey
        FOREIGN KEY (subject_id, tenant_id) REFERENCES public.subjects (id, tenant_id);

-- A deleted course turns its tasks into tasks for the whole subject.
ALTER TABLE public.items
    ADD CONSTRAINT items_course_subject_fkey
        FOREIGN KEY (course_id, subject_id) REFERENCES public.courses (id, subject_id)
        ON DELETE SET NULL (course_id);

ALTER TABLE public.items
    ADD CONSTRAINT items_subject_xor_custom_check
        CHECK ((subject_id IS NULL) <> (custom_subject IS NULL));

ALTER TABLE public.items
    ADD CONSTRAINT items_course_needs_subject_check
        CHECK (course_id IS NULL OR subject_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_items_subject_id ON public.items USING btree (subject_id);
CREATE INDEX IF NOT EXISTS idx_items_course_id ON public.items USING btree (course_id);
