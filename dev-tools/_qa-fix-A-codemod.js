// QA Fix A：①人物补显示嵌套字段(relations/career/familyMembers…)+隐藏内部元数据 ②官制职位补字段(俸禄/职责/权限/继任) ③行政加地图编辑器按钮。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const edits = [];
function once(a, b, t) { if (s.split(a).length - 1 !== 1) throw new Error('ANCHOR ' + t + ' x' + (s.split(a).length - 1)); s = s.replace(a, b); edits.push(t); }

// ① genCollection 加 characters
once(`    if (kind === 'adminDiv') return state._adminCurDiv ? [state._adminCurDiv] : null;`,
     `    if (kind === 'characters') return sc.characters;
    if (kind === 'adminDiv') return state._adminCurDiv ? [state._adminCurDiv] : null;`,
     'gencoll-characters');

// ① CHAR_HIDE_KEYS 扩内部元数据 + CHAR_NEST_LABELS/SUB
once(`  var CHAR_HIDE_KEYS = { id: 1, sid: 1, traitIds: 1, rels: 1, wuchangOverride: 1 };`,
     `  var CHAR_HIDE_KEYS = { id: 1, sid: 1, traitIds: 1, rels: 1, wuchangOverride: 1, abilityAudit: 1, simulationHints: 1, aiTurnUse: 1, dataConfidence: 1, refinementVersion: 1, cardParityVersion: 1, isSupplement: 1 };
  var CHAR_NEST_LABELS = { relations: '关系网', career: '仕途履历', familyMembers: '家族成员', familyStatus: '家族状况', valueSystem: '价值体系', personalGoals: '人生目标', resources: '私产', dialogues: '语录', skills: '技艺', achievements: '功业', titles: '封号爵位', personalGrudges: '私怨', aliases: '别名', formerNames: '曾用名', mentees: '门生', studentsIds: '门生', honors: '荣衔', possessions: '持有物', network: '人脉', marriages: '婚姻', feuds: '仇隙' };
  var CHAR_NEST_SUB = { familyStatus: { tier: '门第', prestige: '声望', head: '家主', seat: '籍贯' }, valueSystem: { core: '核心', priorities: '优先', taboos: '禁区' } };`,
     'char-hide-nest');

// ① detailPanel：把"结构化字段较复杂"提示 → 真的渲染出来(子网格/对象数组)
once(`    var complex = Object.keys(c).filter(function (k) { return !used[k] && k.charAt(0) !== '_' && (isObject(c[k]) || (Array.isArray(c[k]) && c[k][0] && typeof c[k][0] === 'object')); });
    var complexHtml = complex.length ? '<div class="rwf2-complex">结构化字段（' + complex.map(function (k) { return escapeHtml(specialistFieldLabel(k)); }).join('、') + '）较复杂，可在下方「⚙ 高级」专业表单里编辑。</div>' : '';`,
     `    var complex = Object.keys(c).filter(function (k) { return !used[k] && !CHAR_HIDE_KEYS[k] && k.charAt(0) !== '_' && (isObject(c[k]) || (Array.isArray(c[k]) && c[k][0] && typeof c[k][0] === 'object')); });
    var complexHtml = '';
    if (complex.length) {
      var nestLabels = {}; complex.forEach(function (k) { nestLabels[k] = CHAR_NEST_LABELS[k] || specialistFieldLabel(k); used[k] = 1; });
      complexHtml = '<div class="rwf2-sec"><div class="rwf2-st">关系 · 家族 · 履历 · 其它结构</div><div class="rwf2-grid2">' + complex.map(function (k) { return genFieldBlock('characters', i, k, c[k], nestLabels, CHAR_NEST_SUB); }).join('') + '</div></div>';
    }`,
     'detailpanel-complex');

// ② 官制职位：补第二行字段(俸禄/职注/权限/继任/职责)
once(`      return '<div class="oft-pos">' + ctl('name', pos.name, '官职') + ctl('rank', pos.rank, '品级') + ctl('holder', pos.holder, '现任(空缺则留白)') + ctl('establishedCount', pos.establishedCount, '员额', true) + ctl('vacancyCount', pos.vacancyCount, '缺员', true) + '</div>';`,
     `      var row1 = '<div class="oft-pos">' + ctl('name', pos.name, '官职') + ctl('rank', pos.rank, '品级') + ctl('holder', pos.holder, '现任(空缺则留白)') + ctl('establishedCount', pos.establishedCount, '员额', true) + ctl('vacancyCount', pos.vacancyCount, '缺员', true) + '</div>';
      function ctl2(field, val, ph, num) { return '<input ' + (num ? 'type="number" ' : '') + 'class="rwf2-ctl' + (num ? ' rwf2-num' : '') + '" data-office-path="' + base + '" data-office-field="' + field + '" value="' + escapeHtml(val == null ? '' : val) + '" placeholder="' + ph + '">'; }
      var hasExtra = ('salary' in pos) || ('perPersonSalary' in pos) || ('duties' in pos) || ('authority' in pos) || ('succession' in pos) || ('powers' in pos) || ('privateIncome' in pos);
      var row2 = hasExtra ? '<div class="oft-pos2"><span class="oft-l">俸</span>' + ctl2('salary', pos.salary, '俸禄', true) + ctl2('perPersonSalary', pos.perPersonSalary, '俸注') + '<span class="oft-l">权</span>' + ctl2('authority', pos.authority, '权限') + ctl2('succession', pos.succession, '继任') + ('powers' in pos ? ctl2('powers', pos.powers, '权责') : '') + ('privateIncome' in pos ? ctl2('privateIncome', pos.privateIncome, '灰收') : '') + '</div>' + ('duties' in pos ? '<div class="oft-duties"><span class="oft-l">职责</span>' + ctl2('duties', pos.duties, '职责') + '</div>' : '') : '';
      return row1 + row2;`,
     'office-pos-extra');

// ② 官制 CSS：第二行 + 职责
once(`    '.oft-subs{margin-top:2px}' +
  '</style>';`,
     `    '.oft-subs{margin-top:2px}' +
    '.oft-pos2{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:2px 0 1px}' +
    '.oft-pos2 .rwf2-ctl{font-size:11px;padding:1px 4px;flex:1;min-width:60px}' +
    '.oft-duties{display:flex;gap:4px;align-items:center;margin:1px 0 3px}.oft-duties .rwf2-ctl{font-size:11px;padding:1px 4px}' +
    '.oft-l{font-size:10px;color:#9c8b6b;flex:0 0 auto}' +
  '</style>';`,
     'office-css');

// ③ 行政：地图编辑器按钮 + CSS
once(`      '<div style="margin:4px 2px 8px;font-size:12px;color:#574733">势力：' + facSel + '</div>' +`,
     `      '<div style="margin:4px 2px 8px;font-size:12px;color:#574733;display:flex;align-items:center;gap:10px;flex-wrap:wrap">势力：' + facSel + '<button class="adt-mapbtn" data-editor-command="launch-map-editor" title="打开地图编辑器：画地块几何 / 改归属 / 调省界，画完点返回写回">🗺 打开地图编辑器</button></div>' +`,
     'admin-mapbtn');

once(`    '.adt-children{margin-left:12px;border-left:1px dashed rgba(168,131,58,.4);padding-left:6px}' +
  '</style>';`,
     `    '.adt-children{margin-left:12px;border-left:1px dashed rgba(168,131,58,.4);padding-left:6px}' +
    '.adt-mapbtn{cursor:pointer;border:1px solid #a8833a;background:linear-gradient(120deg,#fff3d6,#f0dba8);color:#7a2018;border-radius:8px;padding:4px 12px;font:inherit;font-size:12px;font-weight:700}' +
    '.adt-mapbtn:hover{border-color:#a83228;background:linear-gradient(120deg,#fff7e6,#f6e6bd)}' +
  '</style>';`,
     'admin-mapbtn-css');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
