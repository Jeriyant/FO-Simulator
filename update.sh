#!/usr/bin/env bash
# FO Simulator production updater
#
# CLI:
#   ./update.sh
#   ./update.sh --force
#   ./update.sh --check
#
# UI:
#   POST update.php  → menjalankan update.sh
set -euo pipefail

cd "$(dirname "$0")"
APP_DIR="$(pwd)"

VERSION_FILE="./version.json"
ZIP_FILE="./fo-simulator-dist.zip"
LOCK_FILE="./.update.lock"
EXTRACT_TMP="./.update-extract-tmp"
GITHUB_OWNER="${FO_GITHUB_OWNER:-Jeriyant}"
GITHUB_REPO="${FO_GITHUB_REPO:-FO-Simulator}"
DIST_ASSET_NAME="${FO_DIST_ASSET:-fo-simulator-dist.zip}"
API_URL="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest"
USER_AGENT="FO-Simulator-Updater/${HOSTNAME:-server}"

IS_CGI=false
# Hanya mode CGI Apache sejati (bukan saat dipanggil dari update.php / CLI)
if [[ -n "${REQUEST_METHOD:-}" && -n "${GATEWAY_INTERFACE:-}" ]]; then
  IS_CGI=true
fi

FORCE=false
CHECK_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=true ;;
    --check) CHECK_ONLY=true ;;
    -h|--help)
      [[ "$IS_CGI" == true ]] && exit 0
      cat <<'EOF'
  ./update.sh           # update folder ini dari GitHub
  ./update.sh --force
  ./update.sh --check
  UI: POST update.php
EOF
      exit 0
      ;;
  esac
done

# Dari UI selalu paksa pasang (user sudah lihat ada versi baru)
if [[ "$IS_CGI" == true ]]; then
  FORCE=true
  case "${REQUEST_METHOD}" in
    OPTIONS)
      printf 'Status: 204 No Content\r\n'
      printf 'Access-Control-Allow-Origin: *\r\n'
      printf 'Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n'
      printf 'Access-Control-Allow-Headers: Content-Type\r\n\r\n'
      exit 0
      ;;
    GET|POST) ;;
    *)
      printf 'Status: 405 Method Not Allowed\r\nContent-Type: application/json\r\n\r\n'
      printf '{"ok":false,"error":"Method not allowed"}\n'
      exit 0
      ;;
  esac
fi

json_escape() {
  local s=${1//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/}
  printf '%s' "$s"
}

cgi_json() {
  local status="$1" ok="$2" body="$3"
  printf 'Status: %s\r\n' "$status"
  printf 'Content-Type: application/json; charset=utf-8\r\n'
  printf 'Cache-Control: no-store\r\n'
  printf 'Access-Control-Allow-Origin: *\r\n\r\n'
  printf '{"ok":%s,%s}\n' "$ok" "$body"
}

fail() {
  local msg="$1"
  if [[ "$IS_CGI" == true ]]; then
    cgi_json "500 Internal Server Error" "false" "\"error\":\"$(json_escape "$msg")\""
    exit 0
  fi
  echo "ERROR: $msg" >&2
  exit 1
}

log() { echo "$@" >&2; }

have_cmd() { command -v "$1" >/dev/null 2>&1; }

# Cegah dua update bersamaan (klik berulang / request paralel)
exec 9>"$LOCK_FILE"
if have_cmd flock; then
  if ! flock -n 9; then
    fail "update sedang berjalan — tunggu selesai lalu coba lagi"
  fi
fi

log "==> App dir: $APP_DIR"

have_cmd curl || have_cmd wget || fail "butuh curl atau wget"

download() {
  local url="$1" out="$2"
  local attempt=1 max=5
  local delay=2
  while (( attempt <= max )); do
    log "    unduh (percobaan $attempt/$max)..."
    rm -f "$out"
    if have_cmd curl; then
      if curl -fsSL \
        --connect-timeout 20 \
        --max-time 300 \
        --retry 3 \
        --retry-delay 2 \
        -A "$USER_AGENT" \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        -o "$out" "$url" \
        && [[ -s "$out" ]]
      then
        return 0
      fi
    elif wget -q --tries=3 --timeout=30 -U "$USER_AGENT" -O "$out" "$url" && [[ -s "$out" ]]; then
      return 0
    fi
    rm -f "$out"
    if (( attempt == max )); then
      return 1
    fi
    sleep "$delay"
    delay=$((delay * 2))
    attempt=$((attempt + 1))
  done
  return 1
}

META_TMP="$(mktemp)"
cleanup() {
  rm -f "$META_TMP" "$ZIP_FILE" 2>/dev/null || true
  rm -rf "$EXTRACT_TMP" 2>/dev/null || true
}
trap cleanup EXIT

log "==> Cek release GitHub..."
download "$API_URL" "$META_TMP" || fail "gagal unduh metadata GitHub (jaringan/rate-limit?)"

# Deteksi respons error GitHub (rate limit / HTML)
if grep -qiE '"message"[[:space:]]*:[[:space:]]*"(API rate limit|Not Found|Bad credentials)' "$META_TMP" 2>/dev/null; then
  msg="$(grep -oE '"message"[[:space:]]*:[[:space:]]*"[^"]+"' "$META_TMP" | head -1 | sed -E 's/.*"([^"]+)"[[:space:]]*$/\1/')"
  fail "GitHub API: ${msg:-error}"
fi

TAG=""
REMOTE_VERSION=""
DOWNLOAD_URL=""

if have_cmd python3; then
  PARSE_OUT="$(
    python3 - "$META_TMP" "$DIST_ASSET_NAME" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)
tag = (data.get("tag_name") or "").strip()
if not tag:
    sys.stderr.write("tag kosong\n")
    sys.exit(2)
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
    sys.stderr.write("zip asset tidak ada\n")
    sys.exit(2)
print(tag)
print(tag.lstrip("vV"))
print(url)
PY
  )" || fail "gagal parse release (python) — cek metadata GitHub"
  # Baca 3 baris hasil parse (hindari mapfile + process substitution yang menelan exit code)
  TAG="$(printf '%s\n' "$PARSE_OUT" | sed -n '1p')"
  REMOTE_VERSION="$(printf '%s\n' "$PARSE_OUT" | sed -n '2p')"
  DOWNLOAD_URL="$(printf '%s\n' "$PARSE_OUT" | sed -n '3p')"
else
  TAG="$(grep -oE '"tag_name"[[:space:]]*:[[:space:]]*"[^"]+"' "$META_TMP" | head -1 | sed -E 's/.*"([^"]+)"[[:space:]]*$/\1/')"
  DOWNLOAD_URL="$(grep -oE "\"browser_download_url\"[[:space:]]*:[[:space:]]*\"[^\"]+${DIST_ASSET_NAME}\"" "$META_TMP" | head -1 | sed -E 's/.*"([^"]+)"[[:space:]]*$/\1/')"
  REMOTE_VERSION="${TAG#v}"
fi

[[ -n "$TAG" && -n "$REMOTE_VERSION" && -n "$DOWNLOAD_URL" ]] \
  || fail "gagal parse release (tag/url kosong — install python3 jika perlu)"

log "==> Remote: $TAG"

LOCAL_VERSION=""
if [[ -f "$VERSION_FILE" ]]; then
  LOCAL_VERSION="$(
    tr -d '\r' < "$VERSION_FILE" \
      | grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' \
      | head -1 \
      | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/' \
      | tr -d '[:space:]'
  )" || true
fi
log "==> Local:  ${LOCAL_VERSION:-none}  ($VERSION_FILE)"

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
elif version_gt "$REMOTE_VERSION" "$LOCAL_VERSION"; then
  NEED_UPDATE=true
fi

if [[ "$CHECK_ONLY" == true ]]; then
  if [[ "$NEED_UPDATE" == true ]]; then
    [[ "$IS_CGI" == true ]] && cgi_json "200 OK" "true" "\"update\":true,\"version\":\"$(json_escape "$REMOTE_VERSION")\"" && exit 0
    log "Update tersedia: v$REMOTE_VERSION"
    exit 0
  fi
  [[ "$IS_CGI" == true ]] && cgi_json "200 OK" "true" "\"update\":false,\"version\":\"$(json_escape "$REMOTE_VERSION")\"" && exit 0
  log "Sudah versi terbaru."
  exit 1
fi

if [[ "$NEED_UPDATE" != true ]]; then
  if [[ "$IS_CGI" == true ]]; then
    cgi_json "200 OK" "true" "\"version\":\"$(json_escape "$LOCAL_VERSION")\",\"skipped\":true"
    exit 0
  fi
  log "Tidak ada update. Pakai ./update.sh --force untuk paksa."
  exit 0
fi

log "==> Download → $ZIP_FILE"
rm -f "$ZIP_FILE"
download "$DOWNLOAD_URL" "$ZIP_FILE" || fail "download zip gagal (jaringan/CDN GitHub)"
[[ -s "$ZIP_FILE" ]] || fail "zip kosong"

log "==> Extract..."
rm -rf "$EXTRACT_TMP"
mkdir -p "$EXTRACT_TMP"

if have_cmd unzip; then
  unzip -tqq "$ZIP_FILE" >/dev/null 2>&1 || fail "zip rusak/tidak lengkap (coba lagi)"
  unzip -o -q "$ZIP_FILE" -d "$EXTRACT_TMP" || fail "unzip gagal"
elif have_cmd python3; then
  python3 <<PY || fail "extract gagal"
import zipfile, sys
z = zipfile.ZipFile("$ZIP_FILE")
bad = z.testzip()
if bad is not None:
    sys.stderr.write(f"zip rusak: {bad}\\n")
    sys.exit(1)
z.extractall("$EXTRACT_TMP")
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

log "==> Timpa file di $APP_DIR"
shopt -s nullglob dotglob
for item in ./*; do
  base="$(basename "$item")"
  case "$base" in
    update.sh|update.php|.update-extract-tmp|.update.lock|fo-simulator-dist.zip) continue ;;
    .|..) continue ;;
  esac
  rm -rf "$item" || fail "gagal hapus $base (izin/file terkunci?)"
done
shopt -u nullglob dotglob

cp -a "$EXTRACT_TMP"/. ./ || fail "gagal menyalin file update"
rm -rf "$EXTRACT_TMP"
rm -f "$ZIP_FILE"

printf '{\n  "version": "%s"\n}\n' "$REMOTE_VERSION" > "$VERSION_FILE"

[[ -f ./index.html ]] || fail "install gagal: ./index.html tidak ada"
[[ -f ./update.sh ]] || fail "update.sh hilang setelah install"
chmod +x ./update.sh 2>/dev/null || true
[[ -f ./update.php ]] && chmod 644 ./update.php 2>/dev/null || true

if have_cmd systemctl; then
  systemctl reload apache2 >/dev/null 2>&1 || systemctl reload httpd >/dev/null 2>&1 || true
fi

log "==> Selesai → v$REMOTE_VERSION"

if [[ "$IS_CGI" == true ]]; then
  cgi_json "200 OK" "true" "\"version\":\"$(json_escape "$REMOTE_VERSION")\",\"tag\":\"$(json_escape "$TAG")\""
  exit 0
fi

log "    Hard-refresh browser (Ctrl+F5)."
