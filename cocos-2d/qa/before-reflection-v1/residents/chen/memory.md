# 陈默 · memory

这是陈默的独立开局记忆模板。长记忆先放入原人物档案已经给出的经历，玩家互动、承诺和日记留空。`confidence: 1.0` 表示编剧确定的虚构背景；人物对经历的解释另列为可修正的看法。

共同完成一件事比送礼更容易让他信任；熟悉后会主动问有没有东西要修。后续重点保留：明确约定与实际完成、工具和劳动被如何对待、还款或补救是否发生。

使用方式见[总说明](../README.md)，稳定人格见[soul.md](soul.md)。

```yaml
schema_version: mossvale.memory.v1
resident_id: chen
soul_revision: 1
revision: 0
status: initial_template_not_live_save
town_id: null
scope:
  owner: chen
  cross_town_sharing: false
  source: authored initial state; never overwrite an existing player save
long_term:
  autobiographical_memory:
  - id: chen:seed:01
    type: autobiographical
    content: 曾替熟人垫钱却没收回来。
    origin: authored_seed
    source_ref: legacy_profile:chen
    occurred_at: null
    occurred_label: 来到当前故事以前
    recorded_at: null
    importance: 9
    confidence: 1.0
    known_by:
    - chen
    privacy: private
    event_ids: []
    retention: retain_source
    status: active
  - id: chen:seed:02
    type: self_knowledge
    content: 相信行动胜过漂亮话。
    origin: authored_seed
    source_ref: legacy_profile:chen
    occurred_at: null
    occurred_label: 开局已有的判断习惯
    recorded_at: null
    importance: 7
    confidence: 1.0
    known_by:
    - chen
    privacy: private
    event_ids: []
    retention: retain_source
    status: active
  - id: chen:seed:03
    type: self_knowledge
    content: 下班后喜欢安静。
    origin: authored_seed
    source_ref: legacy_profile:chen
    occurred_at: null
    occurred_label: 开局已有的偏好
    recorded_at: null
    importance: 7
    confidence: 1.0
    known_by:
    - chen
    privacy: private
    event_ids: []
    retention: retain_source
    status: active
  beliefs:
  - id: chen:belief:01
    statement: 熟人关系也不足以保证借出去的钱会回来。
    origin: authored_initial_interpretation
    confidence: 0.83
    evidence_refs:
    - chen:seed:01
    counterevidence_refs: []
    status: provisional
    updated_at: null
  relationship_summaries: []
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
  - 明确约定与实际完成
  - 工具和劳动被如何对待
  - 还款或补救是否发生
  reconsider_when: 把对某次借款的谨慎与对整个人的评价拆开；有实际归还记录时更新判断。
  seed_memory_ids:
  - chen:seed:01
  - chen:seed:02
  - chen:seed:03
  episodic_write_condition: 仅保存服务端确认或具有明确传播来源的本人可知经历
  belief_write_condition: 带依据的暂定认识；保留支持与反对证据
  commitment_write_condition: 双方已明确接受，记录约定时间、地点、参与人和来源事件
  soul_write_access: false
```

把对某次借款的谨慎与对整个人的评价拆开；有实际归还记录时更新判断。原始经历继续保留，更新的是对经历的理解。
