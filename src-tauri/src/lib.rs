use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoFile {
    pub id: String,
    pub path: String,
    pub name: String,
    pub size: u64,
    pub extension: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub path: String,
    pub videos: Vec<VideoFile>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub collection: Collection,
}

const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v", "mpg", "mpeg", "mpe", "3gp", "ts",
    "m2ts", "vob", "ogv", "ogg", "rm", "rmvb", "asf", "amv", "m4p", "m4v", "f4v", "f4p",
];

fn is_video_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            let ext_lower = ext.to_lowercase();
            VIDEO_EXTENSIONS.iter().any(|v| *v == ext_lower)
        })
        .unwrap_or(false)
}

/// Globally-monotonic id generator.
///
/// Combines a millisecond timestamp with an atomic counter so that two
/// ids produced within the same millisecond (which happens routinely while
/// scanning a folder with many files) are guaranteed unique.
fn generate_id() -> String {
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let counter = COUNTER.fetch_add(1, Ordering::SeqCst);
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    format!("id_{:x}_{:x}", timestamp, counter)
}

#[tauri::command]
fn scan_folder(path: String) -> Result<Collection, String> {
    let folder_path = PathBuf::from(&path);
    if !folder_path.exists() {
        return Err(format!("Folder does not exist: {}", path));
    }
    if !folder_path.is_dir() {
        return Err(format!("Path is not a folder: {}", path));
    }

    let mut videos: Vec<VideoFile> = Vec::new();
    let folder_name = folder_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Untitled")
        .to_string();

    for entry in WalkDir::new(&folder_path)
        .max_depth(3)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() && is_video_file(entry.path()) {
            if let Ok(metadata) = fs::metadata(entry.path()) {
                let name = entry
                    .path()
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
                let ext = entry
                    .path()
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                let file_path_str = entry.path().to_string_lossy().to_string();

                videos.push(VideoFile {
                    id: generate_id(),
                    path: file_path_str,
                    name,
                    size: metadata.len(),
                    extension: ext,
                });
            }
        }
    }

    videos.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    let now = chrono_now();
    let collection = Collection {
        id: generate_id(),
        name: folder_name,
        path,
        videos,
        created_at: now,
        updated_at: now,
    };

    Ok(collection)
}

#[tauri::command]
fn rescan_collection(path: String) -> Result<Vec<VideoFile>, String> {
    let folder_path = PathBuf::from(&path);
    if !folder_path.exists() || !folder_path.is_dir() {
        return Err(format!("Folder does not exist: {}", path));
    }

    let mut videos: Vec<VideoFile> = Vec::new();
    for entry in WalkDir::new(&folder_path)
        .max_depth(3)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() && is_video_file(entry.path()) {
            if let Ok(metadata) = fs::metadata(entry.path()) {
                let name = entry
                    .path()
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
                let ext = entry
                    .path()
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                let file_path_str = entry.path().to_string_lossy().to_string();

                videos.push(VideoFile {
                    id: generate_id(),
                    path: file_path_str,
                    name,
                    size: metadata.len(),
                    extension: ext,
                });
            }
        }
    }

    videos.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(videos)
}

fn chrono_now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[tauri::command]
fn get_video_duration(_path: String) -> Result<u64, String> {
    // Frontend will read this from video element metadata directly
    Ok(0)
}

#[tauri::command]
fn check_path_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}

#[tauri::command]
fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())
        .map(|p| p.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            scan_folder,
            rescan_collection,
            get_video_duration,
            check_path_exists,
            get_app_data_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running mkVideo application");
}