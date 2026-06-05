// 复用通用基建：财政(economyPopulation配置) + 开篇(scenarioOpening总览) + 军事(militaryFrontier部队roster+军制tab)。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

const BLOCK = String.raw`  // ───────── 配置型章节通用：configSection ─────────
  function configSection(kind, title, labels, sublabels) {
    var obj = state.scenario[kind];
    if (!obj || typeof obj !== 'object') return '';
    return '<div class="rwf2-detail" style="margin-bottom:12px">' + genDetail(kind, obj, 0, [[title, Object.keys(obj)]], labels, sublabels) + '</div>';
  }
  var GEN_TABS_CSS = '<style>.facf-tabs{display:flex;gap:6px;margin:2px 2px 8px}.facf-tab{font:inherit;font-size:12px;cursor:pointer;border:1px solid #dcc99c;background:rgba(255,252,242,.7);color:#7d5e22;border-radius:8px 8px 0 0;padding:4px 16px}.facf-tab.on{background:linear-gradient(160deg,#fffdf3,#f8f1dc);border-bottom-color:transparent;color:#7a2018;font-weight:700}</style>';

  // ───────── 财政章 ─────────
  var FISCAL_LABELS = { unit: '计量单位', silverToCoin: '银钱兑率', taxesEnabled: '税种开关', taxes: '税目', customTaxes: '自定义税', centralLocalRules: '央地分成', currencyRules: '货币制度', floatingCollectionRate: '浮动征收率', fixedExpense: '固定支出', neicangRules: '内帑规则' };
  var FISCAL_SUB = {
    unit: { money: '银', grain: '粮', cloth: '布' },
    taxesEnabled: { tianfu: '田赋', dingshui: '丁税', caoliang: '漕粮', yanlizhuan: '盐利', shipaiShui: '市舶税', quanShui: '榷税', juanNa: '捐纳', qita: '其它' },
    fixedExpense: { salaryMonthlyPerRank: '品级月俸', salaryNote: '俸注', salaryHistorical: '俸史', armyMonthlyPay: '军月饷', imperialMonthly: '内廷月支', salaryAnnualOverride: '俸年覆写', armyAnnualOverride: '军饷年覆写' },
    neicangRules: { presetKey: '预设', royalClanPressure: '宗藩压力', huangzhuangIncome: '皇庄收入', imperialBusinesses: '皇店', privyTransfers: '内帑划拨' },
    centralLocalRules: { preset: '预设', mode: '模式', description: '说明', regionOverrides: '地区覆写' },
    currencyRules: { enabledCoins: '通行币', initialStandard: '本位', description: '说明', silverSourceShares: '银源占比', paperCurrency: '纸币', mints: '铸局', privateCoinage: '私铸' }
  };
  var CORRUPT_LABELS = { trueIndex: '吏治浊度', subDepts: '六部门浊度', supervision: '监察', entrenchedFactions: '盘踞集团' };
  var ECON_LABELS = { enabled: '启用', currency: '货币', baseIncome: '基础收入', tributeRatio: '朝贡比', tributeAdjustment: '朝贡调整', taxRate: '税率', inflationRate: '通胀率', economicCycle: '经济周期', specialResources: '特产', tradeSystem: '贸易体系', description: '说明', redistributionRate: '再分配率', tradeBonus: '贸易加成', agricultureMultiplier: '农业系数', commerceMultiplier: '商业系数' };
  function renderFiscalFolio() {
    return genFolioCss() + '<div class="rwf2-wrap"><div class="rwf2-head">财政 · 吏治 · 经济 配置 · 逐字段编辑（含税目 / 央地分成 / 内帑等嵌套项；每字段标了正式游戏里的叫法）</div>' +
      configSection('fiscalConfig', '财政 · 钱粮税制', FISCAL_LABELS, FISCAL_SUB) +
      configSection('corruption', '吏治 · 浊度', CORRUPT_LABELS, {}) +
      configSection('economyConfig', '经济 · 收入物产', ECON_LABELS, {}) +
    '</div>';
  }

  // ───────── 开篇章 ─────────
  var GAMESET_LABELS = { enabledSystems: '启用系统', startYear: '起始年', startMonth: '起始月', startDay: '起始日', enableGanzhi: '干支纪年', enableGanzhiDay: '干支纪日', enableEraName: '用年号', eraName: '年号', eraNames: '年号表', daysPerTurn: '每回合天数', turnDuration: '回合时长', turnUnit: '回合单位' };
  var PLAYERINFO_LABELS = { playerRole: '玩家身份', playerRoleCustom: '自定身份', leaderIsPlayer: '首领即玩家', factionName: '势力名', factionType: '势力类型', factionLeader: '势力首领', factionLeaderTitle: '首领头衔', factionTerritory: '疆域', factionStrength: '实力', factionCulture: '文化', factionGoal: '目标', factionResources: '资源', factionDesc: '势力简述', characterName: '角色名', characterTitle: '角色头衔', characterFaction: '所属势力', characterAge: '年龄', characterGender: '性别', characterPersonality: '性格', characterFaith: '信仰', characterCulture: '文化', characterBio: '小传' };
  function renderOpeningFolio() {
    var sc = state.scenario;
    var top = '<div class="rwf2-detail" style="margin-bottom:12px"><div class="rwf2-sec"><div class="rwf2-st">剧本总览</div><div class="rwf2-grid2">' +
      genFieldBlock('__root', 0, 'name', sc.name, { name: '剧本名' }, {}) +
      (sc.intro != null ? genFieldBlock('__root', 0, 'intro', sc.intro, { intro: '开场白' }, {}) : '') +
      (sc.summary != null ? genFieldBlock('__root', 0, 'summary', sc.summary, { summary: '总述' }, {}) : '') +
    '</div></div></div>';
    return genFolioCss() + '<div class="rwf2-wrap"><div class="rwf2-head">剧本开篇 · 总览 / 开局设置 / 玩家入口 · 逐字段编辑</div>' +
      top + configSection('gameSettings', '开局设置 · 时间历法', GAMESET_LABELS, {}) + configSection('playerInfo', '玩家入口 · 势力与角色', PLAYERINFO_LABELS, {}) +
    '</div>';
  }

  // ───────── 军事章 ─────────
  var MIL_LABELS = { systemDesc: '军制', supplyDesc: '补给', battleDesc: '战法', troops: '兵种', facilities: '设施', organization: '编制', militarySystem: '军制条目', campaigns: '战役', armies: '军团', initialTroops: '初始部队', weaponArsenal: '军械库', conscriptionSystem: '征兵制', militaryPolicies: '军事政策', totalForces: '总兵力' };
  var MIL_SUB = {
    weaponArsenal: { redWesternCannon: '红夷大炮', foLangJi: '佛郎机', niaoChong: '鸟铳', sanYanChong: '三眼铳', shenJiChong: '神机铳', heavyArtillery: '重炮', crossbow: '弩', bow: '弓', ironArmor: '铁甲', cottonArmor: '棉甲', paperArmor: '纸甲', halberd: '戟', sword: '刀', lance: '枪', warHorse: '战马', shipFu: '福船', shipShaXiaCang: '沙船/苍山' },
    conscriptionSystem: { primary: '主', secondary: '次', tertiary: '三', note: '注' },
    militaryPolicies: { currentDoctrine: '当前主义', supplyDoctrine: '补给主义', commandStructure: '指挥结构', strategicIntent: '战略意图' },
    totalForces: { onPaper: '账面', actuallyAvailable: '实可用', eliteCore: '精锐', noShow: '空额', avgArrearsMonths: '欠饷月均' }
  };
  var MIL_SYS_GROUPS = [['说明', ['systemDesc', 'supplyDesc', 'battleDesc']], ['编成', ['troops', 'facilities', 'organization', 'militarySystem', 'campaigns', 'armies', 'initialTroops']], ['军械与制度', ['weaponArsenal', 'conscriptionSystem', 'militaryPolicies', 'totalForces']]];
  var TROOP_LABELS = { name: '部队名', armyType: '兵种', soldiers: '兵员', garrison: '驻地', quality: '素质', morale: '士气', training: '训练', loyalty: '忠诚', control: '控制', commander: '统帅', commanderTitle: '统帅衔', ethnicity: '族属', activity: '活动', equipmentCondition: '装备状况' };
  var TROOP_GROUPS = [['概况', ['name', 'armyType', 'commander', 'commanderTitle', 'garrison', 'ethnicity', 'activity']], ['战力', ['soldiers', 'quality', 'morale', 'training', 'loyalty', 'control', 'equipmentCondition']]];
  function genTroopCard(t, i, sel) {
    var col = (t.loyalty >= 70 ? '#2d5848' : (t.loyalty < 40 ? '#a83228' : '#a8833a'));
    return '<button class="rwf2-rc' + (i === sel ? ' active' : '') + '" style="--fc:' + col + '" data-editor-command="gen-folio-select" data-gen-kind="troops" data-gen-i="' + i + '">' +
      '<span class="rc-top"><b>' + escapeHtml(t.name || '无名') + '</b></span><span class="rc-off">' + escapeHtml((t.armyType || '') + (t.garrison ? ' · ' + t.garrison : '')) + '</span>' +
      '<span class="rc-ab">兵 ' + genKilo(t.soldiers || 0) + (t.commander ? ' · ' + escapeHtml(t.commander) : '') + '</span></button>';
  }
  function renderMilitaryFolio() {
    var mil = state.scenario.military;
    if (!mil || typeof mil !== 'object') return genFolioCss() + '<div class="rwf2-wrap"><div class="rwf2-head">本剧本暂无军事配置。</div></div>';
    var tab = state._milTab === 'system' ? 'system' : 'troops';
    var tabbar = '<div class="facf-tabs"><button class="facf-tab' + (tab === 'troops' ? ' on' : '') + '" data-editor-command="mil-tab" data-mil-tab="troops">初始部队</button><button class="facf-tab' + (tab === 'system' ? ' on' : '') + '" data-editor-command="mil-tab" data-mil-tab="system">军制总览</button></div>';
    if (tab === 'system') return genFolioCss() + GEN_TABS_CSS + '<div class="rwf2-wrap">' + tabbar + '<div class="rwf2-head">军制总览 · 军制 / 编成 / 军械 / 总兵力 · 逐字段编辑</div><div class="rwf2-detail">' + genDetail('military', mil, 0, MIL_SYS_GROUPS, MIL_LABELS, MIL_SUB) + '</div></div>';
    var troops = Array.isArray(mil.initialTroops) ? mil.initialTroops : [];
    if (!troops.length) return genFolioCss() + GEN_TABS_CSS + '<div class="rwf2-wrap">' + tabbar + '<div class="rwf2-head">无初始部队，详见「军制总览」。</div></div>';
    var sel = genSelIndex('troops', troops.length);
    var roster = troops.map(function (t, i) { return genTroopCard(t, i, sel); }).join('');
    var t0 = troops[sel];
    var head = '<div class="rwf2-dh"><span class="rwf2-dh-t"><b>' + escapeHtml(t0.name || '无名部队') + '</b><span>' + escapeHtml((t0.armyType || '') + (t0.commander ? ' · ' + t0.commander : '')) + '</span></span></div>';
    return genFolioCss() + GEN_TABS_CSS + '<div class="rwf2-wrap">' + tabbar + '<div class="rwf2-head">初始部队 · ' + troops.length + ' 支 · 左点部队，右侧逐字段编辑</div><div class="rwf2-cols"><aside class="rwf2-roster">' + roster + '</aside><section class="rwf2-detail">' + head + genDetail('troops', t0, sel, TROOP_GROUPS, TROOP_LABELS, {}) + '</section></div></div>';
  }

  function renderCharacterFolio() {`;

once(`  function renderCharacterFolio() {`, BLOCK, 'fiscal-opening-military-block');

// saveGenField 支持 __root（顶层字段如 name）
once(`    var coll = genCollection(kind);
    var target = coll ? coll[i] : genConfigObject(kind);`,
     `    var coll = genCollection(kind);
    var target = coll ? coll[i] : (kind === '__root' ? state.scenario : genConfigObject(kind));`,
     'savegen-root');

// modulePrimaryView 接线
once(`    if (moduleId === 'eventsChronicle') return renderEventsFolio();`,
     `    if (moduleId === 'eventsChronicle') return renderEventsFolio();
    if (moduleId === 'economyPopulation') return renderFiscalFolio();
    if (moduleId === 'scenarioOpening') return renderOpeningFolio();
    if (moduleId === 'militaryFrontier') return renderMilitaryFolio();`,
     'primaryview-3');

// mil-tab 命令
once(`    if (command === 'gen-folio-select') { var gk = target && target.dataset && target.dataset.genKind; var gi = Number(target && target.dataset && target.dataset.genI); if (gk) { (state._genSel = state._genSel || {})[gk] = gi; reRenderModulePrimary(); } }`,
     `    if (command === 'gen-folio-select') { var gk = target && target.dataset && target.dataset.genKind; var gi = Number(target && target.dataset && target.dataset.genI); if (gk) { (state._genSel = state._genSel || {})[gk] = gi; reRenderModulePrimary(); } }
    if (command === 'mil-tab') { state._milTab = target && target.dataset && target.dataset.milTab; reRenderModulePrimary(); }`,
     'dispatch-miltab');

// 导出
once(`    renderEventsFolio: renderEventsFolio,
    saveGenField: saveGenField,`,
     `    renderEventsFolio: renderEventsFolio,
    renderFiscalFolio: renderFiscalFolio,
    renderOpeningFolio: renderOpeningFolio,
    renderMilitaryFolio: renderMilitaryFolio,
    saveGenField: saveGenField,`,
     'export-3');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
