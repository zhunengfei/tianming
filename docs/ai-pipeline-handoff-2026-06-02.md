# 给下一个会话的信 · 天命 AI 管道（2026-06-02 收尾）

next-me 你好。这封信交接「AI 管道五问题修复」的进度。先读这封，再读两份配套 doc：

- ai-relay-T2-results.md（T1/T2 实跑测量 + 问题总结）
- ai-pipeline-5fixes-status.md（四刀修复明细）
- ai-sysprompt-dedup-and-fixes-plan.md（① 的落地方案·你要做的那刀）

## 背景一句话

owner（misfit）让 Claude 当「演绎脑」、零外部 API 跑通了天启 T1+T2 整回合，实测出 AI 管道的成本结构与 bug。然后 owner 选「混合·最高价值」五项问题让我修。我修完 4 个、验过，第 5 个（① sysP 去重）owner 拍板缓做、交给你。

## 已完成（4 刀·均 .bak 在 web/backups/2026-06-02-5fixes/·均 node 验·未 ship 未 commit）

1. **⑤ 落地层 U+FFFD 守卫** — tm-ai-change-narrative.js `_mergeUpdatesToEntity`：字符串写 GM 前剔除 U+FFFD 乱码。`node -c` OK。
2. **C 事件池消费已解决事件** — tm-endturn-prep.js：玩家诏令处理过的候选事件标 `_fired`（根因：`_fired` 全代码库从不置 true）。`node -c` OK。
3. **A fiscal 账户别名归一（治财政漏账）** — tm-ai-change-applier.js:1064：AI 写"太仓/国库/内帑"等自然名 → 归一到 `guoku`/`neitang`，否则 target 解析 null 静默漏账。baseline smoke + 8/8 单测过。
4. **B sc27 schema 错位 = 不是 bug**（我先前误判，已撤）：`edict_lifecycle_update` 链完整；`houren_xishuo` 是 sc2 合法输出。别再"修"它。

## 你要做的：① sysP 去重（最大省钱杠杆·也最险）

目标：每回合 ~19 个推演调用各驮 67K–194K 字几乎相同的静态前缀（sysP+校准快照+记忆），占全回合输入 ~69%、中转全价重发。让不需要全量的调用只驮精简 sysP，省 ~3-4 成输入。

方案（写死在 ai-sysprompt-dedup-and-fixes-plan.md）：刀1A 拆块（把 tm-endturn-prompt.js `build()` 的 `tp +=` 链拆成命名块·diff=0 逐字节不变）→ 刀1B `sysPFor(scId)` profile（FULL/NPC/FAC/LITE）→ 刀1C 换 ~18 处 `_maybeCacheSys(sysP)` 调用点。

为什么缓做 / 怎么稳着做：

- `build()` 是 1600 行字符串拼装（tm-endturn-prompt.js:70 `global.TM.Endturn.AI.prompt.build`，sysP body 约 L84–3373）。闭眼改=核心推演 prompt 回归。
- diff=0 验证必须有真实 sysP 基线。我这会话末尾手头没基线（中转队列已清）。你开工前先抓一份：开游戏→载入天启→跑到一次 `build()`→把 `ctx.prompt.sysP` 存下当 fixture，改完比对逐字节。
- 更稳的替代路子（我倾向，避免重构 build）：`build()` 完全不动（sysP 保持原样、零风险），在咽喉点 `_maybeCacheSys` 上挂一个「按 profile 削块」函数——LITE/FAC 调用才按块标记削掉（各NPC信息时差 6.9K / 鸿雁传书 3.4K / 后宫规则等）。拿真实 sysP 测「只删该删、其余原样、prompt 仍合法」。可验、可回滚。owner 没拍 A/B 路子，你开工时问一下。

## 环境/工具链坑（血泪·别重踩）

- 去 fetch 超时补丁必装：dev-tools/ai-relay/poll-and-secure.js 已把「config 重定向 + 去超时」合一。不装→游戏 45s 超时触发重试风暴、队列脏。
- reload 页面会卡死 cdp-eval：重启游戏用「杀进程 + 全新 `npx electron . --remote-debugging-port=9222`」，别 `location.reload`。
- Write 工具偶发 ENOENT（疑杀软扫 queue/answer 目录）：写 answer/答案文件用 `node fs.writeFileSync` 或 `bash echo >` 兜底。
- config 重定向是运行时注入·每次重启丢·必须重注入（poll-and-secure 干这个）。
- 演绎脑实跑 recipe 在 dev-tools/ai-relay/RESUME-T2.md（若还要再跑回合）。

## 安全铁律（一直有效）

- 玩家真 OpenAI key（len 51）+ secondary（wclau.de）绝不读不改·只改 URL。
- 实验已结束（T2 测完）。修 ① 不需要中转/不 fire AI（diff 验证只调 `build()`、不发 AI 调用）。所以你大概率根本用不到 key/中转。
- ship 热更 / commit 是 owner 显式触发·五刀全完工前不 ship。

## 当前状态

- 游戏已关、中转已停（owner 让关的）。
- 4 刀代码改动在 working tree（未 ship）、备份在 backups/2026-06-02-5fixes/。
- 还剩 ① 这一刀。开工前：先抓 sysP 基线、和 owner 确认 ① 走「拆块」还是「咽喉削块」路子。

加油。改完核心 prompt 记得 node 验 + 真跑一回合看推演没崩。

— 2026-06-02 的我
