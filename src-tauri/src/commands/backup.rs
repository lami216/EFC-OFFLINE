use super::helpers::{require_role, session};
use crate::{errors::{AppError, Result}, AppState};
use sqlx::sqlite::SqliteConnectOptions;
use std::path::Path;
use tauri::State;

fn sql_path(path: &Path) -> String {
    path.to_string_lossy().replace('\'', "''")
}

#[tauri::command]
pub async fn backup_database(
    state: State<'_, AppState>,
    token: String,
    destination: String,
) -> Result<String> {
    let s = session(&state, &token)?;
    require_role(&s, &["ADMIN"])?;
    let path = Path::new(&destination);
    if destination.trim().is_empty() || path == state.db_path.as_path() {
        return Err(AppError::Validation);
    }
    if path.exists() {
        std::fs::remove_file(path)?;
    }
    sqlx::query(&format!("VACUUM INTO '{}'", sql_path(path)))
        .execute(&state.pool)
        .await?;
    Ok(destination)
}

#[tauri::command]
pub async fn restore_database(
    state: State<'_, AppState>,
    token: String,
    source: String,
) -> Result<String> {
    let s = session(&state, &token)?;
    require_role(&s, &["ADMIN"])?;
    let source_path = Path::new(&source);
    if !source_path.is_file() || source_path == state.db_path.as_path() {
        return Err(AppError::InvalidBackup);
    }

    let options = SqliteConnectOptions::new().filename(source_path).read_only(true);
    let check = sqlx::SqlitePool::connect_with(options)
        .await
        .map_err(|_| AppError::InvalidBackup)?;
    let required: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('app_settings','users','students','enrollments','payments','receipts')")
        .fetch_one(&check)
        .await
        .map_err(|_| AppError::InvalidBackup)?;
    check.close().await;
    if required < 6 {
        return Err(AppError::InvalidBackup);
    }

    let app_dir = state.db_path.parent().ok_or(AppError::Validation)?;
    let safety = app_dir.join(format!(
        "pre-restore-{}.sqlite",
        chrono::Local::now().format("%Y-%m-%d-%H%M%S")
    ));
    sqlx::query(&format!("VACUUM INTO '{}'", sql_path(&safety)))
        .execute(&state.pool)
        .await?;

    let pending = app_dir.join("restore-pending.sqlite");
    if pending.exists() {
        std::fs::remove_file(&pending)?;
    }
    std::fs::copy(source_path, &pending)?;
    Ok(pending.to_string_lossy().into_owned())
}
