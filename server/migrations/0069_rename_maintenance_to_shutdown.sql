-- The switch that admits nobody but superadmins is called shutdown throughout.
ALTER TABLE public.access_controls RENAME COLUMN maintenance TO shutdown;
