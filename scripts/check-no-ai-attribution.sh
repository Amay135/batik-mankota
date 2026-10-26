#!/usr/bin/env bash
# Gagal bila commit memuat atribusi alat AI, baik di pesan maupun di email identitas.
# Pemakaian: bash scripts/check-no-ai-attribution.sh [RENTANG]
# Tanpa RENTANG = semua commit yang terjangkau (dipakai untuk push pertama).
set -u

range="${1:-}"
if [ -n "$range" ]; then
  commits=$(git rev-list "$range") || { echo "Rentang tidak valid: $range" >&2; exit 2; }
else
  commits=$(git rev-list --all)
fi

[ -z "$commits" ] && exit 0

# noreply@anthropic.com sudah tercakup oleh kata "anthropic".
pattern='^co-authored-by:.*(claude|anthropic)|^claude-session:|generated with .*claude code|^🤖 generated with'

status=0
for sha in $commits; do
  message=$(git log -1 --format=%B "$sha")
  bad=$(printf '%s\n' "$message" | grep -Ei "$pattern")
  if [ -n "$bad" ]; then
    printf '%s: pesan commit memuat atribusi alat AI:\n%s\n' "$sha" "$bad" >&2
    status=1
  fi

  emails=$(git log -1 --format='%ae %ce' "$sha")
  low=$(printf '%s' "$emails" | tr '[:upper:]' '[:lower:]')
  case "$low" in
    *anthropic*)
      printf '%s: identitas commit memakai email anthropic: %s\n' "$sha" "$emails" >&2
      status=1
      ;;
  esac
done

exit "$status"
