// C1 codemod — fieldContract 工具（agent 懂游戏怎么读每个字段）。
const fs = require('fs');
const path = 'editor-authoring-agent.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }
function exactly(a, b, t, k) { const n = s.split(a).length - 1; if (n !== k) throw new Error('ANCHOR ' + t + ' x' + n + ' (need ' + k + ')'); s = s.split(a).join(b); edits.push(t + '×' + k); }

// 1) AGENT_TOOLS：listCollection 前插 fieldContract
const TOOL_ANCHOR = "    {\n      name: 'listCollection',";
const TOOL_NEW =
  "    {\n" +
  "      name: 'fieldContract',\n" +
  "      description: '\\u67e5\\u201c\\u6b63\\u5f0f\\u6e38\\u620f\\u8fd0\\u884c\\u65f6\\u600e\\u4e48\\u8bfb\\u67d0\\u5b57\\u6bb5\\u201d\\u7684\\u5951\\u7ea6\\uff1a\\u4f20 field \\u8fd4\\u56de\\u8be5\\u5b57\\u6bb5\\u4e2d\\u6587\\u540d/\\u662f\\u5426\\u5fc5\\u9700/\\u6240\\u5c5e\\u6a21\\u5757/\\u6e38\\u620f\\u600e\\u4e48\\u7528\\u5b83(detail)/\\u54ea\\u4e9b\\u5b98\\u65b9\\u5267\\u672c\\u7528\\uff1b\\u4e0d\\u4f20 field \\u8fd4\\u56de\\u5168\\u90e8\\u6e38\\u620f\\u4f1a\\u8bfb\\u5b57\\u6bb5\\u7684\\u7d22\\u5f15\\u3002\\u5199\\u6216\\u6539\\u5185\\u5bb9\\u524d\\u60f3\\u786e\\u8ba4\\u201c\\u6e38\\u620f\\u771f\\u8bfb\\u4e0d\\u8bfb\\u8fd9\\u4e2a\\u5b57\\u6bb5\\u3001\\u600e\\u4e48\\u8bfb\\u201d\\u65f6\\u7528\\u5b83\\uff0c\\u907f\\u514d\\u5199\\u6e38\\u620f\\u8bfb\\u4e0d\\u5230\\u7684\\u5b57\\u6bb5\\u3002',\n" +
  "      parameters: { type: 'object', properties: { field: { type: 'string', description: '\\u5b57\\u6bb5\\u540d\\uff08\\u53ef\\u9009\\uff0c\\u4e0d\\u586b\\u8fd4\\u56de\\u5168\\u5b57\\u6bb5\\u7d22\\u5f15\\uff09' } } }\n" +
  "    },\n" +
  "    {\n      name: 'listCollection',";
once(TOOL_ANCHOR, TOOL_NEW, 'tool');

// 2) dispatchTool：listCollection case 前插 fieldContract case
const CASE_ANCHOR = "      case 'listCollection': {";
const CASE_NEW =
  "      case 'fieldContract': {\n" +
  "        var sv = surfaces || _getFieldSurfaces();\n" +
  "        if (!sv.length) return { ok: false, reason: '\\u5f53\\u524d\\u73af\\u5883\\u65e0\\u6e38\\u620f\\u5b57\\u6bb5\\u5951\\u7ea6\\uff08RUNTIME_FIELD_SURFACES \\u672a\\u66b4\\u9732\\uff09' };\n" +
  "        if (input.field) {\n" +
  "          var hit = sv.filter(function (s) { return s && s.field === input.field; });\n" +
  "          if (!hit.length) return { ok: true, field: input.field, inContract: false, note: '\\u5b57\\u6bb5\\u300c' + input.field + '\\u300d\\u4e0d\\u5728\\u6e38\\u620f\\u5b57\\u6bb5\\u5951\\u7ea6\\u4e2d\\u2014\\u2014\\u53ef\\u80fd\\u662f\\u81ea\\u5b9a\\u4e49/\\u6269\\u5c55\\u5b57\\u6bb5\\uff0c\\u6b63\\u5f0f\\u6e38\\u620f\\u4e0d\\u76f4\\u63a5\\u8bfb\\u53d6\\u3002' };\n" +
  "          return { ok: true, field: input.field, inContract: true, contracts: hit.map(function (s) { return { name: s.title, required: !!s.required, module: s.moduleId, gameUse: s.detail || '', usedByScenarios: s.sources || [] }; }) };\n" +
  "        }\n" +
  "        return { ok: true, count: sv.length, fields: sv.map(function (s) { return s.field + (s.title ? '(' + s.title + ')' : '') + (s.required ? '\\u00b7\\u5fc5\\u9700' : ''); }) };\n" +
  "      }\n" +
  "      case 'listCollection': {";
once(CASE_ANCHOR, CASE_NEW, 'case');

// 3) readNames 四处加 fieldContract（只读工具）
exactly("var readNames = { getField: 1,", "var readNames = { getField: 1, fieldContract: 1,", 'readNames', 4);

// 4) 系统提示 ③ 末尾加 fieldContract 提示
const SP_ANCHOR = "不确定东西在哪个集合时用 globalSearch 全局检索定位。";
const SP_NEW = SP_ANCHOR + "想确认正式游戏怎么读某字段、读不读它，用 fieldContract 查契约（按需查，别凭印象）。";
once(SP_ANCHOR, SP_NEW, 'sysprompt');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
