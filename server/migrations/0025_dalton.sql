-- Dalton is opt-in per group. Every group created so far already offered
-- Dalton tasks, so existing rows keep it while new groups start without it.
ALTER TABLE public.groups
    ADD COLUMN IF NOT EXISTS dalton_enabled boolean DEFAULT true NOT NULL;

ALTER TABLE public.groups
    ALTER COLUMN dalton_enabled SET DEFAULT false;

-- A Dalton subject is offered for Dalton tasks. The flag always covers the
-- whole subject, never a single course.
ALTER TABLE public.subjects
    ADD COLUMN IF NOT EXISTS is_dalton boolean DEFAULT false NOT NULL;

-- Dalton itself is a pseudo-subject of the schedule: a Dalton lesson has no
-- subject row and belongs to the whole group, so it can never carry a course.
ALTER TABLE public.schedules
    ADD COLUMN IF NOT EXISTS is_dalton boolean DEFAULT false NOT NULL;

ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_dalton_check;
ALTER TABLE public.schedules
    ADD CONSTRAINT schedules_dalton_check
        CHECK ((NOT is_dalton) OR (subject_id IS NULL AND course_id IS NULL));

-- Groups used to schedule Dalton through a regular subject picked from the
-- translated subject list. Those lessons become Dalton lessons and the subject
-- goes away, unless it carries courses that members may be enrolled in.
UPDATE public.schedules sch
SET is_dalton = true, subject_id = NULL, course_id = NULL
FROM public.subjects s
WHERE sch.subject_id = s.id
  AND lower(trim(s.name)) = 'dalton'
  AND NOT EXISTS (SELECT 1 FROM public.courses c WHERE c.subject_id = s.id);

DELETE FROM public.subjects s
WHERE lower(trim(s.name)) = 'dalton'
  AND NOT EXISTS (SELECT 1 FROM public.courses c WHERE c.subject_id = s.id)
  AND NOT EXISTS (SELECT 1 FROM public.schedules sch WHERE sch.subject_id = s.id);
