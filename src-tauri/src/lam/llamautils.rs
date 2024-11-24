use std::fs::{self};
use std::io::{self};
use std::path::{Path, PathBuf};
use lopdf::Document as PdfDocument;
use std::process::Command;
use serde::{Serialize, Deserialize};
use tauri::api::path;
use std::error::Error;
use reqwest;
use std::fmt;
use crate::lam::llama::find_gguf_emmodel;
use tokio::time::{sleep, Duration};

const MAX_RETRIES: u32 = 5;
const RETRY_DELAY: Duration = Duration::from_secs(2);
const LLAMA_SERVER_URL: &str = "http://localhost:8080";

pub fn setup_levchat_dirs() -> Result<(), Box<dyn Error>> {
    let doc_dir = path::document_dir()
        .ok_or_else(|| "Failed to get documents directory".to_string())?;
 
    let levchat_dir = doc_dir.join("LevChat");
    let data_dir = levchat_dir.join("data");
    let model_dir = levchat_dir.join("model");
    let embed_model_dir = levchat_dir.join("em_model");


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
    if !embed_model_dir.exists() {
        println!("Creating model directory...");
        fs::create_dir_all(&embed_model_dir)
            .map_err(|e| format!("Failed to create model directory: {}", e))?;
    }

    // println!("\nLevChat directory structure:");
    // println!("  └─ {}", levchat_dir.display());
    // println!("     ├─ data/  {}", if data_dir.exists() { "(✓)" } else { "(✗)" });
    // println!("     └─ model/ {}", if model_dir.exists() { "(✓)" } else { "(✗)" });
 
    Ok(())
 }

 #[derive(Debug, Serialize, Deserialize)]
 struct EmbeddingRequest {
     content: String,
 }
 
 #[derive(Debug, Serialize, Deserialize)]
 struct EmbeddingResponse {
     embedding: Vec<f32>,
 }
 
 #[derive(Debug)]
 pub enum RAGError {
     IoError(io::Error),
     ServerError(String),
     ReqwestError(reqwest::Error),
     SerdeError(serde_json::Error),
 }
impl std::error::Error for RAGError {}

impl fmt::Display for RAGError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RAGError::IoError(e) => write!(f, "IO error: {}", e),
            RAGError::ServerError(e) => write!(f, "Server error: {}", e),
            RAGError::ReqwestError(e) => write!(f, "Request error: {}", e),
            RAGError::SerdeError(e) => write!(f, "Serialization error: {}", e),
        }
    }
}
 
 impl From<io::Error> for RAGError {
     fn from(error: io::Error) -> Self {
         RAGError::IoError(error)
     }
 }
 
 impl From<reqwest::Error> for RAGError {
     fn from(error: reqwest::Error) -> Self {
         RAGError::ReqwestError(error)
     }
 }
 
 impl From<serde_json::Error> for RAGError {
     fn from(error: serde_json::Error) -> Self {
         RAGError::SerdeError(error)
     }
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
     client: reqwest::Client,
     server_process: Option<std::process::Child>,
 }
 
 impl RAGProcessor {
     pub async fn new(chunk_size: usize, overlap: usize, workspace_path: &str) -> Result<Self, RAGError> {
         let doc_dir = path::document_dir()
             .ok_or_else(|| RAGError::IoError(io::Error::new(io::ErrorKind::NotFound, "Failed to get documents directory")))?;
         let data_dir = doc_dir.join("LevChat/data");
         
         if !data_dir.exists() {
             fs::create_dir_all(&data_dir)?;
         }
 
         // Start the llama server
         let em_model_path = find_gguf_emmodel(workspace_path)
             .map_err(|e| RAGError::ServerError(format!("Failed to find embedding model: {}", e)))?;
 
         let server_process = Command::new("llama-server")
             .arg("-m")
             .arg(em_model_path)
             .arg("--embeddings")
             .arg("-c")
             .arg("512")
             .arg("-ngl")
             .arg("99")
             .spawn()
             .map_err(|e| RAGError::ServerError(format!("Failed to start llama-server: {}", e)))?;
         
         let client = reqwest::Client::new();

         for retry in 0..MAX_RETRIES {
            if retry > 0 {
                sleep(RETRY_DELAY).await;
            }
            
            match client.get("http://localhost:8080/health").send().await {
                Ok(_) => break,
                Err(e) => {
                    if retry == MAX_RETRIES - 1 {
                        return Err(RAGError::ServerError(format!("Server failed to start after {} retries: {}", MAX_RETRIES, e)));
                    }
                }
            }
        }
         
         let mut processor = RAGProcessor {
             chunk_size,
             overlap,
             documents: Vec::new(),
             data_dir,
             client,
             server_process: Some(server_process),
         };
 
         processor.process_documents().await?;
         
         Ok(processor)
     }
 
     async fn get_embedding(&self, text: &str) -> Result<Vec<f32>, RAGError> {
        let max_chunk_length = 384; 
        let text = if text.len() > max_chunk_length {
            &text[..max_chunk_length]
        } else {
            text
        };

        let request = EmbeddingRequest {
            content: text.to_string(),
        };

        let response = self.client
            .post(format!("{}/embedding", LLAMA_SERVER_URL))
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(RAGError::ServerError(format!("Embedding server error: {}", error_text)));
        }

        let embedding_response: EmbeddingResponse = response.json().await?;
        Ok(embedding_response.embedding)
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
 
     async fn chunk_text(&self, text: &str) -> Result<Vec<Chunk>, RAGError> {
        let words: Vec<&str> = text.split_whitespace().collect();
        let mut chunks = Vec::new();

        println!("Total words to process: {}", words.len());
        
        let mut i = 0;
        while i < words.len() {
            let end = (i + self.chunk_size).min(words.len());
            let chunk_text = words[i..end].join(" ");
            
            println!("Processing chunk {}: words {} to {}", chunks.len(), i, end);
            
            match self.get_embedding(&chunk_text).await {
                Ok(embedding) => {
                    chunks.push(Chunk {
                        text: chunk_text.clone(),
                        embedding,
                    });
                    
                    if end == words.len() {
                        println!("Reached end of text");
                        break;
                    }

                    i = end - self.overlap;
                    println!("Next chunk will start at word: {}", i);

                    if i >= end {
                        println!("Warning: Index not advancing, breaking loop");
                        break;
                    }
                },
                Err(e) => {
                    eprintln!("Warning: Failed to get embedding for chunk: {}", e);
                    i = end;
                }
            }
        }
        
        println!("Finished processing. Created {} chunks", chunks.len());
        
        if chunks.is_empty() {
            return Err(RAGError::ServerError("Failed to generate any valid chunks".to_string()));
        }
        
        Ok(chunks)
    }
 
     async fn process_documents(&mut self) -> Result<(), RAGError> {
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
                 let chunks = self.chunk_text(&content).await?;
                 
                 self.documents.push(Document {
                     filename,
                     content,
                     chunks,
                 });
             }
         }
         
         Ok(())
     }
 
     fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
         let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
         let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
         let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
         
         dot_product / (norm_a * norm_b)
     }
 
     pub async fn retrieve_context(&self, query: &str, top_n: usize) -> Result<Vec<(String, String)>, RAGError> {
         let query_embedding = self.get_embedding(query).await?;
         
         let mut matches: Vec<(&str, &str, f32)> = self.documents.iter()
            .flat_map(|doc| doc.chunks.iter().map({
                let value = query_embedding.clone();
                move |chunk| 
                (chunk.text.as_str(), doc.filename.as_str(), 
                Self::cosine_similarity(&value, &chunk.embedding))
                }))
            .collect();
         
         matches.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal));
         
         Ok(matches.iter()
             .take(top_n)
             .map(|(text, filename, _)| (text.to_string(), filename.to_string()))
             .collect())
     }
 
     pub async fn generate_rag_prompt(&self, query: &str, top_n: usize) -> Result<String, RAGError> {
         let contexts = self.retrieve_context(query, top_n).await?;
         let context_str = contexts.iter()
             .map(|(text, filename)| format!("From {}: {}", filename, text))
             .collect::<Vec<_>>()
             .join("\n\n");
         
         Ok(format!(
             r#"Take your time and analyse the following context:
 {}
 
 Now use the context to answer the following query: {}
 PS: (End your response with [done])
 Your response: "#,
             context_str,
             query
         ))
     }
 }
 
 impl Drop for RAGProcessor {
     fn drop(&mut self) {
         if let Some(mut process) = self.server_process.take() {
             let _ = process.kill();
         }
     }
 }