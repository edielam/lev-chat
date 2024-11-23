use bytes::BytesMut;
use futures::{SinkExt, StreamExt};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::process::Command;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;
use uuid::Uuid;
use log::{error, info};
use tauri::api::path;

fn get_workspace_path() -> Result<String, String> {
    let doc_dir = path::document_dir()
        .ok_or_else(|| "Failed to get documents directory".to_string())?;
    
    let workspace_path = doc_dir.join("cortexdoc_build_n1");
    
    // Create the directory if it doesn't exist
    std::fs::create_dir_all(&workspace_path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;
    
    Ok(normalize_path(workspace_path.to_string_lossy().as_ref()))
}

// Helper function to normalize path for the current platform
fn normalize_path(path: &str) -> String {
    if cfg!(windows) {
        path.replace('/', "\\")
    } else {
        path.to_string()
    }
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

#[derive(Serialize, Deserialize)]
struct MLJobConfig {
    script_path: String,
    args: Option<Vec<String>>,
    env_vars: Option<HashMap<String, String>>,
    venv_path: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct JobStatus {
    job_id: String,
    status: String,
}

const PTY_SERVER_ADDRESS: &str = "127.0.0.1:15555";


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

    // Handle PTY output
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let mut buffer = BytesMut::with_capacity(1024);
            buffer.resize(1024, 0u8);

            loop {
                match pty_reader.read(&mut buffer[..]) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = buffer[..n].to_vec();
                        if tx_clone.send(Message::Binary(data)).await.is_err() {
                            error!("Failed to send PTY output - channel closed");
                            break;
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

    // Spawn WebSocket sender task
    let send_task = tokio::spawn(async move {
        let mut ws_sender = ws_sender;
        while let Some(msg) = rx.recv().await {
            if let Err(e) = ws_sender.send(msg).await {
                error!("Failed to send WebSocket message: {}", e);
                break;
            }
        }
    });

    let container_name = format!("lever-{}", Uuid::new_v4());
    
    // Start container
    let mut start_cmd = CommandBuilder::new("docker");
    let workspace_path = match get_workspace_path() {
        Ok(path) => path,
        Err(e) => {
            error!("Failed to create workspace path: {}", e);
            return;
        }
    };
    start_cmd.args(&[
        "run",
        "-i",
        "--rm",
        "--name",
        &container_name,
        "-v",
        &format!("{}:/workspace", workspace_path),
        "lever-llm-env:latest",
        "/bin/bash"
    ]);

    match pty_pair.slave.spawn_command(start_cmd) {
        Ok(mut child) => {
            // Wait for container to initialize
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            
            while let Some(message) = ws_receiver.next().await {
                match message {
                    Ok(Message::Text(text)) => {
                        match serde_json::from_str::<MLJobConfig>(&text) {
                            Ok(config) => {
                                let job_id = Uuid::new_v4().to_string();
                                
                                // Send initial status
                                if let Err(e) = send_status_update(&tx, &job_id, "started".to_string()).await {
                                    error!("Failed to send start status: {}", e);
                                    continue;
                                }

                                // Construct the Python command
                                let script_name = std::path::Path::new(&config.script_path)
                                    .file_name()  // Get just the filename
                                    .unwrap_or_default()
                                    .to_str()
                                    .unwrap_or_default();

                                let python_cmd = format!(
                                    "python3 \"{}/{}\" {}\n",
                                    "/workspace/scripts",  // Use the mounted path
                                    script_name,
                                    config.args.unwrap_or_default().join(" ")
                                );
                                
                                info!("Executing command: {}", python_cmd);
                                
                                // Write the command to the PTY
                                if let Err(e) = pty_writer.write_all(python_cmd.as_bytes()) {
                                    error!("Failed to write command to PTY: {}", e);
                                    if let Err(e) = send_status_update(&tx, &job_id, format!("failed to execute: {}", e)).await {
                                        error!("Failed to send error status: {}", e);
                                    }
                                    continue;
                                }
                                if let Err(e) = pty_writer.flush() {
                                    error!("Failed to flush PTY writer: {}", e);
                                    continue;
                                }

                                // Monitor execution
                                let tx_clone = tx.clone();
                                let job_id_clone = job_id.clone();
                                tokio::spawn(async move {
                                    if let Err(e) = send_status_update(
                                        &tx_clone,
                                        &job_id_clone,
                                        "running".to_string()
                                    ).await {
                                        error!("Failed to send running status: {}", e);
                                    }
                                });
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
                        if let Err(e) = pty_writer.flush() {
                            error!("Failed to flush PTY writer: {}", e);
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

            // Cleanup
            send_task.abort();
            
            let mut cleanup_cmd = CommandBuilder::new("docker");
            cleanup_cmd.args(&["stop", &container_name]);
            if let Err(e) = pty_pair.slave.spawn_command(cleanup_cmd) {
                error!("Failed to stop container: {}", e);
            }

            if let Err(e) = child.wait() {
                error!("Error waiting for container process: {}", e);
            }
        }
        Err(e) => {
            error!("Failed to start container: {}", e);
        }
    }
}

pub async fn start_ml_server2() {
    let listener = TcpListener::bind(PTY_SERVER_ADDRESS)
        .await
        .expect("Can't listen");

    info!("ML Training PTY server listening on {}", PTY_SERVER_ADDRESS);

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(async move {
            handle_client(stream).await;
        });
    }
}