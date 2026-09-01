use super::helpers::{effective_branch, session, text};
use crate::{errors::Result, models::*, AppState};
use serde_json::Value;
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn finance_report(
    state: State<'_, AppState>,
    token: String,
    filters: Value,
) -> Result<FinanceReport> {
    let s = session(&state, &token)?;
    let branch = effective_branch(&s, text(&filters, "branchId"))?;
    let specialty = text(&filters, "specialtyId");
    let method = text(&filters, "paymentMethodId");
    let from = text(&filters, "from").unwrap_or_default();
    let to = text(&filters, "to").unwrap_or_default();
    let bucket = text(&filters, "bucket").unwrap_or_else(|| "day".into());

    let summary = sqlx::query("SELECT COALESCE(SUM(p.amount),0) total,COUNT(p.id) count,COALESCE(CAST(AVG(p.amount) AS INTEGER),0) average FROM payments p JOIN enrollments e ON e.id=p.enrollment_id WHERE p.status='active' AND (?='' OR date(p.paid_at,'localtime')>=date(?)) AND (?='' OR date(p.paid_at,'localtime')<=date(?)) AND (? IS NULL OR e.branch_id=?) AND (? IS NULL OR e.specialty_id=?) AND (? IS NULL OR p.payment_method_id=?)")
        .bind(&from).bind(&from)
        .bind(&to).bind(&to)
        .bind(branch.as_deref()).bind(branch.as_deref())
        .bind(specialty.as_deref()).bind(specialty.as_deref())
        .bind(method.as_deref()).bind(method.as_deref())
        .fetch_one(&state.pool).await?;

    let outstanding: i64 = sqlx::query_scalar("WITH paid AS (SELECT enrollment_id,SUM(amount) paid FROM payments WHERE status='active' GROUP BY enrollment_id) SELECT COALESCE(SUM(MAX(CASE WHEN e.billing_mode_snapshot='monthly' THEN e.monthly_fee_snapshot*e.duration_value_snapshot ELSE e.course_fee_snapshot END-COALESCE(p.paid,0),0)),0) FROM enrollments e LEFT JOIN paid p ON p.enrollment_id=e.id WHERE e.status='active' AND (? IS NULL OR e.branch_id=?) AND (? IS NULL OR e.specialty_id=?)")
        .bind(branch.as_deref()).bind(branch.as_deref())
        .bind(specialty.as_deref()).bind(specialty.as_deref())
        .fetch_one(&state.pool).await?;

    let timeline = sqlx::query_as::<_, ChartPoint>("SELECT CASE WHEN ?='month' THEN strftime('%Y-%m',p.paid_at,'localtime') ELSE date(p.paid_at,'localtime') END label,SUM(p.amount) value FROM payments p JOIN enrollments e ON e.id=p.enrollment_id WHERE p.status='active' AND (?='' OR date(p.paid_at,'localtime')>=date(?)) AND (?='' OR date(p.paid_at,'localtime')<=date(?)) AND (? IS NULL OR e.branch_id=?) AND (? IS NULL OR e.specialty_id=?) AND (? IS NULL OR p.payment_method_id=?) GROUP BY label ORDER BY label")
        .bind(&bucket)
        .bind(&from).bind(&from)
        .bind(&to).bind(&to)
        .bind(branch.as_deref()).bind(branch.as_deref())
        .bind(specialty.as_deref()).bind(specialty.as_deref())
        .bind(method.as_deref()).bind(method.as_deref())
        .fetch_all(&state.pool).await?;

    let by_branch = sqlx::query_as::<_, BreakdownPoint>("SELECT b.name label,SUM(p.amount) value FROM payments p JOIN enrollments e ON e.id=p.enrollment_id JOIN branches b ON b.id=e.branch_id WHERE p.status='active' AND (?='' OR date(p.paid_at,'localtime')>=date(?)) AND (?='' OR date(p.paid_at,'localtime')<=date(?)) AND (? IS NULL OR e.branch_id=?) AND (? IS NULL OR e.specialty_id=?) AND (? IS NULL OR p.payment_method_id=?) GROUP BY b.id ORDER BY value DESC")
        .bind(&from).bind(&from).bind(&to).bind(&to)
        .bind(branch.as_deref()).bind(branch.as_deref())
        .bind(specialty.as_deref()).bind(specialty.as_deref())
        .bind(method.as_deref()).bind(method.as_deref())
        .fetch_all(&state.pool).await?;
    let by_specialty = sqlx::query_as::<_, BreakdownPoint>("SELECT sp.name label,SUM(p.amount) value FROM payments p JOIN enrollments e ON e.id=p.enrollment_id JOIN specialties sp ON sp.id=e.specialty_id WHERE p.status='active' AND (?='' OR date(p.paid_at,'localtime')>=date(?)) AND (?='' OR date(p.paid_at,'localtime')<=date(?)) AND (? IS NULL OR e.branch_id=?) AND (? IS NULL OR e.specialty_id=?) AND (? IS NULL OR p.payment_method_id=?) GROUP BY sp.id ORDER BY value DESC")
        .bind(&from).bind(&from).bind(&to).bind(&to)
        .bind(branch.as_deref()).bind(branch.as_deref())
        .bind(specialty.as_deref()).bind(specialty.as_deref())
        .bind(method.as_deref()).bind(method.as_deref())
        .fetch_all(&state.pool).await?;
    let by_method = sqlx::query_as::<_, BreakdownPoint>("SELECT pm.name label,SUM(p.amount) value FROM payments p JOIN enrollments e ON e.id=p.enrollment_id JOIN payment_methods pm ON pm.id=p.payment_method_id WHERE p.status='active' AND (?='' OR date(p.paid_at,'localtime')>=date(?)) AND (?='' OR date(p.paid_at,'localtime')<=date(?)) AND (? IS NULL OR e.branch_id=?) AND (? IS NULL OR e.specialty_id=?) AND (? IS NULL OR p.payment_method_id=?) GROUP BY pm.id ORDER BY value DESC")
        .bind(&from).bind(&from).bind(&to).bind(&to)
        .bind(branch.as_deref()).bind(branch.as_deref())
        .bind(specialty.as_deref()).bind(specialty.as_deref())
        .bind(method.as_deref()).bind(method.as_deref())
        .fetch_all(&state.pool).await?;

    Ok(FinanceReport {
        total_income: summary.get("total"),
        payment_count: summary.get("count"),
        average_payment: summary.get("average"),
        outstanding,
        timeline,
        by_branch,
        by_specialty,
        by_method,
    })
}
