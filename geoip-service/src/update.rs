use flate2::read::GzDecoder;
use std::{
    fs::{self},
    io::Write,
    path::Path,
};
use tar::Archive;
use tempfile::NamedTempFile;
use tracing::info;

pub async fn download_and_extract_db(
    license_key: Option<&str>,
    mirror_url: &str,
    target_path: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let target_path_obj = Path::new(target_path);

    if let Some(parent) = target_path_obj.parent() {
        fs::create_dir_all(parent)?;
    }

    let parent_dir = target_path_obj.parent().unwrap_or_else(|| Path::new("."));
    let mut temp_file = NamedTempFile::new_in(parent_dir)?;
    info!(
        "Starting database download to temporary file: {:?}",
        temp_file.path()
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()?;

    if let Some(key) = license_key {
        info!("Using MaxMind license key for official download...");
        let url = format!(
            "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key={}&suffix=tar.gz",
            key
        );

        let response = client.get(&url).send().await?;
        if !response.status().is_success() {
            return Err(format!(
                "Failed to download from MaxMind: HTTP {}",
                response.status()
            )
            .into());
        }

        let bytes = response.bytes().await?;
        info!(
            "Downloaded official MaxMind tar.gz file. Size: {} bytes. Extracting...",
            bytes.len()
        );

        let tar_gz = std::io::Cursor::new(bytes);
        let tar = GzDecoder::new(tar_gz);
        let mut archive = Archive::new(tar);
        let mut found = false;

        for entry_result in archive.entries()? {
            let mut entry = entry_result?;
            let path = entry.path()?;
            if path.to_string_lossy().ends_with("GeoLite2-City.mmdb") {
                info!("Found GeoLite2-City.mmdb in archive at {:?}", path);
                // Stream directly from archive entry to temp file without allocating a large buffer Vec
                std::io::copy(&mut entry, &mut temp_file)?;
                found = true;
                break;
            }
        }

        if !found {
            return Err(
                "Could not find GeoLite2-City.mmdb in the downloaded MaxMind archive.".into(),
            );
        }
    } else {
        info!(
            "No license key provided. Downloading from mirror: {}",
            mirror_url
        );
        let response = client.get(mirror_url).send().await?;
        if !response.status().is_success() {
            return Err(
                format!("Failed to download from mirror: HTTP {}", response.status()).into(),
            );
        }

        let bytes = response.bytes().await?;
        info!(
            "Downloaded raw database file from mirror. Size: {} bytes.",
            bytes.len()
        );
        temp_file.write_all(&bytes)?;
    }

    temp_file.flush()?;
    temp_file.persist(target_path)?;

    info!(
        "Database successfully written and persisted to {}",
        target_path
    );
    Ok(())
}
