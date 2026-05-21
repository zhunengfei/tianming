# 2026-05-21 剧本编辑器重置清单

本文件记录“剧本编辑器全面重置升级”的第一段基线。当前阶段只做编辑器侧审计与安全网，不改正式游戏运行时。

## 当前入口

- 剧本编辑器入口：`web/editor.html`
- 编辑器状态对象：`scriptData`
- 核心初始化：`web/editor-core.js`
- 保存/导入/导出：`web/editor-fullgen.js`
- 正式剧本适配：`web/editor-schema-adapter.js`
- 行政区划与地块映射：`web/editor-administration.js`
- 地图编辑器桥接：`web/map-editor-to-game.js`

## 官方天启剧本基线

审计脚本读取的官方剧本：

`C:\Users\37814\Desktop\tianming\scenarios\天启七年·九月（官方）.json`

核心规模：

- 顶层字段：82
- 人物：203
- 势力：22
- 党派：7
- 阶层：9
- 变量：21
- 事件：64
- 行政体系分组：23
- 地图陆地区域：43
- 海洋区域：8

这意味着新版剧本编辑器不能只按当前可见面板重做，必须以官方剧本真实字段为上限。

## 当前编辑器面板

静态检测到的 `panel-section`：

`administration`, `buildingSystem`, `characters`, `civicTree`, `classes`, `economy`, `eraState`, `events`, `factions`, `goals`, `government`, `haremConfig`, `imperialEdicts`, `influenceGroups`, `items`, `kejuSystem`, `mapSystem`, `military`, `offendGroups`, `palaceSystem`, `parties`, `playerOverview`, `postSystem`, `rules`, `scriptInfo`, `techTree`, `timeline`, `titleSystem`, `variables`, `vassalSystem`, `worldSettings`

隐藏但存在的面板：

`economy`, `goals`, `kejuSystem`, `postSystem`, `timeline`, `titleSystem`

存在但侧栏不可达的面板：

`imperialEdicts`, `offendGroups`

## 当前未映射顶层字段

第一版覆盖映射中，官方剧本里还没有明确编辑器归属的顶层字段：

`active`, `cities`, `culturalWorks`, `dynastyPhaseHint`, `environmentConfig`, `families`, `globalRules`, `mechanicsConfig`, `opening`, `openingLetters`, `traitDefinitions`

这些不一定都是要做独立面板，但新版编辑器必须决定它们的归属、展示、导入导出策略。

## 已确认风险与处理状态

1. `desktop-autosave-raw-scriptData`

   手动保存/导出会走 `SchemaAdapter.exportScenario(scriptData)`，但桌面自动保存路径存在直接写 raw `scriptData` 的分支。重置前必须统一保存出口。

   状态：已在本阶段修复。`saveScript()`、`autoSave()`、`returnToMain()` 的桌面保存统一走 `_saveScenarioToDesktop()`，并由 `_exportScenarioForPersistence()` 先调用 `SchemaAdapter.exportScenario(scriptData)`。

2. `map-editor-link-split-brain`

   当前 `地图编辑器`入口一边直接 `window.open('map-editor.html')`，另一边 `editor-core.js` 还保留旧的 `panel-map/toggleMapEditor` 内嵌路径。新版需要明确为“独立地图编辑器 + 剧本编辑器导入绑定向导”。

   状态：已在本阶段断开旧行为。`editor-core.js` 不再为 `map-editor-link` 绑定第二个监听器，当前入口只保留 `editor.html` 中打开独立 `map-editor.html` 的路径。后续需要补的是“剧本编辑器导入/绑定向导”，不是恢复内嵌地图面板。

3. `unreachable-editor-panels`

   `imperialEdicts` 和 `offendGroups` 有面板但侧栏不可达。重置时要么纳入信息架构，要么明确废弃/迁移。

   状态：已在本阶段恢复入口。侧栏新增 `初始皇命` 和 `额外得罪群体` 两个入口，`editor-core.js` 也加入对应 renderer。

4. `stale-rendered-admin-dom`

   `editor.html` 内含大量行政区划预渲染 DOM，不只是空挂载点。新版应改为数据驱动渲染，避免静态 HTML 存旧状态。

## 已新增安全网

- `web/scripts/editor-reset-inventory.js`
- `web/scripts/smoke-editor-reset-inventory.js`

运行：

```powershell
cd C:\Users\37814\Desktop\tianming\web
node scripts\smoke-editor-reset-inventory.js
node scripts\editor-reset-inventory.js
```

当前 smoke 结果：17 条断言通过。

## 下一步建议

1. 建立字段覆盖表第二版：从顶层字段下钻到人物、势力、行政区划、地图、官制、财政、军事。
2. 明确新版信息架构：剧本总览、玩家/开局、人物谱系、势力外交、朝廷官制、行政地图、财政人口、军事边防、事件时间、规则机制、AI/模型要求。
3. 清理行政区划旧 DOM：把静态预渲染内容改为空挂载点，由 `editor-administration.js` 独占渲染。
4. 再开始 UI 重构：先做剧本编辑器 shell 和导航，后迁移各旧面板功能。

## 2026-05-21 Update

- Cleared the stale administration DOM in `web/editor.html`. The `admin-stats-details`, `adminTree`, and `mapping-list` nodes are now empty mounts owned by the administration renderers.
- The reset inventory smoke now has 18 assertions and fails if stale administration output, raw desktop `scriptData` saves, map-editor split-brain handlers, or unreachable panels return.
- Current `node scripts\editor-reset-inventory.js` result: `risks: (none)`.
- Full verification after this slice: `node scripts\verify-all.js` passed all 123 checks in 83.0s.
- Next reset step: build the second-generation coverage map for unmapped official fields before redesigning the scenario-editor shell.

## 2026-05-21 Blueprint Update

- Added a future reset blueprint to `web/scripts/editor-reset-inventory.js`.
- The blueprint assigns all 82 official Tianqi top-level keys across 9 future editor modules: scenario opening, people/lineages, factions/society, court institutions, admin/map, economy/population, military/frontier, events/chronicle, and rules/AI.
- Current-editor coverage and future blueprint coverage are deliberately separate. Current editor coverage still reports unmapped keys such as `families`, `openingLetters`, and `traitDefinitions`; the future blueprint reports `unassignedTopLevelKeys: []`.
- The blueprint also summarizes nested official fields. Character coverage now groups identity, family/kinship, office career, abilities/traits, AI persona, and resources/memory. Faction coverage groups identity, leadership, NPC strategy, diplomacy, economy/military, and succession/end conditions.
- Verification after this blueprint pass: `smoke-editor-reset-inventory` passed 27 assertions and full `node scripts\verify-all.js` passed all 123 checks in 84.5s.
