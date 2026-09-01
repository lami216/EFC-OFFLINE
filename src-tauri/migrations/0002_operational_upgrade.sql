ALTER TABLE app_settings ADD COLUMN logo_data_url TEXT;
ALTER TABLE payment_methods ADD COLUMN logo_data_url TEXT;
ALTER TABLE users ADD COLUMN last_login_at TEXT;

CREATE INDEX IF NOT EXISTS idx_enrollments_branch_specialty ON enrollments(branch_id,specialty_id,status);
CREATE INDEX IF NOT EXISTS idx_billing_periods_due ON billing_periods(due_date,enrollment_id);
CREATE INDEX IF NOT EXISTS idx_payments_method_date ON payments(payment_method_id,paid_at,status);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
