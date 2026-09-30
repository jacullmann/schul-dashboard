use crate::common::cloudinary::Cloudinary;
use serde_json::Value;
use sqlx::PgPool;

/// Public IDs of every file an item's `images` column points at, including the
/// preview images generated for office documents.
fn referenced_public_ids(images: &Value) -> impl Iterator<Item = &str> {
    images
        .as_array()
        .into_iter()
        .flatten()
        .flat_map(|img| [&img["publicId"], &img["metadata"]["thumbnailId"]])
        .filter_map(Value::as_str)
}

/// Deletes the files behind the given `images` columns from Cloudinary once the
/// request is done, so neither its latency nor its failure affects the
/// deletion the user asked for.
///
/// Public IDs are chosen by the client, so another task or a group avatar may
/// point at the same file. Only files no longer referenced anywhere are
/// deleted; otherwise removing one's own task could delete someone else's
/// image.
pub fn delete_detached<'a>(
    db: PgPool,
    cloudinary: Cloudinary,
    images: impl IntoIterator<Item = &'a Value>,
) {
    let mut public_ids: Vec<String> = images
        .into_iter()
        .flat_map(referenced_public_ids)
        .filter(|id| cloudinary.owns(id))
        .map(str::to_owned)
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

        for public_id in &detached {
            if let Err(e) = cloudinary.destroy(public_id).await {
                tracing::warn!(public_id, "Cloudinary delete failed: {e}");
            }
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
