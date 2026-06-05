// D1 codemod — genReference 工具（老编辑器各部分生成范式·实时读·零漂移）。
const fs = require('fs');
const path = 'editor-authoring-agent.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }
function exactly(a, b, t, k) { const n = s.split(a).length - 1; if (n !== k) throw new Error('ANCHOR ' + t + ' x' + n + ' need ' + k); s = s.split(a).join(b); edits.push(t + '×' + k); }

// 1) helper：dispatchTool 前插
const HELP =
  "  // D1 \\u00b7 \\u8001\\u7f16\\u8f91\\u5668\\u5404\\u90e8\\u5206 AI \\u751f\\u6210\\u8303\\u5f0f\\uff08\\u5b9e\\u65f6\\u8bfb editor-fullgen.js \\u7684 33 \\u4e2a\\u751f\\u6210\\u6b65\\uff0c\\u96f6\\u590d\\u5236\\u96f6\\u6f02\\u79fb\\uff09\\u3002\n" +
  "  function _genReferenceTool(part) {\n" +
  "    if (typeof fetch !== 'function') return Promise.resolve({ ok: false, reason: '\\u4ec5\\u6d4f\\u89c8\\u5668\\u5185\\u53ef\\u7528' });\n" +
  "    function deU(x) { return String(x == null ? '' : x).replace(/\\\\u([0-9a-fA-F]{4})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); }); }\n" +
  "    return fetch('/editor-fullgen.js').then(function (r) { return r.ok ? r.text() : ''; }).then(function (text) {\n" +
  "      if (!text) return { ok: false, reason: '\\u8bfb\\u4e0d\\u5230 editor-fullgen.js' };\n" +
  "      var re = /\\{\\s*key\\s*:\\s*['\"]([^'\"]+)['\"]\\s*,\\s*label\\s*:\\s*['\"]([^'\"]+)['\"]/g, m, steps = [];\n" +
  "      while ((m = re.exec(text))) steps.push({ key: m[1], label: deU(m[2]), idx: m.index });\n" +
  "      if (!steps.length) return { ok: false, reason: 'editor-fullgen.js \\u7ed3\\u6784\\u5df2\\u53d8\\uff0c\\u672a\\u627e\\u5230\\u751f\\u6210\\u6b65' };\n" +
  "      if (!part) return { ok: true, note: '\\u8001\\u7f16\\u8f91\\u5668\\u5168\\u91cf\\u751f\\u6210\\u7684\\u5404\\u90e8\\u5206\\u8303\\u5f0f\\uff08\\u4f20 part=key \\u6216\\u4e2d\\u6587\\u6807\\u7b7e\\u53d6\\u8be5\\u90e8\\u5206\\u63d0\\u793a\\u8bcd\\u53c2\\u8003\\uff09', parts: steps.map(function (x) { return x.key + '\\uff08' + x.label + '\\uff09'; }) };\n" +
  "      var lp = String(part).toLowerCase();\n" +
  "      var hit = steps.filter(function (x) { return x.key.toLowerCase() === lp || x.label === part; })[0]\n" +
  "        || steps.filter(function (x) { return x.key.toLowerCase().indexOf(lp) >= 0 || x.label.indexOf(part) >= 0; })[0]\n" +
  "        || steps.filter(function (x) { return lp.indexOf(x.key.toLowerCase()) >= 0; })[0];\n" +
  "      if (!hit) return { ok: true, found: false, note: '\\u6ca1\\u627e\\u5230\\u300c' + part + '\\u300d\\uff0c\\u53ef\\u9009\\u90e8\\u5206\\u89c1 parts', parts: steps.map(function (x) { return x.key + '(' + x.label + ')'; }) };\n" +
  "      var nextIdx = steps.filter(function (x) { return x.idx > hit.idx; }).map(function (x) { return x.idx; }).sort(function (a, b) { return a - b; })[0];\n" +
  "      var end = nextIdx || Math.min(text.length, hit.idx + 3500);\n" +
  "      var block = text.slice(hit.idx, Math.min(end, hit.idx + 3500));\n" +
  "      return { ok: true, found: true, part: hit.key, label: hit.label, file: 'editor-fullgen.js', guide: '\\u8001\\u7f16\\u8f91\\u5668\\u751f\\u6210\\u300c' + hit.label + '\\u300d\\u7684\\u63d0\\u793a\\u8bcd+\\u6821\\u9a8c\\u53c2\\u8003\\u2014\\u2014\\u501f\\u9274\\u5176\\u8bbe\\u5b9a\\u6df1\\u5ea6/\\u5b57\\u6bb5\\u5f62\\u72b6/\\u671d\\u4ee3\\u903b\\u8f91/\\u53c2\\u6570\\u533a\\u95f4\\uff1b\\u4f60\\u662f\\u5de5\\u5177\\u6d41\\uff0c\\u522b\\u7167\\u6284\"\\u53ea\\u8f93\\u51faJSON\"\\u3002', reference: deU(block) };\n" +
  "    }).catch(function (e) { return { ok: false, reason: '\\u8bfb\\u53d6\\u51fa\\u9519\\uff1a' + ((e && e.message) || e) }; });\n" +
  "  }\n\n" +
  "  function dispatchTool(draft, name, input, surfaces) {";
once("  function dispatchTool(draft, name, input, surfaces) {", HELP, 'helper');

// 2) dispatchTool case（readSource case 后）
once("      case 'readSource': return _readSourceTool(input.path, input.offset, input.limit);",
  "      case 'readSource': return _readSourceTool(input.path, input.offset, input.limit);\n" +
  "      case 'genReference': return _genReferenceTool(input.part);", 'case');

// 3) AGENT_TOOLS（readSource 工具前插 genReference）
once("    {\n      name: 'readSource',",
  "    {\n" +
  "      name: 'genReference',\n" +
  "      description: '\\u67e5\\u8001\\u5267\\u672c\\u7f16\\u8f91\\u5668\\u5bf9\\u67d0\\u90e8\\u5206\\u7684 AI \\u751f\\u6210\\u8303\\u5f0f\\uff08\\u53c2\\u8003\"\\u8be5\\u90e8\\u5206\\u597d\\u5185\\u5bb9\\u5e94\\u6709\\u4ec0\\u4e48\"\\uff1a\\u8981\\u6c42/\\u5b57\\u6bb5\\u5f62\\u72b6/\\u671d\\u4ee3\\u7279\\u5b9a\\u903b\\u8f91/\\u53c2\\u6570\\u533a\\u95f4\\uff09\\u3002part \\u4f20 key(characters/factions/military/economyConfig/worldSettings/officeTree/vassalSystem...) \\u6216\\u4e2d\\u6587\\u6807\\u7b7e(\\u4eba\\u7269/\\u52bf\\u529b/\\u519b\\u4e8b/\\u7ecf\\u6d4e...)\\uff1b\\u4e0d\\u4f20\\u8fd4\\u56de\\u6240\\u6709\\u53ef\\u53c2\\u8003\\u90e8\\u5206\\u5217\\u8868\\u3002\\u751f\\u6210\\u6216\\u5927\\u6539\\u67d0\\u90e8\\u5206\\u524d\\u5148 genReference \\u770b\\u4e00\\u773c\\u8001\\u8303\\u5f0f\\uff0c\\u501f\\u9274\\u5176\\u8bbe\\u5b9a\\u6df1\\u5ea6\\uff08\\u4f60\\u662f\\u5de5\\u5177\\u6d41\\uff0c\\u522b\\u7167\\u6284\"\\u53ea\\u8f93\\u51faJSON\"\\u683c\\u5f0f\\uff09\\u3002',\n" +
  "      parameters: { type: 'object', properties: { part: { type: 'string', description: '\\u90e8\\u5206 key \\u6216\\u4e2d\\u6587\\u6807\\u7b7e\\uff08\\u53ef\\u9009\\uff0c\\u4e0d\\u586b\\u8fd4\\u56de\\u90e8\\u5206\\u5217\\u8868\\uff09' } } }\n" +
  "    },\n" +
  "    {\n      name: 'readSource',", 'tool');

// 4) readNames 加 genReference
exactly("var readNames = { getField: 1, fieldContract: 1, readSource: 1, listSource: 1, grepSource: 1,",
  "var readNames = { getField: 1, fieldContract: 1, genReference: 1, readSource: 1, listSource: 1, grepSource: 1,", 'readNames', 4);

// 5) 系统提示强化
const SP = "想看游戏 UI/逻辑的源码实现，用 listSource 找文件、readSource 读、grepSource 全局搜——可直接读整个代码库。";
once(SP, SP + "生成或大改某部分(人物/势力/经济/官制/封臣…)前，先 genReference 看老编辑器对该部分的生成范式(设定深度/字段形状/朝代逻辑/参数区间)，借鉴后再动手。", 'sysprompt');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
