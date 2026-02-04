#!/usr/bin/env zsh
# build-copy.sh
# Copy selected project files into a build/ directory preserving paths.

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
BUILD_DIR="$ROOT_DIR/build"

# files to copy (relative to repo root)
files=(
  "index.html"
  "src/wsdk-v4.4.js"
  "src/main.js"
  "src/prsdk1.3.js"
  "src/iframesdk1.0.js"
  "game/index.html"
)

mkdir -p "$BUILD_DIR"

missing=()

for f in "${files[@]}"; do
  src="$ROOT_DIR/$f"
  if [[ ! -f "$src" ]]; then
    missing+=("$f")
    continue
  fi
  dest="$BUILD_DIR/$(dirname "$f")"
  mkdir -p "$dest"
  cp -p "$src" "$dest/"
  echo "copied: $f -> $dest/"
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "\nWarning: some files were not found and were not copied:" >&2
  for m in "${missing[@]}"; do echo "  - $m" >&2; done
  exit 2
fi

echo "\nAll files copied to $BUILD_DIR"
