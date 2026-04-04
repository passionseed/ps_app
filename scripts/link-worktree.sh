#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/link-worktree.sh [options]

Link shared local-only files from the main repo into the current git worktree.

Options:
  --main-repo PATH            Explicit path to the main repo/worktree.
  --env-file NAME             Env file to link. Default: .env
  --node-modules MODE         One of: auto, install, link, skip. Default: auto
  --force                     Replace an existing local file/symlink at the target path.
  -h, --help                  Show this help text.

Modes:
  auto     Link the env file. For node_modules: do nothing if it already exists,
           otherwise run pnpm install.
  install  Link the env file, then run pnpm install for this worktree.
  link     Link the env file, then symlink node_modules from the main repo.
  skip     Link the env file only.

Examples:
  scripts/link-worktree.sh
  scripts/link-worktree.sh --node-modules link
  scripts/link-worktree.sh --main-repo /Users/me/dev/project --force
EOF
}

main_repo=""
env_file=".env"
node_modules_mode="auto"
force="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --main-repo)
      [[ $# -ge 2 ]] || { echo "Missing value for --main-repo" >&2; exit 1; }
      main_repo="$2"
      shift 2
      ;;
    --env-file)
      [[ $# -ge 2 ]] || { echo "Missing value for --env-file" >&2; exit 1; }
      env_file="$2"
      shift 2
      ;;
    --node-modules)
      [[ $# -ge 2 ]] || { echo "Missing value for --node-modules" >&2; exit 1; }
      node_modules_mode="$2"
      shift 2
      ;;
    --force)
      force="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

case "$node_modules_mode" in
  auto|install|link|skip) ;;
  *)
    echo "Invalid --node-modules mode: $node_modules_mode" >&2
    exit 1
    ;;
esac

repo_root="$(git rev-parse --show-toplevel)"

if [[ -z "$main_repo" ]]; then
  main_repo="$(
    git worktree list --porcelain |
      awk '/^worktree / { print $2; exit }'
  )"
fi

if [[ -z "$main_repo" ]]; then
  echo "Unable to determine main repo path. Pass --main-repo explicitly." >&2
  exit 1
fi

main_repo="$(cd "$main_repo" && pwd)"

if [[ "$repo_root" == "$main_repo" ]]; then
  echo "Current directory is already the main repo: $repo_root"
  exit 0
fi

link_file() {
  local source_path="$1"
  local target_path="$2"

  if [[ ! -e "$source_path" ]]; then
    echo "Source file not found: $source_path" >&2
    exit 1
  fi

  if [[ -e "$target_path" || -L "$target_path" ]]; then
    if [[ "$force" != "true" ]]; then
      echo "Target already exists: $target_path (use --force to replace)" >&2
      exit 1
    fi
    rm -rf "$target_path"
  fi

  ln -s "$source_path" "$target_path"
  echo "Linked $(basename "$target_path") -> $source_path"
}

link_file "$main_repo/$env_file" "$repo_root/$env_file"

case "$node_modules_mode" in
  skip)
    ;;
  auto)
    if [[ -d "$repo_root/node_modules" ]]; then
      echo "node_modules already present in worktree; leaving as-is."
    else
      echo "node_modules missing; running pnpm install..."
      (cd "$repo_root" && pnpm install)
    fi
    ;;
  install)
    echo "Running pnpm install..."
    (cd "$repo_root" && pnpm install)
    ;;
  link)
    link_file "$main_repo/node_modules" "$repo_root/node_modules"
    ;;
esac

echo "Worktree local setup complete."
