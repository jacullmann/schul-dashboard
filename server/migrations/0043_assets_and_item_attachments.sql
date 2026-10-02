-- Files now reach Cloudinary only through the server, which checks their type
-- and size first. Every stored file is an `assets` row holding what the server
-- verified; task attachments and group pictures reference those rows instead
-- of carrying client-supplied JSON and URLs.

CREATE TABLE public.assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id text NOT NULL UNIQUE,
    resource_type text NOT NULL CHECK (resource_type IN ('image', 'raw')),
    purpose text NOT NULL CHECK (purpose IN ('attachment', 'thumbnail', 'group_avatar')),
    format text NOT NULL,
    width integer CHECK (width > 0),
    height integer CHECK (height > 0),
    original_name text,
    -- The preview image of an office document.
    thumbnail_id uuid REFERENCES public.assets (id),
    uploaded_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
    uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_uploaded_at ON public.assets (uploaded_at);
CREATE INDEX idx_assets_thumbnail_id ON public.assets (thumbnail_id) WHERE thumbnail_id IS NOT NULL;
CREATE INDEX idx_assets_uploaded_by ON public.assets (uploaded_by);

-- An asset is attached at most once, so removing it from one task can never
-- leave another task pointing at a deleted file.
CREATE TABLE public.item_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL REFERENCES public.items (id) ON DELETE CASCADE,
    asset_id uuid NOT NULL UNIQUE REFERENCES public.assets (id),
    created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_item_attachments_item_id ON public.item_attachments (item_id, created_at);
CREATE INDEX idx_item_attachments_created_by ON public.item_attachments (created_by);

ALTER TABLE public.groups
    ADD COLUMN avatar_id uuid UNIQUE REFERENCES public.assets (id);

-- One-time move of the existing files. Only files something references are
-- carried over; unreferenced uploads were due for deletion anyway.

CREATE FUNCTION pg_temp.existing_user(raw text) RETURNS uuid
    LANGUAGE sql STABLE
AS $$
    SELECT id FROM public.users WHERE id::text = raw
$$;

CREATE FUNCTION pg_temp.positive_int(raw jsonb) RETURNS integer
    LANGUAGE sql IMMUTABLE
AS $$
    SELECT CASE
        WHEN jsonb_typeof(raw) = 'number' AND (raw)::numeric BETWEEN 1 AND 2147483647
        THEN (raw)::numeric::integer
    END
$$;

CREATE TEMPORARY TABLE legacy_images ON COMMIT DROP AS
SELECT i.id AS item_id,
       i.created_at AS item_created_at,
       image.position,
       image.value ->> 'publicId' AS public_id,
       image.value -> 'metadata' AS metadata,
       pg_temp.existing_user(image.value ->> 'createdBy') AS created_by
FROM public.items i
CROSS JOIN LATERAL jsonb_array_elements(
    CASE jsonb_typeof(i.images) WHEN 'array' THEN i.images ELSE '[]'::jsonb END
) WITH ORDINALITY AS image(value, position)
WHERE image.value ->> 'publicId' IS NOT NULL;

INSERT INTO public.assets (public_id, resource_type, purpose, format, uploaded_by, uploaded_at)
SELECT DISTINCT ON (metadata ->> 'thumbnailId')
       metadata ->> 'thumbnailId', 'image', 'thumbnail', 'jpg', created_by, item_created_at
FROM legacy_images
WHERE metadata ->> 'thumbnailId' IS NOT NULL
ORDER BY metadata ->> 'thumbnailId', item_created_at
ON CONFLICT (public_id) DO NOTHING;

-- Office documents are raw assets whose public ID keeps the extension.
INSERT INTO public.assets (
    public_id, resource_type, purpose, format, width, height, original_name,
    thumbnail_id, uploaded_by, uploaded_at
)
SELECT DISTINCT ON (l.public_id)
       l.public_id,
       CASE WHEN office.extension IS NULL THEN 'image' ELSE 'raw' END,
       'attachment',
       lower(COALESCE(office.extension, l.metadata ->> 'format', 'jpg')),
       pg_temp.positive_int(l.metadata -> 'width'),
       pg_temp.positive_int(l.metadata -> 'height'),
       NULLIF(left(btrim(l.metadata ->> 'name'), 255), ''),
       thumbnail.id,
       l.created_by,
       l.item_created_at
FROM legacy_images l
CROSS JOIN LATERAL (
    SELECT (regexp_match(l.public_id, '\.(docx|pptx|xlsx)$', 'i'))[1] AS extension
) office
LEFT JOIN public.assets thumbnail ON thumbnail.public_id = l.metadata ->> 'thumbnailId'
ORDER BY l.public_id, l.item_created_at
ON CONFLICT (public_id) DO NOTHING;

-- The position keeps the order the images had within their task.
INSERT INTO public.item_attachments (item_id, asset_id, created_by, created_at)
SELECT l.item_id, a.id, l.created_by, l.item_created_at + l.position * interval '1 microsecond'
FROM legacy_images l
JOIN public.assets a ON a.public_id = l.public_id AND a.purpose = 'attachment'
ON CONFLICT (asset_id) DO NOTHING;

-- Group pictures were stored as delivery URLs (…/upload/v123/<public_id>.<format>).
CREATE TEMPORARY TABLE legacy_avatars ON COMMIT DROP AS
SELECT g.id AS group_id, g.owner_id, g.created_at, match[1] AS public_id, lower(match[2]) AS format
FROM public.groups g
CROSS JOIN LATERAL regexp_match(g.avatar_url, '/image/upload/(?:v[0-9]+/)?(.+)\.([A-Za-z0-9]+)$') AS match
WHERE g.avatar_url IS NOT NULL;

INSERT INTO public.assets (public_id, resource_type, purpose, format, uploaded_by, uploaded_at)
SELECT DISTINCT ON (public_id) public_id, 'image', 'group_avatar', format, owner_id, created_at
FROM legacy_avatars
ORDER BY public_id, created_at
ON CONFLICT (public_id) DO NOTHING;

UPDATE public.groups g
SET avatar_id = a.id
FROM (
    SELECT DISTINCT ON (l.public_id) l.group_id, l.public_id
    FROM legacy_avatars l
    ORDER BY l.public_id, l.created_at
) first_use
JOIN public.assets a ON a.public_id = first_use.public_id AND a.purpose = 'group_avatar'
WHERE g.id = first_use.group_id;

-- Report snapshots keep the attachments in the shape the API now returns.
UPDATE public.reports r
SET details = (r.details - 'itemImages') || jsonb_build_object(
    'itemAttachments',
    COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
                   'publicId', image.value ->> 'publicId',
                   'resourceType', CASE WHEN image.value ->> 'publicId' ~* '\.(docx|pptx|xlsx)$'
                                        THEN 'raw' ELSE 'image' END,
                   'format', lower(COALESCE(
                       (regexp_match(image.value ->> 'publicId', '\.(docx|pptx|xlsx)$', 'i'))[1],
                       image.value -> 'metadata' ->> 'format',
                       'jpg')),
                   'name', image.value -> 'metadata' ->> 'name',
                   'thumbnailPublicId', image.value -> 'metadata' ->> 'thumbnailId'
               ) ORDER BY image.position)
        FROM jsonb_array_elements(r.details -> 'itemImages') WITH ORDINALITY AS image(value, position)
        WHERE image.value ->> 'publicId' IS NOT NULL
    ), '[]'::jsonb)
)
WHERE jsonb_typeof(r.details -> 'itemImages') = 'array';

DROP FUNCTION public.orphaned_assets();
DROP VIEW public.referenced_assets;
DROP FUNCTION public.item_asset_ids(jsonb);
DROP TABLE public.uploaded_assets;

ALTER TABLE public.items DROP COLUMN images;
ALTER TABLE public.groups DROP COLUMN avatar_url;

-- Files nothing references. The server attaches an upload only within half
-- this grace period after it arrived, so the sweep can never delete a file
-- that is just being attached. A thumbnail is freed once its document is gone.
CREATE FUNCTION public.orphaned_assets()
    RETURNS SETOF public.assets
    LANGUAGE sql
    STABLE
    SET search_path TO 'public'
AS $$
    SELECT a.*
    FROM assets a
    WHERE a.uploaded_at < now() - interval '1 day'
      AND NOT EXISTS (SELECT 1 FROM item_attachments WHERE asset_id = a.id)
      AND NOT EXISTS (SELECT 1 FROM groups WHERE avatar_id = a.id)
      AND NOT EXISTS (SELECT 1 FROM assets document WHERE document.thumbnail_id = a.id)
$$;

DROP FUNCTION pg_temp.existing_user(text);
DROP FUNCTION pg_temp.positive_int(jsonb);
