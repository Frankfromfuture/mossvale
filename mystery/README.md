# 青苔镇 Mossvale · AI 剧本杀

当前版本 **0.14.0** · [完整版本记录](../CHANGELOG.md)

0.14.0本地增加客厅与案情室陈设及双人活动：客厅三人小聚，喝水、翻书、摆棋、照看盆栽；案情室饮水、书写、整理便笺和文具。人物按家具寻路，用完物件后回座。在线测试站仍为0.13.2。

人物会按话题召回旧对话，保留自己的回答与承诺，案件记录与闲谈分开提供；记忆以原话与实际听众为依据。

第一部《雾灯未眠》包含六位可扮演的主角、场景搜证、AI 对话、语音和分角色存档；新增五场可跳过、重看的手绘幕间，按已知进度提供操作入口。50个搜证点各配手绘实物图标，用于线索详情、物件介绍和出示菜单。

本地新增《第7号嫌疑人》，提供六章调查、六条双视角路线、十一位人物和独立剧本存档。首次结案开放全部路线，剧情推进由证据节点控制。详情见 [接入说明](docs/suspect7/README.md)。两部现共用全部界面与场景操作，第二部补齐人物、物件手绘图及可朗读的章节漫画。六位主角各有八页第一人称前情与经历连环画，依次讲述身份、旧事和赴宴缘由；章节过渡与换角也以完整叙事承接，选角只显示初始人物姓名。线上已同步本版。

[在线测试](https://www.iambrizo.com/mossvale/) · [项目介绍与启动方式](../README.md)

在本目录执行 `npm ci`、`npm run build`、`npm start`，或使用项目根目录的对应命令。本地服务默认监听 `127.0.0.1:4331`，存档位于 `.data/`。

`src/` 为前端，`server/` 为后端，`shared/` 为共用规则，`public/` 为正式素材。详细功能说明见 `docs/`，部署与回退记录见 `deploy/README.md`。

## English

Current version **0.14.0** · [Full changelog](../CHANGELOG.md)

Local 0.14.0 adds lounge and briefing-room furnishings and paired NPC activity. Three companions join lounge breaks for tea, magazines, chess and plants. The briefing room supports water breaks, writing and tidying stationery. Characters walk around furniture and return to their seats. The hosted demo remains on 0.13.2.

Characters retrieve relevant earlier exchanges and retain their own answers and promises. Case records and casual chatter have separate context budgets, grounded in original quotes and actual listeners.

The first story, 《雾灯未眠》, includes six playable protagonists, scene investigation, AI dialogue, voice, and separate saves for each character. Five illustrated interludes unlock with progress, can be skipped or replayed, and link to useful action screens. All 50 investigation spots share matching hand-drawn object icons in clue details, object descriptions, and evidence menus. The game is currently in Chinese; the [project introduction](../README.md#english) is available in Chinese and English and also appears in the in-game About window.

[Play the preview](https://www.iambrizo.com/mossvale/) · [Introduction and setup](../README.md#english)

Run `npm ci`, `npm run build`, and `npm start` from this directory, or use the corresponding commands at the repository root. The local service listens on `127.0.0.1:4331` and keeps saves in `.data/`.

`src/` contains the frontend, `server/` the backend, `shared/` the shared rules, and `public/` the production assets. Gameplay and implementation notes are in `docs/`; deployment and rollback records are in `deploy/README.md`.

**The Seventh Suspect** is available in 0.13.2: six chapters, six routes with a perspective change, eleven characters, and separate script saves. Any completed first route unlocks the remaining routes. Both stories share the interface and scene controls. The second story includes illustrated portraits and objects, narrated chapter comics and individual character voice directions. Each initial character has an eight-page first-person illustrated prologue introducing their past and reason for attending; later chapters and the investigator handoff use connected narrative prose. Role selection shows only the initial name. The hosted demo remains on 0.13.2. See the [implementation notes](docs/suspect7/README.md).
