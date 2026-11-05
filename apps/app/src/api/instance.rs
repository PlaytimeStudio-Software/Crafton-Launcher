use crate::api::Result;
use crafton_core::data::{
    AppliedContentSetPatch, ContentItem, Dependency,
    EditInstance as CoreEditInstance, InstanceInstallCandidate,
    InstanceInstallTarget, InstanceLaunchOverridesPatch,
    InstanceLink as CoreInstanceLink, InstanceMetadata, InstanceTabVisibility,
    LinkedModpackInfo,
};
use crafton_core::instance::InstallProjectWithDependenciesRequest;
use crafton_core::instance::QuickPlayType;
use crafton_core::prelude::*;
use crafton_core::server_address::ServerAddress;
use dashmap::DashMap;
use path_util::SafeRelativeUtf8UnixPathBuf;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_fs::FsExt;
use tauri_plugin_opener::OpenerExt;

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("instance")
        .invoke_handler(tauri::generate_handler![
            instance_remove,
            instance_get,
            instance_get_many,
            instance_list,
            instance_list_groups,
            instance_create_group,
            instance_rename_group,
            instance_delete_group,
            instance_set_group_order,
            instance_set_group_memberships,
            instance_get_projects,
            instance_get_installed_project_ids,
            instance_get_install_candidates,
            instance_content,
            instance_get_content_items,
            instance_sync_content_files,
            instance_refresh_content_updates,
            instance_get_dependencies_as_content_items,
            instance_get_linked_modpack_info,
            instance_get_linked_modpack_content,
            instance_get_optimal_jre_key,
            instance_get_full_path,
            instance_get_mod_full_path,
            instance_list_screenshots,
            instance_list_all_screenshots,
            instance_list_synced_screenshots,
            instance_save_edited_screenshot,
            instance_list_screenshot_groups,
            instance_create_screenshot_group,
            instance_rename_screenshot_group,
            instance_delete_screenshot_group,
            instance_set_screenshot_group_memberships,
            instance_import_screenshot_groups,
            instance_delete_screenshots,
            instance_export_screenshots,
            instance_move_screenshots,
            instance_open_screenshot,
            instance_set_synced_option,
            instance_get_synced_option_join_preview,
            instance_get_synced_options_overview,
            instance_get_global_synced_options,
            instance_get_initialized_synced_options,
            instance_set_global_synced_option,
            instance_list_game_options_sync_sources,
            instance_get_synced_game_options_config,
            instance_get_game_setting_locale_labels,
            instance_preview_synced_game_option_changes,
            instance_save_synced_game_option_changes,
            instance_get_local_game_options_config,
            instance_preview_local_game_option_changes,
            instance_save_local_game_option_changes,
            instance_get_command_history,
            instance_set_command_history,
            instance_open_synced_options_folder,
            instance_list_synced_servers,
            instance_update_synced_server,
            instance_remove_synced_server,
            instance_get_pack_sync_preview,
            instance_sync_pack,
            instance_desync_pack,
            instance_list_synced_packs,
            instance_upload_synced_pack,
            instance_set_synced_pack_enabled,
            instance_remove_synced_pack,
            instance_rebuild_synced_options,
            instance_check_installed,
            instance_update_project,
            instance_add_project_from_version,
            instance_install_project_with_dependencies,
            instance_switch_project_version_with_dependencies,
            instance_add_project_from_path,
            instance_is_file_on_content_api,
            instance_toggle_disable_project,
            instance_set_project_locked,
            instance_remove_project,
            instance_update_managed_pack_version,
            instance_repair_managed_pack,
            instance_run,
            instance_kill,
            instance_edit,
            instance_edit_icon,
            instance_cache_icon,
            instance_edit_generated_icon,
            instance_cache_generated_icon,
            instance_get_recent_icon_configs,
            instance_get_hidden_ids,
            instance_set_hidden,
            instance_export_mrpack,
            instance_get_pack_export_candidates,
        ])
        .build()
}

#[derive(Serialize, Debug, Clone)]
pub struct Instance {
    pub id: String,
    pub path: String,
    pub install_stage: String,
    pub launcher_feature_version: String,
    pub name: String,
    pub icon_path: Option<String>,
    pub icon_config: Option<crafton_core::data::IconConfig>,
    pub game_version: String,
    pub protocol_version: Option<u32>,
    pub loader: ModLoader,
    pub loader_version: Option<String>,
    pub group_ids: Vec<String>,
    pub synced_options: InstanceSyncedOptions,
    pub link: Option<InstanceLink>,
    pub quarantined: bool,
    pub update_channel: ReleaseChannel,
    pub created: chrono::DateTime<chrono::Utc>,
    pub modified: chrono::DateTime<chrono::Utc>,
    pub last_played: Option<chrono::DateTime<chrono::Utc>>,
    pub submitted_time_played: u64,
    pub recent_time_played: u64,
    pub java_path: Option<String>,
    pub extra_launch_args: Option<Vec<String>>,
    pub custom_env_vars: Option<Vec<(String, String)>>,
    pub memory: Option<MemorySettings>,
    pub force_fullscreen: Option<bool>,
    pub game_resolution: Option<WindowSize>,
    pub hooks: Hooks,
    pub visible_tabs: InstanceTabVisibility,
}

#[derive(Serialize, Debug, Clone)]
pub struct InstanceScreenshot {
    pub id: String,
    pub instance_id: String,
    pub instance_name: String,
    pub file_name: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub modified_at: i64,
    pub group_id: Option<String>,
    pub path: PathBuf,
    pub url: url::Url,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum InstanceLink {
    PackModpack {
        project_id: String,
        version_id: String,
    },
    ImportedModpack {
        project_id: Option<String>,
        version_id: Option<String>,
        name: Option<String>,
        version_number: Option<String>,
        filename: Option<String>,
    },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EditInstance {
    pub name: Option<String>,

    pub game_version: Option<String>,
    pub loader: Option<ModLoader>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        with = "serde_with::rust::double_option"
    )]
    pub loader_version: Option<Option<String>>,

    pub group_ids: Option<Vec<String>>,

    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        with = "serde_with::rust::double_option"
    )]
    pub link: Option<Option<InstanceLink>>,
    pub update_channel: Option<ReleaseChannel>,

    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        with = "serde_with::rust::double_option"
    )]
    pub java_path: Option<Option<String>>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        with = "serde_with::rust::double_option"
    )]
    pub extra_launch_args: Option<Option<Vec<String>>>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        with = "serde_with::rust::double_option"
    )]
    pub custom_env_vars: Option<Option<Vec<(String, String)>>>,

    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        with = "serde_with::rust::double_option"
    )]
    pub memory: Option<Option<MemorySettings>>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        with = "serde_with::rust::double_option"
    )]
    pub force_fullscreen: Option<Option<bool>>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        with = "serde_with::rust::double_option"
    )]
    pub game_resolution: Option<Option<WindowSize>>,
    pub hooks: Option<Hooks>,
    pub visible_tabs: Option<InstanceTabVisibility>,
}

impl From<InstanceMetadata> for Instance {
    fn from(metadata: InstanceMetadata) -> Self {
        Self {
            id: metadata.instance.id,
            path: metadata.instance.path,
            install_stage: metadata.instance.install_stage.as_str().to_string(),
            launcher_feature_version: metadata
                .instance
                .launcher_feature_version
                .as_str()
                .to_string(),
            name: metadata.instance.name,
            icon_path: metadata.instance.icon_path,
            icon_config: metadata.icon_config,
            game_version: metadata.applied_content_set.game_version,
            protocol_version: metadata.applied_content_set.protocol_version,
            loader: metadata.applied_content_set.loader,
            loader_version: metadata.applied_content_set.loader_version,
            group_ids: metadata.group_ids,
            synced_options: metadata.synced_options,
            link: InstanceLink::from_core(metadata.link),
            quarantined: metadata.quarantined,
            update_channel: metadata.instance.update_channel,
            created: metadata.instance.created,
            modified: metadata.instance.modified,
            last_played: metadata.instance.last_played,
            submitted_time_played: metadata.instance.submitted_time_played,
            recent_time_played: metadata.instance.recent_time_played,
            java_path: metadata.launch_overrides.java_path,
            extra_launch_args: metadata.launch_overrides.extra_launch_args,
            custom_env_vars: metadata.launch_overrides.custom_env_vars,
            memory: metadata.launch_overrides.memory,
            force_fullscreen: metadata.launch_overrides.force_fullscreen,
            game_resolution: metadata.launch_overrides.game_resolution,
            hooks: metadata.launch_overrides.hooks,
            visible_tabs: metadata.launch_overrides.visible_tabs,
        }
    }
}

impl InstanceLink {
    fn from_core(link: CoreInstanceLink) -> Option<Self> {
        match link {
            CoreInstanceLink::Unmanaged
            | CoreInstanceLink::ServerProject { .. }
            | CoreInstanceLink::ServerProjectModpack { .. }
            | CoreInstanceLink::HostedServer { .. }
            | CoreInstanceLink::SharedInstance { .. } => None,
            CoreInstanceLink::PackModpack {
                project_id,
                version_id,
            } => Some(Self::PackModpack {
                project_id,
                version_id,
            }),
            CoreInstanceLink::ImportedModpack {
                project_id,
                version_id,
                name,
                version_number,
                filename,
            } => Some(Self::ImportedModpack {
                project_id,
                version_id,
                name,
                version_number,
                filename,
            }),
        }
    }

    pub(crate) fn into_core(self) -> Result<CoreInstanceLink> {
        match self {
            Self::PackModpack {
                project_id,
                version_id,
            } => Ok(CoreInstanceLink::PackModpack {
                project_id,
                version_id,
            }),
            Self::ImportedModpack {
                project_id,
                version_id,
                name,
                version_number,
                filename,
            } => Ok(CoreInstanceLink::ImportedModpack {
                project_id,
                version_id,
                name,
                version_number,
                filename,
            }),
        }
    }
}

fn edit_to_core(edit_instance: EditInstance) -> Result<CoreEditInstance> {
    Ok(CoreEditInstance {
        install_stage: None,
        launcher_feature_version: None,
        name: edit_instance.name,
        icon_path: None,
        icon_config: None,
        update_channel: edit_instance.update_channel,
        group_ids: edit_instance.group_ids,
        link: edit_instance
            .link
            .map(|link| match link {
                Some(link) => link.into_core(),
                None => Ok(CoreInstanceLink::Unmanaged),
            })
            .transpose()?,
        launch_overrides: Some(InstanceLaunchOverridesPatch {
            java_path: edit_instance.java_path,
            extra_launch_args: edit_instance.extra_launch_args,
            custom_env_vars: edit_instance.custom_env_vars,
            memory: edit_instance.memory,
            force_fullscreen: edit_instance.force_fullscreen,
            game_resolution: edit_instance.game_resolution,
            hooks: edit_instance.hooks,
            visible_tabs: edit_instance.visible_tabs,
        }),
        content_set_patch: Some(AppliedContentSetPatch {
            source_kind: None,
            game_version: edit_instance.game_version,
            protocol_version: Some(None),
            loader: edit_instance.loader,
            loader_version: edit_instance.loader_version,
        }),
        last_played: None,
        submitted_time_played: None,
        recent_time_played: None,
    })
}

#[tauri::command]
pub async fn instance_remove(instance_id: &str) -> Result<()> {
    crafton_core::instance::remove(instance_id).await?;
    Ok(())
}

#[tauri::command]
pub async fn instance_get(instance_id: &str) -> Result<Option<Instance>> {
    Ok(crafton_core::instance::get(instance_id)
        .await?
        .map(Instance::from))
}

#[tauri::command]
pub async fn instance_get_many(
    instance_ids: Vec<String>,
) -> Result<Vec<Instance>> {
    let ids = instance_ids.iter().map(|x| &**x).collect::<Vec<&str>>();
    Ok(crafton_core::instance::get_many(&ids)
        .await?
        .into_iter()
        .map(Instance::from)
        .collect())
}

#[tauri::command]
pub async fn instance_list() -> Result<Vec<Instance>> {
    Ok(crafton_core::instance::list()
        .await?
        .into_iter()
        .map(Instance::from)
        .collect())
}

#[tauri::command]
pub async fn instance_list_groups()
-> Result<Vec<crafton_core::instance::InstanceGroup>> {
    Ok(crafton_core::instance::list_groups().await?)
}

#[tauri::command]
pub async fn instance_create_group(
    name: String,
) -> Result<crafton_core::instance::InstanceGroup> {
    Ok(crafton_core::instance::create_group(name).await?)
}

#[tauri::command]
pub async fn instance_rename_group(
    id: String,
    new_name: String,
) -> Result<crafton_core::instance::InstanceGroup> {
    Ok(crafton_core::instance::rename_group(id, new_name).await?)
}

#[tauri::command]
pub async fn instance_delete_group(id: String) -> Result<()> {
    Ok(crafton_core::instance::delete_group(id).await?)
}

#[tauri::command]
pub async fn instance_set_group_order(group_ids: Vec<String>) -> Result<()> {
    Ok(crafton_core::instance::set_group_order(group_ids).await?)
}

#[tauri::command]
pub async fn instance_set_group_memberships(
    updates: Vec<crafton_core::instance::InstanceGroupMembershipUpdate>,
) -> Result<()> {
    Ok(crafton_core::instance::set_group_memberships(updates).await?)
}

#[tauri::command]
pub async fn instance_get_projects(
    instance_id: &str,
    cache_behaviour: Option<CacheBehaviour>,
) -> Result<DashMap<String, ContentFile>> {
    Ok(
        crafton_core::instance::get_projects(instance_id, cache_behaviour)
            .await?,
    )
}

#[tauri::command]
pub async fn instance_get_installed_project_ids(
    instance_id: &str,
) -> Result<Vec<String>> {
    Ok(crafton_core::instance::get_installed_project_ids(instance_id).await?)
}

#[tauri::command]
pub async fn instance_get_install_candidates(
    project_id: &str,
    project_type: ProjectType,
    targets: Vec<InstanceInstallTarget>,
) -> Result<Vec<InstanceInstallCandidate>> {
    Ok(crafton_core::instance::get_install_candidates(
        project_id,
        project_type,
        targets,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_content(
    instance_id: &str,
    cache_behaviour: Option<CacheBehaviour>,
) -> Result<Vec<ContentItem>> {
    instance_get_content_items(instance_id, cache_behaviour).await
}

#[tauri::command]
pub async fn instance_get_content_items(
    instance_id: &str,
    cache_behaviour: Option<CacheBehaviour>,
) -> Result<Vec<ContentItem>> {
    Ok(
        crafton_core::instance::get_content_items(instance_id, cache_behaviour)
            .await?,
    )
}

#[tauri::command]
pub async fn instance_sync_content_files(instance_id: &str) -> Result<()> {
    crafton_core::instance::sync_content_files(instance_id).await?;
    Ok(())
}

#[tauri::command]
pub async fn instance_refresh_content_updates(instance_id: &str) -> Result<()> {
    Ok(crafton_core::instance::refresh_content_updates(instance_id).await?)
}

#[tauri::command]
pub async fn instance_get_dependencies_as_content_items(
    dependencies: Vec<Dependency>,
    cache_behaviour: Option<CacheBehaviour>,
) -> Result<Vec<ContentItem>> {
    Ok(crafton_core::instance::get_dependencies_as_content_items(
        dependencies,
        cache_behaviour,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_get_linked_modpack_info(
    instance_id: &str,
    cache_behaviour: Option<CacheBehaviour>,
) -> Result<Option<LinkedModpackInfo>> {
    Ok(crafton_core::instance::get_linked_modpack_info(
        instance_id,
        cache_behaviour,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_get_linked_modpack_content(
    instance_id: &str,
    cache_behaviour: Option<CacheBehaviour>,
) -> Result<Vec<ContentItem>> {
    Ok(crafton_core::instance::get_linked_modpack_content(
        instance_id,
        cache_behaviour,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_get_full_path(instance_id: &str) -> Result<PathBuf> {
    Ok(crafton_core::instance::get_full_path(instance_id).await?)
}

#[tauri::command]
pub async fn instance_get_mod_full_path(
    instance_id: &str,
    project_path: &str,
) -> Result<PathBuf> {
    Ok(
        crafton_core::instance::get_mod_full_path(instance_id, project_path)
            .await?,
    )
}

#[tauri::command]
pub async fn instance_list_screenshots<R: Runtime>(
    app_handle: AppHandle<R>,
    instance_id: &str,
) -> Result<Vec<InstanceScreenshot>> {
    let screenshots =
        crafton_core::instance::list_screenshots(instance_id).await?;
    serialize_screenshots(&app_handle, screenshots)
}

#[tauri::command]
pub async fn instance_list_all_screenshots<R: Runtime>(
    app_handle: AppHandle<R>,
) -> Result<Vec<InstanceScreenshot>> {
    let screenshots = crafton_core::instance::list_all_screenshots().await?;
    serialize_screenshots(&app_handle, screenshots)
}

#[tauri::command]
pub async fn instance_list_synced_screenshots<R: Runtime>(
    app_handle: AppHandle<R>,
) -> Result<Vec<InstanceScreenshot>> {
    let screenshots = crafton_core::instance::list_synced_screenshots().await?;
    serialize_screenshots(&app_handle, screenshots)
}

#[tauri::command]
pub async fn instance_save_edited_screenshot<R: Runtime>(
    app_handle: AppHandle<R>,
    key: crafton_core::instance::ScreenshotKey,
    png_bytes: Vec<u8>,
    mode: crafton_core::instance::ScreenshotEditSaveMode,
) -> Result<InstanceScreenshot> {
    let screenshot =
        crafton_core::instance::save_edited_screenshot(key, png_bytes, mode)
            .await?;
    serialize_screenshot(&app_handle, screenshot)
}

#[tauri::command]
pub async fn instance_list_screenshot_groups()
-> Result<Vec<crafton_core::instance::ScreenshotGroup>> {
    Ok(crafton_core::instance::list_screenshot_groups().await?)
}

#[tauri::command]
pub async fn instance_create_screenshot_group(
    name: String,
    screenshot_ids: Vec<String>,
) -> Result<crafton_core::instance::ScreenshotGroup> {
    Ok(
        crafton_core::instance::create_screenshot_group(name, screenshot_ids)
            .await?,
    )
}

#[tauri::command]
pub async fn instance_rename_screenshot_group(
    id: String,
    new_name: String,
) -> Result<crafton_core::instance::ScreenshotGroup> {
    Ok(crafton_core::instance::rename_screenshot_group(id, new_name).await?)
}

#[tauri::command]
pub async fn instance_delete_screenshot_group(id: String) -> Result<()> {
    Ok(crafton_core::instance::delete_screenshot_group(id).await?)
}

#[tauri::command]
pub async fn instance_set_screenshot_group_memberships(
    updates: Vec<crafton_core::instance::ScreenshotGroupMembershipUpdate>,
) -> Result<()> {
    Ok(
        crafton_core::instance::set_screenshot_group_memberships(updates)
            .await?,
    )
}

#[tauri::command]
pub async fn instance_import_screenshot_groups(
    groups: Vec<crafton_core::instance::ScreenshotGroupImport>,
) -> Result<()> {
    Ok(crafton_core::instance::import_screenshot_groups(groups).await?)
}

#[tauri::command]
pub async fn instance_delete_screenshots(
    keys: Vec<crafton_core::instance::ScreenshotKey>,
) -> Result<()> {
    Ok(crafton_core::instance::delete_screenshots(&keys).await?)
}

#[tauri::command]
pub async fn instance_export_screenshots(
    keys: Vec<crafton_core::instance::ScreenshotKey>,
    export_path: PathBuf,
) -> Result<()> {
    Ok(crafton_core::instance::export_screenshots(&keys, export_path).await?)
}

#[tauri::command]
pub async fn instance_move_screenshots(
    keys: Vec<crafton_core::instance::ScreenshotKey>,
    target_instance_id: &str,
) -> Result<Vec<crafton_core::instance::ScreenshotKey>> {
    Ok(
        crafton_core::instance::move_screenshots(&keys, target_instance_id)
            .await?,
    )
}

#[tauri::command]
pub async fn instance_open_screenshot<R: Runtime>(
    app_handle: AppHandle<R>,
    key: crafton_core::instance::ScreenshotKey,
) -> Result<()> {
    let path = crafton_core::instance::get_screenshot_path(&key).await?;
    app_handle
        .opener()
        .reveal_item_in_dir(path)
        .map_err(|error| std::io::Error::other(error.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn instance_set_synced_option(
    instance_id: &str,
    option: InstanceSyncedOption,
    enabled: bool,
    resolution: Option<crafton_core::instance::SyncedOptionJoinResolution>,
) -> Result<Instance> {
    Ok(Instance::from(
        crafton_core::instance::set_synced_option(
            instance_id,
            option,
            enabled,
            resolution,
        )
        .await?,
    ))
}

#[tauri::command]
pub async fn instance_get_synced_option_join_preview(
    instance_id: &str,
    option: InstanceSyncedOption,
) -> Result<crafton_core::instance::SyncedOptionJoinPreview> {
    Ok(crafton_core::instance::get_synced_option_join_preview(
        instance_id,
        option,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_get_synced_options_overview(
    instance_id: &str,
) -> Result<crafton_core::instance::SyncedOptionsOverview> {
    Ok(
        crafton_core::instance::get_synced_options_overview(instance_id)
            .await?,
    )
}

#[tauri::command]
pub async fn instance_get_global_synced_options()
-> Result<crafton_core::instance::GlobalSyncedOptions> {
    Ok(crafton_core::instance::get_global_synced_options().await?)
}

#[tauri::command]
pub async fn instance_get_initialized_synced_options()
-> Result<crafton_core::instance::GlobalSyncedOptions> {
    Ok(crafton_core::instance::get_initialized_synced_options().await?)
}

#[tauri::command]
pub async fn instance_set_global_synced_option(
    option: InstanceSyncedOption,
    enabled: bool,
    base_instance_id: Option<String>,
) -> Result<crafton_core::instance::GlobalSyncedOptions> {
    Ok(crafton_core::instance::set_global_synced_option(
        option,
        enabled,
        base_instance_id.as_deref(),
    )
    .await?)
}

#[tauri::command]
pub async fn instance_list_game_options_sync_sources()
-> Result<Vec<crafton_core::instance::GameOptionsSourceCandidate>> {
    Ok(crafton_core::instance::list_game_options_sync_sources().await?)
}

#[tauri::command]
pub async fn instance_get_synced_game_options_config()
-> Result<crafton_core::instance::GameSettingsEditorState> {
    Ok(crafton_core::instance::get_synced_game_options_config().await?)
}

#[tauri::command]
pub async fn instance_get_game_setting_locale_labels(
    instance_id: Option<String>,
    locale: String,
    option_ids: Vec<String>,
    refresh_sources: bool,
) -> Result<crafton_core::instance::GameSettingLocaleLabels> {
    Ok(crafton_core::instance::get_game_setting_locale_labels(
        instance_id.as_deref(),
        &locale,
        option_ids,
        refresh_sources,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_preview_synced_game_option_changes(
    request: crafton_core::instance::UpdateGameSettingsRequest,
) -> Result<crafton_core::instance::GameSettingsEditorState> {
    Ok(
        crafton_core::instance::preview_synced_game_option_changes(request)
            .await?,
    )
}

#[tauri::command]
pub async fn instance_save_synced_game_option_changes(
    request: crafton_core::instance::UpdateGameSettingsRequest,
) -> Result<crafton_core::instance::SaveGameSettingsResult> {
    Ok(
        crafton_core::instance::save_synced_game_option_changes(request)
            .await?,
    )
}

#[tauri::command]
pub async fn instance_get_local_game_options_config(
    instance_id: &str,
) -> Result<crafton_core::instance::GameSettingsEditorState> {
    Ok(
        crafton_core::instance::get_local_game_options_config(instance_id)
            .await?,
    )
}

#[tauri::command]
pub async fn instance_preview_local_game_option_changes(
    instance_id: &str,
    request: crafton_core::instance::UpdateGameSettingsRequest,
) -> Result<crafton_core::instance::GameSettingsEditorState> {
    Ok(crafton_core::instance::preview_local_game_option_changes(
        instance_id,
        request,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_save_local_game_option_changes(
    instance_id: &str,
    request: crafton_core::instance::UpdateGameSettingsRequest,
) -> Result<crafton_core::instance::SaveGameSettingsResult> {
    Ok(crafton_core::instance::save_local_game_option_changes(
        instance_id,
        request,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_get_command_history() -> Result<String> {
    Ok(crafton_core::instance::get_command_history().await?)
}

#[tauri::command]
pub async fn instance_set_command_history(contents: &str) -> Result<String> {
    Ok(crafton_core::instance::set_command_history(contents).await?)
}

#[tauri::command]
pub async fn instance_open_synced_options_folder<R: Runtime>(
    app_handle: AppHandle<R>,
) -> Result<()> {
    let path = crafton_core::instance::get_synced_options_folder().await?;
    app_handle
        .opener()
        .open_path(path.to_string_lossy(), None::<&str>)
        .map_err(|error| std::io::Error::other(error.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn instance_list_synced_servers()
-> Result<Vec<crafton_core::instance::SyncedServer>> {
    Ok(crafton_core::instance::list_synced_servers().await?)
}

#[tauri::command]
pub async fn instance_update_synced_server(
    server: crafton_core::instance::SyncedServer,
) -> Result<()> {
    Ok(crafton_core::instance::update_synced_server(server).await?)
}

#[tauri::command]
pub async fn instance_remove_synced_server(server_id: &str) -> Result<()> {
    Ok(crafton_core::instance::remove_synced_server(server_id).await?)
}

#[tauri::command]
pub async fn instance_get_pack_sync_preview(
    instance_id: &str,
    project_path: &str,
) -> Result<crafton_core::instance::PackSyncPreview> {
    Ok(
        crafton_core::instance::get_pack_sync_preview(
            instance_id,
            project_path,
        )
        .await?,
    )
}

#[tauri::command]
pub async fn instance_sync_pack(
    instance_id: &str,
    project_path: &str,
) -> Result<()> {
    Ok(crafton_core::instance::sync_pack(instance_id, project_path).await?)
}

#[tauri::command]
pub async fn instance_desync_pack(
    instance_id: &str,
    pack_id: &str,
    mode: crafton_core::instance::DesyncServerMode,
) -> Result<()> {
    Ok(crafton_core::instance::desync_pack(instance_id, pack_id, mode).await?)
}

#[tauri::command]
pub async fn instance_list_synced_packs(
    project_type: ProjectType,
) -> Result<Vec<ContentItem>> {
    Ok(crafton_core::instance::list_synced_packs(project_type).await?)
}

#[tauri::command]
pub async fn instance_upload_synced_pack(
    path: &Path,
    project_type: ProjectType,
    game_versions: Vec<String>,
) -> Result<()> {
    Ok(crafton_core::instance::upload_synced_pack(
        path,
        project_type,
        game_versions,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_set_synced_pack_enabled(
    pack_id: &str,
    enabled: bool,
) -> Result<()> {
    Ok(
        crafton_core::instance::set_synced_pack_enabled(pack_id, enabled)
            .await?,
    )
}

#[tauri::command]
pub async fn instance_remove_synced_pack(pack_id: &str) -> Result<()> {
    Ok(crafton_core::instance::remove_synced_pack(pack_id).await?)
}

#[tauri::command]
pub async fn instance_rebuild_synced_options(
    instance_id: Option<&str>,
) -> Result<()> {
    if let Some(instance_id) = instance_id {
        crafton_core::instance::reconcile_instance_synced_options(instance_id)
            .await?;
    } else {
        crafton_core::instance::reconcile_all_synced_options().await?;
    }
    Ok(())
}

fn serialize_screenshots<R: Runtime>(
    app_handle: &AppHandle<R>,
    screenshots: Vec<crafton_core::instance::InstanceScreenshot>,
) -> Result<Vec<InstanceScreenshot>> {
    let screenshot_directories = screenshots
        .iter()
        .filter_map(|screenshot| screenshot.path.parent())
        .collect::<HashSet<_>>();
    for directory in screenshot_directories {
        app_handle
            .asset_protocol_scope()
            .allow_directory(directory, false)
            .map_err(|error| std::io::Error::other(error.to_string()))?;
        app_handle
            .fs_scope()
            .allow_directory(directory, false)
            .map_err(|error| std::io::Error::other(error.to_string()))?;
    }

    screenshots
        .into_iter()
        .map(serialize_screenshot_data)
        .collect()
}

fn serialize_screenshot<R: Runtime>(
    app_handle: &AppHandle<R>,
    screenshot: crafton_core::instance::InstanceScreenshot,
) -> Result<InstanceScreenshot> {
    app_handle
        .asset_protocol_scope()
        .allow_file(&screenshot.path)
        .map_err(|error| std::io::Error::other(error.to_string()))?;
    app_handle
        .fs_scope()
        .allow_file(&screenshot.path)
        .map_err(|error| std::io::Error::other(error.to_string()))?;
    serialize_screenshot_data(screenshot)
}

fn serialize_screenshot_data(
    screenshot: crafton_core::instance::InstanceScreenshot,
) -> Result<InstanceScreenshot> {
    let mut url = super::utils::tauri_convert_file_src(&screenshot.path)?;
    url.query_pairs_mut()
        .append_pair("revision", &screenshot.modified_at.to_string());

    Ok(InstanceScreenshot {
        id: screenshot.id,
        instance_id: screenshot.instance_id,
        instance_name: screenshot.instance_name,
        file_name: screenshot.file_name,
        created_at: screenshot.created_at,
        modified_at: screenshot.modified_at,
        group_id: screenshot.group_id,
        path: screenshot.path,
        url,
    })
}

#[tauri::command]
pub async fn instance_get_optimal_jre_key(
    instance_id: &str,
) -> Result<Option<JavaVersion>> {
    Ok(crafton_core::instance::get_optimal_jre_key(instance_id).await?)
}

#[tauri::command]
pub async fn instance_check_installed(
    instance_id: &str,
    project_id: &str,
) -> Result<bool> {
    let check_project_id = project_id;

    if let Ok(projects) =
        crafton_core::instance::get_projects(instance_id, None).await
    {
        Ok(projects.into_iter().any(|(_, project)| {
            project
                .metadata
                .as_ref()
                .is_some_and(|metadata| check_project_id == metadata.project_id)
        }))
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn instance_update_project(
    instance_id: &str,
    project_path: &str,
) -> Result<String> {
    Ok(
        crafton_core::instance::update_project(instance_id, project_path, None)
            .await?,
    )
}

#[tauri::command]
pub async fn instance_add_project_from_version(
    instance_id: &str,
    version_id: &str,
) -> Result<String> {
    Ok(crafton_core::instance::add_project_from_version(
        instance_id,
        version_id,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_install_project_with_dependencies(
    instance_id: &str,
    request: InstallProjectWithDependenciesRequest,
) -> Result<ResolveContentPlan> {
    Ok(crafton_core::instance::install_project_with_dependencies(
        instance_id,
        request,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_switch_project_version_with_dependencies(
    instance_id: &str,
    project_path: &str,
    version_id: &str,
) -> Result<String> {
    Ok(
        crafton_core::instance::switch_project_version_with_dependencies(
            instance_id,
            project_path,
            version_id,
        )
        .await?,
    )
}

#[tauri::command]
pub async fn instance_add_project_from_path(
    instance_id: &str,
    project_path: &Path,
    project_type: Option<ProjectType>,
) -> Result<String> {
    Ok(crafton_core::instance::add_project_from_path(
        instance_id,
        project_path,
        project_type,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_is_file_on_content_api(
    project_path: &Path,
) -> Result<bool> {
    Ok(crafton_core::instance::is_file_on_content_api(project_path).await?)
}

#[tauri::command]
pub async fn instance_toggle_disable_project(
    instance_id: &str,
    project_path: &str,
    desired_enabled: Option<bool>,
) -> Result<String> {
    Ok(crafton_core::instance::toggle_disable_project(
        instance_id,
        project_path,
        desired_enabled,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_set_project_locked(
    instance_id: &str,
    project_path: &str,
    locked: bool,
) -> Result<()> {
    crafton_core::instance::set_project_locked(
        instance_id,
        project_path,
        locked,
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn instance_remove_project(
    instance_id: &str,
    project_path: &str,
) -> Result<()> {
    crafton_core::instance::remove_project(instance_id, project_path).await?;
    Ok(())
}

#[tauri::command]
pub async fn instance_update_managed_pack_version(
    instance_id: String,
    version_id: String,
) -> Result<crafton_core::install::InstallJobSnapshot> {
    Ok(crafton_core::instance::update_managed_pack_version(
        &instance_id,
        &version_id,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_repair_managed_pack(
    instance_id: &str,
) -> Result<crafton_core::install::InstallJobSnapshot> {
    Ok(crafton_core::instance::repair_managed_pack(instance_id).await?)
}

#[tauri::command]
pub async fn instance_export_mrpack(
    instance_id: &str,
    export_location: PathBuf,
    included_overrides: Vec<String>,
    excluded_overrides: Vec<String>,
    version_id: Option<String>,
    description: Option<String>,
    name: Option<String>,
) -> Result<()> {
    crafton_core::instance::export_mrpack(
        instance_id,
        export_location,
        included_overrides,
        excluded_overrides,
        version_id,
        description,
        name,
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn instance_get_pack_export_candidates(
    instance_id: &str,
    parent: Option<SafeRelativeUtf8UnixPathBuf>,
) -> Result<Vec<crafton_core::instance::PackExportCandidate>> {
    Ok(
        crafton_core::instance::get_pack_export_candidates_for_parent(
            instance_id,
            parent,
        )
        .await?,
    )
}

#[tauri::command]
pub async fn instance_run(
    instance_id: &str,
    server_address: Option<String>,
) -> Result<ProcessMetadata> {
    let quick_play = match server_address {
        Some(addr) => QuickPlayType::Server(ServerAddress::Unresolved(addr)),
        None => QuickPlayType::None,
    };
    Ok(crafton_core::instance::run(instance_id, quick_play).await?)
}

#[tauri::command]
pub async fn instance_kill(instance_id: &str) -> Result<()> {
    crafton_core::instance::kill(instance_id).await?;
    Ok(())
}

#[tauri::command]
pub async fn instance_edit(
    instance_id: &str,
    edit_instance: EditInstance,
) -> Result<()> {
    crafton_core::instance::edit(instance_id, edit_to_core(edit_instance)?)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn instance_edit_icon(
    instance_id: &str,
    icon_path: Option<&Path>,
) -> Result<()> {
    crafton_core::instance::edit_icon(instance_id, icon_path).await?;
    Ok(())
}

#[tauri::command]
pub async fn instance_cache_icon(icon_bytes: Vec<u8>) -> Result<String> {
    Ok(crafton_core::instance::cache_icon_bytes(icon_bytes).await?)
}

#[tauri::command]
pub async fn instance_edit_generated_icon(
    instance_id: &str,
    config: crafton_core::data::IconConfig,
    symbol_bytes: Vec<u8>,
    only_if_empty: Option<bool>,
) -> Result<Option<String>> {
    if only_if_empty.unwrap_or(false) {
        return Ok(crafton_core::instance::edit_generated_icon_if_empty(
            instance_id,
            config,
            symbol_bytes,
        )
        .await?);
    }

    Ok(Some(
        crafton_core::instance::edit_generated_icon(
            instance_id,
            config,
            symbol_bytes,
        )
        .await?,
    ))
}

#[tauri::command]
pub async fn instance_cache_generated_icon(
    config: crafton_core::data::IconConfig,
    symbol_bytes: Vec<u8>,
    add_to_recents: bool,
) -> Result<String> {
    Ok(crafton_core::instance::cache_generated_icon(
        config,
        symbol_bytes,
        add_to_recents,
    )
    .await?)
}

#[tauri::command]
pub async fn instance_get_recent_icon_configs()
-> Result<Vec<crafton_core::data::IconConfig>> {
    Ok(crafton_core::instance::get_recent_icon_configs().await?)
}

#[tauri::command]
pub async fn instance_get_hidden_ids() -> Result<Vec<String>> {
    Ok(crafton_core::instance::get_hidden_instance_ids().await?)
}

#[tauri::command]
pub async fn instance_set_hidden(
    instance_id: &str,
    hidden: bool,
) -> Result<()> {
    crafton_core::instance::set_instance_hidden(instance_id, hidden).await?;
    Ok(())
}
