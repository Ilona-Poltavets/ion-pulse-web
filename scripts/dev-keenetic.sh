#!/usr/bin/env bash
set -euo pipefail

web_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
api_dir="$(cd "$web_dir/../ion-pulse-api" && pwd)"
public_origin="${ION_PULSE_KEENETIC_ORIGIN:-http://games-service.ion-pulse.keenetic.pro}"
api_port="${ION_PULSE_KEENETIC_API_PORT:-8030}"

if [[ ! -x "$api_dir/.venv/bin/uvicorn" ]]; then
  echo "API environment is missing: $api_dir/.venv/bin/uvicorn" >&2
  exit 1
fi

cleanup() {
  if [[ -n "${api_pid:-}" ]]; then
    kill "$api_pid" 2>/dev/null || true
    wait "$api_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

cd "$api_dir"
ION_PULSE_SITE_URL="$public_origin" \
  "$api_dir/.venv/bin/uvicorn" ion_pulse.main:app \
  --host 127.0.0.1 --port "$api_port" --proxy-headers &
api_pid=$!

cd "$web_dir"
ION_PULSE_PROXY_TARGET="http://127.0.0.1:$api_port" \
VITE_API_URL=same-origin \
  "$web_dir/node_modules/.bin/vite" --host 0.0.0.0 --port 3030
