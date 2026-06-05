// 人物列传 v2：名册(贴游戏人物图志·势力分组紧凑卡) + 详情(全字段·每个都「游戏对齐标签:控件」)。
// 修 bug：把我 POC 的 saveFolioField(charIndex,...) 改名 saveCharFolioField，解除与原 saveFolioField(field,...)的同名覆盖。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

// ── E1：folioCardHtml 整函数替换为 v2 名册/详情 helper 群 ──
const OLD_FOLIOCARD = `  function folioCardHtml(c, i) {
    if (!c || typeof c !== 'object') return '';
    var color = folioColorFor(c.faction || c.family || c.name);
    function fin(field, val, ph, w) { return '<input class="rwf-in" data-folio-char="' + i + '" data-folio-field="' + field + '"' + (w ? ' style="width:' + w + '"' : '') + ' value="' + escapeHtml(val == null ? '' : val) + '"' + (ph ? ' placeholder="' + escapeHtml(ph) + '"' : '') + '>'; }
    var chips = '';
    if (c.isPlayer) chips += '<span class="rwf-chip" style="border-color:#a83228;color:#a83228">可玩</span>';
    if (c.isRoyal) chips += '<span class="rwf-chip" style="border-color:#7d5e22;color:#7d5e22">皇族</span>';
    var abil = FOLIO_ABIL.map(function(a) {
      var v = c[a[0]]; v = (typeof v === 'number') ? v : (v == null ? '' : v);
      return '<div class="rwf-ab"><b>' + a[1] + '</b><input type="number" min="0" max="100" data-folio-char="' + i + '" data-folio-field="' + a[0] + '" value="' + escapeHtml(v) + '"></div>';
    }).join('');
    return '<div class="rwf-card" style="--fc:' + color + '">' +
      '<div class="rwf-row">' +
        '<input class="rwf-name" data-folio-char="' + i + '" data-folio-field="name" value="' + escapeHtml(c.name || '') + '">' +
        fin('zi', c.zi, '字', '3.2em') + fin('haoName', c.haoName, '号', '3.6em') + chips +
      '</div>' +
      '<div class="rwf-row">' + fin('officialTitle', c.officialTitle, '官职', '8em') +
        '<select class="rwf-sel" data-folio-char="' + i + '" data-folio-field="faction">' + folioFactionOptions(c.faction || '') + '</select>' +
      '</div>' +
      '<div class="rwf-row">' +
        '<span class="rwf-lbl">年</span><input class="rwf-in" type="number" style="width:3em" data-folio-char="' + i + '" data-folio-field="age" value="' + escapeHtml(c.age == null ? '' : c.age) + '">' +
        '<select class="rwf-sel" data-folio-char="' + i + '" data-folio-field="gender">' + folioGenderOptions(c.gender || '') + '</select>' +
        fin('role', c.role, '定位', '6em') +
      '</div>' +
      '<div class="rwf-abil">' + abil + '</div>' +
    '</div>';
  }`;

const NEW_HELPERS = String.raw`  // ── 人物列传 v2 helper：详情分区 + 控件类型 + 名册卡 ──
  function charDetailGroups() {
    return [
      { t: '身份', keys: ['name', 'zi', 'haoName', 'displayName', 'title', 'officialTitle', 'role', 'occupation', 'rankLevel', 'class', 'age', 'gender', 'birthYear', 'birthplace', 'birthTime', 'ethnicity', 'faith', 'culture', 'learning', 'location', 'alive', 'isHistorical', 'isFictional', 'isPlayer', 'isRoyal', 'royalRelation'] },
      { t: '禀赋', keys: ['intelligence', 'valor', 'military', 'administration', 'management', 'charisma', 'diplomacy', 'benevolence', 'integrity', 'loyalty', 'ambition'] },
      { t: '立场与势力', keys: ['faction', 'party', 'partyRank', 'stance', 'superior', 'mentor'] },
      { t: '家族', keys: ['family', 'familyTier', 'familyRole', 'clanPrestige', 'lineage'] },
      { t: '人格与志向', keys: ['appearance', 'diction', 'persona', 'personality', 'personalGoal', 'innerThought', 'coreMotivations', 'redLines', 'hobbies', 'bio', 'desc'] }
    ];
  }
  var CHAR_NUM_KEYS = { age: 1, rankLevel: 1, birthYear: 1, clanPrestige: 1, importance: 1, health: 1, stress: 1, intelligence: 1, valor: 1, military: 1, administration: 1, management: 1, charisma: 1, diplomacy: 1, benevolence: 1, integrity: 1, loyalty: 1, ambition: 1, partyInfluence: 1 };
  var CHAR_BOOL_KEYS = { alive: 1, isHistorical: 1, isFictional: 1, isPlayer: 1, isRoyal: 1, dead: 1 };
  var CHAR_AREA_KEYS = { appearance: 1, diction: 1, persona: 1, personality: 1, personalGoal: 1, innerThought: 1, coreMotivations: 1, redLines: 1, bio: 1, desc: 1, secret: 1, valueSystem: 1, aiPersonaText: 1 };
  function charFieldControl(c, i, key) {
    var v = c[key];
    var base = ' data-folio-char="' + i + '" data-folio-field="' + escapeHtml(key) + '"';
    if (CHAR_BOOL_KEYS[key]) return '<input type="checkbox"' + base + (v ? ' checked' : '') + '>';
    if (key === 'gender') return '<select class="rwf2-ctl"' + base + '>' + folioGenderOptions(v || '') + '</select>';
    if (key === 'faction') return '<select class="rwf2-ctl"' + base + '>' + folioFactionOptions(v || '') + '</select>';
    if (CHAR_NUM_KEYS[key]) return '<input type="number" class="rwf2-ctl rwf2-num"' + base + ' value="' + escapeHtml(typeof v === 'number' ? v : (v == null ? '' : v)) + '">';
    if (CHAR_AREA_KEYS[key]) return '<textarea class="rwf2-ctl rwf2-area"' + base + ' rows="2">' + escapeHtml(v == null ? '' : v) + '</textarea>';
    var val = Array.isArray(v) ? v.join('、') : (v == null ? '' : v);
    return '<input class="rwf2-ctl"' + base + ' value="' + escapeHtml(val) + '">';
  }
  function charDetailField(c, i, key) {
    return '<label class="rwf2-f"><span class="rwf2-fl">' + escapeHtml(specialistFieldLabel(key)) + '</span>' + charFieldControl(c, i, key) + '</label>';
  }
  function rosterCard(c, i, sel) {
    if (!c || typeof c !== 'object') return '';
    var fc = folioColorFor(c.faction || c.family || c.name);
    var ab = [['忠', c.loyalty], ['野', c.ambition], ['智', c.intelligence], ['武', c.valor], ['政', c.administration]].map(function (a) { return a[0] + (a[1] != null ? a[1] : '·'); }).join(' ');
    return '<button class="rwf2-rc' + (i === sel ? ' active' : '') + (c.alive === false ? ' dead' : '') + '" style="--fc:' + fc + '" data-editor-command="folio-select-char" data-folio-char-i="' + i + '">' +
      '<span class="rc-top"><b>' + escapeHtml(c.name || '无名') + '</b>' + (c.zi ? '<span class="rc-zi">字' + escapeHtml(c.zi) + '</span>' : '') + (c.age != null ? '<span class="rc-age">' + escapeHtml(c.age) + '岁</span>' : '') + (c.isPlayer ? '<span class="rc-flag">可玩</span>' : '') + '</span>' +
      '<span class="rc-off">' + escapeHtml(c.officialTitle || c.title || '布衣') + '</span>' +
      '<span class="rc-ab">' + escapeHtml(ab) + '</span>' +
    '</button>';
  }
  function detailPanel(c, i) {
    if (!c) return '<div class="rwf2-empty">左侧点一位人物，在此逐字段编辑。</div>';
    var used = {};
    var secs = charDetailGroups().map(function (g) {
      var rows = g.keys.map(function (k) { used[k] = 1; return charDetailField(c, i, k); }).join('');
      return '<div class="rwf2-sec"><div class="rwf2-st">' + escapeHtml(g.t) + '</div><div class="rwf2-grid2">' + rows + '</div></div>';
    }).join('');
    var extras = Object.keys(c).filter(function (k) { return !used[k] && k.charAt(0) !== '_' && !isObject(c[k]) && !(Array.isArray(c[k]) && c[k][0] && typeof c[k][0] === 'object'); });
    var extraHtml = extras.length ? '<div class="rwf2-sec"><div class="rwf2-st">其他</div><div class="rwf2-grid2">' + extras.map(function (k) { used[k] = 1; return charDetailField(c, i, k); }).join('') + '</div></div>' : '';
    var complex = Object.keys(c).filter(function (k) { return !used[k] && k.charAt(0) !== '_' && (isObject(c[k]) || (Array.isArray(c[k]) && c[k][0] && typeof c[k][0] === 'object')); });
    var complexHtml = complex.length ? '<div class="rwf2-complex">结构化字段（' + complex.map(function (k) { return escapeHtml(specialistFieldLabel(k)); }).join('、') + '）较复杂，可在下方「⚙ 高级」专业表单里编辑。</div>' : '';
    return '<div class="rwf2-dh"><b>' + escapeHtml(c.name || '无名') + '</b><span>' + escapeHtml(c.officialTitle || c.title || '') + '</span></div>' + secs + extraHtml + complexHtml;
  }
  function selectFolioChar(i) {
    if (!(i >= 0)) return;
    state._folioSel = i;
    reRenderModulePrimary();
  }`;

once(OLD_FOLIOCARD, NEW_HELPERS, 'helpers-v2');

// ── E2：renderCharacterFolio 整函数替换为 v2(名册+详情两栏) ──
const OLD_RENDER = `  function renderCharacterFolio() {
    var chars = Array.isArray(state.scenario.characters) ? state.scenario.characters : [];
    var css = '<style>' +
      '.rwf-wrap{padding:2px}' +
      '.rwf-head{font:600 13px/1.6 "KaiTi","STKaiti","Noto Serif SC",serif;color:#7d5e22;margin:2px 2px 10px}' +
      '.rwf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px}' +
      '.rwf-card{position:relative;background:linear-gradient(120deg,#fffdf3,#f6efda 80%);border:1px solid #dcc99c;border-radius:10px;padding:11px 13px 12px 17px;overflow:hidden;box-shadow:0 2px 8px rgba(58,40,22,.12);font-family:"KaiTi","STKaiti","Noto Serif SC",serif;color:#241d15}' +
      '.rwf-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--fc,#a8833a)}' +
      '.rwf-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px}' +
      '.rwf-name{font-size:19px;font-weight:700;color:#7a2018;border:none;background:transparent;border-bottom:1px dashed transparent;width:5.2em;font-family:inherit}' +
      '.rwf-name:hover,.rwf-name:focus{border-bottom-color:#a8833a;outline:none;background:rgba(168,131,58,.08)}' +
      '.rwf-in{border:none;background:transparent;border-bottom:1px dashed transparent;color:#574733;font:inherit;font-size:12px;padding:1px 2px}' +
      '.rwf-in:hover,.rwf-in:focus{border-bottom-color:#a8833a;outline:none;background:rgba(168,131,58,.08)}' +
      '.rwf-lbl{font-size:10px;color:#9c8b6b}' +
      '.rwf-sel{border:1px solid #dcc99c;border-radius:6px;background:rgba(255,252,242,.7);font:inherit;font-size:12px;color:#574733;padding:1px 4px}' +
      '.rwf-chip{font-size:10px;padding:1px 7px;border-radius:9px;border:1px solid #a8833a;color:#7d5e22;background:rgba(255,250,235,.7)}' +
      '.rwf-abil{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;margin-top:8px;border-top:1px solid rgba(168,131,58,.2);padding-top:7px}' +
      '.rwf-ab{text-align:center}' +
      '.rwf-ab b{display:block;font-size:9px;color:#9c8b6b;font-weight:400}' +
      '.rwf-ab input{width:100%;text-align:center;border:none;background:transparent;color:#2d5848;font:inherit;font-size:13px;font-weight:700;border-radius:4px;-moz-appearance:textfield}' +
      '.rwf-ab input:hover,.rwf-ab input:focus{background:rgba(168,131,58,.12);outline:none}' +
    '</style>';
    if (!chars.length) return css + '<div class="rwf-wrap"><div class="rwf-head">本剧本暂无人物。可去「表单」新增，或让国师生成。</div></div>';
    var cards = chars.slice(0, 80).map(folioCardHtml).join('');
    return css + '<div class="rwf-wrap"><div class="rwf-head">列传 · ' + chars.length + ' 人' + (chars.length > 80 ? '（显示前 80）' : '') + ' · 点任一字段直接改，国师改也实时刷新；改势力即换色</div><div class="rwf-grid">' + cards + '</div></div>';
  }`;

const NEW_RENDER = String.raw`  function renderCharacterFolio() {
    var chars = Array.isArray(state.scenario.characters) ? state.scenario.characters : [];
    var css = '<style>' +
      '.rwf2-wrap{font-family:"KaiTi","STKaiti","Noto Serif SC",serif;color:#241d15}' +
      '.rwf2-head{font:600 13px/1.6 inherit;color:#7d5e22;margin:2px 2px 10px}' +
      '.rwf2-cols{display:grid;grid-template-columns:minmax(170px,250px) 1fr;gap:14px;align-items:start}' +
      '.rwf2-roster{max-height:72vh;overflow:auto;padding-right:4px}' +
      '.rwf2-fac{font-size:11px;color:#7d5e22;border-left:3px solid var(--fc,#a8833a);padding:2px 8px;margin:8px 0 4px;background:rgba(168,131,58,.08)}' +
      '.rwf2-fac span{color:#9c8b6b;margin-left:6px}' +
      '.rwf2-rc{display:block;width:100%;text-align:left;cursor:pointer;position:relative;background:linear-gradient(120deg,#fffdf3,#f6efda 80%);border:1px solid #e0d2ad;border-radius:8px;padding:7px 10px 7px 13px;margin-bottom:5px;overflow:hidden;font-family:inherit;color:#241d15}' +
      '.rwf2-rc::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--fc,#a8833a);opacity:.6}' +
      '.rwf2-rc:hover{border-color:#a8833a}' +
      '.rwf2-rc.active{border-color:#a83228;box-shadow:-2px 0 0 #a83228,0 2px 8px rgba(120,90,40,.12);background:linear-gradient(120deg,#fffef7,#fbf4e0)}' +
      '.rwf2-rc.dead{opacity:.6}' +
      '.rc-top b{font-size:15px;color:#7a2018}' +
      '.rc-zi,.rc-age{font-size:10px;color:#9c8b6b;margin-left:5px}' +
      '.rc-flag{font-size:9px;color:#a83228;border:1px solid #a83228;border-radius:7px;padding:0 4px;margin-left:5px}' +
      '.rc-off{display:block;font-size:11px;color:#574733;margin:2px 0}' +
      '.rc-ab{display:block;font-size:10px;color:#2d5848;letter-spacing:.02em}' +
      '.rwf2-detail{background:linear-gradient(160deg,#fffdf3,#f8f1dc);border:1px solid #dcc99c;border-radius:12px;padding:12px 14px;box-shadow:0 2px 10px rgba(58,40,22,.1)}' +
      '.rwf2-dh{border-bottom:1px solid rgba(168,131,58,.3);padding-bottom:6px;margin-bottom:8px}' +
      '.rwf2-dh b{font-size:20px;color:#7a2018}' +
      '.rwf2-dh span{font-size:12px;color:#574733;margin-left:8px}' +
      '.rwf2-sec{margin-bottom:10px}' +
      '.rwf2-st{font-size:12px;font-weight:700;color:#a8833a;border-left:3px solid #a8833a;padding-left:7px;margin-bottom:6px}' +
      '.rwf2-grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:6px 10px}' +
      '.rwf2-f{display:flex;flex-direction:column;gap:1px;font-size:12px}' +
      '.rwf2-fl{font-size:10px;color:#9c8b6b}' +
      '.rwf2-ctl{border:1px solid #e0d2ad;border-radius:5px;background:rgba(255,252,242,.85);font:inherit;font-size:12px;color:#241d15;padding:2px 5px;width:100%;box-sizing:border-box}' +
      '.rwf2-ctl:hover,.rwf2-ctl:focus{border-color:#a8833a;outline:none}' +
      '.rwf2-area{resize:vertical;min-height:2.3em}' +
      '.rwf2-f input[type=checkbox]{width:auto;align-self:flex-start;margin-top:2px}' +
      '.rwf2-complex{font-size:11px;color:#9c8b6b;margin-top:8px;padding-top:6px;border-top:1px dashed rgba(168,131,58,.3)}' +
      '.rwf2-empty{color:#9c8b6b;padding:20px}' +
    '</style>';
    if (!chars.length) return css + '<div class="rwf2-wrap"><div class="rwf2-head">本剧本暂无人物。可在「⚙ 高级」专业表单新增，或让国师生成。</div></div>';
    var sel = (typeof state._folioSel === 'number' && state._folioSel >= 0 && state._folioSel < chars.length) ? state._folioSel : 0;
    var groups = {};
    chars.forEach(function (c, i) { var f = (c && c.faction) || '（无所属）'; (groups[f] = groups[f] || []).push(i); });
    var roster = Object.keys(groups).map(function (f) {
      return '<div class="rwf2-fac" style="--fc:' + folioColorFor(f) + '">' + escapeHtml(f) + '<span>' + groups[f].length + '</span></div>' +
        groups[f].map(function (i) { return rosterCard(chars[i], i, sel); }).join('');
    }).join('');
    return css + '<div class="rwf2-wrap"><div class="rwf2-head">人物列传 · ' + chars.length + ' 人 · 左点人入列传，右侧逐字段编辑（每字段标了正式游戏里的叫法）</div>' +
      '<div class="rwf2-cols"><aside class="rwf2-roster">' + roster + '</aside><section class="rwf2-detail">' + detailPanel(chars[sel], sel) + '</section></div></div>';
  }`;

once(OLD_RENDER, NEW_RENDER, 'render-v2');

// ── E3：saveFolioField(charIndex,...) 改名 saveCharFolioField（解同名覆盖 bug）──
once(`  function saveFolioField(charIndex, field, raw) {`, `  function saveCharFolioField(charIndex, field, raw) {`, 'rename-save');

// ── E4：change 监听改调 saveCharFolioField + 处理 checkbox ──
once(
`      saveFolioField(Number(fel.dataset.folioChar), fel.dataset.folioField, fel.value);`,
`      saveCharFolioField(Number(fel.dataset.folioChar), fel.dataset.folioField, fel.type === 'checkbox' ? fel.checked : fel.value);`,
'change-listener');

// ── E5：命令分发 folio-select-char ──
once(
`    if (command === 'frel-clear-sel') clearFrelSel();
`,
`    if (command === 'frel-clear-sel') clearFrelSel();
    if (command === 'folio-select-char') selectFolioChar(Number(target && target.dataset && target.dataset.folioCharI));
`,
'dispatch');

// ── E6：导出 ──
once(
`    saveFolioField: saveFolioField,
`,
`    saveFolioField: saveFolioField,
    saveCharFolioField: saveCharFolioField,
    selectFolioChar: selectFolioChar,
`,
'export');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
