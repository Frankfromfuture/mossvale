# 青苔镇 Mossvale · AI 剧本杀

当前版本 **0.8.15**（本地 / local） · [完整版本记录](../CHANGELOG.md)

当前剧本为《雾灯未眠》，包含六位可扮演的主角、场景搜证、AI 对话、语音和分角色存档。

[在线测试](https://www.iambrizo.com/mossvale/) · [项目介绍与启动方式](../README.md)

在本目录执行 `npm ci`、`npm run build`、`npm start`，或使用项目根目录的对应命令。本地服务默认监听 `127.0.0.1:4331`，存档位于 `.data/`。

`src/` 为前端，`server/` 为后端，`shared/` 为共用规则，`public/` 为正式素材。详细功能说明见 `docs/`，部署与回退记录见 `deploy/README.md`。

## English

Current version **0.8.15**（本地 / local） · [Full changelog](../CHANGELOG.md)

The current story, 《雾灯未眠》, includes six playable protagonists, scene investigation, AI dialogue, voice, and separate saves for each character. The game is currently in Chinese; the [project introduction](../README.md#english) is available in Chinese and English and also appears in the in-game About window.

[Play the preview](https://www.iambrizo.com/mossvale/) · [Introduction and setup](../README.md#english)

Run `npm ci`, `npm run build`, and `npm start` from this directory, or use the corresponding commands at the repository root. The local service listens on `127.0.0.1:4331` and keeps saves in `.data/`.

`src/` contains the frontend, `server/` the backend, `shared/` the shared rules, and `public/` the production assets. Gameplay and implementation notes are in `docs/`; deployment and rollback records are in `deploy/README.md`.
