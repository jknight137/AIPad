use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

// ── PTY Session Management ──────────────────────────────────────────

struct PtyWriter(Box<dyn Write + Send>);

struct PtySession {
    writer: Arc<Mutex<PtyWriter>>,
    _child: Arc<Mutex<Box<dyn portable_pty::Child + Send + Sync>>>,
}

struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl Default for PtyManager {
    fn default() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
struct PtyOutput {
    id: String,
    data: String,
}

// ── Tauri Commands ──────────────────────────────────────────────────

#[tauri::command]
async fn spawn_shell(
    app: AppHandle,
    state: State<'_, PtyManager>,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let mut cmd = CommandBuilder::new("powershell.exe");
    cmd.arg("-NoLogo");

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    drop(pair.slave);

    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;

    let session = PtySession {
        writer: Arc::new(Mutex::new(PtyWriter(writer))),
        _child: Arc::new(Mutex::new(child)),
    };

    state
        .sessions
        .lock()
        .map_err(|e| e.to_string())?
        .insert(id.clone(), session);

    // Spawn reader thread that emits events to frontend
    let emit_id = id.clone();
    let app_handle = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_handle.emit(
                        "pty-output",
                        PtyOutput {
                            id: emit_id.clone(),
                            data,
                        },
                    );
                }
                Err(_) => break,
            }
        }
    });

    Ok(id)
}

#[tauri::command]
async fn write_to_shell(
    state: State<'_, PtyManager>,
    id: String,
    data: String,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let session = sessions.get(&id).ok_or("Session not found")?;
    let mut writer = session.writer.lock().map_err(|e| e.to_string())?;
    writer.0.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
    writer.0.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn resize_shell(
    state: State<'_, PtyManager>,
    _id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    // Note: resize requires storing master handle; simplified for now
    let _ = (state, rows, cols);
    Ok(())
}

#[tauri::command]
async fn kill_shell(
    state: State<'_, PtyManager>,
    id: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    if let Some(session) = sessions.remove(&id) {
        let mut child = session._child.lock().map_err(|e| e.to_string())?;
        let _ = child.kill();
    }
    Ok(())
}

#[tauri::command]
async fn get_system_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "hostname": hostname::get().unwrap_or_default().to_string_lossy().to_string(),
    }))
}

// ── App Entry ───────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(PtyManager::default())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            spawn_shell,
            write_to_shell,
            resize_shell,
            kill_shell,
            get_system_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
