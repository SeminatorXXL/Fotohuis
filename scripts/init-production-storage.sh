#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

ensure_dir() {
  mkdir -p "$1"
}

seed_dir_if_empty() {
  src_dir=$1
  dest_dir=$2

  ensure_dir "$dest_dir"

  if [ -d "$src_dir" ] && [ -z "$(ls -A "$dest_dir" 2>/dev/null)" ]; then
    cp -a "$src_dir"/. "$dest_dir"/
    echo "Seeded: $dest_dir"
  else
    echo "Skipped seed: $dest_dir"
  fi
}

ensure_dir "$ROOT_DIR/storage/media"
ensure_dir "$ROOT_DIR/storage/media-webp"
ensure_dir "$ROOT_DIR/storage/images"
ensure_dir "$ROOT_DIR/letsencrypt"

if [ ! -f "$ROOT_DIR/letsencrypt/acme.json" ]; then
  touch "$ROOT_DIR/letsencrypt/acme.json"
fi

chmod 600 "$ROOT_DIR/letsencrypt/acme.json"

seed_dir_if_empty "$ROOT_DIR/public/media" "$ROOT_DIR/storage/media"
seed_dir_if_empty "$ROOT_DIR/public/media-webp" "$ROOT_DIR/storage/media-webp"
seed_dir_if_empty "$ROOT_DIR/public/images" "$ROOT_DIR/storage/images"

echo "Production storage initialized."
