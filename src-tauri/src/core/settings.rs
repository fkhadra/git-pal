use std::{collections::HashMap, fmt::Display};

use redb::{Database, Error, ReadableDatabase, ReadableTable, TableDefinition, TableError};

use serde::{Deserialize, Serialize};
use ts_rs::TS;

const TABLE: TableDefinition<&str, String> = TableDefinition::new("settings");

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/models/settings.ts")]
#[serde(rename_all = "camelCase")]
pub enum Value {
    Theme(Theme),
    GlobalShortcut(String),
}

impl Value {
    fn to_value(&self) -> (&str, String) {
        match self {
            Value::Theme(theme) => (Key::Theme.as_str(), theme.to_string()),
            Value::GlobalShortcut(shortcut) => (Key::GlobalShortcut.as_str(), shortcut.to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/models/settings.ts")]
#[serde(rename_all = "camelCase")]
pub enum Key {
    Theme,
    GlobalShortcut,
}

impl Key {
    pub fn as_str(&self) -> &'static str {
        match self {
            Key::Theme => "theme",
            Key::GlobalShortcut => "global_shortcut",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/models/settings.ts")]
#[serde(rename_all = "camelCase")]
pub enum Theme {
    System,
    Light,
    Dark,
}

impl Display for Theme {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Theme::System => write!(f, "system"),
            Theme::Light => write!(f, "light"),
            Theme::Dark => write!(f, "dark"),
        }
    }
}

pub struct Store {
    db: Database,
}

impl Store {
    pub fn new(db_path: &str) -> Self {
        let db = Database::create(db_path).expect("failed ot open database");

        Store { db }
    }

    pub fn get(&self, key: Key) -> Result<Option<String>, Error> {
        let tx = self.db.begin_read()?;

        match tx.open_table(TABLE) {
            Err(TableError::TableDoesNotExist(_)) => Ok(None),
            Err(e) => Err(e.into()),
            Ok(table) => {
                let v = table.get(key.as_str())?.map(|v| v.value());

                Ok(v)
            }
        }
    }

    pub fn set(&self, value: Value) -> Result<(), Error> {
        let (k, v) = value.to_value();

        let tx = self.db.begin_write()?;
        {
            let mut table = tx.open_table(TABLE)?;
            table.insert(k, v)?;
        }
        tx.commit()?;

        Ok(())
    }

    pub fn get_all(&self) -> Result<HashMap<String, String>, Error> {
        let mut map = HashMap::new();
        let tx = self.db.begin_read()?;
        let table = tx.open_table(TABLE)?;

        for entry in table.iter()? {
            let (k, v) = entry?;
            map.insert(k.value().to_owned(), v.value());
        }

        Ok(map)
    }
}
