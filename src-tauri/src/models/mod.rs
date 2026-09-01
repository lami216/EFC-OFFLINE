use serde::{Deserialize, Serialize};
#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Branch {
    pub id: String,
    pub name: String,
    pub code: String,
    pub active: bool,
}
#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Specialty {
    pub id: String,
    pub name: String,
    pub code: String,
    pub active: bool,
    pub duration_value: i64,
    pub duration_unit: String,
    pub billing_mode: String,
    pub course_fee: i64,
    pub monthly_fee: i64,
}
#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PaymentMethod {
    pub id: String,
    pub name: String,
    pub active: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Bootstrap {
    pub initialized: bool,
    pub branches: Vec<Branch>,
    pub specialties: Vec<Specialty>,
    pub payment_methods: Vec<PaymentMethod>,
    pub center_name: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupInput {
    pub center_name: String,
    pub phone1: String,
    pub phone2: Option<String>,
    pub address: Option<String>,
    pub admin_name: String,
    pub password: String,
    pub initial_receipt: i64,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistrationInput {
    pub full_name: String,
    pub phone: Option<String>,
    pub branch_id: String,
    pub specialty_id: String,
    pub start_date: String,
    pub payment_amount: i64,
    pub payment_method_id: Option<String>,
    pub notes: Option<String>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceiptDto {
    pub receipt_number: i64,
    pub student_name: String,
    pub specialty_name: String,
    pub branch_name: String,
    pub register_number: i64,
    pub amount: i64,
    pub remaining: i64,
    pub method_name: String,
    pub issued_at: String,
    pub center_name: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistrationResult {
    pub student_id: String,
    pub enrollment_id: String,
    pub register_number: i64,
    pub receipt: Option<ReceiptDto>,
}
