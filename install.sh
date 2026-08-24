#!/usr/bin/env bash
set -euo pipefail

PROMPTBEAT_VERSION="${AIBEAT_VERSION:-0.3-agentbeat-preview}"
NODE_VERSION="22.22.2"
PROMPTFOO_VERSION="0.121.9"
RELEASE_BASE="${AIBEAT_RELEASE_BASE:-https://github.com/tophant-ai/aibeat/releases/download}"
NODE_BASE="${AIBEAT_NODE_BASE:-https://nodejs.org/dist/v${NODE_VERSION}}"
PROMPTFOO_URL="${AIBEAT_PROMPTFOO_URL:-https://registry.npmjs.org/promptfoo/-/promptfoo-${PROMPTFOO_VERSION}.tgz}"
PROMPTFOO_SHA512="${AIBEAT_PROMPTFOO_SHA512:-6fb07170db60eee94625ca3aeca354aa2b727226001a5d7d85c7307815dcaace275ce49f3a1ac4f07936a700e899d78a3835e0ea9e636c9ce0aaaf70048a7bfe}"

INSTALL_DIR="${AIBEAT_INSTALL_DIR:-${XDG_DATA_HOME:-${HOME}/.local/share}/aibeat}"
BIN_DIR="${AIBEAT_BIN_DIR:-${HOME}/.local/bin}"
CACHE_DIR="${AIBEAT_CACHE_DIR:-${XDG_CACHE_HOME:-${HOME}/.cache}/aibeat}"
RUNTIME_ONLY=0
ACTIVE_LOCK=""

usage() {
  cat <<'USAGE'
Install PromptBeat and its pinned runtime.

Usage: bash install.sh [options]

  --version VERSION    AI Beat release version (default: 0.3-agentbeat-preview)
  --install-dir DIR    Product files (default: ~/.local/share/aibeat)
  --bin-dir DIR        Command entry point (default: ~/.local/bin)
  --cache-dir DIR      Downloaded runtime cache (default: ~/.cache/aibeat)
  --runtime-only       Prepare Node.js and promptfoo without installing PromptBeat
  -h, --help           Show this help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) PROMPTBEAT_VERSION="${2:?--version requires a value}"; shift 2 ;;
    --install-dir) INSTALL_DIR="${2:?--install-dir requires a value}"; shift 2 ;;
    --bin-dir) BIN_DIR="${2:?--bin-dir requires a value}"; shift 2 ;;
    --cache-dir) CACHE_DIR="${2:?--cache-dir requires a value}"; shift 2 ;;
    --runtime-only) RUNTIME_ONLY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

for command in curl tar; do
  command -v "$command" >/dev/null 2>&1 || {
    printf 'Required command not found: %s\n' "$command" >&2
    exit 1
  }
done

OS="${AIBEAT_INSTALL_OS:-$(uname -s)}"
ARCH="${AIBEAT_INSTALL_ARCH:-$(uname -m)}"
OS="$(printf '%s' "$OS" | tr '[:upper:]' '[:lower:]')"
case "$OS-$ARCH" in
  linux-x86_64|linux-amd64)
    PLATFORM="linux-x64"
    NODE_FILE="node-v${NODE_VERSION}-linux-x64.tar.gz"
    NODE_SHA256_DEFAULT="978a635eef872fa68beae09f0aad0bbbae6757e444da80b570964a97e62a3"
    ;;
  darwin-arm64|darwin-aarch64)
    PLATFORM="darwin-arm64"
    NODE_FILE="node-v${NODE_VERSION}-darwin-arm64.tar.gz"
    NODE_SHA256_DEFAULT="db4b275b83736df67533529a18cc55de2549a8329ace6c7bcc68f8d22d3c9000"
    ;;
  darwin-x86_64|darwin-amd64)
    PLATFORM="darwin-x64"
    NODE_FILE="node-v${NODE_VERSION}-darwin-x64.tar.gz"
    NODE_SHA256_DEFAULT="12a6abb9c2902cf48a21120da13f87fde1ed1b71a13330712949e8db818708ba"
    ;;
  *)
    printf 'Unsupported platform: %s-%s. Use install.ps1 on Windows.\n' "$OS" "$ARCH" >&2
    exit 1
    ;;
esac
NODE_SHA256="${AIBEAT_NODE_SHA256:-$NODE_SHA256_DEFAULT}"

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

sha512_file() {
  if command -v sha512sum >/dev/null 2>&1; then
    sha512sum "$1" | awk '{print $1}'
  else
    shasum -a 512 "$1" | awk '{print $1}'
  fi
}

verify_digest() {
  local algorithm="$1" file="$2" expected="$3" actual
  if [[ "$algorithm" == "SHA-256" ]]; then
    actual="$(sha256_file "$file")"
  else
    actual="$(sha512_file "$file")"
  fi
  if [[ "$actual" != "$expected" ]]; then
    printf '%s verification failed for %s\nexpected: %s\nactual:   %s\n' \
      "$algorithm" "$file" "$expected" "$actual" >&2
    return 1
  fi
}

download() {
  local url="$1" output="$2"
  mkdir -p "$(dirname "$output")"
  curl --fail --location --retry 3 --output "$output" "$url"
}

cleanup() {
  if [[ -n "$ACTIVE_LOCK" ]]; then
    rm -f "$ACTIVE_LOCK/owner"
    rmdir "$ACTIVE_LOCK" 2>/dev/null || true
  fi
}
trap cleanup EXIT

acquire_lock() {
  local lock="$1" attempt=0
  while ! mkdir "$lock" 2>/dev/null; do
    attempt=$((attempt + 1))
    if [[ -f "$lock/owner" ]]; then
      local owner
      owner="$(cat "$lock/owner" 2>/dev/null || true)"
      if [[ "$owner" =~ ^[0-9]+$ ]] && ! kill -0 "$owner" 2>/dev/null; then
        rm -f "$lock/owner"
        rmdir "$lock" 2>/dev/null || true
        continue
      fi
    fi
    if (( attempt >= 120 )); then
      printf 'Timed out waiting for install lock: %s\n' "$lock" >&2
      exit 1
    fi
    sleep 1
  done
  printf '%s\n' "$$" > "$lock/owner"
  ACTIVE_LOCK="$lock"
}

release_lock() {
  local lock="$1"
  rm -f "$lock/owner"
  rmdir "$lock" 2>/dev/null || true
  ACTIVE_LOCK=""
}

NODE_DIR="$CACHE_DIR/runtime/node/$NODE_VERSION/$PLATFORM"
PROMPTFOO_DIR="$CACHE_DIR/runtime/promptfoo/$PROMPTFOO_VERSION/$PLATFORM"
DOWNLOAD_DIR="$CACHE_DIR/downloads"
mkdir -p "$CACHE_DIR/runtime/node/$NODE_VERSION" "$CACHE_DIR/runtime/promptfoo/$PROMPTFOO_VERSION" "$DOWNLOAD_DIR"

node_valid() {
  [[ -x "$NODE_DIR/bin/node" && -f "$NODE_DIR/.aibeat-runtime" ]] &&
    [[ "$(cat "$NODE_DIR/.aibeat-runtime")" == "node=$NODE_VERSION sha256=$NODE_SHA256" ]] &&
    [[ "$("$NODE_DIR/bin/node" --version 2>/dev/null)" == "v$NODE_VERSION" ]]
}

if node_valid; then
  printf 'Reusing Node.js %s from %s\n' "$NODE_VERSION" "$NODE_DIR"
else
  NODE_LOCK="$NODE_DIR.lock"
  acquire_lock "$NODE_LOCK"
  if ! node_valid; then
    printf 'Installing Node.js %s for %s\n' "$NODE_VERSION" "$PLATFORM"
    NODE_ARCHIVE="$DOWNLOAD_DIR/$NODE_FILE"
    download "$NODE_BASE/$NODE_FILE" "$NODE_ARCHIVE.tmp-$$"
    verify_digest SHA-256 "$NODE_ARCHIVE.tmp-$$" "$NODE_SHA256"
    mv "$NODE_ARCHIVE.tmp-$$" "$NODE_ARCHIVE"
    NODE_TEMP="$NODE_DIR.tmp-$$"
    rm -rf "$NODE_TEMP"
    mkdir -p "$NODE_TEMP"
    tar xzf "$NODE_ARCHIVE" -C "$NODE_TEMP" --strip-components=1
    printf 'node=%s sha256=%s\n' "$NODE_VERSION" "$NODE_SHA256" > "$NODE_TEMP/.aibeat-runtime"
    rm -rf "$NODE_DIR"
    mv "$NODE_TEMP" "$NODE_DIR"
    node_valid || { printf 'Node.js runtime validation failed\n' >&2; exit 1; }
  fi
  release_lock "$NODE_LOCK"
fi

promptfoo_valid() {
  local executable="$PROMPTFOO_DIR/node_modules/.bin/promptfoo"
  [[ -x "$executable" && -f "$PROMPTFOO_DIR/.aibeat-runtime" ]] &&
    [[ "$(cat "$PROMPTFOO_DIR/.aibeat-runtime")" == "promptfoo=$PROMPTFOO_VERSION sha512=$PROMPTFOO_SHA512 node=$NODE_VERSION" ]] &&
    PATH="$NODE_DIR/bin:$PATH" "$executable" --version >/dev/null 2>&1
}

if promptfoo_valid; then
  printf 'Reusing promptfoo %s from %s\n' "$PROMPTFOO_VERSION" "$PROMPTFOO_DIR"
else
  PROMPTFOO_LOCK="$PROMPTFOO_DIR.lock"
  acquire_lock "$PROMPTFOO_LOCK"
  if ! promptfoo_valid; then
    printf 'Installing promptfoo %s for %s\n' "$PROMPTFOO_VERSION" "$PLATFORM"
    PROMPTFOO_ARCHIVE="$DOWNLOAD_DIR/promptfoo-$PROMPTFOO_VERSION.tgz"
    download "$PROMPTFOO_URL" "$PROMPTFOO_ARCHIVE.tmp-$$"
    verify_digest SHA-512 "$PROMPTFOO_ARCHIVE.tmp-$$" "$PROMPTFOO_SHA512"
    mv "$PROMPTFOO_ARCHIVE.tmp-$$" "$PROMPTFOO_ARCHIVE"
    PROMPTFOO_TEMP="$PROMPTFOO_DIR.tmp-$$"
    rm -rf "$PROMPTFOO_TEMP"
    mkdir -p "$PROMPTFOO_TEMP"
    PATH="$NODE_DIR/bin:$PATH" "$NODE_DIR/bin/npm" install \
      --prefix "$PROMPTFOO_TEMP" "$PROMPTFOO_ARCHIVE" \
      --omit=optional --no-audit --no-fund
    printf 'promptfoo=%s sha512=%s node=%s\n' \
      "$PROMPTFOO_VERSION" "$PROMPTFOO_SHA512" "$NODE_VERSION" \
      > "$PROMPTFOO_TEMP/.aibeat-runtime"
    rm -rf "$PROMPTFOO_DIR"
    mv "$PROMPTFOO_TEMP" "$PROMPTFOO_DIR"
    promptfoo_valid || { printf 'promptfoo runtime validation failed\n' >&2; exit 1; }
  fi
  release_lock "$PROMPTFOO_LOCK"
fi

if [[ "$RUNTIME_ONLY" == "1" ]]; then
  printf 'Runtime ready in %s/runtime\n' "$CACHE_DIR"
  exit 0
fi

ENGINE_DIR="$INSTALL_DIR/versions/$PROMPTBEAT_VERSION/$PLATFORM"
mkdir -p "$ENGINE_DIR" "$BIN_DIR"

read_engine_checksum() {
  awk 'match($0, /[0-9a-fA-F]{64}/) { print tolower(substr($0, RSTART, RLENGTH)); exit }' "$1"
}

install_product() {
  local product="$1" engine_name="$2"
  local asset="${product}-${PROMPTBEAT_VERSION}-${PLATFORM}"
  local asset_url="$RELEASE_BASE/v${PROMPTBEAT_VERSION}/$asset"
  local engine="$ENGINE_DIR/$engine_name"
  local checksum="$ENGINE_DIR/$asset.sha256"
  local expected=""

  if [[ -x "$engine" && -f "$checksum" ]]; then
    expected="$(read_engine_checksum "$checksum")"
    if [[ ! "$expected" =~ ^[0-9a-f]{64}$ ]] ||
      [[ "$(sha256_file "$engine")" != "$expected" ]]; then
      expected=""
    fi
  fi

  if [[ -z "$expected" ]]; then
    download "$asset_url.sha256" "$checksum.tmp-$$"
    expected="$(read_engine_checksum "$checksum.tmp-$$")"
    [[ "$expected" =~ ^[0-9a-f]{64}$ ]] || {
      printf 'Invalid SHA-256 file for %s\n' "$asset" >&2
      exit 1
    }
    download "$asset_url" "$engine.tmp-$$"
    verify_digest SHA-256 "$engine.tmp-$$" "$expected"
    chmod 0755 "$engine.tmp-$$"
    mv "$engine.tmp-$$" "$engine"
    mv "$checksum.tmp-$$" "$checksum"
  else
    printf 'Reusing %s %s from %s\n' "$product" "$PROMPTBEAT_VERSION" "$engine"
  fi
}

install_product promptbeat promptbeat-go
install_product agentbeat agentbeat-go

cat > "$BIN_DIR/promptbeat.tmp-$$" <<WRAPPER
#!/usr/bin/env bash
set -euo pipefail
export PATH="$NODE_DIR/bin:$PROMPTFOO_DIR/node_modules/.bin:\$PATH"
export PROMPTFOO_CONFIG_DIR="\${PROMPTFOO_CONFIG_DIR:-$CACHE_DIR/promptfoo/config}"
export PROMPTFOO_LOG_DIR="\${PROMPTFOO_LOG_DIR:-$CACHE_DIR/promptfoo/logs}"
mkdir -p "\$PROMPTFOO_CONFIG_DIR" "\$PROMPTFOO_LOG_DIR"
exec "$ENGINE_DIR/promptbeat-go" "\$@"
WRAPPER
chmod 0755 "$BIN_DIR/promptbeat.tmp-$$"
mv "$BIN_DIR/promptbeat.tmp-$$" "$BIN_DIR/promptbeat"

cat > "$BIN_DIR/agentbeat.tmp-$$" <<WRAPPER
#!/usr/bin/env bash
set -euo pipefail
export PATH="$NODE_DIR/bin:$PROMPTFOO_DIR/node_modules/.bin:\$PATH"
export PROMPTFOO_CONFIG_DIR="\${PROMPTFOO_CONFIG_DIR:-$CACHE_DIR/promptfoo/config}"
export PROMPTFOO_LOG_DIR="\${PROMPTFOO_LOG_DIR:-$CACHE_DIR/promptfoo/logs}"
mkdir -p "\$PROMPTFOO_CONFIG_DIR" "\$PROMPTFOO_LOG_DIR"
exec "$ENGINE_DIR/agentbeat-go" "\$@"
WRAPPER
chmod 0755 "$BIN_DIR/agentbeat.tmp-$$"
mv "$BIN_DIR/agentbeat.tmp-$$" "$BIN_DIR/agentbeat"

printf 'AI Beat %s installed: %s, %s\n' "$PROMPTBEAT_VERSION" "$BIN_DIR/promptbeat" "$BIN_DIR/agentbeat"
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) printf 'Add %s to PATH to run promptbeat and agentbeat.\n' "$BIN_DIR" ;;
esac
