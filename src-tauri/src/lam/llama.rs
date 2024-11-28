use bytes::BytesMut;
use futures::{SinkExt, StreamExt};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;
use uuid::Uuid;
use log::{error, info};
use std::process::Command;
use tauri::api::path;
use crate::lam::llamautils::RAGProcessor;
use lazy_static::lazy_static;
use std::sync::{Arc, Mutex};
use regex::Regex;

#[derive(Serialize, Deserialize)]
struct LlamaJobConfig {
    prompt: String,
    model_name: Option<String>, 
    temperature: Option<f32>,
    max_tokens: Option<i32>,
    additional_args: Option<HashMap<String, String>>,
}

#[derive(Serialize, Deserialize)]
struct JobStatus {
    job_id: String,
    status: String,
}

const PTY_SERVER_ADDRESS: &str = "127.0.0.1:15555";
const TOP_N_CONTEXTS: usize = 4; 

pub fn normalize_path(path: &str) -> String {
    if cfg!(windows) {
        path.replace('/', "\\")
    } else {
        path.to_string()
    }
}

pub fn get_workspace_path() -> Result<String, String> {
    let doc_dir = path::document_dir()
        .ok_or_else(|| "Failed to get documents directory".to_string())?;
    
    let workspace_path = doc_dir.join("LevChat");

    std::fs::create_dir_all(&workspace_path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;
    
    Ok(normalize_path(workspace_path.to_string_lossy().as_ref()))
}

async fn send_status_update(
    tx: &mpsc::Sender<Message>,
    job_id: &str,
    status_message: String,
) -> Result<(), Box<dyn std::error::Error>> {
    let status = JobStatus {
        job_id: job_id.to_string(),
        status: status_message,
    };

    let status_json = serde_json::to_string(&status)?;
    tx.send(Message::Text(status_json))
        .await
        .map_err(|e| e.into())
}


lazy_static! {
    static ref MODEL_STATE: Arc<Mutex<ModelState>> = Arc::new(Mutex::new(ModelState::default()));
}

#[derive(Default)]
struct ModelState {
    em_model_name: Option<String>,
    model_name: Option<String>,
    em_model_tx: Option<mpsc::Sender<String>>,
    model_tx: Option<mpsc::Sender<String>>,
}


#[tauri::command]
pub async fn set_em_model(model_name: String) -> Result<(), String> {
    // Extract the sender before locking
    let tx = {
        let state = MODEL_STATE.lock().unwrap();
        state.em_model_tx.clone()
    };

    // Send outside the lock
    if let Some(tx) = tx {
        tx.send(model_name).await.map_err(|e| e.to_string())
    } else {
        Err("Channels not initialized".to_string())
    }
}

#[tauri::command]
pub async fn set_model(model_name: String) -> Result<(), String> {
    // Extract the sender before locking
    let tx = {
        let state = MODEL_STATE.lock().unwrap();
        state.model_tx.clone()
    };

    // Send outside the lock
    if let Some(tx) = tx {
        tx.send(model_name).await.map_err(|e| e.to_string())
    } else {
        Err("Channels not initialized".to_string())
    }
}


#[tauri::command]
pub fn get_selected_model() -> Option<String> {
    let state = MODEL_STATE.lock().unwrap();
    state.model_name.clone()
}

#[tauri::command]
pub fn get_selected_em_model() -> Option<String> {
    let state = MODEL_STATE.lock().unwrap();
    state.em_model_name.clone()
}

pub fn find_gguf_model(workspace_path: &str) -> Result<PathBuf, String> {
    let state = MODEL_STATE.lock().unwrap();
    let model_name = state.model_name.as_ref()
        .ok_or_else(|| "No model name selected".to_string())?;

    let model_path = Path::new(workspace_path)
        .join("model")
        .join(model_name);

    model_path.exists()
        .then(|| model_path)
        .ok_or_else(|| format!("Model {} not found in model directory", model_name))
}

pub fn find_gguf_emmodel(workspace_path: &str) -> Result<PathBuf, String> {
    let state = MODEL_STATE.lock().unwrap();
    let em_model_name = state.em_model_name.as_ref()
        .ok_or_else(|| "No embedding model name selected".to_string())?;

    let model_path = Path::new(workspace_path)
        .join("em_model")
        .join(em_model_name);

    model_path.exists()
        .then(|| model_path)
        .ok_or_else(|| format!("Embedding model {} not found in em_model directory", em_model_name))
}

pub async fn init_model_state() {
    let mut state = MODEL_STATE.lock().unwrap();
    let (em_model_tx, mut em_model_rx) = mpsc::channel(1);
    let (model_tx, mut model_rx) = mpsc::channel(1);


    // Spawn tasks to update the model names when received through channels
    tokio::spawn(async move {
        while let Some(em_model_name) = em_model_rx.recv().await {
            let mut state = MODEL_STATE.lock().unwrap();
            state.em_model_name = Some(em_model_name);
        }
    });

    tokio::spawn(async move {
        while let Some(model_name) = model_rx.recv().await {
            let mut state = MODEL_STATE.lock().unwrap();
            state.model_name = Some(model_name);
        }
    });

    // Set default model states
    if let Ok(workspace_path) = get_workspace_path() {
        let model_path = Path::new(&workspace_path)
            .join("model");
        if let Some(model_file) = find_first_gguf_file(&model_path) {
            let model_name = model_file.file_name()
                .and_then(|name| name.to_str())
                .map(|s| s.to_string());
            
            if let Some(name) = model_name {
                model_tx.send(name).await.ok();
            }
        }

        let em_model_path = Path::new(&workspace_path)
            .join("em_model");
        if let Some(em_model_file) = find_first_gguf_file(&em_model_path) {
            let em_model_name = em_model_file.file_name()
                .and_then(|name| name.to_str())
                .map(|s| s.to_string());
            
            if let Some(name) = em_model_name {
                em_model_tx.send(name).await.ok();
            }
        }
    }

    state.em_model_tx = Some(em_model_tx);
    state.model_tx = Some(model_tx);
}

/// Helper function to find the first .gguf file in a given directory
fn find_first_gguf_file(dir: &Path) -> Option<PathBuf> {
    // Ensure the directory exists
    if !dir.exists() {
        return None;
    }

    // Read the directory entries
    if let Ok(entries) = std::fs::read_dir(dir) {
        // Find the first .gguf file
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if path.is_file() && 
               path.extension().map_or(false, |ext| ext == "gguf") {
                return Some(path);
            }
        }
    }

    None
}

async fn construct_llama_command(config: &LlamaJobConfig, workspace_path: &str, tx: &mpsc::Sender<Message>) -> Result<CommandBuilder, String>{
    // Determine the correct executable path based on the operating system
    let llama_executable = if cfg!(target_os = "windows") {
        Path::new(workspace_path).join("setup").join("llama-cli.exe")
    } else if cfg!(target_os = "linux") {
        let exe_path = Path::new(workspace_path).join("setup").join("llama-cli");
        
        // Ensure executable has correct permissions on Linux
        match Command::new("chmod")
            .arg("+x")
            .arg(&exe_path)
            .output() {
            Ok(_) => exe_path,
            Err(e) => {
                error!("Failed to make llama-cli executable: {}", e);
                return Err(format!("Failed to set executable permissions: {}", e));
            }
        }
    } else {
        // This covers macOS and any other Unix-like systems
        Path::new(workspace_path).join("setup").join("llama-cli")
    };

    // First, check for language model
    let model_path = match if let Some(model_name) = &config.model_name {
        Ok(Path::new(workspace_path).join("model").join(model_name))
    } else {
        find_gguf_model(workspace_path)
    } {
        Ok(path) => path,
        Err(_) => {
            // No language model found - send WebSocket message
            let error_msg = "No language model found. Please provide a language model.".to_string();
            if let Err(e) = tx.send(Message::Text(error_msg.clone())).await {
                error!("Failed to send WebSocket message: {}", e);
            }
            return Err("No language model found".to_string());
        }
    };

    // If prompt starts with RAG-, check for embedding model
    if config.prompt.starts_with("RAG-") {
        match find_gguf_emmodel(workspace_path) {
            Ok(_) => {
                // Embedding model exists, continue with RAG processing
                let base_prompt = config.prompt.strip_prefix("RAG-").unwrap();
                let rag_processor = RAGProcessor::new(512, 128, workspace_path)
                    .await
                    .map_err(|e| format!("Failed to initialize RAGProcessor: {:?}", e))?;
                
                let prompt = rag_processor.generate_rag_prompt(base_prompt, TOP_N_CONTEXTS)
                    .await
                    .map_err(|e| format!("Failed to generate RAG prompt: {:?}", e))?;

                // Construct command with platform-specific approach
                let mut cmd = if cfg!(target_os = "windows") {
                    let mut cmd = CommandBuilder::new("cmd");
                    cmd.arg("/C");
                    cmd
                } else {
                    let mut cmd = CommandBuilder::new("bash");
                    cmd.arg("-c");
                    cmd
                };

                let mut command_str = if cfg!(target_os = "macos") {
                    String::from("llama-cli --color")
                } else {
                    format!("{} --color", llama_executable.to_string_lossy())
                };

                command_str.push_str(&format!(" -m \"{}\"", model_path.to_string_lossy()));
                command_str.push_str(&format!(" -ngl 99 -p \" {}\"", prompt.replace("\"", "\\\"")));

                info!("Executing LLaMA RAG command: {}", command_str);
                cmd.arg(command_str);

                Ok(cmd)
            },
            Err(_) => {
                // No embedding model found - send WebSocket message
                let error_msg = "Cannot perform RAG: No embedding model found. Please download an embedding model first.".to_string();
                if let Err(e) = tx.send(Message::Text(error_msg.clone())).await {
                    error!("Failed to send WebSocket message: {}", e);
                }
                return Err("No embedding model found".to_string());
            }
        }
    } else {
        // Non-RAG prompt processing
        let mut cmd = if cfg!(target_os = "windows") {
            let mut cmd = CommandBuilder::new("cmd");
            cmd.arg("/C");
            cmd
        } else {
            let mut cmd = CommandBuilder::new("bash");
            cmd.arg("-c");
            cmd
        };

        let mut command_str = if cfg!(target_os = "macos") {
            String::from("llama-cli --color")
        } else {
            format!("{} --color", llama_executable.to_string_lossy())
        };

        command_str.push_str(&format!(" -m \"{}\"", model_path.to_string_lossy()));
        command_str.push_str(&format!(" -ngl 99 -p \" {} {} \nYour response: \"", 
            config.prompt.replace("\"", "\\\""), 
            "PS: (End your response with [done])"));

        info!("Executing LLaMA command: {}", command_str);
        cmd.arg(command_str);

        Ok(cmd)
    }
}

async fn handle_client(stream: TcpStream) {
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            error!("Failed to accept WebSocket connection: {}", e);
            return;
        }
    };

    let (ws_sender, mut ws_receiver) = ws_stream.split();
    let pty_system = native_pty_system();

    let pty_pair = match pty_system.openpty(PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    }) {
        Ok(pair) => pair,
        Err(e) => {
            error!("Failed to open PTY: {}", e);
            return;
        }
    };

    let mut pty_reader = match pty_pair.master.try_clone_reader() {
        Ok(reader) => reader,
        Err(e) => {
            error!("Failed to clone PTY reader: {}", e);
            return;
        }
    };

    let mut pty_writer = match pty_pair.master.take_writer() {
        Ok(writer) => writer,
        Err(e) => {
            error!("Failed to take PTY writer: {}", e);
            return;
        }
    };

    let (tx, mut rx) = mpsc::channel::<Message>(100);
    let tx_clone = tx.clone();

    fn clean_ansi_codes(input: &str) -> String {
        lazy_static! {
            static ref ANSI_RE: Regex = Regex::new(r"\x1B\[[0-9;]*[a-zA-Z]|\x1B\]0;[^\x07]*\x07|\x03").unwrap();
        }
        ANSI_RE.replace_all(input, "").to_string()
    }

    // PTY reader thread with filtering and ANSI cleanup
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let mut buffer = BytesMut::with_capacity(1024);
            buffer.resize(1024, 0u8);
            let mut accumulated = String::new();
            let mut is_capturing = false;
            
            loop {
                match pty_reader.read(&mut buffer[..]) {
                    Ok(0) => break,
                    Ok(n) => {
                        if let Ok(text) = String::from_utf8(buffer[..n].to_vec()) {
                            let cleaned_text = clean_ansi_codes(&text);
                            accumulated.push_str(&cleaned_text);
                            
                            // Check for start marker
                            if !is_capturing {
                                if let Some(start_idx) = accumulated.find("Your response:") {
                                    is_capturing = true;
                                    accumulated = accumulated[start_idx + "Your response:".len()..].to_string();
                                }
                            }
                            
                            // Check for end marker while capturing
                            if is_capturing {
                                if let Some(done_idx) = accumulated.find("[done]").or_else(|| accumulated.find("[end of text]")) {
                                    // Calculate which end marker was found to get correct index
                                    let end_marker = if accumulated[done_idx..].starts_with("[done]") { "[done]" } else { "[end of text]" };
                                    
                                    // Send final chunk before end marker, using end_marker length properly
                                    let final_chunk = accumulated[..done_idx + end_marker.len()].as_bytes().to_vec();
                                    if !final_chunk.is_empty() {
                                        if tx_clone.send(Message::Binary(final_chunk)).await.is_err() {
                                            error!("Failed to send final PTY output - channel closed");
                                            break;
                                        }
                                    }
                                    let state = MODEL_STATE.lock().unwrap();
                                    let formatted_state = format!("\n\n Model: *{}*", 
                                        state.model_name.as_deref().unwrap_or("unknown model"));  
                                    let state_bytes = formatted_state.as_bytes().to_vec();

                                    if tx_clone.send(Message::Binary(state_bytes)).await.is_err() {
                                        error!("Failed to send model state - channel closed");
                                        break;
                                    }

                                    is_capturing = false;
                                    accumulated.clear();
                                    // break;

                                } else {
                                    // Find last newline to send complete lines
                                    if let Some(last_newline) = accumulated.rfind('\n') {
                                        let complete_lines = accumulated[..last_newline + 1].as_bytes().to_vec();
                                        if !complete_lines.is_empty() {
                                            if tx_clone.send(Message::Binary(complete_lines)).await.is_err() {
                                                error!("Failed to send PTY output - channel closed");
                                                break;
                                            }
                                        }
                                        accumulated = accumulated[last_newline + 1..].to_string();
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        error!("Error reading from PTY: {}", e);
                        break;
                    }
                }
            }
        });
    });

    let send_task = tokio::spawn(async move {
        let mut ws_sender = ws_sender;
        while let Some(msg) = rx.recv().await {
            if let Err(e) = ws_sender.send(msg).await {
                error!("Failed to send WebSocket message: {}", e);
                break;
            }
        }
    });

    while let Some(message) = ws_receiver.next().await {
        match message {
            Ok(Message::Text(text)) => {
                match serde_json::from_str::<LlamaJobConfig>(&text) {
                    Ok(config) => {
                        let job_id = Uuid::new_v4().to_string();
                        
                        let workspace_path = match get_workspace_path() {
                            Ok(path) => path,
                            Err(e) => {
                                error!("Failed to get workspace path: {}", e);
                                continue;
                            }
                        };

                        let cmd = match construct_llama_command(&config, &workspace_path, &tx).await {
                            Ok(cmd) => cmd,
                            Err(e) => {
                                error!("Failed to construct command: {}", e);
                                if let Err(e) = send_status_update(
                                    &tx,
                                    &job_id,
                                    format!("failed to construct command: {}", e),
                                )
                                .await
                                {
                                    error!("Failed to send error status: {}", e);
                                }
                                continue;
                            }
                        };

                        if let Err(e) = send_status_update(&tx, &job_id, "started".to_string()).await {
                            error!("Failed to send start status: {}", e);
                            continue;
                        }

                        match pty_pair.slave.spawn_command(cmd) {
                            Ok(mut child) => {
                                let tx_clone = tx.clone();
                                let job_id_clone = job_id.clone();

                                tokio::spawn(async move {
                                    let exit_status = match child.wait() {
                                        Ok(status) => status.to_string(),
                                        Err(e) => format!("Error waiting for child process: {}", e),
                                    };

                                    if let Err(e) = send_status_update(
                                        &tx_clone,
                                        &job_id_clone,
                                        format!("completed with status: {}", exit_status),
                                    )
                                    .await
                                    {
                                        error!("Failed to send completion status: {}", e);
                                    }
                                });
                            }
                            Err(e) => {
                                error!("Failed to spawn command: {}", e);
                                if let Err(e) = send_status_update(
                                    &tx,
                                    &job_id,
                                    format!("failed to start: {}", e),
                                )
                                .await
                                {
                                    error!("Failed to send error status: {}", e);
                                }
                            }
                        }
                    }
                    Err(e) => {
                        error!("Failed to parse job config: {}", e);
                    }
                }
            }
            Ok(Message::Binary(data)) => {
                if let Err(e) = pty_writer.write_all(&data) {
                    error!("Failed to write to PTY: {}", e);
                    break;
                }
            }
            Ok(Message::Close(_)) => break,
            Err(e) => {
                error!("WebSocket error: {}", e);
                break;
            }
            _ => {}
        }
    }

    send_task.abort();
}

pub async fn start_llama_server() {
    let listener = TcpListener::bind(PTY_SERVER_ADDRESS)
        .await
        .expect("Can't listen");

    info!("LLaMA PTY server listening on {}", PTY_SERVER_ADDRESS);

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(async move {
            handle_client(stream).await;
        });
    }
}