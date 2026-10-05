use crate::common::school_week::WeekStart;
use serde::Deserialize;

/// The weeks whose changes to fetch; a missing bound leaves that side open.
#[derive(Debug, Deserialize)]
pub struct ScheduleSubsQuery {
    pub from: Option<WeekStart>,
    pub to: Option<WeekStart>,
}
