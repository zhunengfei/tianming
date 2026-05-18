#!/usr/bin/env node
/* eslint-env node */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'phase8-formal-bridge.js'), 'utf8');

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

function sliceBetween(startNeedle, endNeedle) {
  const start = src.indexOf(startNeedle);
  const end = endNeedle ? src.indexOf(endNeedle, start + startNeedle.length) : -1;
  assert(start >= 0, `${startNeedle} missing`);
  return src.slice(start, end >= 0 ? end : undefined);
}

const card = sliceBetween('function renderRecordCard(row, archiveKind)', 'function renderRecordGroup');
const biannian = sliceBetween('function renderBiannianActiveCard(row)', 'function renderFormalRecordBiannian');
const panel = sliceBetween('function renderFormalRecordsPanel()', 'function openZhaoPreviewPanel');
const deskRecord = sliceBetween('function deskRecord(type, title, text, tags)', 'function deskEdictBodyValue');
const styles = sliceBetween('function installActionPanelExactStyles()', 'function actionShell');

assert(src.includes('function fullRecordText('), 'full records text helper is missing');
assert(styles.includes('.records-fulltext-v5'), 'records full-text CSS is missing');
assert(deskRecord.includes('var full ='), 'deskRecord must keep full text before deriving summaries');
assert(deskRecord.includes('summary:'), 'deskRecord should persist a separate short summary');
assert(deskRecord.includes('fullText:'), 'deskRecord should persist fullText for records UI');
assert(!deskRecord.includes('var clean = compactText'), 'deskRecord must not use a truncated clean text as the source record');
assert(deskRecord.includes('text: full') && deskRecord.includes('content: full'), 'chronicle records must store full text/content');
assert(card.includes('fullRecordText(row.title'), 'records card title must not be clipped');
assert(card.includes('fullRecordText(row.text'), 'records card body must not be clipped');
assert(card.includes('fullRecordText(row.annotation'), 'records card annotation must not be clipped');
assert(biannian.includes('fullRecordText(row.title'), 'biannian active title must not be clipped');
assert(biannian.includes('fullRecordText(row.text'), 'biannian active body must not be clipped');
assert(panel.includes('fullRecordText(selected.title'), 'records detail title must not be clipped');
assert(panel.includes('fullRecordText(selected.text'), 'records detail body must not be clipped');
assert(/records-entry-main-v5 b\{[^}]*white-space:normal/.test(styles), 'record card titles should wrap instead of ellipsis');
assert(/records-entry-main-v5 em\{[^}]*white-space:normal/.test(styles), 'record card meta should wrap instead of ellipsis');
assert(/records-entry-body-v5\{(?![^}]*max-height)/.test(styles), 'record card body should not have max-height truncation');
assert(/records-detail-v5\{[^}]*overflow:auto/.test(styles), 'records detail pane should scroll instead of clipping');

console.log(`[smoke-formal-records-fulltext] PASS ${passed} assertions`);
