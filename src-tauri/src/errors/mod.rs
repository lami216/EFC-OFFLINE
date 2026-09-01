use serde::Serialize;
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("تعذر تنفيذ العملية المطلوبة.")]
    Database(#[from] sqlx::Error),
    #[error("البيانات المدخلة غير صالحة.")]
    Validation,
    #[error("غير مصرح بتنفيذ هذه العملية.")]
    Unauthorized,
    #[error("تعذر الوصول إلى الملف المحدد.")]
    Io(#[from] std::io::Error),
}
impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}
pub type Result<T> = std::result::Result<T, AppError>;

impl From<sqlx::migrate::MigrateError> for AppError {
    fn from(_: sqlx::migrate::MigrateError) -> Self {
        Self::Validation
    }
}
