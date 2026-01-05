#!/usr/bin/env bash
set -euo pipefail

# Bench runner stub for object detection. Replace BENCH_CMD with your actual benchmark.
# This script must write the metrics JSON to the output path passed as $1.
#
# Usage: scripts/bench_command.sh OUTPUT_JSON
# Env:
#   BENCH_CMD  Required. Benchmark command to run. If it contains "{{OUTPUT}}",
#              it will be templated with the output path. Otherwise stdout is
#              captured to the output path.
#
# Expected JSON schema (example):
# {
#   "edge":     {"latency_ms": 95, "fps": 28, "map_05": 0.52, "recall": 0.81},
#   "enhanced": {"latency_ms": 72, "fps": 32, "map_05": 0.61, "recall": 0.86},
#   "central":  {"latency_ms": 42, "fps": 48, "map_05": 0.66, "map_05_95": 0.41}
# }

OUTPUT="${1:-}"
if [ -z "$OUTPUT" ]; then
  echo "Usage: $0 OUTPUT_JSON" >&2
  exit 1
fi

if [ ! -d "$(dirname "$OUTPUT")" ]; then
  mkdir -p "$(dirname "$OUTPUT")"
fi

CMD="${BENCH_CMD:-}"
if [ -z "$CMD" ]; then
  cat >&2 <<'EOF'
BENCH_CMD is required. Set it to the benchmark command that produces metrics JSON.
Examples:
  BENCH_CMD="python tools/bench_detect.py --config configs/yolo.yaml --output {{OUTPUT}}"
  BENCH_CMD="poetry run python bench.py --save-json {{OUTPUT}}"
EOF
  exit 1
fi

if [[ "$CMD" == *"{{OUTPUT}}"* ]]; then
  CMD="${CMD//\{\{OUTPUT\}\}/$OUTPUT}"
  echo "Running benchmark (templated output): $CMD"
  if ! bash -lc "$CMD"; then
    echo "Benchmark command failed." >&2
    exit 1
  fi
else
  echo "Running benchmark (stdout captured): $CMD"
  TMP="$(mktemp)"
  if ! bash -lc "$CMD" > "$TMP"; then
    echo "Benchmark command failed." >&2
    rm -f "$TMP"
    exit 1
  fi
  mv "$TMP" "$OUTPUT"
fi

if [ ! -s "$OUTPUT" ]; then
  echo "Benchmark did not produce metrics at $OUTPUT" >&2
  exit 1
fi

echo "Benchmark metrics written to $OUTPUT"
