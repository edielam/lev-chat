// use std::env;
use std::fs;
use std::fs::File;
use std::io::Write;
// use std::path::PathBuf;
use std::process::Command;
use reqwest;
// use sysinfo::System;
use reqwest::Client;
use std::sync::{Arc, Mutex};
use futures::StreamExt;
use tokio::sync::mpsc;
use tauri::api::path;
use lazy_static::lazy_static;

// const GITHUB_RELEASES_URL: &str = "https://github.com/ggerganov/llama.cpp/releases/download";
// const LATEST_VERSION: &str = "b4164";

// #[derive(Debug)]
// enum Platform {
//     MacOS,
//     Windows,
//     Linux,
// }

// #[derive(Debug)]
// enum WindowsBinary {
//     CudaV11,
//     CudaV12,
//     AvxBasic,
//     Avx2,
//     Avx512,
// }

// fn detect_platform() -> Platform {
//     match env::consts::OS {
//         "macos" => Platform::MacOS,
//         "windows" => Platform::Windows,
//         "linux" => Platform::Linux,
//         _ => panic!("Unsupported operating system"),
//     }
// }
// #[tauri::command]
// pub fn is_llama_cpp_installed() -> bool {
//     // Get the setup directory path
//     let doc_dir = match dirs::document_dir() {
//         Some(dir) => dir,
//         None => return false,
//     };
//     let setup_dir = doc_dir.join("LevChat").join("setup");
    
//     // Construct the full path to llama-cli
//     let llama_cli_path = setup_dir.join("llama-cli");
    
//     // Try running with full path
//     Command::new(llama_cli_path)
//         .arg("--help")
//         .output()
//         .map(|output| output.status.success())
//         .unwrap_or(false)
// }
// #[tauri::command]
// pub fn is_llama_cpp_installed() -> Result<bool, String> {
//     // Get the setup directory path
//     let doc_dir = match path::document_dir() {
//         Some(dir) => dir,
//         None => return Err("Could not find documents directory".to_string()),
//     };
//     let setup_dir = doc_dir.join("LevChat").join("setup");
    
//     // Construct the full path to llama-cli
//     let llama_cli_path = setup_dir.join("llama-cli");
//     let llama_cli_exe_path = setup_dir.join("llama-cli.exe");
    
//     // Try running with full path
//     match Command::new(&llama_cli_path)
//         .arg("--help")
//         .output() {
//         Ok(output) if output.status.success() => return Ok(true),
//         _ => {
//             // Fallback to system-wide check
//             match Command::new("llama-cli")
//                 .arg("--help")
//                 .output() {
//                 Ok(output) if output.status.success() => return Ok(true),
//                 _ => {
//                     // Check if llama-cli exists in the setup directory
//                     if llama_cli_path.exists() {
//                         return Err("executable found but incompatible with system".to_string());
//                     }
                    
//                     // Check specifically for llama-cli.exe
//                     if llama_cli_exe_path.exists() {
//                         return Err("executable found but incompatible with system".to_string());
//                     }
                    
//                     return Ok(false);
//                 }
//             }
//         }
//     }
// }
#[tauri::command]
pub fn is_llama_cpp_installed() -> bool {
    // Get the setup directory path
    let doc_dir = match path::document_dir() {
        Some(dir) => dir,
        None => return false,
    };
    let setup_dir = doc_dir.join("LevChat").join("setup");
    
    // Construct the full path to llama-cli
    let llama_cli_path = setup_dir.join("llama-cli");
    
    // Try running with full path
    Command::new(llama_cli_path)
        .arg("--help")
        .output()
        .map(|output| output.status.success())
        .unwrap_or_else(|_| {
            // Fallback to system-wide check if full path fails
            Command::new("llama-clioo")
                .arg("--help")
                .output()
                .map(|output| output.status.success())
                .unwrap_or(false)
        })
}

#[tauri::command]
pub fn check_llama_cpp_executable_exists() -> Result<String, String> {
    let doc_dir = match path::document_dir() {
        Some(dir) => dir,
        None => return Err("Could not find documents directory".to_string()),
    };
    let setup_dir = doc_dir.join("LevChat").join("setup");
    
    let llama_cli_path = setup_dir.join("llama-cli");
    let llama_cli_exe_path = setup_dir.join("llama-cli.exe");
    
    if llama_cli_path.exists() {
        Ok("llama-cli".to_string())
    } else if llama_cli_exe_path.exists() {
        Ok("llama-cli.exe".to_string())
    } else {
        Err("No llama.cpp executable found".to_string())
    }
}
// fn detect_windows_binary() -> Option<WindowsBinary> {
//     let cuda_version = detect_cuda_version();
    
//     let mut system = System::new_all();
//     system.refresh_cpu_all();
    
//     // Use CPU features from sysinfo in a different way
//     let cpu_has_avx512 = system.cpus().iter().any(|cpu| 
//         cpu.vendor_id().contains("Intel") && cpu.name().contains("AVX-512")
//     );
//     let cpu_has_avx2 = system.cpus().iter().any(|cpu| 
//         cpu.name().contains("AVX2")
//     );
    
//     match (cuda_version, cpu_has_avx512, cpu_has_avx2) {
//         (Some(v), _, _) if v >= 11 && v < 12 => Some(WindowsBinary::CudaV11),
//         (Some(v), _, _) if v >= 12 => Some(WindowsBinary::CudaV12),
//         (_, true, _) => Some(WindowsBinary::Avx512),
//         (_, _, true) => Some(WindowsBinary::Avx2),
//         _ => Some(WindowsBinary::AvxBasic)
//     }
// }

// fn detect_cuda_version() -> Option<u8> {
//     // Windows CUDA version detection
//     #[cfg(windows)]
//     {
//         let output = Command::new("nvcc")
//             .arg("--version")
//             .output()
//             .ok()?;
        
//         let version_str = String::from_utf8_lossy(&output.stdout);
//         let version_match = version_str.split("Cuda compilation tools, release")
//             .nth(1)?
//             .trim()
//             .split('.')
//             .next()?;
        
//         version_match.parse().ok()
//     }
    
//     #[cfg(not(windows))]
//     { None }
// }

// fn get_download_url(platform: &Platform, binary: Option<&WindowsBinary>) -> Option<String> {
//     match platform {
//         Platform::MacOS => Some("brew install llama.cpp".to_string()),
//         Platform::Windows => match binary {
//             Some(WindowsBinary::CudaV11) => 
//                 Some(format!("{}/{}/llama-b4163-bin-win-cuda-cu11.7.1-x64.zip", GITHUB_RELEASES_URL, LATEST_VERSION)),
//             Some(WindowsBinary::CudaV12) => 
//                 Some(format!("{}/{}/llama-b4163-bin-win-cuda-cu12.2.0-x64.zip", GITHUB_RELEASES_URL, LATEST_VERSION)),
//             Some(WindowsBinary::AvxBasic) => 
//                 Some(format!("{}/{}/llama-b4163-bin-win-avx-x64.zip", GITHUB_RELEASES_URL, LATEST_VERSION)),
//             Some(WindowsBinary::Avx2) => 
//                 Some(format!("{}/{}/llama-b4163-bin-win-avx2-x64.zip", GITHUB_RELEASES_URL, LATEST_VERSION)),
//             Some(WindowsBinary::Avx512) => 
//                 Some(format!("{}/{}/llama-b4163-bin-win-avx512-x64.zip", GITHUB_RELEASES_URL, LATEST_VERSION)),
//             None => None
//         },
//         Platform::Linux => 
//             Some(format!("{}/{}/llama-{}-bin-ubuntu-x64.zip", GITHUB_RELEASES_URL, LATEST_VERSION, LATEST_VERSION)),
//     }
// }

// fn download_and_install(url: &str, install_dir: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
//     let response = reqwest::blocking::get(url)?;
//     let content = response.bytes()?;

//     fs::create_dir_all(install_dir)?;

//     let filename = url.split('/').last().unwrap_or("llama.zip");
//     let filepath = install_dir.join(filename);
//     fs::write(&filepath, content)?;

//     if filename.ends_with(".zip") {
//         let output = Command::new("unzip")
//             .arg(&filepath)
//             .arg("-d")
//             .arg(install_dir)
//             .output()?;
        
//         if !output.status.success() {
//             return Err("Failed to extract zip file".into());
//         }
//     }

//     Ok(())
// }
// pub async fn download_with_progress(url: &str, download_path: &PathBuf) -> Result<String, String> {
//     let filename = url.split('/').last()
//         .ok_or_else(|| "Could not extract filename from URL".to_string())?
//         .to_string();
//     let file_path = download_path.join(&filename);

//     if file_path.exists() {
//         return Err(format!("Model {} already exists", filename));
//     }

//     // Create channels for cancellation
//     let (lam_tx, mut lam_rx) = mpsc::channel(1);

//     // Update global state
//     {
//         let mut state = LLAMACPP_STATE.lock().unwrap();
//         state.is_downloading = true;
//         state.filename = Some(filename.clone());
//         state.downloaded_size = 0;
//         state.cancel_tx = Some(lam_tx);
//     }

//     // Prepare download
//     let client = Client::new();
//     let response = client.get(url)
//         .send()
//         .await
//         .map_err(|e| format!("Failed to initiate download: {}", e))?;

//     let total_size = response.content_length()
//         .ok_or_else(|| "Failed to get content length".to_string())?;

//     // Update total size in global state
//     {
//         let mut state = LLAMACPP_STATE.lock().unwrap();
//         state.total_size = Some(total_size);
//     }

//     // Prepare file for writing
//     fs::create_dir_all(&download_path)
//         .map_err(|e| format!("Failed to create directory: {}", e))?;

//     let mut file = File::create(&file_path)
//         .map_err(|e| format!("Failed to create file: {}", e))?;

//     // Stream download
//     let mut stream = response.bytes_stream();

//     loop {
//         tokio::select! {
//             Some(item) = stream.next() => {
//                 let chunk = item
//                     .map_err(|e| format!("Error downloading chunk: {}", e))?;
                
//                 // Write chunk to file
//                 file.write_all(&chunk)
//                     .map_err(|e| format!("Failed to write chunk: {}", e))?;

//                 // Update downloaded size
//                 {
//                     let mut state = LLAMACPP_STATE.lock().unwrap();
//                     state.downloaded_size += chunk.len() as u64;
//                 }
//             }
//             _ = lam_rx.recv() => {
//                 // Download cancelled
//                 {
//                     let mut state = LLAMACPP_STATE.lock().unwrap();
//                     state.is_downloading = false;
//                 }
//                 // Optional: Remove partial download
//                 std::fs::remove_file(&file_path).ok();
//                 return Err("Download cancelled".to_string());
//             }
//             else => break
//         }
//     }

//     // Mark download as complete
//     {
//         let mut state = LLAMACPP_STATE.lock().unwrap();
//         state.is_downloading = false;
//         state.downloaded_size = total_size;
//     }

//     Ok(format!("Model {} downloaded successfully", filename))
// }


// pub async fn install_llama_cpp() -> Result<(), Box<dyn std::error::Error>> {
//     if is_llama_cpp_installed() {
//         return Ok(());
//     }

//     let platform = detect_platform();
//     let doc_dir = path::document_dir()
//         .ok_or_else(|| "Failed to get documents directory".to_string())?;
 
//     let install_dir = doc_dir.join("LevChat").join("setup");
//     fs::create_dir_all(&install_dir)?; // Ensure directory exists

//     match platform {
//         Platform::MacOS => {
            
//                 let _ = download_with_progress("https://github.com/ggerganov/llama.cpp/releases/download/b4163/llama-b1-bin-win-hip-x64-gfx1030.zip", &install_dir).await;

//                 let url = "https://github.com/ggerganov/llama.cpp/releases/download/b4163/llama-b1-bin-win-hip-x64-gfx1030.zip";
//                 let filename = url.split('/').last().unwrap_or("llama.zip");
//                 let filepath = install_dir.join(filename);
                
//                 let output = Command::new("unzip")
//                     .arg(&filepath)
//                     .arg("-d")
//                     .arg(&install_dir)
//                     .arg("-o")  // overwrite existing files
//                     .output()?;
                
//                 // Remove the zip file after extraction
//                 fs::remove_file(filepath)?;

//                 // If there's a nested folder from the zip, flatten its contents
//                 if let Ok(entries) = fs::read_dir(&install_dir) {
//                     let nested_folders: Vec<_> = entries
//                         .filter_map(|entry| entry.ok())
//                         .filter(|entry| entry.path().is_dir() && entry.path().join("bin").exists())
//                         .collect();

//                     for folder in nested_folders {
//                         let nested_path = folder.path();
                        
//                         // Move contents of the nested folder to install_dir
//                         for nested_entry in fs::read_dir(&nested_path)? {
//                             let nested_entry = nested_entry?;
//                             let dest = install_dir.join(nested_entry.file_name());
                            
//                             if nested_entry.path().is_file() {
//                                 fs::rename(nested_entry.path(), dest)?;
//                             } else if nested_entry.path().is_dir() {
//                                 fs::rename(nested_entry.path(), dest)?;
//                             }
//                         }

//                         // Remove the now-empty nested folder
//                         fs::remove_dir(nested_path)?;
//                     }
//                 }

//                 if !output.status.success() {
//                     return Err("Failed to extract zip file".into());
//                 }
//              else {
//                 return Err("Failed to get download URL for Linux".into());
//             }
//             // let output = Command::new("brew")
//             //     .arg("install")
//             //     .arg("llama.cpp")
//             //     .output()?;
            
//             // if !output.status.success() {
//             //     return Err("Failed to install llama.cpp via Homebrew".into());
//             // }
//         },
//         Platform::Windows => {
//             let binary = detect_windows_binary();
//             if let Some(url) = get_download_url(&platform, binary.as_ref()) {
//                 // Use download_with_progress 
//                 let _ = download_with_progress(url.as_str(), &install_dir).await;

//                 // Unzip directly into install_dir
//                 let filename = url.split('/').last().unwrap_or("llama.zip");
//                 let filepath = install_dir.join(filename);
                
//                 let output = Command::new("unzip")
//                     .arg(&filepath)
//                     .arg("-d")
//                     .arg(&install_dir)
//                     .arg("-o")  // overwrite existing files
//                     .output()?;
                
//                 if !output.status.success() {
//                     return Err("Failed to extract zip file".into());
//                 }

//                 // Remove the zip file after extraction
//                 fs::remove_file(filepath)?;
//             } else {
//                 return Err("No suitable binary found for your system".into());
//             }
//         },
//         Platform::Linux => {
//             if let Some(url) = get_download_url(&platform, None) {
//                 // Use download_with_progress
//                 let _ = download_with_progress(url.as_str(), &install_dir).await;

//                 // Unzip directly into install_dir
//                 let filename = url.split('/').last().unwrap_or("llama.zip");
//                 let filepath = install_dir.join(filename);
                
//                 let output = Command::new("unzip")
//                     .arg(&filepath)
//                     .arg("-d")
//                     .arg(&install_dir)
//                     .arg("-o")  // overwrite existing files
//                     .output()?;
                
//                 // Remove the zip file after extraction
//                 fs::remove_file(filepath)?;

//                 // If there's a nested folder from the zip, flatten its contents
//                 if let Ok(entries) = fs::read_dir(&install_dir) {
//                     let nested_folders: Vec<_> = entries
//                         .filter_map(|entry| entry.ok())
//                         .filter(|entry| entry.path().is_dir() && entry.path().join("bin").exists())
//                         .collect();

//                     for folder in nested_folders {
//                         let nested_path = folder.path();
                        
//                         // Move contents of the nested folder to install_dir
//                         for nested_entry in fs::read_dir(&nested_path)? {
//                             let nested_entry = nested_entry?;
//                             let dest = install_dir.join(nested_entry.file_name());
                            
//                             if nested_entry.path().is_file() {
//                                 fs::rename(nested_entry.path(), dest)?;
//                             } else if nested_entry.path().is_dir() {
//                                 fs::rename(nested_entry.path(), dest)?;
//                             }
//                         }

//                         // Remove the now-empty nested folder
//                         fs::remove_dir(nested_path)?;
//                     }
//                 }

//                 if !output.status.success() {
//                     return Err("Failed to extract zip file".into());
//                 }
//             } else {
//                 return Err("Failed to get download URL for Linux".into());
//             }
//         }
//     }

//     Ok(())
// }

// #[tauri::command]
// pub async fn install_llama_cpp_command() -> Result<(), String> {
//     install_llama_cpp().await.map_err(|e| e.to_string())
// }
lazy_static! {
    static ref LLAMACPP_STATE: Arc<Mutex<DownloadState>> = Arc::new(Mutex::new(DownloadState::default()));
}

#[derive(Default)]
struct DownloadState {
    total_size: Option<u64>,
    downloaded_size: u64,
    is_downloading: bool,
    filename: Option<String>,
    cancel_tx: Option<mpsc::Sender<()>>,
}
lazy_static! {
    static ref DOWNLOAD_STATE: Arc<Mutex<DownloadState>> = Arc::new(Mutex::new(DownloadState::default()));
}

#[tauri::command]
pub async fn download_setup(
    url: String, 
    model_type: String
) -> Result<String, String> {
    // Prepare download path
    let doc_dir = path::document_dir()
        .ok_or_else(|| "Failed to get documents directory".to_string())?;
 
    let levchat_dir = doc_dir.join("LevChat");
    let download_path = match model_type.as_str() {
        "Windows" => levchat_dir.join("setup"),
        "Linux" => levchat_dir.join("setup"),
        _ => return Err("Invalid binary type".to_string())
    };

    let filename = url.split('/').last()
        .ok_or_else(|| "Could not extract filename from URL".to_string())?
        .to_string();
    let file_path = download_path.join(&filename);

    if file_path.exists() {
        return Err(format!("Model {} already exists", filename));
    }
    let client = Client::new();
    let response = client.head(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to verify download link: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Invalid download link. Server returned status: {}", response.status()));
    }
    // Create channels for cancellation
    let (cancel_tx, mut cancel_rx) = mpsc::channel(1);

    // Update global state
    {
        let mut state = LLAMACPP_STATE.lock().unwrap();
        state.is_downloading = true;
        state.filename = Some(filename.clone());
        state.downloaded_size = 0;
        state.cancel_tx = Some(cancel_tx);
    }

    // Prepare download
    let client = Client::new();
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to initiate download: {}", e))?;

    let total_size = response.content_length()
        .ok_or_else(|| "Failed to get content length".to_string())?;

    // Update total size in global state
    {
        let mut state =  LLAMACPP_STATE.lock().unwrap();
        state.total_size = Some(total_size);
    }

    // Prepare file for writing
    fs::create_dir_all(&download_path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    let mut file = File::create(&file_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    // Stream download
    let mut stream = response.bytes_stream();

    loop {
        tokio::select! {
            Some(item) = stream.next() => {
                let chunk = item
                    .map_err(|e| format!("Error downloading chunk: {}", e))?;
                
                // Write chunk to file
                file.write_all(&chunk)
                    .map_err(|e| format!("Failed to write chunk: {}", e))?;

                // Update downloaded size
                {
                    let mut state = LLAMACPP_STATE.lock().unwrap();
                    state.downloaded_size += chunk.len() as u64;
                }
            }
            // _ = cancel_rx.recv() => {
            //     // Download cancelled
            //     {
            //         let mut state =  LLAMACPP_STATE.lock().unwrap();
            //         state.is_downloading = false;
            //     }
            //     // Optional: Remove partial download
            //     std::fs::remove_file(&file_path).ok();
            //     return Err("Download cancelled".to_string());
            // }
            else => break
        }
    }

    // Mark download as complete
    {
        let mut state =  LLAMACPP_STATE.lock().unwrap();
        state.is_downloading = false;
        state.downloaded_size = total_size;
    }

    Ok(format!("Model {} downloaded successfully", filename))
}

#[tauri::command]
pub fn get_setup_progress() -> Result<DownloadProgress, String> {
    let state =  LLAMACPP_STATE.lock().unwrap();
    
    Ok(DownloadProgress {
        total_size: state.total_size,
        downloaded_size: state.downloaded_size,
        is_downloading: state.is_downloading,
        filename: state.filename.clone(),
        percentage: state.total_size
            .map(|total| (state.downloaded_size as f64 / total as f64 * 100.0).round() as u8)
    })
}

#[tauri::command]
pub fn cancel_setup() -> Result<(), String> {
    let mut state =  LLAMACPP_STATE.lock().unwrap();
    
    if let Some(cancel_tx) = state.cancel_tx.take() {
        cancel_tx.try_send(()).map_err(|_| "Failed to send cancellation signal".to_string())?;
        state.is_downloading = false;
        Ok(())
    } else {
        Err("No active download to cancel".to_string())
    }
}
#[tauri::command]
pub fn reset_setup_progress() -> Result<(), String> {
    let mut state = LLAMACPP_STATE.lock().unwrap();
    
    // Reset all download state values
    state.total_size = None;
    state.downloaded_size = 0;
    state.is_downloading = false;
    state.filename = None;
    state.cancel_tx = None;

    Ok(())
}
#[tauri::command]
pub async fn unzip_setup(url: String, model_type: String) -> Result<String, String> {
    // Prepare download path similar to download_setup function
    let doc_dir = path::document_dir()
        .ok_or_else(|| "Failed to get documents directory".to_string())?;
 
    let levchat_dir = doc_dir.join("LevChat");
    let download_path = match model_type.as_str() {
        "Windows" => levchat_dir.join("setup"),
        "Linux" => levchat_dir.join("setup"),
        _ => return Err("Invalid binary type".to_string())
    };

    // Extract filename from the last part of the URL
    let filename = url.split('/').last()
        .ok_or_else(|| "Invalid URL format".to_string())?;

    // Construct full path to the ZIP file
    let file_path = download_path.join(filename);

    // Verify the ZIP file exists
    if !file_path.exists() {
        return Err(format!("ZIP file not found: {}", file_path.display()));
    }

    // Open the zip file
    let zip_file = fs::File::open(&file_path)
        .map_err(|e| format!("Failed to open zip file: {}", e))?;

    let mut archive = zip::ZipArchive::new(zip_file)
        .map_err(|e| format!("Failed to read zip archive: {}", e))?;

    // Extract each file directly to download_path
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to extract file {}: {}", i, e))?;
        
        let outpath = match file.enclosed_name() {
            Some(path) => download_path.join(path),
            None => continue
        };

        // Create parent directories if they don't exist
        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory {}: {}", outpath.display(), e))?;
        } else {
            // Ensure parent directory exists
            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }

            // Write file contents
            let mut outfile = fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create output file {}: {}", outpath.display(), e))?;
            
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to write file {}: {}", outpath.display(), e))?;
        }
    }

    // Remove the original ZIP file
    fs::remove_file(&file_path)
        .map_err(|e| format!("Failed to remove zip file: {}", e))?;

    Ok(format!("Successfully extracted {} to {}", filename, download_path.display()))
}

#[tauri::command]
pub async fn download_model(
    url: String, 
    model_type: String
) -> Result<String, String> {
    // Prepare download path
    let doc_dir = path::document_dir()
        .ok_or_else(|| "Failed to get documents directory".to_string())?;
 
    let levchat_dir = doc_dir.join("LevChat");
    let download_path = match model_type.as_str() {
        "languageModel" => levchat_dir.join("model"),
        "embeddingModel" => levchat_dir.join("em_model"),
        _ => return Err("Invalid model type".to_string())
    };

    let filename = url.split('/').last()
        .ok_or_else(|| "Could not extract filename from URL".to_string())?
        .to_string();
    let file_path = download_path.join(&filename);

    if file_path.exists() {
        return Err(format!("Model {} already exists", filename));
    }
    let client = Client::new();
    let response = client.head(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to verify download link: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Invalid download link. Server returned status: {}", response.status()));
    }
    // Create channels for cancellation
    let (cancel_tx, mut cancel_rx) = mpsc::channel(1);

    // Update global state
    {
        let mut state = DOWNLOAD_STATE.lock().unwrap();
        state.is_downloading = true;
        state.filename = Some(filename.clone());
        state.downloaded_size = 0;
        state.cancel_tx = Some(cancel_tx);
    }

    // Prepare download
    let client = Client::new();
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to initiate download: {}", e))?;

    let total_size = response.content_length()
        .ok_or_else(|| "Failed to get content length".to_string())?;

    // Update total size in global state
    {
        let mut state = DOWNLOAD_STATE.lock().unwrap();
        state.total_size = Some(total_size);
    }

    // Prepare file for writing
    fs::create_dir_all(&download_path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    let mut file = File::create(&file_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    // Stream download
    let mut stream = response.bytes_stream();

    loop {
        tokio::select! {
            Some(item) = stream.next() => {
                let chunk = item
                    .map_err(|e| format!("Error downloading chunk: {}", e))?;
                
                // Write chunk to file
                file.write_all(&chunk)
                    .map_err(|e| format!("Failed to write chunk: {}", e))?;

                // Update downloaded size
                {
                    let mut state = DOWNLOAD_STATE.lock().unwrap();
                    state.downloaded_size += chunk.len() as u64;
                }
            }
            _ = cancel_rx.recv() => {
                // Download cancelled
                {
                    let mut state = DOWNLOAD_STATE.lock().unwrap();
                    state.is_downloading = false;
                }
                // Optional: Remove partial download
                std::fs::remove_file(&file_path).ok();
                return Err("Download cancelled".to_string());
            }
            else => break
        }
    }

    // Mark download as complete
    {
        let mut state = DOWNLOAD_STATE.lock().unwrap();
        state.is_downloading = false;
        state.downloaded_size = total_size;
    }

    Ok(format!("Model {} downloaded successfully", filename))
}

#[tauri::command]
pub fn get_download_progress() -> Result<DownloadProgress, String> {
    let state = DOWNLOAD_STATE.lock().unwrap();
    
    Ok(DownloadProgress {
        total_size: state.total_size,
        downloaded_size: state.downloaded_size,
        is_downloading: state.is_downloading,
        filename: state.filename.clone(),
        percentage: state.total_size
            .map(|total| (state.downloaded_size as f64 / total as f64 * 100.0).round() as u8)
    })
}

#[tauri::command]
pub fn cancel_download() -> Result<(), String> {
    let mut state = DOWNLOAD_STATE.lock().unwrap();
    
    if let Some(cancel_tx) = state.cancel_tx.take() {
        cancel_tx.try_send(()).map_err(|_| "Failed to send cancellation signal".to_string())?;
        state.is_downloading = false;
        Ok(())
    } else {
        Err("No active download to cancel".to_string())
    }
}

#[derive(serde::Serialize)]
pub struct DownloadProgress {
    total_size: Option<u64>,
    downloaded_size: u64,
    is_downloading: bool,
    filename: Option<String>,
    percentage: Option<u8>
}

#[tauri::command]
pub fn list_language_models() -> Result<Vec<String>, String> {
    let doc_dir = dirs::document_dir()
        .ok_or_else(|| "Failed to get documents directory".to_string())?;
 
    let model_dir = doc_dir.join("LevChat").join("model");

    if !model_dir.exists() {
        fs::create_dir_all(&model_dir)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
        return Ok(vec![]);
    }

    let files = fs::read_dir(&model_dir)
        .map_err(|e| format!("Failed to read directory: {}", e))?
        .filter_map(|entry| {
            entry.ok()
                .and_then(|e| {
                    let filename = e.file_name().to_string_lossy().to_string();
                    if filename.ends_with(".gguf") {
                        Some(filename)
                    } else {
                        None
                    }
                })
        })
        .collect::<Vec<String>>();

    Ok(files)
}

#[tauri::command]
pub fn list_embedding_models() -> Result<Vec<String>, String> {
    let doc_dir = dirs::document_dir()
        .ok_or_else(|| "Failed to get documents directory".to_string())?;
 
    let embed_model_dir = doc_dir.join("LevChat").join("em_model");

    if !embed_model_dir.exists() {
        fs::create_dir_all(&embed_model_dir)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
        return Ok(vec![]);
    }

    let files = fs::read_dir(&embed_model_dir)
        .map_err(|e| format!("Failed to read directory: {}", e))?
        .filter_map(|entry| {
            entry.ok()
                .and_then(|e| {
                    let filename = e.file_name().to_string_lossy().to_string();
                    if filename.ends_with(".gguf") {
                        Some(filename)
                    } else {
                        None
                    }
                })
        })
        .collect::<Vec<String>>();

    Ok(files)
}