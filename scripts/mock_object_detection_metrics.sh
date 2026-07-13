#!/usr/bin/env bash
set -euo pipefail

# Mock benchmark output with realistic-ish metrics for three tiers.
# Usage: scripts/mock_object_detection_metrics.sh OUTPUT_JSON

OUT="${1:-}"
if [ -z "$OUT" ]; then
  echo "Usage: $0 OUTPUT_JSON" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"

cat > "$OUT" <<'EOF'
{
  "edge": {
    "latency_ms": 110,
    "fps": 26,
    "map_05": 0.53,
    "recall": 0.82
  },
  "enhanced": {
    "latency_ms": 65,
    "fps": 38,
    "map_05": 0.62,
    "recall": 0.87
  },
  "central": {
    "latency_ms": 28,
    "fps": 65,
    "map_05": 0.68,
    "map_05_95": 0.43
  }
}
EOF

echo "Mock metrics written to $OUT"
