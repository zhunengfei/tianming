# 天命 · 性能审计与优化 (2026-06-02)

> 起因：玩家反映「极其卡顿」。四路并行调研（结算/渲染/增长/加载）+ 落地 Tier-1 安全优化。
> 本文是诊断 + 已做 + backlog 的留档。未 ship、未 commit。

---

## 0. 先取真实数字（强烈建议，零风险）

同步 JS 优化前，先确认卡顿到底是「同步 JS 计算」还是「等 AI 网络返回」。在卡顿存档的浏览器/Electron 控制台跑：

```javascript
GM._lastEndturnTimingSummary      // 6 个 step 哪个 ms 最大（ai step 通常最大=网络等待，非 JS 卡）
GM._lastEndturnSystemsTimings     // systems step 内 5 个粗阶段耗时
TM.perf.print()                   // corruption/guoku/authority 三个 tick 的 p95
TM.perf.downloadJSON()            // 导出
```

- 若 `ai` step 占绝对大头（秒~分钟级）→ 卡顿主要是**等 AI**，属网络 I/O，靠并发/流式/降 token 缓解，非本文同步优化能解。
- 若 `systems`/render step 是毫秒~几百 ms 且累积明显 → 本文同步优化直接有效。

---

## 1. 四大卡顿来源（按玩家可感程度排序）

### A. 启动加载 —— 首屏同步解析 21.4 MB JS（最大单点）
- index.html 同步加载 **288 个本地脚本 ≈ 21.4 MB / 27.5 万行**，仅 10 个 `defer`、**0 个 async / 0 个懒加载**。
- **单文件元凶**：`data/scenario-supplements/tianqi7-official-runtime-snapshot.js` = **7.09 MB（占总量 32%）**，72 行一个巨型字面量；+ `scenarios/tianqi7-1627.js` 904 KB。**两者合计 ~8 MB ≈ 37% 首屏负载，且无论玩家选哪个剧本都被同步加载+解析**。
- 科举 36 文件 1.25 MB / 2.6 万行、廷议 tm-tinyi-v3.js 333 KB、编辑器 7 文件 240 KB、tm-test* 82 KB（生产仍加载）。

### B. 地图 hover —— 每次 mousemove 全量扫描+重建（已修 ✅）
- `phase8-formal-map.js` mousemove → `regionPathFromPoint` → `findRegion`（对 `map.regions` 做 O(regions×7) 线性 `.find`+`.some`）→ `tip.innerHTML` 重建 + reflow，**无节流、无同省早退**。鼠标在地图上滑动时持续掉帧。

### C. 过回合 —— renderGameState 整树重建被调 2~3 次（部分已修 ✅）
- `renderGameState()`（tm-hongyan-office.js:1615，~613 行）`gc.innerHTML=""` 后**急切重建 15 个标签页全部内容**（绝大多数不可见）+ 末尾无条件跑 renderWendui/Memorials/Biannian/OfficeTree/ShijiList/Jishi/Difang/Tech/Civic/Renwu/SidePanels。
- 过回合时 `tm-endturn-core.js:1185` 与 `tm-endturn-render.js:1309` 又把内部已调的子渲染重复调一遍 → 一个回合内整树重建 **2~3 次**。
- `switchGTab()` 切页只切 `display` 不重建 —— 说明 renderGameState 把所有隐藏页都渲染掉是纯浪费。

### D. 越玩越卡 —— GM 无界增长拖慢 deepClone/序列化/渲染（部分已修 ✅）
- **`GM._turnReport` 从不重置**：每回合几十~上百条 push（applier 40+ 处），长局上万条。渲染只读当回合/上回合（render:954 按 `turn===GM.turn-1`、:1572 fiscal chips），却随存档全量序列化、`_collectFiscalAdjChips` 全量 forEach。
- **`GM._convArchive` 无 cap 且不在 autoSave 白名单** → 每 60s 被 `_autoSaveSnapshotGM` 全量 deepClone（双重伤害：又涨又拷）。
- `jishiRecords` / `qijuHistory` 写入端无 cap（读取端已 slice）。`_memTables` 纯追加表 rows 无统一 cap 且被 deepClone。
- 监听/定时器：**无确凿累积泄漏**（普遍有配对 clear/remove 或 `timer-leak-ok` 标注）。

### E. 每回合同步引擎链（需观测后再动）
- `aggregateRegionsToVariables` **每回合跑 3 次**（pre-AI / systems.tick 6.21 / final），单次内部 ~10× 全省遍历 + 1× 全角色。
- `findDivisionByNameFuzzy` 在 `_tickMinxinMatrix` / 民变里 = **O(省 × 全树 walk × 每节点 9 次 stripSuffix)** —— 唯一随剧本规模平方放大的算法点。
- `systems` step 40+ 引擎串行 tick，目前只 3 个 tick 有 perf 埋点，其余挤在一个总数里无法定位。

---

## 2. 已落地 Tier-1（低风险·已 node 语法校验·均留 .bak-perf-20260602-234542）

| # | 文件 | 改动 | 治 |
|---|------|------|----|
| 1 | tm-endturn-core.js:1184 | 删 5 个冗余 render 调用，缩为单个 `renderGameState()` | C 过回合重建 2~3→1 次 |
| 2 | tm-endturn-render.js:1309 | 删尾部 3 个冗余 render 调用 | C |
| 3 | tm-endturn-render.js:1308 | `_turnReport` > 600 时 `slice(-600)` | D 越玩越卡 |
| 4 | tm-endturn-followup.js:3196 | `_convArchive` > 200 时 `slice(-200)` | D |
| 5 | tm-save-lifecycle.js APPEND_ONLY | 加 `_convArchive:1`（引用不深拷） | D autoSave 冻结 |
| 6 | phase8-formal-map.js findRegion | 按 map 引用+长度缓存的反向索引 Map，O(n×7)→O(1) | B |
| 7 | phase8-formal-map.js mousemove | rAF 节流 + 同省早退（同省只挪位置不重建 innerHTML） | B |

**逻辑不变，只改「何时渲染/渲染多少/如何查找/是否裁剪」。display 文案未动。**

---

## 3. Backlog（需审批/需 live 验证，按 ROI 排序）

| 优先 | 项 | 收益 | 风险 | 说明 |
|------|----|------|------|------|
| ★★★ | 把 7MB 官方快照 + 904KB 剧本**延迟到选中该剧本后**加载 | 首屏砍 ~8MB（37%） | 中 | 改 tm-patches 的 apply 时机到选剧本后；需验证选官方剧本仍正确 seed |
| ★★★ | renderGameState **懒渲染当前 tab**（其余在 switchGTab 首次切入时建）+ 给 Memorials/Biannian/ShijiList/Jishi 加 renderRenwu 式可见性 guard | 过回合/切页大幅变快 | 中 | switchGTab 已是 display 切换，加「首次渲染」钩子 |
| ★★ | `findDivisionByName*` 加反向索引 Map | 治本唯一 O(n²) | 中 | 剧本越大越值得；aggregate 后重建索引 |
| ★★ | `aggregateRegionsToVariables` 每回合 3 次 → 删 systems.tick 6.21 那次 | 砍 ~1/3 聚合开销 | 中 | 需验证 final 仍写定 national |
| ★★ | 给 systems step 40+ 引擎 tick 补 `_markSystemStage` 埋点 | 可精确定位真凶 | 极低 | 纯观测，先加再优化 |
| ★ | renderTopBarVars 改局部更新文本节点 + 事件委托（替代每次整条 innerHTML + 65 内联 handler） | 高频小卡 | 中 | topbar-vars 单文件重构 |
| ★ | `jishiRecords`/`qijuHistory`/`_memTables.rows` 加环形 cap | 越玩越卡 | 低 | 同 Tier-1 范式 |
| ★ | `_renderEdictSuggestions` O(n²) sort 改预存 index Map + 事件委托 | 建议库重渲 | 低 | 单函数内 |
| ☆ | 科举 36 文件整组懒加载（进科举时拉）；生产移除 tm-test*；核实并懒加载/删除死的 canvas 地图 tm-map-system.js(84KB) | 首屏再砍 | 低~中 | 需先补一个轻量动态脚本加载器（当前 0 懒加载基建） |

---

## 4b. 本轮追加已落地（2026-06-03·owner「开始吧」批准后）

| # | 文件 | 改动 | 治 | 风险 |
|---|------|------|----|------|
| 8 | index.html:788 区块 | **7MB 官方快照从首屏同步解析移到 `requestIdleCallback` 空闲注入**（fallback load+600ms）。基础剧本 904KB 仍同步（保证选择列表）。快照 IIFE 自应用+重试+`tm:p-restored` 自愈+幂等去重，唯一消费者 `_tmStartApplyOfficialSnapshot`（启动时按 sid gate，typeof 守卫）→ 时序安全 | A 首屏砍 ~32% | 低-中（需桌面端验官方剧本仍正确 seed） |
| 9 | tm-endturn-render.js:1310 | `jishiRecords` > 400 时 `slice(-400)`（push 尾插·读取端只取近 50） | D | 低 |
| 10 | tm-hongyan-office.js:2302 | `_renderEdictSuggestions` sort 比较器内 `indexOf` → 预存索引 Map，O(n² log n)→O(n log n) | C/E 建议库重渲 | 低 |

**纠正**：`qijuHistory` **已在** `tm-faction-npc-in-turn-driver.js:196` 和 `tm-faction-npc-news-bridge.js:41` 各有 `slice(0,200)` 上限（§1-D 误判其无 cap），本轮不重复裁剪。

### 第二轮 · 纪录类面板懒渲染（复刻 renderRenwu/_renderDifangPanel 已验证范式）

| # | 文件 | 改动 | 治 | 风险 |
|---|------|------|----|------|
| 11 | tm-player-core.js | 新增通用 `_gtTabVisible(panelId)`（与 `_rwIsPanelVisible` 同机制）；switchGTab 加 gt-memorial/biannian/shiji/jishi 切页 `force=true` 触发 | C 过回合 | 低 |
| 11 | tm-memorials.js / tm-office-panel.js / tm-shiji-qiju-ui.js / tm-wendui.js | renderMemorials/Biannian/ShijiList/Jishi 加 `force` 参数 + 隐藏即跳过的 guard | C | 低 |

**原理**：这 4 个面板原由 renderGameState 尾部（2215）**无条件**重渲，即便其 tab 隐藏（`styles.css:1758 .g-tab-panel{display:none}`）。长局 shijiHistory 数百条、每次过回合都全量 reverse+分组纯属浪费。改为隐藏时跳过、切到该页时强制渲染——与 renderRenwu 完全同范式。**安全确认**：4 面板仅由 switchGTab 显示（无其它直接 display 操作），可见时其它调用照常渲染。**需桌面端实跑点开这 4 个 tab 确认内容正常。**

## 5. 第三方面 · 资源 / 绘制 / 字体（2026-06-03·新维度·决定性发现）

### 🔴🔴 assets/ 原 418MB → 现 180.5MB（2026-06-03 立绘压缩后复测）—— 仍是「极其卡顿」+ renderer OOM 黑屏的最大单因
| 资源 | 原体积 | 现状(2026-06-03 复测) | 说明 |
|------|------|------|------|
| `assets/portraits/` 133 张 PNG | **336MB** | **✅ 97.9MB**（均值 753KB·640×640/480×640） | 已降采样到 640px(只缩不放)·解码位图内存随像素²降·配合 #12 懒/异步解码 → 主线程压力已下来 |
| `assets/ui/` *-trial mockup 9 个 | — | **🟢 ~24MB·全树零引用** | 印章 trial×3(1254²)+screen-overall trial×3(1586×992)+yushufang trial×3(1280×800)·均为旧预览导出·**运行时从不加载** → 纯包体死重·安全删 |
| `assets/ui/home/...ambient.gif` | 10.8MB | 10.6MB(1280×720·仍在) | 首页背景(styles.css:401)·GIF **逐帧 CPU 解码合成**(不硬解)·**仅首页/启动·游戏开始后 #launch 隐藏即停**→ 影响菜单非过回合 |
| `assets/fonts/` 4 个 CJK TTF | 25MB | 24.5MB(仍在) | **全有 `font-display:swap`** → 不阻塞首屏文字渲染·非卡源·子集化仅省包体 |
| `assets/audio/` 5 个 MP3 | 22MB | 21.4MB(仍在) | 按需流式·off-main-thread 解码·非卡源·MP3 已压缩 → 不动 |

**已落地（代码侧·低风险·node 过·留 .bak）：**
| # | 文件 | 改动 |
|---|------|------|
| 12 | tm-renwu-ui.js / tm-hongyan-office.js(×3) / phase8-formal-drafts.js(hy-face+edict-sug) | 肖像 `<img>` 全部加 `loading="lazy" decoding="async"`（全库原本 **0 处** lazy/async）→ 只解码视口内可见头像 + 离主线程异步解码 |

**肖像重编码（决定性·移动端最致命）—— 已产出压缩集，待 owner 验质量后替换：**
- **2026-06-03 落地**：本机无 ImageMagick/sharp，改用 **Windows 自带 System.Drawing**（PowerShell·零安装）写了可复用脚本 `scripts/compress-portraits.ps1`。降采样到 ≤640px 长边（只缩不放·HighQualityBicubic·同名 .png 保格式·zero 代码改动）。
- **已替换生效（owner 2026-06-03 批「备份+替换」）**：`assets/portraits/tianqi7/` 现为压缩集 **133 张·97.9MB**（原 334.8MB·省 70.8%）。抽验命名（仁祖李倧 480×640）+ generic（court-woman 640×640）质量清晰，衣纹面容俱在。**原图整目录移出 web 树备份在 `C:\Users\37814\Desktop\tianming\_asset-backups\portraits-tianqi7-orig-20260603\`（334.8MB·可随时还原·在 web 树外不会被打包/热更误带）**。
- **owner 选 PNG 原地降采样方案**（弃 JPEG，因 .png→.jpg 会打断全库 `<img src>` 引用）。PNG 无损只到 70.8%（非 JPEG 的 ~95%），但 336→98MB 对移动端按需下载已够。
- 旧方案备忘（若将来装 ImageMagick 追求 ~10MB）：`magick mogrify -path out -resize 640x640\> -strip -quality 88 ...` 或转 WebP。
- 首页 ambient GIF 10.8MB → `<video>`(WebM/MP4) 或静态 PNG（降 80%+ 且硬解）。
- 4 个 TTF → woff2（25MB→~13MB·改 4 行 `format("woff2")`）+ 按剧本字符集子集化（可降到 1-2MB/字体）。

### CSS 绘制微调（来自专项调查·低风险·待落地）
- `.tmv3-list`（御案中央奏疏流·最常滚动）加 `contain:content`（phase8-formal-bridge.js:2408）。
- `.tmv3-turnhead` 吸顶表头去 `backdrop-filter:blur` 改不透明实色（:2413·sticky+blur 滚动每帧重算）。
- 常驻栏 `.gs-status-bar`/`.gs-turn-fab-bar`/`.toast` 的 `backdrop-filter` 改半透明实色（styles.css:626/646/210）。
- `tmv3-pulse` / `og-group-glow` 的 box-shadow infinite 脉冲改 opacity/transform（box-shadow 动画每帧 paint）。

### 已落地（CSS·零视觉影响·node 过）
| # | 文件 | 改动 |
|---|------|------|
| 13 | phase8-formal-bridge.js:2408 | `.tmv3-feed .tmv3-list` 加 `contain:content`（御案中央奏疏流·最常滚动的容器·隔离重绘） |

### 已查证 · 非问题（不动）
- **Electron 主进程**（`main-impl.js:1160` BrowserWindow）：硬件加速**开启**（无 `disableHardwareAcceleration`/`disable-gpu` 开关）、`show:false` 等 `ready-to-show`（无白屏）、devtools 不默认打开、`backgroundThrottling:false`（故意·让游戏后台续跑）。配置无性能问题——慢在渲染层而非主进程。注：默认 `fullscreen:true`，高分屏(4K)下按原生分辨率渲染会放大绘制量，叠加 336MB 肖像+毛玻璃更明显，但属预期非配置 bug。
- **调试系统**：`diagnostics-foundation` 5s 巡检是 `TM.guard.start()` 手动开启、无代码自动调用；`debug-logger` flush 空队列近乎零成本。生产无开销。
- **记忆子系统（20+ tm-memory-*.js）**：默认路径不是每回合负担。最重的向量召回 `tm-semantic-recall.js`（cosine/embedding）**默认关闭**（`STATE.enabled:false`·玩家开关）+ 模型未就绪即 no-op + 增量索引（只处理 `lastIndexedTurn` 以来新增）；endturn 经 `searchSyncSafe` 调用，禁用时为空操作。`context-compiler` 用 `.slice(0,4)/.slice(0,maxLen)` 有界。仅当玩家手动开启嵌入召回时才有成本，且 `_embed` 异步、不阻塞主线程（首次加载本地 ONNX 模型是一次性开销）。

## 6. 待 owner 动手清单（需本机工具/需实跑·已记录·按收益排序）
1. ~~**🔴 肖像重编码**~~ **已完成**（2026-06-03·owner 批「备份+替换」）：`tianqi7/` 现为压缩集 336MB→98MB（省 70.8%），原图备份在 web 树外 `_asset-backups/portraits-tianqi7-orig-20260603/`。脚本 `scripts/compress-portraits.ps1` 可复用。**桌面端实跑需眼验人物志网格肖像正常显示**（这是唯一剩余验证点）。
1b. ~~**🟢 删 9 个 `-trial` mockup（~24MB·零运行时引用）**~~ **已完成**（2026-06-03·owner 批「确保没用+备份」）：穷尽核查确认 js/html/css **零运行时引用**（仅 docs 设计文档历史 + build 自动生成 `.hot-update-manifest.json` 提及·均非运行时加载），属 Phase 8「12 殿」**已弃案** v2 设计的 Codex 生图 trial。9 文件（seal trial×3 + screen-overall trial×3 + yushufang trial×3）已整体**移出 web 树**到 `_asset-backups/ui-phase8-trial-orphans-20260603/`（保留目录结构+还原 README·可随时还原）。结果：`ui/` 36.8→12.7MB，`assets/` 180.5→**156.4MB**。`rail/`、`scenes/` 现为空目录（无害）。
2. 首页 ambient GIF 10.6MB → `<video>`(WebM/MP4) 或静态 PNG（已有静态 fallback `home-menu-imperial-study-v1.png`·仅 `prefers-reduced-motion` 时用）。仅省菜单/启动开销，非过回合。
3. 4 个 CJK TTF（25MB）→ woff2（改 4 行 `format("woff2")`）+ 按剧本字符集子集化。
4. CSS 视觉相关微调（动毛玻璃观感·需 owner 拍板）：常驻栏 `.gs-status-bar`/`.gs-turn-fab-bar`/`.toast` 去 `backdrop-filter:blur`；`.tmv3-turnhead` sticky 表头去 blur；box-shadow infinite 脉冲改 opacity。
5. **实跑验证全部 13 项代码改动** + 卡顿存档跑 `GM._lastEndturnTimingSummary`/`TM.perf.print()` 给数字校准下一轮。
- **saveP()**：每次 `deepClone(P)`（P 已含合并快照数据）是次要递归开销·归 [[autosave-A]] backlog·本轮不动。

## 4. 备注
- 测真实数字（§0）应在 ROI 排序前做一次，校准 A vs E 的权重。
- Tier-1 全部 node 语法过，但**端到端验证需在桌面端实跑游戏**（过几个回合、地图悬停、长局存档）——这步只有 owner 能做。
- 所有改动留 `.bak-perf-*`，可一键还原。未 ship、未 commit。
