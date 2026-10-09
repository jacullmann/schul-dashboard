-- Platform-wide switches superadmins flip from the admin overview: pausing
-- sign-ups, and maintenance, which admits nobody but superadmins. Both live in
-- a single row, which the CHECK keeps the only one, so every request reads it
-- by primary key.
CREATE TABLE public.access_controls (
    id                  boolean PRIMARY KEY DEFAULT true
        CONSTRAINT access_controls_single_row CHECK (id),
    registration_paused boolean NOT NULL DEFAULT false,
    maintenance         boolean NOT NULL DEFAULT false,
    updated_by          uuid REFERENCES public.users (id) ON DELETE SET NULL,
    updated_at          timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO public.access_controls DEFAULT VALUES;
