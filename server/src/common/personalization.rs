use axum::http::{HeaderName, HeaderValue};

/// How many entries a personalized list left out because they belong to
/// courses the member does not attend. It travels as a header so the list
/// body keeps its shape for clients that never read it.
pub const HIDDEN_BY_COURSES: HeaderName = HeaderName::from_static("x-hidden-by-courses");

pub fn hidden_by_courses_header(count: usize) -> [(HeaderName, HeaderValue); 1] {
    [(HIDDEN_BY_COURSES, HeaderValue::from(count))]
}
