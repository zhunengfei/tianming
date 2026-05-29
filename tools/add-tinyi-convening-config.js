#!/usr/bin/env node
/**
 * add-tinyi-convening-config.js
 * v2.6 Slice 2.5.5·给 5 剧本写入 scenario.tinyi.convening + scenario.tinyi.populationConfidenceInit + scenario.tinyi.taboos
 * 跟 v2.9 §5.4.6 朝代差异化 + §5.4.7 民意度初始 一致
 *
 * 用法·node web/tools/add-tinyi-convening-config.js [--dry]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const SCN_DIR = path.join(__dirname, '..', '..', 'scenarios');

// 朝代差异化模板·v2.9 §5.4.6
const DYNASTY_CONFIG = {
  '明': {
    requiredCallList: ['首辅', '次辅', '吏部尚书', '户部尚书', '礼部尚书', '兵部尚书', '刑部尚书', '工部尚书', '都察院左都御史'],
    topicSpecificRequired: {
      'succession':         ['首辅', '次辅', '礼部尚书', '宗人府宗令'],
      'regicide-pursuit':   ['都察院左都御史', '刑部尚书', '锦衣卫指挥'],
      'military-command':   ['兵部尚书', '兵部右侍郎', '戎政尚书'],
      'finance':            ['户部尚书', '户部左侍郎']
    },
    topicSpecificForbidden: {
      'succession':         ['外戚', '内监'],
      'regicide-pursuit':   ['阉党头目']
    },
    maxAttendees: 30,
    minAttendees: 5,
    maxFrequencyPerMonth: 2
  },
  '宋': {
    requiredCallList: ['左相', '右相', '枢密使', '知枢密院事'],
    topicSpecificRequired: {
      'military-command':   ['枢密使', '知枢密院事'],
      'finance':            ['三司使', '户部尚书']
    },
    maxAttendees: 20,
    minAttendees: 3,
    maxFrequencyPerMonth: 4
  },
  '唐': {
    requiredCallList: ['中书令', '门下侍中', '尚书令', '左仆射', '右仆射'],
    maxAttendees: 25,
    minAttendees: 4,
    maxFrequencyPerMonth: 3
  }
};

// 朝代 + period 民意度 init·v2.9 §5.4.7
const DYNASTY_POPULATION_CONFIDENCE_INIT = {
  '明': 0, '宋': 0, '唐': 0, '元': -10, '清': -5,
  '太祖建国':  +20, '盛世': +10, '中兴': 0, '末世': -20, '危亡': -40
};

const TABOOS = {
  guosang: { forbidActions: ['廷杖', '革职', '削籍'], muteCeremony: true, atmosphereOverride: 'grave' },
  zaiyi: { mandatoryAppend: '罪己', playerAutoFromBias: -10, yanguanAutoUrge: true },
  junzheng: { forbidActions: ['休假', '致仕'], mandatoryAttendees: ['兵部尚书', '戎政尚书', '督师'], urgentMode: true }
};

const SCENARIO_DYNASTIES = {
  '天启七年·九月（官方）.json': '明',
  '崇祯.json': '明',
  '挽天倾：崇祯死局.json': '明',
  '111.json': '明',  // 默认明朝 fallback·user 后续可调
  '绍宋·建炎元年八月（官方）.json': '宋'
};

function applyConfig(file) {
  const p = path.join(SCN_DIR, file);
  if (!fs.existsSync(p)) { console.log('SKIP·' + file); return; }
  const d = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const dynasty = SCENARIO_DYNASTIES[file] || '明';
  const period = d.dynastyPhaseHint || d.period || '中兴';

  if (!d.tinyi) d.tinyi = {};
  d.tinyi.convening = DYNASTY_CONFIG[dynasty] || DYNASTY_CONFIG['明'];
  d.tinyi.taboos = TABOOS;

  // 民意度初始
  const dynastyInit = DYNASTY_POPULATION_CONFIDENCE_INIT[dynasty] || 0;
  const periodInit = DYNASTY_POPULATION_CONFIDENCE_INIT[period] || 0;
  d.tinyi.populationConfidenceInit = Math.max(-100, Math.min(100, dynastyInit + periodInit));

  if (!DRY) fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf-8');
  console.log((DRY ? 'DRY' : 'WROTE') + '·' + file + '·dynasty=' + dynasty + '·period=' + period + '·popInit=' + d.tinyi.populationConfidenceInit);
}

console.log('=== Slice 2.5.5·add tinyi.convening config ===');
Object.keys(SCENARIO_DYNASTIES).forEach(applyConfig);
console.log('=== DONE ===');
