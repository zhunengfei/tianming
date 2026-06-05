const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const edits = [];
function once(a, b, t) { if (s.split(a).length - 1 !== 1) throw new Error('ANCHOR ' + t + ' x' + (s.split(a).length - 1)); s = s.replace(a, b); edits.push(t); }

// 人物：wuchang 对象进 HIDE(五常组已渲sub·防nested重复+英文)
once(`  var CHAR_HIDE_KEYS = { id: 1, sid: 1, traitIds: 1, rels: 1, wuchangOverride: 1, abilityAudit: 1, simulationHints: 1, aiTurnUse: 1, dataConfidence: 1, refinementVersion: 1, cardParityVersion: 1, isSupplement: 1 };`,
     `  var CHAR_HIDE_KEYS = { id: 1, sid: 1, traitIds: 1, rels: 1, wuchang: 1, wuchangOverride: 1, abilityAudit: 1, simulationHints: 1, aiTurnUse: 1, dataConfidence: 1, refinementVersion: 1, cardParityVersion: 1, isSupplement: 1 };`,
     'hide-wuchang');

// 人物：career 数组型补 SPECIALIST
once(`personalGoals: '人生目标', familyMembers: '家族成员',`,
     `personalGoals: '人生目标', career: '仕途履历', familyMembers: '家族成员',`,
     'specialist-career');

// 行政：disaster 字段标签
once(`children: '下辖区划', disasterRecord: '灾害记录', id: '编号' };`,
     `children: '下辖区划', disasterRecord: '灾害记录', disaster: '灾害', id: '编号' };`,
     'admin-disaster-label');

// 势力：id→编号
once(`isSupplement: '补充条目', sid: '剧本ID', id: 'ID' };`,
     `isSupplement: '补充条目', sid: '剧本ID', id: '编号' };`,
     'fac-id');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
