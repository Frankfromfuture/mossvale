# 苏晴 · memory

这是苏晴的独立开局记忆模板。长记忆先放入原人物档案已经给出的经历，玩家互动、承诺和日记留空。`confidence: 1.0` 表示编剧确定的虚构背景；人物对经历的解释另列为可修正的看法。

愿意在对方面前说“今天没有力气了”，说明她开始信任这段关系。后续重点保留：交接是否可靠、休息和隐私是否受到尊重、传言与核实结果的区别。

使用方式见[总说明](../README.md)，稳定人格见[soul.md](soul.md)。

```yaml
schema_version: mossvale.memory.v1
resident_id: su
soul_revision: 1
revision: 0
status: initial_template_not_live_save
town_id: null
scope:
  owner: su
  cross_town_sharing: false
  source: authored initial state; never overwrite an existing player save
long_term:
  autobiographical_memory:
  - id: su:seed:01
    type: self_knowledge
    content: 工作繁忙，常因照顾别人忽略自己。
    origin: authored_seed
    source_ref: legacy_profile:su
    occurred_at: null
    occurred_label: 开局已有的经历概括
    recorded_at: null
    importance: 9
    confidence: 1.0
    known_by:
    - su
    privacy: private
    event_ids: []
    retention: retain_source
    status: active
  - id: su:seed:02
    type: self_knowledge
    content: 遇到健康问题认真。
    origin: authored_seed
    source_ref: legacy_profile:su
    occurred_at: null
    occurred_label: 开局已有的工作习惯
    recorded_at: null
    importance: 7
    confidence: 1.0
    known_by:
    - su
    privacy: private
    event_ids: []
    retention: retain_source
    status: active
  - id: su:seed:03
    type: self_knowledge
    content: 讨厌未经核实的传言。
    origin: authored_seed
    source_ref: legacy_profile:su
    occurred_at: null
    occurred_label: 开局已有的偏好
    recorded_at: null
    importance: 7
    confidence: 1.0
    known_by:
    - su
    privacy: private
    event_ids: []
    retention: retain_source
    status: active
  beliefs:
  - id: su:belief:01
    statement: 听到别人需要帮助时，我容易把自己的安排放到后面。
    origin: authored_initial_interpretation
    confidence: 0.86
    evidence_refs:
    - su:seed:01
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
  - 交接是否可靠
  - 休息和隐私是否受到尊重
  - 传言与核实结果的区别
  reconsider_when: 保留当时做决定所依据的信息；核实有新结果时补充更正，不把事后的信息说成当时就知道。
  seed_memory_ids:
  - su:seed:01
  - su:seed:02
  - su:seed:03
  episodic_write_condition: 仅保存服务端确认或具有明确传播来源的本人可知经历
  belief_write_condition: 带依据的暂定认识；保留支持与反对证据
  commitment_write_condition: 双方已明确接受，记录约定时间、地点、参与人和来源事件
  soul_write_access: false
```

保留当时做决定所依据的信息；核实有新结果时补充更正，不把事后的信息说成当时就知道。原始经历继续保留，更新的是对经历的理解。
