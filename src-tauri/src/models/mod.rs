use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Branch {
    pub id: String,
    pub name: String,
    pub code: String,
    pub active: bool,
}

#[derive(Clone, Serialize, sqlx::FromRow)]
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

#[derive(Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct SpecialtyBranch {
    pub specialty_id: String,
    pub branch_id: String,
    pub active: bool,
}

#[derive(Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PaymentMethod {
    pub id: String,
    pub name: String,
    pub logo_data_url: Option<String>,
    pub active: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Bootstrap {
    pub initialized: bool,
    pub branches: Vec<Branch>,
    pub specialties: Vec<Specialty>,
    pub specialty_branches: Vec<SpecialtyBranch>,
    pub payment_methods: Vec<PaymentMethod>,
    pub center_name: String,
    pub center_logo_data_url: Option<String>,
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
    pub secondary_phone: Option<String>,
    pub branch_id: String,
    pub specialty_id: String,
    pub start_date: String,
    pub payment_amount: i64,
    pub payment_method_id: Option<String>,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddPaymentInput {
    pub enrollment_id: String,
    pub amount: i64,
    pub payment_method_id: String,
    pub description: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
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
    #[serde(default)]
    pub center_phone1: Option<String>,
    #[serde(default)]
    pub center_phone2: Option<String>,
    #[serde(default)]
    pub center_address: Option<String>,
    #[serde(default)]
    pub center_logo_data_url: Option<String>,
    #[serde(default)]
    pub period_label: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistrationResult {
    pub student_id: String,
    pub enrollment_id: String,
    pub register_number: i64,
    pub receipt: Option<ReceiptDto>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserSessionDto {
    pub id: String,
    pub name: String,
    pub role: String,
    pub branch_id: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResult {
    pub token: String,
    pub user: UserSessionDto,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CenterSettings {
    pub center_name: String,
    pub phone1: String,
    pub phone2: Option<String>,
    pub address: Option<String>,
    pub logo_data_url: Option<String>,
    pub ending_soon_days: i64,
    pub receipt_last: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecialtySetting {
    pub id: String,
    pub name: String,
    pub code: String,
    pub active: bool,
    pub duration_value: i64,
    pub duration_unit: String,
    pub billing_mode: String,
    pub course_fee: i64,
    pub monthly_fee: i64,
    pub description: Option<String>,
    pub branch_ids: Vec<String>,
}

#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct UserListItem {
    pub id: String,
    pub name: String,
    pub role: String,
    pub branch_id: Option<String>,
    pub active: bool,
    pub last_login_at: Option<String>,
}

#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct RegisterSequenceItem {
    pub branch_id: String,
    pub branch_name: String,
    pub specialty_id: String,
    pub specialty_name: String,
    pub last_number: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsSnapshot {
    pub center: CenterSettings,
    pub branches: Vec<Branch>,
    pub specialties: Vec<SpecialtySetting>,
    pub payment_methods: Vec<PaymentMethod>,
    pub users: Vec<UserListItem>,
    pub sequences: Vec<RegisterSequenceItem>,
}

#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ChartPoint {
    pub label: String,
    pub value: i64,
}

#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct BreakdownPoint {
    pub label: String,
    pub value: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FinanceReport {
    pub total_income: i64,
    pub payment_count: i64,
    pub average_payment: i64,
    pub outstanding: i64,
    pub timeline: Vec<ChartPoint>,
    pub by_branch: Vec<BreakdownPoint>,
    pub by_specialty: Vec<BreakdownPoint>,
    pub by_method: Vec<BreakdownPoint>,
}
