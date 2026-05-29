#!/usr/bin/env node
/**
 * fill-tianqi-mentors.js
 * v2.6 Slice 10a·手补天启七年·九月（官方） + 绍宋·建炎元年八月（官方） 师生关系
 *
 * 数据源·v2.9 §5.4.11 历史考据·东林党 / 阉党 / 中立 / 言官 chain
 * 用法·node web/tools/fill-tianqi-mentors.js [--dry]
 * 输出·写入 scenarios/天启七年·九月（官方）.json + 绍宋·建炎元年八月（官方）.json·
 *   - 每个 mentor·写入 ch.mentees = [...] (string[])
 *   - 每个 mentee·写入 ch.mentor = '...' (string·一 mentee 只一 mentor·若多 mentor 后者覆盖前者)
 *
 * smoke·跑 smoke-mentor-coverage.js 验证·天启 ≥30·绍宋 ≥15
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry');
const SCENARIOS_DIR = path.join(__dirname, '..', '..', 'scenarios');

// ─── 天启七年·30 关系 (v2.9 §5.4.11 历史考据) ───
const TIANQI_MENTORS = [
  // ── 东林党 mentor chain (核心 13 关系) ──
  { mentor: '赵南星',   mentees: ['高攀龙', '杨涟', '左光斗', '魏大中', '钱龙锡'] },
  { mentor: '韩爌',     mentees: ['钱龙锡', '何如宠', '吴宗达', '周道登'] },
  { mentor: '叶向高',   mentees: ['朱国祯', '朱延禧', '韩爌'] },
  { mentor: '顾宪成',   mentees: ['高攀龙', '钱一本'] },  // 赵南星 也是顾门人·但跟"赵南星 mentor 杨涟" 体系冲突·按 §5.4.11·取强者
  // ── 阉党 mentor chain (6 关系) ──
  { mentor: '魏忠贤',   mentees: ['田尔耕', '许显纯', '崔呈秀', '周应秋'] },
  { mentor: '顾秉谦',   mentees: ['薛三才', '孙杰'] },
  // ── 中立 mentor chain (4 关系) ──
  { mentor: '孙承宗',   mentees: ['袁崇焕', '祖大寿', '毛文龙'] },
  { mentor: '毕自严',   mentees: ['李逢申'] },
  // ── 言官 mentor chain (4 关系·跟东林部分重叠·_buildMentorIndex 后者覆盖前者) ──
  { mentor: '赵南星',   mentees: ['周朝瑞', '袁化中'] }  // append·跟首条 merge
];

// ─── 绍宋·15 关系 ───
const SHAOSONG_MENTORS = [
  // ── 主战 chain (8) ──
  { mentor: '李纲',  mentees: ['宗泽', '张浚', '胡铨'] },
  { mentor: '宗泽',  mentees: ['岳飞', '刘锜', '韩世忠'] },
  // ── 主和 chain (4·秦桧暂空) ──
  { mentor: '黄潜善', mentees: ['汪伯彦', '范宗尹'] },
  { mentor: '秦桧',   mentees: [] },
  // ── 中立 chain (2) ──
  { mentor: '李回',   mentees: ['叶梦得'] }
];

function applyMentors(scenarioPath, mentorData, expectedMinRelations) {
  if (!fs.existsSync(scenarioPath)) {
    console.log('SKIP·scenario not found·' + scenarioPath);
    return { applied: 0, missing: [] };
  }
  const raw = fs.readFileSync(scenarioPath, 'utf-8');
  const scenario = JSON.parse(raw);
  const chars = scenario.characters || [];
  const byName = {};
  chars.forEach(c => { if (c && c.name) byName[c.name] = c; });

  let applied = 0;
  const missing = [];

  // merge mentors (allow same mentor in multiple entries·append mentees)
  const mergedByMentor = {};
  mentorData.forEach(rel => {
    if (!mergedByMentor[rel.mentor]) mergedByMentor[rel.mentor] = [];
    rel.mentees.forEach(m => {
      if (mergedByMentor[rel.mentor].indexOf(m) < 0) mergedByMentor[rel.mentor].push(m);
    });
  });

  Object.keys(mergedByMentor).forEach(mentorName => {
    const mentor = byName[mentorName];
    if (!mentor) {
      missing.push('mentor·' + mentorName);
      return;
    }
    const mentees = mergedByMentor[mentorName];
    const validMentees = mentees.filter(menteeName => {
      if (!byName[menteeName]) {
        missing.push('mentee·' + menteeName + ' (mentor=' + mentorName + ')');
        return false;
      }
      return true;
    });
    if (validMentees.length > 0) {
      mentor.mentees = validMentees;
      applied += validMentees.length;
      // 反向·每 mentee 写 mentor 字段
      validMentees.forEach(menteeName => {
        byName[menteeName].mentor = mentorName;
      });
    }
  });

  if (!DRY_RUN) {
    fs.writeFileSync(scenarioPath, JSON.stringify(scenario, null, 2), 'utf-8');
    console.log('WROTE·' + scenarioPath + '·' + applied + ' relations applied');
  } else {
    console.log('DRY·' + scenarioPath + '·would apply ' + applied + ' relations');
  }
  if (missing.length > 0) {
    console.log('MISSING (' + missing.length + ')·' + missing.slice(0, 10).join('·'));
  }
  console.log('  expected ≥' + expectedMinRelations + '·actual ' + applied + (applied >= expectedMinRelations ? ' ✓' : ' ✗'));
  return { applied, missing };
}

function main() {
  console.log('=== Slice 10a·fill-tianqi-mentors (DRY=' + DRY_RUN + ') ===');
  console.log('');
  const tianqi = applyMentors(
    path.join(SCENARIOS_DIR, '天启七年·九月（官方）.json'),
    TIANQI_MENTORS,
    30
  );
  console.log('');
  const shaosong = applyMentors(
    path.join(SCENARIOS_DIR, '绍宋·建炎元年八月（官方）.json'),
    SHAOSONG_MENTORS,
    15
  );
  console.log('');
  console.log('=== TOTAL·' + (tianqi.applied + shaosong.applied) + ' relations applied ===');
  if ((tianqi.missing.length + shaosong.missing.length) > 0) {
    console.log('=== MISSING·' + (tianqi.missing.length + shaosong.missing.length) + ' (verify char names match scenario data) ===');
  }
}

main();
