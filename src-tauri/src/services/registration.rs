use crate::{
    errors::{AppError, Result},
    models::*,
    services::dates::add_duration,
};
use argon2::{
    password_hash::{PasswordHasher, SaltString},
    Argon2,
};
use chrono::{NaiveDate, Utc};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;
pub async fn setup(pool: &SqlitePool, i: SetupInput) -> Result<()> {
    if i.center_name.trim().is_empty() || i.admin_name.trim().is_empty() || i.password.len() < 8 {
        return Err(AppError::Validation);
    }
    let mut tx = pool.begin().await?;
    let hash = Argon2::default()
        .hash_password(
            i.password.as_bytes(),
            &SaltString::generate(&mut rand_core::OsRng),
        )
        .map_err(|_| AppError::Validation)?
        .to_string();
    sqlx::query("INSERT INTO app_settings(id,center_name,phone1,phone2,address,receipt_last)VALUES(1,?,?,?,?,?)").bind(i.center_name).bind(i.phone1).bind(i.phone2).bind(i.address).bind(i.initial_receipt-1).execute(&mut*tx).await?;
    let uid = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO users(id,name,password_hash,role)VALUES(?,?,?,'ADMIN')")
        .bind(&uid)
        .bind(i.admin_name)
        .bind(hash)
        .execute(&mut *tx)
        .await?;
    sqlx::query("INSERT INTO branches(id,name,code)VALUES(?,'الفرع الرئيسي','MAIN')")
        .bind(Uuid::new_v4().to_string())
        .execute(&mut *tx)
        .await?;
    sqlx::query("INSERT INTO payment_methods(id,name)VALUES(?,'نقداً')")
        .bind(Uuid::new_v4().to_string())
        .execute(&mut *tx)
        .await?;
    audit(&mut tx, &uid, "setup", "app_settings", "1").await?;
    tx.commit().await?;
    Ok(())
}
pub async fn register(pool: &SqlitePool, i: RegistrationInput) -> Result<RegistrationResult> {
    if i.full_name.trim().len() < 2 || i.payment_amount < 0 {
        return Err(AppError::Validation);
    }
    let start =
        NaiveDate::parse_from_str(&i.start_date, "%Y-%m-%d").map_err(|_| AppError::Validation)?;
    let mut tx = pool.begin().await?;
    let actor: String =
        sqlx::query_scalar("SELECT id FROM users WHERE active=1 ORDER BY created_at LIMIT 1")
            .fetch_one(&mut *tx)
            .await?;
    let s=sqlx::query("SELECT name,duration_value,duration_unit,billing_mode,course_fee,monthly_fee FROM specialties WHERE id=? AND active=1").bind(&i.specialty_id).fetch_one(&mut*tx).await?;
    let branch: String = sqlx::query_scalar("SELECT name FROM branches WHERE id=? AND active=1")
        .bind(&i.branch_id)
        .fetch_one(&mut *tx)
        .await?;
    let duration: i64 = s.get("duration_value");
    let unit: String = s.get("duration_unit");
    let billing: String = s.get("billing_mode");
    let course: i64 = s.get("course_fee");
    let monthly: i64 = s.get("monthly_fee");
    let total = if billing == "monthly" {
        monthly * duration
    } else {
        course
    };
    if i.payment_amount > total {
        return Err(AppError::Validation);
    }
    let student_id = if let Some(phone) = i.phone.as_ref().filter(|x| !x.trim().is_empty()) {
        if let Some(id) =
            sqlx::query_scalar::<_, String>("SELECT id FROM students WHERE phone=? LIMIT 1")
                .bind(phone)
                .fetch_optional(&mut *tx)
                .await?
        {
            id
        } else {
            new_student(&mut tx, &i).await?
        }
    } else {
        new_student(&mut tx, &i).await?
    };
    sqlx::query("INSERT INTO register_sequences(branch_id,specialty_id,last_number)VALUES(?,?,1) ON CONFLICT(branch_id,specialty_id) DO UPDATE SET last_number=last_number+1").bind(&i.branch_id).bind(&i.specialty_id).execute(&mut*tx).await?;
    let reg: i64 = sqlx::query_scalar(
        "SELECT last_number FROM register_sequences WHERE branch_id=? AND specialty_id=?",
    )
    .bind(&i.branch_id)
    .bind(&i.specialty_id)
    .fetch_one(&mut *tx)
    .await?;
    let eid = Uuid::new_v4().to_string();
    let end = add_duration(start, duration, &unit).ok_or(AppError::Validation)?;
    sqlx::query("INSERT INTO enrollments(id,student_id,branch_id,specialty_id,register_number,start_date,end_date,billing_mode_snapshot,duration_unit_snapshot,duration_value_snapshot,course_fee_snapshot,monthly_fee_snapshot,notes,created_by)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(&eid).bind(&student_id).bind(&i.branch_id).bind(&i.specialty_id).bind(reg).bind(start.to_string()).bind(end.to_string()).bind(&billing).bind(&unit).bind(duration).bind(course).bind(monthly).bind(&i.notes).bind(&actor).execute(&mut*tx).await?;
    if billing == "monthly" {
        for n in 0..duration {
            let ps = add_duration(start, n, "month").unwrap();
            let pe = add_duration(start, n + 1, "month").unwrap();
            sqlx::query("INSERT INTO billing_periods(id,enrollment_id,period_number,period_start,period_end,due_date,amount_due)VALUES(?,?,?,?,?,?,?)").bind(Uuid::new_v4().to_string()).bind(&eid).bind(n+1).bind(ps.to_string()).bind(pe.to_string()).bind(ps.to_string()).bind(monthly).execute(&mut*tx).await?;
        }
    }
    let mut receipt = None;
    if i.payment_amount > 0 {
        let method = i.payment_method_id.as_ref().ok_or(AppError::Validation)?;
        let method_name: String =
            sqlx::query_scalar("SELECT name FROM payment_methods WHERE id=? AND active=1")
                .bind(method)
                .fetch_one(&mut *tx)
                .await?;
        let pid = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        sqlx::query("INSERT INTO payments(id,enrollment_id,amount,payment_method_id,paid_at,created_by)VALUES(?,?,?,?,?,?)").bind(&pid).bind(&eid).bind(i.payment_amount).bind(method).bind(&now).bind(&actor).execute(&mut*tx).await?;
        if billing == "monthly" {
            allocate(&mut tx, &pid, &eid, i.payment_amount).await?
        }
        sqlx::query("UPDATE app_settings SET receipt_last=receipt_last+1 WHERE id=1")
            .execute(&mut *tx)
            .await?;
        let rn: i64 = sqlx::query_scalar("SELECT receipt_last FROM app_settings WHERE id=1")
            .fetch_one(&mut *tx)
            .await?;
        let center: String = sqlx::query_scalar("SELECT center_name FROM app_settings WHERE id=1")
            .fetch_one(&mut *tx)
            .await?;
        let dto = ReceiptDto {
            receipt_number: rn,
            student_name: i.full_name.trim().into(),
            specialty_name: s.get("name"),
            branch_name: branch,
            register_number: reg,
            amount: i.payment_amount,
            remaining: total - i.payment_amount,
            method_name,
            issued_at: now,
            center_name: center,
        };
        let snap = serde_json::to_string(&dto).unwrap();
        sqlx::query("INSERT INTO receipts(id,receipt_number,payment_id,enrollment_id,issued_at,snapshot_json)VALUES(?,?,?,?,?,?)").bind(Uuid::new_v4().to_string()).bind(rn).bind(&pid).bind(&eid).bind(&dto.issued_at).bind(snap).execute(&mut*tx).await?;
        receipt = Some(dto)
    }
    audit(&mut tx, &actor, "enrollment.created", "enrollment", &eid).await?;
    tx.commit().await?;
    Ok(RegistrationResult {
        student_id,
        enrollment_id: eid,
        register_number: reg,
        receipt,
    })
}
async fn new_student(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    i: &RegistrationInput,
) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO students(id,full_name,phone,notes)VALUES(?,?,?,?)")
        .bind(&id)
        .bind(i.full_name.trim())
        .bind(&i.phone)
        .bind(&i.notes)
        .execute(&mut **tx)
        .await?;
    Ok(id)
}
async fn allocate(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    pid: &str,
    eid: &str,
    mut left: i64,
) -> Result<()> {
    let rows=sqlx::query("SELECT b.id,b.amount_due-COALESCE(SUM(CASE WHEN p.status='active' THEN a.amount ELSE 0 END),0) remaining FROM billing_periods b LEFT JOIN payment_allocations a ON a.billing_period_id=b.id LEFT JOIN payments p ON p.id=a.payment_id WHERE b.enrollment_id=? GROUP BY b.id ORDER BY b.period_number").bind(eid).fetch_all(&mut**tx).await?;
    for r in rows {
        if left == 0 {
            break;
        }
        let amount = left.min(r.get::<i64, _>("remaining"));
        if amount > 0 {
            sqlx::query(
                "INSERT INTO payment_allocations(payment_id,billing_period_id,amount)VALUES(?,?,?)",
            )
            .bind(pid)
            .bind(r.get::<String, _>("id"))
            .bind(amount)
            .execute(&mut **tx)
            .await?;
            left -= amount
        }
    }
    Ok(())
}
async fn audit(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    actor: &str,
    action: &str,
    entity: &str,
    id: &str,
) -> Result<()> {
    sqlx::query("INSERT INTO audit_log(id,actor_id,action,entity,entity_id)VALUES(?,?,?,?,?)")
        .bind(Uuid::new_v4().to_string())
        .bind(actor)
        .bind(action)
        .bind(entity)
        .bind(id)
        .execute(&mut **tx)
        .await?;
    Ok(())
}
