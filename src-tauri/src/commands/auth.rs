use super::helpers::{effective_branch, require_role, session};
use crate::{
    errors::{AppError, Result},
    models::{LoginResult, UserSessionDto},
    AppState, Session,
};
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use sqlx::Row;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn login(
    state: State<'_, AppState>,
    name: String,
    password: String,
) -> Result<LoginResult> {
    let row = sqlx::query(
        "SELECT id,name,password_hash,role,branch_id FROM users WHERE name=? AND active=1",
    )
    .bind(name.trim())
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    let hash: String = row.get("password_hash");
    Argon2::default()
        .verify_password(
            password.as_bytes(),
            &PasswordHash::new(&hash).map_err(|_| AppError::Unauthorized)?,
        )
        .map_err(|_| AppError::Unauthorized)?;

    let role: String = row.get("role");
    let branch_id = if role == "ADMIN" {
        None
    } else {
        row.try_get::<String, _>("branch_id").ok()
    };
    let user = UserSessionDto {
        id: row.get("id"),
        name: row.get("name"),
        role,
        branch_id,
    };
    sqlx::query("UPDATE users SET last_login_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(&user.id)
        .execute(&state.pool)
        .await?;

    let token = Uuid::new_v4().to_string();
    state
        .sessions
        .lock()
        .map_err(|_| AppError::Unauthorized)?
        .insert(
            token.clone(),
            Session {
                user_id: user.id.clone(),
                name: user.name.clone(),
                role: user.role.clone(),
                branch_id: user.branch_id.clone(),
            },
        );
    Ok(LoginResult { token, user })
}

#[tauri::command]
pub async fn logout(state: State<'_, AppState>, token: String) -> Result<()> {
    state
        .sessions
        .lock()
        .map_err(|_| AppError::Unauthorized)?
        .remove(&token);
    Ok(())
}

#[tauri::command]
pub async fn next_register_number(
    state: State<'_, AppState>,
    token: String,
    branch_id: String,
    specialty_id: String,
) -> Result<i64> {
    let s = session(&state, &token)?;
    require_role(&s, &["ADMIN", "REGISTRAR"])?;
    effective_branch(&s, Some(branch_id.clone()))?;

    let active: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM branches b CROSS JOIN specialties sp WHERE b.id=? AND b.active=1 AND sp.id=? AND sp.active=1",
    )
    .bind(&branch_id)
    .bind(&specialty_id)
    .fetch_one(&state.pool)
    .await?;
    if active == 0 {
        return Err(AppError::Validation);
    }
    let last = sqlx::query_scalar::<_, i64>(
        "SELECT last_number FROM register_sequences WHERE branch_id=? AND specialty_id=?",
    )
    .bind(branch_id)
    .bind(specialty_id)
    .fetch_optional(&state.pool)
    .await?
    .unwrap_or(0);
    Ok(last + 1)
}
