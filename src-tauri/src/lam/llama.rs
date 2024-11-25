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
use tauri::api::path;
use crate::lam::llamautils::RAGProcessor;
use lazy_static::lazy_static;
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
const TOP_N_CONTEXTS: usize = 3; 

fn normalize_path(path: &str) -> String {
    if cfg!(windows) {
        path.replace('/', "\\")
    } else {
        path.to_string()
    }
}

fn get_workspace_path() -> Result<String, String> {
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

fn find_gguf_model(workspace_path: &str) -> Result<PathBuf, String> {
    let model_path = Path::new(workspace_path).join("model");
    
    std::fs::read_dir(&model_path)
        .map_err(|e| format!("Failed to read model directory: {}", e))?
        .filter_map(|entry| entry.ok())
        .find(|entry| {
            entry.path()
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext == "gguf")
                .unwrap_or(false)
        })
        .map(|entry| entry.path())
        .ok_or_else(|| "No .gguf model found in model directory".to_string())
}

pub fn find_gguf_emmodel(workspace_path: &str) -> Result<PathBuf, String> {
    let model_path = Path::new(workspace_path).join("em_model");
    
    std::fs::read_dir(&model_path)
        .map_err(|e| format!("Failed to read model directory: {}", e))?
        .filter_map(|entry| entry.ok())
        .find(|entry| {
            entry.path()
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext == "gguf")
                .unwrap_or(false)
        })
        .map(|entry| entry.path())
        .ok_or_else(|| "No .gguf embedding model found in model directory".to_string())
}
async fn construct_llama_command(config: &LlamaJobConfig, workspace_path: &str) -> Result<CommandBuilder, String> {
    let prompt = if config.prompt.starts_with("RAG-") {
        let base_prompt = config.prompt.strip_prefix("RAG-").unwrap();
        let rag_processor = RAGProcessor::new(512, 128, workspace_path)
            .await
            .map_err(|e| format!("Failed to initialize RAGProcessor: {:?}", e))?;
        rag_processor.generate_rag_prompt(base_prompt, TOP_N_CONTEXTS)
            .await
            .map_err(|e| format!("Failed to generate RAG prompt: {:?}", e))?
    } else {
        config.prompt.clone()
    };
    
    // Rest of the function remains the same
    let mut cmd = if cfg!(target_os = "windows") {
        let mut cmd = CommandBuilder::new("cmd");
        cmd.arg("/C");
        cmd
    } else {
        let mut cmd = CommandBuilder::new("bash");
        cmd.arg("-c");
        cmd
    };

    let model_path = if let Some(model_name) = &config.model_name {
        Path::new(workspace_path)
            .join("model")
            .join(model_name)
    } else {
        find_gguf_model(workspace_path)?
    };

    let mut command_str = String::from("llama-cli --color");
    command_str.push_str(&format!(" -m \"{}\"", model_path.to_string_lossy()));

    if let Some(temp) = config.temperature {
        command_str.push_str(&format!(" --temp {}", temp));
    }

    if let Some(tokens) = config.max_tokens {
        command_str.push_str(&format!(" -n {}", tokens));
    }

    if let Some(args) = &config.additional_args {
        for (key, value) in args {
            command_str.push_str(&format!(" --{} {}", key, value));
        }
    }

    if config.prompt.starts_with("RAG-") {
        command_str.push_str(&format!(" -ngl 99 -p \" {}\"", prompt.replace("\"", "\\\"")));
    } else {
        command_str.push_str(&format!(" -ngl 99 -p \" {} {} \nYour response: \"", prompt.replace("\"", "\\\""), "PS: (End your response with [done])"));
    };

    info!("Executing LLaMA command: {}", command_str);
    cmd.arg(command_str);

    Ok(cmd)
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
            static ref ANSI_RE: Regex = Regex::new(r"\x1B\[[0-9;]*[a-zA-Z]|\x1B\]0;[^\x07]*\x07").unwrap();
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
                                if let Some(end_idx) = accumulated.find("[done]") {
                                    // Send final chunk before end marker
                                    let final_chunk = accumulated[..end_idx].as_bytes().to_vec();
                                    if !final_chunk.is_empty() {
                                        if tx_clone.send(Message::Binary(final_chunk)).await.is_err() {
                                            error!("Failed to send final PTY output - channel closed");
                                            break;
                                        }
                                    }
                                    is_capturing = false;
                                    accumulated.clear();
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

                        let cmd = match construct_llama_command(&config, &workspace_path).await {
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