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

#[derive(Deserialize)]
struct PackIndex {
    files: Vec<PackIndexFile>,
}

#[derive(Deserialize)]
struct PackIndexFile {
    path: String,
    #[serde(default)]
    env: Option<PackIndexEnv>,
}

#[derive(Deserialize)]
struct PackIndexEnv {
    client: Option<String>,
}

const TRACKED_DIR: &str = "mods/";

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

fn input_error(e: impl std::fmt::Display) -> crate::Error {
    ErrorKind::InputError(e.to_string()).into()
}

fn is_tracked_file(path: &str) -> bool {
    path.starts_with(TRACKED_DIR)
        && path.len() > TRACKED_DIR.len()
        && !path[TRACKED_DIR.len()..].contains('/')
        && !path.contains("..")
        && !path.contains('\u{5c}')
}

#[tracing::instrument]
pub async fn pack_mod_files(path: PathBuf) -> crate::Result<Vec<String>> {
    tokio::task::spawn_blocking(move || -> crate::Result<Vec<String>> {
        let file = std::fs::File::open(&path).map_err(input_error)?;
        let mut archive = zip::ZipArchive::new(file).map_err(input_error)?;
        let mut files = std::collections::BTreeSet::new();
        {
            let index_file = archive
                .by_name("modrinth.index.json")
                .map_err(input_error)?;
            let index: PackIndex =
                serde_json::from_reader(index_file).map_err(input_error)?;
            for file in index.files {
                let client = file.env.and_then(|env| env.client);
                if client.as_deref() != Some("unsupported") {
                    files.insert(file.path);
                }
            }
        }
        for i in 0..archive.len() {
            let entry = archive.by_index(i).map_err(input_error)?;
            let name = entry.name().map_err(input_error)?;
            if let Some(rest) = name
                .strip_prefix("overrides/")
                .or_else(|| name.strip_prefix("client-overrides/"))
                && !rest.ends_with('/')
            {
                files.insert(rest.to_string());
            }
        }
        Ok(files.into_iter().filter(|p| is_tracked_file(p)).collect())
    })
    .await
    .map_err(input_error)?
}

#[tracing::instrument]
pub async fn instance_mod_files(
    instance_id: &str,
) -> crate::Result<Vec<String>> {
    let dir = crate::api::instance::get_full_path(instance_id)
        .await?
        .join(TRACKED_DIR);
    let mut files = Vec::new();
    let mut entries = match tokio::fs::read_dir(&dir).await {
        Ok(entries) => entries,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            return Ok(files);
        }
        Err(e) => return Err(input_error(e)),
    };
    while let Some(entry) = entries.next_entry().await.map_err(input_error)? {
        if entry.file_type().await.map_err(input_error)?.is_file() {
            files.push(format!(
                "{TRACKED_DIR}{}",
                entry.file_name().to_string_lossy()
            ));
        }
    }
    files.sort();
    Ok(files)
}

#[tracing::instrument]
pub async fn remove_instance_mod_files(
    instance_id: &str,
    files: Vec<String>,
) -> crate::Result<()> {
    let root = crate::api::instance::get_full_path(instance_id).await?;
    for file in files {
        if !is_tracked_file(&file) {
            return Err(input_error(format!("invalid mod path: {file}")));
        }
        match tokio::fs::remove_file(root.join(&file)).await {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(input_error(e)),
        }
    }
    Ok(())
}
