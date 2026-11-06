import argparse
import datetime
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

RELEASES_REPOS = ["PlaytimeStudio-Software/Crafton-Launcher"]
ROOT = Path(__file__).resolve().parent.parent
APP_DIR = ROOT / "apps" / "app"
BUNDLE_DIR = ROOT / "target" / "release" / "bundle" / "nsis"
APPIMAGE_DIR = ROOT / "target" / "release" / "bundle" / "appimage"
WSL_DISTRO = os.environ.get("CRAFTON_WSL_DISTRO", "FedoraLinux-44")


def version() -> str:
    package = json.loads((ROOT / "apps" / "app-frontend" / "package.json").read_text("utf-8"))
    return package["version"]


def signing_key() -> Path:
    key = Path(
        os.environ.get("CRAFTON_SIGNING_KEY")
        or Path.home() / ".tauri" / "crafton-launcher.key"
    )
    if not key.is_file():
        sys.exit(f"Signing key not found: {key}")
    return key


def build() -> None:
    env = dict(os.environ)
    env["SQLX_OFFLINE"] = "true"
    env["TAURI_SIGNING_PRIVATE_KEY"] = signing_key().read_text("utf-8").strip()
    env.setdefault("TAURI_SIGNING_PRIVATE_KEY_PASSWORD", "")
    subprocess.run(
        "pnpm tauri build --config tauri.release.conf.json --features updater",
        cwd=APP_DIR,
        env=env,
        shell=True,
        check=True,
    )


def wsl_path(path: Path) -> str:
    drive, rest = str(path.resolve()).split(":", 1)
    return f"/mnt/{drive.lower()}{rest.replace(chr(92), '/')}"


def build_linux() -> None:
    env = dict(os.environ)
    env["CRAFTON_SIGNING_KEY"] = wsl_path(signing_key())
    env["WSLENV"] = "CRAFTON_SIGNING_KEY/u" if not env.get("WSLENV") else env["WSLENV"] + ":CRAFTON_SIGNING_KEY/u"
    subprocess.run(
        ["wsl", "-d", WSL_DISTRO, "-u", "root", "--", "bash", wsl_path(ROOT / "scripts" / "linux" / "build.sh")],
        env=env,
        check=True,
    )


def github_token() -> str:
    result = subprocess.run(
        ["git", "credential", "fill"],
        input="protocol=https\nhost=github.com\n\n",
        capture_output=True,
        text=True,
        check=True,
    )
    for line in result.stdout.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1]
    sys.exit("No GitHub token in git's credential store. Run `git push` once to sign in.")


def github(method: str, url: str, token: str, body=None, data=None, content_type=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "crafton-launcher-release",
    }
    if body is not None:
        data = json.dumps(body).encode()
        content_type = "application/json"
    if content_type:
        headers["Content-Type"] = content_type
    request = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request) as response:
            return json.load(response)
    except urllib.error.HTTPError as e:
        sys.exit(f"GitHub {method} {url} failed: {e.code} {e.read().decode(errors='replace')}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build and publish a Crafton Launcher update")
    parser.add_argument("--notes", default="", help="what changed, shown in the update popup")
    parser.add_argument("--skip-build", action="store_true", help="publish the existing build")
    parser.add_argument("--no-linux", action="store_true", help="publish Windows only")
    args = parser.parse_args()

    v = version()
    tag = f"v{v}"
    if not args.skip_build:
        build()
        if not args.no_linux:
            build_linux()

    installer = BUNDLE_DIR / f"Crafton Launcher_{v}_x64-setup.exe"
    signature = installer.with_name(installer.name + ".sig")
    for path in (installer, signature):
        if not path.is_file():
            sys.exit(f"Missing {path}. Build first, or check the version number.")

    assets = [(installer, signature, f"Crafton-Launcher_{v}_x64-setup.exe", "windows-x86_64")]
    if not args.no_linux:
        appimage = APPIMAGE_DIR / f"Crafton Launcher_{v}_amd64.AppImage"
        appimage_sig = appimage.with_name(appimage.name + ".sig")
        for path in (appimage, appimage_sig):
            if not path.is_file():
                sys.exit(f"Missing {path}. Build first, or pass --no-linux.")
        assets.append((appimage, appimage_sig, f"Crafton-Launcher_{v}_amd64.AppImage", "linux-x86_64"))

    token = github_token()
    for repo in RELEASES_REPOS:
        publish(repo, v, tag, args.notes, assets, token)


def publish(repo, v, tag, notes, assets, token) -> None:
    latest = {
        "version": v,
        "notes": notes,
        "pub_date": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "platforms": {
            platform: {
                "signature": signature.read_text("utf-8").strip(),
                "url": f"https://github.com/{repo}/releases/download/{tag}/{name}",
            }
            for _, signature, name, platform in assets
        },
    }
    api = f"https://api.github.com/repos/{repo}"
    release = github(
        "POST",
        f"{api}/releases",
        token,
        body={
            "tag_name": tag,
            "name": f"Crafton Launcher {v}",
            "body": notes or f"Crafton Launcher {v}",
        },
    )
    upload = release["upload_url"].split("{")[0]
    for path, _, name, _ in assets:
        github(
            "POST",
            f"{upload}?name={urllib.parse.quote(name)}",
            token,
            data=path.read_bytes(),
            content_type="application/octet-stream",
        )
    github(
        "POST",
        f"{upload}?name=latest.json",
        token,
        data=json.dumps(latest, indent=2).encode(),
        content_type="application/json",
    )
    print(f"Published {release['html_url']}")

if __name__ == "__main__":
    main()
