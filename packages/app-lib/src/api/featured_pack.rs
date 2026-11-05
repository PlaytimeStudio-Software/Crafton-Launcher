use std::path::PathBuf;

use reqwest::Method;
use serde::{Deserialize, Serialize};

use crate::ErrorKind;
use crate::State;
use crate::util::fetch::{fetch, fetch_json, write};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FeaturedPackRelease {
    pub tag: String,
    pub name: String,
    pub notes: Option<String>,
    pub published_at: Option<String>,
    pub asset_name: String,
    #[serde(skip_serializing)]
    pub asset_url: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FeaturedPackSettings {
    pub memory_mb: Option<u32>,
    #[serde(default)]
    pub java_args: Vec<String>,
}

#[derive(Deserialize)]
struct GithubRelease {
    tag_name: String,
    name: Option<String>,
    body: Option<String>,
    published_at: Option<String>,
    draft: bool,
    assets: Vec<GithubAsset>,
}

#[derive(Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
}

fn validate_repo(repo: &str) -> crate::Result<()> {
    let mut parts = repo.split('/');
    let valid = matches!(
        (parts.next(), parts.next(), parts.next()),
        (Some(owner), Some(name), None)
            if [owner, name].iter().all(|part| {
                !part.is_empty()
                    && part
                        .chars()
                        .all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c))
            })
    );
    if valid {
        Ok(())
    } else {
        Err(ErrorKind::InputError(format!("invalid repository: {repo}")).into())
    }
}

#[tracing::instrument]
pub async fn latest_release(
    repo: &str,
) -> crate::Result<Option<FeaturedPackRelease>> {
    validate_repo(repo)?;
    let state = State::get().await?;
    let releases: Vec<GithubRelease> = fetch_json(
        Method::GET,
        &format!("https://api.github.com/repos/{repo}/releases?per_page=10"),
        None,
        None,
        None,
        &state.fetch_semaphore,
        &state.pool,
    )
    .await?;

    Ok(releases
        .into_iter()
        .filter(|release| !release.draft)
        .find_map(|release| {
            let asset = release
                .assets
                .into_iter()
                .find(|asset| asset.name.ends_with(".mrpack"))?;
            Some(FeaturedPackRelease {
                name: release
                    .name
                    .filter(|name| !name.trim().is_empty())
                    .unwrap_or_else(|| release.tag_name.clone()),
                tag: release.tag_name,
                notes: release.body,
                published_at: release.published_at,
                asset_name: asset.name,
                asset_url: asset.browser_download_url,
            })
        }))
}

#[tracing::instrument]
pub async fn recommended_settings(
    repo: &str,
) -> crate::Result<Option<FeaturedPackSettings>> {
    validate_repo(repo)?;
    let state = State::get().await?;
    let settings = fetch_json::<FeaturedPackSettings>(
        Method::GET,
        &format!(
            "https://raw.githubusercontent.com/{repo}/HEAD/launcher-settings.json"
        ),
        None,
        None,
        None,
        &state.fetch_semaphore,
        &state.pool,
    )
    .await;
    match settings {
        Ok(settings) => Ok(Some(settings)),
        Err(e) => {
            tracing::warn!("No recommended settings for {repo}: {e}");
            Ok(None)
        }
    }
}

#[tracing::instrument]
pub async fn download_latest(
    repo: &str,
) -> crate::Result<(FeaturedPackRelease, PathBuf)> {
    let release = latest_release(repo).await?.ok_or_else(|| {
        ErrorKind::InputError(format!("{repo} has no modpack release"))
    })?;
    let state = State::get().await?;
    let bytes = fetch(
        &release.asset_url,
        None,
        None,
        &state.fetch_semaphore,
        &state.pool,
    )
    .await?;

    let file_name: String = release
        .asset_name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || "-_.".contains(c) {
                c
            } else {
                '_'
            }
        })
        .collect();
    let path = state
        .directories
        .caches_dir()
        .join("featured-pack")
        .join(file_name);
    write(&path, &bytes, &state.io_semaphore).await?;
    Ok((release, path))
}
