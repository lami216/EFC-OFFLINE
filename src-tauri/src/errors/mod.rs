use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("تعذر تنفيذ العملية المطلوبة في قاعدة البيانات.")]
    Database(#[from] sqlx::Error),
    #[error("{0}")]
    Startup(String),
    #[error("البيانات المدخلة غير صالحة.")]
    Validation,
    #[error("غير مصرح بتنفيذ هذه العملية.")]
    Unauthorized,
    #[error("العنصر المطلوب غير موجود.")]
    NotFound,
    #[error("توجد بيانات أخرى تمنع تنفيذ هذا التغيير.")]
    Conflict,
    #[error("ملف النسخة الاحتياطية غير صالح.")]
    InvalidBackup,
    #[error("تعذر الوصول إلى الملف المحدد.")]
    Io(#[from] std::io::Error),
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;

impl From<sqlx::migrate::MigrateError> for AppError {
    fn from(_: sqlx::migrate::MigrateError) -> Self {
        Self::Validation
    }
}
