-- A hidden lesson did not take place, so it stays off the schedule as a
-- cancellation instead of reappearing once the flag is gone.
UPDATE public.schedule_subs
SET cancelled = true
WHERE hide;

ALTER TABLE public.schedule_subs
    DROP COLUMN hide;
