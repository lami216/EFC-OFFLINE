use chrono::{Datelike, Duration, NaiveDate};
pub fn add_duration(d: NaiveDate, n: i64, unit: &str) -> Option<NaiveDate> {
    match unit {
        "day" => d.checked_add_signed(Duration::days(n)),
        "week" => d.checked_add_signed(Duration::weeks(n)),
        "month" => {
            let total = d.year() as i64 * 12 + d.month0() as i64 + n;
            let y = (total / 12) as i32;
            let m = (total % 12 + 1) as u32;
            let last = (28..=31)
                .rev()
                .find(|day| NaiveDate::from_ymd_opt(y, m, *day).is_some())?;
            NaiveDate::from_ymd_opt(y, m, d.day().min(last))
        }
        _ => None,
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn month_end_and_leap() {
        assert_eq!(
            add_duration(NaiveDate::from_ymd_opt(2024, 1, 31).unwrap(), 1, "month")
                .unwrap()
                .to_string(),
            "2024-02-29"
        );
        assert_eq!(
            add_duration(NaiveDate::from_ymd_opt(2023, 1, 31).unwrap(), 1, "month")
                .unwrap()
                .to_string(),
            "2023-02-28"
        )
    }
    #[test]
    fn weeks() {
        assert_eq!(
            add_duration(NaiveDate::from_ymd_opt(2026, 9, 1).unwrap(), 2, "week")
                .unwrap()
                .to_string(),
            "2026-09-15"
        )
    }
}
