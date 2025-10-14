use redb::{Database, Error, ReadableDatabase, ReadableTable, Table, TableDefinition, Value};

const TABLE: TableDefinition<&str, String> = TableDefinition::new("settings");

pub struct Store {
    db: Database,
}

pub struct Settings {
    pub theme: String,
    pub shortcut: String,
}

impl Store {
    pub fn new(db_path: &str) -> Self {
        let db = Database::create(db_path).expect("failed ot open database");

        Store { db }
    }

    pub fn get(&self, key: &str) -> Result<Option<String>, Error> {
        let tx = self.db.begin_read()?;
        let table = tx.open_table(TABLE)?;

        let v = table.get(key)?.map(|v| v.value());

        Ok(v)
    }

    pub fn set(&self, key: &str, value: String) -> Result<(), Error> {
        let wtx = self.db.begin_write()?;
        {
            let mut table = wtx.open_table(TABLE)?;

            table.insert(key, value)?;
        }
        wtx.commit().unwrap();

        Ok(())
    }
}
