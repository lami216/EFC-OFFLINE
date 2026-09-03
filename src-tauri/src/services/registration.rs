use crate::{
    errors::{AppError, Result},
    models::*,
    services::dates::add_duration,
};
use argon2::{
    password_hash::{PasswordHasher, SaltString},
    Argon2,
};
use chrono::{Local, NaiveDate};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub async fn setup(pool: &SqlitePool, i: SetupInput) -> Result<()> {
    if i.center_name.trim().is_empty()
        || i.phone1.trim().is_empty()
        || i.admin_name.trim().is_empty()
        || i.password.len() < 8
        || i.initial_receipt < 1
    {
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

    sqlx::query("INSERT INTO app_settings(id,center_name,phone1,phone2,address,receipt_last)VALUES(1,?,?,?,?,?)")
        .bind(i.center_name.trim())
        .bind(i.phone1.trim())
        .bind(clean_optional(i.phone2))
        .bind(clean_optional(i.address))
        .bind(i.initial_receipt - 1)
        .execute(&mut *tx)
        .await?;

    let uid = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO users(id,name,password_hash,role)VALUES(?,?,?,'ADMIN')")
        .bind(&uid)
        .bind(i.admin_name.trim())
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

pub async fn register(
    pool: &SqlitePool,
    i: RegistrationInput,
    actor: &str,
) -> Result<RegistrationResult> {
    if i.full_name.trim().len() < 2 || i.payment_amount < 0 {
        return Err(AppError::Validation);
    }
    let start = NaiveDate::parse_from_str(&i.start_date, "%Y-%m-%d")
        .map_err(|_| AppError::Validation)?;
    let mut tx = pool.begin().await?;

    let specialty = sqlx::query("SELECT name,duration_value,duration_unit,billing_mode,course_fee,monthly_fee FROM specialties WHERE id=? AND active=1")
        .bind(&i.specialty_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(AppError::NotFound)?;
    let branch: String = sqlx::query_scalar("SELECT name FROM branches WHERE id=? AND active=1")
        .bind(&i.branch_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(AppError::NotFound)?;

    let mapping_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM specialty_branches WHERE specialty_id=?")
        .bind(&i.specialty_id)
        .fetch_one(&mut *tx)
        .await?;
    if mapping_count > 0 {
        let enabled: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM specialty_branches WHERE specialty_id=? AND branch_id=? AND active=1")
            .bind(&i.specialty_id)
            .bind(&i.branch_id)
            .fetch_one(&mut *tx)
            .await?;
        if enabled == 0 {
            return Err(AppError::Validation);
        }
    }

    let duration: i64 = specialty.get("duration_value");
    let unit: String = specialty.get("duration_unit");
    let billing: String = specialty.get("billing_mode");
    let course: i64 = specialty.get("course_fee");
    let monthly: i64 = specialty.get("monthly_fee");
    if billing == "monthly" && unit != "month" {
        return Err(AppError::Validation);
    }
    let total = total_required(&billing, duration, course, monthly);
    if i.payment_amount > total {
        return Err(AppError::Validation);
    }

    let student_id = find_or_create_student(&mut tx, &i).await?;
    sqlx::query("INSERT INTO register_sequences(branch_id,specialty_id,last_number)VALUES(?,?,1) ON CONFLICT(branch_id,specialty_id) DO UPDATE SET last_number=last_number+1")
        .bind(&i.branch_id)
        .bind(&i.specialty_id)
        .execute(&mut *tx)
        .await?;
    let register_number: i64 = sqlx::query_scalar("SELECT last_number FROM register_sequences WHERE branch_id=? AND specialty_id=?")
        .bind(&i.branch_id)
        .bind(&i.specialty_id)
        .fetch_one(&mut *tx)
        .await?;

    let enrollment_id = Uuid::new_v4().to_string();
    let end = add_duration(start, duration, &unit).ok_or(AppError::Validation)?;
    sqlx::query("INSERT INTO enrollments(id,student_id,branch_id,specialty_id,register_number,start_date,end_date,billing_mode_snapshot,duration_unit_snapshot,duration_value_snapshot,course_fee_snapshot,monthly_fee_snapshot,notes,created_by)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(&enrollment_id)
        .bind(&student_id)
        .bind(&i.branch_id)
        .bind(&i.specialty_id)
        .bind(register_number)
        .bind(start.to_string())
        .bind(end.to_string())
        .bind(&billing)
        .bind(&unit)
        .bind(duration)
        .bind(course)
        .bind(monthly)
        .bind(clean_optional(i.notes.clone()))
        .bind(actor)
        .execute(&mut *tx)
        .await?;

    if billing == "monthly" {
        for n in 0..duration {
            let period_start = add_duration(start, n, "month").ok_or(AppError::Validation)?;
            let period_end = add_duration(start, n + 1, "month").ok_or(AppError::Validation)?;
            sqlx::query("INSERT INTO billing_periods(id,enrollment_id,period_number,period_start,period_end,due_date,amount_due)VALUES(?,?,?,?,?,?,?)")
                .bind(Uuid::new_v4().to_string())
                .bind(&enrollment_id)
                .bind(n + 1)
                .bind(period_start.to_string())
                .bind(period_end.to_string())
                .bind(period_start.to_string())
                .bind(monthly)
                .execute(&mut *tx)
                .await?;
        }
    }

    let receipt = if i.payment_amount > 0 {
        let method = i.payment_method_id.as_ref().filter(|x| !x.trim().is_empty()).ok_or(AppError::Validation)?;
        let specialty_name: String = specialty.get("name");
        Some(create_payment(
            &mut tx,
            &enrollment_id,
            &i.full_name,
            specialty_name,
            &branch,
            register_number,
            total,
            0,
            i.payment_amount,
            method,
            i.payment_date.as_deref(),
            clean_optional(i.payment_description.clone()),
            actor,
            &billing,
        ).await?)
    } else {
        None
    };

    audit(&mut tx, actor, "enrollment.created", "enrollment", &enrollment_id).await?;
    tx.commit().await?;
    Ok(RegistrationResult { student_id, enrollment_id, register_number, receipt })
}

pub async fn add_payment(pool: &SqlitePool, i: AddPaymentInput, actor: &str) -> Result<ReceiptDto> {
    if i.amount <= 0 || i.payment_method_id.trim().is_empty() {
        return Err(AppError::Validation);
    }
    let mut tx = pool.begin().await?;
    let row = sqlx::query("SELECT e.register_number,e.billing_mode_snapshot,e.duration_value_snapshot,e.course_fee_snapshot,e.monthly_fee_snapshot,s.full_name,sp.name specialty_name,b.name branch_name FROM enrollments e JOIN students s ON s.id=e.student_id JOIN specialties sp ON sp.id=e.specialty_id JOIN branches b ON b.id=e.branch_id WHERE e.id=? AND e.status='active'")
        .bind(&i.enrollment_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(AppError::NotFound)?;

    let billing: String = row.get("billing_mode_snapshot");
    let duration: i64 = row.get("duration_value_snapshot");
    let course: i64 = row.get("course_fee_snapshot");
    let monthly: i64 = row.get("monthly_fee_snapshot");
    let total = total_required(&billing, duration, course, monthly);
    let paid_before: i64 = sqlx::query_scalar("SELECT COALESCE(SUM(amount),0) FROM payments WHERE enrollment_id=? AND status='active'")
        .bind(&i.enrollment_id)
        .fetch_one(&mut *tx)
        .await?;
    if i.amount > total.saturating_sub(paid_before) {
        return Err(AppError::Validation);
    }

    let student_name: String = row.get("full_name");
    let specialty_name: String = row.get("specialty_name");
    let branch_name: String = row.get("branch_name");
    let register_number: i64 = row.get("register_number");
    let receipt = create_payment(
        &mut tx,
        &i.enrollment_id,
        &student_name,
        specialty_name,
        &branch_name,
        register_number,
        total,
        paid_before,
        i.amount,
        &i.payment_method_id,
        i.payment_date.as_deref(),
        clean_optional(i.description),
        actor,
        &billing,
    ).await?;

    audit(&mut tx, actor, "payment.created", "enrollment", &i.enrollment_id).await?;
    tx.commit().await?;
    Ok(receipt)
}

fn total_required(billing: &str, duration: i64, course: i64, monthly: i64) -> i64 {
    if billing == "monthly" { monthly.saturating_mul(duration) } else { course }
}

async fn find_or_create_student(tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>, i: &RegistrationInput) -> Result<String> {
    if let Some(phone) = i.phone.as_ref().map(|x| x.trim()).filter(|x| !x.is_empty()) {
        if let Some(id) = sqlx::query_scalar::<_, String>("SELECT id FROM students WHERE phone=? LIMIT 1")
            .bind(phone)
            .fetch_optional(&mut **tx)
            .await?
        {
            sqlx::query("UPDATE students SET full_name=?,secondary_phone=COALESCE(?,secondary_phone),updated_at=CURRENT_TIMESTAMP WHERE id=?")
                .bind(i.full_name.trim())
                .bind(clean_optional(i.secondary_phone.clone()))
                .bind(&id)
                .execute(&mut **tx)
                .await?;
            return Ok(id);
        }
    }
    new_student(tx, i).await
}

async fn new_student(tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>, i: &RegistrationInput) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO students(id,full_name,phone,secondary_phone,notes)VALUES(?,?,?,?,?)")
        .bind(&id)
        .bind(i.full_name.trim())
        .bind(clean_optional(i.phone.clone()))
        .bind(clean_optional(i.secondary_phone.clone()))
        .bind(clean_optional(i.notes.clone()))
        .execute(&mut **tx)
        .await?;
    Ok(id)
}

struct AllocationSummary {
    label: String,
    wording: String,
}

fn payment_timestamp(requested: Option<&str>) -> Result<String> {
    let now = Local::now();
    if let Some(raw) = requested.map(str::trim).filter(|v| !v.is_empty()) {
        NaiveDate::parse_from_str(raw, "%Y-%m-%d").map_err(|_| AppError::Validation)?;
        return Ok(format!("{}T{}{}", raw, now.format("%H:%M:%S"), now.format("%:z")));
    }
    Ok(now.to_rfc3339())
}

#[allow(clippy::too_many_arguments)]
async fn create_payment(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    enrollment_id: &str,
    student_name: &str,
    specialty_name: String,
    branch_name: &str,
    register_number: i64,
    total: i64,
    paid_before: i64,
    amount: i64,
    payment_method_id: &str,
    payment_date: Option<&str>,
    description: Option<String>,
    actor: &str,
    billing: &str,
) -> Result<ReceiptDto> {
    let method_name: String = sqlx::query_scalar("SELECT name FROM payment_methods WHERE id=? AND active=1")
        .bind(payment_method_id)
        .fetch_optional(&mut **tx)
        .await?
        .ok_or(AppError::NotFound)?;
    let payment_id = Uuid::new_v4().to_string();
    let paid_at = payment_timestamp(payment_date)?;
    sqlx::query("INSERT INTO payments(id,enrollment_id,amount,payment_method_id,paid_at,description,created_by)VALUES(?,?,?,?,?,?,?)")
        .bind(&payment_id)
        .bind(enrollment_id)
        .bind(amount)
        .bind(payment_method_id)
        .bind(&paid_at)
        .bind(description.as_deref())
        .bind(actor)
        .execute(&mut **tx)
        .await?;

    let allocation = if billing == "monthly" { allocate(tx, &payment_id, enrollment_id, amount).await? } else { None };
    let period_label = allocation.as_ref().map(|a| a.label.clone());
    let auto_description = if let Some(a) = allocation.as_ref() {
        format!("{} لدورة {}", a.wording, specialty_name)
    } else if paid_before.saturating_add(amount) >= total {
        format!("مدفوع كامل لدورة {}", specialty_name)
    } else {
        format!("مدفوع جزئي لدورة {}", specialty_name)
    };
    let final_description = description.unwrap_or(auto_description);
    sqlx::query("UPDATE payments SET description=? WHERE id=?")
        .bind(&final_description)
        .bind(&payment_id)
        .execute(&mut **tx)
        .await?;

    sqlx::query("UPDATE app_settings SET receipt_last=receipt_last+1,updated_at=CURRENT_TIMESTAMP WHERE id=1")
        .execute(&mut **tx)
        .await?;
    let receipt_number: i64 = sqlx::query_scalar("SELECT receipt_last FROM app_settings WHERE id=1")
        .fetch_one(&mut **tx)
        .await?;
    let center = sqlx::query("SELECT center_name,phone1,phone2,address,logo_data_url FROM app_settings WHERE id=1")
        .fetch_one(&mut **tx)
        .await?;

    let dto = ReceiptDto {
        receipt_number,
        student_name: student_name.trim().into(),
        specialty_name,
        branch_name: branch_name.into(),
        register_number,
        amount,
        remaining: total.saturating_sub(paid_before.saturating_add(amount)),
        method_name,
        issued_at: paid_at,
        center_name: center.get("center_name"),
        center_phone1: center.try_get::<String, _>("phone1").ok(),
        center_phone2: center.try_get::<String, _>("phone2").ok(),
        center_address: center.try_get::<String, _>("address").ok(),
        center_logo_data_url: center.try_get::<String, _>("logo_data_url").ok(),
        period_label,
        description: Some(final_description),
    };
    let snapshot = serde_json::to_string(&dto).map_err(|_| AppError::Validation)?;
    sqlx::query("INSERT INTO receipts(id,receipt_number,payment_id,enrollment_id,issued_at,snapshot_json)VALUES(?,?,?,?,?,?)")
        .bind(Uuid::new_v4().to_string())
        .bind(receipt_number)
        .bind(&payment_id)
        .bind(enrollment_id)
        .bind(&dto.issued_at)
        .bind(snapshot)
        .execute(&mut **tx)
        .await?;
    Ok(dto)
}

async fn allocate(tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>, payment_id: &str, enrollment_id: &str, mut left: i64) -> Result<Option<AllocationSummary>> {
    let rows = sqlx::query("SELECT b.id,b.period_number,b.amount_due-COALESCE(SUM(CASE WHEN p.status='active' THEN a.amount ELSE 0 END),0) remaining FROM billing_periods b LEFT JOIN payment_allocations a ON a.billing_period_id=b.id LEFT JOIN payments p ON p.id=a.payment_id WHERE b.enrollment_id=? GROUP BY b.id ORDER BY b.period_number")
        .bind(enrollment_id)
        .fetch_all(&mut **tx)
        .await?;
    let mut allocated: Vec<(i64, i64, i64)> = Vec::new();
    for row in rows {
        if left == 0 { break; }
        let remaining: i64 = row.get("remaining");
        let used = left.min(remaining.max(0));
        if used > 0 {
            sqlx::query("INSERT INTO payment_allocations(payment_id,billing_period_id,amount)VALUES(?,?,?)")
                .bind(payment_id)
                .bind(row.get::<String, _>("id"))
                .bind(used)
                .execute(&mut **tx)
                .await?;
            left -= used;
            allocated.push((row.get("period_number"), used, remaining));
        }
    }
    if left > 0 { return Err(AppError::Validation); }
    if allocated.is_empty() { return Ok(None); }
    let labels = allocated.iter().map(|(n,_,_)| format!("الشهر {}", n)).collect::<Vec<_>>();
    let wording = if allocated.len() == 1 {
        let (n, used, remaining_before) = allocated[0];
        if used >= remaining_before { format!("مدفوع الشهر {}", n) } else { format!("مدفوع جزئي من الشهر {}", n) }
    } else {
        let nums = allocated.iter().map(|(n,_,_)| n.to_string()).collect::<Vec<_>>().join("، ");
        let last = allocated.last().expect("allocation exists");
        if last.1 < last.2 { format!("دفعة للأشهر {} (جزئي في الشهر {})", nums, last.0) } else { format!("مدفوع الأشهر {}", nums) }
    };
    Ok(Some(AllocationSummary { label: labels.join("، "), wording }))
}

fn clean_optional(value: Option<String>) -> Option<String> {
    value.and_then(|v| {
        let trimmed = v.trim().to_string();
        (!trimmed.is_empty()).then_some(trimmed)
    })
}

pub(crate) async fn audit(tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>, actor: &str, action: &str, entity: &str, id: &str) -> Result<()> {
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
