# 青苔镇 Mossvale · AI 剧本杀

当前版本 **0.10.1** · [完整版本记录](../CHANGELOG.md)

人物会按话题召回旧对话，保留自己的回答与承诺，案件记录与闲谈分开提供；记忆以原话与实际听众为依据。

当前剧本为《雾灯未眠》，包含六位可扮演的主角、场景搜证、AI 对话、语音和分角色存档；新增五场可跳过、重看的手绘幕间，按已知进度提供操作入口。50个搜证点各配手绘实物图标，用于线索详情、物件介绍和出示菜单。

[在线测试](https://www.iambrizo.com/mossvale/) · [项目介绍与启动方式](../README.md)

在本目录执行 `npm ci`、`npm run build`、`npm start`，或使用项目根目录的对应命令。本地服务默认监听 `127.0.0.1:4331`，存档位于 `.data/`。

`src/` 为前端，`server/` 为后端，`shared/` 为共用规则，`public/` 为正式素材。详细功能说明见 `docs/`，部署与回退记录见 `deploy/README.md`。

## English

Current version **0.10.1** · [Full changelog](../CHANGELOG.md)

Characters retrieve relevant earlier exchanges and retain their own answers and promises. Case records and casual chatter have separate context budgets, grounded in original quotes and actual listeners.

The current story, 《雾灯未眠》, includes six playable protagonists, scene investigation, AI dialogue, voice, and separate saves for each character. Five illustrated interludes unlock with progress, can be skipped or replayed, and link to useful action screens. All 50 investigation spots share matching hand-drawn object icons in clue details, object descriptions, and evidence menus. The game is currently in Chinese; the [project introduction](../README.md#english) is available in Chinese and English and also appears in the in-game About window.

[Play the preview](https://www.iambrizo.com/mossvale/) · [Introduction and setup](../README.md#english)

Run `npm ci`, `npm run build`, and `npm start` from this directory, or use the corresponding commands at the repository root. The local service listens on `127.0.0.1:4331` and keeps saves in `.data/`.

`src/` contains the frontend, `server/` the backend, `shared/` the shared rules, and `public/` the production assets. Gameplay and implementation notes are in `docs/`; deployment and rollback records are in `deploy/README.md`.
