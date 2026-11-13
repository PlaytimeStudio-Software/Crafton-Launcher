use std::path::PathBuf;

use reqwest::Method;
use serde::{Deserialize, Serialize};

use crate::ErrorKind;
use crate::State;
use crate::util::fetch::{REQWEST_CLIENT, fetch, fetch_json, write};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FeaturedPackRelease {
    pub tag: String,
    pub name: String,
    pub notes: Option<String>,
    pub published_at: Option<String>,
    pub asset_name: String,
    #[serde(skip_serializing)]
    pub asset_url: String,
    /// API download link, the only one that works for a private repository.
    #[serde(skip_serializing)]
    pub asset_api_url: String,
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
    url: String,
    browser_download_url: String,
}

/// A private pack repository is read with an access key (a GitHub token that
/// can only read that repository). The key is kept on the player's computer
/// and passed in by the frontend; it is never part of the launcher itself.
fn access_key(token: Option<&str>) -> Option<&str> {
    token.map(str::trim).filter(|token| !token.is_empty())
}

async fn github_get(
    url: &str,
    token: &str,
    accept: &str,
) -> crate::Result<reqwest::Response> {
    let response = REQWEST_CLIENT
        .get(url)
        .header("Accept", accept)
        .header("X-GitHub-Api-Version", "2022-11-28")
        .bearer_auth(token)
        .send()
        .await
        .map_err(input_error)?;
    match response.status().as_u16() {
        200..=299 => Ok(response),
        401 | 403 | 404 => Err(input_error(
            "The access key was not accepted for this modpack. Check the key or ask for a new one.",
        )),
        status => {
            Err(input_error(format!("GitHub answered with status {status}")))
        }
    }
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

/// First step of GitHub's device sign-in: the code the player types on github.com.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GithubDeviceCode {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Serialize, Debug, Clone)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum GithubDevicePoll {
    /// The player has not approved the sign-in yet.
    Pending,
    /// Asked too often: wait longer between checks.
    SlowDown,
    Expired,
    Denied,
    Authorized {
        token: String,
    },
}

#[derive(Deserialize)]
struct GithubTokenResponse {
    access_token: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

fn validate_client_id(client_id: &str) -> crate::Result<()> {
    if !client_id.is_empty()
        && client_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c))
    {
        Ok(())
    } else {
        Err(input_error("invalid GitHub app client id"))
    }
}

async fn github_login_post<T: serde::de::DeserializeOwned>(
    url: &str,
    form: &[(&str, &str)],
) -> crate::Result<T> {
    REQWEST_CLIENT
        .post(url)
        .header("Accept", "application/json")
        .form(form)
        .send()
        .await
        .map_err(input_error)?
        .json()
        .await
        .map_err(input_error)
}

/// Starts a GitHub sign-in for the launcher's GitHub App. `client_id` is the
/// app's public client id; the device flow needs no client secret.
#[tracing::instrument]
pub async fn github_device_start(
    client_id: &str,
) -> crate::Result<GithubDeviceCode> {
    validate_client_id(client_id)?;
    github_login_post(
        "https://github.com/login/device/code",
        &[("client_id", client_id)],
    )
    .await
}

/// Checks whether the player has approved the sign-in started by
/// [`github_device_start`]. On approval the token is returned to the frontend,
/// which keeps it on this computer like a pasted access key.
#[tracing::instrument(skip(device_code))]
pub async fn github_device_poll(
    client_id: &str,
    device_code: &str,
) -> crate::Result<GithubDevicePoll> {
    validate_client_id(client_id)?;
    let response: GithubTokenResponse = github_login_post(
        "https://github.com/login/oauth/access_token",
        &[
            ("client_id", client_id),
            ("device_code", device_code),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ],
    )
    .await?;
    if let Some(token) = response.access_token.filter(|t| !t.is_empty()) {
        return Ok(GithubDevicePoll::Authorized { token });
    }
    match response.error.as_deref() {
        Some("authorization_pending") => Ok(GithubDevicePoll::Pending),
        Some("slow_down") => Ok(GithubDevicePoll::SlowDown),
        Some("expired_token") => Ok(GithubDevicePoll::Expired),
        Some("access_denied") => Ok(GithubDevicePoll::Denied),
        other => Err(input_error(format!(
            "GitHub sign-in failed: {}",
            response
                .error_description
                .as_deref()
                .or(other)
                .unwrap_or("unknown error")
        ))),
    }
}

#[tracing::instrument(skip(token))]
pub async fn latest_release(
    repo: &str,
    token: Option<&str>,
) -> crate::Result<Option<FeaturedPackRelease>> {
    validate_repo(repo)?;
    let url =
        format!("https://api.github.com/repos/{repo}/releases?per_page=10");
    let releases: Vec<GithubRelease> = if let Some(token) = access_key(token) {
        github_get(&url, token, "application/vnd.github+json")
            .await?
            .json()
            .await
            .map_err(input_error)?
    } else {
        let state = State::get().await?;
        fetch_json(
            Method::GET,
            &url,
            None,
            None,
            None,
            &state.fetch_semaphore,
            &state.pool,
        )
        .await?
    };

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
                asset_api_url: asset.url,
            })
        }))
}

#[tracing::instrument(skip(token))]
pub async fn download_latest(
    repo: &str,
    token: Option<&str>,
) -> crate::Result<(FeaturedPackRelease, PathBuf)> {
    let release = latest_release(repo, token).await?.ok_or_else(|| {
        ErrorKind::InputError(format!("{repo} has no modpack release"))
    })?;
    let state = State::get().await?;
    let bytes = if let Some(token) = access_key(token) {
        github_get(&release.asset_api_url, token, "application/octet-stream")
            .await?
            .bytes()
            .await
            .map_err(input_error)?
    } else {
        fetch(
            &release.asset_url,
            None,
            None,
            &state.fetch_semaphore,
            &state.pool,
        )
        .await?
    };

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
