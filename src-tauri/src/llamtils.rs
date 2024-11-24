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