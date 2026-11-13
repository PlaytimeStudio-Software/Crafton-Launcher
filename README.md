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

The home screen shows one card per pack listed in `apps/app-frontend/src/config/featured-pack.ts`. Each card installs and updates the latest `.mrpack` release of its GitHub repository. Memory and Java arguments are left to the player.

- `PlaytimeStudio-Software/Workshop-SMP` (Minecraft 1.21.1) is public.
- `PlaytimeStudio-Software/Workshop-SMP-26` (Minecraft 26.3) is private. A pack marked `requiresKey` asks the player once to sign in with GitHub (when `githubAppClientId` is set) or to paste an access key: a GitHub fine-grained token that can only read that repository. Sign-in uses GitHub's device flow with the launcher's GitHub App, whose client ID is public and needs no secret. The resulting token or key is stored on the player's computer and sent only to GitHub. It is never part of this repository or of the installer.

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
