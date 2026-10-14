#!/bin/zsh
cd "${0:A:h}"
if ! curl -fsS http://127.0.0.1:4317/ >/dev/null 2>&1; then
  if [[ ! -f dist/index.html ]]; then
    npm run build || exit 1
  fi
  npm start &
  service_pid=$!
  for attempt in {1..40}; do
    curl -fsS http://127.0.0.1:4317/ >/dev/null 2>&1 && break
    sleep 0.5
  done
fi
open 'http://127.0.0.1:4317/'
if [[ -n "$service_pid" ]]; then wait "$service_pid"; fi
