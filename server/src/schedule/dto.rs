use crate::common::school_week::WeekStart;
use serde::Deserialize;

/// The weeks whose changes to fetch; every week from `from` on without `to`.
#[derive(Debug, Deserialize)]
pub struct ScheduleSubsQuery {
    pub from: WeekStart,
    pub to: Option<WeekStart>,
}
