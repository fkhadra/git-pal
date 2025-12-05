use keyring::Entry;
use keyring::Error;

#[derive(Debug)]
pub struct Vault {
    keyring: Entry,
}

impl Vault {
    pub fn new(service: &str, token_name: &str) -> Result<Vault, Error> {
        let keyring = Entry::new(&service, &token_name)?;

        Ok(Vault { keyring })
    }

    pub fn get_token(&self) -> Result<String, Error> {
        self.keyring.get_password()
    }

    pub fn save_token(&self, token: &str) -> Result<(), Error> {
        self.keyring.set_password(token)
    }

    pub fn delete_token(&self) -> Result<(), Error> {
        self.keyring.delete_credential()
    }
}
