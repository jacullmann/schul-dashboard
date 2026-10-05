-- Announcements are either plain or important. The danger color was the
-- important one; info and the dropped warn become plain.
ALTER TABLE public.announcements
    ADD COLUMN important boolean NOT NULL DEFAULT false;

-- Converting the color does not edit the announcement, so it keeps its timestamp.
ALTER TABLE public.announcements DISABLE TRIGGER trg_announcements_updated_at;

UPDATE public.announcements
SET important = true
WHERE color = 'danger';

ALTER TABLE public.announcements ENABLE TRIGGER trg_announcements_updated_at;

ALTER TABLE public.announcements
    DROP COLUMN color;
