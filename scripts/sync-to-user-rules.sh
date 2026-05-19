#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_DIR="$REPO_ROOT/.cursor/rules"
TARGET_DIR="${HOME}/.cursor/rules"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--dry-run] [--force] [--list]

Sync rules from the cursor-rules repo to ~/.cursor/rules/ (user-level).

Options:
  --dry-run   Show what would be copied without making changes
  --force     Overwrite target files without prompting
  --list      List source rules and their apply mode, then exit
  -h, --help  Show this help message

Source: $SOURCE_DIR
Target: $TARGET_DIR
EOF
  exit 0
}

DRY_RUN=false
FORCE=false
LIST_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)  DRY_RUN=true ;;
    --force)    FORCE=true ;;
    --list)     LIST_ONLY=true ;;
    -h|--help)  usage ;;
    *) echo "Unknown option: $arg"; usage ;;
  esac
done

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "ERROR: Source directory not found: $SOURCE_DIR"
  exit 1
fi

get_apply_mode() {
  local file="$1"
  if grep -q 'alwaysApply: true' "$file" 2>/dev/null; then
    echo "always-apply"
  else
    echo "on-demand"
  fi
}

if $LIST_ONLY; then
  printf "%-30s %s\n" "RULE" "MODE"
  printf "%-30s %s\n" "----" "----"
  for f in "$SOURCE_DIR"/*.mdc; do
    name="$(basename "$f")"
    mode="$(get_apply_mode "$f")"
    printf "%-30s %s\n" "$name" "$mode"
  done
  exit 0
fi

mkdir -p "$TARGET_DIR"

copied=0
skipped=0
unchanged=0

for src_file in "$SOURCE_DIR"/*.mdc; do
  name="$(basename "$src_file")"
  dst_file="$TARGET_DIR/$name"

  if [[ -f "$dst_file" ]]; then
    if diff -q "$src_file" "$dst_file" > /dev/null 2>&1; then
      unchanged=$((unchanged + 1))
      continue
    fi

    if $DRY_RUN; then
      echo "[dry-run] Would update: $name"
      copied=$((copied + 1))
      continue
    fi

    if ! $FORCE; then
      echo "Target exists and differs: $name"
      echo "  Source: $src_file"
      echo "  Target: $dst_file"
      read -rp "  Overwrite? [y/N] " answer
      if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
        skipped=$((skipped + 1))
        continue
      fi
    fi
  else
    if $DRY_RUN; then
      echo "[dry-run] Would copy: $name"
      copied=$((copied + 1))
      continue
    fi
  fi

  cp "$src_file" "$dst_file"
  echo "Synced: $name"
  copied=$((copied + 1))
done

echo ""
echo "Sync complete: $copied synced, $unchanged unchanged, $skipped skipped"
echo "Target: $TARGET_DIR"
