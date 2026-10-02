#!/bin/bash
# Refuse commits that add AWS account IDs, Route 53 hosted-zone IDs or personal email
# addresses to tracked files (PIA-035). Docs use placeholders such as <account> or role
# names instead. Paths in EXCLUDE hold addresses the application uses on purpose.
# usage: scripts/check-identifiers.sh [--staged]
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
EXCLUDE='^(src/data/|package-lock\.json$)'
if [ "${1:-}" = "--staged" ]; then
  files=$(git diff --cached --name-only --diff-filter=ACMR)
else
  files=$(git ls-files)
fi
[ -z "$files" ] && exit 0
pattern='arn:aws:[a-z0-9-]+:[a-z0-9-]*:[0-9]{12}:|[0-9]{12}\.dkr\.ecr\.|[Aa]ccount[^0-9A-Za-z]{1,6}[0-9]{12}([^0-9]|$)|hostedzone/Z[0-9A-Z]{8,}|HostedZoneId"?\s*[:=]\s*"?Z[0-9A-Z]{8,}|[Hh]osted[ -]?[Zz]one[^0-9A-Za-z]{1,6}Z[0-9A-Z]{8,}|`Z[0-9A-Z]{10,}`|[A-Za-z0-9._%+-]+@(gmail|yahoo|outlook|hotmail|proton)\.(com|me)'
hits=$(printf '%s\n' "$files" | grep -Ev "$EXCLUDE" | while read -r f; do
  [ -f "$f" ] && grep -EnHI "$pattern" "$f" 2>/dev/null | sed -E 's/[0-9]{12}/<12 digits>/g; s/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/<email>/g' || true
done)
if [ -n "$hits" ]; then
  echo "Committed identifiers found (replace with <account>, role names or placeholders):" >&2
  echo "$hits" | head -40 >&2
  exit 1
fi
