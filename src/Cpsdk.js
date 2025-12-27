/**
 * cpsdk SDK（单例）
 * 暴露为 window.Cpsdk，无需 new；提供 create() 创建额外实例
 */
(function (global) {
    const SDK_NAME = 'Cpsdk';
    const _loaded = new Set();
    const _loading = new Map();
    const ENABLE_THIRD_PARTY = true;
    const ENABLE_GAME_CONFIG = true;
    const ENABLE_SDK_LOG = true;
    const DEFAULT_PROD_CFG_BASE = '';
    const DEFAULT_BETA_CFG_BASE = 'http://localhost:13200/api/v1/game/1019/';

    // 解析 query 字符串为键值对（键统一为小写，值为原始字符串）
    function parseQuery(qs) {
        const res = {};
        (qs || '').replace(/^\?/, '').split('&').forEach(p => {
            if (!p) return;
            const [k, v] = p.split('=');
            const key = decodeURIComponent(k || '').toLowerCase();
            const val = decodeURIComponent(v || '');
            if (!key) return;
            if (res[key] === undefined) res[key] = val;
            else if (Array.isArray(res[key])) res[key].push(val);
            else res[key] = [res[key], val];
        });
        return res;
    }

    // 获取当前脚本(src)上的查询参数
    function getCurrentScriptQuery() {
        try {
            let s = document.currentScript || null;
            if (!s) {
                const list = Array.from(document.getElementsByTagName('script'));
                s = list.slice().reverse().find(n => n.src && /Cpsdk/i.test(n.src)) || null;
            }
            if (!s || !s.src) return {};
            const qs = s.src.split('?')[1] || '';
            return parseQuery('?' + qs) || {};
        } catch (_) {
            return {};
        }
    }

    // 将游戏配置“整体”同步到 window.wop，便于第三方脚本复用）
    function buildWopFromConfig(cfg, ctx, existing) {
        const out = Object(existing || {});
        try {
            let raw = (cfg && (cfg.raw || cfg.game)) || null;
            const sdk = cfg && (cfg.sdk || cfg.sdkConfig);
            const ads = cfg && cfg.ads;
            const analytics = cfg && cfg.analytics;

            // 若不存在 raw/game 分支，但当前 cfg 本身看起来就是“游戏对象”，则直接视为 raw
            if (!raw && cfg && typeof cfg === 'object') {
                const looksLikeGame =
                    ('gameId' in cfg) ||
                    ('title' in cfg) ||
                    ('isAd' in cfg) ||
                    ('isDot' in cfg);
                if (looksLikeGame) {
                    raw = cfg;
                }
            }

            // 1) 将原始游戏对象的“顶层字段”并入 wop（浅拷贝，避免循环）
            if (raw && typeof raw === 'object') {
                Object.keys(raw).forEach(k => {
                    const v = raw[k];
                    if (k === 'info' || k === 'sdkConfig') return;
                    out[k] = v;
                });
                // 保留完整引用
                out.game = raw;
                if (!sdk && raw.sdkConfig) out.sdk = raw.sdkConfig;
                try {
                    const title = (raw && raw.title) || (raw && raw.info && raw.info.title) || '';
                    if (title) out.gameTitle = title;
                } catch (_) {}
            }

            // 2) 直接挂载完整配置分支（若存在）
            if (sdk) out.sdk = sdk;
            if (ads) out.adsConfig = ads;
            if (analytics) out.analyticsConfig = analytics;

            // 3) 基本上下文
            if (ctx && ctx.gameId) out.gameId = String(ctx.gameId);
            if (ctx && ctx.platformId) out.platformId = String(ctx.platformId);

            // 4) 标记来源与时间戳（便于调试）
            out._from = SDK_NAME;
            out._ts = Date.now();
        } catch (e) {
            try { console.warn('[' + SDK_NAME + '] buildWopFromConfig failed:', e && e.message); } catch (_) {}
        }
        return out;
    }

    class Core {
        constructor() {
            this.isInitialized = false;
            this.readyCallbacks = [];
            this.eventCallbacks = {};
            this.config = {

            };
            this.isMath = true; // 是否对动态脚本追加时间戳，避免缓存
            this._thirdPartyLoaded = false;
            // 预留游戏配置对象（当启用“游戏配置加载”功能时可使用）
            this.gameConfig = null;

            this.ctx = {
                gameId: null,
                platformId: null
            };

            if (ENABLE_GAME_CONFIG) {
                try {
                    this._initAuto();
                } catch (e) {
                    // 初始化失败仅记日志
                    try { console.warn('[Cpsdk] _initAuto failed:', e && e.message); } catch (_) {}
                }
            }
        }

        init(options = {}) {
            this.config = { ...this.config, ...options };
            if (this.isInitialized) return Promise.resolve();
            return new Promise(resolve => {
                setTimeout(async () => {
                    this.isInitialized = true;
                    // 自动加载第三方脚本（如启用）
                    try {
                        if (ENABLE_THIRD_PARTY && typeof this._loadThirdPartyFromConfig === 'function') {
                            await this._loadThirdPartyFromConfig();
                        }
                    } catch (e) {
                        console.warn('自动加载第三方脚本失败:', e && e.message ? e.message : e);
                    }
                    this.dispatchEvent('ready', { timestamp: Date.now() });
                    const cbs = this.readyCallbacks.splice(0);
                    cbs.forEach(cb => { try { cb(); } catch(e) { console.error(e); } });
                    resolve();
                }, 0);
            });
        }

        ready(cb) { if (typeof cb === 'function') this.readyCallbacks.push(cb); if (this.isInitialized) { const cbs = this.readyCallbacks.splice(0); cbs.forEach(fn=>{try{fn()}catch(e){console.error(e)}}) } }
        isReady() { return this.isInitialized; }
        addEventListener(type, cb) { (this.eventCallbacks[type] ||= []).push(cb); }
        removeEventListener(type, cb) { const arr = this.eventCallbacks[type] || []; const i = arr.indexOf(cb); if (i>=0) arr.splice(i,1); }
        dispatchEvent(type, data) { (this.eventCallbacks[type] || []).forEach(fn => { try { fn(data) } catch(e){ console.error(e) } }); }
        getConfig() { return { ...this.config }; }
        setConfig(cfg) { this.config = { ...this.config, ...cfg }; }

        __sdklog(...args) {
            if (!ENABLE_SDK_LOG || typeof console === 'undefined' || !console.log) return;
            const formatParam = (arg) => {
                if (typeof arg === 'string') return arg;
                if (typeof arg === 'object') {
                    try { return JSON.stringify(arg); } catch (_) { return String(arg); }
                }
                return String(arg);
            };
            try {
                const params = (args || []).map(formatParam).join(' ');
                const defaultStyle =
                    'background-color: #f9f9f9; ' +
                    'border: 2px solid #2980b9; ' +
                    'color: #333; ' +
                    'padding: 4px 10px; ' +
                    'border-radius: 4px; ' +
                    'font-weight: 500; ' +
                    'box-shadow: 0 0 5px rgba(41, 128, 185, 0.3);';
                const style =
                    (this && this.config && this.config.sdkLogStyle) ||
                    (global && global.__SDK_LOG_STYLE__) ||
                    defaultStyle;
                console.log('%c[' + SDK_NAME + '] ' + params, style);
            } catch (e) {
                try {
                    console.log('[' + SDK_NAME + ']', ...args);
                } catch (_) {}
            }
        }

        loadsdk(url) {
            const u = String(url||'').trim();
            if (!u) return Promise.reject(new Error('无效的脚本地址'));
            if (_loaded.has(u)) return _loading.get(u) || Promise.resolve(true);
            const p = new Promise((resolve, reject) => {
                try {
                    const s = document.createElement('script');
                    s.async = true; s.src = u;
                    s.onload = () => { _loaded.add(u); resolve(true); };
                    s.onerror = () => reject(new Error('脚本加载失败: ' + u));
                    (document.head || document.documentElement || document.body).appendChild(s);
                } catch(e) { reject(e); }
            });
            _loading.set(u, p);
            return p.finally(() => _loading.delete(u));
        }

        /**
         * 从配置自动加载第三方脚本
         * - 仅使用 this.config.thirdPartyScripts（数组）
         */
        async _loadThirdPartyFromConfig() {
            if (!ENABLE_THIRD_PARTY || this._thirdPartyLoaded) return;
            try {
                let list = [];
                if (this.config && Array.isArray(this.config.thirdPartyScripts)) {
                    list = this.config.thirdPartyScripts;
                }
                if (!list || !list.length) return;

                this._thirdPartyLoaded = true;

                const uniq = new Set();
                const queue = [];
                for (const item of list) {
                    if (typeof item === 'string') {
                        const u = item.trim();
                        if (u && !uniq.has(u)) { uniq.add(u); queue.push(u); }
                    } else if (item && typeof item === 'object' && item.url) {
                        const u = String(item.url).trim();
                        if (u && !uniq.has(u)) { uniq.add(u); queue.push({ url: u, type: item.type || '' }); }
                    }
                }
                if (!queue.length) return;

                if (typeof this.loadScript === 'function') {
                    await new Promise(resolve => this.loadScript(queue, () => resolve()));
                } else {
                    for (const it of queue) {
                        const u = typeof it === 'string' ? it : it.url;
                        try { await this.loadsdk(u); } catch (e) { console.warn(`[${SDK_NAME}] 第三方脚本加载失败:`, u, e.message); }
         }
        }
      } catch (e) {
        console.warn(`[${SDK_NAME}] 自动加载第三方脚本异常:`, e && e.message ? e.message : e);
      }
    }

    /**
     * 自动探测 gameId，并在启用“游戏配置加载”时尝试拉取配置
     */
    _initAuto() {
            let gid = null;

            // 1) 优先：从 <meta name="cpsdk-gameid" content="..."> 中读取
            try {
                const meta = document.querySelector('meta[name="cpsdk-gameid"]');
                const metaVal = meta && meta.content;
                if (metaVal != null && String(metaVal).trim() !== '') {
                    gid = Array.isArray(metaVal) ? metaVal[0] : metaVal;
                }
            } catch (_) {}

            // 2) 回退：从当前脚本 src 的查询参数中寻找第一个包含 gameid 的 key
            if (!gid) {
                const q = getCurrentScriptQuery();
                try {
                    const keys = Object.keys(q || {});
                    for (const k of keys) {
                        if (k && k.indexOf('gameid') !== -1) {
                            const v = q[k];
                            gid = Array.isArray(v) ? v[0] : v;
                            break;
                        }
                    }
                } catch (_) {}
            }

            if (gid) {
                this.ctx.gameId = String(gid);
                // 异步拉取游戏配置，避免阻塞脚本执行
                Promise.resolve().then(() => {
                    this.loadGameConfig({ gameId: this.ctx.gameId }).catch(err => {
                        try { console.warn('[Cpsdk] 读取游戏配置失败:', err && err.message); } catch (_) {}
                    });
                });
            }
        }

        /**
         * 按实例写入的游戏配置基址加载配置，并回填到 gameConfig 与 config.thirdPartyScripts
         */
        async loadGameConfig(options = {}) {
            if (!ENABLE_GAME_CONFIG) {
                console.warn(`[${SDK_NAME}] 当前模板未启用“游戏配置加载”功能`);
                return null;
            }
            try {
                const gid = String(options.gameId || this.ctx.gameId || '').trim();
                if (!gid) {
                    console.warn(`[${SDK_NAME}] 缺少 gameId，无法加载游戏配置`);
                    return null;
                }

                // 依据页面环境判断 beta / production（与预览系统保持一致：vb=beta 视为测试环境）
                let isBeta = false;
                try {
                    const search = (global.location && global.location.search) || '';
                    const params = parseQuery(search || '');
                    const vb = String(params.vb || '').toLowerCase();
                    isBeta = vb === 'beta';
                } catch (_) {}

                const prodBase = global.CpsdkProdCfgBase || DEFAULT_PROD_CFG_BASE || '';
                const betaBase = global.CpsdkBetaCfgBase || DEFAULT_BETA_CFG_BASE || '';
                const base = isBeta ? betaBase : prodBase;
                if (!base) {
                    console.warn(`[${SDK_NAME}] 未配置游戏配置基址，无法加载配置`);
                    return null;
                }

                // 构造实际请求URL：
                // 1) 若包含 {gameId} 占位符，替换并在无 .json 后缀时自动补 .json
                // 2) 若以 .json 结尾则直接使用
                // 3) 若匹配 /api/v1/game/:platformId[/] 形式，则按新接口规则：
                //    /api/v1/game/:platformId?cpsdk-gameid={gameId}
                // 4) 否则视为目录，拼接 {gameId}.json
                let url = String(base || '').trim();
                const hasJson = /\.json(?:$|[#?])/i.test(url);
                const gameApiMatch = url.match(/\/api\/v1\/game\/[^/?#]+\/?$/i);
                if (/\{gameid\}/i.test(url)) {
                    url = url.replace(/\{gameid\}/ig, encodeURIComponent(gid));
                    if (!/\.json(?:$|[#?])/i.test(url)) {
                        const parts = url.split('#');
                        const beforeHash = parts[0];
                        const hash = parts[1] ? '#' + parts[1] : '';
                        url = beforeHash + (beforeHash.includes('.json') ? '' : '.json') + hash;
                    }
                } else if (!hasJson && gameApiMatch) {
                    // 新形式：/api/v1/game/:platformId?cpsdk-gameid={gameId}
                    const hashIndex = url.indexOf('#');
                    const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
                    let baseNoHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
                    baseNoHash = baseNoHash.replace(/\/$/, '');
                    const sep = baseNoHash.includes('?') ? '&' : '?';
                    url = `${baseNoHash}${sep}cpsdk-gameid=${encodeURIComponent(gid)}${hash}`;
                } else if (!hasJson) {
                    // 目录模式：确保以 / 结尾，再追加 {gameId}.json
                    url = url.replace(/\/?$/, '/');
                    url += encodeURIComponent(gid) + '.json';
                }

                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status} for ${url}`);
                }
                const raw = await res.json();
                const cfg = (raw && (raw.data || raw)) || raw;
                if (!cfg || typeof cfg !== 'object') {
                    throw new Error('游戏配置格式无效');
                }

                this.gameConfig = cfg;

                // 将完整配置映射到 window[configObjectName]（默认 wop），供第三方脚本与游戏直接读取
                // 重要：先填充 wop，再加载 thirdPartyScripts，避免三方脚本（如 wsdk）执行时读到空 wop。
                try {
                    const nameRaw = this.config && this.config.configObjectName;
                    const objName = (typeof nameRaw === 'string' && nameRaw.trim()) ? nameRaw.trim() : 'wop';
                    const existingGlobal = global && global[objName];
                    const next = buildWopFromConfig(cfg, { gameId: gid, platformId: this.ctx && this.ctx.platformId }, existingGlobal);
                    if (global) {
                        // 不替换对象引用：原地合并，避免下游脚本提前缓存了 window.wop 引用后失效
                        const ensureObject = (k) => {
                            const cur = global[k];
                            if (cur && typeof cur === 'object') return cur;
                            global[k] = {};
                            return global[k];
                        };

                        const target = ensureObject(objName);
                        Object.assign(target, next);

                        // 始终同步一份到 window.wop（原地合并），兼容依赖固定 wop 名称的脚本（如 wsdk）
                        const wopTarget = ensureObject('wop');
                        if (wopTarget !== target) Object.assign(wopTarget, next);

                        // 打印赋值后的 window.wop（便于排查时序/覆盖问题）
                        try {
                            this.__sdklog('window.wop assigned', global.wop);
                            console.log('[Cpsdk] window.wop assigned:', global.wop);
                        } catch (_) {}
                    }
                    // 在 SDK config 中挂一份引用，便于调试或直接访问
                    this.config = this.config || {};
                    this.config.wop = global && global[objName] ? global[objName] : next;
                } catch (_) {}

                // 从游戏配置中抽取 sdkConfig.thirdPartyScripts（在 wop 填充完成后再加载）
                let sdkBranch = null;
                try {
                    if (cfg.sdk) sdkBranch = cfg.sdk;
                    else if (cfg.sdkConfig) sdkBranch = cfg.sdkConfig;
                    else if (cfg.game && cfg.game.sdkConfig) sdkBranch = cfg.game.sdkConfig;
                } catch (_) {}

                if (sdkBranch && Array.isArray(sdkBranch.thirdPartyScripts)) {
                    this.config = this.config || {};
                    this.config.thirdPartyScripts = sdkBranch.thirdPartyScripts.slice();
                    // 成功回填后，尝试按通用逻辑加载第三方脚本
                    try {
                        await this._loadThirdPartyFromConfig();
                    } catch (e) {
                        console.warn(`[${SDK_NAME}] 按游戏配置加载第三方脚本失败:`, e && e.message);
                    }
                }

                try {
                    this.dispatchEvent('gameconfig', { gameId: gid, config: cfg });
                } catch (_) {}

                return cfg;
            } catch (e) {
                console.warn(`[${SDK_NAME}] loadGameConfig 失败:`, e && e.message ? e.message : e);
                return null;
            }
        }

        /**
         * 默认加载器：加载单个脚本（支持 import-map、module、crossorigin、超时与重试）
         * @param {string} src 脚本地址
         * @param {Function} callback 回调(Boolean 成功/失败)
         * @param {boolean} ds 是否附带时间戳参数避免缓存
         * @param {number} retryLimit 失败重试次数
         * @param {string} customType 自定义 script.type（如 'module' 或 'systemjs-importmap'）
         */
        loadSingleScript(src, callback, ds = true, retryLimit = 2, customType = '') {
            let attempts = 0;
            const w_random = (Date.now() & 0x7fffffff);
            const finalSrc = this.isMath ? (src + (src.includes('?') ? '&' : '?') ) : src; //+ 'v=' + (ds && w_random)

            const tryLoad = () => {
                // 1) import-map.json
                if (src.endsWith('.json')) {
                    const s = document.createElement('script');
                    s.async = false;
                    s.type = customType || 'systemjs-importmap';
                    s.src = finalSrc;
                    document.body.appendChild(s);
                    setTimeout(() => callback && callback(true), 0);
                    return;
                }

                // 2) 普通脚本
                const s = document.createElement('script');
                s.async = false;
                if (customType) {
                    s.type = customType;
                } else if (window.stats && window.stats.isModule) {
                    s.type = 'module';
                }
                if (window.stats && window.stats.crossorigin) s.crossOrigin = 'anonymous';
                s.src = finalSrc;

                const timeout = setTimeout(() => {
                    console.warn('脚本加载超时：' + src);
                    cleanup();
                    retryOrFail();
                }, 8000);

                function cleanup() {
                    clearTimeout(timeout);
                    s.removeEventListener('load', onLoad);
                    s.removeEventListener('error', onError);
                    if (!(window.stats && window.stats.insertToHead) && s.parentNode) {
                        s.parentNode.removeChild(s);
                    }
                }
                function onLoad() { cleanup(); callback && callback(true); }
                function onError() { console.error('脚本加载失败：' + src); cleanup(); retryOrFail(); }
                function retryOrFail() {
                    attempts++;
                    if (attempts <= retryLimit) {
                        console.warn('重试加载脚本（' + attempts + '/' + retryLimit + '）：' + src);
                        tryLoad();
                    } else {
                        callback && callback(false);
                    }
                }

                s.addEventListener('load', onLoad);
                s.addEventListener('error', onError);
                try {
                    (window.stats && window.stats.insertToHead ? document.head : document.body).appendChild(s);
                } catch (e) {
                    document.body.appendChild(s);
                }
            };

            tryLoad();
        }

        /**
         * 顺序加载脚本列表
         * @param {Array<string|{url:string,type?:string}>} list 脚本列表
         * @param {Function} callback 全部完成回调
         */
        loadScript(list, callback) {
            const arr = Array.isArray(list) ? list.slice() : [];
            if (!arr.length) { callback && callback(); return; }
            let loaded = 0;
            const loadNext = () => {
                const item = arr[loaded];
                const src = (typeof item === 'string') ? item : (item && item.url) || '';
                const t = (item && item.type) || '';
                this.loadSingleScript(src, () => {
                    loaded++;
                    if (loaded >= arr.length) callback && callback();
                    else loadNext();
                }, true, 2, t);
            };
            loadNext();
        }

    destroy() { this.isInitialized = false; this.readyCallbacks = []; this.eventCallbacks = {}; this.config = {}; console.log('Cpsdk 已销毁'); }
  }

  const api = Object.assign(new Core(), { create: (cfg) => { const inst = new Core(); if (cfg) inst.setConfig(cfg); return inst; } });
  if (!global[SDK_NAME]) global[SDK_NAME] = api;
})(window);
