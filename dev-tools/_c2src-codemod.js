// C2-src codemod — readSource/listSource/grepSource 工具（国师读全部源码）。
const fs = require('fs');
const path = 'editor-authoring-agent.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }
function exactly(a, b, t, k) { const n = s.split(a).length - 1; if (n !== k) throw new Error('ANCHOR ' + t + ' x' + n + ' need ' + k); s = s.split(a).join(b); edits.push(t + '×' + k); }

// 1) helpers：dispatchTool 前插
const HELP =
  "  // C2 \\u00b7 \\u6e90\\u7801\\u8bfb\\u53d6\\uff08\\u6d4f\\u89c8\\u5668 fetch\\uff1bnode/\\u65e0 fetch \\u4f18\\u96c5\\u964d\\u7ea7\\uff09\\u3002\\u8ba9\\u56fd\\u5e08\\u80fd\\u8bfb\\u6574\\u4e2a\\u4ee3\\u7801\\u5e93\\u3002\n" +
  "  function _safeSrcPath(p) { return String(p || '').replace(/^[/\\\\]+/, '').replace(/\\.\\.[/\\\\]?/g, ''); }\n" +
  "  function _readSourceTool(p, offset, limit) {\n" +
  "    if (typeof fetch !== 'function') return Promise.resolve({ ok: false, reason: '\\u5f53\\u524d\\u73af\\u5883\\u4e0d\\u652f\\u6301\\u8bfb\\u6e90\\u7801\\uff08\\u4ec5\\u7f16\\u8f91\\u5668\\u6d4f\\u89c8\\u5668\\u5185\\u53ef\\u7528\\uff09' });\n" +
  "    var safe = _safeSrcPath(p);\n" +
  "    if (!safe) return Promise.resolve({ ok: false, reason: '\\u9700\\u8981 path' });\n" +
  "    return fetch('/' + safe).then(function (r) {\n" +
  "      if (!r.ok) return { ok: false, reason: '\\u8bfb\\u53d6\\u5931\\u8d25 HTTP ' + r.status + '\\uff1a' + safe };\n" +
  "      return r.text().then(function (txt) {\n" +
  "        var lines = txt.split('\\n');\n" +
  "        var off = Math.max(0, Number(offset) || 0);\n" +
  "        var lim = Math.min(400, Math.max(1, Number(limit) || 250));\n" +
  "        var slice = lines.slice(off, off + lim);\n" +
  "        return { ok: true, path: safe, totalLines: lines.length, from: off + 1, to: Math.min(lines.length, off + lim), content: slice.map(function (l, i) { return (off + i + 1) + '\\t' + l; }).join('\\n'), truncated: lines.length > off + lim };\n" +
  "      });\n" +
  "    }).catch(function (e) { return { ok: false, reason: '\\u8bfb\\u53d6\\u51fa\\u9519\\uff1a' + ((e && e.message) || e) }; });\n" +
  "  }\n" +
  "  function _listSourceTool(filter) {\n" +
  "    if (typeof fetch !== 'function') return Promise.resolve({ ok: false, reason: '\\u4ec5\\u6d4f\\u89c8\\u5668\\u5185\\u53ef\\u7528' });\n" +
  "    return fetch('/source-manifest.json').then(function (r) {\n" +
  "      if (!r.ok) return { ok: false, reason: '\\u65e0\\u6e90\\u7801\\u6e05\\u5355\\uff08source-manifest.json \\u7f3a\\u5931\\uff09' };\n" +
  "      return r.json().then(function (m) {\n" +
  "        var files = (m && m.files) || [];\n" +
  "        if (filter) { var lf = String(filter).toLowerCase(); files = files.filter(function (f) { return f.toLowerCase().indexOf(lf) >= 0; }); }\n" +
  "        return { ok: true, total: ((m && m.files) || []).length, matched: files.length, files: files.slice(0, 300) };\n" +
  "      });\n" +
  "    }).catch(function (e) { return { ok: false, reason: '\\u6e05\\u5355\\u8bfb\\u53d6\\u51fa\\u9519\\uff1a' + ((e && e.message) || e) }; });\n" +
  "  }\n" +
  "  function _grepSourceTool(query, opts) {\n" +
  "    opts = opts || {};\n" +
  "    if (typeof fetch !== 'function') return Promise.resolve({ ok: false, reason: '\\u4ec5\\u6d4f\\u89c8\\u5668\\u5185\\u53ef\\u7528' });\n" +
  "    if (!query) return Promise.resolve({ ok: false, reason: '\\u9700\\u8981 query' });\n" +
  "    var maxFiles = Math.min(80, Math.max(1, Number(opts.maxFiles) || 40));\n" +
  "    var glob = opts.glob ? String(opts.glob).toLowerCase() : '';\n" +
  "    var q = String(query);\n" +
  "    return fetch('/source-manifest.json').then(function (r) { return r.ok ? r.json() : { files: [] }; }).then(function (m) {\n" +
  "      var files = ((m && m.files) || []);\n" +
  "      if (glob) files = files.filter(function (f) { return f.toLowerCase().indexOf(glob) >= 0; });\n" +
  "      var scan = files.slice(0, maxFiles), hits = [];\n" +
  "      return scan.reduce(function (chain, f) {\n" +
  "        return chain.then(function () {\n" +
  "          if (hits.length >= 50) return;\n" +
  "          return fetch('/' + f).then(function (rr) { return rr.ok ? rr.text() : ''; }).then(function (txt) {\n" +
  "            var ls = txt.split('\\n');\n" +
  "            for (var i = 0; i < ls.length && hits.length < 50; i++) { if (ls[i].indexOf(q) >= 0) hits.push({ file: f, line: i + 1, text: ls[i].trim().slice(0, 180) }); }\n" +
  "          }).catch(function () {});\n" +
  "        });\n" +
  "      }, Promise.resolve()).then(function () { return { ok: true, query: q, scannedFiles: scan.length, matchedTotal: files.length, hits: hits }; });\n" +
  "    }).catch(function (e) { return { ok: false, reason: 'grep \\u51fa\\u9519\\uff1a' + ((e && e.message) || e) }; });\n" +
  "  }\n\n" +
  "  function dispatchTool(draft, name, input, surfaces) {";
once("  function dispatchTool(draft, name, input, surfaces) {", HELP, 'helpers');

// 2) dispatchTool cases（fieldContract case 后、listCollection 前）
once("      case 'listCollection': {",
  "      case 'readSource': return _readSourceTool(input.path, input.offset, input.limit);\n" +
  "      case 'listSource': return _listSourceTool(input.filter);\n" +
  "      case 'grepSource': return _grepSourceTool(input.query, { maxFiles: input.maxFiles, glob: input.glob });\n" +
  "      case 'listCollection': {", 'cases');

// 3) AGENT_TOOLS（listCollection 工具前插 3 个）
once("    {\n      name: 'listCollection',",
  "    {\n" +
  "      name: 'readSource',\n" +
  "      description: '\\u8bfb\\u53d6\\u6b63\\u5f0f\\u6e38\\u620f/\\u7f16\\u8f91\\u5668\\u7684\\u6e90\\u7801\\u6587\\u4ef6\\uff08\\u6309 path\\uff0c\\u8fd4\\u56de\\u5e26\\u884c\\u53f7\\u7247\\u6bb5\\uff09\\u3002\\u60f3\\u786e\\u8ba4\\u6e38\\u620f UI/\\u903b\\u8f91\\u600e\\u4e48\\u7528\\u67d0\\u5b57\\u6bb5\\u3001\\u67d0\\u673a\\u5236\\u600e\\u4e48\\u5b9e\\u73b0\\u65f6\\u76f4\\u63a5\\u8bfb\\u6e90\\u7801\\u3002path \\u5982 \"tm-endturn.js\" / \"phase8-formal-modules.js\"\\u3002\\u6587\\u4ef6\\u5927\\u65f6\\u7528 offset/limit \\u7ffb\\u9875\\u3002',\n" +
  "      parameters: { type: 'object', properties: { path: { type: 'string', description: '\\u6587\\u4ef6\\u76f8\\u5bf9\\u8def\\u5f84' }, offset: { type: 'number', description: '\\u8d77\\u59cb\\u884c(\\u4ece0,\\u9ed8\\u8ba40)' }, limit: { type: 'number', description: '\\u8bfb\\u591a\\u5c11\\u884c(\\u9ed8\\u8ba4250,\\u4e0a\\u9650400)' } }, required: ['path'] }\n" +
  "    },\n" +
  "    {\n" +
  "      name: 'listSource',\n" +
  "      description: '\\u5217\\u51fa\\u4ee3\\u7801\\u5e93\\u91cc\\u7684\\u6e90\\u7801\\u6587\\u4ef6\\u6e05\\u5355\\uff08\\u53ef\\u7528 filter \\u5b50\\u4e32\\u8fc7\\u6ee4\\uff0c\\u5982 \"tm-\" / \"phase8\" / \".html\"\\uff09\\u3002\\u4e0d\\u77e5\\u9053\\u67d0\\u529f\\u80fd\\u5728\\u54ea\\u4e2a\\u6587\\u4ef6\\u65f6\\u5148 listSource \\u627e\\uff0c\\u518d readSource \\u8bfb\\u3002',\n" +
  "      parameters: { type: 'object', properties: { filter: { type: 'string', description: '\\u6587\\u4ef6\\u540d\\u5b50\\u4e32\\u8fc7\\u6ee4(\\u53ef\\u9009)' } } }\n" +
  "    },\n" +
  "    {\n" +
  "      name: 'grepSource',\n" +
  "      description: '\\u5728\\u6e90\\u7801\\u91cc\\u5168\\u5c40\\u641c\\u5b57\\u7b26\\u4e32\\uff08\\u8de8\\u6587\\u4ef6 grep\\uff09\\uff0c\\u8fd4\\u56de\\u547d\\u4e2d\\u7684 \\u6587\\u4ef6+\\u884c\\u53f7+\\u8be5\\u884c\\u5185\\u5bb9\\u3002\\u627e\"\\u67d0\\u5b57\\u6bb5\\u5728\\u54ea\\u88ab\\u8bfb\\u3001\\u67d0\\u51fd\\u6570\\u5728\\u54ea\\u5b9a\\u4e49\"\\u65f6\\u7528\\u3002\\u53ef\\u7528 glob \\u9650\\u5b9a\\u6587\\u4ef6\\u5b50\\u4e32\\u3001maxFiles \\u9650\\u626b\\u63cf\\u6570\\u3002',\n" +
  "      parameters: { type: 'object', properties: { query: { type: 'string', description: '\\u8981\\u641c\\u7684\\u5b57\\u7b26\\u4e32' }, glob: { type: 'string', description: '\\u53ea\\u641c\\u6587\\u4ef6\\u540d\\u542b\\u6b64\\u5b50\\u4e32\\u7684\\u6587\\u4ef6(\\u53ef\\u9009)' }, maxFiles: { type: 'number', description: '\\u6700\\u591a\\u626b\\u51e0\\u4e2a\\u6587\\u4ef6(\\u9ed8\\u8ba440,\\u4e0a\\u965080)' } }, required: ['query'] }\n" +
  "    },\n" +
  "    {\n      name: 'listCollection',", 'tools');

// 4) readNames 加 3 个只读源工具
exactly("var readNames = { getField: 1, fieldContract: 1,", "var readNames = { getField: 1, fieldContract: 1, readSource: 1, listSource: 1, grepSource: 1,", 'readNames', 4);

// 5) 系统提示提一句可读源码
const SP = "想确认正式游戏怎么读某字段、读不读它，用 fieldContract 查契约（按需查，别凭印象）。";
once(SP, SP + "想看游戏 UI/逻辑的源码实现，用 listSource 找文件、readSource 读、grepSource 全局搜——可直接读整个代码库。", 'sysprompt');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
