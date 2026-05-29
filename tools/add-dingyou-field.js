#!/usr/bin/env node
/**
 * add-dingyou-field.js
 * v2.6 Slice 1·给 5 剧本所有 chars 加 _dingyou: false (default·丁忧·守孝 27 月)
 * 跟 _imprisoned/_sick/_exiled/_retired/_fled/_missing 8 类 status 并列
 *
 * v2.9 §5.4.2 8 类 status·_dingyou 是 7 已存 + 1 新
 * 用法·node web/tools/add-dingyou-field.js [--dry]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const SCENARIOS = [
  '天启七年·九月（官方）.json',
  '崇祯.json',
  '挽天倾：崇祯死局.json',
  '111.json',
  '绍宋·建炎元年八月（官方）.json'
];

const SCN_DIR = path.join(__dirname, '..', '..', 'scenarios');

let totalAdded = 0;
SCENARIOS.forEach(f => {
  const p = path.join(SCN_DIR, f);
  if (!fs.existsSync(p)) { console.log('SKIP·' + f); return; }
  const d = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const chars = d.characters || [];
  let added = 0;
  chars.forEach(c => {
    if (c && typeof c === 'object' && !('_dingyou' in c)) {
      c._dingyou = false;
      added++;
    }
  });
  if (added > 0 && !DRY) {
    fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf-8');
  }
  console.log((DRY ? 'DRY' : 'WROTE') + '·' + f + '·' + added + ' chars added _dingyou');
  totalAdded += added;
});
console.log('=== TOTAL·' + totalAdded + ' chars added _dingyou:false ===');
