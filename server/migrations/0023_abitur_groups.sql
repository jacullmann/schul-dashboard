-- Groups are either a regular class or an Abitur year. Abitur groups schedule
-- every course individually and use the GK/LK/ZK subject categories.
ALTER TABLE public.groups
    ADD COLUMN IF NOT EXISTS group_type text DEFAULT 'regular'::text NOT NULL;

ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_group_type_check;
ALTER TABLE public.groups
    ADD CONSTRAINT groups_group_type_check
        CHECK ((group_type = ANY (ARRAY['regular'::text, 'abitur'::text])));

-- 'gk' (Grundkurs), 'lk' (Leistungskurs) and 'zk' (Zusatzkurs) are the Abitur
-- counterparts of the regular categories. Existing rows keep their category,
-- so a group switching its type never invalidates its subjects.
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_category_check;
ALTER TABLE public.subjects
    ADD CONSTRAINT subjects_category_check
        CHECK ((category = ANY (ARRAY['core'::text, 'elective'::text, 'extra'::text,
                                      'gk'::text, 'lk'::text, 'zk'::text])));

-- Restores per-course lessons: in an Abitur group each course of a subject has
-- its own slots, a NULL course still means "the whole year".
ALTER TABLE public.schedules
    ADD COLUMN IF NOT EXISTS course_id uuid;

ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_course_id_fkey;
ALTER TABLE public.schedules
    ADD CONSTRAINT schedules_course_id_fkey
        FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_schedules_course_id ON public.schedules USING btree (course_id);
