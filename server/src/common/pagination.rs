//! Fixed-size, offset-based paging for admin lists.

use serde::{Deserialize, Serialize};

pub const PAGE_SIZE: i64 = 50;

/// A 1-based page number. Anything below 1 is read as the first page, so a
/// hand-edited URL can never produce a negative offset.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(from = "Option<i64>")]
pub struct PageNumber(i64);

impl Default for PageNumber {
    fn default() -> Self {
        Self(1)
    }
}

impl From<Option<i64>> for PageNumber {
    fn from(raw: Option<i64>) -> Self {
        Self(raw.unwrap_or(1).max(1))
    }
}

impl PageNumber {
    pub const fn get(self) -> i64 {
        self.0
    }

    pub const fn offset(self) -> i64 {
        (self.0 - 1).saturating_mul(PAGE_SIZE)
    }
}

#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortOrder {
    Asc,
    #[default]
    Desc,
}

impl SortOrder {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Asc => "asc",
            Self::Desc => "desc",
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Page<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub page_count: i64,
}

impl<T> Page<T> {
    pub fn new(items: Vec<T>, total: i64, page: PageNumber) -> Self {
        Self {
            items,
            total,
            page: page.get(),
            page_size: PAGE_SIZE,
            page_count: (total + PAGE_SIZE - 1) / PAGE_SIZE,
        }
    }
}

/// Turns free text into an `ILIKE` substring pattern. The wildcards are
/// escaped so a search for `50%` matches literally instead of everything.
pub fn contains_pattern(search: &str) -> String {
    let mut pattern = String::with_capacity(search.len() + 2);
    pattern.push('%');
    for c in search.chars() {
        if matches!(c, '%' | '_' | '\\') {
            pattern.push('\\');
        }
        pattern.push(c);
    }
    pattern.push('%');
    pattern
}

/// Normalises an optional search parameter: blank input means "no search".
pub fn search_term(raw: Option<&str>) -> Option<&str> {
    raw.map(str::trim).filter(|s| !s.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn page_number_clamps_to_first_page() {
        assert_eq!(PageNumber::from(None).get(), 1);
        assert_eq!(PageNumber::from(Some(0)).get(), 1);
        assert_eq!(PageNumber::from(Some(-5)).get(), 1);
        assert_eq!(PageNumber::from(Some(3)).offset(), 2 * PAGE_SIZE);
    }

    #[test]
    fn page_count_rounds_up() {
        let page = |total| Page::<()>::new(vec![], total, PageNumber::default()).page_count;
        assert_eq!(page(0), 0);
        assert_eq!(page(1), 1);
        assert_eq!(page(PAGE_SIZE), 1);
        assert_eq!(page(PAGE_SIZE + 1), 2);
    }

    #[test]
    fn contains_pattern_escapes_wildcards() {
        assert_eq!(contains_pattern("abc"), "%abc%");
        assert_eq!(contains_pattern("50%_a\\b"), "%50\\%\\_a\\\\b%");
    }

    #[test]
    fn blank_search_is_ignored() {
        assert_eq!(search_term(Some("  ")), None);
        assert_eq!(search_term(Some(" max ")), Some("max"));
        assert_eq!(search_term(None), None);
    }
}
