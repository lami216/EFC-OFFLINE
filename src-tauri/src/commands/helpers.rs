use crate::{
    errors::{AppError, Result},
    AppState, Session,
};
use serde_json::Value;
use sqlx::{Column, Row};

pub(crate) fn session(state: &AppState, token: &str) -> Result<Session> {
    state
        .sessions
        .lock()
        .map_err(|_| AppError::Unauthorized)?
        .get(token)
        .cloned()
        .ok_or(AppError::Unauthorized)
}

pub(crate) fn require_role(s: &Session, roles: &[&str]) -> Result<()> {
    if roles.iter().any(|role| *role == s.role) {
        Ok(())
    } else {
        Err(AppError::Unauthorized)
    }
}

pub(crate) fn effective_branch(s: &Session, requested: Option<String>) -> Result<Option<String>> {
    if let Some(own) = &s.branch_id {
        if requested.as_ref().is_some_and(|value| value != own) {
            return Err(AppError::Unauthorized);
        }
        Ok(Some(own.clone()))
    } else {
        Ok(requested.filter(|x| !x.trim().is_empty()))
    }
}

pub(crate) fn text(v: &Value, key: &str) -> Option<String> {
    v.get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|x| !x.is_empty())
        .map(ToOwned::to_owned)
}

pub(crate) fn required_text(v: &Value, key: &str) -> Result<String> {
    text(v, key).ok_or(AppError::Validation)
}

pub(crate) fn int(v: &Value, key: &str, default: i64) -> i64 {
    v.get(key).and_then(Value::as_i64).unwrap_or(default)
}

pub(crate) fn boolean(v: &Value, key: &str, default: bool) -> bool {
    v.get(key).and_then(Value::as_bool).unwrap_or(default)
}

pub(crate) fn row_value(row: &sqlx::sqlite::SqliteRow) -> Value {
    let mut map = serde_json::Map::new();
    for column in row.columns() {
        let name = column.name();
        let value = row
            .try_get::<i64, _>(name)
            .map(Value::from)
            .or_else(|_| row.try_get::<f64, _>(name).map(Value::from))
            .or_else(|_| row.try_get::<String, _>(name).map(Value::from))
            .unwrap_or(Value::Null);
        map.insert(name.to_string(), value);
    }
    Value::Object(map)
}
