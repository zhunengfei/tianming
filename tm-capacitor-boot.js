// ============================================================
//  tm-capacitor-boot.js — Capacitor 端启动钩子（移植 Phase 3 · 热更 + 在线）
//
//  ① Capgo 热更：app 成功加载后调 CapacitorUpdater.notifyAppReady()，
//     告诉 Capgo「这个版本是健康的」。若不调，Capgo 会在 appReadyTimeout 后
//     判定本次（下载的）更新失败并回滚到上一个可用版本——这是防止坏更新把 app
//     变砖的安全机制。所以必须在游戏界面起来后调一次。
//  ② 仅 capacitor 原生端执行；桌面/web 整模块 no-op。
//
//  注：Capgo 自动更新（autoUpdate）在后台静默检查/下载，下次启动生效；
//      这里只负责「确认当前版本健康」。
// ============================================================

(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  var Cap = window.Capacitor;
  if (!Cap || typeof Cap.isNativePlatform !== 'function' || !Cap.isNativePlatform()) return; // 仅原生端

  function updater() {
    return (Cap.Plugins && Cap.Plugins.CapacitorUpdater) || null;
  }

  function notifyReady() {
    var U = updater();
    if (U && typeof U.notifyAppReady === 'function') {
      try {
        U.notifyAppReady();
        try { console.log('[tm-capacitor-boot] CapacitorUpdater.notifyAppReady() 已调用'); } catch (_) {}
      } catch (e) {
        try { console.warn('[tm-capacitor-boot] notifyAppReady 失败', e); } catch (_) {}
      }
    }
  }

  // ── 手动静态热更检查（移植 Phase 3·A 方案）──
  // SSH 从开发会话被封·服务器走静态文件托管（GitHub 中转拉到服务器）：
  //   GET 静态 latest.json {version,url} → 比版本 → download(zip) → set（下次启动生效）。
  //   用 GET 静态文件（不用 Capgo autoUpdate 的 POST 端点·避免改服务器 nginx）。
  var LATEST_URL = 'https://api.themisfitserspeople.top/tianming/capgo/latest.json';
  function checkUpdate() {
    var U = updater();
    if (!U || typeof U.download !== 'function') return;
    var f = (typeof fetch === 'function') ? fetch : null;
    if (!f) return;
    f(LATEST_URL, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (latest) {
      if (!latest || !latest.version || !latest.url) return;
      return Promise.resolve(U.current ? U.current() : null).then(function (cur) {
        var curVer = (cur && cur.bundle && cur.bundle.version) || '';
        if (latest.version === curVer) return;  // 已最新
        try { console.log('[tm-capacitor-boot] 发现热更 ' + latest.version + (latest.manifest ? '·差量' : '·全包') + '·下载中…'); } catch (_) {}
        // 有 manifest → 差量（Capgo 只下 hash 没见过的文件·assets 不变不重下）；否则全包 zip
        var opt = { version: latest.version, url: latest.url || '' };
        if (latest.manifest && latest.manifest.length) opt.manifest = latest.manifest;
        return Promise.resolve(U.download(opt)).then(function (b) {
          if (b && b.id && U.set) return U.set({ id: b.id });  // 切为下次启动生效版
        });
      });
    }).catch(function () {});
  }

  // 等主界面起来再确认健康（给游戏 boot 一点时间，避免起得太早 Capgo 误判），随后查热更
  function arm() {
    setTimeout(notifyReady, 1800);
    setTimeout(checkUpdate, 5000);  // boot 稳定后再查·不拖慢启动
  }
  if (document.readyState === 'complete') arm();
  else window.addEventListener('load', arm);

  // 暴露给 TM.platform：手动「检查热更新」入口（capacitor 端），供 UI 后续接
  try {
    window.TM = window.TM || {};
    window.TM.capacitorUpdate = {
      // 手动检查并下载最新版（成功后下次启动生效）
      check: function () {
        var U = updater();
        if (U && typeof U.getLatest === 'function') return U.getLatest();
        return Promise.resolve({ available: false, reason: 'updater 不可用' });
      },
      current: function () {
        var U = updater();
        if (U && typeof U.current === 'function') return U.current();
        return Promise.resolve(null);
      },
      reload: function () {
        var U = updater();
        if (U && typeof U.reload === 'function') return U.reload();
        return Promise.resolve();
      }
    };
  } catch (_) {}
})();
