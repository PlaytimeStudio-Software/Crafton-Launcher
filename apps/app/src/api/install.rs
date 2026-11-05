use crate::api::Result;
use crate::api::instance::InstanceLink;
use crafton_core::data::ModLoader;
use crafton_core::install::{
    InstallJobSnapshot, InstallModpackPreview, InstallPostInstallEdit,
};
use crafton_core::pack::import::ImportLauncherType;
use crafton_core::pack::install_from::CreatePackLocation;
use serde::Deserialize;
use std::path::PathBuf;
use uuid::Uuid;

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("install")
        .invoke_handler(tauri::generate_handler![
            install_get_modpack_preview,
            install_create_instance,
            install_create_modpack_instance,
            install_bulk_update_content,
            install_import_instance,
            install_duplicate_instance,
            install_existing_instance,
            install_pack_to_existing_instance,
            install_job_list,
            install_job_get,
            install_job_retry,
            install_job_pause,
            install_job_resume,
            install_job_cancel,
            install_job_dismiss,
            install_job_support_details,
        ])
        .build()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallCreateInstanceRequest {
    pub name: String,
    pub game_version: String,
    pub loader: ModLoader,
    pub loader_version: Option<String>,
    pub icon_path: Option<String>,
    pub icon_config: Option<crafton_core::data::IconConfig>,
    pub link: Option<InstanceLink>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallPostInstallEditRequest {
    pub name: Option<String>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        with = "serde_with::rust::double_option"
    )]
    pub icon_path: Option<Option<String>>,
    pub link: Option<InstanceLink>,
}

impl InstallPostInstallEditRequest {
    fn into_core(self) -> Result<InstallPostInstallEdit> {
        Ok(InstallPostInstallEdit {
            name: self.name,
            icon_path: self.icon_path,
            link: self.link.map(|link| link.into_core()).transpose()?,
        })
    }
}

#[tauri::command]
pub async fn install_get_modpack_preview(
    location: CreatePackLocation,
) -> Result<InstallModpackPreview> {
    Ok(
        crafton_core::pack::install_from::get_instance_from_pack(location)
            .await?,
    )
}

#[tauri::command]
pub async fn install_create_instance(
    request: InstallCreateInstanceRequest,
) -> Result<InstallJobSnapshot> {
    Ok(crafton_core::install::create_instance(
        request.name.trim().to_string(),
        request.game_version,
        request.loader,
        request.loader_version,
        request.icon_path,
        request.icon_config,
        match request.link {
            Some(link) => link.into_core()?,
            None => crafton_core::data::InstanceLink::Unmanaged,
        },
    )
    .await?)
}

#[tauri::command]
pub async fn install_create_modpack_instance(
    location: CreatePackLocation,
    post_install_edit: Option<InstallPostInstallEditRequest>,
) -> Result<InstallJobSnapshot> {
    Ok(crafton_core::install::create_modpack_instance(
        location,
        post_install_edit.map(|edit| edit.into_core()).transpose()?,
    )
    .await?)
}

#[tauri::command]
pub async fn install_bulk_update_content(
    instance_id: String,
    updates: Vec<crafton_core::install::ContentUpdateSelection>,
) -> Result<InstallJobSnapshot> {
    Ok(
        crafton_core::install::bulk_update_content(instance_id, updates)
            .await?,
    )
}

#[tauri::command]
pub async fn install_import_instance(
    launcher_type: ImportLauncherType,
    base_path: PathBuf,
    instance_folder: String,
) -> Result<InstallJobSnapshot> {
    Ok(crafton_core::install::import_instance(
        launcher_type,
        base_path,
        instance_folder,
    )
    .await?)
}

#[tauri::command]
pub async fn install_duplicate_instance(
    source_instance_id: String,
) -> Result<InstallJobSnapshot> {
    Ok(crafton_core::install::duplicate_instance(source_instance_id).await?)
}

#[tauri::command]
pub async fn install_existing_instance(
    instance_id: String,
    force: bool,
) -> Result<InstallJobSnapshot> {
    Ok(
        crafton_core::install::install_existing_instance(instance_id, force)
            .await?,
    )
}

#[tauri::command]
pub async fn install_pack_to_existing_instance(
    instance_id: String,
    location: CreatePackLocation,
    post_install_edit: Option<InstallPostInstallEditRequest>,
) -> Result<InstallJobSnapshot> {
    Ok(crafton_core::install::install_pack_to_existing_instance(
        instance_id,
        location,
        post_install_edit.map(|edit| edit.into_core()).transpose()?,
    )
    .await?)
}

#[tauri::command]
pub async fn install_job_list(
    include_finished: bool,
) -> Result<Vec<InstallJobSnapshot>> {
    Ok(crafton_core::install::list_jobs(include_finished).await?)
}

#[tauri::command]
pub async fn install_job_get(job_id: Uuid) -> Result<InstallJobSnapshot> {
    Ok(crafton_core::install::get_job(job_id).await?)
}

#[tauri::command]
pub async fn install_job_retry(job_id: Uuid) -> Result<InstallJobSnapshot> {
    Ok(crafton_core::install::retry_job(job_id).await?)
}

#[tauri::command]
pub async fn install_job_pause(job_id: Uuid) -> Result<InstallJobSnapshot> {
    Ok(crafton_core::install::pause_job(job_id).await?)
}

#[tauri::command]
pub async fn install_job_resume(job_id: Uuid) -> Result<InstallJobSnapshot> {
    Ok(crafton_core::install::resume_job(job_id).await?)
}

#[tauri::command]
pub async fn install_job_cancel(job_id: Uuid) -> Result<InstallJobSnapshot> {
    Ok(crafton_core::install::cancel_job(job_id).await?)
}

#[tauri::command]
pub async fn install_job_dismiss(job_id: Uuid) -> Result<()> {
    Ok(crafton_core::install::dismiss_job(job_id).await?)
}

#[tauri::command]
pub async fn install_job_support_details(job_id: Uuid) -> Result<String> {
    Ok(crafton_core::install::job_support_details(job_id).await?)
}
