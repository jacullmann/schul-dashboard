-- Announcements only ever render as info, warn or danger. Any other stored
-- value already fell back to the info style, so it keeps its look as 'info'.
UPDATE public.announcements
SET color = 'info'
WHERE color NOT IN ('info', 'warn', 'danger');

ALTER TABLE public.announcements
    ADD CONSTRAINT announcements_color_check CHECK (color IN ('info', 'warn', 'danger'));
