use crate::api::Result;
use anyhow::{Context, anyhow};
use crafton_core::ErrorKind;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Cursor, Read};
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tauri::{Manager, Runtime};
use tauri_plugin_dialog::DialogExt;
use tokio_util::sync::CancellationToken;

pub fn init<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("files")
        .setup(|app, _| {
            app.manage(LocalUploads::default());
            Ok(())
        })
        .on_event(|app, event| {
            if let tauri::RunEvent::WindowEvent {
                label,
                event: tauri::WindowEvent::Destroyed,
                ..
            } = event
            {
                app.state::<LocalUploads>().0.retain(|_, upload| {
                    if &upload.window_label == label {
                        upload.cancel.cancel();
                        false
                    } else {
                        true
                    }
                });
            }
        })
        .invoke_handler(tauri::generate_handler![
            file_extract_zip,
            file_save_as,
            file_read_dragged_file,
            file_local_info,
            file_upload_local,
            file_cancel_local_upload,
            file_list,
            file_read,
            file_write,
            file_create_directory,
            file_rename,
            file_delete,
        ])
        .build()
}

#[derive(Serialize)]
pub struct ExtractDryRunResult {
    modpack_name: Option<String>,
    conflicting_files: Vec<String>,
}

#[tauri::command]
pub async fn file_read_dragged_file(path: String) -> Result<Vec<u8>> {
    let metadata = tokio::fs::metadata(&path).await?;
    if !metadata.is_file() {
        return Err(anyhow!("dropped path is not a file").into());
    }

    Ok(tokio::fs::read(path).await?)
}

#[derive(Serialize)]
pub struct LocalFileInfo {
    name: String,
    size: u64,
}

#[tauri::command]
pub async fn file_local_info(path: String) -> Result<LocalFileInfo> {
    let metadata = tokio::fs::metadata(&path).await?;
    if !metadata.is_file() {
        return Err(anyhow!("path is not a file").into());
    }

    let name = std::path::Path::new(&path)
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| "file".to_string());
    Ok(LocalFileInfo {
        name,
        size: metadata.len(),
    })
}

#[derive(Default)]
pub struct LocalUploads(dashmap::DashMap<String, LocalUpload>);

struct LocalUpload {
    window_label: String,
    cancel: CancellationToken,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalUploadRequest {
    url: String,
    #[serde(default)]
    headers: HashMap<String, String>,
    path: PathBuf,
    file_name: Option<String>,
    multipart_field: Option<String>,
}

#[derive(Serialize, Clone, Copy)]
pub struct LocalUploadProgress {
    loaded: u64,
    total: u64,
}

#[derive(Serialize)]
pub struct LocalUploadResponse {
    status: u16,
    body: String,
}

/// Uploads a local file straight from disk, so large files never pass through the webview.
#[tauri::command]
pub async fn file_upload_local<R: Runtime>(
    window: tauri::Window<R>,
    state: tauri::State<'_, LocalUploads>,
    upload_id: String,
    request: LocalUploadRequest,
    on_progress: tauri::ipc::Channel<LocalUploadProgress>,
) -> Result<LocalUploadResponse> {
    let url = url::Url::parse(&request.url)?;
    let cancel = CancellationToken::new();
    state.0.insert(
        upload_id.clone(),
        LocalUpload {
            window_label: window.label().to_string(),
            cancel: cancel.clone(),
        },
    );

    let mut last_progress: Option<Instant> = None;
    let upload = crafton_core::upload::upload_local_file(
        crafton_core::upload::LocalFileUpload {
            url,
            headers: request.headers.into_iter().collect(),
            path: request.path,
            file_name: request.file_name,
            multipart_field: request.multipart_field,
        },
        move |loaded, total| {
            if loaded == total
                || last_progress.is_none_or(|last| {
                    last.elapsed() >= Duration::from_millis(100)
                })
            {
                let _ = on_progress.send(LocalUploadProgress { loaded, total });
                last_progress = Some(Instant::now());
            }
        },
    );

    let result: Result<crafton_core::upload::UploadResponse> = tokio::select! {
        _ = cancel.cancelled() => Err(anyhow!("Upload cancelled").into()),
        result = upload => result.map_err(Into::into),
    };
    state.0.remove(&upload_id);

    let response = result?;
    Ok(LocalUploadResponse {
        status: response.status,
        body: response.body,
    })
}

#[tauri::command]
pub async fn file_cancel_local_upload<R: Runtime>(
    window: tauri::Window<R>,
    state: tauri::State<'_, LocalUploads>,
    upload_id: String,
) -> Result<()> {
    if let Some((_, upload)) = state.0.remove_if(&upload_id, |_, upload| {
        upload.window_label == window.label()
    }) {
        upload.cancel.cancel();
    }
    Ok(())
}

#[tauri::command]
pub async fn file_extract_zip(
    instance_id: &str,
    file_path: &str,
    override_conflicts: bool,
    dry_run: bool,
) -> Result<Option<ExtractDryRunResult>> {
    crafton_core::instance::validate_instance_file_write(
        instance_id,
        file_path,
    )
    .await?;
    let parent = file_path
        .trim_start_matches('/')
        .rsplit_once('/')
        .map_or("", |(parent, _)| parent);
    let file_bytes =
        crafton_core::instance::read_instance_file(instance_id, file_path)
            .await?;
    let (mut zip_reader, names) = tokio::task::spawn_blocking(move || {
        let mut archive = zip::ZipArchive::new(Cursor::new(file_bytes))
            .context("failed to read zip file")?;
        let mut names = Vec::new();
        for index in 0..archive.len() {
            let entry = archive
                .by_index_raw(index)
                .context("failed to read archive entry")?;
            let name = entry
                .name()
                .context(ErrorKind::InputError(
                    "invalid archive entry name".to_string(),
                ))?
                .into_owned();
            names.push((index, name));
        }
        Ok::<_, anyhow::Error>((archive, names))
    })
    .await
    .context("failed to read zip file")??;
    let mut entries = Vec::new();
    for (index, name) in names {
        if name.ends_with('/') {
            continue;
        }
        if name.starts_with('/') || name.contains('\\') {
            return Err(ErrorKind::InputError(
                "invalid archive path".to_string(),
            )
            .into());
        }
        let target = if parent.is_empty() {
            name.to_string()
        } else {
            format!("{parent}/{name}")
        };
        let resolved = crafton_core::instance::validate_instance_file_write(
            instance_id,
            &target,
        )
        .await?;
        entries.push((index, target, resolved));
    }
    if dry_run {
        let conflicting_files = entries
            .iter()
            .filter(|(_, _, path)| path.exists())
            .map(|(_, name, _)| name.clone())
            .collect();
        return Ok(Some(ExtractDryRunResult {
            modpack_name: None,
            conflicting_files,
        }));
    }

    for (index, path, resolved) in entries {
        if !override_conflicts && resolved.exists() {
            continue;
        }
        let entry_path = path.clone();
        let (archive, bytes) = tokio::task::spawn_blocking(move || {
            let mut bytes = Vec::new();
            {
                let mut reader =
                    zip_reader.by_index(index).with_context(|| {
                        format!("failed to read archive entry {entry_path}")
                    })?;
                reader.read_to_end(&mut bytes).with_context(|| {
                    format!("failed to read archive entry {entry_path}")
                })?;
            }
            Ok::<_, anyhow::Error>((zip_reader, bytes))
        })
        .await
        .with_context(|| format!("failed to read archive entry {path}"))??;
        zip_reader = archive;
        crafton_core::instance::write_instance_file(
            instance_id,
            &path,
            &bytes,
            !override_conflicts,
        )
        .await?;
    }
    Ok(None)
}

#[tauri::command]
pub async fn file_list(
    instance_id: &str,
    path: &str,
) -> Result<Vec<crafton_core::instance::InstanceFileItem>> {
    Ok(crafton_core::instance::list_instance_files(instance_id, path).await?)
}

#[tauri::command]
pub async fn file_read(instance_id: &str, path: &str) -> Result<Vec<u8>> {
    Ok(crafton_core::instance::read_instance_file(instance_id, path).await?)
}

#[tauri::command]
pub async fn file_write(
    instance_id: &str,
    path: &str,
    bytes: Vec<u8>,
    create_only: bool,
) -> Result<()> {
    Ok(crafton_core::instance::write_instance_file(
        instance_id,
        path,
        &bytes,
        create_only,
    )
    .await?)
}

#[tauri::command]
pub async fn file_create_directory(
    instance_id: &str,
    path: &str,
) -> Result<()> {
    Ok(
        crafton_core::instance::create_instance_directory(instance_id, path)
            .await?,
    )
}

#[tauri::command]
pub async fn file_rename(
    instance_id: &str,
    source: &str,
    destination: &str,
) -> Result<()> {
    Ok(crafton_core::instance::rename_instance_file(
        instance_id,
        source,
        destination,
    )
    .await?)
}

#[tauri::command]
pub async fn file_delete(
    instance_id: &str,
    path: &str,
    recursive: bool,
) -> Result<()> {
    Ok(crafton_core::instance::delete_instance_file(
        instance_id,
        path,
        recursive,
    )
    .await?)
}

#[tauri::command]
pub async fn file_save_as<R: Runtime>(
    app: tauri::AppHandle<R>,
    instance_id: &str,
    file_path: &str,
) -> Result<()> {
    let source = std::path::Path::new(file_path);
    let file_name = source
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_file_name(&file_name)
        .save_file(|path| {
            let _ = tx.send(path);
        });

    if let Some(dest) = rx.await.unwrap_or(None) {
        let dest_path =
            std::path::PathBuf::try_from(dest).context("invalid save path")?;
        crafton_core::instance::save_instance_file_as(
            instance_id,
            file_path,
            &dest_path,
        )
        .await?;
    }

    Ok(())
}
