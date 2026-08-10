-- Step 1: Populate missing subject_id from courses if subject_id is NULL
UPDATE public.schedules s
SET subject_id = c.subject_id
FROM public.courses c
WHERE s.course_id = c.id AND s.subject_id IS NULL;

-- Step 2: Consolidate duplicate schedule rows (same tenant, day, slot, duration, room, subject_id)
WITH duplicates AS (
    SELECT id,
           MIN(id) OVER (
               PARTITION BY tenant_id, day, slot, duration, COALESCE(room, ''), COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid)
           ) as canonical_id
    FROM public.schedules
),
dups_to_delete AS (
    SELECT id, canonical_id FROM duplicates WHERE id <> canonical_id
),
update_subs AS (
    UPDATE public.schedule_subs sub
    SET lesson_id = d.canonical_id
    FROM dups_to_delete d
    WHERE sub.lesson_id = d.id
)
DELETE FROM public.schedules
WHERE id IN (SELECT id FROM dups_to_delete);

-- Step 3: Drop index and foreign key on course_id
DROP INDEX IF EXISTS public.idx_timetables_course_id;
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS timetables_course_id_fkey;

-- Step 4: Drop course_id column from public.schedules
ALTER TABLE public.schedules DROP COLUMN IF EXISTS course_id;
