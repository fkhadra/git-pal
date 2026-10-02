use std::{
    collections::HashMap,
    fs::{self},
    io,
    path::PathBuf,
};

use git_pal_harness::Harness;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "settings.ts")]
#[serde(rename_all = "camelCase")]
pub enum Theme {
    System,
    Light,
    Dark,
    Dracula,
    CatppuccinMocha,
    CatppuccinLatte,
    Andromeda,
    DeepPurple,
}

#[derive(Serialize, Deserialize, Clone, Debug, TS)]
#[ts(export, export_to = "settings.ts")]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub theme: Theme,
    pub auto_update: bool,
    pub monitor_pull_requests: bool,
    pub monitor_interval: u32,
    #[serde(default)]
    pub harness: Harness,
    #[serde(default)]
    pub models: HashMap<Harness, String>,
    #[serde(default)]
    pub keybind: Keybind,
    #[serde(default)]
    pub avatar: Avatar,
    #[serde(default)]
    pub repository_filter: RepositoryFilter,
    #[serde(default = "default_pull_request_limit")]
    pub pull_request_limit: u32,
}

const DEFAULT_PULL_REQUEST_LIMIT: u32 = 30;

fn default_pull_request_limit() -> u32 {
    DEFAULT_PULL_REQUEST_LIMIT
}

/// Repositories the pull request lists, notifications and repository searches cover.
/// Entries are `owner/repo`, or a bare `owner` for all of its repositories.
#[derive(Serialize, Deserialize, Clone, Debug, Default, TS)]
#[ts(export, export_to = "settings.ts")]
#[serde(default)]
pub struct RepositoryFilter {
    /// Only these when not empty
    pub include: Vec<String>,
    /// Never these, even when included
    pub exclude: Vec<String>,
}

/// Shapes shipped by bot-avatars package
#[derive(Serialize, Deserialize, Clone, Copy, Debug, Default, TS)]
#[ts(export, export_to = "settings.ts")]
#[serde(rename_all = "camelCase")]
pub enum AvatarType {
    Clover,
    Flower,
    Triangle,
    Square,
    Blob,
    Ghost,
    Circle,
    Drop,
    Star,
    Droid,
    #[default]
    Mech,
    Alien,
    Hexagon,
    Cat,
    Cloud,
    Pill,
    Pebble,
    Puddle,
}

#[derive(Serialize, Deserialize, Clone, Debug, TS)]
#[ts(export, export_to = "settings.ts")]
#[serde(default)]
pub struct Avatar {
    #[serde(rename = "type")]
    pub kind: AvatarType,
    pub color: String,
}

impl Default for Avatar {
    fn default() -> Self {
        Self {
            kind: AvatarType::default(),
            color: "#c084fc".into(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, TS)]
#[ts(export, export_to = "settings.ts")]
#[serde(rename_all = "camelCase", default)]
pub struct Keybind {
    pub show_palette: String,
    pub palette: PaletteKeybind,
    pub review: ReviewKeybind,
}

impl Default for Keybind {
    fn default() -> Self {
        Self {
            show_palette: DEFAULT_SHORTCUT.into(),
            palette: PaletteKeybind::default(),
            review: ReviewKeybind::default(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, TS)]
#[ts(export, export_to = "settings.ts")]
#[serde(rename_all = "camelCase", default)]
pub struct PaletteKeybind {
    pub primary_action: String,
    pub secondary_action: String,
    pub actions: String,
    pub review: String,
    pub review_with_template: String,
    pub code_search: String,
    pub help: String,
    pub go_back: String,
    pub cancel: String,
}

// Shortcuts are written as the frontend captures them: modifiers in the order
// shift, ctrl, cmd, alt, then the key.

#[cfg(target_os = "macos")]
impl Default for PaletteKeybind {
    fn default() -> Self {
        Self {
            primary_action: "Enter".into(),
            secondary_action: "Tab".into(),
            actions: "cmd+K".into(),
            review: "cmd+Enter".into(),
            review_with_template: "shift+cmd+Enter".into(),
            code_search: "cmd+F".into(),
            help: "cmd+/".into(),
            go_back: "Backspace".into(),
            cancel: "Escape".into(),
        }
    }
}

#[cfg(any(target_os = "linux", target_os = "windows"))]
impl Default for PaletteKeybind {
    fn default() -> Self {
        Self {
            primary_action: "Enter".into(),
            secondary_action: "Tab".into(),
            actions: "ctrl+K".into(),
            review: "ctrl+Enter".into(),
            review_with_template: "shift+ctrl+Enter".into(),
            code_search: "ctrl+F".into(),
            help: "ctrl+/".into(),
            go_back: "Backspace".into(),
            cancel: "Escape".into(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, TS)]
#[ts(export, export_to = "settings.ts")]
#[serde(rename_all = "camelCase", default)]
pub struct ReviewKeybind {
    pub toggle_reviews: String,
    pub previous_file: String,
    pub next_file: String,
    pub refresh: String,
    pub toggle_view_type: String,
    pub toggle_submit: String,
    pub open_pull_request: String,
    pub toggle_agent: String,
    pub show_shortcuts: String,
    pub find_in_diff: String,
    pub find_file: String,
    pub paste_pull_request: String,
}

#[cfg(target_os = "macos")]
impl Default for ReviewKeybind {
    fn default() -> Self {
        Self {
            toggle_reviews: "cmd+B".into(),
            previous_file: "cmd+[".into(),
            next_file: "cmd+]".into(),
            refresh: "cmd+R".into(),
            toggle_view_type: "cmd+S".into(),
            toggle_submit: "shift+cmd+Enter".into(),
            open_pull_request: "cmd+O".into(),
            toggle_agent: "cmd+I".into(),
            show_shortcuts: "cmd+/".into(),
            find_in_diff: "cmd+F".into(),
            find_file: "shift+cmd+F".into(),
            paste_pull_request: "cmd+N".into(),
        }
    }
}

// TODO: Gotta tests those
#[cfg(any(target_os = "linux", target_os = "windows"))]
impl Default for ReviewKeybind {
    fn default() -> Self {
        Self {
            toggle_reviews: "ctrl+B".into(),
            previous_file: "ctrl+[".into(),
            next_file: "ctrl+]".into(),
            refresh: "ctrl+R".into(),
            toggle_view_type: "ctrl+S".into(),
            toggle_submit: "shift+ctrl+Enter".into(),
            open_pull_request: "ctrl+O".into(),
            toggle_agent: "ctrl+I".into(),
            show_shortcuts: "ctrl+/".into(),
            find_in_diff: "ctrl+F".into(),
            find_file: "shift+ctrl+F".into(),
            paste_pull_request: "ctrl+N".into(),
        }
    }
}

#[cfg(target_os = "macos")]
const DEFAULT_SHORTCUT: &str = "cmd+G";

#[cfg(target_os = "linux")]
const DEFAULT_SHORTCUT: &str = "ctrl+G";

#[cfg(target_os = "windows")]
const DEFAULT_SHORTCUT: &str = "ctrl+super+G";

impl Settings {
    /// Model `harness` runs with: the picked one, its default otherwise
    pub fn model(&self, harness: Harness) -> Option<String> {
        self.models
            .get(&harness)
            .cloned()
            .or_else(|| harness.adapter().default_model())
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: Theme::System,
            auto_update: true,
            monitor_pull_requests: true,
            monitor_interval: 20,
            harness: Harness::default(),
            models: HashMap::new(),
            keybind: Keybind::default(),
            avatar: Avatar::default(),
            repository_filter: RepositoryFilter::default(),
            pull_request_limit: DEFAULT_PULL_REQUEST_LIMIT,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "settings.ts")]
#[serde(rename_all = "camelCase")]
pub enum SettingValue {
    Theme(Theme),
    AutoUpdate(bool),
    MonitorPullRequests(bool),
    MonitorInterval(u32),
    Harness(Harness),
    Models(HashMap<Harness, String>),
    PaletteKeybind(PaletteKeybind),
    ReviewKeybind(ReviewKeybind),
    Avatar(Avatar),
    RepositoryFilter(RepositoryFilter),
    PullRequestLimit(u32),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SettingKey {
    Theme,
    AutoUpdate,
    MonitorPullRequests,
    MonitorInterval,
    Harness,
    Models,
    PaletteKeybind,
    ReviewKeybind,
    Avatar,
    RepositoryFilter,
    PullRequestLimit,
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
            SettingKey::MonitorInterval => {
                SettingValue::MonitorInterval(self.settings.monitor_interval)
            }
            SettingKey::MonitorPullRequests => {
                SettingValue::MonitorPullRequests(self.settings.monitor_pull_requests)
            }
            SettingKey::Theme => SettingValue::Theme(self.settings.theme.clone()),
            SettingKey::Harness => SettingValue::Harness(self.settings.harness),
            SettingKey::Models => SettingValue::Models(self.settings.models.clone()),
            SettingKey::PaletteKeybind => {
                SettingValue::PaletteKeybind(self.settings.keybind.palette.clone())
            }
            SettingKey::ReviewKeybind => {
                SettingValue::ReviewKeybind(self.settings.keybind.review.clone())
            }
            SettingKey::Avatar => SettingValue::Avatar(self.settings.avatar.clone()),
            SettingKey::RepositoryFilter => {
                SettingValue::RepositoryFilter(self.settings.repository_filter.clone())
            }
            SettingKey::PullRequestLimit => {
                SettingValue::PullRequestLimit(self.settings.pull_request_limit)
            }
        }
    }

    pub fn set(&mut self, value: SettingValue) {
        match value {
            SettingValue::AutoUpdate(val) => self.settings.auto_update = val,
            SettingValue::MonitorInterval(val) => self.settings.monitor_interval = val,
            SettingValue::MonitorPullRequests(val) => self.settings.monitor_pull_requests = val,
            SettingValue::Theme(val) => self.settings.theme = val,
            SettingValue::Harness(val) => self.settings.harness = val,
            SettingValue::Models(val) => self.settings.models = val,
            SettingValue::PaletteKeybind(val) => self.settings.keybind.palette = val,
            SettingValue::ReviewKeybind(val) => self.settings.keybind.review = val,
            SettingValue::Avatar(val) => self.settings.avatar = val,
            SettingValue::RepositoryFilter(val) => self.settings.repository_filter = val,
            SettingValue::PullRequestLimit(val) => self.settings.pull_request_limit = val,
        }
    }

    pub fn replace_global_shortcut(&mut self, shortcut: String) -> String {
        std::mem::replace(&mut self.settings.keybind.show_palette, shortcut)
    }

    pub fn save(&self) -> Result<(), io::Error> {
        let content = serde_json::to_string_pretty(&self.settings)?;
        fs::write(&self.filepath, content)
    }
}
