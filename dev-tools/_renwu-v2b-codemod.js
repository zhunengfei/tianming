// 列传 v2b：① 去英文(补标签+藏内部id+英文枚举值改中文标签select·值保留) ② 长文字段满宽+加高框 ③ 详情加立绘。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

// ── ① 补缺失中文标签（6 个 ASCII 标签 key + 2 个）──
once(
`    category: '类别', owner: '持有者', quantity: '数量', value: '价值', effects: '效果', tags: '标签', era: '时代'
  };`,
`    category: '类别', owner: '持有者', quantity: '数量', value: '价值', effects: '效果', tags: '标签', era: '时代',
    stressSources: '压力源', skills: '技能', dialogues: '对白', rels: '关系（简）', historicalSources: '史料出处', traitIds: '特质编号', personalGoals: '人生目标', wuchangOverride: '五常覆写'
  };`,
'add-labels');

// ── 枚举映射 + 立绘 helper + 隐藏键（插在 charFieldControl 前）──
once(
`  function charFieldControl(c, i, key) {`,
String.raw`  // 英文枚举值 → 中文显示（select 选项中文·option value 保留原值不改数据）
  var CHAR_ENUM_MAPS = {
    type: { historical: '史实', fictional: '虚构', character: '人物', scenario_composite: '剧情合成' },
    familyTier: { imperial: '宗室帝胄', royal: '宗室', imperial_relative: '宗亲', imperial_consort: '后妃外戚', common: '平民', commoner: '平民', gentry: '士绅', scholar_official: '士大夫', civil: '文官', military: '将门', noble: '世家', great_clan: '巨族', lesser_clan: '小族', eunuch: '宦官', steppe_noble: '草原贵族', steppe_royal: '草原汗室', samurai_elite: '武士门第', daimyo: '大名', shogunal: '幕府', princely: '藩王', yangban: '两班', tusi: '土司', tusi_remnant: '土司残部', colonial_elite: '殖民权贵', religious_order: '教团', company_officer: '商团军官', regional_lord: '地方领主', local_elite: '地方望族', tribal: '部族' },
    royalRelation: { emperor_family: '帝室宗亲', emperor_consort: '皇帝后妃', emperor_spouse: '帝配', emperor_mother: '帝母', emperor_father: '帝父', emperor_brother: '皇弟', emperor_brother_spouse: '皇弟妃', emperor_brother_son: '皇侄', former_empress: '废后', former_consort: '废妃', consort_dowager: '太妃' }
  };
  var CHAR_ENUM_OPTS = { type: 1, familyTier: 1, royalRelation: 1 };
  var CHAR_HIDE_KEYS = { id: 1, sid: 1, traitIds: 1, rels: 1, wuchangOverride: 1 };
  function charEnumOptions(key, value) {
    var map = CHAR_ENUM_MAPS[key] || {};
    var opts = ['<option value="">（未设）</option>'], hasVal = false;
    Object.keys(map).forEach(function (en) { if (en === value) hasVal = true; opts.push('<option value="' + escapeHtml(en) + '"' + (en === value ? ' selected' : '') + '>' + escapeHtml(map[en]) + '</option>'); });
    if (value && !hasVal) opts.splice(1, 0, '<option value="' + escapeHtml(value) + '" selected>' + escapeHtml(value) + '</option>');
    return opts.join('');
  }
  function charPortraitSrc(c) {
    var p = c && (c.portrait || c.portraitUrl || c.avatar);
    if (!p) return '';
    p = String(p);
    if (/^https?:|^data:/.test(p)) return p;
    if (p.charAt(0) === '/') return p;
    return '../' + p;
  }

  function charFieldControl(c, i, key) {`,
'enum-portrait-helpers');

// ── ① charFieldControl 加枚举 select 分支 ──
once(
`    if (key === 'faction') return '<select class="rwf2-ctl"' + base + '>' + folioFactionOptions(v || '') + '</select>';`,
`    if (key === 'faction') return '<select class="rwf2-ctl"' + base + '>' + folioFactionOptions(v || '') + '</select>';
    if (CHAR_ENUM_OPTS[key]) return '<select class="rwf2-ctl"' + base + '>' + charEnumOptions(key, v == null ? '' : String(v)) + '</select>';`,
'enum-control');

// ── ② charDetailField：长文字段满宽 ──
once(
`  function charDetailField(c, i, key) {
    return '<label class="rwf2-f"><span class="rwf2-fl">' + escapeHtml(specialistFieldLabel(key)) + '</span>' + charFieldControl(c, i, key) + '</label>';
  }`,
`  function charDetailField(c, i, key) {
    var wide = CHAR_AREA_KEYS[key] ? ' rwf2-f-wide' : '';
    return '<label class="rwf2-f' + wide + '"><span class="rwf2-fl">' + escapeHtml(specialistFieldLabel(key)) + '</span>' + charFieldControl(c, i, key) + '</label>';
  }`,
'wide-field');

// ── ① detailPanel：extras 排除隐藏键 ──
once(
`    var extras = Object.keys(c).filter(function (k) { return !used[k] && k.charAt(0) !== '_' && !isObject(c[k]) && !(Array.isArray(c[k]) && c[k][0] && typeof c[k][0] === 'object'); });`,
`    var extras = Object.keys(c).filter(function (k) { return !used[k] && !CHAR_HIDE_KEYS[k] && k.charAt(0) !== '_' && !isObject(c[k]) && !(Array.isArray(c[k]) && c[k][0] && typeof c[k][0] === 'object'); });`,
'hide-extras');

// ── ③ detailPanel：头部加立绘 ──
once(
`    return '<div class="rwf2-dh"><b>' + escapeHtml(c.name || '无名') + '</b><span>' + escapeHtml(c.officialTitle || c.title || '') + '</span></div>' + secs + extraHtml + complexHtml;`,
`    var psrc = charPortraitSrc(c);
    var face = psrc ? '<img class="rwf2-portrait" src="' + escapeHtml(psrc) + '" alt="立绘" onerror="this.classList.add(&#39;rwf2-noimg&#39;)">' : '<span class="rwf2-portrait rwf2-noimg"></span>';
    var head = '<div class="rwf2-dh">' + face + '<span class="rwf2-dh-t"><b>' + escapeHtml(c.name || '无名') + '</b><span>' + escapeHtml(c.officialTitle || c.title || '') + '</span></span></div>';
    return head + secs + extraHtml + complexHtml;`,
'portrait-head');

// ── ②③ CSS：满宽长文 + 加高框 + 立绘 + dh 横排 ──
once(
`      '.rwf2-grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:6px 10px}' +`,
`      '.rwf2-grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:6px 10px}' +
      '.rwf2-f-wide{grid-column:1/-1}' +
      '.rwf2-portrait{width:62px;height:82px;object-fit:cover;border-radius:6px;border:1px solid #c9a84c;background:#f0e6c8;flex:0 0 auto;display:inline-block}' +
      '.rwf2-noimg{position:relative}' +
      '.rwf2-noimg::after{content:"无立绘";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#9c8b6b;background:#f0e6c8;border-radius:6px}' +
      '.rwf2-dh-t b{font-size:20px;color:#7a2018}' +
      '.rwf2-dh-t span{font-size:12px;color:#574733;margin-left:8px}' +`,
'css-wide-portrait');

once(
`      '.rwf2-dh{border-bottom:1px solid rgba(168,131,58,.3);padding-bottom:6px;margin-bottom:8px}' +`,
`      '.rwf2-dh{border-bottom:1px solid rgba(168,131,58,.3);padding-bottom:8px;margin-bottom:8px;display:flex;gap:12px;align-items:center}' +`,
'css-dh-flex');

once(
`      '.rwf2-area{resize:vertical;min-height:2.3em}' +`,
`      '.rwf2-area{resize:vertical;min-height:3.6em;line-height:1.5}' +`,
'css-area-tall');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
