# Crafton Launcher

A Minecraft launcher for Windows built for the Workshop SMP server. It manages instances, installs mods, modpacks, resource packs, shaders and data packs, and launches the game with a Microsoft account.

## Features

- Instances for Fabric, Quilt, Forge, NeoForge and vanilla
- Mod, modpack, resource pack, shader and data pack browsing with dependency handling
- One-click install and update of the Workshop SMP modpack
- `.mrpack` import and export
- Java detection and management
- Worlds, screenshots, logs and a file browser for each instance
- Diamond, Grass block, Ender, Lapis, Netherite and Deepslate themes
- Automatic launcher updates

## Requirements

| Tool                                                             | Version                                            |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| [Node.js](https://nodejs.org/)                                   | 24.15 or newer                                     |
| [pnpm](https://pnpm.io/)                                         | 12.11.2                                            |
| [Rust](https://rustup.rs/)                                       | Installed automatically from `rust-toolchain.toml` |
| JDK                                                              | 17 or newer                                        |
| [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) | WebView2 on Windows                                |

## Development

```bash
pnpm install
cp packages/app-lib/.env.prod packages/app-lib/.env
SQLX_OFFLINE=true pnpm dev
```

Development builds use a separate `CraftonLauncherDev` data folder.

## Releases

Raise `version` in `apps/app-frontend/package.json`, then run:

```bash
python scripts/release-launcher.py --notes "What changed"
```

This builds the signed installer and publishes it to this repository's releases, where installed launchers pick it up automatically. Signing needs the private key at `%USERPROFILE%\.tauri\crafton-launcher.key`, which is not stored in this repository.

## Workshop SMP modpack

The home screen installs and updates the latest `.mrpack` release from `PlaytimeStudio-Software/Workshop-SMP`, set in `apps/app-frontend/src/config/featured-pack.ts`. Recommended memory and Java arguments come from `launcher-settings.json` in that repository.

## Data

Instances and settings are stored in `%APPDATA%\CraftonLauncher`.

## Checks

```bash
pnpm --filter @crafton/app-frontend lint
cargo clippy --workspace --all-targets
cargo fmt --all --check
```

## License

GNU General Public License, version 3. See [COPYING.md](COPYING.md).
