use std::{
    fs::{self},
    io,
    path::PathBuf,
};

use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/models/settings.ts")]
pub enum Theme {
    System,
    Light,
    Dark,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/models/settings.ts")]
pub enum AuthMethod {
    OAuth,
    TestVal,
}

#[derive(Serialize, Deserialize, Clone, Debug, TS)]
#[ts(export, export_to = "../../src/models/settings.ts")]
pub struct Settings {
    pub theme: Theme,
    pub hotkey: String,
    pub auto_update: bool,
    pub auth_method: AuthMethod,
    pub display_rate_limit: bool,
    pub monitor_pull_requests: bool,
    pub monitor_interval: u32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: Theme::System,
            hotkey: "super+g".to_string(),
            auto_update: true,
            auth_method: AuthMethod::OAuth,
            display_rate_limit: false,
            monitor_pull_requests: true,
            monitor_interval: 20,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/models/settings.ts")]
pub enum SettingValue {
    Theme(Theme),
    Hotkey(String),
    AutoUpdate(bool),
    AuthMethod(AuthMethod),
    DisplayRateLimit(bool),
    MonitorPullRequests(bool),
    MonitorInterval(u32),
}

pub struct SettingsManager {
    filepath: PathBuf,
    pub settings: Settings,
}

impl SettingsManager {
    pub fn new<P: Into<PathBuf>>(filename: P) -> Result<Self, io::Error> {
        let filepath: PathBuf = filename.into();

        match fs::read_to_string(&filepath) {
            Err(err) => {
                if err.kind() == io::ErrorKind::NotFound {
                    return Ok(Self {
                        filepath,
                        settings: Settings::default(),
                    });
                }

                Err(err)
            }
            Ok(content) => {
                let settings: Settings = serde_json::from_str(&content)?;
                Ok(Self { filepath, settings })
            }
        }
    }

    pub fn set(&mut self, value: SettingValue) {
        match value {
            SettingValue::AuthMethod(val) => self.settings.auth_method = val,
            SettingValue::AutoUpdate(val) => self.settings.auto_update = val,
            SettingValue::DisplayRateLimit(val) => self.settings.display_rate_limit = val,
            SettingValue::Hotkey(val) => self.settings.hotkey = val,
            SettingValue::MonitorInterval(val) => self.settings.monitor_interval = val,
            SettingValue::MonitorPullRequests(val) => self.settings.monitor_pull_requests = val,
            SettingValue::Theme(val) => self.settings.theme = val,
        }
    }

    pub fn save(&self) -> Result<(), io::Error> {
        let content = serde_json::to_string_pretty(&self.settings)?;
        fs::write(&self.filepath, content)
    }
}
