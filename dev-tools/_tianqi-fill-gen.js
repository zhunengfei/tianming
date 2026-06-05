// 复刻 tm-char-autogen 的史实填值逻辑，在编辑器载入的天启上跑：填缺失十维(保留已有)+派生五常wuchang。
// 产出 dev-tools/tianqi-fill.json（{name:{补的字段}}）+ 打印要角样本供校验。
const PW = process.env.PW_PATH || 'playwright';
const fs = require('fs');
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext()).newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(450);
  const out = await p.evaluate(() => {
    var chars = window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario.characters || [];
    // ── 复刻 tm-char-autogen ──
    function hash(t) { t = String(t || ''); var h = 0; for (var i = 0; i < t.length; i++) h = ((h * 31) + t.charCodeAt(i)) >>> 0; return h; }
    function jitter(name, field, spread) { spread = Math.max(0, spread || 0); if (!spread) return 0; var w = spread * 2 + 1; return (hash(String(name || '') + ':' + field) % w) - spread; }
    function clamp(v, min, max) { v = parseInt(v, 10); if (!isFinite(v)) return null; min = (typeof min === 'number') ? min : 0; max = (typeof max === 'number') ? max : 100; return Math.max(min, Math.min(max, v)); }
    // 优化：加权计分（数命中关键词，取最高分）+ 新增 monarch（君主）。priority 仅作平分时的次序。
    var ARCH_KW = {
      monarch: ['皇帝', '大汗', '可汗', '汗位', '苏丹', '君主', '藩主', '大御所', '征夷大将军', '郑主', '阮主', '国主', '共主', '部盟首领', '后金汗', '嗣位之君', '改命之主', '汗王', '王世子', '继承人'],
      corrupt: ['巨贪', '贪', '聚敛', '酷吏', '赃', '搜刮', '受贿', '附势'],
      eunuch: ['宦', '司礼', '东厂', '内侍', '太监', '秉笔', '掌印', '厂'],
      regent: ['篡', '权臣', '摄政', '首辅', '辅政', '枢臣', '上公', '次辅'],
      reformer: ['改革', '变法', '新政', '整饬', '改制', '实学', '清丈', '革新', '原学'],
      clean: ['清官', '廉', '直谏', '言官', '御史', '给事中', '清流', '气节', '不党', '清议'],
      loyal: ['忠臣', '死节', '殉国', '义士', '不屈', '忠义', '死志', '殉', '尽忠'],
      military: ['名将', '武将', '将军', '总兵', '提督', '督师', '经略', '统兵', '戍边', '边将', '卫所', '水师', '骁将', '骑将', '参将', '游击', '副将', '守备', '镇守', '大捷', '守城', '武勇', '武举', '悍将', '军头', '骑兵', '炮', '督抚', '将门', '武将家', '统制'],
      diplomat: ['外交', '使臣', '通使', '和议', '朝贡', '鸿胪', '理藩', '调停', '议和', '通译', '联姻'],
      merchant: ['商贾', '盐商', '榷税', '理财', '税务', '转运', '度支', '海商', '贸易', '财货', '商'],
      scholar: ['文宗', '硕儒', '翰林', '学士', '经筵', '书院', '诗文', '史馆', '修史', '讲学', '博通', '宗师', '理学', '传教', '西学', '宿儒', '士子', '太学'],
      admin: ['干吏', '知府', '巡抚', '布政', '按察', '尚书', '侍郎', '府尹', '地方主官', '内政', '留守', '知州', '经制']
    };
    var ARCH_PRIORITY = ['monarch', 'corrupt', 'eunuch', 'military', 'clean', 'loyal', 'regent', 'reformer', 'diplomat', 'merchant', 'scholar', 'admin'];
    function arche(c) {
      var text = [c.officialTitle, c.role, c.bio, c.background, c.personality, c.stance, c.occupation, c.class, c.partyRank, c.familyRole].map(function (v) { return v ? String(v) : ''; }).join(' ');
      var best = 'normal', bestScore = 0;
      ARCH_PRIORITY.forEach(function (a) {
        var sc = 0; ARCH_KW[a].forEach(function (k) { if (text.indexOf(k) >= 0) sc++; });
        if (sc > bestScore) { bestScore = sc; best = a; }
      });
      return best;
    }
    var bases = {
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
      monarch: { loyalty: 88, ambition: 78, benevolence: 58, intelligence: 72, valor: 55, military: 62, administration: 75, management: 60, charisma: 80, diplomacy: 68, integrity: 62 },
      normal: { loyalty: 65, ambition: 55, benevolence: 60, intelligence: 65, valor: 38, military: 42, administration: 62, management: 56, charisma: 55, diplomacy: 50, integrity: 65 }
    };
    // 要角手工校准表（按史实手填·全量覆盖；其余用骨架）
    var HAND_TUNE = {
      '朱由检': { loyalty: 90, ambition: 74, intelligence: 58, valor: 42, military: 45, administration: 58, management: 42, charisma: 52, diplomacy: 40, benevolence: 48, integrity: 82, wuchang: { ren: 48, yi: 72, li: 62, zhi: 55, xin: 68 } },
      '袁崇焕': { loyalty: 85, ambition: 75, intelligence: 88, valor: 85, military: 92, administration: 75, management: 62, charisma: 80, diplomacy: 58, benevolence: 62, integrity: 82, wuchang: { ren: 60, yi: 85, li: 74, zhi: 88, xin: 80 } }
    };
    var TEN = ['loyalty', 'ambition', 'benevolence', 'intelligence', 'valor', 'military', 'administration', 'management', 'charisma', 'diplomacy', 'integrity'];
    function fillChar(c) {
      var a = arche(c), base = bases[a] || bases.normal, patch = {}, full = {};
      TEN.forEach(function (f) {
        if (typeof c[f] === 'number') { full[f] = c[f]; }
        else { var v = clamp(base[f] + jitter(c.name, f, 6), 0, 100); full[f] = v; patch[f] = v; }
      });
      // 五常派生（char 无 wuchang → 全部按 fallback+jitter）
      function wc(fallback, field) { return clamp(Math.round(fallback) + jitter(c.name, 'wc_' + field, 4), 0, 100); }
      var w = {
        ren: wc(full.benevolence, 'ren'),
        yi: wc((full.loyalty + full.integrity) / 2, 'yi'),
        li: wc((full.integrity + full.charisma) / 2, 'li'),
        zhi: wc(full.intelligence, 'zhi'),
        xin: wc((full.integrity + full.loyalty) / 2, 'xin')
      };
      var vals = [w.ren, w.yi, w.li, w.zhi, w.xin], mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
      if (mx - mn < 12) { w.zhi = clamp(w.zhi + 8, 0, 100); w.xin = clamp(w.xin - 7, 0, 100); }
      patch.wuchang = w;
      return { archetype: a, patch: patch };
    }
    var fillMap = {}, archCount = {}, samples = {};
    var majors = ['朱由检', '魏忠贤', '袁崇焕', '孙承宗', '努尔哈赤', '皇太极', '客氏', '崔呈秀'];
    chars.forEach(function (c) {
      if (!c || !c.name) return;
      var r = fillChar(c);
      var handTuned = false;
      if (HAND_TUNE[c.name]) { r.patch = JSON.parse(JSON.stringify(HAND_TUNE[c.name])); r.archetype = '手校'; handTuned = true; }
      fillMap[c.name] = r.patch;
      archCount[r.archetype] = (archCount[r.archetype] || 0) + 1;
      if (majors.indexOf(c.name) >= 0 || handTuned) samples[c.name] = { archetype: r.archetype, officialTitle: c.officialTitle || c.role, existing: { wu: c.valor, zheng: c.administration, guan: c.management, ren: c.benevolence }, patch: r.patch };
    });
    return { count: chars.length, archCount: archCount, samples: samples, fillMap: fillMap };
  });
  await browser.close();
  fs.writeFileSync('dev-tools/tianqi-fill.json', JSON.stringify(out.fillMap, null, 0), 'utf8');
  console.log('archetype分布:', JSON.stringify(out.archCount));
  console.log('要角样本:');
  console.log(JSON.stringify(out.samples, null, 1));
  console.log('fillMap 写入 dev-tools/tianqi-fill.json (' + Object.keys(out.fillMap).length + ' 人)');
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
