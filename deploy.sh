#!/usr/bin/env bash
# Deploys to Cloudflare via wrangler with a unique SW cache version.
# Usage: ./deploy.sh locally, or set it as the deploy command in Cloudflare's git integration (Workers Builds).
# How: stamps git short SHA into public/sw.js CACHE (replacing the xxxxxxx placeholder), deploys, restores the file.
# Each deploy byte-changes sw.js, so clients reinstall the SW and re-cache all assets. No manual version bump needed.
set -euo pipefail
cd "$(dirname "$0")"

version=$(git rev-parse --short HEAD)
# Dirty tree = content HEAD doesn't describe; suffix a timestamp so the cache name can't repeat across such deploys
if ! git diff --quiet || ! git diff --cached --quiet; then
  version="${version}-$(date +%s)"
  echo "Working tree is dirty; using cache version with timestamp suffix."
fi

# Restore exact pre-deploy bytes on any exit (no git checkout: it would discard uncommitted edits)
backup_dir=$(mktemp -d)
cp public/sw.js public/index.html "$backup_dir/"
cleanup() { cp "$backup_dir/sw.js" public/sw.js; cp "$backup_dir/index.html" public/index.html; rm -rf "$backup_dir"; }
trap cleanup EXIT

# sed -i.bak (not -i '') is portable across BSD/macOS and GNU/Linux, incl. Cloudflare build agents
sed -i.bak "s/const CACHE = 'skribbl-solver-[^']*'/const CACHE = 'skribbl-solver-${version}'/" public/sw.js
sed -i.bak "s|<span class=\"build-sha\"[^>]*>[^<]*</span>|<span class=\"build-sha\" title=\"Deployed commit\">${version}</span>|" public/index.html
rm -f public/sw.js.bak public/index.html.bak
grep -q "skribbl-solver-${version}" public/sw.js || { echo "Failed to stamp cache version into public/sw.js" >&2; exit 1; }
grep -q ">${version}</span>" public/index.html || { echo "Failed to stamp build SHA into public/index.html footer" >&2; exit 1; }

echo "Deploying with cache version: skribbl-solver-${version}"
npx wrangler deploy
