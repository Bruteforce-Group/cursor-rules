#!/usr/bin/env bash
set -euo pipefail

# Check object-detection latency/FPS/mAP/recall against tier budgets.
# Exits non-zero on any regression. Requires jq.
#
# Expected metrics JSON (example):
# {
#   "edge":      {"latency_ms": 95, "fps": 28, "map_05": 0.52, "recall": 0.81},
#   "enhanced":  {"latency_ms": 72, "fps": 32, "map_05": 0.61, "recall": 0.86},
#   "central":   {"latency_ms": 42, "fps": 48, "map_05": 0.66, "map_05_95": 0.41}
# }
#
# Defaults come from env; override with flags or env vars.

METRICS_PATH="${METRICS_PATH:-artifacts/object_detection_metrics.json}"

MAX_LATENCY_EDGE_MS="${MAX_LATENCY_EDGE_MS:-120}"
MIN_FPS_EDGE="${MIN_FPS_EDGE:-25}"
MIN_MAP_EDGE="${MIN_MAP_EDGE:-0.50}"
MIN_RECALL_EDGE="${MIN_RECALL_EDGE:-0.80}"

MAX_LATENCY_ENH_MS="${MAX_LATENCY_ENH_MS:-80}"
MIN_FPS_ENH="${MIN_FPS_ENH:-30}"
MIN_MAP_ENH="${MIN_MAP_ENH:-0.60}"
MIN_RECALL_ENH="${MIN_RECALL_ENH:-0.85}"

MAX_LATENCY_CENTRAL_MS="${MAX_LATENCY_CENTRAL_MS:-50}"
MIN_FPS_CENTRAL="${MIN_FPS_CENTRAL:-40}"
MIN_MAP_CENTRAL="${MIN_MAP_CENTRAL:-0.65}"
MIN_MAP_CENTRAL_COCO="${MIN_MAP_CENTRAL_COCO:-0.40}"

usage() {
  cat <<'EOF'
Usage: check_object_detection_budgets.sh [-m metrics.json]
  -m PATH   Path to metrics JSON (default: artifacts/object_detection_metrics.json or $METRICS_PATH)
Env/flags override thresholds:
  MAX_LATENCY_EDGE_MS, MIN_FPS_EDGE, MIN_MAP_EDGE, MIN_RECALL_EDGE
  MAX_LATENCY_ENH_MS,  MIN_FPS_ENH, MIN_MAP_ENH, MIN_RECALL_ENH
  MAX_LATENCY_CENTRAL_MS, MIN_FPS_CENTRAL, MIN_MAP_CENTRAL, MIN_MAP_CENTRAL_COCO
EOF
}

while getopts "m:h" opt; do
  case "$opt" in
    m) METRICS_PATH="$OPTARG" ;;
    h) usage; exit 0 ;;
    *) usage; exit 1 ;;
  esac
done

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but not installed." >&2
  exit 1
fi

if [ ! -f "$METRICS_PATH" ]; then
  echo "Metrics file not found: $METRICS_PATH" >&2
  exit 1
fi

failures=()

check_tier() {
  local tier="$1" latency budget_latency fps budget_fps map budget_map recall budget_recall extra_map extra_budget_map
  latency=$(jq -er --arg tier "$tier" '.[$tier].latency_ms' "$METRICS_PATH") || failures+=("missing latency_ms for $tier")
  fps=$(jq -er --arg tier "$tier" '.[$tier].fps' "$METRICS_PATH") || failures+=("missing fps for $tier")
  map=$(jq -er --arg tier "$tier" '.[$tier].map_05' "$METRICS_PATH") || failures+=("missing map_05 for $tier")
  recall=$(jq -er --arg tier "$tier" '.[$tier].recall' "$METRICS_PATH" 2>/dev/null || echo "") # recall optional for central

  case "$tier" in
    edge)
      budget_latency="$MAX_LATENCY_EDGE_MS"; budget_fps="$MIN_FPS_EDGE"; budget_map="$MIN_MAP_EDGE"; budget_recall="$MIN_RECALL_EDGE"
      ;;
    enhanced)
      budget_latency="$MAX_LATENCY_ENH_MS"; budget_fps="$MIN_FPS_ENH"; budget_map="$MIN_MAP_ENH"; budget_recall="$MIN_RECALL_ENH"
      ;;
    central)
      budget_latency="$MAX_LATENCY_CENTRAL_MS"; budget_fps="$MIN_FPS_CENTRAL"; budget_map="$MIN_MAP_CENTRAL"; extra_budget_map="$MIN_MAP_CENTRAL_COCO"
      extra_map=$(jq -er --arg tier "$tier" '.[$tier].map_05_95' "$METRICS_PATH" 2>/dev/null || echo "")
      ;;
    *) failures+=("unknown tier $tier"); return ;;
  esac

  if (( $(echo "$latency > $budget_latency" | bc -l) )); then
    failures+=("$tier latency_ms $latency > budget $budget_latency")
  fi
  if (( $(echo "$fps < $budget_fps" | bc -l) )); then
    failures+=("$tier fps $fps < budget $budget_fps")
  fi
  if (( $(echo "$map < $budget_map" | bc -l) )); then
    failures+=("$tier map_05 $map < budget $budget_map")
  fi
  if [ -n "${budget_recall:-}" ] && [ -n "$recall" ]; then
    if (( $(echo "$recall < $budget_recall" | bc -l) )); then
      failures+=("$tier recall $recall < budget $budget_recall")
    fi
  fi
  if [ -n "${extra_budget_map:-}" ] && [ -n "$extra_map" ]; then
    if (( $(echo "$extra_map < $extra_budget_map" | bc -l) )); then
      failures+=("$tier map_05_95 $extra_map < budget $extra_budget_map")
    fi
  fi
}

check_tier "edge"
check_tier "enhanced"
check_tier "central"

if [ "${#failures[@]}" -gt 0 ]; then
  printf "Budget check FAILED:\n"
  printf " - %s\n" "${failures[@]}"
  exit 1
fi

echo "Budget check PASSED for file: $METRICS_PATH"
