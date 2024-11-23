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

fn get_python_command() -> &'static str {
    // Try python3.10 first
    if Command::new("python3.10").arg("--version").output().is_ok() {
        return "python3.10";
    }
    // Fall back to python
    "python"
}

// Helper function to normalize path for the current platform
fn normalize_path(path: &str) -> String {
    if cfg!(windows) {
        // Ensure Windows paths use backslashes and are properly quoted
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
                match serde_json::from_str::<MLJobConfig>(&text) {
                    Ok(config) => {
                        let job_id = Uuid::new_v4().to_string();

                        let mut cmd = if cfg!(target_os = "windows") {
                            let mut cmd = CommandBuilder::new("cmd");
                            cmd.arg("/C");
                            cmd
                        } else {
                            let mut cmd = CommandBuilder::new("bash");
                            cmd.arg("-c");
                            cmd
                        };

                        let mut command_str = String::new();
                        
                        // Handle virtual environment activation
                        if let Some(venv) = config.venv_path {
                            let normalized_venv = normalize_path(&venv);
                            if cfg!(target_os = "windows") {
                                command_str.push_str(&format!("call \"{}\\Scripts\\activate.bat\" && ", normalized_venv));
                            } else {
                                command_str.push_str(&format!("source \"{}/bin/activate\" && ", normalized_venv));
                            }
                        }

                        // Construct Python command with properly escaped paths
                        let python_cmd = get_python_command();
                        let normalized_script_path = normalize_path(&config.script_path);
                        
                        if cfg!(target_os = "windows") {
                            // On Windows, use a single set of quotes around the entire path
                            command_str.push_str(&format!("{} \"{}\"", python_cmd, normalized_script_path));
                        } else {
                            command_str.push_str(&format!("{} \"{}\"", python_cmd, normalized_script_path));
                        }

                        // Add arguments if any
                        if let Some(args) = config.args {
                            for arg in args {
                                // Properly quote arguments that contain spaces
                                if arg.contains(' ') {
                                    command_str.push_str(&format!(" \"{}\"", arg));
                                } else {
                                    command_str.push_str(&format!(" {}", arg));
                                }
                            }
                        }

                        info!("Executing command: {}", command_str);
                        cmd.arg(command_str);

                        if let Some(env_vars) = config.env_vars {
                            for (key, value) in env_vars {
                                cmd.env(key, value);
                            }
                        }
                        cmd.env("PYTHONUNBUFFERED", "1");

                        // Send initial status update
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

pub async fn start_ml_server() {
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