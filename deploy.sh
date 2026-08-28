#!/usr/bin/env bash
# Deploys to Cloudflare via wrangler with a unique SW cache version.
# Usage: ./deploy.sh locally, or set it as the deploy command in Cloudflare's git integration (Workers Builds).
# How: stamps git short SHA into public/sw.js CACHE (replacing the xxxxxxx placeholder), deploys, restores the file.
# Each deploy byte-changes sw.js, so clients reinstall the SW and re-cache all assets. No manual version bump needed.
# Also stamps sitemap <lastmod> and the JSON-LD dateModified from each page's own last commit date.
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
cp public/sw.js public/index.html public/sitemap.xml "$backup_dir/"
cleanup() {
  cp "$backup_dir/sw.js" public/sw.js
  cp "$backup_dir/index.html" public/index.html
  cp "$backup_dir/sitemap.xml" public/sitemap.xml
  rm -rf "$backup_dir"
}
trap cleanup EXIT

# sed -i.bak (not -i '') is portable across BSD/macOS and GNU/Linux, incl. Cloudflare build agents
sed -i.bak "s/const CACHE = 'skribbl-solver-[^']*'/const CACHE = 'skribbl-solver-${version}'/" public/sw.js
sed -i.bak "s|<span class=\"build-sha\"[^>]*>[^<]*</span>|<span class=\"build-sha\" title=\"Deployed commit\">${version}</span>|" public/index.html
rm -f public/sw.js.bak public/index.html.bak
grep -q "skribbl-solver-${version}" public/sw.js || { echo "Failed to stamp cache version into public/sw.js" >&2; exit 1; }
grep -q ">${version}</span>" public/index.html || { echo "Failed to stamp build SHA into public/index.html footer" >&2; exit 1; }

# Freshness dates: each page's own last commit date, not the deploy date. Search engines discount a
# <lastmod> that always reads "today", and a deploy that didn't touch privacy.html didn't change it.
site="https://skribbl.cpwillis.dev"
lastmod_map=""
for page in index terms privacy; do
  file="public/${page}.html"
  commit_date=$(git log -1 --format=%cs -- "$file")
  [ -n "$commit_date" ] || continue
  [ "$page" = index ] && url="${site}/" || url="${site}/${page}.html"
  lastmod_map="${lastmod_map}${url}|${commit_date}|"
done

# awk, not sed: <lastmod> is keyed on the <loc> above it, and multi-line sed is not portable
awk -v map="$lastmod_map" '
  BEGIN { n = split(map, a, "|"); for (i = 1; i < n; i += 2) d[a[i]] = a[i + 1] }
  match($0, /<loc>[^<]*<\/loc>/) { cur = substr($0, RSTART + 5, RLENGTH - 11) }
  /<lastmod>/ && (cur in d) { sub(/<lastmod>[^<]*<\/lastmod>/, "<lastmod>" d[cur] "</lastmod>") }
  { print }
' public/sitemap.xml > "$backup_dir/sitemap.new" && mv "$backup_dir/sitemap.new" public/sitemap.xml

index_date=$(git log -1 --format=%cs -- public/index.html)
sed -i.bak "s|\"dateModified\": \"[^\"]*\"|\"dateModified\": \"${index_date}\"|" public/index.html
rm -f public/index.html.bak
grep -q "\"dateModified\": \"${index_date}\"" public/index.html || { echo "Failed to stamp dateModified into public/index.html" >&2; exit 1; }
grep -q "<lastmod>${index_date}</lastmod>" public/sitemap.xml || { echo "Failed to stamp lastmod into public/sitemap.xml" >&2; exit 1; }

echo "Deploying with cache version: skribbl-solver-${version}"
npx wrangler deploy
