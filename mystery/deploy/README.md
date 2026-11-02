# 青苔镇 Mossvale 云端发布

当前入口为 [青苔镇 Mossvale](https://www.iambrizo.com/mossvale/)，版本为 `0.15.0`，发布目录 `20261102-mossvale-0.15.0-v17`。旧入口 `/mystery/` 自动跳转，并将原浏览器的剧本杀会话接续到新地址。

| 项目 | 位置 |
| --- | --- |
| 容器 | `mossvale-mystery`，随服务器启动 |
| 当前发布目录 | `/srv/mossvale-mystery/releases/20261102-mossvale-0.15.0-v17` |
| 首发目录 | `/srv/mossvale-mystery/releases/20261029-mystery-v1` |
| 当前版本 | `/srv/mossvale-mystery/current` |
| 独立存档 | `/srv/mossvale-mystery/data` |
| 服务监听 | `127.0.0.1:8796` |
| 配置备份 | `/srv/mossvale-mystery/backups/nginx-before-20261031-mossvale-mystery-v11.conf` |

网页、游戏后端和 DeepSeek 请求均在云端运行，本机无需保持在线。容器只读挂载既有云端模型密文，解密后的配置仅留在进程内存。实际对话使用 `deepseek-v4-flash`。

域名下的 `/mossvale/` 及语音 WebSocket 代理指向剧本杀服务。旧 `/mystery/` 入口负责跳转，原 API 和资源代理保留，已打开的旧页面可以继续使用。配置检查通过后仅热重载 Nginx，其他服务未重启。静态资源及 API 使用相对路径，同时支持本地根目录与线上子目录。会话使用限定 `/mossvale/` 的 Secure、HttpOnly、SameSite=Strict Cookie。关闭浏览器后再打开可接续进度；更换浏览器或清除 Cookie 会进入另一份存档，目前没有账号同步。

发布包包含 `dist`、`server`、`shared`、部署脚本，以及锁定版本的纯 JavaScript `ws` 依赖和包清单。本机 `.data`、开发依赖和模型配置均未上传；Three.js 许可随网页保留。当前发布清单为 `deploy/release-manifest-v16.json`；验收记录保存在服务器备份目录及本地 `mystery/qa/`，不随公开仓库上传。

## 2026-11-02 对话推进调查与物件比对（0.15.0）

发布 `20261102-mossvale-0.15.0-v17`，合并0.14.0的别墅陈设与人物活动。第二部的口供、目击、身份对质和终章复核可由自由问询与追问推进；比对桌改为左右摆物件与口供，准备问题后返回人物交谈。

167项发布文件及静态资源校验通过；24份旧档副本的14个槽位保留原有线索、记录、笔记与进度。云端30项原数据文件的内容及修改时间保持，Nginx和其他容器保持，未新建线上测试访客。切换前备份为 `/srv/mossvale-mystery/backups/before-20261102-mossvale-0.15.0-v17.tgz`，上一版容器 `mossvale-mystery-before-v17` 与v16目录保留。

六条新路线通过内存问询流程验收；桌面与390×844内嵌手机检查物件比对、交谈草稿与连续追问，390×464检查键盘高度。隔离云端模型验收最终六轮通过，共12次DeepSeek调用，另有8次用于定位并校准追问置信度门槛；没有Qwen调用。模型测试档已清理。一次正式Web构建，随后只同步英文版本说明文字；4331实际切换一次，最终PTY启动服务与本地、线上资源一致。证据位于 `qa/dialogue-investigation-v1/`。

回退使用当前版本 `deploy/update.py rollback`；旧程序识别`scripts-v2`，当前存档保留。其他应用与代理配置不参与切换。

## 2026-11-02 第二部与第一人称连环画前情 · 0.13.2

将0.11.0—0.13.2已完成的《第7号嫌疑人》合并上线：六章调查、六条路线、单层别墅、共用界面与人物互动、手绘素材、章节漫画及六位主角各八页的第一人称前情、十二组人物介绍连环画与统一头像取景。选角只显示初始人物姓名，换角时再介绍调查者的背景和来由。

本轮两次构建，第二次合并追加的第一人称连环画与取景要求；本地服务重启一次。云端先核对发布文件，并以原存档的只读隔离副本检查旧格式映射到 `scripts-v2` 后的角色槽位、菜单、分数和调查状态；切换前备份数据，只切换剧本杀容器。模型和语音沿用现有配置，不作真实调用验收。

目录 `20261102-mossvale-0.13.2-v16`；备份 `/srv/mossvale-mystery/backups/before-20261102-mossvale-0.13.2-v16.tgz`；上一版容器 `mossvale-mystery-before-v16`。新服务首次写入旧档前，另存 `.before-scripts-v2` 副本。v15不识别多剧本存档：回退脚本发现已经写入的 `scripts-v2` 时会停止，保留全部进度，避免旧程序误读；尚无新格式写入时，可执行 `sudo -n python3 /srv/mossvale-mystery/current/deploy/update.py rollback`。

163项发布文件及20份旧档、13个角色槽位的预检通过；域名下7项资源与产物一致，手机第二部开场和桌面第一部故事册通过。两份测试访客档案已清理，24项原有线上数据的内容、大小与修改时间保持，Nginx和其他容器保持。发布证据在 `mystery/qa/cloud-suspect7-v16/`。

## 2026-11-01 DeepSeek 记忆引用与合并发布 · 0.10.1

只使用 DeepSeek V4 Flash。人物请求保留旧话内容、说话人和问题，移除记忆索引，避免把旧话编号填入事实引用；回答判定继续保留原话编号，事实校验保持原样。

合并上线0.9.1—0.10.0的50个手绘物件图标、图标仅用于详情与菜单的调整，以及人物旧话与承诺记忆。一次Web构建，定向检查引用与记忆边界，云端用隔离存档验证旧话追问、人物指代和私谈保密，再检查旧档兼容并只切换剧本杀容器。

发布目录 `20261101-mossvale-0.10.1-v15`，备份 `/srv/mossvale-mystery/backups/before-20261101-mossvale-0.10.1-v15.tgz`，上一版容器 `mossvale-mystery-before-v15`。回退保留玩家存档：

```sh
sudo -n python3 /srv/mossvale-mystery/current/deploy/update.py rollback
```

证据：`mystery/qa/deepseek-release-v1/`。

## 2026-11-01 调查幕间与神谷朔语音 · 0.9.0

五场手绘幕间随调查进度解锁，支持跳过、重看与末页操作入口；未到达的正文由服务端保留，旧存档已完成节点直接收入故事册。同步上线 0.8.15—0.8.17 的神谷朔语音调整：年轻温和的日常表达、1.08 语速、句内起伏与轻收句尾，沿用龙楠音色及其他五人配置。

一次 Web 构建，使用内存夹具验证幕间与手机纸页；发布先检查完整资源和旧档隔离兼容，只切换剧本杀容器，保留当前玩家存档、Nginx 与其他服务。复用已有真实语音样音，本轮不调用 DeepSeek 或 Qwen。

发布目录为 `20261101-mossvale-0.9.0-v14`，存档备份为 `/srv/mossvale-mystery/backups/before-20261101-mossvale-0.9.0-v14.tgz`，上一版容器为 `mossvale-mystery-before-v14`。回退恢复本轮之前的 0.8.14 线上程序，保留现有存档：

```sh
sudo -n python3 /srv/mossvale-mystery/current/deploy/update.py rollback
```

本地证据：`mystery/qa/interludes-v1/`。五张正式插画与提示词随仓库保存，参见 `mystery/art/interludes-v1/prompts.md`。

## 2026-11-01 首页菜单居中加粗 · 0.8.14

首页四项菜单文字统一居中，字重改为 700；GitHub 图标仍在“关于 Mossvale”右侧，文字本身与其他菜单保持同一中轴。原有字号、间距和悬停下划线保留。

一次 Web 构建，桌面及 390×844 手机布局检查文字中轴、字重与关于页返回。仅更新 `dist/start-menu.css`、`dist/game.js` 和两份包版本文件，服务及 Nginx 无需重启；备份与回退脚本在 `/srv/mossvale-mystery/backups/menu-center-0.8.14/`，执行 `apply-static.py rollback` 可恢复发布前网页，保留玩家存档。本地证据：`mystery/qa/menu-center-bold-v1/`。

## 2026-11-01 中英文关于浮窗 · 0.8.13

首页“关于 Mossvale”由外部链接改为站内纸页浮窗，可切换中文与 English。正文从根目录 README 的两个语言区块直接打包，包含玩法、场景、设计、技术、启动方式与项目结构；图片随网页提供，打开介绍不依赖 GitHub。GitHub 两处 README 同步补齐英文，游戏目前仍为中文。

一次 Web 构建，两个定向内容与安全检查通过；桌面及 390×844 手机视口验证切换语言、滚动、内框与关闭返回，设置页往返正常，介绍内没有游戏人物跳转，未打开新标签或请求站外资源。

本轮只更新 `dist/game.js`、`dist/start-menu.css`、新增 `dist/art/about/home.png` 和两份包版本文件。后端、存档与服务配置沿用，容器和 Nginx 无需重启；原文件及数据备份在 `/srv/mossvale-mystery/backups/about-0.8.13/`。回退网页时保留玩家存档：

```sh
sudo -n python3 /srv/mossvale-mystery/backups/about-0.8.13/apply-static.py rollback
```

本地证据：`mystery/qa/about-bilingual-v1/`。

## 2026-11-01 纸页窗口内框与操作提示 · 0.8.12

纸页窗口的回纹内框移到滚动容器外，仍沿用原有颜色、线宽、角花和边距；按可见窗口的尺寸定位，滚动、标签切换、故事翻页、内容展开、阅读返回和视口变化共用同一套处理，首页继续无框。规则写入 `mystery/AGENTS.md`。

本次同时上线 0.8.11 的操作提示：根据已找到的线索说明入口和下一步操作，可直接打开对应手记页，引导公开线索、查看反应、追问、出示、搜查和整理推断。

一次 Web 构建，使用隔离内存存档验证手机长手记、公开反应、手记标签、故事翻页、人物页返回、提示展开及视口变化。云端先用隔离数据预检资源和旧档兼容，再仅切换剧本杀容器；Nginx 与其他服务保持，不调用真实模型或语音服务。

存档备份为 `/srv/mossvale-mystery/backups/before-20261101-mossvale-0.8.12-v13.tgz`，上一版容器为 `mossvale-mystery-before-v13`。回退保留现有存档：

```sh
sudo -n python3 /srv/mossvale-mystery/current/deploy/update.py rollback
```

本地证据：`mystery/qa/paper-frame-v1/`。

## 2026-11-01 首页图标与版本号 · 0.8.10

“关于 Mossvale”右侧加入 GitHub 矢量图标，点击文字或图标均前往仓库介绍；首页底部由 GitHub 链接改为项目版本号，本次显示 `v0.8.10`。版本值由包清单编入网页，后续升版随构建同步。

本次同时上线 0.8.9 的左对齐文字菜单、悬停下划线、工具文字去底缩字、目标支线与提示加粗、“我”入口放大和每次进入默认自动朗读。

一次 Web 构建，复用本地 4331，无应用重启。桌面与 390×844 内嵌视口检查图标位置、实际 GitHub 跳转、底部版本、设置返回和默认朗读开关通过，页面错误零；连续回复的自动朗读沿用 0.8.9 已通过的模拟验收。

只更新 `dist/game.js`、`dist/ui-icons.css`、`dist/investigation.css`、`dist/start-menu.css` 及两份包版本文件。28 项服务端和共享文件与线上一致，4 项线上网页资源与构建哈希一致；16 项原有线上数据内容与修改时间保持，本轮未创建线上测试档。应用容器、其他服务及 Nginx 均未重启，Nginx 配置未变；本轮验收未调用模型或语音服务。

原文件、当前数据备份、变更清单及回退脚本保存在 `/srv/mossvale-mystery/backups/menu-0.8.10/`。需要恢复发布前的网页与包版本时，脚本核对当前文件后恢复备份，保留玩家存档且不重启服务：

```sh
sudo -n python3 /srv/mossvale-mystery/backups/menu-0.8.10/apply-static.py rollback
```

本地证据：`mystery/qa/menu-github-version-v1/`。

## 2026-11-01 合并发布 · 0.8.8

普通对话反问的基础概率从 15% 提到 25%，压力情形仍为 45%，搜证仍为 40%／强行尝试 60%，冷却和话题过滤保持原样。同一人物、同一证据进度下的同一问题，第 3 次起每次扣 1 分，第 3 次生气并反问一次；重试不重复计数或扣分。

本次一并上线其他 session 已完成的自然对白与流式反问、事件和物件词条跳转、人物头像统一与问人草稿、胡须贴合及眉眼差异、手机键盘适配和默认朗读、三分钟 MP3、加亮反问边框与移除场景随机雾气等改动。

一次 Web 构建，7 项定向规则检查通过；11 份线上旧档的只读隔离副本加载兼容，95 项发布文件一致。线上 6 项静态资源与构建一致，MP3 范围请求及旧链接跳转通过；浏览器验证首页、选角、词条打开与返回，以及双访客隔离，无页面错误。竖屏模拟未保持，本次截图按桌面结果记录，手机改动复用对应 session 已通过的验收。

两份测试存档已清理，15 项原有线上数据的内容与修改时间保持。Nginx 配置及其他服务未变，只切换剧本杀容器；本轮验收未调用模型或语音服务。本地证据在 `mystery/qa/cloud-0.8.8/`。

存档备份：`/srv/mossvale-mystery/backups/before-20261101-mossvale-0.8.8-v12.tgz`；上一版容器：`mossvale-mystery-before-v12`。v11 与 v12 使用相同存档格式，回退保留当前数据：

```sh
sudo -n python3 /srv/mossvale-mystery/current/deploy/update.py rollback
```

## 2026-10-31 设置与重新开始修正 · 0.8.3

设置页底部改为同一行的两个操作，重开入口靠右，文字和返回菜单对齐。原样式混用了带图标的行内弹性布局与普通按钮，手机实测有 7.5px 的上下偏差。

隔离存档的单次重开返回 200，未复现服务退出。前端补齐重开期间的操作锁：一次只提交一份请求；若重开回复丢失，读取当前进度，确认仍为同一角色的新开场后接续，避免页面继续使用作废的进度标识。其他角色的进度保持。

本轮只将构建后的 `dist/game.js` 和 `dist/style.css` 更新至当前 v11 发布目录，后端及 Nginx 无需重启。备份与发布核验存于 `/srv/mossvale-mystery/backups/settings-reset-0.8.3/`，本地证据为 `mystery/qa/settings-reset-v1/verification.json`；GitHub 包版本、标签及 Release 为 `0.8.3`。回退时将备份中的两份文件恢复至该目录的 `dist/`。

## 2026-10-31 网页图标更新 · 0.8.2

将雾气山谷圆角 Logo 缩为 64×64 透明 PNG，256 色压缩后为 4,019 字节，文件为 `dist/art/brand/mossvale-favicon-v1.png`。网页入口改用此图标，文件名带版本以避开旧 favicon 缓存。

本轮仅向当前 v11 发布目录更新 `dist/index.html` 并新增图标，不切换游戏版本。其余线上文件保留原样，容器和 Nginx 无需重启。原入口、发布清单及变更后的哈希另存于 `/srv/mossvale-mystery/backups/favicon-0.8.2/`，原 v11 清单继续记录首次发布时的文件哈希；本次验证记录在 `mystery/qa/favicon-v1/verification.json`。GitHub 包版本、标签及 Release 为 `0.8.2`。

需要回退图标时，将备份中的 `index.html` 恢复至其记录的发布目录 `dist/index.html`；新增 PNG 可保留，不影响旧入口。

## 2026-10-31 青苔镇品牌与入口迁移

发布 `20261031-mossvale-mystery-v11`，上线青苔镇书法 Logo、简化后的设置及已验收的最新剧本杀代码。复用本地 Web 构建，没有重新构建或重启 4331。

- 90 项发布文件校验通过；11 份旧存档的只读隔离副本由新旧版本加载，角色槽位、调查进度和对话记录一致。
- 桌面 1280×900 与手机 390×844 的首页、六角色选角、旧链接跳转及进度接续通过；两名测试访客的进度独立，页面和资源错误零。
- 线上入口、脚本、首页样式和 Logo 与发布产物一致；跨站写入、私有文件访问及无会话语音连接按预期被拒绝。本轮模型调用为零。
- 两份测试档已清理，14 项原有数据文件的内容及修改时间保持；存档备份和上一版容器保留，其他服务未重启。

存档备份为 `/srv/mossvale-mystery/backups/before-20261031-mossvale-mystery-v11.tgz`，上一版容器为 `mossvale-mystery-before-mossvale-v11`。本地证据位于 `mystery/qa/github-refresh-v1/`。

需要回退本次发布时，执行以下命令。脚本核对当前版本与代理配置，再恢复 v10 程序和迁移前的代理，保留当前玩家存档；v10 与 v11 的存档兼容性已验证。

```sh
sudo -n python3 /srv/mossvale-mystery/current/deploy/migrate-mossvale.py rollback
```

以下为历次发布记录，目录与回退命令对应各自的历史版本。

## 2026-10-31 戏中局首页、角色解锁与背景音乐

发布 `20261031-mystery-intrigue-v10`，沿用已验收的本地 Web 产物，没有重新构建或重启 4331。

- 上线故事衔接修订、六主角存档、开始菜单与结案分数解锁；初次仅白川澄可选。
- 名称统一为「戏中局 / INTRIGUE」与《雾灯未眠》，同步三字姓名、原创封面、Logo、首页文案和四层雾气。
- 探险音乐进入剧本后加载、低音量循环；朗读时压低、收音时暂停，开关与音量可调。音乐通过 HTTPS 范围请求正常播放。
- 78 项发布文件、29 项线上静态资源一致；桌面 1280×900 音乐及手机 390×844 选角通过，页面和资源错误零。模型配置就绪，本轮未调用 DeepSeek 或 Qwen。
- 11 份旧存档的隔离副本兼容通过。两个新访客的手记、线索、行动点独立；测试档已清理，11 份原档哈希保持。

备份：`/srv/mossvale-mystery/backups/before-20261031-mystery-intrigue-v10.tgz`。旧容器：`mossvale-mystery-before-intrigue-v10`。Nginx 与其他服务保持。证据：`../qa/cloud-intrigue-v10/{public,deployment}.json`。

新版首次修改旧档时保存 `.before-six-roles-v1` 副本。v9 不识别六角色存档，回退脚本遇到新格式会停止；回退前须保留全部角色槽位并处理兼容，不能直接让旧服务读取新格式。发布前备份与旧容器均保留。

## 2026-10-31 流式对话、Qwen语音与人物支线

发布 `20261031-mystery-qwen-v9`。包含本地已验收的场景圆角与河流、扩大移轴、五名人物最终支线、左下调查分数与行动点、自动前往人物位置、流式对白，以及近期头像、问人、支线列表和支线直达调整。

Qwen识别和合成通过云端转发，五名NPC使用不同音色；江一郎、加藤保持年长男声，整体语速沿用最后下调5%的参数。密钥单独存于 `/srv/mossvale-mystery/secrets/qwen.json`，权限0600，只读挂载至容器；网页与发布包均不含密钥。Nginx仅为 `/mystery/api/voice/` 增加WebSocket代理，其余路由保持原样，其他服务没有重启。

复用最后验收的Web构建，没有重新构建或重启本地4331。63项发布文件、21项线上资源哈希一致，10份旧档的隔离副本保留调查、行动点和开场进度。线上真实测试调用DeepSeek两次、Qwen合成与识别各一次；流式回复首段约1.85秒，合成首块约0.49秒并分8块返回，识别正确还原人物姓名。这些为本次样本，不代表长期延迟。

1280×900与390×844的支线直达、阅读焦点和返回展开状态通过，页面及资源错误零。两个测试访客的口述、手记、线索和行动点独立，已清理；10份原档哈希全部保持。跨站写入、跨站语音和无会话语音被拒绝，私有文件地址返回404。证据 `../qa/cloud-qwen-v9/{public,deployment}.json`。

切换前存档备份 `/srv/mossvale-mystery/backups/before-20261031-mystery-qwen-v9.tgz`，Nginx备份 `nginx-before-20261031-mystery-qwen-v9.conf`，回退容器 `mossvale-mystery-before-qwen-v9`。回退脚本同时恢复上一版程序和此次变更前的代理，保留当前玩家存档。

## 2026-10-30 铅笔画风、导航与移轴

按三次请求依次发布v6、v7和v8。当前v8包含黑色铅笔描边、灰白客舍、软家具圆角、地点文字直接导航、三倍步速、全景截图地图、顶部行动点与较重越界处罚。想一想入口移除，回厅堂放入右上图标栏；下一步采用暖赭色与手绘灯泡，进度条标注“行动点数：”。上下移轴虚化已加强，中央区域保持清晰。

各次请求各完成一次Web构建，无本地服务重启。v6和v7完成9份旧档隔离加载及双访客独立存档验证，测试档均已清理，原档哈希不变。v8仅改变画面，服务端和共享文件哈希与v7一致，沿用上述验证；桌面、手机像素对照与地图镜头恢复通过，线上20项资源哈希一致，页面及资源错误零。v8没有创建测试存档，9份原档哈希保持，未调用模型。

当前目录 `/srv/mossvale-mystery/releases/20261030-mystery-tilt-strong-v8`。切换前备份 `/srv/mossvale-mystery/backups/before-20261030-mystery-tilt-strong-v8.tgz`，回退容器 `mossvale-mystery-before-tilt-strong-v8`；Nginx和其他服务保持。证据见 `../qa/cloud-pencil-ui-v6/`、`../qa/cloud-tilt-ui-v7/`、`../qa/cloud-tilt-strong-v8/`。

## 2026-10-30 玩家反馈改进

发布解释记忆、插话转场、强行结束反问、六人口述开场与分阶段引导。强行结束扣可信度3分、消耗1行动点；旧存档直接接续。每个浏览器访客仍使用独立存档。

本地一次Web构建和一次4331服务重启，四次真实DeepSeek调用、桌面与手机验收通过。云端35项文件预检、九份旧档隔离加载和线上20项资源哈希通过；新建两个测试访客验证开场续读与存档隔离，已清理。九份原档哈希未变，Nginx与其他服务保持。记录见 `../qa/cloud-feedback-v5/验收记录.md`。

发布目录 `/srv/mossvale-mystery/releases/20261030-mystery-feedback-v5`，存档备份 `/srv/mossvale-mystery/backups/before-20261030-mystery-feedback-v5.tgz`，回退容器 `mossvale-mystery-before-feedback-v5`。

## 2026-10-30 主动盘问、行动点与独立存档

本地已验收的主动盘问、360行动点、评分及“我的简介”已发布。每轮玩家对话消耗1点，首次搜证消耗3点；顶部显示剩余行动点，左下分数可悬停或点击查看规则。进房、房间搜查与个人检查按各自许可处理。

每个浏览器访客由服务器分配随机会话标识，对应单独的存档文件。刷新及再次打开会接续进度，其他浏览器独立开始。原有会话Cookie和存档沿用，跨设备账号同步尚未提供。

发布复用已验收产物，没有重复构建或上传本机存档。36项发布文件核对通过，线上20项静态资源哈希一致。六份旧存档的隔离副本由新版加载通过，原字段与已有消耗保持；本轮旧档原文件哈希全部未变。新版首次实际加载旧档时仍会保存升级前备份。

线上创建两个新的访客会话，验证手记、线索、行动点、分数及重新开局互不影响，刷新续档正常；两份测试存档已清理。390×844页面、我的简介与评分记录通过，页面错误和失败资源均为零。API为no-store，Cookie限定 `/mystery/`，具有Secure、HttpOnly与SameSite=Strict属性；跨站写入被拒绝。未进行真实模型测试调用。官网和原苔溪镇均返回200，Nginx配置哈希未变。

切换前备份为 `/srv/mossvale-mystery/backups/before-20261030-mystery-investigation-v4.tgz`，上一版容器保留为 `mossvale-mystery-before-investigation-v4`。记录见 `../qa/cloud-investigation-v4/public.json` 和 `deployment.json`。

## 2026-10-30 偏殿交手

故事册第 1、8、9 页补上发簪、持烛夜探和背后遇袭的经过。偏殿配图改为来人先抓住信子的手腕，随后她挣脱、退让，受阻后才拔簪自卫。十二页顺序、谜底和存档格式未变。

新包先用隔离数据在 8797 端口预检，再切换 8796 服务；线上 `game.js` 与新配图的 SHA-256 均与发布清单一致，入口返回 200。没有调用模型或读取玩家存档。切换前备份：`/srv/mossvale-mystery/backups/before-20261030-mystery-story-v3.tgz`；上一版容器保留为 `mossvale-mystery-before-story-v3`。本地手机故事页验证见 `../qa/story-ambush-v3/verify.json`。

## 2026-10-30 UI 更新

这次上线了本地迭代中的人物互动、札记、左右对话、场景远景等改动。对话气泡正文调至 15px 楷体，括号动作 12px。更新使用独立发布目录，沿用原有云端存档和 `/mystery/` 代理；Nginx 配置哈希没有变化。切换前的存档备份在 `/srv/mossvale-mystery/backups/before-20261030-mystery-ui-v2.tgz`，首发容器保留为 `mossvale-mystery-before-ui-v2`。

`update.py` 先用隔离数据和 8797 端口检查新包，随后切换 8796 服务。预检、线上 13 项静态资源哈希、DeepSeek 配置状态、手机对话及全景检查通过；五份旧存档的隔离副本也能由新版读取。没有调用模型或写入玩家存档。记录见 `../qa/cloud-ui-v2/public.json` 和 `save-compat.json`。

仅在尚未产生六角色格式存档时，可用以下命令回到本次发布前的 `20261031-mystery-qwen-v9`；已有新格式时需先按上述说明处理兼容：

```sh
sudo -n python3 /srv/mossvale-mystery/current/deploy/update.py rollback
```

首次部署使用 `publish.py prepare <sha256>` 启动新容器并核对资源，再执行 `publish.py activate` 加入代理。脚本遇到已有发布目录或同名路由时停止，后续更新需先检查当前状态。

首次发布的整站撤下命令如下；执行前需确认所有后续版本已回退至首发版本，当前更新脚本只回退一版：

```sh
sudo -n python3 /srv/mossvale-mystery/current/deploy/publish.py rollback
```

该命令核对并移除本次新增路由，检查配置并热重载，然后停止独立容器，保留存档与发布文件。若路由已被后续修改，脚本会停止，不用旧配置覆盖现状。

一次正式构建后，后台 Chromium 验证本地根目录、线上 390×844 手机页面、十二页故事、真实对话、刷新续档及双访客隔离。十一项线上资源与本机构建哈希一致；跨站写入被拒绝，服务端案情及密钥文件地址返回 404，页面和素材错误为零。官网及原苔溪镇页面返回 200。真实模型调用一次，样本约 1.2 秒；这不是长期性能承诺。未重复全案推理测试或手机硬件测试。

证据见 `../qa/cloud-v1/public.json`、`local.json`、`mobile-story.png`、`mobile-dialogue.png`、`mobile-hud.png`。验收仅创建两份新的云端测试存档，未载入已有玩家存档。
