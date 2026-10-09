pub mod dto;
pub mod handlers;
pub mod routes;
pub mod service;

pub use service::{ensure_admitted, ensure_registration_open};
