use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

use ignore::WalkBuilder;
use serde::Deserialize;
use serde_json::Value;

use crate::Skill;

const SKILL_FILE: &str = "SKILL.md";
const FRONTMATTER_DELIMITER: &str = "---";
const USER_SCOPE: &str = "user";

#[derive(Deserialize, Default)]
struct Frontmatter {
    name: Option<String>,
    #[serde(default)]
    description: String,
}

#[derive(Deserialize)]
struct Settings {
    #[serde(default, rename = "enabledPlugins")]
    enabled_plugins: HashMap<String, Value>,
}

#[derive(Deserialize)]
struct InstalledPlugins {
    #[serde(default)]
    plugins: HashMap<String, Vec<PluginInstall>>,
}

#[derive(Deserialize)]
struct PluginInstall {
    scope: String,
    #[serde(rename = "installPath")]
    install_path: PathBuf,
}

/// Skills found under `home` (`~/.claude`), sorted by name.
pub fn list(home: &Path) -> Vec<Skill> {
    let mut skills = read_skills(&home.join("skills"), None);

    for (plugin, dir) in enabled_plugins(home) {
        skills.extend(read_skills(&dir.join("skills"), Some(&plugin)));
    }

    skills.sort_by(|a, b| a.name.cmp(&b.name));
    skills
}

/// Skills under `dir`, minus hidden built-in ones (e.g. Codex's `.system`).
pub(crate) fn user_skills(dir: &Path) -> Vec<Skill> {
    let Ok(entries) = fs::read_dir(dir) else {
        return vec![];
    };

    entries
        .flatten()
        .filter(|entry| !entry.file_name().to_string_lossy().starts_with('.'))
        .flat_map(|entry| read_skills(&entry.path(), None))
        .collect()
}

/// Skills anywhere under `dir`, named `plugin:skill` when they come from a plugin.
pub(crate) fn read_skills(dir: &Path, plugin: Option<&str>) -> Vec<Skill> {
    WalkBuilder::new(dir)
        .hidden(false)
        .build()
        .flatten()
        .filter(|entry| entry.file_type().is_some_and(|t| t.is_file()))
        .filter(|entry| entry.file_name().eq_ignore_ascii_case(SKILL_FILE))
        .filter_map(|entry| read_skill(entry.path(), plugin))
        .collect()
}

fn read_skill(path: &Path, plugin: Option<&str>) -> Option<Skill> {
    let text = fs::read_to_string(path).ok()?;
    let meta = frontmatter(&text);
    // Claude Code falls back on the skill's folder
    let name = match meta.name {
        Some(name) => name,
        None => path.parent()?.file_name()?.to_string_lossy().into_owned(),
    };

    Some(Skill {
        name: match plugin {
            Some(plugin) => format!("{plugin}:{name}"),
            None => name,
        },
        description: meta.description,
    })
}

fn frontmatter(text: &str) -> Frontmatter {
    let Some(rest) = text.strip_prefix(FRONTMATTER_DELIMITER) else {
        return Frontmatter::default();
    };

    let Some(end) = rest.find(&format!("\n{FRONTMATTER_DELIMITER}")) else {
        return Frontmatter::default();
    };

    serde_yaml::from_str(&rest[..end]).unwrap_or_default()
}

/// Name and folder of the user scoped plugins enabled in `settings.json`.
fn enabled_plugins(home: &Path) -> Vec<(String, PathBuf)> {
    let Some(settings) = read_json::<Settings>(&home.join("settings.json")) else {
        return vec![];
    };

    let Some(installed) =
        read_json::<InstalledPlugins>(&home.join("plugins/installed_plugins.json"))
    else {
        return vec![];
    };

    installed
        .plugins
        .into_iter()
        .filter(|(key, _)| settings.enabled_plugins.get(key) == Some(&Value::Bool(true)))
        .filter_map(|(key, installs)| {
            let install = installs.into_iter().find(|i| i.scope == USER_SCOPE)?;
            // keys read "plugin@marketplace"
            let name = key.split('@').next()?.to_string();

            Some((name, install.install_path))
        })
        .collect()
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Option<T> {
    let text = fs::read_to_string(path).ok()?;

    serde_json::from_str(&text).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("git-pal-skills-{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_skill(dir: &Path, folder: &str, content: &str) {
        let folder = dir.join(folder);
        fs::create_dir_all(&folder).unwrap();
        fs::write(folder.join(SKILL_FILE), content).unwrap();
    }

    #[test]
    fn parses_frontmatter() {
        let meta = frontmatter("---\nname: lint\ndescription: \"Checks: style\"\n---\n# Lint");

        assert_eq!(meta.name.as_deref(), Some("lint"));
        assert_eq!(meta.description, "Checks: style");
        assert!(frontmatter("# No frontmatter").name.is_none());
    }

    #[test]
    fn lists_user_and_enabled_plugin_skills() {
        let home = temp_dir("home");
        write_skill(&home.join("skills"), "own", "---\nname: own\n---\n");
        write_skill(&home.join("skills"), "unnamed", "# Unnamed");
        write_skill(
            &home.join("skills/group"),
            "nested",
            "---\nname: nested\n---\n",
        );

        let enabled = home.join("plugins/cache/enabled");
        let disabled = home.join("plugins/cache/disabled");
        write_skill(&enabled.join("skills"), "tdd", "---\nname: tdd\n---\n");
        write_skill(&disabled.join("skills"), "off", "---\nname: off\n---\n");

        fs::write(
            home.join("settings.json"),
            r#"{"enabledPlugins":{"pow@market":true,"off@market":false}}"#,
        )
        .unwrap();
        fs::write(
            home.join("plugins/installed_plugins.json"),
            serde_json::json!({"plugins": {
                "pow@market": [{"scope": "user", "installPath": enabled}],
                "off@market": [{"scope": "user", "installPath": disabled}],
            }})
            .to_string(),
        )
        .unwrap();

        let names: Vec<_> = list(&home).into_iter().map(|s| s.name).collect();

        assert_eq!(names, ["nested", "own", "pow:tdd", "unnamed"]);
    }
}
