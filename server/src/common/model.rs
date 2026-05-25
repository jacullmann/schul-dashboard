pub fn build_thumb_url(secure_url: &str) -> String {
    if let Ok(mut url) = url::Url::parse(secure_url) {
        let path = url.path().to_string();
        if let Some(upload_idx) = path.split('/').position(|p| p == "upload") {
            let parts: Vec<&str> = path.split('/').collect();
            let mut new_parts = parts[..=upload_idx].to_vec();
            new_parts.push("f_webp,q_auto,w_256,h_256,c_fill");
            new_parts.extend_from_slice(&parts[upload_idx + 1..]);
            url.set_path(&new_parts.join("/"));
            return url.to_string();
        }
    }
    secure_url.to_string()
}

pub fn generate_cloudinary_url(
    cloud_name: &str,
    public_id: &str,
    version: Option<&str>,
    is_thumb: bool,
) -> String {
    let version_str = version.map(|v| format!("v{v}/")).unwrap_or_default();
    let transform = if is_thumb {
        "f_webp,q_auto,w_256,h_256,c_fill/"
    } else {
        ""
    };
    format!(
        "https://res.cloudinary.com/{cloud_name}/image/upload/{transform}{version_str}{public_id}.webp"
    )
}
