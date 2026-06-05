// 列传 v2c：①立绘改按钮(点选路径) ②traits中文(tm-data-model权威表)+spouse布尔→复选+spouseRank中文 ③史料出处框拉长 ④对齐用readEntityProp。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

// ③ 史料出处等数组长文进 area
once(
`  var CHAR_AREA_KEYS = { appearance: 1, diction: 1, persona: 1, personality: 1, personalGoal: 1, innerThought: 1, coreMotivations: 1, redLines: 1, bio: 1, desc: 1, secret: 1, valueSystem: 1, aiPersonaText: 1 };`,
`  var CHAR_AREA_KEYS = { appearance: 1, diction: 1, persona: 1, personality: 1, personalGoal: 1, innerThought: 1, coreMotivations: 1, redLines: 1, bio: 1, desc: 1, secret: 1, valueSystem: 1, aiPersonaText: 1, historicalSources: 1, hobbies: 1, skills: 1, dialogues: 1, stressSources: 1, personalGoals: 1 };`,
'area-keys');

// ② spouseRank 进枚举映射
once(
`    royalRelation: { emperor_family: '帝室宗亲', emperor_consort: '皇帝后妃', emperor_spouse: '帝配', emperor_mother: '帝母', emperor_father: '帝父', emperor_brother: '皇弟', emperor_brother_spouse: '皇弟妃', emperor_brother_son: '皇侄', former_empress: '废后', former_consort: '废妃', consort_dowager: '太妃' }
  };`,
`    royalRelation: { emperor_family: '帝室宗亲', emperor_consort: '皇帝后妃', emperor_spouse: '帝配', emperor_mother: '帝母', emperor_father: '帝父', emperor_brother: '皇弟', emperor_brother_spouse: '皇弟妃', emperor_brother_son: '皇侄', former_empress: '废后', former_consort: '废妃', consort_dowager: '太妃' },
    spouseRank: { empress: '皇后', consort_noble: '贵妃', consort: '妃嫔', consort_dowager: '太妃', concubine: '侧室' }
  };`,
'enum-spouseRank');

once(
`  var CHAR_ENUM_OPTS = { type: 1, familyTier: 1, royalRelation: 1 };`,
`  var CHAR_ENUM_OPTS = { type: 1, familyTier: 1, royalRelation: 1, spouseRank: 1 };`,
'enum-opts-spouseRank');

// ② traits 权威中文表(取自 tm-data-model.js) + traitCnLabel；① 立绘按钮 handler（插在 charFieldControl 前）
once(
`  function charFieldControl(c, i, key) {`,
String.raw`  var TRAIT_LABELS = {
    brave: '勇猛', cowardly: '怯懦', calm: '沉稳', wrathful: '暴躁', content: '知足', ambitious: '野心勃勃', diligent: '勤勉', lazy: '怠惰',
    forgiving: '宽厚', vengeful: '睚眦必报', generous: '慷慨', greedy: '贪婪', gregarious: '善交际', shy: '内向', honest: '坦诚', deceitful: '狡诈',
    humble: '谦逊', arrogant: '傲慢', just: '公正', arbitrary: '专断', patient: '耐心', impatient: '急躁', trusting: '信人', suspicious: '猜忌', paranoid: '猜忌',
    temperate: '节制', gluttonous: '纵欲', compassionate: '仁慈', callous: '冷酷', sadistic: '残暴', fickle: '善变', stubborn: '固执', zealous: '虔诚', cynical: '愤世嫉俗',
    chaste: '守贞', lustful: '好色', eccentric: '古怪', brilliant: '睿智', merchant: '商贾', ruthless: '狠辣', scheming: '工于心计', reformist: '锐意革新', idealist: '理想主义', legalist: '法家', literary: '文采', zealot: '狂热'
  };
  function traitCnLabel(id) {
    if (TRAIT_LABELS[id]) return TRAIT_LABELS[id];
    var defs = state.scenario.traitDefinitions;
    if (Array.isArray(defs)) { for (var k = 0; k < defs.length; k++) { if (defs[k] && defs[k].id === id) return defs[k].name || id; } }
    return id;
  }
  function pickFolioPortrait() {
    var sel = state._folioSel, chars = state.scenario.characters;
    if (!Array.isArray(chars) || !chars[sel]) return;
    var cur = chars[sel].portrait || '';
    var v = global.prompt ? global.prompt('立绘路径（相对 web 根，如 assets/portraits/tianqi7/' + (chars[sel].name || '') + '.png）：', cur) : null;
    if (v == null) return;
    saveCharFolioField(sel, 'portrait', String(v).trim());
  }

  function charFieldControl(c, i, key) {`,
'traits-portrait-helpers');

// ④①② charFieldControl 整体替换：readEntityProp 读 + traits中文chips + spouse布尔复选 + 数组area
once(
`  function charFieldControl(c, i, key) {
    var v = c[key];
    var base = ' data-folio-char="' + i + '" data-folio-field="' + escapeHtml(key) + '"';
    if (CHAR_BOOL_KEYS[key]) return '<input type="checkbox"' + base + (v ? ' checked' : '') + '>';
    if (key === 'gender') return '<select class="rwf2-ctl"' + base + '>' + folioGenderOptions(v || '') + '</select>';
    if (key === 'faction') return '<select class="rwf2-ctl"' + base + '>' + folioFactionOptions(v || '') + '</select>';
    if (CHAR_ENUM_OPTS[key]) return '<select class="rwf2-ctl"' + base + '>' + charEnumOptions(key, v == null ? '' : String(v)) + '</select>';
    if (CHAR_NUM_KEYS[key]) return '<input type="number" class="rwf2-ctl rwf2-num"' + base + ' value="' + escapeHtml(typeof v === 'number' ? v : (v == null ? '' : v)) + '">';
    if (CHAR_AREA_KEYS[key]) return '<textarea class="rwf2-ctl rwf2-area"' + base + ' rows="2">' + escapeHtml(v == null ? '' : v) + '</textarea>';
    var val = Array.isArray(v) ? v.join('、') : (v == null ? '' : v);
    return '<input class="rwf2-ctl"' + base + ' value="' + escapeHtml(val) + '">';
  }`,
`  function charFieldControl(c, i, key) {
    var v = readEntityProp(c, key);
    var base = ' data-folio-char="' + i + '" data-folio-field="' + escapeHtml(key) + '"';
    if (key === 'traits') {
      var ids = Array.isArray(v) ? v : (v ? [v] : []);
      var chips = ids.map(function (t) { return '<span class="rwf2-trait" title="' + escapeHtml(t) + '">' + escapeHtml(traitCnLabel(t)) + '</span>'; }).join('');
      return '<span class="rwf2-traits">' + (chips || '<i class="rwf2-na">（无·在高级表单加）</i>') + '</span>';
    }
    if (CHAR_BOOL_KEYS[key] || typeof v === 'boolean') return '<input type="checkbox"' + base + (v ? ' checked' : '') + '>';
    if (key === 'gender') return '<select class="rwf2-ctl"' + base + '>' + folioGenderOptions(v || '') + '</select>';
    if (key === 'faction') return '<select class="rwf2-ctl"' + base + '>' + folioFactionOptions(v || '') + '</select>';
    if (CHAR_ENUM_OPTS[key]) return '<select class="rwf2-ctl"' + base + '>' + charEnumOptions(key, v == null ? '' : String(v)) + '</select>';
    if (CHAR_NUM_KEYS[key]) return '<input type="number" class="rwf2-ctl rwf2-num"' + base + ' value="' + escapeHtml(typeof v === 'number' ? v : (v == null ? '' : v)) + '">';
    if (CHAR_AREA_KEYS[key]) { var av = Array.isArray(v) ? v.join(String.fromCharCode(10)) : (v == null ? '' : v); return '<textarea class="rwf2-ctl rwf2-area"' + base + ' rows="2">' + escapeHtml(av) + '</textarea>'; }
    var val = Array.isArray(v) ? v.join('、') : (v == null ? '' : v);
    return '<input class="rwf2-ctl"' + base + ' value="' + escapeHtml(val) + '">';
  }`,
'charFieldControl-v2c');

// ① 立绘做成按钮（detailPanel 头）
once(
`    var face = psrc ? '<img class="rwf2-portrait" src="' + escapeHtml(psrc) + '" alt="立绘" onerror="this.classList.add(&#39;rwf2-noimg&#39;)">' : '<span class="rwf2-portrait rwf2-noimg"></span>';
    var head = '<div class="rwf2-dh">' + face + '<span class="rwf2-dh-t"><b>' + escapeHtml(c.name || '无名') + '</b><span>' + escapeHtml(c.officialTitle || c.title || '') + '</span></span></div>';`,
`    var inner = psrc ? '<img class="rwf2-portrait" src="' + escapeHtml(psrc) + '" alt="立绘" onerror="this.classList.add(&#39;rwf2-noimg&#39;)">' : '<span class="rwf2-portrait rwf2-noimg"></span>';
    var face = '<button class="rwf2-pbtn" data-editor-command="folio-pick-portrait" title="点击设置立绘路径">' + inner + '<span class="rwf2-pedit">设立绘</span></button>';
    var head = '<div class="rwf2-dh">' + face + '<span class="rwf2-dh-t"><b>' + escapeHtml(c.name || '无名') + '</b><span>' + escapeHtml(c.officialTitle || c.title || '') + '</span></span></div>';`,
'portrait-button');

// ① 命令分发
once(
`    if (command === 'folio-select-char') selectFolioChar(Number(target && target.dataset && target.dataset.folioCharI));`,
`    if (command === 'folio-select-char') selectFolioChar(Number(target && target.dataset && target.dataset.folioCharI));
    if (command === 'folio-pick-portrait') pickFolioPortrait();`,
'dispatch-portrait');

// CSS：traits chips + 立绘按钮
once(
`      '.rwf2-empty{color:#9c8b6b;padding:20px}' +`,
`      '.rwf2-empty{color:#9c8b6b;padding:20px}' +
      '.rwf2-traits{display:flex;flex-wrap:wrap;gap:4px}' +
      '.rwf2-trait{font-size:11px;padding:1px 8px;border-radius:9px;border:1px solid #c9a84c;background:rgba(255,250,235,.8);color:#7d5e22}' +
      '.rwf2-na{font-size:11px;color:#bcae8c;font-style:normal}' +
      '.rwf2-pbtn{position:relative;padding:0;border:none;background:none;cursor:pointer;flex:0 0 auto;line-height:0}' +
      '.rwf2-pbtn .rwf2-pedit{position:absolute;left:0;right:0;bottom:0;font-size:9px;line-height:1.5;color:#fff;background:rgba(122,32,24,.72);text-align:center;opacity:0;transition:opacity .15s}' +
      '.rwf2-pbtn:hover .rwf2-pedit{opacity:1}' +
      '.rwf2-pbtn:hover .rwf2-portrait{border-color:#a83228}' +`,
'css-traits-portrait');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
