use crafton_core::{
    handler,
    prelude::{CommandPayload, DirectoryInfo, app_db_backup_dir},
};
use serde::{Deserialize, Serialize};
use tauri::{Manager, Runtime};
use tauri_plugin_opener::OpenerExt;

use crate::api::Result;
use crafton_core::prelude::canonicalize;
use dashmap::DashMap;
use std::path::{Path, PathBuf};
use tokio_util::sync::CancellationToken;
use url::Url;

#[derive(Default)]
pub struct DebugInfoExports(DashMap<(String, String), CancellationToken>);

pub fn init<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("utils")
        .setup(|app, _| {
            app.manage(DebugInfoExports::default());
            Ok(())
        })
        .on_event(|app, event| {
            if let tauri::RunEvent::WindowEvent {
                label,
                event: tauri::WindowEvent::Destroyed,
                ..
            } = event
            {
                for export in &app.state::<DebugInfoExports>().0 {
                    if &export.key().0 == label {
                        export.value().cancel();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_os,
            is_network_metered,
            should_disable_mouseover,
            highlight_in_folder,
            open_path,
            show_launcher_logs_folder,
            show_app_db_backups_folder,
            export_debug_info,
            cancel_debug_info_export,
            progress_bars_list,
            get_opening_command,
            super::thumbnails::get_image_thumbnail,
            cache_remote_icon,
            featured_pack_latest,
            featured_pack_download,
            featured_pack_mod_files,
            featured_pack_instance_mods,
            featured_pack_remove_mods,
            featured_pack_github_start,
            featured_pack_github_poll,
        ])
        .build()
}

#[tauri::command]
pub async fn featured_pack_latest(
    repo: &str,
    token: Option<&str>,
) -> Result<Option<crafton_core::featured_pack::FeaturedPackRelease>> {
    Ok(crafton_core::featured_pack::latest_release(repo, token).await?)
}

#[derive(Serialize)]
pub struct FeaturedPackDownload {
    release: crafton_core::featured_pack::FeaturedPackRelease,
    path: PathBuf,
}

#[tauri::command]
pub async fn featured_pack_download(
    repo: &str,
    token: Option<&str>,
) -> Result<FeaturedPackDownload> {
    let (release, path) =
        crafton_core::featured_pack::download_latest(repo, token).await?;
    Ok(FeaturedPackDownload { release, path })
}

#[tauri::command]
pub async fn featured_pack_github_start(
    client_id: &str,
) -> Result<crafton_core::featured_pack::GithubDeviceCode> {
    Ok(crafton_core::featured_pack::github_device_start(client_id).await?)
}

#[tauri::command]
pub async fn featured_pack_github_poll(
    client_id: &str,
    device_code: &str,
) -> Result<crafton_core::featured_pack::GithubDevicePoll> {
    Ok(
        crafton_core::featured_pack::github_device_poll(client_id, device_code)
            .await?,
    )
}

#[tauri::command]
pub async fn featured_pack_mod_files(path: PathBuf) -> Result<Vec<String>> {
    Ok(crafton_core::featured_pack::pack_mod_files(path).await?)
}

#[tauri::command]
pub async fn featured_pack_instance_mods(
    instance_id: &str,
) -> Result<Vec<String>> {
    Ok(crafton_core::featured_pack::instance_mod_files(instance_id).await?)
}

#[tauri::command]
pub async fn featured_pack_remove_mods(
    instance_id: &str,
    files: Vec<String>,
) -> Result<()> {
    Ok(crafton_core::featured_pack::remove_instance_mod_files(
        instance_id,
        files,
    )
    .await?)
}

#[tauri::command]
pub async fn cache_remote_icon(source: &str) -> Result<String> {
    let path = crafton_core::instance::cache_remote_icon(source).await?;
    Ok(tauri_convert_file_src(&path)?.to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(clippy::enum_variant_names)]
pub enum OS {
    Windows,
    Linux,
    MacOS,
}

/// Gets OS
#[tauri::command]
pub fn get_os() -> OS {
    #[cfg(target_os = "windows")]
    let os = OS::Windows;
    #[cfg(target_os = "linux")]
    let os = OS::Linux;
    #[cfg(target_os = "macos")]
    let os = OS::MacOS;
    os
}

#[tauri::command]
pub async fn is_network_metered() -> Result<bool> {
    Ok(crafton_core::prelude::is_network_metered().await?)
}

// Lists active progress bars
// Create a new HashMap with the same keys
// Values provided should not be used directly, as they are not guaranteed to be up-to-date
#[tauri::command]
pub async fn progress_bars_list()
-> Result<DashMap<uuid::Uuid, crafton_core::LoadingBar>> {
    let res = crafton_core::EventState::list_progress_bars().await?;
    Ok(res)
}

// disables mouseover and fixes a random crash error only fixed by recent versions of macos
#[tauri::command]
pub async fn should_disable_mouseover() -> bool {
    if cfg!(target_os = "macos") {
        // We try to match version to 12.2 or higher. If unrecognizable to pattern or lower, we default to the css with disabled mouseover for safety
        if let tauri_plugin_os::Version::Semantic(major, minor, _) =
            tauri_plugin_os::version()
            && major >= 12
            && minor >= 3
        {
            // Mac os version is 12.3 or higher, we allow mouseover
            return false;
        }
        true
    } else {
        // Not macos, we allow mouseover
        false
    }
}

#[tauri::command]
pub async fn highlight_in_folder<R: Runtime>(
    app: tauri::AppHandle<R>,
    path: PathBuf,
) {
    tauri::async_runtime::spawn_blocking(move || {
        if let Err(e) = app.opener().reveal_item_in_dir(path) {
            tracing::error!("Failed to highlight file in folder: {}", e);
        }
    })
    .await
    .ok();
}

#[tauri::command]
pub async fn open_path<R: Runtime>(app: tauri::AppHandle<R>, path: PathBuf) {
    tauri::async_runtime::spawn_blocking(move || {
        if let Err(e) =
            app.opener().open_path(path.to_string_lossy(), None::<&str>)
        {
            tracing::error!("Failed to open path: {}", e);
        }
    })
    .await
    .ok();
}

#[tauri::command]
pub async fn show_launcher_logs_folder<R: Runtime>(app: tauri::AppHandle<R>) {
    if let Some(d) = DirectoryInfo::global_handle_if_ready() {
        let path = d.launcher_logs_dir().unwrap_or_default();
        // failure to get folder just opens filesystem
        // (ie: if in debug mode only and launcher_logs never created)
        open_path(app, path).await;
    }
}

#[tauri::command]
pub async fn show_app_db_backups_folder<R: Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<()> {
    let path = app_db_backup_dir()?;
    tokio::fs::create_dir_all(&path).await?;
    open_path(app, path).await;
    Ok(())
}

#[tauri::command]
pub async fn export_debug_info<R: Runtime>(
    window: tauri::Window<R>,
    state: tauri::State<'_, DebugInfoExports>,
    id: String,
    path: PathBuf,
    on_progress: tauri::ipc::Channel<
        crafton_core::debug_info::DebugInfoExportProgress,
    >,
) -> Result<bool> {
    let key = (window.label().to_string(), id);
    let cancel = CancellationToken::new();
    match state.0.entry(key.clone()) {
        dashmap::mapref::entry::Entry::Vacant(entry) => {
            entry.insert(cancel.clone());
        }
        dashmap::mapref::entry::Entry::Occupied(_) => {
            return Err(std::io::Error::other(
                "Debug info export is already running",
            )
            .into());
        }
    }
    let result = crafton_core::debug_info::export_debug_info(
        path,
        cancel,
        move |progress| {
            let _ = on_progress.send(progress);
        },
    )
    .await;
    state.0.remove(&key);
    Ok(result?)
}

#[tauri::command]
pub fn cancel_debug_info_export<R: Runtime>(
    window: tauri::Window<R>,
    state: tauri::State<'_, DebugInfoExports>,
    id: String,
) {
    if let Some(cancel) = state.0.get(&(window.label().to_string(), id)) {
        cancel.cancel();
    }
}

// Get opening command
// For example, if a user clicks on an .mrpack to open the app.
// This should be called once and only when the app is done booting up and ready to receive a command
// Returns a Command struct- see events.js
#[tauri::command]
#[cfg(target_os = "macos")]
pub async fn get_opening_command(
    state: tauri::State<'_, crate::macos::deep_link::InitialPayload>,
) -> Result<Option<CommandPayload>> {
    let payload = state.payload.lock().await;
    let cmd_arg = std::env::args_os()
        .nth(1)
        .map(|path| path.to_string_lossy().to_string());

    return if let Some(payload) = payload.as_ref() {
        opening_command(payload).await
    } else if let Some(cmd_arg) = cmd_arg {
        opening_command(&cmd_arg).await
    } else {
        Ok(None)
    };
}

#[tauri::command]
#[cfg(not(target_os = "macos"))]
pub async fn get_opening_command() -> Result<Option<CommandPayload>> {
    // Tauri is not CLI, we use arguments as path to file to call
    let cmd_arg = std::env::args_os().nth(1);

    let cmd_arg = cmd_arg.map(|path| path.to_string_lossy().to_string());
    if let Some(cmd) = cmd_arg {
        return opening_command(&cmd).await;
    }
    Ok(None)
}

// helper function called when redirected by a weblink (ie: modrith://do-something) or when redirected by a .mrpack file (in which case its a filepath)
// We hijack the deep link library (which also contains functionality for instance-checking)
pub async fn handle_command(command: String) -> Result<()> {
    let command = normalize_deep_link_command(&command);

    tracing::info!("handle command: {command}");
    Ok(crafton_core::handler::parse_and_emit_command(&command).await?)
}

async fn opening_command(command: &str) -> Result<Option<CommandPayload>> {
    let command = normalize_deep_link_command(command);

    tracing::info!("opening command {command}");
    Ok(Some(handler::parse_command(&command).await?))
}

fn normalize_deep_link_command(command: &str) -> String {
    let trimmed = command.trim();
    if let Ok(urls) = serde_json::from_str::<Vec<String>>(trimmed)
        && let Some(url) = urls.into_iter().next()
    {
        return url;
    }

    if let Ok(url) = serde_json::from_str::<String>(trimmed) {
        return url;
    }

    trimmed.to_string()
}

// Remove when (and if) https://github.com/tauri-apps/tauri/issues/12022 is implemented
pub(crate) fn tauri_convert_file_src(path: &Path) -> Result<Url> {
    #[cfg(any(windows, target_os = "android"))]
    const BASE: &str = "http://asset.localhost/";
    #[cfg(not(any(windows, target_os = "android")))]
    const BASE: &str = "asset://localhost/";

    let path = canonicalize(path)?;
    let path = path.to_string_lossy();
    let encoded = urlencoding::encode(&path);

    Ok(Url::parse(&format!("{BASE}{encoded}"))?)
}
