#!/usr/bin/env bash
set -euo pipefail

# Runs the object detection benchmark command and writes metrics JSON for budget checks.
# Requires either:
#   - --cmd "your command" (or BENCH_CMD env)
#   - executable scripts/bench_command.sh (used if --cmd/BENCH_CMD not provided)
#
# The benchmark command must write metrics JSON to stdout or to the path given by --output.
# Expected schema (example):
# {
#   "edge":     {"latency_ms": 95, "fps": 28, "map_05": 0.52, "recall": 0.81},
#   "enhanced": {"latency_ms": 72, "fps": 32, "map_05": 0.61, "recall": 0.86},
#   "central":  {"latency_ms": 42, "fps": 48, "map_05": 0.66, "map_05_95": 0.41}
# }
#
# The script copies stdout to the output file if the command does not write it itself.

OUTPUT="${METRICS_PATH:-artifacts/object_detection_metrics.json}"
CMD="${BENCH_CMD:-}"

usage() {
  cat <<'EOF'
Usage: run_object_detection_benchmark.sh [--cmd "command"] [--output file]
  --cmd     Benchmark command to run (or set BENCH_CMD)
  --output  Path to metrics JSON file (default: artifacts/object_detection_metrics.json or $METRICS_PATH)
If --cmd/BENCH_CMD is not provided, scripts/bench_command.sh will be used if executable.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cmd) CMD="$2"; shift 2 ;;
    --output) OUTPUT="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if [ -z "$CMD" ]; then
  if [ -x scripts/bench_command.sh ]; then
    CMD="scripts/bench_command.sh"
  fi
fi

if [ -z "$CMD" ]; then
  echo "No benchmark command provided. Set --cmd or BENCH_CMD, or add scripts/bench_command.sh" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"

# Expand {{OUTPUT}} placeholder used by workflow BENCH_CMD templates
CMD="${CMD//\{\{OUTPUT\}\}/$OUTPUT}"

if [ "$CMD" = "scripts/bench_command.sh" ]; then
  # Expect the bench_command.sh to handle writing to OUTPUT or stdout
  echo "Running benchmark via $CMD"
  if ! "$CMD" "$OUTPUT"; then
    echo "Benchmark command failed." >&2
    exit 1
  fi
else
  echo "Running benchmark command: $CMD"
  # Capture stdout; if file not produced, write stdout to OUTPUT
  TMP_OUT="$(mktemp)"
  if ! bash -lc "$CMD" > "$TMP_OUT"; then
    echo "Benchmark command failed." >&2
    rm -f "$TMP_OUT"
    exit 1
  fi
  if [ -s "$OUTPUT" ]; then
    echo "Benchmark wrote metrics to $OUTPUT"
    rm -f "$TMP_OUT"
  else
    mv "$TMP_OUT" "$OUTPUT"
    echo "Metrics written to $OUTPUT from stdout"
  fi
fi

if [ ! -s "$OUTPUT" ]; then
  echo "Metrics file missing or empty at $OUTPUT" >&2
  exit 1
fi

echo "Benchmark completed; metrics at $OUTPUT"
