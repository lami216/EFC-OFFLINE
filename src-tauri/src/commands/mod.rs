use crate::{
    errors::{AppError, Result},
    models::*,
    services::registration,
};
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use serde_json::Value;
use sqlx::{Column, Row, SqlitePool};
use tauri::State;
#[tauri::command]
pub async fn bootstrap(pool: State<'_, SqlitePool>) -> Result<Bootstrap> {
    let center = sqlx::query_scalar::<_, String>("SELECT center_name FROM app_settings WHERE id=1")
        .fetch_optional(&*pool)
        .await?;
    if center.is_none() {
        return Ok(Bootstrap {
            initialized: false,
            branches: vec![],
            specialties: vec![],
            payment_methods: vec![],
            center_name: String::new(),
        });
    }
    Ok(Bootstrap{initialized:true,branches:sqlx::query_as("SELECT id,name,code,active FROM branches ORDER BY name").fetch_all(&*pool).await?,specialties:sqlx::query_as("SELECT id,name,code,active,duration_value,duration_unit,billing_mode,course_fee,monthly_fee FROM specialties ORDER BY name").fetch_all(&*pool).await?,payment_methods:sqlx::query_as("SELECT id,name,active FROM payment_methods ORDER BY name").fetch_all(&*pool).await?,center_name:center.unwrap()})
}
#[tauri::command]
pub async fn first_run_setup(pool: State<'_, SqlitePool>, input: SetupInput) -> Result<()> {
    if sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM app_settings")
        .fetch_one(&*pool)
        .await?
        > 0
    {
        return Err(AppError::Unauthorized);
    }
    registration::setup(&pool, input).await
}
#[tauri::command]
pub async fn login(pool: State<'_, SqlitePool>, name: String, password: String) -> Result<String> {
    let row = sqlx::query("SELECT id,password_hash FROM users WHERE name=? AND active=1")
        .bind(name)
        .fetch_optional(&*pool)
        .await?
        .ok_or(AppError::Unauthorized)?;
    let hash: String = row.get("password_hash");
    Argon2::default()
        .verify_password(
            password.as_bytes(),
            &PasswordHash::new(&hash).map_err(|_| AppError::Unauthorized)?,
        )
        .map_err(|_| AppError::Unauthorized)?;
    Ok(row.get("id"))
}
#[tauri::command]
pub async fn register_student(
    pool: State<'_, SqlitePool>,
    input: RegistrationInput,
) -> Result<RegistrationResult> {
    registration::register(&pool, input).await
}
#[tauri::command]
pub async fn query_view(
    pool: State<'_, SqlitePool>,
    kind: String,
    filters: Value,
) -> Result<Vec<Value>> {
    let q = filters.get("q").and_then(Value::as_str).unwrap_or("");
    let like = format!("%{q}%");
    let rows=match kind.as_str(){"students"=>sqlx::query("SELECT s.full_name AS 'اسم الطالب',COALESCE(s.phone,'—') AS 'الهاتف',e.register_number AS 'رقم السجل',sp.name AS 'التخصص',b.name AS 'الفرع' FROM students s JOIN enrollments e ON e.student_id=s.id JOIN specialties sp ON sp.id=e.specialty_id JOIN branches b ON b.id=e.branch_id WHERE s.full_name LIKE ? OR s.phone LIKE ? ORDER BY s.created_at DESC LIMIT 100").bind(&like).bind(&like).fetch_all(&*pool).await?,"ledger"=>sqlx::query("SELECT substr(p.paid_at,1,10) AS 'التاريخ',r.receipt_number AS 'رقم الوصل',s.full_name AS 'الطالب',sp.name AS 'التخصص',pm.name AS 'الوسيلة',p.amount AS 'المبلغ' FROM payments p JOIN receipts r ON r.payment_id=p.id JOIN enrollments e ON e.id=p.enrollment_id JOIN students s ON s.id=e.student_id JOIN specialties sp ON sp.id=e.specialty_id JOIN payment_methods pm ON pm.id=p.payment_method_id WHERE p.status='active' ORDER BY p.paid_at DESC LIMIT 200").fetch_all(&*pool).await?,"finance"=>sqlx::query("SELECT COALESCE(SUM(CASE WHEN status='active' THEN amount END),0) total,COUNT(CASE WHEN status='active' THEN 1 END) count,COALESCE((SELECT SUM(bp.amount_due)-SUM(COALESCE(x.paid,0)) FROM billing_periods bp LEFT JOIN (SELECT billing_period_id,SUM(a.amount) paid FROM payment_allocations a JOIN payments p ON p.id=a.payment_id WHERE p.status='active' GROUP BY billing_period_id)x ON x.billing_period_id=bp.id),0) due FROM payments").fetch_all(&*pool).await?,"specialties"=>sqlx::query("SELECT sp.name AS 'التخصص',sp.duration_value AS 'المدة',sp.billing_mode AS 'الدفع',COUNT(e.id) AS 'الطلاب',COALESCE(SUM(CASE WHEN p.status='active' THEN p.amount END),0) AS 'المحصل' FROM specialties sp LEFT JOIN enrollments e ON e.specialty_id=sp.id LEFT JOIN payments p ON p.enrollment_id=e.id GROUP BY sp.id ORDER BY sp.name").fetch_all(&*pool).await?,_=>vec![]};
    Ok(rows
        .into_iter()
        .map(|r| {
            let mut m = serde_json::Map::new();
            for c in r.columns() {
                let n = c.name();
                let v = r
                    .try_get::<i64, _>(n)
                    .map(Value::from)
                    .or_else(|_| r.try_get::<String, _>(n).map(Value::from))
                    .unwrap_or(Value::Null);
                m.insert(n.into(), v);
            }
            Value::Object(m)
        })
        .collect())
}
#[tauri::command]
pub async fn void_payment(pool: State<'_, SqlitePool>, id: String, reason: String) -> Result<()> {
    if reason.trim().len() < 3 {
        return Err(AppError::Validation);
    }
    sqlx::query("UPDATE payments SET status='void',voided_at=CURRENT_TIMESTAMP,void_reason=? WHERE id=? AND status='active'").bind(reason).bind(id).execute(&*pool).await?;
    Ok(())
}
#[tauri::command]
pub async fn save_entity(_kind: String, _value: Value) -> Result<()> {
    Err(AppError::Validation)
}
#[tauri::command]
pub async fn backup_database(pool: State<'_, SqlitePool>) -> Result<String> {
    let path = std::env::temp_dir().join(format!(
        "EFC-Backup-{}.sqlite",
        chrono::Local::now().format("%Y-%m-%d-%H%M")
    ));
    let escaped = path.to_string_lossy().replace('\'', "''");
    sqlx::query(&format!("VACUUM INTO '{}'", escaped))
        .execute(&*pool)
        .await?;
    Ok(path.to_string_lossy().into())
}
#[tauri::command]
pub async fn restore_database() -> Result<()> {
    Err(AppError::Validation)
}
