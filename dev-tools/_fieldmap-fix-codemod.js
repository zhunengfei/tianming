// 字段对应修 — 以天启(唯一能跑官方剧本)为准：time/officeConfig 改非必填+sources去伪天启 + 补9势力中文标签。
const fs = require('fs');
const path = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

// 1) time → required:false + sources 去掉'天启官方'(天启实际没有 time，startYear 兜底)
once(
  "runtimeSurface('time', '历法配置', '时间系统', 'scenarioOpening', 'structured-workbench', '旧编辑器和正式启动都会把 time 写入 P.time。', ['正式启动', '旧编辑器 UI', '天启官方']),",
  "runtimeSurface('time', '历法配置', '时间系统', 'scenarioOpening', 'structured-workbench', '旧编辑器和正式启动都会把 time 写入 P.time（缺失时 startYear 兜底，故非必填）。', ['正式启动', '旧编辑器 UI'], false),",
  'time');

// 2) officeConfig → required:false + sources 去掉'天启官方'(天启实际没有，仅绍宋有)
once(
  "runtimeSurface('officeConfig', '官制成本配置', '官制宫廷', 'courtInstitutions', 'structured-workbench', '正式启动会写入 P.officeConfig。', ['正式启动', '天启官方', '绍宋官方']),",
  "runtimeSurface('officeConfig', '官制成本配置', '官制宫廷', 'courtInstitutions', 'structured-workbench', '正式启动会写入 P.officeConfig（天启官方未用，故非必填）。', ['正式启动', '绍宋官方'], false),",
  'officeConfig');

// 3) 补9个势力字段中文标签(违"全中文"的英文标签)
once(
  "    longTermStrategy: '长远方略', allies: '盟友', enemies: '敌对', neutrals: '中立',\n    // 事件/时间线",
  "    longTermStrategy: '长远方略', allies: '盟友', enemies: '敌对', neutrals: '中立',\n" +
  "    partyRelations: '党派关系', internalParties: '内部党派', naturalAllies: '天然盟友', history: '历史沿革', strengths: '优势', weaknesses: '劣势', victoryConditions: '胜利条件', defeatConditions: '失败条件', offendThresholds: '触怒阈值',\n" +
  "    // 事件/时间线",
  'labels');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
