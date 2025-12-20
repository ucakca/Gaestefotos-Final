#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

src_dir="$repo_root/scripts/git-hooks"
dst_dir="$repo_root/.git/hooks"

mkdir -p "$dst_dir"

install_one() {
  local name="$1"
  local src="$src_dir/$name"
  local dst="$dst_dir/$name"

  if [ ! -f "$src" ]; then
    echo "Missing hook: $src" >&2
    exit 1
  fi

  cp "$src" "$dst"
  chmod +x "$dst"
  echo "Installed $name -> $dst"
}

chmod +x "$src_dir/pre-push"
install_one pre-push

echo "Done. Git hooks installed for this repo."
