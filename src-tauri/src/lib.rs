use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

#[derive(Serialize)]
struct AppVersion {
    version: String,
    name: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ExportTaskInput {
    pub id: String,
    pub name: String,
    pub product_ids: Vec<String>,
    pub template: String,
    pub output_dir: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub zip_path: String,
    pub product_count: usize,
    pub image_count: usize,
    pub video_count: usize,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// 获取应用版本信息
#[tauri::command]
fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

/// 打开文件夹选择对话框
#[tauri::command]
async fn select_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let result = app.dialog().file().blocking_pick_folder();
    match result {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

/// 用系统默认浏览器打开外部 URL
#[tauri::command]
async fn open_external_url(url: String, app: tauri::AppHandle) -> Result<(), String> {
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| e.to_string())
}

/// 读取指定目录中的图片文件列表
#[tauri::command]
fn read_image_dir(path: String) -> Result<Vec<String>, String> {
    let dir = PathBuf::from(path);
    if !dir.is_dir() {
        return Err("路径不是有效目录".to_string());
    }

    let mut files = Vec::new();
    let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if let Some(ext) = path.extension() {
            let ext = ext.to_string_lossy().to_lowercase();
            if ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff"].contains(&ext.as_str()) {
                files.push(path.to_string_lossy().to_string());
            }
        }
    }

    Ok(files)
}

/// 确保目录存在（递归创建）
#[tauri::command]
fn ensure_dir(path: String) -> Result<(), String> {
    let dir = PathBuf::from(path);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(())
}

/// 保存 base64 图片数据到指定文件路径
/// base64Data 格式: "data:image/jpeg;base64,/9j/4AAQ..." 或纯 base64 字符串
#[tauri::command]
fn save_image_file(base64_data: String, output_path: String) -> Result<(), String> {
    let path = PathBuf::from(&output_path);

    // 确保父目录存在
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // 解析 base64 数据（去掉 dataURL 前缀）
    let base64_content = if base64_data.contains(",") {
        base64_data.split(",").last().unwrap_or(&base64_data).to_string()
    } else {
        base64_data
    };

    // 解码 base64
    let decoded = general_purpose::STANDARD
        .decode(&base64_content)
        .map_err(|e| format!("base64解码失败: {}", e))?;

    // 写入文件
    std::fs::write(&path, decoded).map_err(|e| format!("写入文件失败: {}", e))?;

    Ok(())
}

/// 保存商品数据到本地 JSON 文件
#[tauri::command]
fn save_product_json(product: serde_json::Value, app: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let products_dir = app_dir.join("products");
    std::fs::create_dir_all(&products_dir).map_err(|e| e.to_string())?;

    let id = product["id"].as_str().unwrap_or("unknown");
    let file_path = products_dir.join(format!("{}.json", id));

    let json_str = serde_json::to_string_pretty(&product).map_err(|e| e.to_string())?;
    std::fs::write(file_path, json_str).map_err(|e| e.to_string())?;

    Ok(())
}

/// 从本地加载所有商品 JSON 文件
#[tauri::command]
fn load_products_json(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let products_dir = app_dir.join("products");

    if !products_dir.exists() {
        return Ok(Vec::new());
    }

    let mut products = Vec::new();
    let entries = std::fs::read_dir(&products_dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().map(|e| e == "json").unwrap_or(false) {
            let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let product: serde_json::Value =
                serde_json::from_str(&content).map_err(|e| e.to_string())?;
            products.push(product);
        }
    }

    Ok(products)
}

/// 删除指定商品 JSON 文件
#[tauri::command]
fn delete_product_json(id: String, app: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let products_dir = app_dir.join("products");
    let file_path = products_dir.join(format!("{}.json", id));

    if file_path.exists() {
        std::fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// 打开文件选择对话框（多选图片）
#[tauri::command]
async fn select_images(app: tauri::AppHandle) -> Result<Option<Vec<String>>, String> {
    let files = app
        .dialog()
        .file()
        .add_filter("图片", &["jpg", "jpeg", "png", "webp", "gif"])
        .blocking_pick_files();

    match files {
        Some(paths) => {
            let paths: Vec<String> = paths
                .into_iter()
                .map(|p| p.to_string())
                .collect();
            Ok(Some(paths))
        }
        None => Ok(None),
    }
}

/// 导出商品资料包（CSV + 图片 + 视频 → ZIP）
#[tauri::command]
fn export_product_package(
    task: ExportTaskInput,
    app: tauri::AppHandle,
) -> Result<ExportResult, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let products_dir = app_dir.join("products");

    // 确定输出目录
    let output_dir = match &task.output_dir {
        Some(dir) => PathBuf::from(dir),
        None => app_dir.join("exports"),
    };
    std::fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;

    // 创建临时工作目录
    let work_dir = output_dir.join(format!("export_{}", task.id));
    if work_dir.exists() {
        let _ = std::fs::remove_dir_all(&work_dir);
    }
    std::fs::create_dir_all(&work_dir).map_err(|e| e.to_string())?;

    // 读取所有选中的商品
    let mut products = Vec::new();
    for pid in &task.product_ids {
        let product_path = products_dir.join(format!("{}.json", pid));
        if product_path.exists() {
            let content = std::fs::read_to_string(&product_path).map_err(|e| e.to_string())?;
            let product: serde_json::Value =
                serde_json::from_str(&content).map_err(|e| e.to_string())?;
            products.push(product);
        }
    }

    if products.is_empty() {
        return Err("未找到任何商品数据".to_string());
    }

    // 创建媒体目录
    let carousel_dir = work_dir.join("images/carousel");
    let detail_dir = work_dir.join("images/detail");
    let certificate_dir = work_dir.join("images/certificate");
    let video_dir = work_dir.join("videos");
    std::fs::create_dir_all(&carousel_dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&detail_dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&certificate_dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&video_dir).map_err(|e| e.to_string())?;

    // 复制媒体文件并统计
    let mut image_count = 0usize;
    let mut video_count = 0usize;

    for product in &products {
        let _product_id = product["id"].as_str().unwrap_or("unknown");
        let _product_name = product["name"].as_str().unwrap_or("unknown");
        let sku = product["sku"].as_str().unwrap_or("unknown");

        if let Some(images) = product["images"].as_array() {
            for (idx, img) in images.iter().enumerate() {
                let img_type = img["type"].as_str().unwrap_or("carousel");
                let file_path = img["filePath"].as_str().unwrap_or("");
                let file_name = img["fileName"].as_str().unwrap_or("");

                if file_path.is_empty() || !std::path::Path::new(file_path).exists() {
                    continue;
                }

                let src = PathBuf::from(file_path);
                let ext = src
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("jpg")
                    .to_lowercase();

                let target_name = if file_name.is_empty() {
                    format!("{}_{}_{}.{}", sku, img_type, idx + 1, ext)
                } else {
                    file_name.to_string()
                };

                let target_dir = match img_type {
                    "video" => {
                        video_count += 1;
                        &video_dir
                    }
                    "certificate" => {
                        image_count += 1;
                        &certificate_dir
                    }
                    "detail" => {
                        image_count += 1;
                        &detail_dir
                    }
                    _ => {
                        image_count += 1;
                        &carousel_dir
                    }
                };

                let target = target_dir.join(&target_name);
                if let Err(e) = std::fs::copy(&src, &target) {
                    eprintln!("复制文件失败: {} -> {}: {}", src.display(), target.display(), e);
                }
            }
        }
    }

    // 生成 CSV 资料表
    let csv_path = work_dir.join("products.csv");
    let mut wtr = csv::WriterBuilder::new()
        .has_headers(true)
        .from_path(&csv_path)
        .map_err(|e| e.to_string())?;

    // 写入 CSV 表头
    wtr.write_record(&[
        "SKU", "名称", "分类", "描述", "价格", "成本", "货币", "重量(g)",
        "长(cm)", "宽(cm)", "高(cm)", "材质", "产地", "标签", "状态",
        "轮播图数量", "详情图数量", "证书图数量", "视频数量",
    ])
    .map_err(|e| e.to_string())?;

    for product in &products {
        let _images = product["images"].as_array().map(|a| a.len()).unwrap_or(0);
        let mut carousel = 0usize;
        let mut detail = 0usize;
        let mut certificate = 0usize;
        let mut video = 0usize;

        if let Some(imgs) = product["images"].as_array() {
            for img in imgs {
                let t = img["type"].as_str().unwrap_or("carousel");
                match t {
                    "video" => video += 1,
                    "certificate" => certificate += 1,
                    "detail" => detail += 1,
                    _ => carousel += 1,
                }
            }
        }

        let tags = product["tags"]
            .as_array()
            .map(|a| {
                a.iter()
                    .filter_map(|v| v.as_str())
                    .collect::<Vec<_>>()
                    .join(";")
            })
            .unwrap_or_default();

        let dims = &product["dimensions"];

        wtr.write_record(&[
            product["sku"].as_str().unwrap_or(""),
            product["name"].as_str().unwrap_or(""),
            product["category"].as_str().unwrap_or(""),
            product["description"].as_str().unwrap_or(""),
            &product["price"].as_f64().map(|v| v.to_string()).unwrap_or_default(),
            &product["cost"].as_f64().map(|v| v.to_string()).unwrap_or_default(),
            product["currency"].as_str().unwrap_or("CNY"),
            &product["weight"].as_f64().map(|v| v.to_string()).unwrap_or_default(),
            &dims["length"].as_f64().map(|v| v.to_string()).unwrap_or_default(),
            &dims["width"].as_f64().map(|v| v.to_string()).unwrap_or_default(),
            &dims["height"].as_f64().map(|v| v.to_string()).unwrap_or_default(),
            product["material"].as_str().unwrap_or(""),
            product["origin"].as_str().unwrap_or(""),
            &tags,
            product["status"].as_str().unwrap_or("draft"),
            &carousel.to_string(),
            &detail.to_string(),
            &certificate.to_string(),
            &video.to_string(),
        ])
        .map_err(|e| e.to_string())?;
    }

    wtr.flush().map_err(|e| e.to_string())?;

    // 打包成 ZIP
    let zip_name = format!("{}_{}.zip", sanitize_filename(&task.name), task.id);
    let zip_path = output_dir.join(&zip_name);

    let zip_file = std::fs::File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(zip_file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    // 递归添加工作目录内容到 ZIP
    add_dir_to_zip(&mut zip, &work_dir, &work_dir, options).map_err(|e| e.to_string())?;

    zip.finish().map_err(|e| e.to_string())?;

    // 清理临时工作目录
    let _ = std::fs::remove_dir_all(&work_dir);

    Ok(ExportResult {
        zip_path: zip_path.to_string_lossy().to_string(),
        product_count: products.len(),
        image_count,
        video_count,
    })
}

/// 递归将目录内容添加到 ZIP
fn add_dir_to_zip<W: std::io::Write + std::io::Seek>(
    zip: &mut zip::ZipWriter<W>,
    base_dir: &Path,
    current_dir: &Path,
    options: zip::write::SimpleFileOptions,
) -> Result<(), String> {
    let entries = std::fs::read_dir(current_dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let relative_path = path.strip_prefix(base_dir).map_err(|e| e.to_string())?;
        let name_in_zip = relative_path.to_string_lossy().replace('\\', "/");

        if path.is_file() {
            zip.start_file(name_in_zip, options)
                .map_err(|e| e.to_string())?;
            let content = std::fs::read(&path).map_err(|e| e.to_string())?;
            zip.write_all(&content).map_err(|e| e.to_string())?;
        } else if path.is_dir() {
            zip.add_directory(name_in_zip + "/", options)
                .map_err(|e| e.to_string())?;
            add_dir_to_zip(zip, base_dir, &path, options)?;
        }
    }

    Ok(())
}

/// 清理文件名中的非法字符
fn sanitize_filename(name: &str) -> String {
    name.replace(|c: char| ['/', '\\', ':', '*', '?', '"', '<', '>', '|'].contains(&c), "_")
}

/// 打开文件所在目录（使用系统资源管理器）
#[tauri::command]
fn show_in_folder(path: String, _app: tauri::AppHandle) -> Result<(), String> {
    let path_obj = PathBuf::from(&path);
    let parent = path_obj.parent().map(|p| p.to_string_lossy().to_string());

    #[cfg(target_os = "windows")]
    {
        let _target = parent.unwrap_or_else(|| path.clone());
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        let _target = parent.unwrap_or_else(|| path.clone());
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        let target = parent.unwrap_or(path);
        std::process::Command::new("xdg-open")
            .arg(&target)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_app_version,
            select_folder,
            open_external_url,
            read_image_dir,
            ensure_dir,
            save_image_file,
            save_product_json,
            load_products_json,
            delete_product_json,
            select_images,
            export_product_package,
            show_in_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
