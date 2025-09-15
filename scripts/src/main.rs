use std::{
    fs::{self, File},
    io::{self, BufRead},
    path::Path,
    process,
};

use clap::{Parser, Subcommand};

const QUERY_PATH: &str = "../src-tauri/src/github/query.rs";
const BINDING_PATH: &str = "../../src/models/";
const TAURI_PATH: &str = "../src-tauri";

#[derive(Debug, Parser)]
pub struct App {
    #[clap(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Generate typescript binding
    GenBindings,
}

type CmdResult = Result<(), Box<dyn std::error::Error>>;

fn main() -> CmdResult {
    let args = App::parse();

    match args.command {
        Command::GenBindings => generate_bindings(),
    }
}

fn read_lines<P>(filename: P) -> io::Result<io::Lines<io::BufReader<File>>>
where
    P: AsRef<Path>,
{
    let file = File::open(filename)?;
    Ok(io::BufReader::new(file).lines())
}

fn generate_bindings() -> CmdResult {
    gen_graphql()?;

    let lines = read_lines(QUERY_PATH)?;
    let mut output: Vec<String> = Vec::new();
    let mut is_first = true;
    let mut current_mod: Option<String> = None;

    for line in lines.map_while(Result::ok) {
        output.push(line.clone());

        if line.starts_with("pub mod") {
            if let Some(el) = line.split_whitespace().nth(2) {
                let mut m = el.to_owned().replace("_", "-");
                m.push_str(".ts");

                current_mod = Some(m);
            }
        } else if is_first {
            output.push("use ts_rs::TS;".into());
            is_first = false;
        } else if let Some(m) = current_mod.as_ref() {
            if line.contains("TS") {
                output.push(format!(
                    "#[ts(export, export_to = \"{}{}\")]",
                    BINDING_PATH, m
                ));
            }
        }
    }

    fs::write(QUERY_PATH, output.join("\n"))?;

    process::Command::new("cargo")
        .arg("test")
        .current_dir(TAURI_PATH)
        .status()?;

    Ok(())
}

fn gen_graphql() -> CmdResult {
    process::Command::new("graphql-client")
        .args([
            "generate",
            "--schema-path",
            "./src/github/schema.graphql",
            "./src/github/query.graphql",
            "-p",
            "crate::github::custom_scalars",
            "-O",
            "TS,Debug,Clone,Serialize",
        ])
        .current_dir(TAURI_PATH)
        .status()?;

    Ok(())
}
