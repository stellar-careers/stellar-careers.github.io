#!/usr/bin/env bash
# update-blog-cards.sh
#
# Reads the first 2 articles from docs/blog/index.html
# and rebuilds the Blog section in docs/index.html.
#
# Usage: bash .claude/skills/update-homepage-blog/scripts/update-blog-cards.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

BLOG_INDEX="$ROOT/docs/blog/index.html"
HOME_INDEX="$ROOT/docs/index.html"
CARD_COUNT=2

if [[ ! -f "$BLOG_INDEX" ]]; then
  echo "Error: $BLOG_INDEX not found" >&2
  exit 1
fi
if [[ ! -f "$HOME_INDEX" ]]; then
  echo "Error: $HOME_INDEX not found" >&2
  exit 1
fi

# Extract hrefs (e.g. "../blog/lHJC6vQA")
hrefs=()
while IFS= read -r line; do
  hrefs+=("$line")
done < <(grep -o 'href="\.\./blog/[^"]*" class="link sd appear blog-list-card"' "$BLOG_INDEX" \
  | sed 's/href="\.\.\/blog\///;s/" class=.*//' \
  | head -n "$CARD_COUNT")

# Extract titles
titles=()
while IFS= read -r line; do
  titles+=("$line")
done < <(grep -o '<p class="text sd appear blog-list-card-title[^"]*">[^<]*</p>' "$BLOG_INDEX" \
  | sed 's/<p[^>]*>//;s/<\/p>//' \
  | head -n "$CARD_COUNT")

# Extract excerpts
excerpts=()
while IFS= read -r line; do
  excerpts+=("$line")
done < <(grep -o '<p class="text sd appear blog-list-card-excerpt[^"]*">[^<]*</p>' "$BLOG_INDEX" \
  | sed 's/<p[^>]*>//;s/<\/p>//' \
  | head -n "$CARD_COUNT")

# Extract images and convert _middle -> _small for homepage
imgs=()
while IFS= read -r line; do
  imgs+=("$line")
done < <(grep -o '<img class="sd[^"]*blog-list-card-img" alt="" src="[^"]*"' "$BLOG_INDEX" \
  | sed 's/.*src="\.\.\///;s/"$//;s/_middle\.webp$/_small.webp/' \
  | head -n "$CARD_COUNT")

count=${#hrefs[@]}
if [[ $count -eq 0 ]]; then
  echo "Error: no articles found in $BLOG_INDEX" >&2
  exit 1
fi
if [[ $count -lt $CARD_COUNT ]]; then
  echo "Warning: found only $count articles (expected at least $CARD_COUNT)" >&2
fi

echo "Selected $count articles for homepage Blog section:"

# Build cards HTML
cards=""
for ((i = 0; i < count; i++)); do
  id="${hrefs[$i]}"
  echo "  $((i + 1)). [$id] ${titles[$i]}"
  cards+="<a href=\"blog/$id\" target=\"_blank\" class=\"link sd appear blog-card\">
            <div class=\"sd appear blog-card-content\">
              <h3 class=\"text sd appear blog-card-title r116\">${titles[$i]}</h3>
              <p class=\"text sd appear blog-card-excerpt r117\">${excerpts[$i]}</p>
            </div><img class=\"sd blog-card-img\" alt=\"\" src=\"${imgs[$i]}\">
          </a>"
done

blog_html="<ul class=\"sd appear blog-list\">${cards}</ul>"

# Write to a temp file for perl replacement
tmpfile=$(mktemp)
printf '%s' "$blog_html" > "$tmpfile"

# Replace blog list block in index.html using perl for multiline match
perl -0777 -i -pe '
  BEGIN {
    local $/;
    open my $fh, "<", "'"$tmpfile"'" or die;
    $replacement = <$fh>;
    close $fh;
  }
  s{<ul class="sd appear blog-list">.*?</a></ul>}{$replacement}s
' "$HOME_INDEX"

rm -f "$tmpfile"

echo "Updated docs/index.html Blog section successfully."
