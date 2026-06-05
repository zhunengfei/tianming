// 地图接入 · 刀5：国师地图 op —— 自然语言改地图归属。
// mapOverview(读·看地块/归属/势力) + mapAssignOwner(写·把某地划给某势力，解析名→键，同步 map/mapData)。全在 draft 上操作，与其他工具一致。
const fs = require('fs');
const file = 'editor-authoring-agent.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + t + ' matched x' + n + ' (need 1)');
  s = s.replace(a, b);
  edits.push(t);
}
function exactly(a, b, t, k) {
  const n = s.split(a).length - 1;
  if (n !== k) throw new Error('ANCHOR ' + t + ' matched x' + n + ' (need ' + k + ')');
  s = s.split(a).join(b);
  edits.push(t + 'x' + k);
}

// ── E1：两个工具定义（插在 AGENT_TOOLS 数组开头） ──
once(
`  var AGENT_TOOLS = [
`,
`  var AGENT_TOOLS = [
    {
      name: 'mapOverview',
      description: '查看当前剧本地图：返回各地块的 名称/当前归属势力/行政绑定 + 可用势力列表。改地图归属、回答"某地归谁"前先用它看清有哪些地块、现在归谁、有哪些势力。',
      parameters: { type: 'object', properties: { limit: { type: 'number', description: '最多返回多少地块（默认80）' } } }
    },
    {
      name: 'mapAssignOwner',
      description: '把某地块划归某势力（改地图归属，预览会按新势力上色）。region 传地块名/id（如"青州"/"ming-03"，模糊匹配名称与行政绑定）；owner 传势力名或键（如"朝廷"/"明朝廷"/"fac-ming"，自动解析为 ownerKey）；可选 adminBinding 改行政绑定。会同步 map/mapData。先用 mapOverview 确认地块与势力名。',
      parameters: { type: 'object', properties: {
        region: { type: 'string', description: '地块名或 id（模糊匹配 name/adminBinding）' },
        owner: { type: 'string', description: '势力名或键（自动解析为 ownerKey）' },
        adminBinding: { type: 'string', description: '可选·行政绑定名' }
      }, required: ['region', 'owner'] }
    },
`,
'tool-defs');

// ── E2：辅助函数（插在 dispatchTool 前） ──
once(
`  function dispatchTool(draft, name, input, surfaces) {`,
`  // 地图 op 辅助（刀5）：解析势力名→键、模糊定位地块、镜像同步
  function _mapResolveFaction(draft, q) {
    var key = String(q == null ? '' : q).trim();
    if (!key) return { key: '', label: '' };
    var map = (draft && draft.map) || {};
    var facs = map.factions;
    if (facs && typeof facs === 'object' && !Array.isArray(facs)) {
      if (facs[key]) return { key: key, label: (facs[key] && facs[key].name) || key };
      for (var k in facs) { if (facs[k] && facs[k].name === key) return { key: k, label: key }; }
    }
    var arr = Array.isArray(draft && draft.factions) ? draft.factions : [];
    for (var i = 0; i < arr.length; i++) {
      var f = arr[i]; if (!f) continue;
      if (f.id === key || f.key === key || f.sid === key || f.stableId === key || f.name === key) {
        return { key: f.stableId || f.key || f.id || f.sid || f.name, label: f.name || key };
      }
    }
    return { key: key, label: key };
  }
  function _mapFindRegionIndex(regions, q) {
    q = String(q == null ? '' : q).trim();
    if (!q) return -1;
    var i, r;
    for (i = 0; i < regions.length; i++) { r = regions[i]; if (r && (r.id === q || r.name === q || r.adminBinding === q || r.mapRegionId === q)) return i; }
    for (i = 0; i < regions.length; i++) {
      r = regions[i]; if (!r) continue;
      var nm = String(r.name || ''), ab = String(r.adminBinding || '');
      if (nm && (nm.indexOf(q) >= 0 || q.indexOf(nm) >= 0)) return i;
      if (ab && (ab.indexOf(q) >= 0 || q.indexOf(ab) >= 0)) return i;
    }
    return -1;
  }
  function _mapSyncMirror(draft) {
    try { if (draft && draft.map && typeof draft.map === 'object' && draft.mapData && typeof draft.mapData === 'object') draft.mapData = JSON.parse(JSON.stringify(draft.map)); } catch (e) {}
  }

  function dispatchTool(draft, name, input, surfaces) {`,
'helpers');

// ── E3：分发分支（接在 genReference case 后） ──
once(
`      case 'genReference': return _genReferenceTool(input.part);
`,
`      case 'genReference': return _genReferenceTool(input.part);
      case 'mapOverview': {
        var _m = (draft && draft.map) || (draft && draft.mapData) || {};
        var _rg = Array.isArray(_m.regions) ? _m.regions : [];
        if (!_rg.length) return { ok: true, regions: [], note: '当前剧本没有 map.regions（可先去地图编辑器或新建地图）' };
        var _facList = [];
        if (_m.factions && typeof _m.factions === 'object' && !Array.isArray(_m.factions)) {
          _facList = Object.keys(_m.factions).map(function(k) { return k + (_m.factions[k] && _m.factions[k].name ? '(' + _m.factions[k].name + ')' : ''); });
        } else if (Array.isArray(draft.factions)) {
          _facList = draft.factions.slice(0, 40).map(function(f) { return (f.stableId || f.key || f.id || f.name) + (f.name ? '(' + f.name + ')' : ''); });
        }
        var _lim = Math.min(120, Number(input.limit) || 80);
        var _rows = _rg.slice(0, _lim).map(function(r, i) {
          return { i: i, id: r.id || '', name: r.name || '', owner: r.ownerKey || r.currentOwnerKey || r.controllerKey || '', adminBinding: r.adminBinding || '' };
        });
        return { ok: true, count: _rg.length, shown: _rows.length, factions: _facList.slice(0, 40), regions: _rows };
      }
      case 'mapAssignOwner': {
        var _mp = draft && draft.map;
        if (!_mp || !Array.isArray(_mp.regions) || !_mp.regions.length) return { ok: false, reason: '当前剧本没有 map.regions，无法改归属' };
        var _idx = _mapFindRegionIndex(_mp.regions, input.region);
        if (_idx < 0) return { ok: false, reason: '没找到地块「' + (input.region || '') + '」（用 mapOverview 看可用地块名）' };
        var _fac = _mapResolveFaction(draft, input.owner);
        var _region = _mp.regions[_idx];
        var _before = _region.ownerKey || _region.currentOwnerKey || '';
        _region.ownerKey = _fac.key;
        _region.currentOwnerKey = _fac.key;
        _region.controllerKey = _fac.key;
        _region.stableFactionId = _fac.key;
        if (_fac.label) { _region.factionName = _fac.label; _region.ownerName = _fac.label; }
        if (input.adminBinding != null && String(input.adminBinding).trim()) _region.adminBinding = String(input.adminBinding).trim();
        _mapSyncMirror(draft);
        return { ok: true, region: _region.name || _region.id || ('#' + _idx), from: _before, to: _fac.key + (_fac.label && _fac.label !== _fac.key ? '(' + _fac.label + ')' : ''), note: '已改归属（地图预览会按新势力上色）' };
      }
`,
'dispatch');

// ── E4：系统提示词加一句地图 op 引导 ──
once(
`借鉴后再动手。`,
`借鉴后再动手。改地图归属（把某地块划给某势力、调整疆域归属）时，先 mapOverview 看清现有地块/归属/势力，再 mapAssignOwner 按地块名+势力名改（自动上色、同步 map/mapData）。`,
'prompt-hint');

// ── E5：让只读工具集（plan/qa/review/explain）也能读地图 ──
exactly(
`describeSchema: 1`,
`describeSchema: 1, mapOverview: 1`,
'readNames', 4);

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
console.log('delta:', s.length - orig.length, 'chars');
