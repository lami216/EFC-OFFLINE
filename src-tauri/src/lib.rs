mod commands;
mod db;
mod errors;
mod models;
mod services;
use tauri::Manager;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let path = app.path().app_data_dir()?.join("centre-efc.sqlite");
            let pool = tauri::async_runtime::block_on(db::connect(&path))
                .map_err(|e| Box::<dyn std::error::Error>::from(e.to_string()))?;
            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::bootstrap,
            commands::first_run_setup,
            commands::login,
            commands::register_student,
            commands::query_view,
            commands::void_payment,
            commands::save_entity,
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
        sqlx::query(
            "INSERT INTO app_settings(id,center_name,phone1,receipt_last)VALUES(1,'EFC','1',499)",
        )
        .execute(&p)
        .await
        .unwrap();
        for (id, name, code) in [("b1", "A", "A"), ("b2", "B", "B")] {
            sqlx::query("INSERT INTO branches(id,name,code)VALUES(?,?,?)")
                .bind(id)
                .bind(name)
                .bind(code)
                .execute(&p)
                .await
                .unwrap();
        }
        for (id, name, code) in [("s1", "Hair", "H"), ("s2", "Sew", "S")] {
            sqlx::query("INSERT INTO specialties(id,name,code,duration_value,duration_unit,billing_mode,course_fee,monthly_fee)VALUES(?,?,?,3,'month','monthly',0,5000)").bind(id).bind(name).bind(code).execute(&p).await.unwrap();
        }
        sqlx::query("INSERT INTO payment_methods(id,name)VALUES('cash','Cash')")
            .execute(&p)
            .await
            .unwrap();
        sqlx::query("INSERT INTO users(id,name,password_hash,role)VALUES('u','Admin','x','ADMIN')")
            .execute(&p)
            .await
            .unwrap();
        p
    }
    fn input(b: &str, s: &str, pay: i64) -> models::RegistrationInput {
        models::RegistrationInput {
            full_name: uuid::Uuid::new_v4().to_string(),
            phone: None,
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
        let a = services::registration::register(&p, input("b1", "s1", 5000))
            .await
            .unwrap();
        let b = services::registration::register(&p, input("b1", "s2", 5000))
            .await
            .unwrap();
        let c = services::registration::register(&p, input("b1", "s1", 5000))
            .await
            .unwrap();
        assert_eq!(
            (a.register_number, b.register_number, c.register_number),
            (1, 1, 2)
        );
        assert_eq!(a.receipt.unwrap().receipt_number, 500);
        assert_eq!(c.receipt.unwrap().receipt_number, 502)
    }
    #[tokio::test]
    async fn installments_partial_oldest_first() {
        let p = base().await;
        let r = services::registration::register(&p, input("b1", "s1", 7500))
            .await
            .unwrap();
        let rows=sqlx::query("SELECT period_number,COALESCE(SUM(amount),0) paid FROM billing_periods b LEFT JOIN payment_allocations a ON a.billing_period_id=b.id WHERE enrollment_id=? GROUP BY b.id ORDER BY period_number").bind(r.enrollment_id).fetch_all(&p).await.unwrap();
        assert_eq!(rows[0].get::<i64, _>("paid"), 5000);
        assert_eq!(rows[1].get::<i64, _>("paid"), 2500);
        assert_eq!(rows[2].get::<i64, _>("paid"), 0)
    }
    #[tokio::test]
    async fn rollback_and_snapshot() {
        let p = base().await;
        assert!(services::registration::register(&p, input("bad", "s1", 0))
            .await
            .is_err());
        assert_eq!(
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM students")
                .fetch_one(&p)
                .await
                .unwrap(),
            0
        );
        let r = services::registration::register(&p, input("b1", "s1", 0))
            .await
            .unwrap();
        sqlx::query("UPDATE specialties SET monthly_fee=9000 WHERE id='s1'")
            .execute(&p)
            .await
            .unwrap();
        let fee: i64 =
            sqlx::query_scalar("SELECT monthly_fee_snapshot FROM enrollments WHERE id=?")
                .bind(r.enrollment_id)
                .fetch_one(&p)
                .await
                .unwrap();
        assert_eq!(fee, 5000)
    }
    #[tokio::test]
    async fn void_excluded_from_totals() {
        let p = base().await;
        let r = services::registration::register(&p, input("b1", "s1", 5000))
            .await
            .unwrap();
        let id: String = sqlx::query_scalar("SELECT id FROM payments WHERE enrollment_id=?")
            .bind(r.enrollment_id)
            .fetch_one(&p)
            .await
            .unwrap();
        sqlx::query("UPDATE payments SET status='void' WHERE id=?")
            .bind(id)
            .execute(&p)
            .await
            .unwrap();
        let total: i64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='active'",
        )
        .fetch_one(&p)
        .await
        .unwrap();
        assert_eq!(total, 0)
    }
}
