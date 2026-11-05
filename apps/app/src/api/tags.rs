use crate::api::Result;
use crafton_core::tags::{Category, DonationPlatform, GameVersion, Loader};

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("tags")
        .invoke_handler(tauri::generate_handler![
            tags_get_categories,
            tags_get_loaders,
            tags_get_game_versions,
            tags_get_donation_platforms,
        ])
        .build()
}

/// Gets cached category tags from the database
#[tauri::command]
pub async fn tags_get_categories() -> Result<Vec<Category>> {
    Ok(crafton_core::tags::get_category_tags().await?)
}

/// Gets cached loader tags from the database
#[tauri::command]
pub async fn tags_get_loaders() -> Result<Vec<Loader>> {
    Ok(crafton_core::tags::get_loader_tags().await?)
}

/// Gets cached game version tags from the database
#[tauri::command]
pub async fn tags_get_game_versions() -> Result<Vec<GameVersion>> {
    Ok(crafton_core::tags::get_game_version_tags().await?)
}

/// Gets cached donation platform tags from the database
#[tauri::command]
pub async fn tags_get_donation_platforms() -> Result<Vec<DonationPlatform>> {
    Ok(crafton_core::tags::get_donation_platform_tags().await?)
}
