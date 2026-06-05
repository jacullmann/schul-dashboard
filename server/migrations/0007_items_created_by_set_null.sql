ALTER TABLE public.items
DROP CONSTRAINT items_created_by_fkey;

ALTER TABLE public.items
    ADD CONSTRAINT items_created_by_fkey
        FOREIGN KEY (created_by)
            REFERENCES public.users(id)
            ON DELETE SET NULL;
