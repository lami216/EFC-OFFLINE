use super::helpers::{effective_branch, require_role, row_value, session, text};
use crate::{errors::Result, AppState};
use chrono::Local;
use serde_json::Value;
use tauri::State;

#[tauri::command]
pub async fn query_view(
    state: State<'_, AppState>,
    token: String,
    kind: String,
    filters: Value,
) -> Result<Vec<Value>> {
    let s = session(&state, &token)?;
    if kind == "ledger" {
        require_role(&s, &["ADMIN", "FINANCE"])?;
    } else {
        require_role(&s, &["ADMIN", "REGISTRAR", "FINANCE"])?;
    }
    let branch = effective_branch(&s, text(&filters, "branchId"))?;
    let specialty = text(&filters, "specialtyId");
    let q = text(&filters, "q").unwrap_or_default();
    let like = format!("%{q}%");
    let from = text(&filters, "from").unwrap_or_default();
    let to = text(&filters, "to").unwrap_or_default();
    let method = text(&filters, "paymentMethodId");
    let today = Local::now().date_naive().to_string();

    let rows = match kind.as_str() {
        "students" => {
            sqlx::query("WITH paid AS (SELECT enrollment_id,SUM(amount) paid FROM payments WHERE status='active' GROUP BY enrollment_id) SELECT s.id AS _studentId,e.id AS _enrollmentId,e.register_number AS 'رقم السجل',s.full_name AS 'اسم الطالب',COALESCE(s.phone,'—') AS 'الهاتف',sp.name AS 'التخصص',b.name AS 'الفرع',e.start_date AS 'البداية',e.end_date AS 'النهاية',CASE WHEN e.billing_mode_snapshot='monthly' THEN e.monthly_fee_snapshot*e.duration_value_snapshot ELSE e.course_fee_snapshot END AS 'المطلوب',COALESCE(p.paid,0) AS 'المدفوع',MAX(CASE WHEN e.billing_mode_snapshot='monthly' THEN e.monthly_fee_snapshot*e.duration_value_snapshot ELSE e.course_fee_snapshot END-COALESCE(p.paid,0),0) AS 'المتبقي',CASE WHEN e.billing_mode_snapshot!='monthly' THEN '—' ELSE COALESCE((SELECT 'الشهر '||bp.period_number||' — '||CASE WHEN COALESCE((SELECT SUM(a.amount) FROM payment_allocations a JOIN payments px ON px.id=a.payment_id WHERE a.billing_period_id=bp.id AND px.status='active'),0)>0 THEN 'دفع جزئي' WHEN date(bp.due_date)<date('now','localtime') THEN 'متأخر' WHEN date(bp.due_date)<=date('now','localtime','+3 day') THEN 'مستحق' ELSE 'لم يحن' END FROM billing_periods bp WHERE bp.enrollment_id=e.id AND bp.amount_due>COALESCE((SELECT SUM(a.amount) FROM payment_allocations a JOIN payments px ON px.id=a.payment_id WHERE a.billing_period_id=bp.id AND px.status='active'),0) ORDER BY bp.period_number LIMIT 1),'كل الأشهر مدفوعة') END AS 'حالة الشهر' FROM students s JOIN enrollments e ON e.student_id=s.id JOIN specialties sp ON sp.id=e.specialty_id JOIN branches b ON b.id=e.branch_id LEFT JOIN paid p ON p.enrollment_id=e.id WHERE (?='' OR s.full_name LIKE ? OR COALESCE(s.phone,'') LIKE ? OR CAST(e.register_number AS TEXT)=?) AND (? IS NULL OR e.branch_id=?) AND (? IS NULL OR e.specialty_id=?) ORDER BY e.created_at DESC LIMIT 500")
                .bind(&q).bind(&like).bind(&like).bind(&q)
                .bind(branch.as_deref()).bind(branch.as_deref())
                .bind(specialty.as_deref()).bind(specialty.as_deref())
                .fetch_all(&state.pool).await?
        }
        "specialties" => {
            sqlx::query("WITH paid AS (SELECT enrollment_id,SUM(amount) paid FROM payments WHERE status='active' GROUP BY enrollment_id), base AS (SELECT e.*,CASE WHEN e.billing_mode_snapshot='monthly' THEN e.monthly_fee_snapshot*e.duration_value_snapshot ELSE e.course_fee_snapshot END total FROM enrollments e) SELECT sp.id AS _specialtyId,sp.name AS 'التخصص',sp.duration_value AS 'المدة',CASE sp.duration_unit WHEN 'month' THEN 'شهر' WHEN 'week' THEN 'أسبوع' ELSE 'يوم' END AS 'الوحدة',CASE sp.billing_mode WHEN 'monthly' THEN 'شهري' ELSE 'دفعة واحدة' END AS 'نظام الدفع',COUNT(e.id) AS 'الطلاب',COALESCE(SUM(COALESCE(p.paid,0)),0) AS 'المحصل',COALESCE(SUM(MAX(e.total-COALESCE(p.paid,0),0)),0) AS 'المتبقي' FROM specialties sp LEFT JOIN base e ON e.specialty_id=sp.id AND (? IS NULL OR e.branch_id=?) LEFT JOIN paid p ON p.enrollment_id=e.id WHERE sp.active=1 GROUP BY sp.id ORDER BY sp.name")
                .bind(branch.as_deref()).bind(branch.as_deref())
                .fetch_all(&state.pool).await?
        }
        "status" => {
            sqlx::query("WITH paid AS (SELECT enrollment_id,SUM(amount) paid FROM payments WHERE status='active' GROUP BY enrollment_id) SELECT s.id AS _studentId,e.id AS _enrollmentId,e.register_number AS 'رقم السجل',s.full_name AS 'اسم الطالب',sp.name AS 'التخصص',b.name AS 'الفرع',e.end_date AS 'تاريخ النهاية',CASE WHEN e.billing_mode_snapshot='monthly' THEN e.monthly_fee_snapshot*e.duration_value_snapshot ELSE e.course_fee_snapshot END AS 'المطلوب',COALESCE(p.paid,0) AS 'المدفوع',MAX(CASE WHEN e.billing_mode_snapshot='monthly' THEN e.monthly_fee_snapshot*e.duration_value_snapshot ELSE e.course_fee_snapshot END-COALESCE(p.paid,0),0) AS 'المتبقي',CASE WHEN e.status='cancelled' THEN 'ملغاة' WHEN date(e.end_date)<date('now','localtime') THEN 'انتهت' WHEN date(e.end_date)<=date('now','localtime','+'||(SELECT ending_soon_days FROM app_settings WHERE id=1)||' day') THEN 'ستنتهي قريباً' ELSE 'نشطة' END AS 'وضع الدورة',CASE WHEN e.billing_mode_snapshot='monthly' THEN COALESCE((SELECT CASE WHEN COALESCE((SELECT SUM(a.amount) FROM payment_allocations a JOIN payments px ON px.id=a.payment_id WHERE a.billing_period_id=bp.id AND px.status='active'),0)>0 THEN 'دفع جزئي' WHEN date(bp.due_date)<date('now','localtime') THEN 'متأخر' WHEN date(bp.due_date)<=date('now','localtime','+3 day') THEN 'مستحق الآن' ELSE 'لا مستحق الآن' END FROM billing_periods bp WHERE bp.enrollment_id=e.id AND bp.amount_due>COALESCE((SELECT SUM(a.amount) FROM payment_allocations a JOIN payments px ON px.id=a.payment_id WHERE a.billing_period_id=bp.id AND px.status='active'),0) ORDER BY bp.period_number LIMIT 1),'مدفوع كامل') WHEN MAX(e.course_fee_snapshot-COALESCE(p.paid,0),0)=0 THEN 'مدفوع كامل' WHEN COALESCE(p.paid,0)=0 THEN 'لم يدفع' ELSE 'دفع جزئي' END AS 'الوضعية المالية',CASE WHEN e.billing_mode_snapshot!='monthly' THEN '—' ELSE COALESCE((SELECT 'الشهر '||bp.period_number||' — '||CASE WHEN COALESCE((SELECT SUM(a.amount) FROM payment_allocations a JOIN payments px ON px.id=a.payment_id WHERE a.billing_period_id=bp.id AND px.status='active'),0)>0 THEN 'دفع جزئي' WHEN date(bp.due_date)<date('now','localtime') THEN 'متأخر' WHEN date(bp.due_date)<=date('now','localtime','+3 day') THEN 'مستحق' ELSE 'لم يحن' END FROM billing_periods bp WHERE bp.enrollment_id=e.id AND bp.amount_due>COALESCE((SELECT SUM(a.amount) FROM payment_allocations a JOIN payments px ON px.id=a.payment_id WHERE a.billing_period_id=bp.id AND px.status='active'),0) ORDER BY bp.period_number LIMIT 1),'كل الأشهر مدفوعة') END AS 'حالة الشهر' FROM enrollments e JOIN students s ON s.id=e.student_id JOIN specialties sp ON sp.id=e.specialty_id JOIN branches b ON b.id=e.branch_id LEFT JOIN paid p ON p.enrollment_id=e.id WHERE (?='' OR s.full_name LIKE ? OR COALESCE(s.phone,'') LIKE ? OR CAST(e.register_number AS TEXT)=?) AND (? IS NULL OR e.branch_id=?) AND (? IS NULL OR e.specialty_id=?) ORDER BY e.end_date,e.register_number LIMIT 500")
                .bind(&q).bind(&like).bind(&like).bind(&q)
                .bind(branch.as_deref()).bind(branch.as_deref())
                .bind(specialty.as_deref()).bind(specialty.as_deref())
                .fetch_all(&state.pool).await?
        }
        "ledger" => {
            let day = if from.is_empty() { today } else { from.clone() };
            sqlx::query("SELECT s.id AS _studentId,p.id AS _paymentId,r.receipt_number AS 'رقم الوصل',date(p.paid_at,'localtime') AS 'التاريخ',s.full_name AS 'اسم الطالب',sp.name AS 'التخصص',b.name AS 'الفرع',COALESCE(p.description,'دفعة') AS 'البيان',pm.name AS 'وسيلة الدفع',p.amount AS 'المبلغ',u.name AS 'الموظف' FROM payments p JOIN receipts r ON r.payment_id=p.id JOIN enrollments e ON e.id=p.enrollment_id JOIN students s ON s.id=e.student_id JOIN specialties sp ON sp.id=e.specialty_id JOIN branches b ON b.id=e.branch_id JOIN payment_methods pm ON pm.id=p.payment_method_id JOIN users u ON u.id=p.created_by WHERE p.status='active' AND date(p.paid_at,'localtime')=? AND (? IS NULL OR e.branch_id=?) AND (? IS NULL OR e.specialty_id=?) AND (? IS NULL OR p.payment_method_id=?) ORDER BY p.paid_at DESC,p.rowid DESC")
                .bind(day)
                .bind(branch.as_deref()).bind(branch.as_deref())
                .bind(specialty.as_deref()).bind(specialty.as_deref())
                .bind(method.as_deref()).bind(method.as_deref())
                .fetch_all(&state.pool).await?
        }
        "period_registrations" => {
            sqlx::query("SELECT s.id AS _studentId,e.id AS _enrollmentId,e.register_number AS 'رقم السجل',s.full_name AS 'اسم الطالب',sp.name AS 'التخصص',b.name AS 'الفرع',date(e.created_at,'localtime') AS 'تاريخ التسجيل',e.start_date AS 'البداية',e.end_date AS 'النهاية' FROM enrollments e JOIN students s ON s.id=e.student_id JOIN specialties sp ON sp.id=e.specialty_id JOIN branches b ON b.id=e.branch_id WHERE (?='' OR date(e.created_at,'localtime')>=date(?)) AND (?='' OR date(e.created_at,'localtime')<=date(?)) AND (?='' OR s.full_name LIKE ? OR COALESCE(s.phone,'') LIKE ? OR CAST(e.register_number AS TEXT)=?) AND (? IS NULL OR e.branch_id=?) AND (? IS NULL OR e.specialty_id=?) ORDER BY e.created_at DESC")
                .bind(&from).bind(&from).bind(&to).bind(&to)
                .bind(&q).bind(&like).bind(&like).bind(&q)
                .bind(branch.as_deref()).bind(branch.as_deref())
                .bind(specialty.as_deref()).bind(specialty.as_deref())
                .fetch_all(&state.pool).await?
        }
        "period_payments" => {
            sqlx::query("SELECT s.id AS _studentId,e.id AS _enrollmentId,r.receipt_number AS 'رقم الوصل',date(p.paid_at,'localtime') AS 'التاريخ',s.full_name AS 'اسم الطالب',sp.name AS 'التخصص',b.name AS 'الفرع',COALESCE(p.description,'دفعة') AS 'البيان',pm.name AS 'الوسيلة',p.amount AS 'المبلغ' FROM payments p JOIN receipts r ON r.payment_id=p.id JOIN enrollments e ON e.id=p.enrollment_id JOIN students s ON s.id=e.student_id JOIN specialties sp ON sp.id=e.specialty_id JOIN branches b ON b.id=e.branch_id JOIN payment_methods pm ON pm.id=p.payment_method_id WHERE p.status='active' AND (?='' OR date(p.paid_at,'localtime')>=date(?)) AND (?='' OR date(p.paid_at,'localtime')<=date(?)) AND (?='' OR s.full_name LIKE ? OR COALESCE(s.phone,'') LIKE ? OR CAST(e.register_number AS TEXT)=?) AND (? IS NULL OR e.branch_id=?) AND (? IS NULL OR e.specialty_id=?) ORDER BY p.paid_at DESC,p.rowid DESC")
                .bind(&from).bind(&from).bind(&to).bind(&to)
                .bind(&q).bind(&like).bind(&like).bind(&q)
                .bind(branch.as_deref()).bind(branch.as_deref())
                .bind(specialty.as_deref()).bind(specialty.as_deref())
                .fetch_all(&state.pool).await?
        }
        "period_dues" => {
            sqlx::query("WITH paid_enrollment AS (SELECT enrollment_id,SUM(amount) paid FROM payments WHERE status='active' GROUP BY enrollment_id), monthly AS (SELECT s.id _studentId,e.id _enrollmentId,e.register_number registerNo,s.full_name studentName,sp.name specialtyName,b.name branchName,'الشهر '||bp.period_number periodName,bp.due_date dueDate,bp.amount_due required,COALESCE(SUM(CASE WHEN p.status='active' THEN a.amount ELSE 0 END),0) paid,MAX(bp.amount_due-COALESCE(SUM(CASE WHEN p.status='active' THEN a.amount ELSE 0 END),0),0) remaining,CASE WHEN COALESCE(SUM(CASE WHEN p.status='active' THEN a.amount ELSE 0 END),0)>0 THEN 'دفع جزئي' WHEN date(bp.due_date)<date('now','localtime') THEN 'متأخر' WHEN date(bp.due_date)<=date('now','localtime','+3 day') THEN 'مستحق' ELSE 'لم يحن' END state FROM billing_periods bp JOIN enrollments e ON e.id=bp.enrollment_id JOIN students s ON s.id=e.student_id JOIN specialties sp ON sp.id=e.specialty_id JOIN branches b ON b.id=e.branch_id LEFT JOIN payment_allocations a ON a.billing_period_id=bp.id LEFT JOIN payments p ON p.id=a.payment_id WHERE (?='' OR bp.due_date>=?) AND (?='' OR bp.due_date<=?) AND (?='' OR s.full_name LIKE ? OR COALESCE(s.phone,'') LIKE ? OR CAST(e.register_number AS TEXT)=?) AND (? IS NULL OR e.branch_id=?) AND (? IS NULL OR e.specialty_id=?) GROUP BY bp.id HAVING remaining>0), single_due AS (SELECT s.id _studentId,e.id _enrollmentId,e.register_number registerNo,s.full_name studentName,sp.name specialtyName,b.name branchName,'—' periodName,e.start_date dueDate,e.course_fee_snapshot required,COALESCE(pe.paid,0) paid,MAX(e.course_fee_snapshot-COALESCE(pe.paid,0),0) remaining,CASE WHEN COALESCE(pe.paid,0)>0 THEN 'دفع جزئي' WHEN date(e.start_date)<date('now','localtime') THEN 'متأخر' WHEN date(e.start_date)<=date('now','localtime','+3 day') THEN 'مستحق' ELSE 'لم يحن' END state FROM enrollments e JOIN students s ON s.id=e.student_id JOIN specialties sp ON sp.id=e.specialty_id JOIN branches b ON b.id=e.branch_id LEFT JOIN paid_enrollment pe ON pe.enrollment_id=e.id WHERE e.billing_mode_snapshot='one_time' AND e.status='active' AND MAX(e.course_fee_snapshot-COALESCE(pe.paid,0),0)>0 AND (?='' OR e.start_date>=?) AND (?='' OR e.start_date<=?) AND (?='' OR s.full_name LIKE ? OR COALESCE(s.phone,'') LIKE ? OR CAST(e.register_number AS TEXT)=?) AND (? IS NULL OR e.branch_id=?) AND (? IS NULL OR e.specialty_id=?)) SELECT _studentId,_enrollmentId,registerNo AS 'رقم السجل',studentName AS 'اسم الطالب',specialtyName AS 'التخصص',branchName AS 'الفرع',periodName AS 'الشهر',dueDate AS 'تاريخ الاستحقاق',required AS 'المطلوب',paid AS 'المدفوع',remaining AS 'المتبقي',state AS 'الوضعية' FROM (SELECT * FROM monthly UNION ALL SELECT * FROM single_due) ORDER BY dueDate,registerNo")
                .bind(&from).bind(&from).bind(&to).bind(&to)
                .bind(&q).bind(&like).bind(&like).bind(&q)
                .bind(branch.as_deref()).bind(branch.as_deref())
                .bind(specialty.as_deref()).bind(specialty.as_deref())
                .bind(&from).bind(&from).bind(&to).bind(&to)
                .bind(&q).bind(&like).bind(&like).bind(&q)
                .bind(branch.as_deref()).bind(branch.as_deref())
                .bind(specialty.as_deref()).bind(specialty.as_deref())
                .fetch_all(&state.pool).await?
        }
        "period_ended" => {
            sqlx::query("SELECT s.id AS _studentId,e.id AS _enrollmentId,e.register_number AS 'رقم السجل',s.full_name AS 'اسم الطالب',sp.name AS 'التخصص',b.name AS 'الفرع',e.end_date AS 'تاريخ النهاية' FROM enrollments e JOIN students s ON s.id=e.student_id JOIN specialties sp ON sp.id=e.specialty_id JOIN branches b ON b.id=e.branch_id WHERE (?='' OR e.end_date>=?) AND (?='' OR e.end_date<=?) AND (?='' OR s.full_name LIKE ? OR COALESCE(s.phone,'') LIKE ? OR CAST(e.register_number AS TEXT)=?) AND (? IS NULL OR e.branch_id=?) AND (? IS NULL OR e.specialty_id=?) ORDER BY e.end_date")
                .bind(&from).bind(&from).bind(&to).bind(&to)
                .bind(&q).bind(&like).bind(&like).bind(&q)
                .bind(branch.as_deref()).bind(branch.as_deref())
                .bind(specialty.as_deref()).bind(specialty.as_deref())
                .fetch_all(&state.pool).await?
        }
        _ => return Ok(vec![]),
    };

    Ok(rows.iter().map(row_value).collect())
}
