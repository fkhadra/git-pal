use std::{
    fs::{self},
    io,
    path::PathBuf,
};

use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "settings.ts")]
#[serde(rename_all = "camelCase")]
pub enum Theme {
    System,
    Light,
    Dark,
}

#[derive(Serialize, Deserialize, Clone, Debug, TS)]
#[ts(export, export_to = "settings.ts")]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub theme: Theme,
    pub global_shortcut: String,
    pub auto_update: bool,
    pub display_rate_limit: bool,
    pub monitor_pull_requests: bool,
    pub monitor_interval: u32,
}

#[cfg(target_os = "macos")]
const DEFAULT_SHORTCUT: &str = "cmd+G";

#[cfg(target_os = "linux")]
const DEFAULT_SHORTCUT: &str = "ctrl+G";

#[cfg(target_os = "windows")]
const DEFAULT_SHORTCUT: &str = "ctrl+shift+G";

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: Theme::System,
            global_shortcut: DEFAULT_SHORTCUT.to_string(),
            auto_update: true,
            display_rate_limit: false,
            monitor_pull_requests: true,
            monitor_interval: 20,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "settings.ts")]
#[serde(rename_all = "camelCase")]
pub enum SettingValue {
    Theme(Theme),
    GlobalShortcut(String),
    AutoUpdate(bool),
    DisplayRateLimit(bool),
    MonitorPullRequests(bool),
    MonitorInterval(u32),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SettingKey {
    Theme,
    GlobalShortcut,
    AutoUpdate,
    DisplayRateLimit,
    MonitorPullRequests,
    MonitorInterval,
}

pub struct SettingManager {
    filepath: PathBuf,
    pub settings: Settings,
}

impl SettingManager {
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

    pub fn get(&self, key: SettingKey) -> SettingValue {
        match key {
            SettingKey::AutoUpdate => SettingValue::AutoUpdate(self.settings.auto_update),
            SettingKey::DisplayRateLimit => {
                SettingValue::DisplayRateLimit(self.settings.display_rate_limit)
            }
            SettingKey::GlobalShortcut => {
                SettingValue::GlobalShortcut(self.settings.global_shortcut.clone())
            }
            SettingKey::MonitorInterval => {
                SettingValue::MonitorInterval(self.settings.monitor_interval)
            }
            SettingKey::MonitorPullRequests => {
                SettingValue::MonitorPullRequests(self.settings.monitor_pull_requests)
            }
            SettingKey::Theme => SettingValue::Theme(self.settings.theme.clone()),
        }
    }

    pub fn set(&mut self, value: SettingValue) {
        match value {
            SettingValue::AutoUpdate(val) => self.settings.auto_update = val,
            SettingValue::DisplayRateLimit(val) => self.settings.display_rate_limit = val,
            SettingValue::GlobalShortcut(val) => self.settings.global_shortcut = val,
            SettingValue::MonitorInterval(val) => self.settings.monitor_interval = val,
            SettingValue::MonitorPullRequests(val) => self.settings.monitor_pull_requests = val,
            SettingValue::Theme(val) => self.settings.theme = val,
        }
    }

    pub fn replace_global_shortcut(&mut self, shortcut: String) -> String {
        std::mem::replace(&mut self.settings.global_shortcut, shortcut)
    }

    pub fn save(&self) -> Result<(), io::Error> {
        let content = serde_json::to_string_pretty(&self.settings)?;
        fs::write(&self.filepath, content)
    }
}
