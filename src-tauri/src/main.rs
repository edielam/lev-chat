// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod lam;
mod config;
mod db;

extern crate serde_json;
use db::db::*;
use lam::llama::*;
use lam::llamautils::setup_levchat_dirs;
use lam::settings::check_settings_file;
use config::config::configure;
use config::setup::*;
use anyhow::Result;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = fix_path_env::fix();
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    let _ = setup_levchat_dirs();
    configure();
    check_settings_file();
    initialize_database().expect("Failed to initialize database");
    init_model_state().await;

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
        .invoke_handler(tauri::generate_handler![
            download_model,
            list_embedding_models, list_language_models,
            is_llama_cpp_installed, download_setup,
            get_download_progress, cancel_download, cancel_setup,
            get_setup_progress, reset_setup_progress, unzip_setup,
            check_llama_cpp_executable_exists,
            get_selected_em_model, set_em_model, get_selected_model,
            set_model, create_new_chat_command, get_all_chats_command,
            get_chat_messages_command, save_message_command, delete_chat_command,
            rename_chat_command
        ])
        .run(context)
        .expect("error while running tauri application");

    worker_task.await?;

    Ok(())
}
