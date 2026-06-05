// C2-loop codemod — 工具执行 for-循环 改顺序 promise 链（支持异步工具）。span 替换。
const fs = require('fs');
const path = 'editor-authoring-agent.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;

const START = "          var toolResults = [];\n          var finishAccepted = false;\n          for (var i = 0; i < calls.length; i++) {";
const END = "          if (finishAttempts >= maxFinishAttempts) { stopReason = 'finishBlocked'; return; }\n          return step();";

const si = s.indexOf(START);
if (si < 0 || s.indexOf(START, si + 1) >= 0) throw new Error('START marker not unique/found');
const ei0 = s.indexOf(END, si);
if (ei0 < 0 || s.indexOf(END, ei0 + 1) >= 0) throw new Error('END marker not unique/found');
const ei = ei0 + END.length;

const NEW =
  "          var toolResults = [];\n" +
  "          var finishAccepted = false;\n" +
  "          var _ci = 0;\n" +
  "          function _procCall() {\n" +
  "            if (_ci >= calls.length || finishAccepted) return Promise.resolve();\n" +
  "            var c = calls[_ci++];\n" +
  "            return Promise.resolve().then(function () {\n" +
  "              if (c.name === 'finish') {\n" +
  "                var blocking = _blockingViolations(validateDraft(draft), blockingChecks);\n" +
  "                if (!blocking.length) { _finishSummary = (c.input && c.input.summary) || ''; finishAccepted = true; return { ok: true, finish: true, summary: _finishSummary }; }\n" +
  "                finishAttempts++; return { ok: false, finish: false, reason: '\\u8349\\u7a3f\\u4ecd\\u6709 ' + blocking.length + ' \\u9879\\u5fc5\\u4fee\\u8fdd\\u89c4\\uff0c\\u7981\\u6b62\\u7ed3\\u675f\\uff0c\\u8bf7\\u5148\\u4fee\\u590d', violations: blocking };\n" +
  "              }\n" +
  "              var deny = _permCheck(c.name, c.input, perms);\n" +
  "              if (deny) return { ok: false, reason: deny };\n" +
  "              return Promise.resolve().then(function () { return dispatchTool(draft, c.name, c.input, surfaces); }).catch(function (te) { return { ok: false, reason: '\\u5de5\\u5177\\u6267\\u884c\\u51fa\\u9519\\uff1a' + ((te && te.message) || te) + '\\uff08\\u8bf7\\u68c0\\u67e5\\u53c2\\u6570\\u540e\\u91cd\\u8bd5\\uff0c\\u6216\\u6362\\u4e2a\\u5de5\\u5177/\\u65b9\\u5f0f\\uff09' }; });\n" +
  "            }).then(function (result) {\n" +
  "              if (c.name === 'proposePlan' && result && result.plan) { _planResult = { steps: result.steps, summary: result.summary }; finishAccepted = true; }\n" +
  "              if (c.name === 'submitReview' && result && result.review) { _reviewResult = { findings: result.findings, summary: result.summary }; finishAccepted = true; }\n" +
  "              if (c.name === 'submitAnswer' && result && result.answered) { _qaResult = { answer: result.answer }; finishAccepted = true; }\n" +
  "              if (c.name === 'submitExplanation' && result && result.explained) { _explainResult = { summary: result.summary, points: result.points }; finishAccepted = true; }\n" +
  "              if (c.name === 'askClarification' && result && result.clarify) { _clarifyResult = { questions: result.questions }; finishAccepted = true; }\n" +
  "              record(c.name, c.input, result);\n" +
  "              toolResults.push({ id: c.id, name: c.name, content: _resultToText(result) });\n" +
  "              return _procCall();\n" +
  "            });\n" +
  "          }\n" +
  "          return _procCall().then(function () {\n" +
  "            conversation.push({ role: 'assistant', text: text, toolCalls: calls });\n" +
  "            conversation.push({ role: 'tool', toolResults: toolResults });\n" +
  "            tokensUsed += _estimateTokens(JSON.stringify(toolResults));\n" +
  "            if (finishAccepted) { finished = true; stopReason = _clarifyResult ? 'needsClarification' : (_explainResult ? 'explained' : (_qaResult ? 'answered' : (_reviewResult ? 'reviewed' : (_planResult ? 'planned' : 'finish')))); return; }\n" +
  "            if (finishAttempts >= maxFinishAttempts) { stopReason = 'finishBlocked'; return; }\n" +
  "            return step();\n" +
  "          });";

s = s.slice(0, si) + NEW + s.slice(ei);
fs.writeFileSync(path, s, 'utf8');
console.log('loop converted | delta:', s.length - orig.length);
