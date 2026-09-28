use std::path::Path;

use anyhow::Result;
use sqlx::{
    SqlitePool,
    sqlite::{SqliteConnectOptions, SqliteJournalMode},
};

pub async fn connect(filename: impl AsRef<Path>) -> Result<SqlitePool> {
    let options = SqliteConnectOptions::new()
        .filename(filename)
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal);

    let pool = SqlitePool::connect_with(options).await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    Ok(pool)
}
