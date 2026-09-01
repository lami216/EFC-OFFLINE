use super::helpers::{boolean, int, require_role, required_text, session, text};
use crate::{
    errors::{AppError, Result},
    models::*,
    services::registration,
    AppState,
};
use argon2::{
    password_hash::{PasswordHasher, SaltString},
    Argon2,
};
use serde_json::Value;
use sqlx::Row;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn settings_snapshot(
    state: State<'_, AppState>,
    token: String,
) -> Result<SettingsSnapshot> {
    let s = session(&state, &token)?;
    require_role(&s, &["ADMIN"])?;

    let c = sqlx::query("SELECT center_name,phone1,phone2,address,logo_data_url,ending_soon_days,receipt_last FROM app_settings WHERE id=1")
        .fetch_one(&state.pool)
        .await?;
    let center = CenterSettings {
        center_name: c.get("center_name"),
        phone1: c.get("phone1"),
        phone2: c.try_get::<String, _>("phone2").ok(),
        address: c.try_get::<String, _>("address").ok(),
        logo_data_url: c.try_get::<String, _>("logo_data_url").ok(),
        ending_soon_days: c.get("ending_soon_days"),
        receipt_last: c.get("receipt_last"),
    };
    let branches: Vec<Branch> = sqlx::query_as(
        "SELECT id,name,code,active FROM branches ORDER BY active DESC,name",
    )
    .fetch_all(&state.pool)
    .await?;
    let payment_methods: Vec<PaymentMethod> = sqlx::query_as(
        "SELECT id,name,logo_data_url,active FROM payment_methods ORDER BY active DESC,name",
    )
    .fetch_all(&state.pool)
    .await?;
    let users: Vec<UserListItem> = sqlx::query_as(
        "SELECT id,name,role,branch_id,active,last_login_at FROM users ORDER BY active DESC,name",
    )
    .fetch_all(&state.pool)
    .await?;

    let specialty_rows = sqlx::query("SELECT id,name,code,active,duration_value,duration_unit,billing_mode,course_fee,monthly_fee,description FROM specialties ORDER BY active DESC,name")
        .fetch_all(&state.pool)
        .await?;
    let mut specialties = Vec::new();
    for row in specialty_rows {
        let id: String = row.get("id");
        let branch_ids = sqlx::query_scalar::<_, String>(
            "SELECT branch_id FROM specialty_branches WHERE specialty_id=? AND active=1 ORDER BY branch_id",
        )
        .bind(&id)
        .fetch_all(&state.pool)
        .await?;
        specialties.push(SpecialtySetting {
            id,
            name: row.get("name"),
            code: row.get("code"),
            active: row.get("active"),
            duration_value: row.get("duration_value"),
            duration_unit: row.get("duration_unit"),
            billing_mode: row.get("billing_mode"),
            course_fee: row.get("course_fee"),
            monthly_fee: row.get("monthly_fee"),
            description: row.try_get::<String, _>("description").ok(),
            branch_ids,
        });
    }
    let sequences: Vec<RegisterSequenceItem> = sqlx::query_as("SELECT rs.branch_id,b.name branch_name,rs.specialty_id,sp.name specialty_name,rs.last_number FROM register_sequences rs JOIN branches b ON b.id=rs.branch_id JOIN specialties sp ON sp.id=rs.specialty_id ORDER BY b.name,sp.name")
        .fetch_all(&state.pool)
        .await?;

    Ok(SettingsSnapshot {
        center,
        branches,
        specialties,
        payment_methods,
        users,
        sequences,
    })
}

#[tauri::command]
pub async fn save_entity(
    state: State<'_, AppState>,
    token: String,
    kind: String,
    value: Value,
) -> Result<()> {
    let s = session(&state, &token)?;
    require_role(&s, &["ADMIN"])?;
    let mut tx = state.pool.begin().await?;
    let existing_id = text(&value, "id");
    let mut entity_id = existing_id
        .clone()
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    match kind.as_str() {
        "center" => {
            let name = required_text(&value, "centerName")?;
            let phone1 = required_text(&value, "phone1")?;
            let ending = int(&value, "endingSoonDays", 7).clamp(1, 60);
            sqlx::query("UPDATE app_settings SET center_name=?,phone1=?,phone2=?,address=?,logo_data_url=?,ending_soon_days=?,updated_at=CURRENT_TIMESTAMP WHERE id=1")
                .bind(name)
                .bind(phone1)
                .bind(text(&value, "phone2"))
                .bind(text(&value, "address"))
                .bind(text(&value, "logoDataUrl"))
                .bind(ending)
                .execute(&mut *tx)
                .await?;
            entity_id = "1".into();
        }
        "branch" => {
            let name = required_text(&value, "name")?;
            let code = required_text(&value, "code")?.to_uppercase();
            let active = boolean(&value, "active", true);
            if existing_id.is_some() {
                sqlx::query("UPDATE branches SET name=?,code=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
                    .bind(name).bind(code).bind(active).bind(&entity_id).execute(&mut *tx).await?;
            } else {
                sqlx::query("INSERT INTO branches(id,name,code,active)VALUES(?,?,?,?)")
                    .bind(&entity_id).bind(name).bind(code).bind(active).execute(&mut *tx).await?;
            }
        }
        "specialty" => {
            let name = required_text(&value, "name")?;
            let code = required_text(&value, "code")?.to_uppercase();
            let duration = int(&value, "durationValue", 0);
            let unit = required_text(&value, "durationUnit")?;
            let billing = required_text(&value, "billingMode")?;
            let course_fee = int(&value, "courseFee", 0);
            let monthly_fee = int(&value, "monthlyFee", 0);
            let active = boolean(&value, "active", true);
            let valid = duration > 0
                && ["day", "week", "month"].contains(&unit.as_str())
                && ["one_time", "monthly"].contains(&billing.as_str())
                && course_fee >= 0
                && monthly_fee >= 0
                && (billing != "monthly" || (unit == "month" && monthly_fee > 0))
                && (billing != "one_time" || course_fee > 0);
            if !valid {
                return Err(AppError::Validation);
            }
            if existing_id.is_some() {
                sqlx::query("UPDATE specialties SET name=?,code=?,active=?,duration_value=?,duration_unit=?,billing_mode=?,course_fee=?,monthly_fee=?,description=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
                    .bind(name).bind(code).bind(active).bind(duration).bind(&unit).bind(&billing).bind(course_fee).bind(monthly_fee).bind(text(&value,"description")).bind(&entity_id).execute(&mut *tx).await?;
            } else {
                sqlx::query("INSERT INTO specialties(id,name,code,active,duration_value,duration_unit,billing_mode,course_fee,monthly_fee,description)VALUES(?,?,?,?,?,?,?,?,?,?)")
                    .bind(&entity_id).bind(name).bind(code).bind(active).bind(duration).bind(&unit).bind(&billing).bind(course_fee).bind(monthly_fee).bind(text(&value,"description")).execute(&mut *tx).await?;
            }
            sqlx::query("DELETE FROM specialty_branches WHERE specialty_id=?")
                .bind(&entity_id)
                .execute(&mut *tx)
                .await?;
            if let Some(ids) = value.get("branchIds").and_then(Value::as_array) {
                for branch_id in ids.iter().filter_map(Value::as_str) {
                    sqlx::query("INSERT INTO specialty_branches(specialty_id,branch_id,active)VALUES(?,?,1)")
                        .bind(&entity_id)
                        .bind(branch_id)
                        .execute(&mut *tx)
                        .await?;
                }
            }
        }
        "payment_method" => {
            let name = required_text(&value, "name")?;
            let active = boolean(&value, "active", true);
            if existing_id.is_some() {
                sqlx::query("UPDATE payment_methods SET name=?,logo_data_url=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
                    .bind(name).bind(text(&value,"logoDataUrl")).bind(active).bind(&entity_id).execute(&mut *tx).await?;
            } else {
                sqlx::query("INSERT INTO payment_methods(id,name,logo_data_url,active)VALUES(?,?,?,?)")
                    .bind(&entity_id).bind(name).bind(text(&value,"logoDataUrl")).bind(active).execute(&mut *tx).await?;
            }
        }
        "user" => {
            let name = required_text(&value, "name")?;
            let role = required_text(&value, "role")?;
            if !["ADMIN", "REGISTRAR", "FINANCE"].contains(&role.as_str()) {
                return Err(AppError::Validation);
            }
            let active = boolean(&value, "active", true);
            let branch_id = if role == "ADMIN" {
                None
            } else {
                text(&value, "branchId")
            };
            let password = text(&value, "password");
            if entity_id == s.user_id && (!active || role != s.role) {
                return Err(AppError::Conflict);
            }
            if existing_id.is_none() && password.as_ref().map_or(true, |p| p.len() < 8) {
                return Err(AppError::Validation);
            }
            let hash = if let Some(password) = password {
                if password.len() < 8 {
                    return Err(AppError::Validation);
                }
                Some(
                    Argon2::default()
                        .hash_password(
                            password.as_bytes(),
                            &SaltString::generate(&mut rand_core::OsRng),
                        )
                        .map_err(|_| AppError::Validation)?
                        .to_string(),
                )
            } else {
                None
            };
            if existing_id.is_some() {
                if let Some(hash) = hash {
                    sqlx::query("UPDATE users SET name=?,role=?,branch_id=?,active=?,password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
                        .bind(name).bind(role).bind(branch_id).bind(active).bind(hash).bind(&entity_id).execute(&mut *tx).await?;
                } else {
                    sqlx::query("UPDATE users SET name=?,role=?,branch_id=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
                        .bind(name).bind(role).bind(branch_id).bind(active).bind(&entity_id).execute(&mut *tx).await?;
                }
            } else {
                sqlx::query("INSERT INTO users(id,name,password_hash,role,branch_id,active)VALUES(?,?,?,?,?,?)")
                    .bind(&entity_id).bind(name).bind(hash.ok_or(AppError::Validation)?).bind(role).bind(branch_id).bind(active).execute(&mut *tx).await?;
            }
        }
        "sequence" => {
            let branch_id = required_text(&value, "branchId")?;
            let specialty_id = required_text(&value, "specialtyId")?;
            let last = int(&value, "lastNumber", 0);
            if last < 0 {
                return Err(AppError::Validation);
            }
            let used: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM enrollments WHERE branch_id=? AND specialty_id=?",
            )
            .bind(&branch_id)
            .bind(&specialty_id)
            .fetch_one(&mut *tx)
            .await?;
            if used > 0 {
                return Err(AppError::Conflict);
            }
            sqlx::query("INSERT INTO register_sequences(branch_id,specialty_id,last_number)VALUES(?,?,?) ON CONFLICT(branch_id,specialty_id) DO UPDATE SET last_number=excluded.last_number")
                .bind(&branch_id).bind(&specialty_id).bind(last).execute(&mut *tx).await?;
            entity_id = format!("{branch_id}:{specialty_id}");
        }
        _ => return Err(AppError::Validation),
    }

    registration::audit(
        &mut tx,
        &s.user_id,
        "settings.updated",
        &kind,
        &entity_id,
    )
    .await?;
    tx.commit().await?;
    Ok(())
}
