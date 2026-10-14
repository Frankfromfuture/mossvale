#!/bin/zsh
set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
EDITOR_APP="$HOME/Applications/CocosCreator-3.8.8/CocosCreator.app"
if [[ ! -d "$EDITOR_APP" ]]; then
  echo "找不到 Cocos Creator 3.8.8：$EDITOR_APP"
  exit 1
fi
open "$EDITOR_APP" --args --project "$PROJECT_DIR"
