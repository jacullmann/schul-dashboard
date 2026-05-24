use maxminddb::{geoip2, Reader};
use std::net::IpAddr;
use std::sync::{Arc, RwLock};
use serde::Serialize;
use tracing::{info, error};

#[derive(Debug, Serialize, Clone)]
pub struct LookupResponse {
    pub ip: String,
    pub country: Option<String>,
    pub country_code: Option<String>,
    pub city: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub timezone: Option<String>,
    pub continent: Option<String>,
    pub continent_code: Option<String>,
    pub postal_code: Option<String>,
}

#[derive(Clone)]
pub struct GeoIpState {
    reader: Arc<RwLock<Option<Reader<Vec<u8>>>>>,
}

impl GeoIpState {
    pub fn new() -> Self {
        Self {
            reader: Arc::new(RwLock::new(None)),
        }
    }

    /// Load or reload the database from a file path
    pub fn load_database(&self, path: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("Loading GeoIP database from {}", path);
        let data = std::fs::read(path)?;
        let reader = Reader::from_source(data)?;
        
        {
            let mut writer = self.reader.write().map_err(|e| {
                error!("Failed to acquire write lock for database reload: {}", e);
                "lock error"
            })?;
            *writer = Some(reader);
        }
        
        info!("GeoIP database successfully loaded and hot-swapped!");
        Ok(())
    }

    /// Check if database is loaded
    pub fn is_loaded(&self) -> bool {
        self.reader.read().map(|r| r.is_some()).unwrap_or(false)
    }

    /// Perform an IP lookup
    pub fn lookup(&self, ip: IpAddr) -> Result<LookupResponse, String> {
        let reader_lock = self.reader.read().map_err(|e| {
            format!("Failed to acquire read lock for lookup: {}", e)
        })?;

        let reader = reader_lock.as_ref().ok_or_else(|| {
            "GeoIP database is not loaded yet".to_string()
        })?;

        let city_data: geoip2::City = reader.lookup(ip).map_err(|e| {
            format!("IP lookup failed: {}", e)
        })?;

        // Extract country
        let country = city_data.country
            .as_ref()
            .and_then(|c| c.names.as_ref())
            .and_then(|n| n.get("en").map(|s| s.to_string()));
            
        let country_code = city_data.country
            .as_ref()
            .and_then(|c| c.iso_code.map(|s| s.to_string()));

        // Extract city
        let city = city_data.city
            .as_ref()
            .and_then(|c| c.names.as_ref())
            .and_then(|n| n.get("en").map(|s| s.to_string()));

        // Extract location coordinates and timezone
        let latitude = city_data.location.as_ref().and_then(|l| l.latitude);
        let longitude = city_data.location.as_ref().and_then(|l| l.longitude);
        let timezone = city_data.location.as_ref().and_then(|l| l.time_zone.map(|s| s.to_string()));

        // Extract continent
        let continent = city_data.continent
            .as_ref()
            .and_then(|c| c.names.as_ref())
            .and_then(|n| n.get("en").map(|s| s.to_string()));
            
        let continent_code = city_data.continent
            .as_ref()
            .and_then(|c| c.code.map(|s| s.to_string()));

        // Extract postal code
        let postal_code = city_data.postal
            .as_ref()
            .and_then(|p| p.code.map(|s| s.to_string()));

        Ok(LookupResponse {
            ip: ip.to_string(),
            country,
            country_code,
            city,
            latitude,
            longitude,
            timezone,
            continent,
            continent_code,
            postal_code,
        })
    }
}
