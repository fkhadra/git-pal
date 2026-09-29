use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Result, bail};

struct Editor {
    name: &'static str,
    #[cfg_attr(not(target_os = "macos"), allow(dead_code))]
    bundle: &'static str,
    #[cfg_attr(target_os = "macos", allow(dead_code))]
    commands: &'static [&'static str],
}

const EDITORS: &[Editor] = &[
    Editor {
        name: "VS Code",
        bundle: "Visual Studio Code",
        commands: &["code"],
    },
    Editor {
        name: "VS Code Insiders",
        bundle: "Visual Studio Code - Insiders",
        commands: &["code-insiders"],
    },
    Editor {
        name: "Cursor",
        bundle: "Cursor",
        commands: &["cursor"],
    },
    Editor {
        name: "Windsurf",
        bundle: "Windsurf",
        commands: &["windsurf"],
    },
    Editor {
        name: "Zed",
        bundle: "Zed",
        commands: &["zed", "zeditor"],
    },
    Editor {
        name: "Sublime Text",
        bundle: "Sublime Text",
        commands: &["subl"],
    },
    Editor {
        name: "IntelliJ IDEA",
        bundle: "IntelliJ IDEA",
        commands: &["idea", "idea64", "intellij-idea-ultimate"],
    },
    Editor {
        name: "IntelliJ IDEA CE",
        bundle: "IntelliJ IDEA CE",
        commands: &["idea-community", "intellij-idea-community"],
    },
    Editor {
        name: "WebStorm",
        bundle: "WebStorm",
        commands: &["webstorm", "webstorm64"],
    },
    Editor {
        name: "PyCharm",
        bundle: "PyCharm",
        commands: &["pycharm", "pycharm64", "pycharm-professional"],
    },
    Editor {
        name: "PyCharm CE",
        bundle: "PyCharm CE",
        commands: &["pycharm-community"],
    },
    Editor {
        name: "GoLand",
        bundle: "GoLand",
        commands: &["goland", "goland64"],
    },
    Editor {
        name: "RustRover",
        bundle: "RustRover",
        commands: &["rustrover", "rustrover64"],
    },
    Editor {
        name: "CLion",
        bundle: "CLion",
        commands: &["clion", "clion64"],
    },
    Editor {
        name: "PhpStorm",
        bundle: "PhpStorm",
        commands: &["phpstorm", "phpstorm64"],
    },
    Editor {
        name: "RubyMine",
        bundle: "RubyMine",
        commands: &["rubymine", "rubymine64"],
    },
    Editor {
        name: "Rider",
        bundle: "Rider",
        commands: &["rider", "rider64"],
    },
    Editor {
        name: "DataGrip",
        bundle: "DataGrip",
        commands: &["datagrip", "datagrip64"],
    },
    Editor {
        name: "Fleet",
        bundle: "Fleet",
        commands: &["fleet"],
    },
    Editor {
        name: "Android Studio",
        bundle: "Android Studio",
        commands: &["studio", "studio64", "android-studio"],
    },
];

pub fn installed() -> Vec<String> {
    EDITORS
        .iter()
        .filter(|editor| locate(editor).is_some())
        .map(|editor| editor.name.to_string())
        .collect()
}

pub fn open(name: &str, path: &Path) -> Result<()> {
    let Some(editor) = EDITORS.iter().find(|e| e.name == name) else {
        bail!("Unknown editor: {name}");
    };

    let Some(target) = locate(editor) else {
        bail!("{name} is not installed");
    };

    launch(name, &target, path)
}

/// First `commands` entry found in `dirs`, `extensions` are tried in order (Windows' `.exe`, `.cmd`).
#[cfg_attr(target_os = "macos", allow(dead_code))]
fn find_command(commands: &[&str], dirs: &[PathBuf], extensions: &[&str]) -> Option<PathBuf> {
    commands.iter().find_map(|command| {
        dirs.iter().find_map(|dir| {
            extensions
                .iter()
                .map(|ext| dir.join(format!("{command}{ext}")))
                .find(|candidate| candidate.is_file())
        })
    })
}

/// `PATH` entries, then the folders installers use without touching `PATH`.
#[cfg_attr(target_os = "macos", allow(dead_code))]
fn search_dirs(extra: Vec<PathBuf>) -> Vec<PathBuf> {
    let path = std::env::var_os("PATH").unwrap_or_default();

    std::env::split_paths(&path).chain(extra).collect()
}

#[cfg(target_os = "macos")]
fn locate(editor: &Editor) -> Option<PathBuf> {
    let app = format!("{}.app", editor.bundle);
    let mut dirs = vec![PathBuf::from("/Applications")];

    if let Some(home) = std::env::var_os("HOME") {
        dirs.push(PathBuf::from(home).join("Applications"));
    }

    dirs.into_iter()
        .map(|dir| dir.join(&app))
        .find(|p| p.exists())
}

#[cfg(target_os = "macos")]
fn launch(name: &str, bundle: &Path, path: &Path) -> Result<()> {
    let output = Command::new("open")
        .arg("-a")
        .arg(bundle)
        .arg(path)
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        bail!("Failed to open {name}: {stderr}");
    }

    Ok(())
}

#[cfg(target_os = "linux")]
const EXECUTABLE_EXTENSIONS: &[&str] = &[""];

#[cfg(target_os = "windows")]
const EXECUTABLE_EXTENSIONS: &[&str] = &[".exe", ".cmd", ".bat"];

// JetBrains Toolbox writes its launchers there, off `PATH` unless configured
#[cfg(target_os = "linux")]
fn extra_dirs() -> Vec<PathBuf> {
    std::env::var_os("HOME")
        .map(|home| vec![PathBuf::from(home).join(".local/share/JetBrains/Toolbox/scripts")])
        .unwrap_or_default()
}

// JetBrains Toolbox launchers and VS Code user installs whose `PATH` entry was skipped
#[cfg(target_os = "windows")]
fn extra_dirs() -> Vec<PathBuf> {
    let Some(local) = std::env::var_os("LOCALAPPDATA").map(PathBuf::from) else {
        return vec![];
    };

    vec![
        local.join(r"JetBrains\Toolbox\scripts"),
        local.join(r"Programs\Microsoft VS Code\bin"),
        local.join(r"Programs\Microsoft VS Code Insiders\bin"),
    ]
}

#[cfg(any(target_os = "linux", target_os = "windows"))]
fn locate(editor: &Editor) -> Option<PathBuf> {
    find_command(
        editor.commands,
        &search_dirs(extra_dirs()),
        EXECUTABLE_EXTENSIONS,
    )
}

#[cfg(any(target_os = "linux", target_os = "windows"))]
fn launch(name: &str, command: &Path, path: &Path) -> Result<()> {
    let mut launcher = Command::new(command);
    launcher.arg(path);
    hide_console(&mut launcher);

    let mut child = launcher
        .spawn()
        .map_err(|e| anyhow::anyhow!("Failed to open {name}: {e}"))?;
    std::thread::spawn(move || child.wait());

    Ok(())
}

#[cfg(target_os = "windows")]
fn hide_console(command: &mut Command) {
    use std::os::windows::process::CommandExt;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(target_os = "linux")]
fn hide_console(_command: &mut Command) {}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("git-pal-editor-{name}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn finds_first_command_in_order() {
        let first = temp_dir("first");
        let second = temp_dir("second");
        std::fs::write(second.join("zeditor"), "").unwrap();
        std::fs::write(second.join("zed"), "").unwrap();

        let found = find_command(&["zed", "zeditor"], &[first, second.clone()], &[""]);

        assert_eq!(found, Some(second.join("zed")));
    }

    #[test]
    fn tries_extensions_and_ignores_folders() {
        let dir = temp_dir("extensions");
        std::fs::create_dir(dir.join("code.exe")).unwrap();
        std::fs::write(dir.join("code.cmd"), "").unwrap();

        let found = find_command(&["code"], &[dir.clone()], &[".exe", ".cmd"]);

        assert_eq!(found, Some(dir.join("code.cmd")));
        assert_eq!(find_command(&["subl"], &[dir], &[".exe", ".cmd"]), None);
    }

    #[test]
    fn search_dirs_appends_extra_folders() {
        let extra = PathBuf::from("/opt/editors");

        assert_eq!(search_dirs(vec![extra.clone()]).last(), Some(&extra));
    }
}
