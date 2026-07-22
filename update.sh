#!/usr/bin/env bash
# FO Simulator production updater.
# Lives next to dist/:
#   app/
#     dist/
#     update.sh
#
# Usage:
#   ./update.sh              # download latest GitHub release zip → overwrite dist/
#   ./update.sh --check      # exit 0 if a newer release exists (needs CURRENT_VERSION)
#
# Env (optional):
#   FO_DIST_DIR, FO_GITHUB_OWNER, FO_GITHUB_REPO, FO_DIST_ASSET, FO_CURRENT_VERSION
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$SCRIPT_DIR"
DIST_DIR="${FO_DIST_DIR:-$APP_ROOT/dist}"
GITHUB_OWNER="${FO_GITHUB_OWNER:-Jeriyant}"
GITHUB_REPO="${FO_GITHUB_REPO:-FO-Simulator}"
DIST_ASSET_NAME="${FO_DIST_ASSET:-fo-simulator-dist.zip}"
API_URL="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest"
CHECK_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=true ;;
    -h|--help)
      sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

command -v python3 >/dev/null 2>&1 || fail "python3 is required"

read_local_version() {
  if [[ -n "${FO_CURRENT_VERSION:-}" ]]; then
    printf '%s' "$FO_CURRENT_VERSION"
    return
  fi
  if [[ -f "$DIST_DIR/version.json" ]]; then
    python3 - "$DIST_DIR/version.json" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    print((json.load(f).get("version") or "").strip())
PY
    return
  fi
  printf ''
}

TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo "==> Fetching latest release from GitHub (${GITHUB_OWNER}/${GITHUB_REPO})"
META_FILE="$TMP_DIR/release.json"
python3 - "$API_URL" "$META_FILE" <<'PY' || fail "GitHub API request failed"
import sys, urllib.request
url, out = sys.argv[1], sys.argv[2]
req = urllib.request.Request(
    url,
    headers={
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "FO-Simulator-Updater",
    },
)
with urllib.request.urlopen(req, timeout=60) as res, open(out, "wb") as f:
    f.write(res.read())
PY

mapfile -t RELEASE_INFO < <(
  python3 - "$META_FILE" "$DIST_ASSET_NAME" <<'PY'
import json, sys
path, asset_name = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as f:
    data = json.load(f)
tag = (data.get("tag_name") or "").strip()
if not tag:
    raise SystemExit("missing tag_name")
assets = data.get("assets") or []
url = ""
for a in assets:
    if a.get("name") == asset_name:
        url = a.get("browser_download_url") or ""
        break
if not url:
    for a in assets:
        name = (a.get("name") or "").lower()
        if name.endswith(".zip"):
            url = a.get("browser_download_url") or ""
            break
if not url:
    raise SystemExit("dist zip asset not found on release")
print(tag)
print(tag.lstrip("vV"))
print(url)
PY
) || fail "Failed to parse GitHub release metadata"

TAG="${RELEASE_INFO[0]}"
VERSION="${RELEASE_INFO[1]}"
DOWNLOAD_URL="${RELEASE_INFO[2]}"
LOCAL_VERSION="$(read_local_version)"

echo "==> Latest release: $TAG"
if [[ -n "$LOCAL_VERSION" ]]; then
  echo "==> Local version:  v$LOCAL_VERSION"
fi

NEWER="$(
  python3 - "$VERSION" "${LOCAL_VERSION:-}" <<'PY'
import sys
remote = (sys.argv[1] or "").strip().lstrip("vV")
local = (sys.argv[2] or "").strip().lstrip("vV")
if not local:
    print(1)
    raise SystemExit
def nums(v: str):
    return [int(p) if p.isdigit() else 0 for p in v.replace("-", ".").replace("+", ".").split(".") if p != ""]
ra, rb = nums(remote), nums(local)
n = max(len(ra), len(rb))
ra += [0] * (n - len(ra))
rb += [0] * (n - len(rb))
for a, b in zip(ra, rb):
    if a != b:
        print(1 if a > b else 0)
        raise SystemExit
print(0)
PY
)"

if [[ "$CHECK_ONLY" == true ]]; then
  if [[ "$NEWER" == "1" ]]; then
    echo "Update available: v$VERSION"
    exit 0
  fi
  echo "Already up to date."
  exit 1
fi

if [[ -n "$LOCAL_VERSION" && "$NEWER" != "1" ]]; then
  echo "==> Already on latest (v$LOCAL_VERSION). Nothing to do."
  exit 0
fi

ZIP_PATH="$TMP_DIR/$DIST_ASSET_NAME"
echo "==> Downloading $DIST_ASSET_NAME"
python3 - "$DOWNLOAD_URL" "$ZIP_PATH" <<'PY' || fail "Download failed"
import sys, urllib.request
url, out = sys.argv[1], sys.argv[2]
req = urllib.request.Request(url, headers={"User-Agent": "FO-Simulator-Updater"})
with urllib.request.urlopen(req, timeout=180) as res, open(out, "wb") as f:
    while True:
        chunk = res.read(1024 * 256)
        if not chunk:
            break
        f.write(chunk)
PY

echo "==> Installing into $DIST_DIR (overwrite)"
mkdir -p "$DIST_DIR"
python3 - "$ZIP_PATH" "$DIST_DIR" <<'PY' || fail "Failed to install files into dist"
import shutil
import sys
import zipfile
from pathlib import Path

zip_path = Path(sys.argv[1])
dist = Path(sys.argv[2])

with zipfile.ZipFile(zip_path) as zf:
    names = zf.namelist()
    tops = {n.split("/", 1)[0] for n in names if n and not n.startswith("__MACOSX")}
    tops = {t.rstrip("/") for t in tops if t}
    prefix = ""
    if len(tops) == 1:
        only = next(iter(tops))
        if all(n.startswith(only + "/") or n.rstrip("/") == only for n in names if n and not n.startswith("__MACOSX")):
            if f"{only}/index.html" in names or "index.html" not in names:
                prefix = only + "/"

    if f"{prefix}index.html" not in names and "index.html" not in names:
        raise SystemExit("Extracted zip has no index.html")

    if dist.exists():
        for item in list(dist.iterdir()):
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()
    else:
        dist.mkdir(parents=True, exist_ok=True)

    for info in zf.infolist():
        name = info.filename
        if not name or name.startswith("__MACOSX") or name.endswith("/"):
            continue
        if prefix and not name.startswith(prefix):
            continue
        rel = name[len(prefix) :] if prefix else name
        if not rel or rel.endswith("/"):
            continue
        target = dist / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(info) as src, open(target, "wb") as out:
            shutil.copyfileobj(src, out)
PY

[[ -f "$DIST_DIR/index.html" ]] || fail "Install incomplete: missing index.html"

if command -v systemctl >/dev/null 2>&1; then
  systemctl reload apache2 >/dev/null 2>&1 || true
fi

echo "==> Done. Updated to $TAG"
echo "    Hard-refresh the browser to load the new build."
