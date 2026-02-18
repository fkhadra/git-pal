use clap::{Parser, Subcommand};
use std::{
    env,
    fs::{self, File},
    io::{self, BufRead},
    path::{Path, PathBuf},
    process,
};

#[derive(Debug, Parser)]
pub struct App {
    #[clap(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Generate graphql queries
    Gql,
    /// Generate Typescript typings
    Ts,
}

fn main() {
    let args = App::parse();

    match args.command {
        Command::Gql => {
            Codegen::init()
                .gen_graphql()
                .update_generated_queries()
                .generate_ts_bindings();
        }
        Command::Ts => {
            Codegen::init().generate_ts_bindings();
        }
    }
}

fn find_tauri_dir() -> PathBuf {
    let current_dir = env::current_dir().expect("unable to get current dir");

    for dir in current_dir.ancestors() {
        let config = dir.join("tauri.conf.json");
        if config.exists() {
            return dir.to_path_buf();
        };
    }

    panic!(
        "{1}: {:?}",
        (),
        "tauri.conf.json not found in current or parent directories"
    )
}

struct Codegen {
    tauri_dir: PathBuf,
    query_filepath: PathBuf,
}

impl Codegen {
    fn init() -> Self {
        let tauri_dir = find_tauri_dir();
        let query_filepath = Path::new(&tauri_dir).join("crates/git-pal-github/src/query.rs");

        println!("tauri_dir: {}", tauri_dir.display());
        println!("query_filepath: {}", query_filepath.display());

        Codegen {
            tauri_dir,
            query_filepath,
        }
    }

    fn gen_graphql(&self) -> &Self {
        process::Command::new("graphql-client")
            .args([
                "generate",
                "--schema-path",
                "./crates/git-pal-github/src/schema.graphql",
                "./crates/git-pal-github/src/query.graphql",
                "-p",
                "crate::custom_scalars",
                "-O",
                "TS,Debug,Clone,Serialize",
            ])
            .current_dir(&self.tauri_dir)
            .status()
            .expect("Failed to generate graphql queries");

        self
    }

    fn update_generated_queries(&self) -> &Self {
        let file = File::open(&self.query_filepath).expect("unable to open file");
        let lines = io::BufReader::new(file).lines();

        let mut output: Vec<String> = Vec::new();
        let mut is_first = true;
        let mut current_mod: Option<String> = None;

        for line in lines.map_while(std::result::Result::ok) {
            output.push(line.clone());

            if line.starts_with("pub mod") {
                if let Some(el) = line.split_whitespace().nth(2) {
                    let mut mod_name = el.to_owned().replace("_", "-");
                    mod_name.push_str(".ts");

                    current_mod = Some(mod_name);
                }
            } else if is_first {
                output.push("use ts_rs::TS;".into());
                is_first = false;
            } else if let Some(mod_name) = current_mod.as_ref()
                && line.contains("TS")
            {
                output.push(format!("#[ts(export, export_to = \"{}\")]", mod_name));
            }
        }

        fs::write(&self.query_filepath, output.join("\n")).expect("unable to save file");

        self
    }

    fn generate_ts_bindings(&self) -> &Self {
        process::Command::new("cargo")
            .args(["test", "export_bindings"])
            .current_dir(&self.tauri_dir)
            .status()
            .expect("failed to generate bindings");

        for pkg in ["git-pal-settings", "git-pal-github", "git-pal-feedback"] {
            process::Command::new("cargo")
                .args(["test", "export_bindings", "-p", pkg])
                .current_dir(&self.tauri_dir)
                .status()
                .expect("failed to generate bindings");
        }

        self
    }
}
