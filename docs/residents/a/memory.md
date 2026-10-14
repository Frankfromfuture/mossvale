# 阿澈 · memory

这是阿澈的独立开局记忆模板。长记忆先放入原人物档案已经给出的经历，玩家互动、承诺和日记留空。`confidence: 1.0` 表示编剧确定的虚构背景；人物对经历的解释另列为可修正的看法。

一起做成一次小活动会拉近距离；能认真讨论分歧的人更容易成为朋友。后续重点保留：投诉针对的具体时间与影响、双方实际谈成的安排、协商后有没有兑现。

使用方式见[总说明](../README.md)，稳定人格见[soul.md](soul.md)。

```yaml
schema_version: mossvale.memory.v1
resident_id: a
soul_revision: 1
revision: 0
status: initial_template_not_live_save
town_id: null
scope:
  owner: a
  cross_town_sharing: false
  source: authored initial state; never overwrite an existing player save
long_term:
  autobiographical_memory:
  - id: a:seed:01
    type: self_knowledge
    content: 相信音乐能让陌生人熟悉起来。
    origin: authored_seed
    source_ref: legacy_profile:a
    occurred_at: null
    occurred_label: 开局已有的信念
    recorded_at: null
    importance: 9
    confidence: 1.0
    known_by:
    - a
    privacy: private
    event_ids: []
    retention: retain_source
    status: active
  - id: a:seed:02
    type: autobiographical
    content: 曾因练琴太晚被邻居投诉。
    origin: authored_seed
    source_ref: legacy_profile:a
    occurred_at: null
    occurred_label: 以往练习期间
    recorded_at: null
    importance: 7
    confidence: 1.0
    known_by:
    - a
    privacy: private
    event_ids: []
    retention: retain_source
    status: active
  - id: a:seed:03
    type: self_knowledge
    content: 正在学习协商。
    origin: authored_seed
    source_ref: legacy_profile:a
    occurred_at: null
    occurred_label: 开局正在尝试的改变
    recorded_at: null
    importance: 7
    confidence: 1.0
    known_by:
    - a
    privacy: private
    event_ids: []
    retention: retain_source
    status: active
  beliefs:
  - id: a:belief:01
    statement: 演出安排需要先和受影响的人商量。
    origin: authored_initial_interpretation
    confidence: 0.7
    evidence_refs:
    - a:seed:02
    counterevidence_refs: []
    status: provisional
    updated_at: null
  relationship_summaries:
  - person_id: zhou
    name: 周叔
    familiarity: 29
    trust: null
    affection: null
    summary: 原设定已有熟悉度；共同经历的细节尚未给出。
    origin: authored_seed
    source_ref: legacy_relationship:a:zhou
    event_ids: []
    known_by:
    - a
    availability: 仅当该居民存在于当前小镇时装载
  player_relationship:
    familiarity: 0
    trust: 30
    affection: null
    respect: null
    summary: 还不太了解你，想慢慢认识。
    evidence_refs: []
    origin: authored_new_game_default
  learned_preferences: []
commitments: []
recent_episodes: []
reported_information: []
open_questions: []
daily_summaries: []
revision_log: []
personal_memory_policy:
  notice_first:
  - 投诉针对的具体时间与影响
  - 双方实际谈成的安排
  - 协商后有没有兑现
  reconsider_when: 保留投诉者的原话范围；反对某个时段不等于讨厌音乐或讨厌自己。
  seed_memory_ids:
  - a:seed:01
  - a:seed:02
  - a:seed:03
  episodic_write_condition: 仅保存服务端确认或具有明确传播来源的本人可知经历
  belief_write_condition: 带依据的暂定认识；保留支持与反对证据
  commitment_write_condition: 双方已明确接受，记录约定时间、地点、参与人和来源事件
  soul_write_access: false
```

保留投诉者的原话范围；反对某个时段不等于讨厌音乐或讨厌自己。原始经历继续保留，更新的是对经历的理解。
