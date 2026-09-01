mod commands;
mod db;
mod errors;
mod models;
mod services;

use sqlx::SqlitePool;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::Manager;

#[derive(Clone)]
pub(crate) struct Session {
    pub user_id: String,
    pub name: String,
    pub role: String,
    pub branch_id: Option<String>,
}

pub(crate) struct AppState {
    pub pool: SqlitePool,
    pub db_path: PathBuf,
    pub sessions: Mutex<HashMap<String, Session>>,
}

fn apply_pending_restore(app_dir: &Path, db_path: &Path) -> std::io::Result<()> {
    let pending = app_dir.join("restore-pending.sqlite");
    if !pending.exists() {
        return Ok(());
    }
    if db_path.exists() {
        let safety = app_dir.join(format!(
            "pre-restore-{}.sqlite",
            chrono::Local::now().format("%Y-%m-%d-%H%M%S")
        ));
        std::fs::copy(db_path, safety)?;
        std::fs::remove_file(db_path)?;
    }
    std::fs::rename(&pending, db_path).or_else(|_| {
        std::fs::copy(&pending, db_path)?;
        std::fs::remove_file(&pending)
    })?;
    let _ = std::fs::remove_file(format!("{}-wal", db_path.display()));
    let _ = std::fs::remove_file(format!("{}-shm", db_path.display()));
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_dir)?;
            let db_path = app_dir.join("centre-efc.sqlite");
            apply_pending_restore(&app_dir, &db_path)?;
            let pool = tauri::async_runtime::block_on(db::connect(&db_path))
                .map_err(|e| Box::<dyn std::error::Error>::from(e.to_string()))?;
            app.manage(AppState {
                pool,
                db_path,
                sessions: Mutex::new(HashMap::new()),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::bootstrap,
            commands::first_run_setup,
            commands::login,
            commands::logout,
            commands::next_register_number,
            commands::register_student,
            commands::add_payment,
            commands::get_receipt,
            commands::student_details,
            commands::query_view,
            commands::finance_report,
            commands::settings_snapshot,
            commands::save_entity,
            commands::void_payment,
            commands::backup_database,
            commands::restore_database
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Centre EFC")
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::Row;

    async fn base() -> sqlx::SqlitePool {
        let p = db::memory().await;
        sqlx::query("INSERT INTO app_settings(id,center_name,phone1,receipt_last)VALUES(1,'EFC','1',499)")
            .execute(&p).await.unwrap();
        for (id, name, code) in [("b1", "A", "A"), ("b2", "B", "B")] {
            sqlx::query("INSERT INTO branches(id,name,code)VALUES(?,?,?)")
                .bind(id).bind(name).bind(code).execute(&p).await.unwrap();
        }
        for (id, name, code) in [("s1", "Hair", "H"), ("s2", "Sew", "S")] {
            sqlx::query("INSERT INTO specialties(id,name,code,duration_value,duration_unit,billing_mode,course_fee,monthly_fee)VALUES(?,?,?,3,'month','monthly',0,5000)")
                .bind(id).bind(name).bind(code).execute(&p).await.unwrap();
        }
        sqlx::query("INSERT INTO payment_methods(id,name)VALUES('cash','Cash')")
            .execute(&p).await.unwrap();
        sqlx::query("INSERT INTO users(id,name,password_hash,role)VALUES('u','Admin','x','ADMIN')")
            .execute(&p).await.unwrap();
        p
    }

    fn input(b: &str, s: &str, pay: i64) -> models::RegistrationInput {
        models::RegistrationInput {
            full_name: uuid::Uuid::new_v4().to_string(),
            phone: None,
            secondary_phone: None,
            branch_id: b.into(),
            specialty_id: s.into(),
            start_date: "2026-09-10".into(),
            payment_amount: pay,
            payment_method_id: Some("cash".into()),
            notes: None,
        }
    }

    #[tokio::test]
    async fn scoped_sequences_and_receipts() {
        let p = base().await;
        let a = services::registration::register(&p, input("b1", "s1", 5000), "u").await.unwrap();
        let b = services::registration::register(&p, input("b1", "s2", 5000), "u").await.unwrap();
        let c = services::registration::register(&p, input("b1", "s1", 5000), "u").await.unwrap();
        assert_eq!((a.register_number, b.register_number, c.register_number), (1, 1, 2));
        assert_eq!(a.receipt.unwrap().receipt_number, 500);
        assert_eq!(c.receipt.unwrap().receipt_number, 502);
    }

    #[tokio::test]
    async fn installments_partial_oldest_first() {
        let p = base().await;
        let r = services::registration::register(&p, input("b1", "s1", 7500), "u").await.unwrap();
        let rows = sqlx::query("SELECT period_number,COALESCE(SUM(amount),0) paid FROM billing_periods b LEFT JOIN payment_allocations a ON a.billing_period_id=b.id WHERE enrollment_id=? GROUP BY b.id ORDER BY period_number")
            .bind(r.enrollment_id).fetch_all(&p).await.unwrap();
        assert_eq!(rows[0].get::<i64, _>("paid"), 5000);
        assert_eq!(rows[1].get::<i64, _>("paid"), 2500);
        assert_eq!(rows[2].get::<i64, _>("paid"), 0);
    }

    #[tokio::test]
    async fn rollback_and_snapshot() {
        let p = base().await;
        assert!(services::registration::register(&p, input("bad", "s1", 0), "u").await.is_err());
        assert_eq!(sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM students").fetch_one(&p).await.unwrap(), 0);
        let r = services::registration::register(&p, input("b1", "s1", 0), "u").await.unwrap();
        sqlx::query("UPDATE specialties SET monthly_fee=9000 WHERE id='s1'").execute(&p).await.unwrap();
        let fee: i64 = sqlx::query_scalar("SELECT monthly_fee_snapshot FROM enrollments WHERE id=?")
            .bind(r.enrollment_id).fetch_one(&p).await.unwrap();
        assert_eq!(fee, 5000);
    }

    #[tokio::test]
    async fn later_payment_updates_remaining_and_receipt() {
        let p = base().await;
        let r = services::registration::register(&p, input("b1", "s1", 5000), "u").await.unwrap();
        let receipt = services::registration::add_payment(
            &p,
            models::AddPaymentInput {
                enrollment_id: r.enrollment_id,
                amount: 2500,
                payment_method_id: "cash".into(),
                description: Some("دفعة لاحقة".into()),
            },
            "u",
        ).await.unwrap();
        assert_eq!(receipt.remaining, 7500);
        assert_eq!(receipt.receipt_number, 501);
    }

    #[tokio::test]
    async fn void_excluded_from_totals() {
        let p = base().await;
        let r = services::registration::register(&p, input("b1", "s1", 5000), "u").await.unwrap();
        let id: String = sqlx::query_scalar("SELECT id FROM payments WHERE enrollment_id=?")
            .bind(r.enrollment_id).fetch_one(&p).await.unwrap();
        sqlx::query("UPDATE payments SET status='void' WHERE id=?").bind(id).execute(&p).await.unwrap();
        let total: i64 = sqlx::query_scalar("SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='active'")
            .fetch_one(&p).await.unwrap();
        assert_eq!(total, 0);
    }
}
