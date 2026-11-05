/*!
# Crafton core

Crafton core is a library which provides utilities for launching Minecraft, creating mod packs,
and launching mod packs
*/
#![warn(unused_import_braces)]
#![deny(unused_must_use)]

#[macro_use]
mod util;

mod api;
mod error;
mod event;
pub mod install;
mod launcher;
pub mod legacy_app_dir;
mod logger;
mod state;

pub use api::*;
pub use error::*;
#[cfg(feature = "export-ts")]
pub use event::export_app_event_bindings;
pub use event::{
    AppEvent, EventState, LoadingBar, LoadingBarType, emit::emit_loading,
    emit::emit_warning, emit::init_loading,
};
pub use logger::start_logger;
pub use state::State;

/// Installs `ring` as the process-wide rustls crypto provider.
///
/// Must be called before any TLS connection is made: reqwest is built with
/// `rustls-no-provider`.
pub fn install_crypto_provider() {
    let _ = rustls::crypto::ring::default_provider().install_default();
}

pub fn launcher_user_agent() -> String {
    const LAUNCHER_BASE_USER_AGENT: &str =
        concat!("crafton-launcher/", env!("CARGO_PKG_VERSION"),);

    format!("{} ({})", LAUNCHER_BASE_USER_AGENT, std::env::consts::OS)
}
