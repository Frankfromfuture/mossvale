# 调查幕间

五场连环画分别在发现遗骸、做出面具样片、当众核实身份、取得三份关键供述和结案后解锁，每场四格。幕间等玩家关闭当前线索页或对话后出现，行走、朗读、语音输入和人物反问期间继续等候。

每场可逐格阅读或跳过，已解锁的内容收在「故事」里；开场故事仍可重读。首次使用新版的旧存档直接把已走过的幕间收入故事册，之后新解锁的幕间才自动出现。阅读状态按浏览器与角色槽位记录，跳过不会改变案件进度或扣分；换设备或清除本地数据后，已完成节点仍可从存档进度恢复到故事册。

幕间末页连接对应入口：公开遗骸、选择人物辨认样片、重读开场口述、核对证词或整理推断、查看个人目标。公开、出示、身份核实与提交推断仍由玩家在对应页面确认。三份供述齐备但现场证据不足时，第四场引导继续核对；证据齐备后才引导整理推断。

正文由服务端根据已取得的记录下发。身份揭晓以实际完成当众核实为准，角色开场知道自己的秘密不会提前解锁这一幕；旁白中的“你”按当前主角调整。图片仅在打开相应幕间时加载，不预载未来章节。结尾保留未完成的个人选择，画面不补写行凶回忆或人物去向。

纸页使用现有故事册排版与共用内框，导航在正文滚动区外。插画由内置 image_gen 生成，沿用原故事册的铅笔线、淡彩与纸张质感；正式资源为 `public/art/interlude-*-v1.png`，提示词在 `art/interludes-v1/prompts.md`。

## English

Five four-panel interludes unlock after discovering the remains, crafting the disguise sample, publicly confirming the identity, collecting the three key accounts, and closing the case. They wait until the current card or conversation is closed, without interrupting movement, speech, recording, or NPC questions. Players can skip them and revisit unlocked scenes through Story.

The server sends only reached scenes. Existing saves gain a replay library without a backlog of automatic popups. Reading history is stored per browser and character slot, separately from case progress. Each final panel links to a relevant action screen; disclosure, presenting evidence and deductions remain the player's choice. The accounts scene distinguishes complete testimony from complete evidence. Existing illustrated pages and shared paper frames are reused.
