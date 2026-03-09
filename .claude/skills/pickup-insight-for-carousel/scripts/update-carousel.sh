#!/usr/bin/env bash
# update-carousel.sh
#
# Reads the first 6 articles from docs/insight/index.html
# and rebuilds the insight carousel in docs/index.html.
#
# Usage: bash .claude/skills/pickup-insight-for-carousel/scripts/update-carousel.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

INSIGHT_INDEX="$ROOT/docs/insight/index.html"
HOME_INDEX="$ROOT/docs/index.html"
SLIDE_COUNT=6

if [[ ! -f "$INSIGHT_INDEX" ]]; then
  echo "Error: $INSIGHT_INDEX not found" >&2
  exit 1
fi
if [[ ! -f "$HOME_INDEX" ]]; then
  echo "Error: $HOME_INDEX not found" >&2
  exit 1
fi

# Extract IDs
ids=()
while IFS= read -r line; do
  ids+=("$line")
done < <(grep -o 'href="\.\./insight/[^"]*" class="link sd appear insight-cat-card"' "$INSIGHT_INDEX" \
  | sed 's/href="\.\.\/insight\///;s/" class=.*//' \
  | head -n "$SLIDE_COUNT")

# Extract titles
titles=()
while IFS= read -r line; do
  titles+=("$line")
done < <(grep -o '<h3 class="text sd appear insight-cat-card-title[^"]*">[^<]*</h3>' "$INSIGHT_INDEX" \
  | sed 's/<h3[^>]*>//;s/<\/h3>//' \
  | head -n "$SLIDE_COUNT")

# Extract images and convert _small -> _middle
imgs=()
while IFS= read -r line; do
  imgs+=("$line")
done < <(grep -o '<img class="sd insight-cat-card-img" alt="" src="[^"]*"' "$INSIGHT_INDEX" \
  | sed 's/.*src="\.\.\///;s/"$//;s/_small\.webp$/_middle.webp/' \
  | head -n "$SLIDE_COUNT")

count=${#ids[@]}
if [[ $count -eq 0 ]]; then
  echo "Error: no articles found in $INSIGHT_INDEX" >&2
  exit 1
fi
if [[ $count -lt $SLIDE_COUNT ]]; then
  echo "Warning: found only $count articles (expected at least $SLIDE_COUNT)" >&2
fi

echo "Selected $count articles for carousel:"

# Build slides HTML
slides=""
for ((i = 0; i < count; i++)); do
  echo "  $((i + 1)). [${ids[$i]}] ${titles[$i]}"
  slides+="<a href=\"insight/${ids[$i]}\" class=\"link sd appear insight-carousel-slide\">
            <div class=\"sd appear insight-carousel-card\"><img class=\"sd insight-carousel-img\" alt=\"\" src=\"${imgs[$i]}\">
              <p class=\"text sd appear insight-carousel-caption\">${titles[$i]}</p>
            </div>
          </a>"
done

carousel_html="<div data-type=\"carousel\" class=\"sd appear insight-carousel\">${slides}</div>"

# Write carousel to a temp file for perl replacement
tmpfile=$(mktemp)
printf '%s' "$carousel_html" > "$tmpfile"

# Replace carousel block in index.html using perl for multiline match
perl -0777 -i -pe '
  BEGIN {
    local $/;
    open my $fh, "<", "'"$tmpfile"'" or die;
    $replacement = <$fh>;
    close $fh;
  }
  s{<div data-type="carousel" class="sd appear[^"]*insight-carousel">.*?</a></div>}{$replacement}s
' "$HOME_INDEX"

rm -f "$tmpfile"

echo "Updated docs/index.html carousel successfully."
