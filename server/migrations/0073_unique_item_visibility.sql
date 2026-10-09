-- Archiving a task from two tabs at once could store its visibility twice,
-- which showed the task twice in one list or left it out of another. Each
-- member now has at most one row per task; of any duplicates, the latest is
-- kept.

DELETE FROM public.user_item_visibility older
USING public.user_item_visibility newer
WHERE older.item_id = newer.item_id
  AND older.user_id = newer.user_id
  AND (older.archived_at, older.id) < (newer.archived_at, newer.id);

ALTER TABLE public.user_item_visibility
    ADD CONSTRAINT user_item_visibility_item_id_user_id_key UNIQUE (item_id, user_id);
