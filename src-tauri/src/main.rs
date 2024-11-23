// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod pty;
mod lam;
mod config;

extern crate serde_json;
use lam::llama::start_llama_server;
use lam::settings::check_settings_file;
use config::config::configure;
use anyhow::Result;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    configure();
    check_settings_file();
    let context = tauri::generate_context!();

    let worker_task = tokio::spawn(async move {
        start_llama_server().await;
    });

    tauri::Builder::default()
        .setup(|app| {
            #[cfg(all(desktop, target_os="macos"))]
            app.set_activation_policy(tauri::ActivationPolicy::Regular);
            
            Ok(())
        })
        .run(context)
        .expect("error while running tauri application");

    worker_task.await?;

    Ok(())
}
