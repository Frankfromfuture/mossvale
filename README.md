<p align="center">
  <img src="mystery/public/art/brand/mossvale-logo-v2-calligraphy.png" alt="青苔镇 Mossvale" width="480">
</p>

# 青苔镇 Mossvale

[中文](#中文) · [English](#english)

<!-- mossvale:zh -->
## 中文

当前版本 **0.13.2** · [完整更新记录](CHANGELOG.md)

青苔镇是一款由 AI 扮演人物的单人剧本杀。你走进一处手绘风格的 3D 场景，成为故事中的一个人：带着自己的经历和秘密，询问其他人、寻找物证、核对口供，再作出推断。

介绍提供中英文，当前游戏内容与对话界面为中文。

**[进入测试版 · www.iambrizo.com/mossvale](https://www.iambrizo.com/mossvale/)**

第一部《雾灯未眠》从一场山中怪谈开始。最后一支蜡烛熄灭，六个人各自藏起了一件事；天亮后重新围坐，却谁也不愿先说自己看见了什么。你要弄清昨夜发生的事，也要想好，别人问起你时该怎样回答。

本地新增第二部《第7号嫌疑人》：六章现代别墅调查，先进入嫌疑人的供述，获救后换成调查者核对证据。首轮结案后开放其余五条路线，支持独立存档、单层连通地图搜证、双证据追问、分级提示与最终对质。房间沿中央餐厅、客厅和两侧长廊重新布置，点击地点后人物实际走到门内；空间证词和运输复原同步改编。两部共用菜单、对话特写、纸页和场景操作。第二部加入十一位人物头像、物件插图、可朗读的开场与章节漫画；每位主角有八页第一人称前情与经历连环画，先交代身世、与洪青的关系和赴宴目的，后续章节接着讲述事情的来由。别墅有庭院、主副屋、河流与路径，未开放屋舍用屋顶遮盖。在线测试站已同步本版。

![青苔镇首页](mystery/docs/images/home.png)

## 走进故事，可以做些什么

下文的行动点、许可处罚和分数解锁适用于《雾灯未眠》。《第7号嫌疑人》按六章调查推进，阅读与修改猜测不扣分，首次结案即开放其余路线。

**用自己的话追问。** 直接输入问题，或用语音开口，询问某人的去向、对某件物品的认识，以及他怎么看待另一个人；拿到新证据后，还可以回头核对先前的说法。人物会依照性格、经历与当前知情作答，也可能回避、记错或反问你。

**在场景中寻找依据。** 走进客房、花园与厅堂，点击场景中的描边物件搜证，将线索收进手记，再决定私下向谁出示、何时当众公开。公开物件后，在场人物会分别作出动作或台词反应，你可以接着追问。

**破案时也要保护自己。** 每位主角都有个人目标和保密事项，别人会根据听过的话盘问你；进房、翻找私物和查看本人线索各有许可，强行行动会影响成绩。调查既要核对他人的证词，也要照顾自己的解释和分寸。

**换一个人，重新理解同一晚。** 六位主角各有开场经历、已知信息、主线和个人支线。首次从白川澄开始，其他角色按最高结案调查分数解锁；换一个视角，会知道一些原本需要调查的事，也会面对另一组疑问与选择。

**按自己的节奏调查。** 每局有 360 行动点，问答与首次搜证消耗点数，行走、阅读和等待不消耗。案件推理、秘密保护、回答可信度、交谈分寸、调查规矩与行动效率共同构成调查成绩，扣分记录可以查看依据。

**关键处停下来翻一页。** 五场手绘连环画随调查进度解锁，短幕间把刚发生的事接到下一步操作；可以跳过，也可以从「故事」重看。内容只讲已经查到的部分，末页可直接打开相关手记、人物或个人目标入口。

## 场景里的生活感

人物有不同的衣着、随身物件和声音，会走路、落座、添茶、翻书，也会与其他人闲谈或私下交谈。与你说话时，镜头会推近，眉眼、嘴巴和肢体随对白状态变化；语音播放时，口型跟随声音强弱。

50个搜证点各有对应的手绘实物图标，用于线索详情、物件介绍和出示菜单。画面采用细铅笔描边、淡色材质与纸页界面，配合圆润家具、流动河水和移轴效果。首页的窗框桌面与山谷分层漂移，探险音乐、轻咔嗒声、气泡音和纸张声为操作提供反馈；音量、音效和震动可在设置中调整。

桌面和手机浏览器均有对应布局。游戏按浏览器访客保存进度，同一访客下六位主角各有独立槽位，刷新后可继续；目前使用同一浏览器接续调查，跨设备账号同步尚未加入。

## 设计与创新

青苔镇把自由对话放在有证据约束的调查中。玩家可以自行组织问题，人物的可知事实、线索解锁、计分和结案条件由服务端规则管理，AI 负责将当前信息表达成人物的回答与动作。

- 对话会接着旧事往下说：除近期消息外，人物会按当前问题取回相关旧原话，也保留自己说过的回答与承诺；案件记录与日常闲谈使用独立的上下文空间，旧话始终带着说话人与实际听众。
- 每个人知道的事不同：人物的亲历、误解、已见证据和实际听闻分开记录，私谈只进入相应听众的上下文，同一件事可以得到不同说法，玩家需要自己核对。
- 问与答都会推动局面：NPC 会根据对话和搜证反问玩家，公开证据也会引出在场人物的反应，玩家需要随谈话调整调查方向。
- 角色扮演进入个人目标：六主角共用案件与场景，各自的初始信息、秘密和个人决定不同，重玩时会改变你想问的问题和愿意说出的内容。
- 规则接住生成内容：人物回复附带引用的事实编号，逐句核对后显示，评分结合原话依据，行动请求按编号去重，让重试、续档和自由对白衔接到同一份调查进度。

## 技术如何支撑这些玩法

| 部分 | 实现 |
| --- | --- |
| 3D 场景 | Three.js 与 WebGL 绘制人物、建筑、家具和河流，程序材质、轮廓线与移轴后处理形成手绘观感 |
| 人物与移动 | 共用墙体和家具障碍数据进行寻路，场景状态驱动行走、落座、闲动作、表情和对话镜头 |
| 人物对话 | DeepSeek 接收当前角色的性格、可知事实、已见证据和谈话上下文，生成带事实引用的回答，经校验后通过 SSE 逐句传到页面 |
| 语音 | Qwen 负责语音识别与流式合成，人物名使用热词，各角色固定音色；WebSocket 传输音频，浏览器分段播放 PCM |
| 玩法与存档 | Node.js 服务管理调查、许可、盘问、评分和结案，JSON 存档按访客及角色槽位保存，并为旧格式迁移保留备份 |
| 界面与构建 | 原生 JavaScript 模块、CSS、自适应 SVG 与内置楷体实现纸页和对话界面，esbuild 打包前端 |

人物扮演与回答判定分别组织上下文：扮演请求按该人物此刻可知的信息回答，判定请求结合玩家原话处理泄密、矛盾与盘问结果。模型密钥由服务端读取，网页只接收游玩所需的内容。

玩法细节可查看 [调查与评分](mystery/docs/investigation.md)、[六主角设计](mystery/docs/six-protagonists.md)和[开始菜单与角色解锁](mystery/docs/start-menu.md)，历次上线范围见[部署记录](mystery/deploy/README.md)。

## 本地运行

使用 Node.js 22 或更新版本，在项目根目录执行：

```sh
npm run setup
npm run build
npm start
```

然后打开 [http://127.0.0.1:4331/](http://127.0.0.1:4331/)。

人物对话使用 DeepSeek，服务从 `DEEPSEEK_API_KEY` 环境变量读取密钥；`DEEPSEEK_BASE_URL` 和 `DEEPSEEK_MODEL` 可指定服务地址与模型。语音识别和朗读使用 Qwen，通过 `DASHSCOPE_API_KEY` 配置。环境变量由启动环境注入，程序不会自动读取 `.env` 文件。

本机已有 Brizo 配置时，macOS 启动器也支持读取该配置。密钥保留在服务端，本地存档写入 `mystery/.data/`。

## 项目结构

| 目录 | 内容 |
| --- | --- |
| `mystery/src/` | 3D 场景、人物表现和交互界面 |
| `mystery/server/` | 调查规则、角色存档、AI 对话与语音服务 |
| `mystery/shared/` | 前后端共用的布局与规则 |
| `mystery/public/` | Logo、场景图片、字体和音频 |
| `mystery/art/` | 美术来源、生成提示词与源素材 |
| `mystery/docs/` | 玩法与实现说明 |
| `mystery/deploy/` | 部署与版本记录 |

根目录的 npm 命令统一转交给 `mystery/`。仓库当前维护 AI 剧本杀，早期 AI 小镇的 2D、3D 和微信工程已在本地归档，旧版本仍可从 Git 历史查看；玩家存档、本地验证数据和归档压缩包留在本机。

## 版本维护

每次请求完成后更新版本号与一句话改动记录：主要功能和玩法升级递增次版本，小修复、界面微调和文档更新递增补丁版本。包版本、README、[CHANGELOG](CHANGELOG.md)、Git 标签与 Release 同步维护，执行规则保存在 [mystery/AGENTS.md](mystery/AGENTS.md)。

<!-- mossvale:en -->
## English

Current version **0.13.2** · [Full changelog](CHANGELOG.md)

Version 0.13.2 adds a second story, **The Seventh Suspect**: six chapters in a modern villa, a change from suspect testimony to investigation, separate route saves, a continuous single-level map, evidence comparison, hints, and a final confrontation. Completing the first Andy route unlocks the other five routes regardless of score. Rooms connect around the dining room, lounge and two corridors. Characters walk through doors, and spatial testimony and transport reconstruction follow the revised layout. Both stories now use the same menus, dialogue close-ups, paper pages and scene controls. The second story has eleven illustrated portraits, object drawings, narrated opening and chapter comics, and a villa with courtyards, connected wings, paths and a river. Each initial character has an eight-page first-person illustrated prologue covering their background, connection to Hong Qing and reason for attending. Chapter transitions and the investigator handoff continue the narrative; role selection displays only the initial character’s name. Roofs cover rooms that are not yet open. The hosted demo runs this version.

Mossvale is a single-player mystery game with AI characters. Enter a hand-drawn 3D setting as one of the people in the story. Bring your own memories and secrets, question the others, collect physical evidence, compare accounts, and reach your own conclusions.

This introduction is available in Chinese and English. The playable story and dialogue interface are currently in Chinese.

**[Play the preview · www.iambrizo.com/mossvale](https://www.iambrizo.com/mossvale/)**

The current story, 《雾灯未眠》, begins with a night of ghost stories in the mountains. When the final candle goes out, six people each hide something. They sit together again at daybreak, but nobody wants to speak first about what they saw. You need to find out what happened—and decide what to say when someone questions you.

![Mossvale home screen](mystery/docs/images/home.png)

## What you can do

The action points, permission penalties and score-based unlocks below apply to the first story. The Seventh Suspect progresses through six chapters; reading and revised hypotheses carry no penalty, and any first ending unlocks the other routes.

**Ask in your own words.** Type a question or speak aloud. Ask where someone went, what they know about an object, or what they think of another person. Return with new evidence to check an earlier account. Characters answer from their personalities, experiences, and current knowledge; they may evade a question, remember incorrectly, or question you in return.

**Find evidence in the scene.** Enter guest rooms, the garden, and the hall. Click outlined objects in the scene to investigate and keep discoveries in your notebook. Decide whom to show a clue privately and when to present it to the group. Each person present can react with a gesture or a line of dialogue, and you can follow up on that reaction.

**Solve the case while protecting your own position.** Each protagonist has personal goals and secrets. Others can question you about what they have heard. Entering a room, searching possessions, and examining a person require separate permission; forcing an action affects your score. Your explanations and conduct matter alongside your deductions.

**Revisit the same night as someone else.** Six protagonists have different opening memories, starting knowledge, main goals, and personal stories. Begin as 白川澄; other characters unlock through your highest completed investigation score. Another viewpoint gives you information you previously had to uncover, along with different questions and decisions.

**Investigate at your own pace.** Each run starts with 360 action points. Conversation and first-time searches use points; walking, reading, and waiting do not. The investigation score covers case reasoning, protection of secrets, credibility, conversational conduct, respect for investigation rules, and efficiency. You can inspect the reasons for deductions.

**Pause for an illustrated interlude.** Five hand-drawn comic scenes unlock as your investigation progresses, connecting each turning point to a useful action screen. Skip them or revisit them through Story. Each scene stays within what you have discovered, with links to the relevant notebook page, character selection, or personal goals.

## Life in the scene

Characters have distinct clothing, belongings, and voices. They walk, sit, pour tea, browse books, and talk with one another in public or in private. During a conversation, the camera moves closer and their brows, mouths, and bodies respond to the dialogue state. Spoken lines drive mouth movement from the playing audio.

All 50 investigation spots have matching hand-drawn object icons, used in clue details, object descriptions, and evidence menus. Fine pencil outlines, soft materials, rounded furniture, flowing water, and a tilt-shift effect give the scene its illustrated look. The home screen separates the window and desk from the distant valley for gentle parallax. Exploration music, light clicks, bubble sounds, and paper sounds provide feedback. Volume, sound effects, and haptics can be adjusted in settings.

Desktop and mobile browsers have their own layouts. Progress is saved for each browser visitor, with a separate slot for each of the six protagonists. Refresh and continue in the same browser. Account-based progress across devices is not available yet.

## Design and ideas

Mossvale places free conversation inside an investigation governed by evidence. Players choose their own questions. Server-side rules manage what each person knows, clue unlocks, scoring, and the conditions for closing the case; AI expresses the available information through each character's replies and actions.

- Conversations can return to earlier exchanges. Characters retrieve relevant old quotes alongside recent messages and retain their own answers and promises. Case records and everyday chatter have separate context budgets; records retain their speaker and actual audience.
- People know different things. Personal experience, misunderstandings, evidence shown, and statements actually heard are recorded separately. Private conversations enter only the relevant listeners' contexts. Accounts can differ, and the player has to compare them.
- Asking and answering both move the investigation. NPCs can question the player during conversation or searches. Public evidence brings reactions from those present, giving the player further questions to pursue.
- Role-playing has personal consequences. The six protagonists share one case and setting but differ in starting information, secrets, and personal decisions. A new role changes what you want to ask and what you are willing to reveal.
- Rules connect generated dialogue to progress. Replies carry references to known facts and are checked before display. Scoring uses the player's actual words, while request IDs prevent retries from counting the same action twice. Conversation, retries, and saved progress stay tied to the same investigation.

## Technology behind the game

| Area | Implementation |
| --- | --- |
| 3D scene | Three.js and WebGL render characters, buildings, furniture, and the river; procedural materials, outlines, and tilt-shift post-processing create the illustrated look |
| Characters and movement | Shared wall and furniture obstacles support pathfinding; scene state drives walking, seating, idle actions, expressions, and conversation cameras |
| Character dialogue | DeepSeek receives a character's personality, known facts, evidence seen, and conversation context; replies include fact references and reach the page sentence by sentence through SSE after validation |
| Voice | Qwen provides speech recognition and streaming synthesis, with character-name hotwords and fixed voices; WebSocket carries audio and the browser plays streamed PCM segments |
| Gameplay and saves | A Node.js service manages investigations, permissions, questions, scoring, and endings; JSON saves are separated by visitor and character slot, with backups for older save migrations |
| Interface and build | Native JavaScript modules, CSS, responsive SVG, and a bundled Kai font provide the paper and dialogue interfaces; esbuild bundles the frontend |

Character performance and reply evaluation use separate contexts. A performance request uses what that character currently knows. An evaluation request uses the player's words to assess disclosures, contradictions, and answers to questions. Model keys are read on the server; the browser receives the content needed to play.

Further details are in [Investigation and scoring](mystery/docs/investigation.md), [Six protagonists](mystery/docs/six-protagonists.md), and [Start menu and character unlocks](mystery/docs/start-menu.md). These implementation documents are currently in Chinese. See the [deployment record](mystery/deploy/README.md) for what each release put online.

## Run locally

Use Node.js 22 or later. From the repository root, run:

```sh
npm run setup
npm run build
npm start
```

Then open [http://127.0.0.1:4331/](http://127.0.0.1:4331/).

Character dialogue uses DeepSeek and reads its key from `DEEPSEEK_API_KEY`. Set `DEEPSEEK_BASE_URL` and `DEEPSEEK_MODEL` to override the endpoint and model. Speech recognition and synthesis use Qwen, configured with `DASHSCOPE_API_KEY`. Supply environment variables through the launch environment; the application does not automatically load a `.env` file.

On macOS, the launcher can also read an existing local Brizo configuration. Keys remain on the server. Local saves are stored in `mystery/.data/`.

## Repository layout

| Directory | Contents |
| --- | --- |
| `mystery/src/` | 3D scenes, character animation, and interaction UI |
| `mystery/server/` | Investigation rules, character saves, AI dialogue, and voice services |
| `mystery/shared/` | Layout and rules shared by frontend and backend |
| `mystery/public/` | Production logos, scene images, fonts, and audio |
| `mystery/art/` | Art sources, generation prompts, and source assets |
| `mystery/docs/` | Gameplay and implementation notes |
| `mystery/deploy/` | Deployment tools and release records |

Root npm commands forward to `mystery/`. The repository now maintains the AI mystery game. Earlier 2D, 3D, and WeChat AI-town projects are archived locally, and earlier versions remain in Git history. Player saves, local verification data, and the archive file stay on the local machine.

## Version maintenance

Each completed request updates the version and adds a one-sentence changelog entry. Major gameplay or feature changes increment the minor version; fixes, visual adjustments, and documentation updates increment the patch version. Package versions, README, [CHANGELOG](CHANGELOG.md), Git tags, and Releases are kept together. The working rules are in [mystery/AGENTS.md](mystery/AGENTS.md).
