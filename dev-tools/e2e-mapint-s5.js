// 地图接入 · 刀5 行为验证：国师地图 op（mapOverview 读 / mapAssignOwner 写）。纯 node 单测（工具只动 draft）。
const path = require('path');
let agent;
try { agent = require(path.join(__dirname, '..', 'editor-authoring-agent.js')); }
catch (e) { console.error('require failed:', e && e.message); process.exit(2); }

const out = [];
const ok = (n, c, i) => out.push({ name: n, pass: !!c, info: i || '' });

function freshDraft() {
  return {
    factions: [{ id: 'fac-ming', name: '明朝廷' }, { id: 'fac-jin', name: '后金' }],
    map: {
      width: 1200, height: 720,
      factions: { 'fac-ming': { name: '明朝廷', color: '#c9a84c' }, 'fac-jin': { name: '后金', color: '#6a4c93' } },
      regions: [
        { id: 'ming-03', name: '浙江', adminBinding: '浙江布政使司', ownerKey: 'fac-ming', currentOwnerKey: 'fac-ming' },
        { id: 'liao-01', name: '辽东', adminBinding: '辽东都司', ownerKey: 'fac-ming' }
      ]
    },
    mapData: { regions: [{ id: 'ming-03' }] }
  };
}

ok('M0 dispatchTool 已导出', typeof agent.dispatchTool === 'function');
if (typeof agent.dispatchTool !== 'function') { report(); }

var d = freshDraft();
var ov = agent.dispatchTool(d, 'mapOverview', {});
ok('M1 mapOverview 返回地块', ov.ok && ov.count === 2 && ov.regions.length === 2, 'count=' + ov.count);
ok('M2 mapOverview 返回势力列表', Array.isArray(ov.factions) && ov.factions.length >= 2, 'factions=' + JSON.stringify(ov.factions));
ok('M3 mapOverview 含名称/归属', ov.regions[0].name === '浙江' && ov.regions[0].owner === 'fac-ming', JSON.stringify(ov.regions[0]));

// 按势力名改归属 + 区块精确名
var r1 = agent.dispatchTool(d, 'mapAssignOwner', { region: '浙江', owner: '后金' });
ok('M4 按势力名(后金)改归属', r1.ok && d.map.regions[0].ownerKey === 'fac-jin', 'ownerKey=' + d.map.regions[0].ownerKey + ' r=' + JSON.stringify(r1));
ok('M5 归属四字段同步', d.map.regions[0].currentOwnerKey === 'fac-jin' && d.map.regions[0].controllerKey === 'fac-jin' && d.map.regions[0].stableFactionId === 'fac-jin' && d.map.regions[0].factionName === '后金', 'cur=' + d.map.regions[0].currentOwnerKey + ' name=' + d.map.regions[0].factionName);
ok('M6 mapData 镜像同步', !!(d.mapData && d.mapData.regions && d.mapData.regions[0] && d.mapData.regions[0].ownerKey === 'fac-jin'), 'mirror=' + JSON.stringify(d.mapData.regions[0]));

// 模糊地块(adminBinding 子串) + 势力按键
var d2 = freshDraft();
var r2 = agent.dispatchTool(d2, 'mapAssignOwner', { region: '浙江布政', owner: 'fac-jin' });
ok('M7 模糊匹配地块(adminBinding子串)+势力按键', r2.ok && d2.map.regions[0].ownerKey === 'fac-jin', 'r=' + JSON.stringify(r2));

// 地块找不到
var d3 = freshDraft();
var r3 = agent.dispatchTool(d3, 'mapAssignOwner', { region: '不存在的地', owner: '后金' });
ok('M8 地块找不到→ok:false 不乱改', r3.ok === false && d3.map.regions[0].ownerKey === 'fac-ming', 'r=' + JSON.stringify(r3));

// 同时改 adminBinding
var d4 = freshDraft();
var r4 = agent.dispatchTool(d4, 'mapAssignOwner', { region: '辽东', owner: '后金', adminBinding: '辽东镇' });
ok('M9 可同时改 adminBinding', r4.ok && d4.map.regions[1].adminBinding === '辽东镇' && d4.map.regions[1].ownerKey === 'fac-jin', 'bind=' + d4.map.regions[1].adminBinding);

// 工具已进 AGENT_TOOLS
var hasOv = agent.AGENT_TOOLS.some(function(t) { return t.name === 'mapOverview'; });
var hasAs = agent.AGENT_TOOLS.some(function(t) { return t.name === 'mapAssignOwner'; });
ok('M10 工具进 AGENT_TOOLS', hasOv && hasAs, 'overview=' + hasOv + ' assign=' + hasAs);

// 空地图优雅处理
var r5 = agent.dispatchTool({ map: { regions: [] } }, 'mapOverview', {});
ok('M11 空地图 mapOverview 不崩', r5.ok && r5.regions.length === 0, JSON.stringify(r5).slice(0, 80));

report();
function report() {
  let pass = 0, fail = 0;
  out.forEach(r => { if (r.pass) pass++; else fail++; console.log((r.pass ? 'PASS ' : 'RED  ') + r.name + (r.info ? '  [' + r.info + ']' : '')); });
  console.log('=== ' + pass + ' PASS / ' + fail + ' RED ===');
  process.exit(fail ? 1 : 0);
}
