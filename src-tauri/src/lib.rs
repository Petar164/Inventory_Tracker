use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::{DialogExt, FilePath};

fn data_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to resolve app data dir")
}

fn images_dir(app: &AppHandle) -> PathBuf {
    data_dir(app).join("Images")
}

fn ensure_dirs(app: &AppHandle) {
    fs::create_dir_all(images_dir(app)).ok();
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn filepath_to_pathbuf(fp: FilePath) -> PathBuf {
    match fp {
        FilePath::Path(p) => p,
        FilePath::Url(u) => PathBuf::from(u.path()),
    }
}

#[tauri::command]
fn load_inventory(app: AppHandle) -> Vec<serde_json::Value> {
    ensure_dirs(&app);
    let path = data_dir(&app).join("inventory.json");
    if !path.exists() {
        return vec![];
    }
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[tauri::command]
fn save_inventory(app: AppHandle, items: Vec<serde_json::Value>) {
    ensure_dirs(&app);
    if let Ok(json) = serde_json::to_string_pretty(&items) {
        fs::write(data_dir(&app).join("inventory.json"), json).ok();
    }
}

#[tauri::command]
fn select_images(app: AppHandle) -> Vec<String> {
    let files = app
        .dialog()
        .file()
        .set_title("Select Photos")
        .add_filter("Images", &["jpg", "jpeg", "png", "heic", "webp", "tiff"])
        .blocking_pick_files();

    let Some(paths) = files else {
        return vec![];
    };

    let img_dir = images_dir(&app);
    let mut saved = Vec::new();

    for (i, fp) in paths.into_iter().enumerate() {
        let src = filepath_to_pathbuf(fp);
        let ext = src
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("jpg")
            .to_lowercase();
        let filename = format!("{}-{}.{}", now_ms(), i, ext);
        let dest = img_dir.join(&filename);
        if fs::copy(&src, &dest).is_ok() {
            saved.push(filename);
        }
    }
    saved
}

#[tauri::command]
fn image_path(app: AppHandle, filename: String) -> String {
    let path = images_dir(&app).join(&filename);
    if path.exists() {
        path.to_string_lossy().into_owned()
    } else {
        String::new()
    }
}

#[tauri::command]
fn delete_image(app: AppHandle, filename: String) {
    fs::remove_file(images_dir(&app).join(&filename)).ok();
}

#[tauri::command]
fn export_csv(app: AppHandle, csv: String) {
    let dest = app
        .dialog()
        .file()
        .set_title("Export Inventory")
        .add_filter("CSV", &["csv"])
        .set_file_name("inventory.csv")
        .blocking_save_file();

    if let Some(fp) = dest {
        let path = filepath_to_pathbuf(fp);
        fs::write(path, csv.as_bytes()).ok();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_inventory,
            save_inventory,
            select_images,
            image_path,
            delete_image,
            export_csv,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
