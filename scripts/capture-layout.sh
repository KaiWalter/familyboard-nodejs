#!/usr/bin/env bash
# capture-layout.sh - Copy the most recent screenshot matching W-*.jpg into data/current-layout.jpg
# Usage: ./scripts/capture-layout.sh [source_dir]
# If source_dir not provided, defaults to $HOME/Pictures or current directory if that doesn't exist.
# Exits non-zero if no matching file found.
set -euo pipefail

SRC_DIR="${1:-}";
if [[ -z "$SRC_DIR" ]]; then
  if [[ -d "$HOME/Pictures" ]]; then
    SRC_DIR="$HOME/Pictures"
  else
    SRC_DIR="."
  fi
fi

if [[ ! -d "$SRC_DIR" ]]; then
  echo "Source directory not found: $SRC_DIR" >&2
  exit 2
fi

# Find newest file matching pattern W-*.jpg or W-*.JPG
latest_file=$(ls -1t "$SRC_DIR"/W-*.JPG "$SRC_DIR"/W-*.jpg 2>/dev/null | head -n 1 || true)

if [[ -z "$latest_file" ]]; then
  echo "No screenshot files matching W-*.jpg in $SRC_DIR" >&2
  exit 3
fi

mkdir -p data
cp -f "$latest_file" data/current-layout.jpg

echo "Copied: $latest_file -> data/current-layout.jpg"