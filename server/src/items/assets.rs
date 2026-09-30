use crate::common::cloudinary::Cloudinary;
use serde_json::Value;
use sqlx::PgPool;

/// Public IDs of every file an item's `images` column points at, including the
/// preview images generated for office documents.
pub fn referenced_public_ids(images: &Value) -> impl Iterator<Item = String> + '_ {
    images
        .as_array()
        .into_iter()
        .flatten()
        .flat_map(|img| [&img["publicId"], &img["metadata"]["thumbnailId"]])
        .filter_map(Value::as_str)
        .map(str::to_owned)
}

/// Deletes the files from Cloudinary once the request is done, so neither its
/// latency nor its failure affects the deletion the user asked for.
///
/// Public IDs are chosen by the client, so another task or a group avatar may
/// point at the same file. Only files no longer referenced anywhere are
/// deleted; otherwise removing one's own task could delete someone else's
/// image.
pub fn delete_detached(
    db: PgPool,
    cloudinary: Cloudinary,
    public_ids: impl IntoIterator<Item = String>,
) {
    let mut public_ids: Vec<String> = public_ids
        .into_iter()
        .filter(|id| cloudinary.owns(id))
        .collect();
    public_ids.sort_unstable();
    public_ids.dedup();
    if public_ids.is_empty() {
        return;
    }

    tokio::spawn(async move {
        let detached = match unreferenced(&db, &public_ids).await {
            Ok(ids) => ids,
            Err(e) => {
                tracing::warn!("Cloudinary cleanup skipped, reference check failed: {e}");
                return;
            }
        };

        if let Err(e) = cloudinary.delete(&detached).await {
            tracing::warn!(count = detached.len(), "Cloudinary delete failed: {e}");
        }
    });
}

async fn unreferenced(db: &PgPool, public_ids: &[String]) -> sqlx::Result<Vec<String>> {
    sqlx::query_scalar!(
        r#"SELECT public_id AS "public_id!" FROM unnest($1::text[]) AS public_id
           EXCEPT
           SELECT r.public_id FROM items i, jsonb_array_elements(i.images) img,
                  LATERAL (VALUES (img->>'publicId'), (img->'metadata'->>'thumbnailId')) AS r(public_id)
           WHERE r.public_id = ANY($1)
           EXCEPT
           SELECT public_id FROM unnest($1::text[]) AS public_id
           JOIN groups g ON g.avatar_url LIKE '%/' || public_id || '.%'"#,
        public_ids
    )
    .fetch_all(db)
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn collects_files_and_thumbnails() {
        let images = json!([
            { "publicId": "f/a", "metadata": { "width": 1 } },
            { "publicId": "f/b.docx", "metadata": { "thumbnailId": "f/c" } },
            { "publicId": "f/d", "metadata": { "thumbnailId": null } },
        ]);
        let ids: Vec<_> = referenced_public_ids(&images).collect();
        assert_eq!(ids, ["f/a", "f/b.docx", "f/c", "f/d"]);
    }

    #[test]
    fn tolerates_missing_images() {
        assert_eq!(referenced_public_ids(&Value::Null).count(), 0);
    }
}
