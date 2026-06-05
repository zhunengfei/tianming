// 把"优化骨架+手校表"嵌进编辑器加载时(applyLoadedOfficialScenario)：补缺十维+派生五常wuchang。
// 列传加「五常」节(wuchang.ren/yi/li/zhi/xin 就地编辑)。不碰官方数据文件。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

// E1：applyCharStatFill（优化骨架+手校表）插在 applyLoadedOfficialScenario 前
once(
`  function applyLoadedOfficialScenario(entry, parsed) {`,
String.raw`  // 角色十维/五常补全：复刻 tm-char-autogen 史实逻辑（加权计分原型+君主型）。加载时补缺、保留已有、手校表覆盖要角。
  var CHAR_FILL_HAND_TUNE = {
    '朱由检': { loyalty: 90, ambition: 74, intelligence: 58, valor: 42, military: 45, administration: 58, management: 42, charisma: 52, diplomacy: 40, benevolence: 48, integrity: 82, wuchang: { ren: 48, yi: 72, li: 62, zhi: 55, xin: 68 } },
    '袁崇焕': { loyalty: 85, ambition: 75, intelligence: 88, valor: 85, military: 92, administration: 75, management: 62, charisma: 80, diplomacy: 58, benevolence: 62, integrity: 82, wuchang: { ren: 60, yi: 85, li: 74, zhi: 88, xin: 80 } }
  };
  function applyCharStatFill(scenario) {
    if (!scenario || !Array.isArray(scenario.characters)) return;
    var TEN = ['loyalty', 'ambition', 'benevolence', 'intelligence', 'valor', 'military', 'administration', 'management', 'charisma', 'diplomacy', 'integrity'];
    function hh(t) { t = String(t || ''); var h = 0; for (var i = 0; i < t.length; i++) h = ((h * 31) + t.charCodeAt(i)) >>> 0; return h; }
    function jit(name, f, sp) { sp = Math.max(0, sp || 0); if (!sp) return 0; var w = sp * 2 + 1; return (hh(String(name || '') + ':' + f) % w) - sp; }
    function clp(v, mn, mx) { v = parseInt(v, 10); if (!isFinite(v)) return null; return Math.max(mn == null ? 0 : mn, Math.min(mx == null ? 100 : mx, v)); }
    var KW = {
      monarch: ['皇帝', '大汗', '可汗', '汗位', '苏丹', '君主', '藩主', '大御所', '征夷大将军', '郑主', '阮主', '国主', '共主', '部盟首领', '后金汗', '嗣位之君', '改命之主', '汗王', '王世子', '继承人'],
      corrupt: ['巨贪', '贪', '聚敛', '酷吏', '赃', '搜刮', '受贿', '附势'], eunuch: ['宦', '司礼', '东厂', '内侍', '太监', '秉笔', '掌印', '厂'],
      regent: ['篡', '权臣', '摄政', '首辅', '辅政', '枢臣', '上公', '次辅'], reformer: ['改革', '变法', '新政', '整饬', '改制', '实学', '清丈', '革新', '原学'],
      clean: ['清官', '廉', '直谏', '言官', '御史', '给事中', '清流', '气节', '不党', '清议'], loyal: ['忠臣', '死节', '殉国', '义士', '不屈', '忠义', '死志', '殉', '尽忠'],
      military: ['名将', '武将', '将军', '总兵', '提督', '督师', '经略', '统兵', '戍边', '边将', '卫所', '水师', '骁将', '骑将', '参将', '游击', '副将', '守备', '镇守', '大捷', '守城', '武勇', '武举', '悍将', '军头', '骑兵', '炮', '督抚', '将门', '武将家', '统制'],
      diplomat: ['外交', '使臣', '通使', '和议', '朝贡', '鸿胪', '理藩', '调停', '议和', '通译', '联姻'], merchant: ['商贾', '盐商', '榷税', '理财', '税务', '转运', '度支', '海商', '贸易', '财货', '商'],
      scholar: ['文宗', '硕儒', '翰林', '学士', '经筵', '书院', '诗文', '史馆', '修史', '讲学', '博通', '宗师', '理学', '传教', '西学', '宿儒', '士子', '太学'],
      admin: ['干吏', '知府', '巡抚', '布政', '按察', '尚书', '侍郎', '府尹', '地方主官', '内政', '留守', '知州', '经制']
    };
    var PRI = ['monarch', 'corrupt', 'eunuch', 'military', 'clean', 'loyal', 'regent', 'reformer', 'diplomat', 'merchant', 'scholar', 'admin'];
    var BASE = {
      monarch: { loyalty: 88, ambition: 78, benevolence: 58, intelligence: 72, valor: 55, military: 62, administration: 75, management: 60, charisma: 80, diplomacy: 68, integrity: 62 },
      military: { loyalty: 82, ambition: 62, benevolence: 60, intelligence: 72, valor: 88, military: 90, administration: 62, management: 50, charisma: 68, diplomacy: 50, integrity: 78 },
      scholar: { loyalty: 78, ambition: 55, benevolence: 72, intelligence: 90, valor: 30, military: 35, administration: 60, management: 50, charisma: 78, diplomacy: 60, integrity: 82 },
      reformer: { loyalty: 82, ambition: 82, benevolence: 70, intelligence: 90, valor: 38, military: 45, administration: 92, management: 88, charisma: 72, diplomacy: 68, integrity: 80 },
      corrupt: { loyalty: 45, ambition: 88, benevolence: 25, intelligence: 78, valor: 35, military: 40, administration: 65, management: 85, charisma: 70, diplomacy: 78, integrity: 15 },
      eunuch: { loyalty: 62, ambition: 88, benevolence: 35, intelligence: 76, valor: 28, military: 30, administration: 60, management: 62, charisma: 58, diplomacy: 55, integrity: 22 },
      regent: { loyalty: 66, ambition: 86, benevolence: 52, intelligence: 88, valor: 45, military: 62, administration: 90, management: 78, charisma: 78, diplomacy: 82, integrity: 58 },
      clean: { loyalty: 90, ambition: 45, benevolence: 92, intelligence: 78, valor: 35, military: 35, administration: 82, management: 65, charisma: 65, diplomacy: 60, integrity: 95 },
      loyal: { loyalty: 95, ambition: 58, benevolence: 80, intelligence: 72, valor: 50, military: 58, administration: 70, management: 55, charisma: 66, diplomacy: 55, integrity: 92 },
      diplomat: { loyalty: 70, ambition: 62, benevolence: 60, intelligence: 78, valor: 35, military: 38, administration: 62, management: 52, charisma: 74, diplomacy: 88, integrity: 68 },
      merchant: { loyalty: 55, ambition: 72, benevolence: 52, intelligence: 72, valor: 30, military: 25, administration: 52, management: 85, charisma: 64, diplomacy: 70, integrity: 55 },
      admin: { loyalty: 76, ambition: 62, benevolence: 66, intelligence: 80, valor: 42, military: 48, administration: 86, management: 72, charisma: 62, diplomacy: 58, integrity: 76 },
      normal: { loyalty: 65, ambition: 55, benevolence: 60, intelligence: 65, valor: 38, military: 42, administration: 62, management: 56, charisma: 55, diplomacy: 50, integrity: 65 }
    };
    function arche(c) {
      var text = [c.officialTitle, c.role, c.bio, c.background, c.personality, c.stance, c.occupation, c.class, c.partyRank, c.familyRole].map(function (v) { return v ? String(v) : ''; }).join(' ');
      var best = 'normal', bs = 0;
      PRI.forEach(function (a) { var sc = 0; KW[a].forEach(function (k) { if (text.indexOf(k) >= 0) sc++; }); if (sc > bs) { bs = sc; best = a; } });
      return best;
    }
    scenario.characters.forEach(function (c) {
      if (!c || typeof c !== 'object') return;
      var ht = CHAR_FILL_HAND_TUNE[c.name];
      if (ht) { Object.keys(ht).forEach(function (k) { if (k === 'wuchang') c.wuchang = { ren: ht.wuchang.ren, yi: ht.wuchang.yi, li: ht.wuchang.li, zhi: ht.wuchang.zhi, xin: ht.wuchang.xin }; else c[k] = ht[k]; }); return; }
      var base = BASE[arche(c)] || BASE.normal;
      TEN.forEach(function (f) { if (typeof c[f] !== 'number') c[f] = clp(base[f] + jit(c.name, f, 6), 0, 100); });
      if (!c.wuchang || typeof c.wuchang !== 'object') {
        function wc(fb, fld) { return clp(Math.round(fb) + jit(c.name, 'wc_' + fld, 4), 0, 100); }
        var w = { ren: wc(c.benevolence, 'ren'), yi: wc((c.loyalty + c.integrity) / 2, 'yi'), li: wc((c.integrity + c.charisma) / 2, 'li'), zhi: wc(c.intelligence, 'zhi'), xin: wc((c.integrity + c.loyalty) / 2, 'xin') };
        var vs = [w.ren, w.yi, w.li, w.zhi, w.xin], mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs);
        if (mx - mn < 12) { w.zhi = clp(w.zhi + 8, 0, 100); w.xin = clp(w.xin - 7, 0, 100); }
        c.wuchang = w;
      }
    });
  }

  function applyLoadedOfficialScenario(entry, parsed) {
    applyCharStatFill(parsed);`,
'applyCharStatFill+hook');

// E2：列传详情加「五常」节
once(
`      { t: '禀赋', keys: ['intelligence', 'valor', 'military', 'administration', 'management', 'charisma', 'diplomacy', 'benevolence', 'integrity', 'loyalty', 'ambition'] },`,
`      { t: '禀赋', keys: ['intelligence', 'valor', 'military', 'administration', 'management', 'charisma', 'diplomacy', 'benevolence', 'integrity', 'loyalty', 'ambition'] },
      { t: '五常', keys: ['wuchang.ren', 'wuchang.yi', 'wuchang.li', 'wuchang.zhi', 'wuchang.xin'] },`,
'wuchang-group');

// E3：charDetailField 处理 wuchang.X 标签
once(
`  function charDetailField(c, i, key) {
    var wide = CHAR_AREA_KEYS[key] ? ' rwf2-f-wide' : '';
    return '<label class="rwf2-f' + wide + '"><span class="rwf2-fl">' + escapeHtml(specialistFieldLabel(key)) + '</span>' + charFieldControl(c, i, key) + '</label>';
  }`,
`  var WUCHANG_LABELS = { ren: '仁', yi: '义', li: '礼', zhi: '智', xin: '信' };
  function charDetailField(c, i, key) {
    var wide = CHAR_AREA_KEYS[key] ? ' rwf2-f-wide' : '';
    var label = key.indexOf('wuchang.') === 0 ? (WUCHANG_LABELS[key.slice(8)] || key.slice(8)) : specialistFieldLabel(key);
    return '<label class="rwf2-f' + wide + '"><span class="rwf2-fl">' + escapeHtml(label) + '</span>' + charFieldControl(c, i, key) + '</label>';
  }`,
'wuchang-label');

// E4：charFieldControl 处理 wuchang.X 控件
once(
`  function charFieldControl(c, i, key) {
    var v = readEntityProp(c, key);`,
`  function charFieldControl(c, i, key) {
    if (key.indexOf('wuchang.') === 0) {
      var sub = key.slice(8), wv = (c.wuchang && typeof c.wuchang === 'object') ? c.wuchang[sub] : undefined;
      return '<input type="number" class="rwf2-ctl rwf2-num" data-folio-char="' + i + '" data-folio-field="' + escapeHtml(key) + '" value="' + escapeHtml(typeof wv === 'number' ? wv : (wv == null ? '' : wv)) + '">';
    }
    var v = readEntityProp(c, key);`,
'wuchang-control');

// E5：saveCharFolioField 处理 wuchang.X 写回
once(
`  function saveCharFolioField(charIndex, field, raw) {
    var chars = state.scenario.characters;
    if (!Array.isArray(chars) || !chars[charIndex]) return;
    setEntityProp(chars[charIndex], field, raw, 'characters');`,
`  function saveCharFolioField(charIndex, field, raw) {
    var chars = state.scenario.characters;
    if (!Array.isArray(chars) || !chars[charIndex]) return;
    if (String(field).indexOf('wuchang.') === 0) {
      var sub = String(field).slice(8), num = parseInt(raw, 10);
      if (!isFinite(num)) return;
      if (!chars[charIndex].wuchang || typeof chars[charIndex].wuchang !== 'object') chars[charIndex].wuchang = {};
      chars[charIndex].wuchang[sub] = Math.max(0, Math.min(100, num));
      recordHistory('列传编辑', (chars[charIndex].name || ('#' + charIndex)) + ' · 五常·' + sub);
      reRenderModulePrimary();
      var pnl = document.querySelector('[data-panel="renwu-folio"]'); if (pnl) pnl.innerHTML = renderCharacterFolio();
      return;
    }
    setEntityProp(chars[charIndex], field, raw, 'characters');`,
'wuchang-save');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
