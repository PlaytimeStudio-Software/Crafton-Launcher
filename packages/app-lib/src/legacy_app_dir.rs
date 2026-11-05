use std::io;
use std::path::{Path, PathBuf};

const LEGACY_IDENTIFIERS: &[(&str, &[&str])] = &[
    ("CraftonLauncher", &["PlaytimeLauncher", "AeroLauncher"]),
    (
        "CraftonLauncherDev",
        &["PlaytimeLauncherDev", "AeroLauncherDev"],
    ),
];

fn legacy_identifiers(app_identifier: &str) -> &'static [&'static str] {
    LEGACY_IDENTIFIERS
        .iter()
        .find(|(current, _)| *current == app_identifier)
        .map_or(&[], |(_, legacy)| *legacy)
}

fn is_unused(dir: &Path) -> io::Result<bool> {
    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(true),
        Err(e) => return Err(e),
    };
    for entry in entries {
        if entry?.file_name() != crate::state::LAUNCHER_LOGS_FOLDER_NAME {
            return Ok(false);
        }
    }
    Ok(true)
}

fn move_dir(from: &Path, to: &Path) -> io::Result<bool> {
    if !from.is_dir() || !is_unused(to)? {
        return Ok(false);
    }
    if to.exists() {
        std::fs::remove_dir_all(to)?;
    }
    std::fs::rename(from, to)?;
    Ok(true)
}

pub fn migrate(app_identifier: &str) -> io::Result<Vec<(PathBuf, PathBuf)>> {
    let legacy = legacy_identifiers(app_identifier);
    if legacy.is_empty() || std::env::var_os("CRAFTON_CONFIG_DIR").is_some() {
        return Ok(Vec::new());
    }

    let mut bases: Vec<PathBuf> = Vec::new();
    for base in [dirs::data_dir(), dirs::data_local_dir()]
        .into_iter()
        .flatten()
    {
        if !bases.contains(&base) {
            bases.push(base);
        }
    }

    let mut moved = Vec::new();
    for base in bases {
        let to = base.join(app_identifier);
        for name in legacy {
            let from = base.join(name);
            if move_dir(&from, &to)? {
                moved.push((from, to));
                break;
            }
        }
    }
    Ok(moved)
}

pub(crate) fn remap_custom_dir(
    settings: &mut crate::state::Settings,
    app_identifier: &str,
) {
    let Some(base) = dirs::data_dir() else {
        return;
    };
    let new = base.join(app_identifier);
    if !new.exists() {
        return;
    }

    let normalize = |path: &str| {
        let path = path.trim_end_matches(['/', '\\']);
        if cfg!(windows) {
            path.replace('/', "\\").to_lowercase()
        } else {
            path.to_owned()
        }
    };
    let new_str = new.to_string_lossy().into_owned();
    for name in legacy_identifiers(app_identifier) {
        let old = base.join(name);
        if old.exists() {
            continue;
        }
        let old_str = normalize(&old.to_string_lossy());
        for dir in [&mut settings.custom_dir, &mut settings.prev_custom_dir] {
            if dir.as_deref().is_some_and(|dir| normalize(dir) == old_str) {
                *dir = Some(new_str.clone());
            }
        }
    }
}
