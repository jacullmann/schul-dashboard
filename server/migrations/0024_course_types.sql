-- GK/LK/ZK describe a course, not a subject: a maths subject can offer one LK
-- and two GK courses at the same time. Subjects keep only the three selection
-- categories every group type has, and the course carries its own type.

-- The old subject category already held what is now the course type, so the
-- backfill has to run before the categories are rewritten below.
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS course_type text;

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_course_type_check;
ALTER TABLE public.courses
    ADD CONSTRAINT courses_course_type_check
        CHECK ((course_type IS NULL OR course_type = ANY (ARRAY['gk'::text, 'lk'::text, 'zk'::text])));

UPDATE public.courses c
SET course_type = s.category
FROM public.subjects s
WHERE c.subject_id = s.id
  AND c.course_type IS NULL
  AND s.category = ANY (ARRAY['gk'::text, 'lk'::text, 'zk'::text]);

-- 'mandatory' (Pflichtfach) and 'optional' (Wahlfach) are the Abitur
-- counterparts of 'elective' and 'extra'; 'zk' (Zusatzkurs) stays a category of
-- its own because it forces the type of every course below it.
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_category_check;

UPDATE public.subjects
SET category = 'mandatory'
WHERE category = ANY (ARRAY['gk'::text, 'lk'::text]);

ALTER TABLE public.subjects
    ADD CONSTRAINT subjects_category_check
        CHECK ((category = ANY (ARRAY['core'::text, 'elective'::text, 'extra'::text,
                                      'mandatory'::text, 'optional'::text, 'zk'::text])));

-- Every course of a Zusatzkurs subject is a ZK, and a course in a regular group
-- has no type at all.
UPDATE public.courses c
SET course_type = 'zk'
FROM public.subjects s
WHERE c.subject_id = s.id AND s.category = 'zk' AND c.course_type IS DISTINCT FROM 'zk';

UPDATE public.courses c
SET course_type = NULL
FROM public.subjects s
WHERE c.subject_id = s.id
  AND s.category = ANY (ARRAY['core'::text, 'elective'::text, 'extra'::text])
  AND c.course_type IS NOT NULL;

UPDATE public.courses c
SET course_type = 'gk'
FROM public.subjects s
WHERE c.subject_id = s.id
  AND s.category = ANY (ARRAY['mandatory'::text, 'optional'::text])
  AND c.course_type IS NULL;
