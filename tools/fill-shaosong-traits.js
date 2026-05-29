#!/usr/bin/env node
/*
 * 绍宋 NPC traitIds 补全·A 方案·2026-05-22
 *
 * 用法·node web/tools/fill-shaosong-traits.js [--dry] [--scenario path]
 *
 * 原理·扫 char.personality + bio·按 keyword map 推 4-6 traitIds (CK3 style)
 * 写回 JSON·保持其它字段不动。--dry 只打印·不写。
 */

var fs = require('fs');
var path = require('path');

var DEFAULT_SCENARIO = path.resolve(__dirname, '..', '..', 'scenarios', '绍宋·建炎元年八月（官方）.json');
var SCENARIO_PATH = (function() {
  var idx = process.argv.indexOf('--scenario');
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return DEFAULT_SCENARIO;
})();
var DRY_RUN = process.argv.includes('--dry');

// ─── Chinese keyword → trait_id 映射 (按 personality 类 36 trait + 关键 lifestyle/role) ───
// 每 trait 列 4-12 中文关键词·匹配命中·命中越多权重越大
var TRAIT_KEYWORDS = {
  // ── personality·对立组·已扩展中文短语 ──
  brave: ['勇敢','勇猛','勇武','无畏','胆识','胆大','悍勇','骁勇','果敢','刚毅','敢死','敢战','刚直','忠勇','沉勇','豪侠','不避祸','不疑','气盛','少年勇','起兵抗','弃官从军','勇'],
  craven: ['怯懦','胆小','畏缩','怕事','避祸','畏战','胆怯','软弱','懦弱','畏怯','惧战','优柔','惜身','保命'],

  calm: ['冷静','沉稳','沉着','稳重','审慎','从容','镇定','安详','克制','宁静','贞静','深沉','清雅','言简意赅','沉','中庸'],
  wrathful: ['暴怒','易怒','狂躁','烈性','刚烈','凶狠','狂暴'],

  chaste: ['贞洁','贞静','守节','守贞','节操','洁身','守身','清白','贞烈'],
  lustful: ['好色','色欲','纵欲','风流','贪色','好女色'],

  content: ['安于现状','知足','满足','安分','安贫','寡欲','无争','本分','不弄权','无党','不敢求显贵','得用即从'],
  ambitious: ['野心','野望','觊觎','图谋','志在','志大','大志','图大','欲取','僭越','使命感','志气','年少得志','觊觎大位'],

  diligent: ['勤奋','勤勉','勤政','勤恳','日夜','不辍','劳形','躬亲','勤苦','勤','任事'],
  lazy: ['懒惰','怠惰','怠政','疏懒','倦怠','慵懒','偷闲','推诿'],

  honest: ['诚实','耿直','憨直','坦诚','直率','直言','直谏','率真','纯朴','清介','诚厚','重然诺','忠纯'],
  deceitful: ['狡诈','奸诈','诡诈','奸滑','诡谲','诈伪','口蜜腹剑','两面','趋附','逢迎','趋炎','附阉','党羽','依附','伪楚','伪齐','废居','投金','降金'],

  generous: ['慷慨','大方','施舍','乐善','好施','不吝','诚厚'],
  greedy: ['贪婪','贪财','聚敛','贪图','贪利','贪墨','爱财','逐利'],

  gregarious: ['合群','善交','长袖善舞','广结','交游','八面玲珑','和气','圆通'],
  shy: ['害羞','内向','孤僻','寡言','独行','孤介','沉默','澹泊'],

  humble: ['谦卑','谦逊','谦恭','谦虚','虚怀','本分','心翼翼','不敢','不弄权'],
  arrogant: ['傲慢','骄矜','倨傲','自负','自大','跋扈','骄横','狂傲','倨','骄'],

  just: ['公正','公允','秉公','正直','清正','刚正','耿介','公平','秉正','刚直','清介','忠纯','无党','言官','御史','识大体'],
  arbitrary: ['专断','独断','刚愎','武断','专横','专制','偏听'],

  patient: ['耐心','隐忍','深沉','忍耐','坚韧','韧','温顺','谨慎','识进退'],
  impatient: ['急躁','急切','焦躁','心急','迫切','匆忙','激切','气盛'],

  temperate: ['节制','节俭','节用','克制','简朴','清淡','寡欲','澹泊','清介','清雅'],
  gluttonous: ['暴食','贪食','纵酒','嗜酒'],

  trusting: ['轻信','信人','信任','单纯','坦诚'],
  paranoid: ['多疑','疑忌','猜忌','疑心','疑惧','疑虑','防备','戒心','惕然','警觉','内心常自我辩论','日忧','心结'],

  zealous: ['狂热','热忱','信仰','痴狂','执着','坚信','激切','主战不疑','极烈','抗金','赤心报国','为信','誓死','八字军'],
  cynical: ['愤世嫉俗','玩世','冷嘲','讥讽','嘲讽','看透'],

  forgiving: ['宽宏','宽厚','宽容','大度','包容','不究','释然','谅人'],
  vengeful: ['睚眦必报','记仇','报复','怀恨','念仇','复仇','宿仇','旧恨','不堪受辱','念子','心中念'],

  compassionate: ['仁善','仁厚','宽仁','爱民','怜悯','不忍','心慈','恻隐','仁爱','心系','念幼','念子'],
  callous: ['冷酷','冷漠','凉薄','薄情','无情','寡情','冷峻'],

  sadistic: ['虐待','狠辣','残忍','嗜杀','凶残','酷烈','严酷'],

  stubborn: ['固执','执拗','倔强','顽固','坚持','执意','不疑','执意北上'],
  fickle: ['多变','善变','反复','无常','摇摆','优柔','摇移','渐主和','转向'],
  eccentric: ['古怪','怪异','怪僻','奇崛','异类','特立','癖好','早熟','老阉','婴儿'],

  // ── lifestyle/role·常见 ──
  scholar: ['学问','博学','读书','经史','学者','士人','学问精深','家学','原学','心思细密','聪慧','聪明','机敏','机变','心思'],
  theologian: ['神学','道家','佛家','僧','道士','黄教','格鲁','藏传','萨满','毕摩','沙门','参禅','禅宗','禅师','禅院','法师','住持','虔诚','信仰精深'],
  schemer: ['阴谋','机变','算计','谋略','心机','深谋','权术','聪慧','聪明','心思细密','有谋'],
  diplomat_ls: ['外交','善辩','使臣','纵横','口才','辩才','识进退'],
  administrator_ls: ['理政','治政','行政','管理','治才','干练','识人','建制','调度'],
  strategist: ['军事','兵略','统兵','兵法','韬略','将才','治军','军中','武人','御众','八字之约','军纪','西军','御营','中军','节度使','部曲','大将','水军','起兵','义军帅','忠义军'],
  family_first: ['顾家','念家','心系幼','心系','念子','心中念子','念幼子','重孝','尚兄','故旧'],
  gallant: ['侠义','侠','义气','行侠','江湖','勇侠','豪侠','有义气'],
  august: ['军中威望','威望渐起','威望'],

  // ── commander ──
  aggressive_attacker: ['进攻','激进','主战','冲锋','锐意','突击','北伐','急进'],
  unyielding_defender: ['防御','守势','坚守','固守','死守','防守','善守','善守险','治军','治军有','守城','守州','守陕州','不投','守太行','守河南'],
  cautious_leader: ['谨慎','慎重','稳进','中庸','偏和','主和','惧战'],
  reckless: ['鲁莽','轻率','急进','贪功','急切','气盛'],
  flexible_leader: ['灵活','机动','变通','应变','机敏','机变'],
  organizer: ['组织','调度','统筹','协调','建制'],
  holy_warrior: ['圣战','为信','护教','忠节','殉道','殉国'],

  // ── 健康/特殊 ──
  scarred: ['伤疤','受伤','旧伤','伤痕','北狩'],
  depressed: ['抑郁','忧郁','哀伤','沉郁','悲愤','郁结','心结','日忧','北狩'],
};

// 对立组·避免同时给一对反义 trait
var OPPOSITES = {
  brave: 'craven', craven: 'brave',
  calm: 'wrathful', wrathful: 'calm',
  chaste: 'lustful', lustful: 'chaste',
  content: 'ambitious', ambitious: 'content',
  diligent: 'lazy', lazy: 'diligent',
  honest: 'deceitful', deceitful: 'honest',
  generous: 'greedy', greedy: 'generous',
  gregarious: 'shy', shy: 'gregarious',
  humble: 'arrogant', arrogant: 'humble',
  just: 'arbitrary', arbitrary: 'just',
  patient: 'impatient', impatient: 'patient',
  temperate: 'gluttonous', gluttonous: 'temperate',
  trusting: 'paranoid', paranoid: 'trusting',
  zealous: 'cynical', cynical: 'zealous',
  forgiving: 'vengeful', vengeful: 'forgiving',
  compassionate: 'callous', callous: 'compassionate',
  // sadistic / stubborn / fickle / eccentric 不属任何对立组
  aggressive_attacker: 'unyielding_defender', unyielding_defender: 'aggressive_attacker',
  reckless: 'cautious_leader', cautious_leader: 'reckless'
};

function _scoreTraits(char) {
  var text = '';
  text += (char.personality || '') + ' ';
  text += (char.bio || '') + ' ';
  text += (char.background || '') + ' ';
  text += (char.belief || '') + ' ';
  text += (char.faith || '') + ' ';
  text += (char.title || '') + ' ';
  text += (char.officialTitle || '') + ' ';
  text += (char.role || '') + ' ';
  text += (char.appearance || '') + ' ';
  text += (char.diction || '') + ' ';
  if (Array.isArray(char._memory)) text += char._memory.map(function(m){ return (m.event || ''); }).join(' ') + ' ';
  if (text.length < 5) return [];

  var scores = {};
  Object.keys(TRAIT_KEYWORDS).forEach(function(tid) {
    var kws = TRAIT_KEYWORDS[tid];
    var hits = 0;
    kws.forEach(function(kw) {
      // 简单 substring·中文不分词·够用
      var bare = kw.replace(/\([^)]*\)/g, '');  // 去除 (注释)
      if (!bare) return;
      if (text.indexOf(bare) >= 0) hits++;
    });
    if (hits > 0) scores[tid] = hits;
  });

  // 解决对立组·按 score 取强者
  var resolved = {};
  Object.keys(scores).forEach(function(tid) {
    var opp = OPPOSITES[tid];
    if (opp && scores[opp]) {
      // 比较·胜者保留
      if (scores[tid] >= scores[opp]) {
        resolved[tid] = scores[tid];
      }
      // 若已 resolved 加过 opp·删它
      if (resolved[opp] && scores[tid] >= scores[opp]) delete resolved[opp];
    } else {
      resolved[tid] = scores[tid];
    }
  });

  // 排序取 top 6
  var sorted = Object.keys(resolved).map(function(tid){ return { tid:tid, score:resolved[tid] }; })
    .sort(function(a, b){ return b.score - a.score; })
    .slice(0, 6);
  return sorted;
}

function main() {
  var raw = fs.readFileSync(SCENARIO_PATH, 'utf-8');
  var scenario = JSON.parse(raw);
  var chars = scenario.characters || [];
  console.log('Scenario·' + SCENARIO_PATH);
  console.log('Chars total·' + chars.length + '·dry=' + DRY_RUN);

  var stats = { filled: 0, alreadyHas: 0, noText: 0, noMatch: 0 };
  var changes = [];

  chars.forEach(function(c) {
    if (!c) return;
    if (c.traitIds && c.traitIds.length) { stats.alreadyHas++; return; }
    var sorted = _scoreTraits(c);
    if (!sorted.length) { stats.noMatch++; return; }
    var ids = sorted.map(function(s){ return s.tid; });
    changes.push({ name: c.name, traitIds: ids, scores: sorted });
    if (!DRY_RUN) c.traitIds = ids;
    stats.filled++;
  });

  console.log('\\n=== STATS ===');
  console.log('filled·' + stats.filled);
  console.log('alreadyHas·' + stats.alreadyHas);
  console.log('noMatch·' + stats.noMatch);

  console.log('\\n=== SAMPLE (前 12 改动) ===');
  changes.slice(0, 12).forEach(function(c) {
    console.log('  ' + c.name + '·[' + c.traitIds.join(',') + ']·scores=' + c.scores.map(function(s){ return s.tid + ':' + s.score; }).join(' '));
  });

  if (!DRY_RUN) {
    // 保留原 JSON 格式 (2-space indent 是 web 默认)
    fs.writeFileSync(SCENARIO_PATH, JSON.stringify(scenario, null, 2), 'utf-8');
    console.log('\\n✓ wrote ' + SCENARIO_PATH + '·' + stats.filled + ' chars updated');
  } else {
    console.log('\\n--dry run·no file written');
  }
}

main();
