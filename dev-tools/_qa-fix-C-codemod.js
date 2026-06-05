const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const edits = [];
function once(a, b, t) { if (s.split(a).length - 1 !== 1) throw new Error('ANCHOR ' + t + ' x' + (s.split(a).length - 1)); s = s.replace(a, b); edits.push(t); }

// 人物 CHAR_NEST_SUB：补 resources + 改 valueSystem 为真实子键
once(`  var CHAR_NEST_SUB = { familyStatus: { tier: '门第', prestige: '声望', head: '家主', seat: '籍贯' }, valueSystem: { core: '核心', priorities: '优先', taboos: '禁区' } };`,
     `  var CHAR_NEST_SUB = { familyStatus: { tier: '门第', prestige: '声望', head: '家主', seat: '籍贯' }, valueSystem: { order: '秩序', profit: '功利', faith: '信仰', honor: '荣誉', survival: '存续' }, resources: { privateWealth: '私财', publicPurse: '公帑', fame: '声望', virtueMerit: '功德', health: '健康', stress: '压力' } };`,
     'char-nest-sub');

// 人物 SPECIALIST_FIELD_LABELS：补 数组型/标量型 字段(familyMembers/aliases…)
once(`personalGoals: '人生目标', wuchangOverride: '五常覆写'`,
     `personalGoals: '人生目标', familyMembers: '家族成员', aliases: '别名', formerNames: '曾用名', mentees: '门生', studentsIds: '门生编号', personalGrudges: '私怨', honors: '荣衔', achievements: '功业', titles: '封号爵位', marriages: '婚姻', feuds: '仇隙', network: '人脉', possessions: '持有物', wuchangOverride: '五常覆写'`,
     'specialist-add');

// 行政 ADMIN_DIV_LABELS：disasterRecord + id→编号
once(`children: '下辖区划', id: 'ID' };`,
     `children: '下辖区划', disasterRecord: '灾害记录', id: '编号' };`,
     'admin-label-add');

// 行政 ADMIN_DIV_SUB.disaster 补子键
once(`    disaster: { active: '进行中', type: '类型', since: '起始', severity: '烈度', desc: '描述', historicalNote: '史注', willSpawnIfUnanswered: '不理则触发' }`,
     `    disaster: { active: '进行中', type: '类型', since: '起始', severity: '烈度', desc: '描述', historicalNote: '史注', willSpawnIfUnanswered: '不理则触发', subTypes: '子类', affectedSubDivisions: '波及下辖', casualties: '伤亡', mitigations: '缓解措施' }`,
     'admin-disaster-sub');


fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
