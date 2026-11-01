# NPC 对话记忆

本地 0.10.0 在近期对话之外加入旧原话检索。人物回答时，仍读取当前人设、已解锁事实、已见证据与最近十条聊天；另按问题中的词语和已有剧本话题取回最多六段旧对话，原话合计不超过四千字。玩家早先的相关说法也可从最近三十五条之外补回，供人物回答与回答判定共用。

`investigation.npcMemory` 保存 NPC 已说出的回答，包含原问题、原话、说话人、实际听众、轮次与使用过的事实编号。普通问答、公开反应、开场口述和支线交代均在成功后记录，失败与同请求重试不重复写入。人物可以找回自己说过的承诺；承诺措辞仅用于召回，不代表事情已经办成，也不会触发取物、调查或其他行动。

案件记录与日常闲谈分别提供给模型。日常闲谈最多三条，不挤占案件旁听记录的位置；人物听过的案件回答单独存档，因此旧的混合听闻列表滚动后仍可召回。直接交谈中的日常内容也保留原话，可在相关追问时找到。分类只用于分配上下文，不决定案情真假。

每段记忆只供说话人和实际听众使用。旁听者可以知道听过的回答，私谈问题不会因此跟着流出。自己的旧回答若引用了当前已不再适用的事实编号，则不放回检索结果；模型仍以当前已核实事实为准。旧原话不会被升级成新线索，也不改变计分、反问概率或结案条件。

旧档在内存中从直接聊天、带听众的事件和仍保留的听闻补回记录，下次正常保存时才落盘；旧聊天没有听众依据时，只补给当时交谈的 NPC。历史上已裁掉、且没有其他记录的内容无法补回。每个访客和主角槽位沿用原有隔离方式。

本轮检索使用中文词组、剧本话题与原话匹配，没有新增模型调用或外部数据库。它能找回有相关词语或话题的旧事；模糊指代和跨度较大的同义表达仍可能遗漏。后续可根据真实对话样本再调整召回方式。

## English

Local version 0.10.0 adds relevant earlier quotes alongside the latest ten chat messages. Retrieval uses words and authored story topics, with up to six exchanges and 4,000 characters of original question/answer text. Relevant older player statements are also available to both the character and the existing review call.

NPC replies retain their question, speaker, audience, turn and cited fact IDs. Answers, promises, opening statements, public reactions and side-story resolutions are recorded after success. A remembered promise is a quote, not a completed action. Casual conversation has its own small context budget and cannot displace durable case testimony.

Memories remain restricted to the speaker and actual listeners. Legacy saves are backfilled conservatively from existing chats and witnessed records without rewriting progress. Retrieval adds no model calls or external database. Lexical and topic matching can still miss vague references or distant paraphrases.
