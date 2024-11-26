use std::fs::{self};
use std::io::{self};
use std::path::{Path, PathBuf};
use lopdf::Document as PdfDocument;
use rand::Rng;
use serde::{Serialize, Deserialize};
use tauri::api::path;
use std::error::Error;

const EMBEDDING_DIM: usize = 384;


pub fn setup_levchat_dirs() -> Result<(), Box<dyn Error>> {
    let doc_dir = path::document_dir()
        .ok_or_else(|| "Failed to get documents directory".to_string())?;
 
    let levchat_dir = doc_dir.join("LevChat");
    let data_dir = levchat_dir.join("data");
    let model_dir = levchat_dir.join("model");

    if !levchat_dir.exists() {
        println!("Creating LevChat directory...");
        fs::create_dir_all(&levchat_dir)
            .map_err(|e| format!("Failed to create LevChat directory: {}", e))?;
    }
 
    if !data_dir.exists() {
        println!("Creating data directory...");
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }
 
    if !model_dir.exists() {
        println!("Creating model directory...");
        fs::create_dir_all(&model_dir)
            .map_err(|e| format!("Failed to create model directory: {}", e))?;
    }

    // println!("\nLevChat directory structure:");
    // println!("  └─ {}", levchat_dir.display());
    // println!("     ├─ data/  {}", if data_dir.exists() { "(✓)" } else { "(✗)" });
    // println!("     └─ model/ {}", if model_dir.exists() { "(✓)" } else { "(✗)" });
 
    Ok(())
 }


#[derive(Debug, Serialize, Deserialize)]
pub struct Chunk {
    pub text: String,
    pub embedding: Vec<f32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Document {
    pub filename: String,
    pub content: String,
    pub chunks: Vec<Chunk>,
}

pub struct RAGProcessor {
    chunk_size: usize,
    overlap: usize,
    documents: Vec<Document>,
    data_dir: PathBuf,
}

impl RAGProcessor {
    pub fn new(chunk_size: usize, overlap: usize) -> io::Result<Self> {
        let doc_dir = path::document_dir()
            .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Failed to get documents directory"))?;
        let data_dir = doc_dir.join("LevChat/data");
        
        if !data_dir.exists() {
            fs::create_dir_all(&data_dir)?;
        }
        
        let mut processor = RAGProcessor {
            chunk_size,
            overlap,
            documents: Vec::new(),
            data_dir,
        };

        processor.process_documents()?;
        
        Ok(processor)
    }

    fn generate_embedding(&self) -> Vec<f32> {
        let mut rng = rand::thread_rng();
        (0..EMBEDDING_DIM).map(|_| rng.gen::<f32>()).collect()
    }

    fn extract_text_from_pdf(&self, pdf_path: &Path) -> io::Result<String> {
        let doc = PdfDocument::load(pdf_path).map_err(|e| {
            io::Error::new(io::ErrorKind::Other, format!("Failed to load PDF: {}", e))
        })?;

        let mut text = String::new();
        
        for page_num in 1..=doc.get_pages().len() {
            if let Ok(page_text) = doc.extract_text(&[page_num.try_into().unwrap()]) {
                text.push_str(&page_text);
                text.push(' ');
            }
        }

        Ok(text)
    }

    fn chunk_text(&self, text: &str) -> Vec<Chunk> {
        let words: Vec<&str> = text.split_whitespace().collect();
        let mut chunks = Vec::new();
        
        let mut i = 0;
        while i < words.len() {
            let end = (i + self.chunk_size).min(words.len());
            let chunk_text = words[i..end].join(" ");
            
            chunks.push(Chunk {
                text: chunk_text,
                embedding: self.generate_embedding(),
            });
            
            if end == words.len() {
                break;
            }
            
            i += self.chunk_size - self.overlap;
        }
        
        chunks
    }

    fn process_documents(&mut self) -> io::Result<()> {
        self.documents.clear();
        
        for entry in fs::read_dir(&self.data_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("pdf") {
                let filename = path.file_name()
                    .ok_or_else(|| io::Error::new(io::ErrorKind::Other, "Invalid filename"))?
                    .to_string_lossy()
                    .into_owned();
                
                let content = self.extract_text_from_pdf(&path)?;
                let chunks = self.chunk_text(&content);
                
                self.documents.push(Document {
                    filename,
                    content,
                    chunks,
                });
            }
        }
        
        Ok(())
    }

    // pub fn refresh_documents(&mut self) -> io::Result<()> {
    //     self.process_documents()
    // }

    fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
        
        dot_product / (norm_a * norm_b)
    }

    pub fn retrieve_context(&self, _query: &str, top_n: usize) -> Vec<(String, String)> {
        let query_embedding = self.generate_embedding();
        
        let mut matches: Vec<(&str, &str, f32)> = self.documents.iter()
            .flat_map(|doc| doc.chunks.iter().map({
                let value = query_embedding.clone();
                move |chunk| 
                (chunk.text.as_str(), doc.filename.as_str(), 
                Self::cosine_similarity(&value, &chunk.embedding))
        }))
            .collect();
        
        matches.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal));
        
        matches.iter()
            .take(top_n)
            .map(|(text, filename, _)| (text.to_string(), filename.to_string()))
            .collect()
    }

    pub fn generate_rag_prompt(&self, query: &str, top_n: usize) -> String {
        let contexts = self.retrieve_context(query, top_n);
        let context_str = contexts.iter()
            .map(|(text, filename)| format!("From {}: {}", filename, text))
            .collect::<Vec<_>>()
            .join("\n\n");
        
        format!(
            r#"Take your time and analyse the following context:
{}

Now use the context to answer the following query: {}
PS: (End your response with [done])
Your response: "#,
            context_str,
            query
        )
    }
}

use std::env;
use std::fs;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use reqwest;
use sysinfo::System;
use reqwest::Client;
use std::sync::{Arc, Mutex};
use futures::StreamExt;
use tokio::sync::mpsc;
use tauri::api::path;
use lazy_static::lazy_static;

const GITHUB_RELEASES_URL: &str = "https://github.com/ggerganov/llama.cpp/releases/download";
const LATEST_VERSION: &str = "b4164";

#[derive(Debug)]
enum Platform {
    MacOS,
    Windows,
    Linux,
}

#[derive(Debug)]
enum WindowsBinary {
    CudaV11,
    CudaV12,
    AvxBasic,
    Avx2,
    Avx512,
}

fn detect_platform() -> Platform {
    match env::consts::OS {
        "macos" => Platform::MacOS,
        "windows" => Platform::Windows,
        "linux" => Platform::Linux,
        _ => panic!("Unsupported operating system"),
    }
}
#[tauri::command]
pub fn is_llama_cpp_installed() -> bool {
    Command::new("llama-cli")
        .arg("--help")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn detect_windows_binary() -> Option<WindowsBinary> {
    let cuda_version = detect_cuda_version();
    
    let mut system = System::new_all();
    system.refresh_cpu_all();
    
    // Use CPU features from sysinfo in a different way
    let cpu_has_avx512 = system.cpus().iter().any(|cpu| 
        cpu.vendor_id().contains("Intel") && cpu.name().contains("AVX-512")
    );
    let cpu_has_avx2 = system.cpus().iter().any(|cpu| 
        cpu.name().contains("AVX2")
    );
    
    match (cuda_version, cpu_has_avx512, cpu_has_avx2) {
        (Some(v), _, _) if v >= 11 && v < 12 => Some(WindowsBinary::CudaV11),
        (Some(v), _, _) if v >= 12 => Some(WindowsBinary::CudaV12),
        (_, true, _) => Some(WindowsBinary::Avx512),
        (_, _, true) => Some(WindowsBinary::Avx2),
        _ => Some(WindowsBinary::AvxBasic)
    }
}

fn detect_cuda_version() -> Option<u8> {
    // Windows CUDA version detection
    #[cfg(windows)]
    {
        let output = Command::new("nvcc")
            .arg("--version")
            .output()
            .ok()?;
        
        let version_str = String::from_utf8_lossy(&output.stdout);
        let version_match = version_str.split("Cuda compilation tools, release")
            .nth(1)?
            .trim()
            .split('.')
            .next()?;
        
        version_match.parse().ok()
    }
    
    #[cfg(not(windows))]
    { None }
}

fn get_download_url(platform: &Platform, binary: Option<&WindowsBinary>) -> Option<String> {
    match platform {
        Platform::MacOS => Some("brew install llama.cpp".to_string()),
        Platform::Windows => match binary {
            Some(WindowsBinary::CudaV11) => 
                Some(format!("{}/{}/llama-b4163-bin-win-cuda-cu11.7.1-x64.zip", GITHUB_RELEASES_URL, LATEST_VERSION)),
            Some(WindowsBinary::CudaV12) => 
                Some(format!("{}/{}/llama-b4163-bin-win-cuda-cu12.2.0-x64.zip", GITHUB_RELEASES_URL, LATEST_VERSION)),
            Some(WindowsBinary::AvxBasic) => 
                Some(format!("{}/{}/llama-b4163-bin-win-avx-x64.zip", GITHUB_RELEASES_URL, LATEST_VERSION)),
            Some(WindowsBinary::Avx2) => 
                Some(format!("{}/{}/llama-b4163-bin-win-avx2-x64.zip", GITHUB_RELEASES_URL, LATEST_VERSION)),
            Some(WindowsBinary::Avx512) => 
                Some(format!("{}/{}/llama-b4163-bin-win-avx512-x64.zip", GITHUB_RELEASES_URL, LATEST_VERSION)),
            None => None
        },
        Platform::Linux => 
            Some(format!("{}/{}/llama-{}-bin-ubuntu-x64.zip", GITHUB_RELEASES_URL, LATEST_VERSION, LATEST_VERSION)),
    }
}

fn download_and_install(url: &str, install_dir: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    let response = reqwest::blocking::get(url)?;
    let content = response.bytes()?;

    fs::create_dir_all(install_dir)?;

    let filename = url.split('/').last().unwrap_or("llama.zip");
    let filepath = install_dir.join(filename);
    fs::write(&filepath, content)?;

    if filename.ends_with(".zip") {
        let output = Command::new("unzip")
            .arg(&filepath)
            .arg("-d")
            .arg(install_dir)
            .output()?;
        
        if !output.status.success() {
            return Err("Failed to extract zip file".into());
        }
    }

    Ok(())
}

pub fn install_llama_cpp() -> Result<(), Box<dyn std::error::Error>> {
    if is_llama_cpp_installed() {
        return Ok(());
    }

    let platform = detect_platform();
    let doc_dir = path::document_dir()
        .ok_or_else(|| "Failed to get documents directory".to_string())?;
 
    let install_dir = doc_dir.join("LevChat");
    

    match platform {
        Platform::MacOS => {
            let output = Command::new("brew")
                .arg("install")
                .arg("llama.cpp")
                .output()?;
            
            if !output.status.success() {
                return Err("Failed to install llama.cpp via Homebrew".into());
            }
        },
        Platform::Windows => {
            let binary = detect_windows_binary();
            if let Some(url) = get_download_url(&platform, binary.as_ref()) {
                download_and_install(&url, &install_dir.join("model"))?;
            } else {
                return Err("No suitable binary found for your system".into());
            }
        },
        Platform::Linux => {
            if let Some(url) = get_download_url(&platform, None) {
                download_and_install(&url, &install_dir.join("model"))?;
            } else {
                return Err("Failed to get download URL for Linux".into());
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn install_llama_cpp_command() -> Result<(), String> {
    install_llama_cpp().map_err(|e| e.to_string())
}
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