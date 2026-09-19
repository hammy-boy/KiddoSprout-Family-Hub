#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
APP_ROOT=$(CDPATH= cd -- "$PROJECT_DIR/.." && pwd)
VERSION=${VERSION:-0.1.0}
GO_BIN=${GO_BIN:-}
GOCACHE=${GOCACHE:-/tmp/kiddosprout-go-cache}
GOMODCACHE=${GOMODCACHE:-/tmp/kiddosprout-go-modcache}
GOPATH=${GOPATH:-/tmp/kiddosprout-go-path}
export GOCACHE GOMODCACHE GOPATH

if [ -z "$GO_BIN" ]; then
  GO_BIN=$(command -v go || true)
fi
if [ -z "$GO_BIN" ] || [ ! -x "$GO_BIN" ]; then
  echo "Go is required. Set GO_BIN to a Go 1.27+ executable." >&2
  exit 1
fi
case "$VERSION" in
  ''|*[!0-9A-Za-z._-]*)
    echo "VERSION must contain only letters, numbers, dots, underscores, or hyphens." >&2
    exit 1
    ;;
esac
if ! command -v zip >/dev/null 2>&1; then
  echo "The zip command is required to create the Windows downloads." >&2
  exit 1
fi

mkdir -p "$PROJECT_DIR/dist"
STAGE_ROOT=$(mktemp -d "$PROJECT_DIR/.kiddosprout-windows-build.XXXXXX")
trap 'rm -rf "$STAGE_ROOT"' EXIT HUP INT TERM

build_package() {
  architecture=$1
  label=$2
  display_architecture=$3
  package_dir="$STAGE_ROOT/$label"
  mkdir -p "$package_dir/browser-extension" "$package_dir/Source/windows-blocker" "$package_dir/Source/kiddosprout_blocker"

  CGO_ENABLED=0 GOOS=windows GOARCH="$architecture" "$GO_BIN" build \
    -buildvcs=false \
    -trimpath \
    -ldflags="-s -w -H windowsgui -X main.version=$VERSION" \
    -o "$package_dir/KiddoSproutBlocker.exe" \
    ./cmd/kiddosprout-blocker

  sed \
    -e "s/@VERSION@/$VERSION/g" \
    -e "s/@ARCHITECTURE@/$display_architecture/g" \
    "$PROJECT_DIR/packaging/START HERE.txt" > "$package_dir/START HERE.txt"
  for extension_file in blocked.html blocked.js content.js icon128.png manifest.json popup.html; do
    cp "$APP_ROOT/kiddosprout_blocker/$extension_file" "$package_dir/browser-extension/$extension_file"
    cp "$APP_ROOT/kiddosprout_blocker/$extension_file" "$package_dir/Source/kiddosprout_blocker/$extension_file"
  done

  cp -R "$PROJECT_DIR/cmd" "$PROJECT_DIR/internal" "$package_dir/Source/windows-blocker/"
  cp "$PROJECT_DIR/go.mod" "$PROJECT_DIR/README.md" "$package_dir/Source/windows-blocker/"
  mkdir -p "$package_dir/Source/windows-blocker/scripts" "$package_dir/Source/windows-blocker/packaging"
  cp "$PROJECT_DIR/scripts/build.sh" "$package_dir/Source/windows-blocker/scripts/build.sh"
  cp "$PROJECT_DIR/packaging/START HERE.txt" "$package_dir/Source/windows-blocker/packaging/START HERE.txt"

  cat > "$package_dir/BUILD-INFO.txt" <<EOF
KiddoSprout Blocker for Windows
Version: $VERSION
Architecture: $display_architecture
Minimum Windows: Windows 10
Executable signature: unsigned colleague-test build
Go toolchain: $($GO_BIN version)
Build command: CGO_ENABLED=0 GOOS=windows GOARCH=$architecture go build -buildvcs=false -trimpath -ldflags="-s -w -H windowsgui -X main.version=$VERSION"
Source revision: working-tree source included; no clean Git revision is asserted
Build script: Source/windows-blocker/scripts/build.sh
Core source: Source/windows-blocker/cmd and Source/windows-blocker/internal

SHA256SUMS.txt verifies the integrity of every other file in this extracted folder.
The separate dist/SHA256SUMS.txt verifies the integrity of the downloadable ZIP.
EOF

  (
    cd "$package_dir"
    find . -type f ! -name SHA256SUMS.txt -print | LC_ALL=C sort | while IFS= read -r packaged_file; do
      checksum=$(shasum -a 256 "$packaged_file" | awk '{print $1}')
      printf '%s  %s\n' "$checksum" "${packaged_file#./}"
    done > SHA256SUMS.txt
    shasum -a 256 -c SHA256SUMS.txt >/dev/null
  )

  (
    cd "$package_dir"
    zip -q -r -X "$STAGE_ROOT/KiddoSproutBlocker-Windows-$label.zip" .
  )
}

cd "$PROJECT_DIR"
"$GO_BIN" test ./...

build_package amd64 x64 x64
build_package arm64 arm64 ARM64

(
  cd "$STAGE_ROOT"
  shasum -a 256 KiddoSproutBlocker-Windows-x64.zip KiddoSproutBlocker-Windows-arm64.zip > SHA256SUMS.txt
)

# Do not remove the published downloads at the beginning of a rebuild. Move
# complete replacements into dist only after both architectures and their
# checksums have succeeded, so Docker's file watcher never observes a missing
# or partially written artifact.
mv -f "$STAGE_ROOT/KiddoSproutBlocker-Windows-x64.zip" "$PROJECT_DIR/dist/KiddoSproutBlocker-Windows-x64.zip"
mv -f "$STAGE_ROOT/KiddoSproutBlocker-Windows-arm64.zip" "$PROJECT_DIR/dist/KiddoSproutBlocker-Windows-arm64.zip"
mv -f "$STAGE_ROOT/SHA256SUMS.txt" "$PROJECT_DIR/dist/SHA256SUMS.txt"

echo "Created Windows x64 and ARM64 KiddoSprout blocker downloads in $PROJECT_DIR/dist"
