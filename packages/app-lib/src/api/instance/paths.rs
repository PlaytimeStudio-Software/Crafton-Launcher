use crate::state::State;
use crate::util::io;
use std::path::PathBuf;

pub(crate) const CONFIG_DIRECTORY: &str = "config";
pub(crate) const CONFIG_FILE_EXTENSIONS: [&str; 14] = [
    "json",
    "json5",
    "jsonc",
    "yml",
    "yaml",
    "css",
    "toml",
    "txt",
    "ini",
    "cfg",
    "conf",
    "properties",
    "xml",
    "nbt",
];

#[tracing::instrument]
pub async fn get_full_path(instance_id: &str) -> crate::Result<PathBuf> {
    let state = State::get().await?;
    let path =
        crate::state::instances::adapters::sqlite::instance_rows::get_instance_path_by_id(
            instance_id,
            &state.pool,
        )
        .await?
        .ok_or(crate::ErrorKind::InputError("unknown instance".to_string()))?;

    Ok(io::canonicalize(
        state.directories.instances_dir().join(path),
    )?)
}

#[tracing::instrument]
pub async fn get_mod_full_path(
    instance_id: &str,
    project_path: &str,
) -> crate::Result<PathBuf> {
    Ok(get_full_path(instance_id).await?.join(project_path))
}
