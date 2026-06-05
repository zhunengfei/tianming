// QA Fix B：扩标签表——行政深层子字段/财政六部门/事件/军事/玩家入口/势力子字段/变量/系统名。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const edits = [];
function once(a, b, t) { if (s.split(a).length - 1 !== 1) throw new Error('ANCHOR ' + t + ' x' + (s.split(a).length - 1)); s = s.replace(a, b); edits.push(t); }

// 行政 ADMIN_DIV_SUB 大扩
once(`  var ADMIN_DIV_SUB = {
    populationDetail: { mouths: '口', fugitives: '流亡', hiddenCount: '隐户', households: '户', ding: '丁' },
    byGender: { male: '男', female: '女' }, baojia: { jia: '甲', bao: '保', li: '里' }
  };`,
`  var ADMIN_DIV_SUB = {
    populationDetail: { mouths: '口', fugitives: '流亡', hiddenCount: '隐户', households: '户', ding: '丁', adult: '壮' },
    byGender: { male: '男', female: '女', sexRatio: '性别比' },
    byAge: { old: '老', ding: '丁', young: '幼', adult: '壮', child: '童' },
    bySettlement: { fang: '坊', shi: '市', zhen: '镇', cun: '村', xiang: '乡' },
    baojia: { jia: '甲', bao: '保', li: '里', baoCount: '保数', jiaCount: '甲数', paiCount: '牌数', registerAccuracy: '册籍准确' },
    economyBase: { farmland: '田亩', commerceCoefficient: '商业系数', commerceVolume: '商贸额', maritimeTradeVolume: '海贸额', saltProduction: '盐产', mineralProduction: '矿产', horseProduction: '马产', fishingProduction: '渔产', imperialFarmland: '皇庄田', imperialAssets: '皇产', postRelays: '驿传', kejuQuota: '科举额', roadQuality: '道路', landsAnnexed: '兼并田', landsReclaimed: '垦荒', landsSurveyed: '清丈田' },
    carryingCapacity: { arable: '可耕', water: '水源', climate: '气候', historicalCap: '史载上限', currentLoad: '当前负荷', carryingRegime: '承载机制' },
    publicTreasuryInit: { money: '银', grain: '粮', cloth: '布' },
    fiscalDetail: { claimedRevenue: '报征', actualRevenue: '实征', remittedToCenter: '起运', retainedBudget: '存留', compliance: '征收率', skimmingRate: '火耗', autonomyLevel: '自主度' },
    tags: { hasPort: '有港', saltRegion: '盐区', mineralRegion: '矿区', horseRegion: '马区', fishingRegion: '渔区', imperialDomain: '皇畿' },
    disaster: { active: '进行中', type: '类型', since: '起始', severity: '烈度', desc: '描述', historicalNote: '史注', willSpawnIfUnanswered: '不理则触发' }
  };`,
'admin-sub');

// 财政 CORRUPT_SUB（新增）+ 接到 configSection
once(`  var CORRUPT_LABELS = { trueIndex: '吏治浊度', subDepts: '六部门浊度', supervision: '监察', entrenchedFactions: '盘踞集团' };`,
`  var CORRUPT_LABELS = { trueIndex: '吏治浊度', subDepts: '六部门浊度', supervision: '监察', entrenchedFactions: '盘踞集团' };
  var CORRUPT_SUB = { subDepts: { central: '中枢', provincial: '地方', military: '军务', fiscal: '财计', judicial: '刑名', imperial: '内廷' }, supervision: { level: '强度', note: '备注', institutions: '机构' } };`,
'corrupt-sub');

once(`      configSection('corruption', '吏治 · 浊度', CORRUPT_LABELS, {}) +`,
     `      configSection('corruption', '吏治 · 浊度', CORRUPT_LABELS, CORRUPT_SUB) +`,
     'corrupt-pass');

// 开篇 GAMESET_SUB（enabledSystems 系统名）+ 接到 configSection
once(`  var GAMESET_LABELS = { enabledSystems: '启用系统', startYear: '起始年', startMonth: '起始月', startDay: '起始日', enableGanzhi: '干支纪年', enableGanzhiDay: '干支纪日', enableEraName: '用年号', eraName: '年号', eraNames: '年号表', daysPerTurn: '每回合天数', turnDuration: '回合时长', turnUnit: '回合单位' };`,
`  var GAMESET_LABELS = { enabledSystems: '启用系统', startYear: '起始年', startMonth: '起始月', startDay: '起始日', enableGanzhi: '干支纪年', enableGanzhiDay: '干支纪日', enableEraName: '用年号', eraName: '年号', eraNames: '年号表', daysPerTurn: '每回合天数', turnDuration: '回合时长', turnUnit: '回合单位' };
  var GAMESET_SUB = { enabledSystems: { items: '物品', military: '军事', techTree: '科技树', civicTree: '民政树', events: '事件', map: '地图', characters: '人物', factions: '势力', classes: '阶层', rules: '规则', officeTree: '官制', parties: '党派', variables: '变量', timeline: '时间线', economy: '经济', diplomacy: '外交', tinyi: '廷议', keju: '科举' } };`,
'gameset-sub');

once(`      top + configSection('gameSettings', '开局设置 · 时间历法', GAMESET_LABELS, {}) + configSection('playerInfo', '玩家入口 · 势力与角色', PLAYERINFO_LABELS, {}) +`,
     `      top + configSection('gameSettings', '开局设置 · 时间历法', GAMESET_LABELS, GAMESET_SUB) + configSection('playerInfo', '玩家入口 · 势力与角色', PLAYERINFO_LABELS, {}) +`,
     'gameset-pass');

// 开篇 PLAYERINFO_LABELS 补角色能力字段
once(`characterFaith: '信仰', characterCulture: '文化', characterBio: '小传' };`,
     `characterFaith: '信仰', characterCulture: '文化', characterBio: '小传', characterDesc: '角色简述', characterAppearance: '角色外貌', characterCharisma: '魅力', loyalty: '忠诚', ambition: '野心', intelligence: '智谋', valor: '武勇', military: '军事', benevolence: '仁德', administration: '政务', management: '管理', integrity: '廉节', diplomacy: '外交' };`,
     'playerinfo-add');

// 事件 EVENT_LABELS 补
once(`choices: '选项', sid: '剧本ID', id: 'ID' };`,
     `choices: '选项', sid: '剧本ID', id: '编号', triggerTurn: '触发回合', isOpeningEvent: '开局事件', historical: '史实经过', narrative: '叙事', affectedRegion: '波及地区', longTermConsequences: '长远后果', historicalNote: '史注', aiHint: 'AI提示', chainNext: '后续事件' };`,
     'event-add');

// 军事 TROOP_LABELS 补
once(`commanderTitle: '统帅衔', ethnicity: '族属', activity: '活动', equipmentCondition: '装备状况' };`,
     `commanderTitle: '统帅衔', ethnicity: '族属', activity: '活动', equipmentCondition: '装备状况', description: '描述', faction: '所属', location: '位置', controlLevel: '控制度', payArrearsMonths: '欠饷月数', mutinyRisk: '哗变风险', sid: '剧本ID', id: '编号' };`,
     'troop-add');

// 规则 VAR_LABELS 补
once(`color: '颜色', icon: '图标', visible: '玩家可见', sid: '剧本ID', id: 'ID' };`,
     `color: '颜色', icon: '图标', visible: '玩家可见', sid: '剧本ID', id: '编号', unit: '单位' };`,
     'var-add');

// 势力 FAC_SUB 补 warState/publicOpinion/offendThresholds(对象变体)
once(`    warState: { active: '进行中', pending: '待发', recent: '近期' },`,
     `    warState: { active: '进行中', pending: '待发', recent: '近期', readiness: '战备', activeFronts: '交战面' },
    offendThresholds: { warning: '警告', hostile: '敌对', war: '开战' },`,
     'fac-warstate');

once(`    publicOpinion: { amongGentry: '士绅', amongPeasantry: '百姓', amongScholars: '士林' },`,
     `    publicOpinion: { amongGentry: '士绅', amongPeasantry: '百姓', amongScholars: '士林', localSupport: '地方支持' },`,
     'fac-publicopinion');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
