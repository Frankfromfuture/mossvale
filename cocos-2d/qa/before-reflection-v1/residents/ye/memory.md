# 叶小满 · memory

这是叶小满的独立开局记忆模板。长记忆先放入原人物档案已经给出的经历，玩家互动、承诺和日记留空。`confidence: 1.0` 表示编剧确定的虚构背景；人物对经历的解释另列为可修正的看法。

被认真对待、被允许拒绝，会让她从热络变得真正信任。后续重点保留：花费对个人目标的真实影响、拒绝之后朋友的实际反应、承担工作后是否得到尊重。

使用方式见[总说明](../README.md)，稳定人格见[soul.md](soul.md)。

```yaml
schema_version: mossvale.memory.v1
resident_id: ye
soul_revision: 1
revision: 0
status: initial_template_not_live_save
town_id: null
scope:
  owner: ye
  cross_town_sharing: false
  source: authored initial state; never overwrite an existing player save
long_term:
  autobiographical_memory:
  - id: ye:seed:01
    type: autobiographical
    content: 利用假期在杂货铺帮忙。
    origin: authored_seed
    source_ref: legacy_profile:ye
    occurred_at: null
    occurred_label: 当前假期
    recorded_at: null
    importance: 9
    confidence: 1.0
    known_by:
    - ye
    privacy: private
    event_ids: []
    retention: retain_source
    status: active
  - id: ye:seed:02
    type: self_knowledge
    content: 容易为朋友超出预算。
    origin: authored_seed
    source_ref: legacy_profile:ye
    occurred_at: null
    occurred_label: 开局已有的经历概括
    recorded_at: null
    importance: 7
    confidence: 1.0
    known_by:
    - ye
    privacy: private
    event_ids: []
    retention: retain_source
    status: active
  - id: ye:seed:03
    type: self_knowledge
    content: 想证明自己有担当。
    origin: authored_seed
    source_ref: legacy_profile:ye
    occurred_at: null
    occurred_label: 开局已有的愿望
    recorded_at: null
    importance: 7
    confidence: 1.0
    known_by:
    - ye
    privacy: private
    event_ids: []
    retention: retain_source
    status: active
  beliefs:
  - id: ye:belief:01
    statement: 拒绝朋友的请求，可能会让别人觉得我不够讲义气。
    origin: authored_initial_interpretation
    confidence: 0.62
    evidence_refs:
    - ye:seed:02
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
  - 花费对个人目标的真实影响
  - 拒绝之后朋友的实际反应
  - 承担工作后是否得到尊重
  reconsider_when: 记录拒绝后关系仍然正常的经历，逐步拆开友情与花钱；减少余额只依据实际交易事件。
  seed_memory_ids:
  - ye:seed:01
  - ye:seed:02
  - ye:seed:03
  episodic_write_condition: 仅保存服务端确认或具有明确传播来源的本人可知经历
  belief_write_condition: 带依据的暂定认识；保留支持与反对证据
  commitment_write_condition: 双方已明确接受，记录约定时间、地点、参与人和来源事件
  soul_write_access: false
```

记录拒绝后关系仍然正常的经历，逐步拆开友情与花钱；减少余额只依据实际交易事件。原始经历继续保留，更新的是对经历的理解。
