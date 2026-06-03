// 移植 Phase 0 验证 · TM.platform 抽象层（S0.2 起）
// 跑法：node web/dev-tools/verify-tm-platform.js
// 验：electron 后端等价转发到 window.tianming·web 后端 caps 全关 + stub unavailable。
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'tm-platform.js'), 'utf8');
const load = (win) => { new Function('window', 'console', src)(win, { log() {} }); return win.TM.platform; };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  FAIL:', m); } };

// 1) electron：kind/caps + 转发真打到 window.tianming（零回归核心）
let captured = null;
const winE = { tianming: { isDesktop: true,
  saveProject: (n, d) => { captured = ['saveProject', n, d]; return Promise.resolve({ success: true }); } } };
const pE = load(winE);
ok(pE.kind === 'electron', 'electron kind');
ok(pE.isNative === true, 'electron isNative');
ok(pE.caps.online === true && pE.caps.fs === true && pE.caps.installerUpdate === true && pE.caps.ipc === true, 'electron caps');
pE.saves.save('mysave', { a: 1 });
ok(captured && captured[0] === 'saveProject' && captured[1] === 'mysave' && captured[2].a === 1, 'electron forwards saveProject w/ args');
ok(pE.asset.url('tm-content://x/y.png') === 'tm-content://x/y.png', 'electron asset.url passthrough');

// 2) web：kind/caps 全关
const pW = load({ tianming: undefined });
ok(pW.kind === 'web', 'web kind');
ok(pW.isNative === false, 'web isNative false');
ok(pW.caps.online === false && pW.caps.fs === false, 'web caps all off');

// 4) 闸等价性（S1.x 纠正后）：content-manager 的 desktop() / save-lifecycle 的 _tmHasNativeFs()
//    现都读 caps.ipc。锁死它在 electron/web 上 ≡ 旧 desktop()(= window.tianming.isDesktop) = 零回归。
const oldDesktop = (win) => !!(win.tianming && win.tianming.isDesktop);
ok(pE.caps.ipc === oldDesktop(winE), 'gate equivalence: caps.ipc≡oldDesktop (electron)');
ok(pW.caps.ipc === oldDesktop({ tianming: undefined }), 'gate equivalence: caps.ipc≡oldDesktop (web)');

// 5) capacitor：kind/caps 路由正确性（修复核心）——isNative=true 但 caps.ipc=false ⇒ 走 web 路（非 window.tianming）
const winC = { Capacitor: { isNativePlatform: () => true, convertFileSrc: (p) => 'capacitor-asset://' + p } };
const pC = load(winC);
ok(pC.kind === 'capacitor', 'capacitor kind');
ok(pC.isNative === true, 'capacitor isNative true');
ok(pC.caps.ipc === false, 'capacitor caps.ipc FALSE (走 web/OnlineClient 路·不撞 window.tianming)');
ok(pC.caps.nativeHttp === true && pC.caps.online === true, 'capacitor online caps on (OnlineClient+CapacitorHttp)');
ok(pC.caps.fs === true && pC.caps.installerUpdate === false, 'capacitor caps.fs(意图位)=true·installerUpdate=false');
ok(pC.asset.url('/data/p.png') === 'capacitor-asset:///data/p.png', 'capacitor asset.url→convertFileSrc');
ok(pC.asset.url('tm-content://x/y.png') === 'tm-content://x/y.png', 'capacitor asset.url 放过 tm-content://');

// 3) web stub 返回 unavailable 形状
(async () => {
  const r = await pW.saves.save('a', {});
  ok(r && r.success === false && r.unavailable === true, 'web stub returns {success:false,unavailable:true}');
  const r2 = await pW.account.login('', '', '');
  ok(r2 && r2.unavailable === true, 'web account.login unavailable');
  console.log(`[verify-tm-platform] ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
