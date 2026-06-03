// Tianming online client — platform-agnostic fetch client for the tianming-api
// (accounts + workshop catalog). Works identically in the browser (web build)
// and the Electron renderer; the desktop main process keeps its own IPC path
// for disk-level work (pack install, auto-update). This module covers only the
// pure network calls, so a web player can register / login / browse the catalog
// with no Electron dependency.
//
// Mirrors the request semantics of main-impl.js postOnlineApi / getOnlineApi:
//   - apiUrl is the tianming-api base, normalised to a trailing slash
//   - paths are joined via new URL(path, base)
//   - a stored Bearer token is attached automatically
//   - the API returns JSON (incl. { success:false, error } on 4xx) which we
//     surface verbatim to callers, matching the desktop IPC handlers.
//
// Session is persisted as JSON under localStorage key `tm_online_session`
// (the Electron side persists to userData/.../account-session.json instead).
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api; // node: require for tests
  }
  if (root) {
    root.TM = root.TM || {};
    // default singleton + factory for callers that want an isolated instance
    root.TM.createOnlineClient = api.createOnlineClient;
    root.TM.OnlineClient = api.createOnlineClient();
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  var DEFAULT_API_URL = 'https://api.themisfitserspeople.top/tianming-api/';
  var SESSION_KEY = 'tm_online_session';
  var API_URL_KEY = 'tm_online_api_url';

  // ---- storage adapter: localStorage in browser, in-memory elsewhere -------
  function makeStorage(injected) {
    if (injected) return injected;
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        // probe — some environments throw on access (private mode, sandbox)
        localStorage.getItem(SESSION_KEY);
        return localStorage;
      }
    } catch (e) {}
    var mem = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); },
      removeItem: function (k) { delete mem[k]; }
    };
  }

  function normalizeApiUrl(raw) {
    var url = String(raw || '').trim();
    if (!url) return '';
    return url.charAt(url.length - 1) === '/' ? url : url + '/';
  }

  function joinUrl(base, pathname) {
    var p = String(pathname || '').replace(/^\/+/, '');
    return new URL(p, base).toString();
  }

  function createOnlineClient(opts) {
    opts = opts || {};
    var storage = makeStorage(opts.storage);
    var doFetch = opts.fetch || (typeof fetch !== 'undefined' ? fetch.bind(typeof window !== 'undefined' ? window : null) : null);
    var defaultApiUrl = normalizeApiUrl(opts.apiUrl || DEFAULT_API_URL);

    function readSession() {
      try {
        var raw = storage.getItem(SESSION_KEY);
        if (!raw) return { token: '', apiUrl: getApiUrl(), user: null };
        var s = JSON.parse(raw) || {};
        return {
          token: String(s.token || ''),
          apiUrl: normalizeApiUrl(s.apiUrl || getApiUrl()),
          user: s.user && typeof s.user === 'object' ? s.user : null,
          loggedInAt: s.loggedInAt || ''
        };
      } catch (e) {
        return { token: '', apiUrl: getApiUrl(), user: null };
      }
    }

    function writeSession(session) {
      var payload = {
        token: String((session && session.token) || ''),
        apiUrl: normalizeApiUrl((session && session.apiUrl) || getApiUrl()),
        user: (session && session.user) || null,
        loggedInAt: (session && session.loggedInAt) || new Date().toISOString()
      };
      try { storage.setItem(SESSION_KEY, JSON.stringify(payload)); } catch (e) {}
      return payload;
    }

    function clearSession() {
      try { storage.removeItem(SESSION_KEY); } catch (e) {}
    }

    function getApiUrl() {
      try {
        var saved = storage.getItem(API_URL_KEY);
        if (saved) return normalizeApiUrl(saved);
      } catch (e) {}
      return defaultApiUrl;
    }

    function setApiUrl(url) {
      var norm = normalizeApiUrl(url) || defaultApiUrl;
      try { storage.setItem(API_URL_KEY, norm); } catch (e) {}
      return norm;
    }

    function getToken() { return readSession().token; }
    function getSession() { return readSession(); }
    function isLoggedIn() { return !!readSession().token; }

    // ---- core request ------------------------------------------------------
    // Returns parsed JSON (incl. { success:false, error } on handled 4xx).
    // Throws only on network failure or an unparseable error response.
    function request(method, pathname, reqOpts) {
      reqOpts = reqOpts || {};
      if (!doFetch) return Promise.reject(new Error('当前环境不支持 fetch'));
      var apiUrl = normalizeApiUrl(reqOpts.apiUrl || readSession().apiUrl || getApiUrl());
      if (!apiUrl) return Promise.reject(new Error('缺少在线服务地址'));
      var url = joinUrl(apiUrl, pathname);
      var token = reqOpts.token != null ? String(reqOpts.token) : getToken();
      var headers = { 'Accept': 'application/json' };
      if (reqOpts.body != null) headers['Content-Type'] = 'application/json';
      if (token) headers['Authorization'] = 'Bearer ' + token;
      var init = { method: method, headers: headers, mode: 'cors', cache: 'no-store' };
      if (reqOpts.body != null) init.body = JSON.stringify(reqOpts.body);
      return doFetch(url, init).then(function (resp) {
        return resp.text().then(function (text) {
          var data = null;
          if (text) { try { data = JSON.parse(text); } catch (e) { data = null; } }
          if (data == null) {
            if (!resp.ok) throw new Error('在线服务返回 ' + resp.status);
            return {};
          }
          return data;
        });
      });
    }

    // ---- account -----------------------------------------------------------
    function health(apiUrl) {
      return request('GET', 'health', { apiUrl: apiUrl, token: '' });
    }

    function register(info, apiUrl) {
      info = info || {};
      var payload = {
        username: String(info.username || '').trim(),
        password: String(info.password || ''),
        nickname: String(info.nickname || '').trim(),
        email: String(info.email || '').trim()
      };
      return request('POST', 'account/register', { body: payload, token: '', apiUrl: apiUrl }).then(function (res) {
        if (res && res.success && res.token) writeSession({ token: res.token, apiUrl: normalizeApiUrl(apiUrl || getApiUrl()), user: res.user || null });
        return Object.assign({ success: false }, res || {});
      });
    }

    // 邮箱验证码登录（免密）：请求登录码 -> 用码登录（新邮箱自动注册）。
    function emailCodeRequest(email, apiUrl) {
      return request('POST', 'account/email-code', { body: { email: String(email || '').trim() }, token: '', apiUrl: apiUrl })
        .then(function (res) { return Object.assign({ success: false }, res || {}); });
    }
    function emailLogin(email, code, apiUrl) {
      return request('POST', 'account/email-login', { body: { email: String(email || '').trim(), code: String(code || '').trim() }, token: '', apiUrl: apiUrl })
        .then(function (res) {
          if (res && res.success && res.token) writeSession({ token: res.token, apiUrl: normalizeApiUrl(apiUrl || getApiUrl()), user: res.user || null });
          return Object.assign({ success: false }, res || {});
        });
    }

    // 账号找回（QQ 邮箱）：请求验证码 -> 用验证码重置密码。
    function requestReset(email, apiUrl) {
      return request('POST', 'account/request-reset', { body: { email: String(email || '').trim() }, token: '', apiUrl: apiUrl })
        .then(function (res) { return Object.assign({ success: false }, res || {}); });
    }
    function resetPassword(email, code, password, apiUrl) {
      return request('POST', 'account/reset', { body: { email: String(email || '').trim(), code: String(code || '').trim(), password: String(password || '') }, token: '', apiUrl: apiUrl })
        .then(function (res) { return Object.assign({ success: false }, res || {}); });
    }
    function setEmail(email, apiUrl) {
      var session = readSession();
      return request('POST', 'account/set-email', { body: { email: String(email || '').trim() }, apiUrl: apiUrl || session.apiUrl, token: session.token })
        .then(function (res) {
          if (res && res.success && res.user) writeSession({ token: session.token, apiUrl: normalizeApiUrl(apiUrl || session.apiUrl), user: res.user });
          return Object.assign({ success: false }, res || {});
        });
    }

    // 给工坊包评分（1-5 星，登录态，每用户每包一票，重复评分覆盖）
    function ratePack(id, score, apiUrl) {
      var session = readSession();
      return request('POST', 'workshop/rate', { body: { id: String(id || ''), score: Number(score) || 0 }, apiUrl: apiUrl || session.apiUrl, token: session.token })
        .then(function (res) { return Object.assign({ success: false }, res || {}); });
    }

    // 单个工坊包最新元数据（用于已装包的更新检查）。
    function packMeta(id, apiUrl) {
      return request('GET', 'workshop/pack?id=' + encodeURIComponent(String(id || '')), { token: '', apiUrl: apiUrl })
        .then(function (res) { return Object.assign({ success: false }, res || {}); });
    }
    // 某作者的全部已上架作品（作者主页）。
    function authorPacks(opts, apiUrl) {
      opts = opts || {};
      var qs = opts.authorId != null && opts.authorId !== '' ? ('authorId=' + encodeURIComponent(opts.authorId)) : ('name=' + encodeURIComponent(opts.name || ''));
      return request('GET', 'workshop/author?' + qs, { token: '', apiUrl: apiUrl })
        .then(function (res) { return Object.assign({ success: false, packs: [] }, res || {}); });
    }

    function login(info, apiUrl) {
      info = info || {};
      var payload = { username: String(info.username || '').trim(), password: String(info.password || '') };
      return request('POST', 'account/login', { body: payload, token: '', apiUrl: apiUrl }).then(function (res) {
        if (res && res.success && res.token) writeSession({ token: res.token, apiUrl: normalizeApiUrl(apiUrl || getApiUrl()), user: res.user || null });
        return Object.assign({ success: false }, res || {});
      });
    }

    function me(apiUrl) {
      var session = readSession();
      if (!session.token) return Promise.resolve({ success: true, loggedIn: false, user: null, session: session });
      return request('GET', 'account/me', { apiUrl: apiUrl || session.apiUrl, token: session.token }).then(function (res) {
        if (res && res.success && res.user) writeSession({ token: session.token, apiUrl: normalizeApiUrl(apiUrl || session.apiUrl), user: res.user });
        return Object.assign({ loggedIn: !!(res && res.user) }, res || {}, { session: readSession() });
      });
    }

    function logout(apiUrl) {
      var session = readSession();
      var done = function () { clearSession(); return { success: true }; };
      if (!session.token) return Promise.resolve(done());
      return request('POST', 'account/logout', { body: {}, apiUrl: apiUrl || session.apiUrl, token: session.token })
        .then(done, function (e) { clearSession(); return { success: true, warning: e && e.message }; });
    }

    // ---- workshop catalog (read) ------------------------------------------
    function catalog(catalogUrl) {
      var apiUrl = readSession().apiUrl || getApiUrl();
      var url = String(catalogUrl || '').trim();
      if (url) {
        // full catalog URL given — fetch directly
        if (!doFetch) return Promise.reject(new Error('当前环境不支持 fetch'));
        return doFetch(url, { method: 'GET', mode: 'cors', cache: 'no-store', headers: { 'Accept': 'application/json' } })
          .then(function (resp) { return resp.text(); })
          .then(function (text) { return text ? JSON.parse(text) : { packs: [] }; })
          .then(normalizeCatalog);
      }
      return request('GET', 'workshop/catalog', { apiUrl: apiUrl, token: '' }).then(normalizeCatalog);
    }

    function normalizeCatalog(cat) {
      cat = cat || {};
      var packs = Array.isArray(cat.packs) ? cat.packs : [];
      return {
        type: String(cat.type || 'tianming-workshop-catalog'),
        title: String(cat.title || '天命创意工坊'),
        updatedAt: cat.updatedAt || '',
        packs: packs
      };
    }

    // UTF-8 安全 base64（btoa 仅支持 Latin1，中文剧本必须先编 UTF-8 字节）
    function utf8ToBase64(str) {
      str = String(str);
      try {
        if (typeof TextEncoder !== 'undefined' && typeof btoa !== 'undefined') {
          var bytes = new TextEncoder().encode(str), bin = '', CH = 0x8000;
          for (var i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
          return btoa(bin);
        }
      } catch (e) {}
      if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64'); // node
      return btoa(unescape(encodeURIComponent(str)));
    }

    // 上传一个纯文本剧本到工坊（落服务器自持存储 -> pending 待审）。
    function uploadScenario(meta, content, apiUrl) {
      meta = meta || {};
      var json = (typeof content === 'string') ? content : JSON.stringify(content);
      var tags = Array.isArray(meta.tags) ? meta.tags : String(meta.tags || '').split(/[，,;；\s]+/).filter(Boolean);
      var payload = {
        title: String(meta.title || '').trim(),
        id: String(meta.id || '').trim(),
        version: String(meta.version || '1.0.0').trim(),
        description: String(meta.description || '').trim(),
        type: String(meta.type || 'scenario').trim(),
        tags: tags.slice(0, 20),
        filename: String(meta.filename || 'scenario.json'),
        contentBase64: utf8ToBase64(json)
      };
      var session = readSession();
      return request('POST', 'workshop/upload', { body: payload, apiUrl: apiUrl || session.apiUrl, token: session.token })
        .then(function (res) { return Object.assign({ success: false }, res || {}); });
    }

    return {
      DEFAULT_API_URL: DEFAULT_API_URL,
      getApiUrl: getApiUrl,
      setApiUrl: setApiUrl,
      getSession: getSession,
      getToken: getToken,
      isLoggedIn: isLoggedIn,
      clearSession: clearSession,
      request: request,
      health: health,
      register: register,
      login: login,
      me: me,
      logout: logout,
      emailCodeRequest: emailCodeRequest,
      emailLogin: emailLogin,
      requestReset: requestReset,
      resetPassword: resetPassword,
      setEmail: setEmail,
      ratePack: ratePack,
      packMeta: packMeta,
      authorPacks: authorPacks,
      catalog: catalog,
      uploadScenario: uploadScenario
    };
  }

  return { createOnlineClient: createOnlineClient, DEFAULT_API_URL: DEFAULT_API_URL };
});
