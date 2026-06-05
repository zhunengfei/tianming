// 势力章主视图 renderFactionFolio：按人物标准——米金名册+完整标签详情(嵌套对象子网格+对象数组只读视图)+就地编辑+关系图谱tab。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

const BLOCK = String.raw`  var FAC_LABELS = { name: '名称', leader: '首领', leaderTitle: '首领头衔', type: '类型', factionType: '势力类型', color: '代表色', capital: '治所/都城', territory: '疆域', ideology: '意识形态', mainstream: '主流思想', culture: '文化', cultureLevel: '文化水平', desc: '简述', description: '简述', personality: '性格', goal: '目标', strategy: '方略', longTermStrategy: '长远战略', strength: '综合实力', militaryStrength: '兵力', economy: '经济', courtInfluence: '朝堂影响', popularInfluence: '民间影响', prestige: '声望', playerRelation: '与玩家关系', attitude: '态度', traits: '特质', members: '核心成员', internalParties: '内部党派', mainResources: '主要资源', resources: '资源', leadership: '领导层', treasury: '府库', cohesion: '凝聚力', leaderInfo: '首领档案', heirInfo: '继承人', militaryBreakdown: '兵力构成', economicStructure: '经济结构', succession: '继承制度', techLevel: '技术水平', population: '人口', warState: '战争状态', economicPolicy: '经济政策', publicOpinion: '民意', knownSpies: '已知细作', aiProfile: 'AI画像', attitudeDetail: '立场详情', relations: '对外关系', allies: '盟友', enemies: '敌对', neutrals: '中立', partyRelations: '党派关系', history: '历史沿革', historicalEvents: '历史大事', foundYear: '立国年', peakYear: '鼎盛年', strengths: '优势', weaknesses: '劣势', victoryConditions: '胜利条件', defeatConditions: '失败条件', strategicPriorities: '战略优先', decisionHints: '决策提示', npcDecisionHints: 'NPC决策提示', openingProblems: '开局难题', tabooMoves: '禁招', offendThresholds: '触怒阈值', sourceRefs: '史料出处', isSupplement: '补充条目', sid: '剧本ID', id: 'ID' };
  var FAC_SUB = {
    leadership: { ruler: '君主', regent: '摄政', general: '统帅', chancellor: '宰辅', spy: '谍首' },
    treasury: { money: '银', grain: '粮', cloth: '布', note: '备注' },
    cohesion: { political: '政治', military: '军事', economic: '经济', cultural: '文化', ethnic: '民族', loyalty: '忠诚' },
    leaderInfo: { name: '姓名', personality: '性格', age: '年龄', gender: '性别', belief: '信仰', learning: '学识', ethnicity: '族属', bio: '小传' },
    heirInfo: { name: '姓名', personality: '性格', age: '年龄', gender: '性别', belief: '信仰', learning: '学识', ethnicity: '族属', bio: '小传' },
    militaryBreakdown: { standingArmy: '常备军', militia: '民兵', elite: '精锐', fleet: '水师' },
    economicStructure: { agriculture: '农业', trade: '商贸', handicraft: '手工', tribute: '朝贡' },
    succession: { rule: '继承法', designatedHeir: '指定继承', stability: '稳定度' },
    techLevel: { overall: '总体', agriculture: '农', military: '军', navigation: '航海', medicine: '医', metallurgy: '冶金', printing: '印刷', astronomy: '天文', mathematics: '算学' },
    population: { registered: '在册', actual: '实际', hidden: '隐户', ethnicities: '族群比例' },
    warState: { active: '进行中', pending: '待发', recent: '近期' },
    economicPolicy: { taxation: '赋税', trade: '贸易', currency: '货币', labor: '徭役' },
    publicOpinion: { amongGentry: '士绅', amongPeasantry: '百姓', amongScholars: '士林' },
    knownSpies: { in_manchu: '在满洲', in_mongol: '在蒙古', in_pirate: '在海寇' },
    aiProfile: { posture: '态势', decisionStyle: '决策风格', riskTolerance: '风险偏好', playerVisibleTheme: '玩家可见主题' },
    attitudeDetail: { self: '自我', enemies: '敌', allies: '友', neutrals: '中立' }
  };
  var FAC_GROUPS = [
    ['概况', ['name', 'type', 'factionType', 'leaderTitle', 'leader', 'color', 'capital', 'territory', 'ideology', 'mainstream', 'culture', 'attitude', 'playerRelation', 'foundYear', 'peakYear', 'desc', 'description']],
    ['实力', ['strength', 'militaryStrength', 'economy', 'courtInfluence', 'popularInfluence', 'prestige', 'cultureLevel', 'cohesion', 'militaryBreakdown', 'economicStructure', 'techLevel', 'population']],
    ['人事', ['leadership', 'leaderInfo', 'heirInfo', 'members', 'internalParties', 'succession']],
    ['资源财政', ['treasury', 'mainResources', 'resources', 'economicPolicy']],
    ['立场关系', ['relations', 'allies', 'enemies', 'neutrals', 'attitudeDetail', 'partyRelations', 'knownSpies', 'warState']],
    ['战略与AI', ['goal', 'strategy', 'longTermStrategy', 'strategicPriorities', 'decisionHints', 'npcDecisionHints', 'openingProblems', 'tabooMoves', 'personality', 'aiProfile', 'publicOpinion']],
    ['胜败·优劣', ['strengths', 'weaknesses', 'victoryConditions', 'defeatConditions', 'offendThresholds']],
    ['史略', ['history', 'historicalEvents']],
    ['其它', ['sourceRefs', 'isSupplement', 'sid', 'id']]
  ];
  function facLabel(k) { return FAC_LABELS[k] || k; }
  function facSubLabel(parent, sub) { return (FAC_SUB[parent] && FAC_SUB[parent][sub]) || sub; }
  function facCompact(o) { try { return Object.keys(o).map(function (k) { return k + ':' + (o[k] && typeof o[k] === 'object' ? '…' : o[k]); }).join('　').slice(0, 90); } catch (e) { return ''; } }
  function facKilo(n) { n = Number(n) || 0; return n >= 10000 ? (Math.round(n / 1000) / 10 + '万') : (n >= 1000 ? (Math.round(n / 100) / 10 + '千') : n); }
  function facObjArrayView(arr) {
    return '<div class="facf-objarr">' + arr.slice(0, 14).map(function (it) { return '<div class="facf-oa-item">' + escapeHtml(facCompact(it)) + '</div>'; }).join('') + (arr.length > 14 ? '<div class="facf-oa-more">…共 ' + arr.length + ' 条（在「⚙ 高级」表单编辑）</div>' : '') + '</div>';
  }
  function facFieldBlock(f, i, key) {
    var v = f[key], label = facLabel(key);
    if (Array.isArray(v)) {
      if (v.length && typeof v[0] === 'object') return '<div class="rwf2-f rwf2-f-wide"><span class="rwf2-fl">' + escapeHtml(label) + '（' + v.length + '）</span>' + facObjArrayView(v) + '</div>';
      return '<label class="rwf2-f rwf2-f-wide"><span class="rwf2-fl">' + escapeHtml(label) + '</span><textarea class="rwf2-ctl rwf2-area" data-fac-i="' + i + '" data-fac-field="' + escapeHtml(key) + '" rows="2">' + escapeHtml(v.join(String.fromCharCode(10))) + '</textarea></label>';
    }
    if (v && typeof v === 'object') {
      var subs = Object.keys(v).map(function (sk) {
        var sv = v[sk], slabel = facSubLabel(key, sk);
        if (sv && typeof sv === 'object') return '<label class="rwf2-f"><span class="rwf2-fl">' + escapeHtml(slabel) + '</span><input class="rwf2-ctl" value="' + escapeHtml(facCompact(sv)) + '" readonly></label>';
        if (typeof sv === 'number') return '<label class="rwf2-f"><span class="rwf2-fl">' + escapeHtml(slabel) + '</span><input type="number" class="rwf2-ctl rwf2-num" data-fac-i="' + i + '" data-fac-field="' + escapeHtml(key + '.' + sk) + '" value="' + escapeHtml(sv) + '"></label>';
        return '<label class="rwf2-f"><span class="rwf2-fl">' + escapeHtml(slabel) + '</span><input class="rwf2-ctl" data-fac-i="' + i + '" data-fac-field="' + escapeHtml(key + '.' + sk) + '" value="' + escapeHtml(sv == null ? '' : sv) + '"></label>';
      }).join('');
      return '<div class="rwf2-f rwf2-f-wide"><span class="rwf2-fl">' + escapeHtml(label) + '</span><div class="facf-sub">' + subs + '</div></div>';
    }
    if (key === 'color') return '<label class="rwf2-f"><span class="rwf2-fl">' + escapeHtml(label) + '</span><input type="color" class="rwf2-ctl" data-fac-i="' + i + '" data-fac-field="color" value="' + escapeHtml(v || '#a8833a') + '"></label>';
    if (typeof v === 'number') return '<label class="rwf2-f"><span class="rwf2-fl">' + escapeHtml(label) + '</span><input type="number" class="rwf2-ctl rwf2-num" data-fac-i="' + i + '" data-fac-field="' + escapeHtml(key) + '" value="' + escapeHtml(v) + '"></label>';
    var sv2 = v == null ? '' : String(v), wide = sv2.length > 36;
    if (wide) return '<label class="rwf2-f rwf2-f-wide"><span class="rwf2-fl">' + escapeHtml(label) + '</span><textarea class="rwf2-ctl rwf2-area" data-fac-i="' + i + '" data-fac-field="' + escapeHtml(key) + '" rows="2">' + escapeHtml(sv2) + '</textarea></label>';
    return '<label class="rwf2-f"><span class="rwf2-fl">' + escapeHtml(label) + '</span><input class="rwf2-ctl" data-fac-i="' + i + '" data-fac-field="' + escapeHtml(key) + '" value="' + escapeHtml(sv2) + '"></label>';
  }
  function facRosterCard(f, i, sel) {
    var active = i === sel ? ' active' : '';
    var str = typeof f.strength === 'number' ? f.strength : '—';
    var eco = typeof f.economy === 'number' ? f.economy : '—';
    var mil = typeof f.militaryStrength === 'number' ? f.militaryStrength : '';
    return '<button class="rwf2-rc' + active + '" style="--fc:' + escapeHtml(f.color || '#a8833a') + '" data-editor-command="fac-folio-select" data-fac-i="' + i + '">' +
      '<span class="rc-top"><b>' + escapeHtml(f.name || '无名') + '</b>' + (f.leaderTitle ? '<span class="rc-zi">' + escapeHtml(f.leaderTitle) + '</span>' : '') + '</span>' +
      '<span class="rc-off">' + escapeHtml((f.leader || '') + (f.capital ? ' · ' + f.capital : '')) + '</span>' +
      '<span class="rc-ab">实力 ' + str + ' · 经济 ' + eco + (mil !== '' ? ' · 兵 ' + facKilo(mil) : '') + '</span>' +
    '</button>';
  }
  function facDetailPanel(f, i) {
    if (!f) return '<div class="rwf2-empty">选择一个势力</div>';
    var used = {};
    var head = '<div class="rwf2-dh"><span class="facf-swatch" style="background:' + escapeHtml(f.color || '#a8833a') + '"></span><span class="rwf2-dh-t"><b>' + escapeHtml(f.name || '无名') + '</b><span>' + escapeHtml((f.leaderTitle || f.type || '') + (f.leader ? ' · ' + f.leader : '')) + '</span></span></div>';
    var secs = FAC_GROUPS.map(function (g) {
      var keys = g[1].filter(function (k) { return (k in f) && !used[k]; });
      keys.forEach(function (k) { used[k] = 1; });
      if (!keys.length) return '';
      return '<div class="rwf2-sec"><div class="rwf2-st">' + escapeHtml(g[0]) + '</div><div class="rwf2-grid2">' + keys.map(function (k) { return facFieldBlock(f, i, k); }).join('') + '</div></div>';
    }).join('');
    var extra = Object.keys(f).filter(function (k) { return !used[k]; });
    if (extra.length) secs += '<div class="rwf2-sec"><div class="rwf2-st">其它</div><div class="rwf2-grid2">' + extra.map(function (k) { return facFieldBlock(f, i, k); }).join('') + '</div></div>';
    return head + secs;
  }
  function selectFacFolio(i) { if (typeof i === 'number' && !isNaN(i)) { state._facFolioSel = i; reRenderModulePrimary(); } }
  function saveFacFolioField(i, field, raw) {
    var facs = state.scenario.factions;
    if (!Array.isArray(facs) || !facs[i]) return;
    var f = facs[i], fld = String(field);
    if (fld.indexOf('.') > 0) {
      var parts = fld.split('.'), obj = f[parts[0]];
      if (!obj || typeof obj !== 'object') obj = f[parts[0]] = {};
      var old = obj[parts[1]];
      obj[parts[1]] = (typeof old === 'number') ? (isFinite(parseFloat(raw)) ? parseFloat(raw) : 0) : raw;
    } else {
      var cur = f[fld];
      if (Array.isArray(cur)) f[fld] = String(raw).split(String.fromCharCode(10)).map(function (x) { return x.trim(); }).filter(function (x) { return x; });
      else if (typeof cur === 'number') f[fld] = isFinite(parseFloat(raw)) ? parseFloat(raw) : 0;
      else if (typeof raw === 'boolean') f[fld] = raw;
      else f[fld] = raw;
    }
    recordHistory('势力档案', (f.name || ('#' + i)) + ' · ' + fld);
    var host = document.getElementById('module-primary-view'); if (host) host.innerHTML = renderFactionFolio(); else renderAll();
  }
  function renderFactionFolio() {
    var facs = Array.isArray(state.scenario.factions) ? state.scenario.factions : [];
    var tab = state._facFolioTab === 'graph' ? 'graph' : 'roster';
    var css = '<style>' +
      '.rwf2-wrap{font-family:"KaiTi","STKaiti","Noto Serif SC",serif;color:#241d15}' +
      '.rwf2-head{font:600 13px/1.6 inherit;color:#7d5e22;margin:2px 2px 10px}' +
      '.rwf2-cols{display:grid;grid-template-columns:minmax(184px,250px) 1fr;gap:14px;align-items:start}' +
      '.rwf2-roster{max-height:70vh;overflow:auto;padding-right:4px}' +
      '.rwf2-rc{display:block;width:100%;text-align:left;cursor:pointer;position:relative;background:linear-gradient(120deg,#fffdf3,#f6efda 80%);border:1px solid #e0d2ad;border-radius:8px;padding:7px 10px 7px 13px;margin-bottom:5px;overflow:hidden;font-family:inherit;color:#241d15}' +
      '.rwf2-rc::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--fc,#a8833a);opacity:.7}' +
      '.rwf2-rc:hover{border-color:#a8833a}' +
      '.rwf2-rc.active{border-color:#a83228;box-shadow:-2px 0 0 #a83228,0 2px 8px rgba(120,90,40,.12);background:linear-gradient(120deg,#fffef7,#fbf4e0)}' +
      '.rc-top b{font-size:15px;color:#7a2018}.rc-zi{font-size:10px;color:#9c8b6b;margin-left:5px}' +
      '.rc-off{display:block;font-size:11px;color:#574733;margin:2px 0}.rc-ab{display:block;font-size:10px;color:#2d5848}' +
      '.rwf2-detail{background:linear-gradient(160deg,#fffdf3,#f8f1dc);border:1px solid #dcc99c;border-radius:12px;padding:12px 14px;box-shadow:0 2px 10px rgba(58,40,22,.1)}' +
      '.rwf2-dh{border-bottom:1px solid rgba(168,131,58,.3);padding-bottom:8px;margin-bottom:8px;display:flex;gap:10px;align-items:center}' +
      '.rwf2-dh-t b{font-size:20px;color:#7a2018}.rwf2-dh-t span{font-size:12px;color:#574733;margin-left:8px}' +
      '.rwf2-sec{margin-bottom:10px}.rwf2-st{font-size:12px;font-weight:700;color:#a8833a;border-left:3px solid #a8833a;padding-left:7px;margin-bottom:6px}' +
      '.rwf2-grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px 10px}.rwf2-f-wide{grid-column:1/-1}' +
      '.rwf2-f{display:flex;flex-direction:column;gap:1px;font-size:12px}.rwf2-fl{font-size:10px;color:#9c8b6b}' +
      '.rwf2-ctl{border:1px solid #e0d2ad;border-radius:5px;background:rgba(255,252,242,.85);font:inherit;font-size:12px;color:#241d15;padding:2px 5px;width:100%;box-sizing:border-box}' +
      '.rwf2-ctl:hover,.rwf2-ctl:focus{border-color:#a8833a;outline:none}.rwf2-area{resize:vertical;min-height:3.4em;line-height:1.5}' +
      '.rwf2-empty{color:#9c8b6b;padding:20px}' +
      '.facf-swatch{width:22px;height:22px;border-radius:5px;border:1px solid #c9a84c;flex:0 0 auto}' +
      '.facf-sub{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:4px 8px;background:rgba(168,131,58,.06);border:1px solid rgba(168,131,58,.2);border-radius:6px;padding:6px 8px}' +
      '.facf-objarr{display:flex;flex-direction:column;gap:3px;background:rgba(168,131,58,.06);border:1px solid rgba(168,131,58,.2);border-radius:6px;padding:6px 8px;max-height:170px;overflow:auto}' +
      '.facf-oa-item{font-size:11px;color:#574733;border-bottom:1px dotted rgba(168,131,58,.3);padding-bottom:2px}.facf-oa-more{font-size:10px;color:#9c8b6b}' +
      '.facf-tabs{display:flex;gap:6px;margin:2px 2px 8px}' +
      '.facf-tab{font:inherit;font-size:12px;cursor:pointer;border:1px solid #dcc99c;background:rgba(255,252,242,.7);color:#7d5e22;border-radius:8px 8px 0 0;padding:4px 16px}' +
      '.facf-tab.on{background:linear-gradient(160deg,#fffdf3,#f8f1dc);border-bottom-color:transparent;color:#7a2018;font-weight:700}' +
    '</style>';
    var tabbar = '<div class="facf-tabs">' +
      '<button class="facf-tab' + (tab === 'roster' ? ' on' : '') + '" data-editor-command="fac-folio-tab" data-fac-tab="roster">势力名册</button>' +
      '<button class="facf-tab' + (tab === 'graph' ? ' on' : '') + '" data-editor-command="fac-folio-tab" data-fac-tab="graph">关系图谱</button>' +
    '</div>';
    if (tab === 'graph') return css + '<div class="rwf2-wrap">' + tabbar + '</div>' + renderFactionRelationFolio();
    if (!facs.length) return css + '<div class="rwf2-wrap">' + tabbar + '<div class="rwf2-head">本剧本暂无势力。可在「⚙ 高级」专业表单新增，或让国师生成。</div></div>';
    var sel = (typeof state._facFolioSel === 'number' && state._facFolioSel >= 0 && state._facFolioSel < facs.length) ? state._facFolioSel : 0;
    var roster = facs.map(function (f, i) { return facRosterCard(f, i, sel); }).join('');
    return css + '<div class="rwf2-wrap">' + tabbar + '<div class="rwf2-head">势力档案 · ' + facs.length + ' 方 · 左点势力，右侧逐字段编辑（含领导层 / 府库 / 凝聚力 / 兵力构成等嵌套项；每字段标了正式游戏里的叫法）</div>' +
      '<div class="rwf2-cols"><aside class="rwf2-roster">' + roster + '</aside><section class="rwf2-detail">' + facDetailPanel(facs[sel], sel) + '</section></div></div>';
  }

  function renderCharacterFolio() {`;

once(`  function renderCharacterFolio() {`, BLOCK, 'faction-folio-block');

// modulePrimaryView 切到 renderFactionFolio
once(`    if (moduleId === 'factionsSociety') return renderFactionRelationFolio();`,
     `    if (moduleId === 'factionsSociety') return renderFactionFolio();`,
     'primaryview-switch');

// 命令分发：fac-folio-select / fac-folio-tab
once(`    if (command === 'folio-trait-del') delCharTrait(target && target.dataset && target.dataset.traitId);`,
     `    if (command === 'folio-trait-del') delCharTrait(target && target.dataset && target.dataset.traitId);
    if (command === 'fac-folio-select') selectFacFolio(Number(target && target.dataset && target.dataset.facI));
    if (command === 'fac-folio-tab') { state._facFolioTab = target && target.dataset && target.dataset.facTab; reRenderModulePrimary(); }`,
     'dispatch-fac');

// change 监听：势力字段就地保存
once(`      var tadd = event.target && event.target.closest && event.target.closest('[data-folio-trait-add]');
      if (tadd && tadd.value) { addCharTrait(tadd.value); }
    });`,
     `      var tadd = event.target && event.target.closest && event.target.closest('[data-folio-trait-add]');
      if (tadd && tadd.value) { addCharTrait(tadd.value); return; }
      var ffel = event.target && event.target.closest && event.target.closest('[data-fac-field]');
      if (ffel) { saveFacFolioField(Number(ffel.dataset.facI), ffel.dataset.facField, ffel.type === 'checkbox' ? ffel.checked : ffel.value); }
    });`,
     'change-fac');

// 导出（供测试）
once(`    renderFactionRelationFolio: renderFactionRelationFolio,`,
     `    renderFactionRelationFolio: renderFactionRelationFolio,
    renderFactionFolio: renderFactionFolio,
    saveFacFolioField: saveFacFolioField,`,
     'export-fac');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
