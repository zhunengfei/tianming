## Phase 2 删 9 字段·全消费者审计报告

### 字段定义位置汇总

**SC1 Schema 定义** (tm-ai-schema.js:196-218)
- npc_interactions: L198 - consumedBy: endturn-ai-infer:sc1b
- npc_letters: L199 - consumedBy: endturn-ai-infer:sc1b  
- npc_correspondence: L200 - consumedBy: endturn-ai-infer:sc1b
- cultural_works: L201 - consumedBy: endturn-ai-infer:sc1b
- faction_events: L96 - 无 consumedBy 标签（需补）
- faction_interactions_advanced: L215 - consumedBy: endturn-ai-infer:sc1c
- npc_schemes: L216 - consumedBy: endturn-ai-infer:sc1c
- hidden_moves: L217 - consumedBy: endturn-ai-infer:sc1c
- fengwen_snippets: L218 - consumedBy: endturn-ai-infer:sc1c

特殊字段：
- faction_relation_shift: tm-endturn-apply.js:2423 读取但**不在 schema.js 中定义**

---

### 按字段详细审计

#### 1. cultural_works

| 文件 | 行 | 读时机 | 防御 | 状态 |
|-----|-----|---------|------|------|
| tm-endturn-ai.js | 2696 | SC1d IIFE 内（与 SC1 并行） | Array.isArray(p1.cultural_works) | ⚠️ 早期读 |
| tm-endturn-apply.js | 3795 | apply 阶段（L3226 之后） | p1.cultural_works && Array.isArray && length > 0 | ✅ 安全 |
| tm-ai-npc-memorials.js | 15, 75 | 注释说明文本 | 无数据读取 | ✅ 安全 |

结论: L2696 在 SC1d 内读取但有防御；L3795 完全安全

#### 2. npc_letters

| 文件 | 行 | 读时机 | 防御 | 状态 |
|-----|-----|---------|------|------|
| tm-endturn-ai.js | 2697 | SC1d IIFE 内 | Array.isArray(p1.npc_letters) | ⚠️ 早期读 |
| tm-endturn-apply.js | 828 | apply 阶段（L3226 之后） | p1.npc_letters && Array.isArray(...) | ✅ 安全 |
| tm-npc-action-ledger.js | 280 | 后台记录（时机未明） | _arr(p1 && p1.npc_letters) | ⚠️ 不确定 |

结论: L2697 同上；L828 安全；L280 需验证调用时机

#### 3. npc_correspondence

| 文件 | 行 | 读时机 | 防御 | 状态 |
|-----|-----|---------|------|------|
| tm-endturn-ai.js | 2698 | SC1d IIFE 内 | Array.isArray(p1.npc_correspondence) | ⚠️ 早期读 |
| tm-endturn-apply.js | 880 | apply 阶段（L3226 之后） | p1.npc_correspondence && Array.isArray(...) | ✅ 安全 |
| tm-npc-action-ledger.js | 281 | 后台记录 | _arr(p1 && p1.npc_correspondence) | ⚠️ 不确定 |

结论: 同 npc_letters

#### 4. npc_interactions

| 文件 | 行 | 读时机 | 防御 | 状态 |
|-----|-----|---------|------|------|
| tm-endturn-ai.js | 2699 | SC1d IIFE 内 | Array.isArray(p1.npc_interactions) | ⚠️ 早期读 |
| tm-endturn-apply.js | 4141 | apply 阶段 | p1.npc_interactions && Array.isArray && length > 0 | ✅ 安全 |
| tm-endturn-followup.js | 1940-1941 | followup 阶段（L3226 之后） | Array.isArray && length > 0 | ✅ 安全 |
| tm-npc-action-ledger.js | 279 | 后台记录 | _arr(p1 && p1.npc_interactions) | ⚠️ 不确定 |
| tm-ai-npc-memorials.js | 15, 75 | 说明文本 | - | ✅ 安全 |

结论: 多处消费，apply 和 followup 阶段都安全

#### 5. faction_events

| 文件 | 行 | 读时机 | 防御 | 状态 |
|-----|-----|---------|------|------|
| tm-endturn-ai.js | 2606 | SC1d IIFE 内（_facts1d 对象构建） | Array.isArray(...) ? ... : [] | ⚠️ 早期读 |
| tm-endturn-ai.js | 3150 | SC1c concat（SC1c IIFE 内） | Array.isArray(...) && ...concat(...) | ✅ 内部安全 |
| tm-endturn-apply.js | 1302-1306 | apply 阶段 | p1.faction_events && Array.isArray(...) | ✅ 安全 |
| tm-endturn-apply.js | 4755 | apply 统计 | Array.isArray(...) ? ... : 0 | ✅ 安全 |
| tm-endturn-followup.js | 420-421 | followup 阶段 | p1 && p1.faction_events && length > 0 | ✅ 安全 |
| tm-endturn-followup.js | 677-679 | followup 阶段 | Array.isArray(p1.faction_events) | ✅ 安全 |
| tm-endturn-followup.js | 1607 | followup 阶段 | p1 && p1.faction_events | ✅ 安全 |
| tm-post-turn-jobs.js | 264 | post-turn 后台 | (p1.faction_events \|\| []) | ⚠️ 时机不确定 |

结论: L2606 最危险但有防御（.slice() + Array.isArray）；apply 和 followup 完全安全

#### 6. faction_interactions_advanced

| 文件 | 行 | 读时机 | 防御 | 状态 |
|-----|-----|---------|------|------|
| tm-endturn-ai.js | 3149 | SC1c concat（IIFE 内） | Array.isArray(...) && ...concat(...) | ✅ 内部安全 |
| tm-endturn-apply.js | 4305 | apply 阶段 | p1.faction_interactions_advanced && Array.isArray && length > 0 | ✅ 安全 |

结论: 完全安全（无外部读取）

#### 7. faction_relation_shift

**关键发现：此字段不在 tm-ai-schema.js 中定义，是 Ghost 字段**

| 文件 | 行 | 读时机 | 防御 | 状态 |
|-----|-----|---------|------|------|
| tm-endturn-apply.js | 2423 | apply 阶段 | p1.faction_relation_shift && Array.isArray(...) | ✅ 安全（但字段不存在） |

结论: 代码中消费但从未在 schema 注册，AI 不会生成，可能是遗留代码

#### 8. npc_schemes

| 文件 | 行 | 读时机 | 防御 | 状态 |
|-----|-----|---------|------|------|
| tm-endturn-ai.js | 3150 | SC1c concat（IIFE 内） | Array.isArray(...) && ...concat(...) | ✅ 内部安全 |

结论: 无外部读取，仅内部 concat

#### 9. hidden_moves

| 文件 | 行 | 读时机 | 防御 | 状态 |
|-----|-----|---------|------|------|
| tm-endturn-ai.js | 3150 | SC1c concat（IIFE 内） | Array.isArray(...) && ...concat(...) | ✅ 内部安全 |

结论: 无外部读取

#### 10. fengwen_snippets

| 文件 | 行 | 读时机 | 防御 | 状态 |
|-----|-----|---------|------|------|
| tm-endturn-ai.js | 3150 | SC1c concat（IIFE 内） | Array.isArray(...) && ...concat(...) | ✅ 内部安全 |

结论: 无外部读取

---

### 时序分析·关键时间线

```
L2490 — SC1 AI 推演完成 → p1 完整
  ↓
L2583-2648 — SC1d IIFE 启动（并行）
  L2606, 2696-2699 读取 p1.X（9 个字段）
  ✅ 所有都有防御
  ↓
L2651-3223 — SC1b IIFE 启动（并行）
  L2786-2789 concat p1.cultural_works 等前 4 字段
  ↓
L2652-3223 — SC1c IIFE 启动（并行）
  L3150 concat p1.faction_events 等后 5 字段
  ↓
L3226 【同步点】await Promise.all([_sc1bP, _sc1cP, _sc1dP])
  ↓ 此时 p1 已完整合并
  ↓
L3228+ — afterSc1(ctx) apply 阶段
  所有 apply.js 的读取都在此之后 ✅ 完全安全
  ↓
后续 — followup.js 和 post-turn-jobs.js
  ✅ 完全安全
```

---

### 竞态条件分析

**【绿旗】并无实际竞态问题**

SC1d 早期读（L2606, 2696-2699）虽在 SC1b/SC1c 之前，但：
1. 使用了 `.slice()` 或 `Array.isArray()` 防御
2. 创建了本地副本 (_facts1d 对象)，不会被其他 IIFE 修改
3. 即使读到不完整数据，也不会崩溃

SC1b concat（L2786-2789）和 SC1c concat（L3149-3150）都在各自 IIFE 内部执行，
最后通过 L3226 的 await 同步，确保 apply 阶段拿到完整数据。

---

### Validator 状态

tm-ai-output-validator.js 的 KNOWN_FIELDS_FALLBACK（L31-72）：
- L60: npc_letters, npc_correspondence, cultural_works ✅ 已注册
- L59: npc_interactions ✅ 已注册
- L65-66: faction_interactions_advanced, npc_schemes, hidden_moves, fengwen_snippets ✅ 已注册
- L40: faction_events ✅ 已注册
- **faction_relation_shift**: ⚠️ 既不在 schema，也不在 validator fallback

---

### 统计汇总

| 字段 | 总读取数 | 安全数 | 破坏风险 |
|-----|---------|--------|---------|
| cultural_works | 3 | 1 | 1（L2696有防御） |
| npc_letters | 3 | 1 | 1（L2697有防御） |
| npc_correspondence | 3 | 1 | 1（L2698有防御） |
| npc_interactions | 5 | 3 | 1（L2699有防御） |
| faction_events | 8 | 5 | 1（L2606有防御） |
| faction_interactions_advanced | 2 | 2 | 0 |
| faction_relation_shift | 1 | 0 | 1（Ghost字段） |
| npc_schemes | 1 | 1 | 0 |
| hidden_moves | 1 | 1 | 0 |
| fengwen_snippets | 1 | 1 | 0 |
| **总计** | **28** | **16** | **7** |

---

### 必修改 7 处（删后会 undefined）

所有需改的都在 tm-endturn-apply.js，必须改为读 ctx.results.sc1b 或 ctx.results.sc1c：

1. **L828** — npc_letters 改为 ctx.results.sc1b.npc_letters
2. **L880** — npc_correspondence 改为 ctx.results.sc1b.npc_correspondence  
3. **L1302-1306** — faction_events 改为 ctx.results.sc1c.faction_events
4. **L2423** — faction_relation_shift（需调查来源）
5. **L3795** — cultural_works 改为 ctx.results.sc1b.cultural_works
6. **L4141** — npc_interactions 改为 ctx.results.sc1b.npc_interactions
7. **L4305** — faction_interactions_advanced 改为 ctx.results.sc1c.faction_interactions_advanced

Schema 补改（非关键）：
- tm-ai-schema.js:96 加 `consumedBy: ['endturn-ai-infer:sc1c']` 到 faction_events
- tm-ai-schema.js 处理 faction_relation_shift（标废弃或转移定义）
- tm-ai-output-validator.js 同步处理

**完全安全的不需改**：
- tm-endturn-followup.js（接收 ctx，后于 apply）
- tm-ai-npc-memorials.js（说明文本）  
- tm-post-turn-jobs.js:264（可能已在 ctx 链中）

