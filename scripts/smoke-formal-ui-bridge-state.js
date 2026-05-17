#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'phase8-formal-bridge.js'), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(/function updateFormalMemorialReply\(\w+\)/.test(code), 'memorial reply draft updater is missing');
assert(/querySelectorAll\('\[data-desk-memorial-reply\]'\), updateFormalMemorialReply/.test(code), 'overlay close must capture memorial reply drafts');
assert(/state\.memorialReplies\s*=\s*state\.memorialReplies\s*\|\|\s*\{\}/.test(code), 'memorial reply state bucket is missing');
assert(/hasOwnProperty\.call\(state\.memorialReplies,\s*replyId\)[\s\S]{0,80}reply\s*=\s*state\.memorialReplies\[replyId\]/.test(code), 'memorial cards must restore cached replies');

const stageIndex = code.indexOf('function deskStageMemorial');
const stageFallbackIndex = code.indexOf('state.memorialReplies', stageIndex);
const stageDecisionIndex = code.indexOf("if (decision === 'hold')", stageIndex);
const stageClearIndex = code.indexOf('delete state.memorialReplies[replyId]', stageIndex);
const stageReopenIndex = code.indexOf('openYueZouPreviewPanel();', stageIndex);
assert(stageIndex >= 0 && stageFallbackIndex > stageIndex && stageFallbackIndex < stageDecisionIndex, 'deskStageMemorial must read cached reply before applying a decision');
assert(stageClearIndex > stageDecisionIndex && stageClearIndex < stageReopenIndex, 'deskStageMemorial must clear consumed reply cache before reopening');

const sendIndex = code.indexOf('function deskSendLetter');
const sendCaptureIndex = code.indexOf("querySelectorAll('.tm-desk-overlay')", sendIndex);
const sendDraftIndex = code.indexOf('var letterDraft = state.letterDraft || {};', sendIndex);
const sendBodyIndex = code.indexOf("deskValue('[data-desk-letter-body]', letterDraft.body || '')", sendIndex);
const sendTypeIndex = code.indexOf("deskValue('[data-desk-letter-type]', letterDraft.type || 'personal')", sendIndex);
assert(sendIndex >= 0 && sendCaptureIndex > sendIndex && sendDraftIndex > sendCaptureIndex, 'deskSendLetter must sync overlay state before reading letter draft');
assert(sendBodyIndex > sendDraftIndex && sendTypeIndex > sendDraftIndex, 'deskSendLetter must fall back to cached letter draft fields');

const memIndex = code.indexOf('function deskStoreLetterMemory');
const memCaptureIndex = code.indexOf("querySelectorAll('.tm-desk-overlay')", memIndex);
const memDraftIndex = code.indexOf('var letterDraft = state.letterDraft || {};', memIndex);
const memBodyIndex = code.indexOf("deskValue('[data-desk-letter-body]', letterDraft.body || '')", memIndex);
assert(memIndex >= 0 && memCaptureIndex > memIndex && memDraftIndex > memCaptureIndex && memBodyIndex > memDraftIndex, 'deskStoreLetterMemory must fall back to cached letter draft fields');

console.log('[smoke-formal-ui-bridge-state] pass');
