#!/bin/zsh
set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"
if ! curl -fsS --max-time 2 http://127.0.0.1:4321/ >/dev/null 2>&1; then
  nohup node cocos-2d/scripts/start.mjs > cocos-2d/qa/server.log 2>&1 &
  for i in {1..30}; do
    if curl -fsS --max-time 1 http://127.0.0.1:4321/ >/dev/null 2>&1; then break; fi
    sleep 0.5
  done
fi
open http://127.0.0.1:4321/
