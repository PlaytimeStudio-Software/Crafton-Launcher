#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="${CRAFTON_LINUX_WORK:-/root/crafton-linux}"
KEY="${CRAFTON_SIGNING_KEY:-$(dirname "$(dirname "$REPO")")/.tauri/crafton-launcher.key}"
IMAGE=crafton-linux-build
OUT="$REPO/target/release/bundle/appimage"

command -v podman >/dev/null || dnf install -y podman
command -v rsync >/dev/null || dnf install -y rsync

[ -f "$KEY" ] || { echo "Signing key not found: $KEY" >&2; exit 1; }

podman build -t "$IMAGE" -f "$REPO/scripts/linux/Containerfile" "$REPO/scripts/linux"

mkdir -p "$WORK/src"
rsync -a --delete \
    --exclude node_modules --exclude /target --exclude .git --exclude .turbo --exclude dist \
    "$REPO/" "$WORK/src/"

podman run --rm \
    -v "$WORK/src:/src" \
    -v crafton-cargo:/usr/local/cargo/registry \
    -v crafton-target:/src/target \
    -v crafton-pnpm:/root/.local/share/pnpm \
    -v "$KEY:/run/signing.key:ro" \
    -e CARGO_BUILD_JOBS="${CARGO_BUILD_JOBS:-6}" \
    "$IMAGE" bash -c '
        set -e
        export TAURI_SIGNING_PRIVATE_KEY="$(cat /run/signing.key)"
        export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
        rm -rf /src/target/release/bundle/appimage
        pnpm install --frozen-lockfile
        cd apps/app
        pnpm tauri build --config tauri.release.conf.json --features updater --bundles appimage
        mkdir -p /src/out
        cp /src/target/release/bundle/appimage/*.AppImage /src/target/release/bundle/appimage/*.AppImage.sig /src/out/
    '

mkdir -p "$OUT"
cp "$WORK/src/out/"* "$OUT/"
rm -rf "$WORK/src/out"
ls -l "$OUT"
