use super::helpers::{effective_branch, require_role, row_value, session};
use crate::{
    errors::{AppError, Result},
    models::*,
    services::registration,
    AppState,
};
use serde_json::{json, Value};
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn bootstrap(state: State<'_, AppState>) -> Result<Bootstrap> {
    if let Some(message) = &state.startup_error {
        return Err(AppError::Startup(message.clone()));
    }

    let center = sqlx::query("SELECT center_name,logo_data_url FROM app_settings WHERE id=1")
        .fetch_optional(&state.pool)
        .await?;
    let Some(center) = center else {
        return Ok(Bootstrap {
            initialized: false,
            branches: vec![],
            specialties: vec![],
            specialty_branches: vec![],
            payment_methods: vec![],
            center_name: String::new(),
            center_logo_data_url: None,
        });
    };

    Ok(Bootstrap {
        initialized: true,
        branches: sqlx::query_as(
            "SELECT id,name,code,active FROM branches ORDER BY active DESC,name",
        )
        .fetch_all(&state.pool)
        .await?,
        specialties: sqlx::query_as("SELECT id,name,code,active,duration_value,duration_unit,billing_mode,course_fee,monthly_fee FROM specialties ORDER BY active DESC,name")
            .fetch_all(&state.pool)
            .await?,
        specialty_branches: sqlx::query_as(
            "SELECT specialty_id,branch_id,active FROM specialty_branches",
        )
        .fetch_all(&state.pool)
        .await?,
        payment_methods: sqlx::query_as(
            "SELECT id,name,logo_data_url,active FROM payment_methods ORDER BY active DESC,name",
        )
        .fetch_all(&state.pool)
        .await?,
        center_name: center.get("center_name"),
        center_logo_data_url: center.try_get::<String, _>("logo_data_url").ok(),
    })
}

#[tauri::command]
pub async fn first_run_setup(state: State<'_, AppState>, input: SetupInput) -> Result<()> {
    if sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM app_settings")
        .fetch_one(&state.pool)
        .await?
        > 0
    {
        return Err(AppError::Unauthorized);
    }
    registration::setup(&state.pool, input).await
}

#[tauri::command]
pub async fn register_student(
    state: State<'_, AppState>,
    token: String,
    input: RegistrationInput,
) -> Result<RegistrationResult> {
    let s = session(&state, &token)?;
    require_role(&s, &["ADMIN", "REGISTRAR"])?;
    effective_branch(&s, Some(input.branch_id.clone()))?;
    registration::register(&state.pool, input, &s.user_id).await
}

#[tauri::command]
pub async fn add_payment(
    state: State<'_, AppState>,
    token: String,
    input: AddPaymentInput,
) -> Result<ReceiptDto> {
    let s = session(&state, &token)?;
    require_role(&s, &["ADMIN", "REGISTRAR", "FINANCE"])?;
    let branch: String = sqlx::query_scalar("SELECT branch_id FROM enrollments WHERE id=?")
        .bind(&input.enrollment_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;
    effective_branch(&s, Some(branch))?;
    registration::add_payment(&state.pool, input, &s.user_id).await
}

#[tauri::command]
pub async fn get_receipt(
    state: State<'_, AppState>,
    token: String,
    receipt_number: i64,
) -> Result<ReceiptDto> {
    let s = session(&state, &token)?;
    let row = sqlx::query("SELECT r.snapshot_json,e.branch_id FROM receipts r JOIN enrollments e ON e.id=r.enrollment_id WHERE r.receipt_number=?")
        .bind(receipt_number)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;
    effective_branch(&s, Some(row.get("branch_id")))?;
    let snapshot: String = row.get("snapshot_json");
    serde_json::from_str::<ReceiptDto>(&snapshot).map_err(|_| AppError::Validation)
}

#[tauri::command]
pub async fn student_details(
    state: State<'_, AppState>,
    token: String,
    student_id: String,
) -> Result<Value> {
    let s = session(&state, &token)?;
    let branch = effective_branch(&s, None)?;
    let visible: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM enrollments WHERE student_id=? AND (? IS NULL OR branch_id=?)",
    )
    .bind(&student_id)
    .bind(branch.as_deref())
    .bind(branch.as_deref())
    .fetch_one(&state.pool)
    .await?;
    if visible == 0 {
        return Err(AppError::NotFound);
    }

    let student = sqlx::query("SELECT id,full_name AS fullName,phone,secondary_phone AS secondaryPhone,notes FROM students WHERE id=?")
        .bind(&student_id)
        .fetch_one(&state.pool)
        .await?;
    let enrollments = sqlx::query("WITH paid AS (SELECT enrollment_id,SUM(amount) paid FROM payments WHERE status='active' GROUP BY enrollment_id) SELECT e.id,sp.name AS specialtyName,b.name AS branchName,e.register_number AS registerNumber,e.start_date AS startDate,e.end_date AS endDate,e.billing_mode_snapshot AS billingMode,CASE WHEN e.billing_mode_snapshot='monthly' THEN e.monthly_fee_snapshot*e.duration_value_snapshot ELSE e.course_fee_snapshot END AS totalRequired,COALESCE(p.paid,0) AS paid,MAX(CASE WHEN e.billing_mode_snapshot='monthly' THEN e.monthly_fee_snapshot*e.duration_value_snapshot ELSE e.course_fee_snapshot END-COALESCE(p.paid,0),0) AS remaining,e.status FROM enrollments e JOIN specialties sp ON sp.id=e.specialty_id JOIN branches b ON b.id=e.branch_id LEFT JOIN paid p ON p.enrollment_id=e.id WHERE e.student_id=? AND (? IS NULL OR e.branch_id=?) ORDER BY e.created_at DESC")
        .bind(&student_id)
        .bind(branch.as_deref())
        .bind(branch.as_deref())
        .fetch_all(&state.pool)
        .await?;
    let payments = sqlx::query("SELECT p.id,p.enrollment_id AS enrollmentId,r.receipt_number AS receiptNumber,p.amount,pm.name AS methodName,p.paid_at AS paidAt,p.description,p.status FROM payments p JOIN enrollments e ON e.id=p.enrollment_id JOIN payment_methods pm ON pm.id=p.payment_method_id LEFT JOIN receipts r ON r.payment_id=p.id WHERE e.student_id=? AND (? IS NULL OR e.branch_id=?) ORDER BY p.paid_at DESC")
        .bind(&student_id)
        .bind(branch.as_deref())
        .bind(branch.as_deref())
        .fetch_all(&state.pool)
        .await?;
    let periods = sqlx::query("SELECT bp.id,bp.enrollment_id AS enrollmentId,bp.period_number AS periodNumber,bp.period_start AS periodStart,bp.period_end AS periodEnd,bp.due_date AS dueDate,bp.amount_due AS amountDue,COALESCE(SUM(CASE WHEN p.status='active' THEN a.amount ELSE 0 END),0) AS paid,MAX(bp.amount_due-COALESCE(SUM(CASE WHEN p.status='active' THEN a.amount ELSE 0 END),0),0) AS remaining,CASE WHEN bp.amount_due<=COALESCE(SUM(CASE WHEN p.status='active' THEN a.amount ELSE 0 END),0) THEN 'paid' WHEN bp.due_date<date('now','localtime') THEN 'overdue' WHEN bp.due_date<=date('now','localtime') THEN 'due' WHEN COALESCE(SUM(CASE WHEN p.status='active' THEN a.amount ELSE 0 END),0)>0 THEN 'partial' ELSE 'upcoming' END AS status FROM billing_periods bp JOIN enrollments e ON e.id=bp.enrollment_id LEFT JOIN payment_allocations a ON a.billing_period_id=bp.id LEFT JOIN payments p ON p.id=a.payment_id WHERE e.student_id=? AND (? IS NULL OR e.branch_id=?) GROUP BY bp.id ORDER BY bp.period_number")
        .bind(&student_id)
        .bind(branch.as_deref())
        .bind(branch.as_deref())
        .fetch_all(&state.pool)
        .await?;

    Ok(json!({
        "student": row_value(&student),
        "enrollments": enrollments.iter().map(row_value).collect::<Vec<_>>(),
        "payments": payments.iter().map(row_value).collect::<Vec<_>>(),
        "billingPeriods": periods.iter().map(row_value).collect::<Vec<_>>()
    }))
}

#[tauri::command]
pub async fn void_payment(
    state: State<'_, AppState>,
    token: String,
    id: String,
    reason: String,
) -> Result<()> {
    let s = session(&state, &token)?;
    require_role(&s, &["ADMIN", "FINANCE"])?;
    if reason.trim().len() < 3 {
        return Err(AppError::Validation);
    }
    let branch: String = sqlx::query_scalar("SELECT e.branch_id FROM payments p JOIN enrollments e ON e.id=p.enrollment_id WHERE p.id=?")
        .bind(&id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;
    effective_branch(&s, Some(branch))?;

    let mut tx = state.pool.begin().await?;
    let result = sqlx::query("UPDATE payments SET status='void',voided_at=CURRENT_TIMESTAMP,void_reason=?,voided_by=? WHERE id=? AND status='active'")
        .bind(reason.trim())
        .bind(&s.user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::Conflict);
    }
    registration::audit(&mut tx, &s.user_id, "payment.voided", "payment", &id).await?;
    tx.commit().await?;
    Ok(())
}
