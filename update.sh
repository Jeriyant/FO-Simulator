#!/usr/bin/env bash
# FO Simulator production updater
#
# Satu paket dengan index.html:
#   /var/www/html/FO-Simulator/
#     index.html
#     assets/
#     version.json
#     update.sh
#     ...
#
#   cd /var/www/html/FO-Simulator && ./update.sh
#   ./update.sh --force
#   ./update.sh --check
set -euo pipefail

cd "$(dirname "$0")"
APP_DIR="$(pwd)"

VERSION_FILE="./version.json"
ZIP_FILE="./fo-simulator-dist.zip"
GITHUB_OWNER="${FO_GITHUB_OWNER:-Jeriyant}"
GITHUB_REPO="${FO_GITHUB_REPO:-FO-Simulator}"
DIST_ASSET_NAME="${FO_DIST_ASSET:-fo-simulator-dist.zip}"
API_URL="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest"

FORCE=false
CHECK_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=true ;;
    --check) CHECK_ONLY=true ;;
    -h|--help)
      cat <<'EOF'
  cd /var/www/html/FO-Simulator
  ./update.sh           # unduh zip → timpa file di folder ini (./)
  ./update.sh --force   # paksa timpa meski versi sama
  ./update.sh --check   # cek saja
EOF
      exit 0
      ;;
  esac
done

fail() { echo "ERROR: $*" >&2; exit 1; }
have_cmd() { command -v "$1" >/dev/null 2>&1; }

echo "==> App dir: $APP_DIR"
echo "==> Install: ./  (sejajar update.sh, bukan ./dist)"

have_cmd curl || have_cmd wget || fail "butuh curl atau wget"

download() {
  local url="$1" out="$2"
  if have_cmd curl; then
    curl -fsSL --retry 3 --retry-delay 1 -o "$out" "$url"
  else
    wget -q -O "$out" "$url"
  fi
}

# --- metadata GitHub ---
echo "==> Cek release GitHub..."
META_TMP="$(mktemp)"
cleanup() {
  rm -f "$META_TMP" "$ZIP_FILE" 2>/dev/null || true
  rm -rf ./.update-extract-tmp 2>/dev/null || true
}
trap cleanup EXIT

download "$API_URL" "$META_TMP" || fail "gagal unduh metadata GitHub"

if have_cmd python3; then
  mapfile -t RELEASE_INFO < <(
    python3 - "$META_TMP" "$DIST_ASSET_NAME" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)
tag = (data.get("tag_name") or "").strip()
if not tag:
    raise SystemExit("tag kosong")
url = ""
for a in data.get("assets") or []:
    if a.get("name") == sys.argv[2]:
        url = a.get("browser_download_url") or ""
        break
if not url:
    for a in data.get("assets") or []:
        if (a.get("name") or "").lower().endswith(".zip"):
            url = a.get("browser_download_url") or ""
            break
if not url:
    raise SystemExit("zip asset tidak ada")
print(tag)
print(tag.lstrip("vV"))
print(url)
PY
  ) || fail "gagal parse release (python)"
else
  TAG="$(grep -oE '"tag_name"[[:space:]]*:[[:space:]]*"[^"]+"' "$META_TMP" | head -1 | sed -E 's/.*"([^"]+)"[[:space:]]*$/\1/')"
  DOWNLOAD_URL="$(grep -oE "\"browser_download_url\"[[:space:]]*:[[:space:]]*\"[^\"]+${DIST_ASSET_NAME}\"" "$META_TMP" | head -1 | sed -E 's/.*"([^"]+)"[[:space:]]*$/\1/')"
  [[ -n "$TAG" && -n "$DOWNLOAD_URL" ]] || fail "gagal parse release (install python3)"
  RELEASE_INFO=("$TAG" "${TAG#v}" "$DOWNLOAD_URL")
fi

TAG="${RELEASE_INFO[0]}"
REMOTE_VERSION="${RELEASE_INFO[1]}"
DOWNLOAD_URL="${RELEASE_INFO[2]}"

echo "==> Remote : $TAG  (parsed=$REMOTE_VERSION)"
echo "==> Zip    : $DOWNLOAD_URL"

# --- LOCAL dari ./version.json ---
LOCAL_VERSION=""
echo "==> Local file: $APP_DIR/version.json"
if [[ -f "$VERSION_FILE" ]]; then
  echo "==> Local raw :"
  cat "$VERSION_FILE"
  echo
  LOCAL_VERSION="$(
    tr -d '\r' < "$VERSION_FILE" \
      | grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' \
      | head -1 \
      | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/' \
      | tr -d '[:space:]'
  )"
else
  echo "==> Local raw : (file tidak ada)"
fi

if [[ -n "$LOCAL_VERSION" ]]; then
  echo "==> Local parsed: $LOCAL_VERSION"
else
  echo "==> Local parsed: (kosong → akan di-update)"
fi

version_gt() {
  local a="${1#v}" b="${2#v}"
  [[ -z "$b" ]] && return 0
  [[ "$a" == "$b" ]] && return 1
  local IFS='.'
  # shellcheck disable=SC2206
  local pa=($a) pb=($b)
  local i na nb n=${#pa[@]}
  (( ${#pb[@]} > n )) && n=${#pb[@]}
  for ((i = 0; i < n; i++)); do
    na=${pa[i]:-0}; nb=${pb[i]:-0}
    na=${na//[^0-9]/}; nb=${nb//[^0-9]/}
    na=${na:-0}; nb=${nb:-0}
    ((10#$na > 10#$nb)) && return 0
    ((10#$na < 10#$nb)) && return 1
  done
  return 1
}

NEED_UPDATE=false
if [[ "$FORCE" == true ]]; then
  NEED_UPDATE=true
  echo "==> Mode --force"
elif version_gt "$REMOTE_VERSION" "$LOCAL_VERSION"; then
  NEED_UPDATE=true
  echo "==> Ada update: $LOCAL_VERSION → $REMOTE_VERSION"
else
  echo "==> Tidak ada update (local=$LOCAL_VERSION remote=$REMOTE_VERSION)"
fi

if [[ "$CHECK_ONLY" == true ]]; then
  if [[ "$NEED_UPDATE" == true ]]; then
    echo "Update tersedia: v$REMOTE_VERSION"
    exit 0
  fi
  echo "Sudah versi terbaru."
  exit 1
fi

if [[ "$NEED_UPDATE" != true ]]; then
  echo "    Lewati. Pakai ./update.sh --force untuk paksa timpa."
  exit 0
fi

# --- download ---
echo "==> Download → $ZIP_FILE"
rm -f "$ZIP_FILE"
download "$DOWNLOAD_URL" "$ZIP_FILE" || fail "download gagal"
[[ -s "$ZIP_FILE" ]] || fail "zip kosong"

# --- extract ke folder sementara ---
echo "==> Extract zip..."
EXTRACT_TMP="./.update-extract-tmp"
rm -rf "$EXTRACT_TMP"
mkdir -p "$EXTRACT_TMP"

if have_cmd unzip; then
  unzip -o -q "$ZIP_FILE" -d "$EXTRACT_TMP" || fail "unzip gagal"
elif have_cmd python3; then
  python3 <<PY || fail "extract gagal"
import zipfile
zipfile.ZipFile("$ZIP_FILE").extractall("$EXTRACT_TMP")
PY
else
  fail "butuh unzip atau python3"
fi

if [[ ! -f "$EXTRACT_TMP/index.html" ]]; then
  nested="$(find "$EXTRACT_TMP" -mindepth 1 -maxdepth 1 -type d ! -name '__MACOSX' | head -n 1 || true)"
  if [[ -n "${nested:-}" && -f "$nested/index.html" ]]; then
    find "$nested" -mindepth 1 -maxdepth 1 -exec mv {} "$EXTRACT_TMP"/ \;
    rmdir "$nested" 2>/dev/null || true
  fi
fi

[[ -f "$EXTRACT_TMP/index.html" ]] || fail "zip tanpa index.html"

# --- hapus file lama di ./ kecuali update.sh ---
echo "==> Timpa file di $APP_DIR (update.sh tetap aman)"
shopt -s nullglob dotglob
for item in ./*; do
  base="$(basename "$item")"
  case "$base" in
    update.sh|.update-extract-tmp|fo-simulator-dist.zip) continue ;;
    .|..) continue ;;
  esac
  rm -rf "$item"
done
shopt -u nullglob dotglob

# --- salin hasil extract ke ./ ---
cp -r "$EXTRACT_TMP"/. ./
rm -rf "$EXTRACT_TMP"
rm -f "$ZIP_FILE"

# pastikan version.json sesuai remote
printf '{\n  "version": "%s"\n}\n' "$REMOTE_VERSION" > "$VERSION_FILE"

[[ -f ./index.html ]] || fail "install gagal: ./index.html tidak ada"
[[ -f ./update.sh ]] || fail "update.sh hilang (tidak seharusnya)"

if have_cmd systemctl; then
  systemctl reload apache2 >/dev/null 2>&1 || systemctl reload httpd >/dev/null 2>&1 || true
fi

echo "==> Selesai → v$REMOTE_VERSION"
echo "    Cek: cat ./version.json"
echo "    Hard-refresh browser (Ctrl+F5)."
