use rusqlite::{Connection, Result, params};
use std::path::PathBuf;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Message {
    pub id: Option<i64>,
    pub chat_id: i64,
    pub content: String,
    pub is_user: bool,
    pub timestamp: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Chat {
    pub id: i64,
    pub name: String,
    pub created_at: String,
}

pub fn get_db_path() -> Result<PathBuf, String> {
    let doc_dir = tauri::api::path::document_dir()
        .ok_or_else(|| "Failed to get documents directory".to_string())?;
    
    let workspace_path = doc_dir.join("LevChat");
    std::fs::create_dir_all(&workspace_path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;
    
    Ok(workspace_path.join("chats.db"))
}

pub fn initialize_database() -> Result<(), String> {
    let db_path = get_db_path().map_err(|e| format!("Failed to get DB path: {}", e))?;
    
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Create chats table if not exists
    conn.execute(
        "CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| format!("Failed to create chats table: {}", e))?;

    // Create messages table if not exists
    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY,
            chat_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            is_user BOOLEAN NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(chat_id) REFERENCES chats(id)
        )",
        [],
    ).map_err(|e| format!("Failed to create messages table: {}", e))?;

    Ok(())
}

pub fn create_new_chat(name: String) -> Result<i64, String> {
    // Ensure database is initialized before creating a chat
    initialize_database().map_err(|e| format!("Database initialization failed: {}", e))?;

    let db_path = get_db_path().map_err(|e| format!("Failed to get DB path: {}", e))?;
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute(
        "INSERT INTO chats (name) VALUES (?1)",
        [&name],
    ).map_err(|e| format!("Failed to insert chat: {}", e))?;

    let chat_id = conn.last_insert_rowid();
    Ok(chat_id)
}

pub fn save_message(chat_id: i64, message: &Message) -> Result<(), String> {
    let db_path = get_db_path().map_err(|e| format!("Failed to get DB path: {}", e))?;
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute(
        "INSERT INTO messages (chat_id, content, is_user, timestamp) VALUES (?1, ?2, ?3, ?4)",
        params![
            chat_id, 
            message.content, 
            message.is_user, 
            message.timestamp
        ],
    ).map_err(|e| format!("Failed to save message: {}", e))?;

    Ok(())
}

pub fn get_all_chats() -> Result<Vec<Chat>, String> {
    let db_path = get_db_path().map_err(|e| format!("Failed to get DB path: {}", e))?;
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn.prepare("SELECT id, name, created_at FROM chats")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let chats = stmt.query_map([], |row| {
        Ok(Chat {
            id: row.get(0)?,
            name: row.get(1)?,
            created_at: row.get(2)?,
        })
    }).map_err(|e| format!("Failed to query chats: {}", e))?;

    Ok(chats.collect::<Result<Vec<Chat>, _>>()
        .map_err(|e| format!("Failed to collect chats: {}", e))?)
}

pub fn get_chat_messages(chat_id: i64) -> Result<Vec<Message>, String> {
    let db_path = get_db_path().map_err(|e| format!("Failed to get DB path: {}", e))?;
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT id, content, is_user, timestamp FROM messages 
         WHERE chat_id = ?1 ORDER BY timestamp"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let messages = stmt.query_map([chat_id], |row| {
        Ok(Message {
            id: row.get(0)?,
            chat_id,
            content: row.get(1)?,
            is_user: row.get(2)?,
            timestamp: row.get(3)?,
        })
    }).map_err(|e| format!("Failed to query messages: {}", e))?;

    Ok(messages.collect::<Result<Vec<Message>, _>>()
        .map_err(|e| format!("Failed to collect messages: {}", e))?)
}

pub fn delete_chat(chat_id: i64) -> Result<(), String> {
    let db_path = get_db_path().map_err(|e| format!("Failed to get DB path: {}", e))?;
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // First, delete all messages associated with this chat
    conn.execute(
        "DELETE FROM messages WHERE chat_id = ?1",
        [chat_id],
    ).map_err(|e| format!("Failed to delete chat messages: {}", e))?;

    // Then delete the chat itself
    conn.execute(
        "DELETE FROM chats WHERE id = ?1",
        [chat_id],
    ).map_err(|e| format!("Failed to delete chat: {}", e))?;

    Ok(())
}
pub fn rename_chat(chat_id: i64, new_name: String) -> Result<(), String> {
    let db_path = get_db_path()?;
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute(
        "UPDATE chats SET name = ?1 WHERE id = ?2",
        params![new_name, chat_id]
    ).map_err(|e| format!("Failed to rename chat: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn rename_chat_command(chat_id: i64, new_name: String) -> Result<(), String> {
    rename_chat(chat_id, new_name)
}


#[tauri::command]
pub fn delete_chat_command(chat_id: i64) -> Result<(), String> {
    delete_chat(chat_id)
}

#[tauri::command]
pub fn create_new_chat_command(name: String) -> Result<i64, String> {
    create_new_chat(name)
}

#[tauri::command]
pub fn save_message_command(chat_id: i64, message: Message) -> Result<(), String> {
    save_message(chat_id, &message)
}

#[tauri::command]
pub fn get_chat_messages_command(chat_id: i64) -> Result<Vec<Message>, String> {
    get_chat_messages(chat_id)
}

#[tauri::command]
pub fn get_all_chats_command() -> Result<Vec<Chat>, String> {
    get_all_chats()
}
