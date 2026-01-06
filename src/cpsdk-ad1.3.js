/**
 * CPSDK 1.3
 * 增加广告验证判断逻辑(20251011)
 * 增加GPT广告gameid(20251027)
 * 增加广告回退到top页逻辑(20251112)
 */

class adSdk {
    constructor(config) {
        this.config = config;
        this.adSdk_isReady = true;
        this.isFramed = (typeof window.parent !== 'undefined' && window.parent !== window);
        this.isAndroid = (!this.isFramed && !!window.CpsenseAppEvent && typeof window.CpsenseAppEvent.events === 'function');
        window.dataLayer = window.dataLayer || [];
        this.gameid = new URLSearchParams(document.location.search).get("gameid");
        this.pubid = new URLSearchParams(document.location.search).get("pubid");
        this.ret = new URLSearchParams(document.location.search).get("ret");
        this.is_ad_test = new URLSearchParams(document.location.search).get("vb") === "beta";
        this.dev_name = new URLSearchParams(document.location.search).get("dev") || this.config.client || 'default';
        this.gamePlayTimer = null;


        // 防止 iframe 内误触发返回导致跳出页面
        // 潜在副作用（仅特殊情况下）调试时希望在 iframe 内自由返回上层页面返回操作会被阻止
        (function () {
            if (window.top === window.self && !/Safari/i.test(navigator.userAgent)) return;

            let blockPop = false;

            // 注入一条虚拟历史记录
            history.replaceState({ page: 'init' }, '', location.href);
            history.pushState({ page: 'adblock' }, '', location.href);

            // 拦截回退行为
            window.addEventListener('popstate', function (e) {
                if (blockPop) return;
                blockPop = true;

                // Safari 误触发时强制再 push 一次，保持不动
                history.pushState({ page: 'adblock' }, '', location.href);
                blockPop = false;
            });

            // 防止部分版本 Safari 调用 window.close() 导致退出
            const noop = () => { };
            try {
                Object.defineProperty(window, 'close', { value: noop, writable: false });
            } catch (e) {
                window.close = noop;
            }
        })();

        this._eventAdsLast = {};
        this.ready = new Promise((resolve) => { this._readyResolve = resolve; });

        const _sdk = this;
        this._eventAds = {
            listeners: {
                'ready': [],
                'beforeAd': [],
                'afterAd': [],
                'adDismissed': [],
                'adViewed': [],
                'ad_error': [],
                'interstitial': [],
                'reward': [],
                'game_score': [],
                'game_level': [],
                'level_start': [],
                'level_end': []
            },
            on(eventName, callback) {
                if (!this.listeners[eventName]) return;
                if (typeof callback !== 'function') return;
                this.listeners[eventName].push(callback);

                // only replay 'ready' to late subscribers (async to avoid reentrancy)
                try {
                    if (eventName === 'ready') {
                        const last = _sdk._eventAdsLast['ready'];
                        if (last) {
                            setTimeout(() => {
                                try { callback(...last); } catch (e) { console.warn('[adsdk] replay callback error', e && e.message); }
                            }, 0);
                        }
                    }
                } catch (e) { /* ignore replay errors */ }
            },
            emit(eventName, ...args) {
                // record last args for 'ready' only
                try { if (eventName === 'ready') _sdk._eventAdsLast['ready'] = args; } catch (e) { /* ignore */ }

                // resolve ready promise once
                if (eventName === 'ready' && _sdk._readyResolve) {
                    try { _sdk._readyResolve(...args); } catch (_) { }
                    _sdk._readyResolve = null;
                }

                if (!this.listeners[eventName]) return;
                this.listeners[eventName].forEach(callback => {
                    try { callback(...args); } catch (e) { console.warn('[adsdk] event callback error', e && e.message); }
                });
            },
            off(eventName, callback) {
                if (!this.listeners[eventName]) return;
                if (!callback) { this.listeners[eventName] = []; return; }
                this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
            }
        }

        this.is_adsense = null;//是否adsense广告
        this.is_gpt = false; // 是否gpt广告
        this.is_ima = false; // 是否adx广告
        this.is_android = false; // 是否android广告

        this.ads_code = null; // adsense广告代码
        this.gpt_code = null; // gpt广告代码
        this.ima_code = null; // adx广告代码
        this.android_code = null; // android广告代码

        // cpssdk adType
        this._adType = null;
        this.adx_type = null; // adx广告类型
        this.gpt_type = null; // gpt广告类型
        this.adsense_type = null; // adsense广告类型
        this.android_type = null; // android广告类型

        this.is_first = true;
        this.interstitial_requests_count = 0; // 插页广告请求次数
        this.interstitial_req_frequency = false; // 插页广告请求频率
        this.interstitial_time_start = 0; // 插页广告请求开始时间

        this.reward_requests_count = 3; // 激励广告请求次数
        this.reward_time_start = 0; // 激励广告请求开始时间
        this.reward_req_frequency = false; // 激励广告请求频率

        this.req_ad_stabilization = false; // 请求广告稳定性
        this.req_ad_timeout = true; // 请求广告超时
        this.interstitialAd = this._showInterstitialAd;
        this.rewardAd = this._showRewardAd;

        // androidAd
        this.appads_on = false; // 默认关闭，待父页开启后切换到 ANDROID
        this.appads_pushtime = 3;
        this._adsInitialized = false; // 防重复初始化（Android 或 Web 任一生效后置 true）
        // adx
        this.adContainer = null;
        this.videoContent = null;
        this.adsLoader = null;
        this.adsManager = null;
        this.adDisplayContainer = null;
        this.videoWidth = null;
        this.videoHeight = null;
        this.adsRequest = null;
        this.adx_isLoaded = false;
        this.adxLoadTimeout = null; // ADX广告加载超时计时器

        this.adx_callback = {
            error: () => { },
            beforeAd: () => { },
            afterAd: () => { },
            adViewed: () => { },
            adDismissed: () => { }
        };

        this.gpt_callback = {
            error: () => { },
            beforeAd: () => { },
            afterAd: () => { },
            adViewed: () => { },
            adDismissed: () => { }
        };
        this.adsense_callback = {
            error: () => { },
            beforeAd: () => { },
            afterAd: () => { },
            adViewed: () => { },
            adDismissed: () => { }
        };
        this.android_callback = {
            error: () => { },
            beforeAd: () => { },
            afterAd: () => { },
            adViewed: () => { },
            adDismissed: () => { }
        };

        // 消息队列系统
        this.adsdklayer = [];
        this._messageCheckInterval = null;
        this._gameTime = 0;
        // reentrancy guard for sending messages
        this._sendingMessages = false;
        // 最大30秒发一次 - must set before calling the pushtime setter
        this._maxPushTime = 30; // 最大30秒发一次
        // 默认推送间隔（秒） - assign internal backing field directly to avoid running setter during construction
        this._pushtime = 3; // 默认3秒发一次

        // 监听来自父页面的事件
        // 用于处理Android广告状态查询的回调
        this._appeventCallback = (messageArray) => {
            // 过滤 callback-only 并严格规范化输入为数组形式的消息
            // 支持入参为 JSON 字符串、单一对象或数组。最终只处理 [{type, value}, ...] 格式
            let parsed = null;
            try {
                if (typeof messageArray === 'string') {
                    parsed = JSON.parse(messageArray);
                } else {
                    parsed = messageArray;
                }
            } catch (e) {
                // 无法解析则直接忽略
                console.warn('[adsdk] _appeventCallback: 无法解析回调数据', e && e.message);
                return;
            }

            // 强制只接收数组
            if (!Array.isArray(parsed)) {
                // 如果是单个对象则封装为数组，否则忽略
                if (parsed && typeof parsed === 'object' && parsed.type) {
                    parsed = [parsed];
                } else {
                    return;
                }
            }

            // 规范化每一项为 { type, value }，忽略不合规项
            const normalized = [];
            for (const item of parsed) {
                try {
                    if (!item || typeof item !== 'object') continue;
                    const type = item.type || item.event_type || null;
                    if (!type) continue;
                    const value = (item.value !== undefined) ? item.value : (item.data !== undefined ? item.data : null);
                    normalized.push({ type, value });
                } catch (e) {
                    // 单条解析错误则跳过该条
                    continue;
                }
            }

            // 记录日志并分发
            normalized.forEach(message => {
                let self = this;
                self.__sdklog3('[GameStatus] 收到', message.type);


                if (message.type === 'app_ads_on' && message["value"]) {

                    self._ajax("https://www.cpsense.com/public/item/sdk?id=" + self.pubid, "GET", "").then(A => {

                        if (A && A.code === 1 && Array.isArray(A.data)) {
                            const appName = message["value"]["app_name"];
                            if (typeof appName === 'string' && appName.length > 0) {
                                // 遍历 data 中的每一项，检查 sdkId 是否包含 app_name
                                const match = A.data.some(item => {
                                    try {
                                        return item && typeof item.sdkId === 'string' && item.sdkId.indexOf(appName) !== -1;
                                    } catch (e) {
                                        return false;
                                    }
                                });
                                if (match) {
                                    self.appads_on = true;
                                    self._openAndroid();
                                } else {
                                    console.error('[adsdk] app_ads_on: 未在返回的 sdkId 列表中找到', appName);
                                    self._eventAds.emit('ad_error', "error", '[adsdk] app_ads_on: 未在返回的 sdkId 列表中找到' + appName);
                                }
                            } else {
                                console.error('[adsdk] app_ads_on 缺少或非法的 app_name 字段，忽略');
                                self._eventAds.emit('ad_error', "error", '[adsdk] app_ads_on 缺少或非法的 app_name 字段，忽略');
                            }
                        } else {
                            console.error('[adsdk] app_ads_on 返回数据异常，忽略');
                            self._eventAds.emit('ad_error', "error", '[adsdk] app_ads_on 返回数据异常，忽略');
                        }
                    }).catch(error => {
                        console.error("Error fetching API:", error);
                        self._eventAds.emit('ad_error', "error", '[adsdk] app_ads_on请求接口失败' + error);
                    });
                }

                if (message.type === "set_pushtime" && typeof message.value === "number") {
                    self.updatePushInterval(message.value);
                }

                // 如果android广告功能未开启则不处理后续广告消息
                if (!self.appads_on) return;

                if (message.type === 'click_ad' && message["value"]) {
                    console.log('收到 click_ad 事件', message.value);
                    window.gtag('event', 'click_ad', { send: 'sdk', 'AdType': message.value });
                }

                try {
                    switch (message.type) {

                        case 'beforeAd':
                            self.req_ad_timeout = false;
                            try { if (self.android_callback && typeof self.android_callback.beforeAd === 'function') self.android_callback.beforeAd(); } catch (_) { }
                            self._eventAds.emit('beforeAd', message.value, 'beforeAd');
                            break;
                        // case 'afterAd':
                        //     try { if (self.android_callback && typeof self.android_callback.afterAd === 'function') self.android_callback.afterAd(); } catch (_) { }
                        //     self._eventAds.emit('afterAd', self.android_type, 'afterAd');
                        //     break;
                        case 'adViewed':
                            self.req_ad_timeout = false;
                            if (message.value === "reward") {
                                try { if (self.android_callback && typeof self.android_callback.adViewed === 'function') self.android_callback.adViewed(); } catch (_) { }
                                self._eventAds.emit('adViewed', message.value, 'adViewed');
                            } else {
                                try { if (self.android_callback && typeof self.android_callback.afterAd === 'function') self.android_callback.afterAd(); } catch (_) { }
                                self._eventAds.emit('afterAd', message.value, 'afterAd');
                            }
                            break;
                        case 'adDismissed':
                            self.req_ad_timeout = false;
                            try { if (self.android_callback && typeof self.android_callback.adDismissed === 'function') self.android_callback.adDismissed(); } catch (_) { }
                            self._eventAds.emit('adDismissed', message.value, 'adDismissed');
                            break;
                        case 'ad_error':
                            self.req_ad_timeout = false;
                            try { if (self.android_callback && typeof self.android_callback.error === 'function') self.android_callback.error(); } catch (_) { }
                            self._eventAds.emit('ad_error', self.android_type, message.value);
                            break;
                        default:
                        // this._eventAds.emit(message.type, message.value);
                    }
                } catch (error) {
                    console.warn('[GameStatus] 处理消息失败:', message, error);
                }
            });

            // 上层已确认（父页面或原生回调触达）后再启动消息轮询，避免在未就绪时立即开始定时发送
        };




        // 监听来自父页面的消息

        window.addEventListener('message', (event) => {
            try { this._appeventCallback(event.data) } catch (e) { console.log('message event err', e) }
        });


        // 原生回调处理
        window.CpsenseAppEventCallBack = (event) => {
            if (this.isFramed) { return; }
            if (this.isAndroid) {
                try { this._appeventCallback(event) } catch (e) { console.log('message event err', e) }

            }
        };


        this.adsType = { ADSENSE: 'adsense', IMA: 'ima', GPT: 'gpt', ANDROID: 'androidAds' }; // 广告类型

        Object.defineProperty(this, 'adType', {
            configurable: true,
            enumerable: true,
            get: function () { return this._adType; },
            set: function (val) {
                const old = this._adType;
                if (old === val) return;
                this._adType = val;
            }
        });

        // ads事件流程 
        this._eventAds.on('ready', (param1, param2) => {
            this.__sdklog(param1, param2);
        })



        this._eventAds.on('interstitial', (param1) => {
            window.gtag('event', 'game_interstitialad', { send: 'sdk', 'ad_type': this.adType });
            this.__sdklog(param1, this.adType);

            if (this.appads_on) {
                this.adsdklayer.push({
                    type: 'interstitial',
                    value: 1
                })
                this.checkAndSendMessages();
            }
        })

        this._eventAds.on('reward', (param1) => {
            window.gtag('event', 'game_reward', { send: 'sdk', 'ad_type': this.adType });
            this.__sdklog(param1, this.adType);

            if (this.appads_on) {
                this.adsdklayer.push({
                    type: 'reward',
                    value: 1
                })
                this.checkAndSendMessages();
            }
        })

        this._eventAds.on('beforeAd', (param1, param2) => {

            if (this.adx_type === "rewardedAd" || this.gpt_type === "rewardedAd" || param1 === "rewardedAd" || this.android_type === "rewardedAd") {
                window.gtag('event', 'game_reward_open', { send: 'sdk', 'ad_type': this.adType });
                // this.adsdklayer.push({
                //     type: 'reward_open',
                //     value: 1
                // })
            } else {

                window.gtag('event', 'game_interstitialad_open', { send: 'sdk', 'ad_type': this.adType });
                // this.adsdklayer.push({
                //     type: 'interstitial_open',
                //     value: 1
                // })
            }
            this.__sdklog2("*******adevent**********", param1, param2, this.adType);
        })

        this._eventAds.on('adDismissed', (param1) => {
            window.gtag('event', 'game_reward_dismissed', { send: 'sdk', 'ad_type': this.adType });
            this.__sdklog2("*******adevent**********", param1, this.adType);
            this.adsdklayer.push({
                type: 'reward_dismissed',
                value: 1
            })
        })

        this._eventAds.on('adViewed', (param1) => {
            window.gtag('event', 'game_reward_viewed', { send: 'sdk', 'ad_type': this.adType });
            this.__sdklog2("*******adevent**********", param1, this.adType);
            this.adsdklayer.push({
                type: 'reward_viewed',
                value: 1
            })
        })

        this._eventAds.on('afterAd', (param1, param2) => {
            window.gtag('event', 'game_interstitialad_viewed', { send: 'sdk', 'ad_type': this.adType });
            this.__sdklog2("*******adevent**********", param1, param2, this.adType);
            this.adsdklayer.push({
                type: 'interstitial_viewed',
                value: 1
            })
        })

        this._eventAds.on('ad_error', (param1, param2) => {

            switch (param2) {
                case 'timeout':
                case 'error':
                case 'frequencyCapped':
                case 'notReady':
                case 'invalid':
                case 'noAdPreloaded':
                case 'frequencyrewardAd':
                case 'frequencyinterstitialAd':
                case 'other':
                    window.gtag('event', 'ad_error', { 'ad_error_type': param2, send: 'sdk', 'ad_type': this.adType });
                    this.adsdklayer.push({
                        type: 'ad_error',
                        value: param2
                    })
                    break;
                case 'viewed':
                case 'dismissed':
                    break;
                default:
                    window.gtag('event', 'ad_error', { 'ad_error_type': param2, send: 'sdk', 'ad_type': this.adType });
                    this.adsdklayer.push({
                        type: 'ad_error',
                        value: param2
                    })
                    break;
            }
            if (param2 !== 'viewed' && param2 !== 'dismissed') {

                this.__sdklog2("*******adevent**********", param1, param2, this.adType);
            }
        })

        this._eventAds.on('game_score', (data) => {
            this.__sdklog3("game_score", data)
            this.adsdklayer.push({
                type: 'game_score',
                value: data.score
            });

        })

        this._eventAds.on('game_level', (data) => {
            this.__sdklog3("game_level", data)
            this.adsdklayer.push({
                type: 'game_level',
                value: data.level
            });
        })

        // 汇总游戏状态
        this._eventAds.on('level_end', (data) => {
            this.__sdklog3("level_end", data)
            this.adsdklayer.push({
                type: 'level_end',
                value: data
            })
        })

        try {
            const self = this;

            const AD_IFRAME_DOMAINS = ['googlesyndication.com', 'doubleclick.net'];
            let lastCheckTime = 0;
            const CLICK_THRESHOLD = 1000;

            // 记录已上报的广告容器ID
            const reportedAdIds = new Set();

            function isGoogleAdFrame(el) {
                if (!el || el.tagName !== 'IFRAME') return false;
                if (el.src) {
                    for (var i = 0; i < AD_IFRAME_DOMAINS.length; i++) {
                        if (el.src.indexOf(AD_IFRAME_DOMAINS[i]) !== -1) {
                            return true;
                        }
                    }

                }
                const idMatch = el.id && el.id.indexOf('google_ads_iframe') !== -1;
                const nameMatch = el.name && el.name.indexOf('google_ads_iframe') !== -1;
                const titleMatch = el.title && el.title.toLowerCase().indexOf('ad') !== -1;
                return idMatch || nameMatch || titleMatch || false;
            }

            function reportAdClick(el) {
                const adContainerId = el.getAttribute('data-google-container-id') || 'unknown';
                if (reportedAdIds[adContainerId]) return;
                reportedAdIds[adContainerId] = true;

                self.__sdklog2("##########捕获到iframe点击##########");
                window.gtag('event', 'click_ad', { send: 'sdk' });




            }

            function checkAdClick() {
                const now = Date.now();
                if (now - lastCheckTime < CLICK_THRESHOLD) return;
                const activeEl = document.activeElement;
                if (isGoogleAdFrame(activeEl)) {
                    lastCheckTime = now;
                    reportAdClick(activeEl);
                }
            }

            window.addEventListener('blur', checkAdClick, true);
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    checkAdClick();
                }
            }, true);



        } catch (e) {
            self.__sdklog3("ad跳出监听器失败:", e.message);
        }

        // 启用GA
        this._insert_tagmanager();

        this._initAds();

        if (this.isAndroid || this.isFramed) {
            this.__sdklog('[adsdk] 上层已确认，启动消息轮询');
            this.startMessageCheck();
        }
        // 初始化排名
        function loadScript(src) {
            return new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = src;
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        loadScript('https://www.cpsense.com/public/sdk_rank.js')
            .then((res) => {
                const gameId = this.gameid;
                const pubId = this.pubid;
                if (gameId && pubId) {

                    this._ajax("https://api.douyougame.com/interest/ranking/" + gameId + "/" + pubId, "GET", "").then(A => {

                        if (typeof break_abc === 'function') break_abc(A);

                    }).catch(error => {
                        console.log("Error fetching data:", error);
                        if (typeof break_abc === 'function') break_abc({ data: [], link: 'https://www.likebox.top' });
                    });

                } else {
                    if (typeof break_abc === 'function') break_abc({ data: [], link: 'https://www.likebox.top' });
                }
            })
            .catch(err => {

                console.log('break load', err);
            });
    }

    get pushtime() {
        return this._pushtime;
    }

    set pushtime(value) {
        const v = Math.max(1, Math.min(Number(value) || 1, this._maxPushTime));
        const oldTime = this._pushtime;
        if (v !== oldTime) {
            this._pushtime = v;
            this.__sdklog('[adsdk] 推送间隔已更新:', this._pushtime, '秒');
            this.updatePushInterval();
        }
    }

    // 判断广告类型ad_type,根据pubid和dev来获取广告代码
    _initAds() {

        // 默认启用网页广告初始化
        this._openWebAds();

        // Android 广告能力探测：向父页/原生发送统一上行事件
        if (this.isAndroid || this.isFramed) {
            // 不使用用超时回退,直接等待下行通知进行切换
            this.adsdklayer.push({ type: 'app_ads_event', value: 'is_ads_native' });
            console.log('发送上层广告能力探测事件');
            this.checkAndSendMessages();
        }
    }

    _timeoutTimer_load = null;

    _openAndroid() {
        this.adType = this.adsType.ANDROID;
        this.is_android = true;
        this.adSdk_isReady = true;
        this._adsInitialized = true;
        try { this._eventAds.emit('ready', "adSdk_isReady:true", "android"); } catch (_) { }
        this.__sdklog('[adsdk] 启用Android广告，不执行网页广告初始化');
    }

    // 网页广告初始化调度
    _openWebAds() {
        if (this._adsInitialized) return; // 已有任意广告栈初始化，避免重复
        // type_1: adsense
        // type_2: adx
        // type_3: gpt
        // type_4: androidAds
        let code = ads_list[this.pubid + '-' + this.dev_name] || ads_list[this.dev_name] || ads_list['default_ads'];
        if (!code) return;

        if (code.startsWith('data-ad-client')) {
            this.adType = this.adsType.ADSENSE;
            this.is_adsense = true;
            this.ads_code = code; // adsense广告代码
            this._adsInitialized = true;
            this._openAdsense();
            return;
        }

        if (code.startsWith('https://pubads.g.doubleclick.net/gampad/ads?iu=')) {
            this.adType = this.adsType.IMA;
            this.is_ima = true; 
            this.ima_code = code; 
            this._adsInitialized = true;
            this._openIma();
            return;
        }

        if (/^\/\d[^\/]*\//.test(code)) {
            this.adType = this.adsType.GPT;
            this.gpt_code = code;
            this._adsInitialized = true;
            this._openGPT();
            return;
        }

        // 默认回退到 IMA VAST
        this._adsInitialized = true;
        this._openIma(vast_url);
    }

    _openAdsense() {

        const adsense_Script = document.createElement("script");
        adsense_Script.async = true;
        adsense_Script.setAttribute('data-ad-frequency-hint', '30s');
        adsense_Script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        adsense_Script.setAttribute('crossorigin', 'anonymous');

        if (this.is_ad_test) { adsense_Script.setAttribute('data-adbreak-test', 'on') };

        if (this.ads_code && typeof this.ads_code === 'string') {
            let attr_arr = this.ads_code.split(',');
            for (let i = 0; i < attr_arr.length; i++) {
                let keyValue = attr_arr[i].split('=');
                if (keyValue.length === 2) {
                    adsense_Script.setAttribute(keyValue[0], keyValue[1]);
                }
            }
        }

        adsense_Script.onload = () => {
            window.adsbygoogle = window.adsbygoogle || [];
            window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); }
            let isTimeOut = false;
            window.adConfig({
                preloadAdBreaks: "on",
                sound: "on",
                onReady: () => {
                    isTimeOut = true;
                    this.adSdk_isReady = true;

                }
            });
            this._eventAds.emit('ready', "adSdk_isReady:true", "s");

        }

        adsense_Script.onerror = (error) => {

            this._eventAds.emit('ad_error', "error", "not-loaded-adsense");
            this.__sdklog("adsense loadError:", error);
        }

        document.head.appendChild(adsense_Script);

    }

    _openIma(code) {


        let adx_script = document.createElement("script");
        adx_script.type = "text/javascript";
        adx_script.src = "//imasdk.googleapis.com/js/sdkloader/ima3.js";
        document.head.appendChild(adx_script);

        adx_script.onload = () => {
            let self = this;

            self.adSdk_isReady = true;
            self._eventAds.emit('ready', "adSdk_isReady:true", "x");

        }

        adx_script.onerror = () => {
            this._eventAds.emit('ad_error', "error", "not-loaded-adx");
            this.__sdklog("adx load error");
        }
    }

    _openGPT() {
        let gpt_script = document.createElement("script");
        gpt_script.type = "text/javascript";
        gpt_script.async = true;
        gpt_script.crossOrigin = "anonymous";
        gpt_script.src = "//securepubads.g.doubleclick.net/tag/js/gpt.js";
        document.head.appendChild(gpt_script);

        gpt_script.onload = () => {
            let self = this;

            self.adSdk_isReady = true;
            self._eventAds.emit('ready', "gptSdk_isReady:true", "gpt");

            window.googletag = window.googletag || { cmd: [] };

            self.rewardPayload = null;

            window.googletag.cmd.push(() => {

                window.googletag.pubads().addEventListener("rewardedSlotReady", (event) => {
                    // GPT广告准备就绪，重置超时标志
                    self.req_ad_timeout = false;

                    // 清除备用超时
                    if (self.gptBackupTimeout) {
                        clearTimeout(self.gptBackupTimeout);
                        self.gptBackupTimeout = null;
                    }

                    // Safely call makeRewardedVisible if it exists
                    try {
                        if (event && typeof event.makeRewardedVisible === 'function') {
                            event.makeRewardedVisible();
                        }
                    } catch (e) {
                        console.log('event.makeRewardedVisible err', e);
                    }
                    self._eventAds.emit('beforeAd', "beforeAd", "pause");
                    if (self.gpt_callback && typeof self.gpt_callback.beforeAd === 'function') {
                        self.gpt_callback.beforeAd();
                    }
                });

                window.googletag.pubads().addEventListener("rewardedSlotClosed", () => {
                    if (self.rewardPayload) {
                        // console.log("广告播放完成关闭");
                        if (self.gpt_type === 'rewardedAd') {
                            self._eventAds.emit('adViewed', "adViewed", "completed");
                            if (self.gpt_callback && typeof self.gpt_callback.adViewed === 'function') {
                                self.gpt_callback.adViewed();
                            }
                        } else {
                            self._eventAds.emit('afterAd', "afterAd", "resume");
                            if (self.gpt_callback && typeof self.gpt_callback.afterAd === 'function') {
                                self.gpt_callback.afterAd();
                            }
                        }

                        self.rewardPayload = null;
                    } else {
                        // console.log("广告播放未完成关闭");
                        if (self.gpt_type === 'rewardedAd') {
                            self._eventAds.emit('adDismissed', "adDismissed", "skipped");
                            if (self.gpt_callback && typeof self.gpt_callback.adDismissed === 'function') {
                                self.gpt_callback.adDismissed();
                            }
                        } else {
                            self._eventAds.emit('afterAd', "afterAd", "resume");
                            if (self.gpt_callback && typeof self.gpt_callback.afterAd === 'function') {
                                self.gpt_callback.afterAd();
                            }
                        }

                    }

                    if (self.rewardedSlot) {
                        // console.log("ad close");
                        window.googletag.destroySlots([self.rewardedSlot]);
                        self.rewardedSlot = null;
                    } else {
                        if (self.gpt_callback && typeof self.gpt_callback.error === 'function') {
                            self.gpt_callback.error();
                        }
                    }
                });

                window.googletag.pubads().addEventListener("rewardedSlotGranted", (event) => {
                    try {
                        self.rewardPayload = event && event.payload ? event.payload : null;

                    } catch (e) {

                        self.rewardPayload = null;
                    }
                });

                window.googletag.pubads().addEventListener("slotRenderEnded", (event) => {
                    try {
                        if (event && event.slot === self.rewardedSlot) {
                            // 清除备用超时
                            if (self.gptBackupTimeout) {
                                clearTimeout(self.gptBackupTimeout);
                                self.gptBackupTimeout = null;
                            }

                            if (event.isEmpty) {

                                self.req_ad_timeout = false; // 重置超时标志
                                self._eventAds.emit('ad_error', 'error', "No ad returned for rewarded ad slot.");
                                if (self.gpt_callback && typeof self.gpt_callback.error === 'function') {
                                    self.gpt_callback.error("No ad returned for rewarded ad slot.");
                                }
                            }
                        }
                    } catch (e) {
                        console.log('event.isEmpty err', e);
                    }
                });
                googletag.pubads().setTargeting("game_id", self.gameid);

                window.googletag.enableServices();


            });

        }

        gpt_script.onerror = () => {
            this._eventAds.emit('ad_error', "error", "not-loaded-gpt");
            this.__sdklog("gpt load error");
        }
    }

    _isAdxDom = false;
    _createAdxDom() {
        console.log('ADX _createAdxDom called, creating container');
        const adTemplate = `
        <style id="adx-style">
            #adx-mainContainer {
                all: initial; /* 重置样式，避免被父级影响 */
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                background-color: rgba(0,0,0,0.8) !important;
                z-index: 2147483647 !important; /* 最大安全值 */
                pointer-events: auto !important;
            }
            #adx-adContainer {
                width: 100% !important;
                height: 100% !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
            }
            #adx-contentElement {
                width: 90vw !important;
                max-width: 1280px !important;
                aspect-ratio: 16 / 9 !important;
                height: auto !important;
            }
        </style>
        <div id="adx-mainContainer">
            <div id="adx-adContainer">
                <video id="adx-contentElement" playsinline></video>
            </div>
        </div>
    `;
        document.body.insertAdjacentHTML('beforeend', adTemplate);
        this._isAdxDom = true;
    }

    _destroyAdxDom() {
        console.log('ADX _destroyAdxDom called');
        const el = document.getElementById('adx-mainContainer');
        if (el) {
            console.log('Removing ADX main container');
            el.remove();
        } else {
            console.log('ADX main container not found');
        }
        const styleTag = document.getElementById('adx-style');
        if (styleTag) {
            console.log('Removing ADX style tag');
            styleTag.remove();
        } else {
            console.log('ADX style tag not found');
        }
        this.adContainer = null;
        this.videoContent = null;
        this._isAdxDom = false;
    }

    _onAdsManagerLoaded(adsManagerLoadedEvent) {
        let self = this;

        // 清理ADX加载超时计时器，因为广告管理器已成功加载
        if (self.adxLoadTimeout) {
            clearTimeout(self.adxLoadTimeout);
            self.adxLoadTimeout = null;
        }

        const adsRenderingSettings = new google.ima.AdsRenderingSettings();
        adsRenderingSettings.useCustomPlaybackUI = false;

        try {
            if (!adsManagerLoadedEvent || typeof adsManagerLoadedEvent.getAdsManager !== 'function') {
                throw new Error('Invalid adsManagerLoadedEvent');
            }
            self.adsManager = adsManagerLoadedEvent.getAdsManager(self.videoContent, adsRenderingSettings);
        } catch (e) {
            self.req_ad_timeout = false; // 重置超时标志，防止后续timeout
            self._destroyAdxDom(); // 清理广告容器
            self._eventAds.emit('ad_error', 'error', 'notReady');
            if (self.adx_callback && typeof self.adx_callback.error === 'function') {
                self.adx_callback.error('notReady');
            }
            return;
        }

        try {
            self.adsManager.init(
                self.videoWidth,
                self.videoHeight,
                google.ima.ViewMode.NORMAL
            );
            self.adsManager.start();
        } catch (e) {
            self.req_ad_timeout = false; // 重置超时标志，防止后续timeout
            self._destroyAdxDom(); // 清理广告容器
            self._eventAds.emit('ad_error', 'error', 'notReady');
            if (self.adx_callback && typeof self.adx_callback.error === 'function') {
                self.adx_callback.error('notReady');
            }
            return;
        }

        let isAdPaused = false;

        self.adContainer.addEventListener('click', () => {
            if (!self.adsManager) return;

            if (isAdPaused) {
                self.adsManager.resume();
            } else {
                self.adsManager.pause();
            }

            isAdPaused = !isAdPaused;
        });

        self.adsManager.addEventListener(
            google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
            () => {
                self.req_ad_timeout = false;

                // 清理ADX加载超时计时器，因为广告已成功开始播放
                if (self.adxLoadTimeout) {
                    clearTimeout(self.adxLoadTimeout);
                    self.adxLoadTimeout = null;
                }

                self._eventAds.emit('beforeAd', "beforeAd", "pause");
                if (self.adx_callback && typeof self.adx_callback.beforeAd === 'function') {
                    self.adx_callback.beforeAd();
                }
            }
        );


        self.adsManager.addEventListener(
            google.ima.AdEvent.Type.COMPLETE,
            () => {
                self.req_ad_timeout = false;
                self._destroyAdxDom();
                if (self.adx_type === 'rewardedAd') {
                    self._eventAds.emit('adViewed', "adViewed", "completed");
                    if (self.adx_callback && typeof self.adx_callback.adViewed === 'function') {
                        self.adx_callback.adViewed();
                    }
                } else {
                    self._eventAds.emit('afterAd', "afterAd", "completed");
                    if (self.adx_callback && typeof self.adx_callback.afterAd === 'function') {
                        self.adx_callback.afterAd();
                    }
                }
            }
        );

        self.adsManager.addEventListener(
            google.ima.AdEvent.Type.SKIPPED,
            () => {
                self.req_ad_timeout = false;
                self._destroyAdxDom();
                if (self.adx_type === 'rewardedAd') {
                    self._eventAds.emit('adDismissed', "adDismissed", "skipped");
                    if (self.adx_callback && typeof self.adx_callback.adDismissed === 'function') {
                        self.adx_callback.adDismissed();
                    }
                } else {
                    self._eventAds.emit('afterAd', "afterAd", "skipped");
                    if (self.adx_callback && typeof self.adx_callback.afterAd === 'function') {
                        self.adx_callback.afterAd();
                    }
                }
            }
        );

        self.adsManager.addEventListener(
            google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
            () => {
                self.req_ad_timeout = false;
                self._destroyAdxDom();
                if (self.adx_type !== 'rewardedAd') {
                    self._eventAds.emit('afterAd', "afterAd", "resume");
                    if (self.adx_callback && typeof self.adx_callback.afterAd === 'function') {
                        self.adx_callback.afterAd();
                    }
                }
            }
        );


        self.adsManager.addEventListener(
            google.ima.AdErrorEvent.Type.AD_ERROR,
            (event) => {
                self.req_ad_timeout = false;
                self._destroyAdxDom();
                let errorData = null;
                let errorType = 'unknown';
                let errorMessage = 'Unknown error';

                try {
                    if (event && typeof event.getError === 'function') {
                        errorData = event.getError();
                        if (errorData && errorData.data) {
                            errorType = errorData.data.type || 'unknown';
                            errorMessage = errorData.data.errorMessage || 'Unknown error';
                        }
                    }
                } catch (e) {
                    console.log('adx IMA err:', e);
                }

                self._eventAds.emit('ad_error', errorType, errorMessage);
                if (self.adx_callback && typeof self.adx_callback.error === 'function') {
                    self.adx_callback.error(errorType);
                }

            }
        );


    }

    _onAdError(event) {
        console.log('ADX _onAdError called, destroying container');
        this._destroyAdxDom();

        this.req_ad_timeout = false;

        // 清理ADX加载超时计时器
        if (this.adxLoadTimeout) {
            clearTimeout(this.adxLoadTimeout);
            this.adxLoadTimeout = null;
        }

        let errorData = null;
        let errorType = 'unknown';
        let errorMessage = 'Unknown error';

        try {
            if (event && typeof event.getError === 'function') {
                errorData = event.getError();
                if (errorData && errorData.data) {
                    errorType = errorData.data.type || 'unknown';
                    errorMessage = errorData.data.errorMessage || 'Unknown error';
                }
            }
        } catch (e) {
            console.log('adx IMA err:', e);
        }

        this._eventAds.emit('ad_error', errorType, errorMessage);
        if (this.adx_callback && typeof this.adx_callback.error === 'function') {
            this.adx_callback.error(errorType);
        }

    }

    _showAdx() {

        let self = this;

        // 检查Google IMA SDK是否加载成功
        if (typeof google === 'undefined' || typeof google.ima === 'undefined') {
            self.req_ad_timeout = false; // 重置超时标志，防止后续timeout
            self._eventAds.emit('ad_error', 'error', 'notReady');
            if (self.adx_callback && typeof self.adx_callback.error === 'function') {
                self.adx_callback.error('notReady');
            }
            return;
        }

        if (self.adsManager) {
            self.adsManager.destroy();
            self.adsManager = null;
        }

        if (self.adsLoader) {
            self.adsLoader.destroy();
            self.adsLoader = null;
        }

        if (!self._isAdxDom) {
            self._createAdxDom();
        }

        self.adContainer = document.getElementById('adx-adContainer');
        self.videoContent = document.getElementById('adx-contentElement');


        if (!self.adContainer || !self.videoContent) {
            self.req_ad_timeout = false; // 重置超时标志，防止后续timeout
            self._destroyAdxDom(); // 清理广告容器

            self._eventAds.emit('ad_error', 'error', 'notReady');
            if (self.adx_callback && typeof self.adx_callback.error === 'function') {
                self.adx_callback.error('notReady');
            }
            return;
        }

        // 设置ADX广告加载超时，防止广告容器长时间显示空白
        self.adxLoadTimeout = setTimeout(() => {
            if (self.req_ad_timeout) { // 如果仍在请求状态
                console.log('ADX ad loading timeout, destroying container');
                self.req_ad_timeout = false;
                self._destroyAdxDom(); // 清理广告容器
                self._eventAds.emit('ad_error', 'error', 'timeout');
                if (self.adx_callback && typeof self.adx_callback.error === 'function') {
                    self.adx_callback.error('timeout');
                }
            }
        }, 10000); // 10秒超时

        try {
            self.adDisplayContainer = new google.ima.AdDisplayContainer(self.adContainer, self.videoContent);
            self.adsLoader = new google.ima.AdsLoader(self.adDisplayContainer);

            self.adsLoader.addEventListener(
                google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
                (event) => self._onAdsManagerLoaded(event),
                false
            );
            self.adsLoader.addEventListener(
                google.ima.AdErrorEvent.Type.AD_ERROR,
                (event) => self._onAdError(event),
                false
            );

            self.videoWidth = document.documentElement.clientWidth || window.innerWidth;
            self.videoHeight = document.documentElement.clientHeight || window.innerHeight;
            self.adDisplayContainer.initialize();

            const adsRequest = new google.ima.AdsRequest();
            adsRequest.adTagUrl = self.is_ad_test ? self._getTestAdxUrl("Preroll") :
                (self.ima_code + self._generateUniqueCorrelator());
            // console.log('adxRequest=', self.videoWidth, self.videoHeight);
            adsRequest.linearAdSlotWidth = self.videoWidth;
            adsRequest.linearAdSlotHeight = self.videoHeight;

            self.adsLoader.requestAds(adsRequest);
        } catch (e) {
            console.log('ADX initialization error:', e);
            self.req_ad_timeout = false;
            self._destroyAdxDom(); // 清理广告容器
            if (self.adxLoadTimeout) {
                clearTimeout(self.adxLoadTimeout);
                self.adxLoadTimeout = null;
            }
            self._eventAds.emit('ad_error', 'error', 'initError');
            if (self.adx_callback && typeof self.adx_callback.error === 'function') {
                self.adx_callback.error('initError');
            }
        }
    }

    gptBackupTimeout = null; // GPT备用超时
    _showGPT() {

        let self = this;

        // 检查Google Publisher Tag SDK是否加载成功
        if (typeof window.googletag === 'undefined' || !window.googletag.cmd) {
            self.req_ad_timeout = false; // 重置超时标志，防止后续timeout
            self._eventAds.emit('ad_error', 'error', 'notReady');
            if (self.gpt_callback && typeof self.gpt_callback.error === 'function') {
                self.gpt_callback.error('notReady');
            }
            return;
        }

        let gpt_code = self.is_ad_test ? self._getTestAdxUrl("gpt") : self.gpt_code;

        // 设置一个备用超时，如果30秒内没有任何GPT事件响应，直接报错
        self.gptBackupTimeout = setTimeout(() => {

            self._eventAds.emit('ad_error', 'error', 'gpt_no_response');
            if (self.gpt_callback && typeof self.gpt_callback.error === 'function') {
                self.gpt_callback.error('gpt_no_response');
            }

        }, 8000);

        window.googletag.cmd.push(() => {
            // 创建新的广告位
            self.rewardedSlot = window.googletag.defineOutOfPageSlot(
                gpt_code,
                window.googletag.enums.OutOfPageFormat.REWARDED,
            );

            if (self.rewardedSlot) {
                self.rewardedSlot.addService(window.googletag.pubads());
                window.googletag.display(self.rewardedSlot);
                self.req_ad_timeout = false;
            } else {

                if (self.gptBackupTimeout) {
                    clearTimeout(self.gptBackupTimeout);
                    self.gptBackupTimeout = null;
                }
                self.req_ad_timeout = false;
                self._eventAds.emit('ad_error', 'error', 'create_slot_failed');
                if (self.gpt_callback && typeof self.gpt_callback.error === 'function') {
                    self.gpt_callback.error('create_slot_failed');
                }
            }
        });

    }

    _showAdsense() {
        let self = this;

        // 检查adBreak函数是否存在
        if (typeof window.adBreak !== 'function') {
            self.req_ad_timeout = false; // 重置超时标志，防止后续timeout
            if (typeof self.adsense_callback.error === 'function') self.adsense_callback.error("notReady-adsense");
            self._eventAds.emit('ad_error', "error", "notReady-adsense");
            return;
        }
        if (self.adsense_type === 'rewardedAd') {

            window.adBreak({
                type: 'reward',
                beforeAd() {
                    self.req_ad_timeout = false;

                    self._eventAds.emit('beforeAd', "rewardedAd", 'beforeAd');
                    if (typeof self.adsense_callback.beforeAd === 'function') self.adsense_callback.beforeAd();
                },
                beforeReward(showAdFn) { showAdFn(); },
                adDismissed() {

                    self._eventAds.emit('adDismissed', "adDismissed");
                    if (typeof self.adsense_callback.adDismissed === 'function') self.adsense_callback.adDismissed();
                },
                adViewed() {

                    self._eventAds.emit('adViewed', "adViewed");
                    if (typeof self.adsense_callback.adViewed === 'function') self.adsense_callback.adViewed();
                },
                adBreakDone(placement_info) {

                    self.req_ad_timeout = false;
                    let breakStatus = placement_info && placement_info.breakStatus ? placement_info.breakStatus : 'unknown';
                    self._eventAds.emit('ad_error', "reward_error", breakStatus);
                    if (breakStatus !== 'viewed') {
                        if (typeof self.adsense_callback.error === 'function') self.adsense_callback.error(breakStatus);
                    }
                }
            });
        } else {
            if (self.is_first) {

                window.adBreak({
                    type: 'preroll',
                    beforeAd() {

                        self.req_ad_timeout = false;
                        self._eventAds.emit('beforeAd', "interstitialAd", "beforeAd");
                        if (typeof self.adsense_callback.beforeAd === 'function') self.adsense_callback.beforeAd();
                    },
                    adBreakDone(placement_info) {
                        self.is_first = false;
                        self.req_ad_timeout = false;
                        // console.log('adBreakDone', placement_info);
                        let breakStatus = placement_info && placement_info.breakStatus ? placement_info.breakStatus : 'unknown';
                        self._eventAds.emit('ad_error', "interstitial_error", breakStatus);

                        if (breakStatus !== 'viewed') {
                            if (typeof self.adsense_callback.error === 'function') self.adsense_callback.error(breakStatus);
                        } else {

                            self._eventAds.emit('afterAd', "interstitialAd", "afterAd");
                            if (typeof self.adsense_callback.afterAd === 'function') self.adsense_callback.afterAd();
                        }

                    }
                });
            } else {
                window.adBreak({
                    type: ["start", "pause", "next", "browse"][Math.floor(Math.random() * 4)],

                    beforeAd() {

                        self.req_ad_timeout = false;
                        self._eventAds.emit('beforeAd', "interstitialAd", "beforeAd");
                        if (typeof self.adsense_callback.beforeAd === 'function') self.adsense_callback.beforeAd();
                    },
                    afterAd() {

                        self._eventAds.emit('afterAd', "interstitialAd", "afterAd");
                        if (typeof self.adsense_callback.afterAd === 'function') self.adsense_callback.afterAd();
                    },
                    adBreakDone(placement_info) {
                        self.is_first = false;
                        self.req_ad_timeout = false;
                        // console.log('adBreakDone', placement_info);
                        let breakStatus = placement_info && placement_info.breakStatus ? placement_info.breakStatus : 'unknown';
                        self._eventAds.emit('ad_error', "interstitial_error", breakStatus);

                        if (breakStatus !== 'viewed') {
                            if (typeof self.adsense_callback.error === 'function') self.adsense_callback.error(breakStatus);
                        }

                    }
                });
            }

        }

    }

    _debounceTimer = null;
    _timeoutTimer = null;

    // 插页
    _showInterstitialAd(callback) {
        let self = this;

        // 检查SDK是否准备就绪,目前adsense不需要检查
        // if (!self.adSdk_isReady) {
        //     if (typeof callback.error === 'function') callback.error("notReady");
        //     self._eventAds.emit('ad_error', "error", "notReady");
        //     return;
        // }

        //1秒内禁止重复,防抖
        if (self.req_ad_stabilization) {
            if (typeof callback.error === 'function') callback.error("frequencyCapped");
            return;
        }
        self._debounceTimer = setTimeout(() => {
            clearTimeout(self._debounceTimer);
            self.req_ad_stabilization = false;
        }, 1000);

        self.req_ad_stabilization = true;

        self._eventAds.emit('interstitial', "interstitialAd");



        self._timeoutTimer = setTimeout(() => {
            clearTimeout(self._timeoutTimer);
            if (self.req_ad_timeout) {
                self.is_first = false;
                self._eventAds.emit('ad_error', "error", "timeout");
                if (typeof callback.error === 'function') callback.error("timeout");
            }
        }, 8000);

        let now = Date.now();
        if (!self.interstitial_time_start) {
            self.interstitial_time_start = now;
        }

        // 如果超过30秒，重置计数器
        let now_duration = now - self.interstitial_time_start;
        // console.log('now_duration=', now_duration, 'interstitial_time_start=', self.interstitial_time_start);

        if (self.interstitial_requests_count > 1) {

            if (now_duration > 30000) {

                self.interstitial_time_start = now;
            } else {
                if (typeof callback.error === 'function') callback.error({ ad_error_type: 'frequencyinterstitialAd' });
                self._eventAds.emit('ad_error', "frequencyinterstitialAd", 'frequencyinterstitialAd');
                return false;
            }
        }
        self.interstitial_requests_count++;

        // 请求广告超时
        self.req_ad_timeout = true;
        if (self.adType === self.adsType.ADSENSE) {
            self.adsense_type = 'interstitialAd';
            // 安全地合并回调对象，保留默认的空函数
            Object.assign(self.adsense_callback, {
                error: (callback && callback.error) || (() => { }),
                beforeAd: (callback && callback.beforeAd) || (() => { }),
                afterAd: (callback && callback.afterAd) || (() => { }),
                adViewed: (callback && callback.adViewed) || (() => { }),
                adDismissed: (callback && callback.adDismissed) || (() => { })
            });
            self._showAdsense();

        }
        else if (self.adType === self.adsType.IMA) {

            self.adx_type = 'interstitialAd';
            // 安全地合并回调对象，保留默认的空函数
            Object.assign(self.adx_callback, {
                error: (callback && callback.error) || (() => { }),
                beforeAd: (callback && callback.beforeAd) || (() => { }),
                afterAd: (callback && callback.afterAd) || (() => { }),
                adViewed: (callback && callback.adViewed) || (() => { }),
                adDismissed: (callback && callback.adDismissed) || (() => { })
            });
            self._showAdx();
        }
        else if (self.adType === self.adsType.GPT) {
            self.gpt_type = 'interstitialAd';
            // 安全地合并回调对象，保留默认的空函数
            Object.assign(self.gpt_callback, {
                error: (callback && callback.error) || (() => { }),
                beforeAd: (callback && callback.beforeAd) || (() => { }),
                afterAd: (callback && callback.afterAd) || (() => { }),
                adViewed: (callback && callback.adViewed) || (() => { }),
                adDismissed: (callback && callback.adDismissed) || (() => { })
            });
            self._showGPT();
        }
        else if (self.adType === self.adsType.ANDROID) {
            // ANDROID：设定类型并改用原生调用，避免重复定时器
            self.android_type = 'interstitialAd';
            Object.assign(self.android_callback, {
                error: (callback && callback.error) || (() => { }),
                beforeAd: (callback && callback.beforeAd) || (() => { }),
                afterAd: (callback && callback.afterAd) || (() => { }),
                adViewed: (callback && callback.adViewed) || (() => { }),
                adDismissed: (callback && callback.adDismissed) || (() => { })
            });
            // 通过事件触发调用安卓原生广告
        }


    }

    _debounceTimer_reward = null;
    _timeoutTimer_reward = null;
    // 激励
    _showRewardAd(callback) {
        let self = this;

        // 检查SDK是否准备就绪
        // if (!self.adSdk_isReady) {
        //     if (typeof callback.error === 'function') callback.error("notReady");
        //     self._eventAds.emit('ad_error', "error", "notReady");
        //     return;
        // }

        if (self.req_ad_stabilization) {
            if (typeof callback.error === 'function') callback.error("frequencyCapped");
            return;
        };

        self._debounceTimer_reward = setTimeout(() => {
            clearTimeout(self._debounceTimer_reward);
            self.req_ad_stabilization = false;
        }, 1000);

        self.req_ad_stabilization = true;

        self._eventAds.emit('reward', "rewardAd");

        self._timeoutTimer_reward = setTimeout(() => {
            clearTimeout(self._timeoutTimer_reward);
            if (self.req_ad_timeout) {
                self._eventAds.emit('ad_error', "error", "timeout");
                if (typeof callback.error === 'function') callback.error("timeout");
            }
        }, 8000);

        const now = Date.now();
        if (!self.reward_time_start) {
            self.reward_time_start = now;
        }

        // 如果超过30秒，重置计数器
        let now_duration = now - self.reward_time_start;
        // console.log('now_duration=', now_duration, 'reward_time_start=', self.reward_time_start);
        if (now_duration > 30000) {
            self.reward_time_start = 0;
            self.reward_requests_count = 3;
        }

        // 检查是否超过3次限制
        if (self.reward_requests_count <= 0) {
            if (typeof callback.error === 'function') callback.error({ ad_error_type: 'frequencyrewardAd' });
            self._eventAds.emit('ad_error', "frequencyrewardAd", 'frequencyrewardAd');
            return false;
        }


        self.reward_requests_count--;
        // 请求广告超时
        self.req_ad_timeout = true;

        if (self.adType === self.adsType.ADSENSE) {

            self.adsense_type = 'rewardedAd';
            // 安全地合并回调对象，保留默认的空函数
            Object.assign(self.adsense_callback, {
                error: (callback && callback.error) || (() => { }),
                beforeAd: (callback && callback.beforeAd) || (() => { }),
                afterAd: (callback && callback.afterAd) || (() => { }),
                adViewed: (callback && callback.adViewed) || (() => { }),
                adDismissed: (callback && callback.adDismissed) || (() => { })
            });
            self._showAdsense();


        } else if (self.adType === self.adsType.IMA) {
            self.adx_type = 'rewardedAd';
            // 安全地合并回调对象，保留默认的空函数
            Object.assign(self.adx_callback, {
                error: (callback && callback.error) || (() => { }),
                beforeAd: (callback && callback.beforeAd) || (() => { }),
                afterAd: (callback && callback.afterAd) || (() => { }),
                adViewed: (callback && callback.adViewed) || (() => { }),
                adDismissed: (callback && callback.adDismissed) || (() => { })
            });

            self._showAdx();
        } else if (self.adType === self.adsType.GPT) {
            self.gpt_type = 'rewardedAd';
            // 安全地合并回调对象，保留默认的空函数
            Object.assign(self.gpt_callback, {
                error: (callback && callback.error) || (() => { }),
                beforeAd: (callback && callback.beforeAd) || (() => { }),
                afterAd: (callback && callback.afterAd) || (() => { }),
                adViewed: (callback && callback.adViewed) || (() => { }),
                adDismissed: (callback && callback.adDismissed) || (() => { })
            });
            self._showGPT();
        } else if (this.adType === this.adsType.ANDROID) {
            // ANDROID：设定类型并改用原生调用，避免重复定时器
            this.android_type = 'rewardedAd';
            Object.assign(this.android_callback, {
                error: (callback && callback.error) || (() => { }),
                beforeAd: (callback && callback.beforeAd) || (() => { }),
                afterAd: (callback && callback.afterAd) || (() => { }),
                adViewed: (callback && callback.adViewed) || (() => { }),
                adDismissed: (callback && callback.adDismissed) || (() => { })
            });

        }


    }

    /// postmessage ///


    /**
     * 启动消息队列检查
     * 根据pushtime配置的间隔检查adsdklayer是否有数据，如果有就发送
     */
    startMessageCheck() {
        if (this._messageCheckInterval) {
            clearInterval(this._messageCheckInterval);
        }

        this._messageCheckInterval = setInterval(() => {
            this.checkAndSendMessages();
        }, this.getPushInterval());

        this.__sdklog('[adsdk] 消息队列检查已启动，间隔:', this.getPushInterval() / 1000, '秒');
    }

    /**
     * 获取推送间隔（毫秒）
     * 限制在1秒到30秒之间
     */
    getPushInterval() {
        let interval = Math.max(1, Math.min(this.pushtime, this._maxPushTime));
        return interval * 1000;
    }

    updatePushInterval() {
        if (this._messageCheckInterval) {
            this.startMessageCheck(); // 重新启动定时器
        }
    }


    checkAndSendMessages() {
        let self = this;

        if (!self.isFramed && !self.isAndroid) return;

        if (!self.adsdklayer || self.adsdklayer.length === 0) return;

        const pending = self.adsdklayer.slice();

        self.adsdklayer = [];

        const parentPayload = self.deduplicateMessages(pending);
        const nativePayload = pending;

        try {
            if (self.isFramed) {
                const parentString = JSON.stringify(parentPayload);
                try {
                    window.parent.postMessage(parentString, '*');
                } catch (errPost) {
                    console.warn('[adsdk] parent.postMessage failed:', errPost);
                }
            }

            if (!self.isFramed && self.isAndroid) {
                try {
                    window.CpsenseAppEvent.events(JSON.stringify(nativePayload));
                    self.__sdklog('[adsdk] CpsenseAppEvent.events called with', JSON.stringify(nativePayload));
                } catch (nativeErr) {
                    console.warn('[adsdk] native push failed:', nativeErr);
                }
            }
        } catch (sendErr) {
            console.warn('[adsdk] send error:', sendErr);
        }


    }

    deduplicateMessages(messages) {
        const messageMap = new Map();

        // 遍历消息，相同type的后面覆盖前面的
        messages.forEach(message => {
            messageMap.set(message.type, message);
        });

        return Array.from(messageMap.values());
    }


    /**
     * 设置推送间隔（秒）
     * @param {number} seconds - 推送间隔，1-30秒之间
     */
    setPushTime(seconds) {
        this.pushtime = seconds;
    }

    getPushTime() {
        return this.pushtime;
    }

    __sdklog(...args) {
        const formatParam = (arg) => {
            if (typeof arg === 'string') return `'${arg}'`;
            if (typeof arg === 'object') return JSON.stringify(arg);
            return String(arg);
        };

        const params = args.map(formatParam).join(' ');

        console.log(
            `%c ***CPSDK***: ${params}`,

            'background-color: #f9f9f9; ' +
            'border: 2px solid #8e44ad; ' +
            'color: #333; ' +
            'padding: 5px 15px; ' +
            'border-radius: 5px; ' +
            'font-weight: 500; ' +
            'box-shadow: 0 0 5px rgba(142, 68, 173, 0.3);'
        );
    }

    __sdklog2(...args) {
        const formatParam = (arg) => {
            if (typeof arg === 'string') return `'${arg}'`;
            if (typeof arg === 'object') return JSON.stringify(arg);
            return String(arg);
        };

        const params = args.map(formatParam).join(' ');

        console.log(
            `%c ***CPSDK***: ${params}`,
            'background: linear-gradient(to right, #8e44ad, #ba43ff); ' +
            'color: white; ' +
            'padding: 5px 15px; ' +
            'border-radius: 5px; ' +
            'font-weight: bold; ' +
            'text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);'

        );
    }

    __sdklog3(...args) {
        const formatParam = (arg) => {
            if (typeof arg === 'string') return `'${arg}'`;
            if (typeof arg === 'object') return JSON.stringify(arg);
            return String(arg);
        };

        const params = args.map(formatParam).join(' ');

        console.log(
            `%c ***DOTGTAG***: ${params}`,
            'background: linear-gradient(to right,rgb(68, 173, 166),rgb(4, 170, 173)); ' +
            'color: white; ' +
            'padding: 5px 15px; ' +
            'border-radius: 5px; ' +
            'font-weight: bold; ' +
            'text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);'

        );
    }

    // tag init
    _insert_tagmanager() {
        let self = this;
        const ga_script = document.createElement("script");
        ga_script.async = true;
        ga_script.src = "https://www.googletagmanager.com/gtag/js?id=G-NL2943ZRFH";
        ga_script.setAttribute('crossorigin', 'anonymous');
        ga_script.onload = () => {


            window.gtag("consent", "default", {
                "ad_storage": "granted",
                "ad_user_data": "granted",
                "ad_personalization": "granted",
                "analytics_storage": "granted"
            });

            window.gtag('js', new Date());
            window.gtag('set', 'cookie_flags', 'SameSite=None;Secure');
            window.gtag('config', 'G-NL2943ZRFH', {
                game_id: self.gameid,
                dev_name: self.dev_name,//self.config.client
                iframe_url: document.referrer
            });
        };

        let gamePlayTimerStarted = false;

        window.gtag = function () {


            let own_event_list = [
                'ad_error',
                'game_reward_open',
                'game_interstitialad_open',
                'game_play_time',
                'game_reward_dismissed',
                'game_interstitialad',
                'game_reward',
                'game_reward_viewed',
                'game_interstitialad_viewed',
                'click_ad'
            ];

            let event_List = [
                'game_start',
                'level_start',
                'level_end'
            ];



            let ar = [...arguments];
            let ar0 = ar[0];
            let ar1 = ar[1];
            let ar2 = ar[2];

            if (
                (["set", "js", "config", "consent"].indexOf(ar0) !== -1) ||
                (event_List.indexOf(ar1) !== -1) ||
                (own_event_list.indexOf(ar1) !== -1 &&
                    ar2 &&
                    ar2['send'] &&
                    ar2['send'] === 'sdk')
            ) {
                try {

                    let copyThird;
                    if (ar[2] && typeof ar[2] === 'object') {
                        if (Array.isArray(ar[2])) {
                            copyThird = ar[2].slice();
                        } else {
                            copyThird = Object.assign({}, ar[2]);
                        }
                    } else {
                        copyThird = {};
                    }

                    try { delete copyThird.dev_name; } catch (_) { /* ignore */ }
                    try { delete copyThird.iframe_url; } catch (_) { /* ignore */ }
                    copyThird.game_id = self.gameid;

                    const logArgs = Array.from(arguments);
                    logArgs[2] = copyThird;

                    self.__sdklog3(...logArgs);

                } catch (e) { /* ignore */ }


                try {
                    if (window.dataLayer && typeof window.dataLayer.push === 'function') {
                        window.dataLayer.push(arguments);
                    }
                } catch (e) {
                    console.log('dataLayer:', e);
                }
            }

            if (ar[1] === 'game_start' && !gamePlayTimerStarted) {
                gamePlayTimerStarted = true;
                setInterval(function () {
                    if (typeof window.gtag === 'function') {
                        window.gtag('event', 'game_play_time', { send: 'sdk' });
                    }
                    // message
                    self.adsdklayer.push({
                        type: 'game_time',
                        value: self._gameTime += 30
                    });
                }, 30000);
            }

            // 添加上报分支
            if (ar1 === 'game_start') {
                self.adsdklayer.push({
                    type: 'game_start',
                    value: ar[2]
                })
            }

            if (ar1 === 'level_start') {
                self.adsdklayer.push({
                    type: 'level_start',
                    value: ar[2]
                })
            }

            if (ar1 === 'level_end') {
                self.adsdklayer.push({
                    type: 'level_end',
                    value: ar[2]
                })
            }


        };
        document.head.appendChild(ga_script);



    }

    _getTestAdxUrl(type) {
        // 返回一个测试的beta URL
        const beta_url = backup_beta_urls[type];// + Date.now();
        console.log('testURL:', beta_url);

        return beta_url
    }

    _generateUniqueCorrelator() {
        return Date.now();
    }

    _ajax(url, method, data) {
        return new Promise(function (resolve, reject) {
            try {
                let xhr = new XMLHttpRequest();
                xhr.open(method, url, true)
                xhr.responseType = 'json'
                xhr.setRequestHeader("Accept", "application/json")
                xhr.onreadystatechange = function () {
                    if (xhr.readyState !== 4) {
                        return;
                    }
                    if (xhr.status === 200) {
                        resolve(xhr.response)
                    } else {
                        reject(xhr.statusText)
                    }
                }
                if (method === 'GET') {
                    xhr.send()
                } else {
                    xhr.send(JSON.stringify(data))
                }
            } catch (error) {
                reject(error);
            }
        })

    }

}

const backup_beta_urls = {

    //单行内嵌线性
    'Inline': 'https://pubads.g.doubleclick.net/gampad/ads?' +
        'iu=/21775744923/external/single_ad_samples&' +
        'sz=640x480&' +
        'cust_params=sample_ct%3Dlinear&' +
        'ciu_szs=300x250%2C728x90&gdfp_req=1&' +
        'output=vast&' +
        'unviewed_position_start=1&' +
        'env=vp&' +
        'impl=s&' +
        'correlator=',
    //单个可跳过的插播广告
    'Preroll': 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_preroll_skippable&' +
        'sz=640x480&' +
        'ciu_szs=300x250%2C728x90&' +
        'gdfp_req=1&' +
        'output=vast&' +
        'unviewed_position_start=1&' +
        'env=vp&' +
        'impl=s&' +
        'correlator=',
    //vmap广告
    'VMAP': 'https://pubads.g.doubleclick.net/gampad/ads?' +
        'iu=/21775744923/external/vmap_ad_samples&' +
        'sz=640x480&' +
        'cust_params=sample_ar=premidpost&' +
        'ciu_szs=300x250&' +
        'gdfp_req=1&' +
        'ad_rule=1&' +
        'output=vmap&' +
        'unviewed_position_start=1&' +
        'env=vp&' +
        'impl=s&' +
        'adtest=on&' +
        'ad_type=video&' +
        'correlator=',
    //gpt测试
    "gpt": "/22639388115/rewarded_web_example",

}

const vast_url = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/22149012983/h5-bwg-vast/400x300-1180marketjs-id00032-bwg&description_url=https%3A%2F%2Fwww.likebox.xyz&tfcd=0&npa=0&sz=400x300&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=';
const ads_list = {
    "495-marketjs": "data-ad-client=ca-pub-2252168419307880",
    "495-behappy": "data-ad-client=ca-pub-2252168419307880",
    "495-91games": "data-ad-client=ca-pub-2252168419307880",
    "495-cpsense": "data-ad-client=ca-pub-2252168419307880",
    "487-behappy": "data-ad-client=ca-pub-5985150674191762",
    "487-91games": "data-ad-client=ca-pub-5985150674191762",
    "487-marketjs": "data-ad-client=ca-pub-5985150674191762",
    "487-cpsense": "data-ad-client=ca-pub-5985150674191762",
    "464-behappy": "data-ad-client=ca-pub-5985150674191762",
    "464-91games": "data-ad-client=ca-pub-5985150674191762",
    "464-marketjs": "data-ad-client=ca-pub-5985150674191762",
    "464-cpsense": "data-ad-client=ca-pub-5985150674191762",
    "604-behappy": "data-ad-client=ca-pub-5985150674191762",
    "604-91games": "data-ad-client=ca-pub-5985150674191762",
    "604-cpsense": "data-ad-client=ca-pub-5985150674191762",
    "604-marketjs": "data-ad-client=ca-pub-5985150674191762",
    "230-marketjs": "data-ad-client=ca-pub-5985150674191762",
    "230-behappy": "data-ad-client=ca-pub-5985150674191762",
    "230-cpsense": "data-ad-client=ca-pub-5985150674191762",
    "230-91games": "data-ad-client=ca-pub-5985150674191762",
    "603-behappy": "data-ad-client=ca-pub-5985150674191762",
    "603-91games": "data-ad-client=ca-pub-5985150674191762",
    "603-marketjs": "data-ad-client=ca-pub-5985150674191762",
    "603-cpsense": "data-ad-client=ca-pub-5985150674191762",
    "330-behappy": "data-ad-client=ca-pub-5985150674191762",
    "330-91games": "data-ad-client=ca-pub-5985150674191762",
    "330-marketjs": "data-ad-client=ca-pub-5985150674191762",
    "330-cpsense": "data-ad-client=ca-pub-5985150674191762",
    "1585-marketjs": "data-ad-client=ca-pub-5985150674191762",
    "1585-behappy": "data-ad-client=ca-pub-5985150674191762",
    "1585-91games": "data-ad-client=ca-pub-5985150674191762",
    "1585-cpsense": "data-ad-client=ca-pub-5985150674191762",
    "397-behappy": "data-ad-client=ca-pub-5985150674191762",
    "397-91games": "data-ad-client=ca-pub-5985150674191762",
    "397-marketjs": "data-ad-client=ca-pub-5985150674191762",
    "397-cpsense": "data-ad-client=ca-pub-5985150674191762",
    "415-behappy": "data-ad-client=ca-pub-5985150674191762",
    "415-91games": "data-ad-client=ca-pub-5985150674191762",
    "415-marketjs": "data-ad-client=ca-pub-5985150674191762",
    "415-cpsense": "data-ad-client=ca-pub-5985150674191762",
    "323-behappy": "data-ad-client=ca-pub-5985150674191762",
    "323-91games": "data-ad-client=ca-pub-5985150674191762",
    "323-marketjs": "data-ad-client=ca-pub-5985150674191762",
    "323-cpsense": "data-ad-client=ca-pub-5985150674191762",
    "1696-marketjs": "data-ad-client=ca-pub-5985150674191762",
    "1696-behappy": "data-ad-client=ca-pub-5985150674191762",
    "1696-91games": "data-ad-client=ca-pub-5985150674191762",
    "1696-cpsense": "data-ad-client=ca-pub-5985150674191762",
    "831-behappy": "data-ad-client=ca-pub-9717542802261829",
    "831-91games": "data-ad-client=ca-pub-9717542802261829",
    "831-marketjs": "data-ad-client=ca-pub-9717542802261829",
    "831-cpsense": "data-ad-client=ca-pub-9717542802261829",
    "1349-marketjs": "data-ad-client=ca-pub-9717542802261829",
    "1349-behappy": "data-ad-client=ca-pub-9717542802261829",
    "1349-91games": "data-ad-client=ca-pub-9717542802261829",
    "1349-cpsense": "data-ad-client=ca-pub-9717542802261829",
    "827-behappy": "data-ad-client=ca-pub-9717542802261829",
    "827-91games": "data-ad-client=ca-pub-9717542802261829",
    "827-marketjs": "data-ad-client=ca-pub-9717542802261829",
    "827-cpsense": "data-ad-client=ca-pub-9717542802261829",
    "741-behappy": "data-ad-client=ca-pub-9717542802261829",
    "741-91games": "data-ad-client=ca-pub-9717542802261829",
    "741-marketjs": "data-ad-client=ca-pub-9717542802261829",
    "741-cpsense": "data-ad-client=ca-pub-9717542802261829",
    "788-behappy": "data-ad-client=ca-pub-9717542802261829",
    "788-91games": "data-ad-client=ca-pub-9717542802261829",
    "788-marketjs": "data-ad-client=ca-pub-9717542802261829",
    "788-cpsense": "data-ad-client=ca-pub-9717542802261829",
    "843-behappy": "data-ad-client=ca-pub-9717542802261829",
    "843-91games": "data-ad-client=ca-pub-9717542802261829",
    "843-marketjs": "data-ad-client=ca-pub-9717542802261829",
    "843-cpsense": "data-ad-client=ca-pub-9717542802261829",
    "786-behappy": "data-ad-client=ca-pub-9717542802261829",
    "786-91games": "data-ad-client=ca-pub-9717542802261829",
    "786-marketjs": "data-ad-client=ca-pub-9717542802261829",
    "786-cpsense": "data-ad-client=ca-pub-9717542802261829",
    "458-behappy": "data-ad-client=ca-pub-9717542802261829",
    "458-91games": "data-ad-client=ca-pub-9717542802261829",
    "458-marketjs": "data-ad-client=ca-pub-9717542802261829",
    "458-cpsense": "data-ad-client=ca-pub-9717542802261829",
    "371-behappy": "data-ad-client=ca-pub-9717542802261829",
    "371-91games": "data-ad-client=ca-pub-9717542802261829",
    "371-cpsense": "data-ad-client=ca-pub-9717542802261829",
    "371-marketjs": "data-ad-client=ca-pub-9717542802261829",
    "3936-marketjs": "data-ad-client=ca-pub-5985150674191762",
    "3936-behappy": "data-ad-client=ca-pub-5985150674191762",
    "3936-91games": "data-ad-client=ca-pub-5985150674191762",
    "3936-cpsense": "data-ad-client=ca-pub-5985150674191762",
    "3936-cpsense-cd": "data-ad-client=ca-pub-5985150674191762",
    "3937-marketjs": "data-ad-client=ca-pub-9973079271836529",
    "3937-behappy": "data-ad-client=ca-pub-9973079271836529",
    "3937-91games": "data-ad-client=ca-pub-9973079271836529",
    "3937-cpsense": "data-ad-client=ca-pub-9973079271836529",
    "3937-cpsense-cd": "data-ad-client=ca-pub-9973079271836529",
    "3938-marketjs": "data-ad-client=ca-pub-9973079271836529",
    "3938-behappy": "data-ad-client=ca-pub-9973079271836529",
    "3938-91games": "data-ad-client=ca-pub-9973079271836529",
    "3938-cpsense": "data-ad-client=ca-pub-9973079271836529",
    "3938-cpsense-cd": "data-ad-client=ca-pub-9973079271836529",
    "1323-marketjs": "data-ad-client=ca-pub-5985150674191762",
    "1323-behappy": "data-ad-client=ca-pub-5985150674191762",
    "1323-91games": "data-ad-client=ca-pub-5985150674191762",
    "1323-cpsense": "data-ad-client=ca-pub-5985150674191762",
    "1323-cpsense-cd": "data-ad-client=ca-pub-5985150674191762",
    "3942-marketjs": "data-ad-client=ca-pub-4230754353315567",
    "3942-behappy": "data-ad-client=ca-pub-4230754353315567",
    "3942-91games": "data-ad-client=ca-pub-4230754353315567",
    "3942-cpsense": "data-ad-client=ca-pub-4230754353315567",
    "3942-cpsense-cd": "data-ad-client=ca-pub-4230754353315567",
    "3553-marketjs": "data-ad-client=ca-pub-8934204454340791",
    "3553-behappy": "data-ad-client=ca-pub-8934204454340791",
    "3553-91games": "data-ad-client=ca-pub-8934204454340791",
    "3553-cpsense": "data-ad-client=ca-pub-8934204454340791",
    "3553-cpsense-cd": "data-ad-client=ca-pub-8934204454340791",
    "3884-behappy": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-play.6xfun.com/play.6xfun.com-reward-070801&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&vpos=preroll&output=vast&env=vp&impl=s&correlator=",
    "3884-cpsense-cd": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-play.6xfun.com/play.6xfun.com-reward-070801&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&vpos=preroll&output=vast&env=vp&impl=s&correlator=",
    "3884-marketjs": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-play.6xfun.com/play.6xfun.com-reward-070801&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&vpos=preroll&output=vast&env=vp&impl=s&correlator=",
    "4073-marketjs": "/68700844/nor0308/Incentive-01-nor0308",
    "4073-behappy": "/68700844/nor0308/Incentive-01-nor0308",
    "4073-91games": "/68700844/nor0308/Incentive-01-nor0308",
    "4073-cpsense": "/68700844/nor0308/Incentive-01-nor0308",
    "4073-cpsense-cd": "/68700844/nor0308/Incentive-01-nor0308",
    "3887-marketjs": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-game.6xfun.com/game.6xfun.com-reward-071401&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&vpos=preroll&output=vast&env=vp&impl=s&correlator=",
    "3887-behappy": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-game.6xfun.com/game.6xfun.com-reward-071401&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&vpos=preroll&output=vast&env=vp&impl=s&correlator=",
    "3887-cpsense-cd": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-game.6xfun.com/game.6xfun.com-reward-071401&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&vpos=preroll&output=vast&env=vp&impl=s&correlator=",
    "3890-marketjs": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-hi.6xfun.com/hi.6xfun.com-reward-071401&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&vpos=preroll&output=vast&env=vp&impl=s&correlator=",
    "3890-behappy": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-hi.6xfun.com/hi.6xfun.com-reward-071401&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&vpos=preroll&output=vast&env=vp&impl=s&correlator=",
    "3890-cpsense-cd": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-hi.6xfun.com/hi.6xfun.com-reward-071401&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&vpos=preroll&output=vast&env=vp&impl=s&correlator=",
    "3882-marketjs": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-www.6xfun.com/www.6xfun.com-reward-071401&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&output=vast&env=vp&impl=s&vpos=preroll&correlator=",
    "3882-behappy": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-www.6xfun.com/www.6xfun.com-reward-071401&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&output=vast&env=vp&impl=s&vpos=preroll&correlator=",
    "3882-cpsense-cd": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-www.6xfun.com/www.6xfun.com-reward-071401&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&output=vast&env=vp&impl=s&vpos=preroll&correlator=",
    "3885-marketjs": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-hot.6xfun.com/hot.6xfun.com-reward-071401&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&output=vast&env=vp&impl=s&vpos=preroll&correlator=",
    "3885-behappy": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-hot.6xfun.com/hot.6xfun.com-reward-071401&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&output=vast&env=vp&impl=s&vpos=preroll&correlator=",
    "3885-cpsense-cd": "https://pubads.g.doubleclick.net/gampad/ads?iu=/23269691274/h5-hot.6xfun.com/hot.6xfun.com-reward-071401&description_url=http%3A%2F%2F6xfun.com&tfcd=0&npa=0&sz=300x250%7C400x300%7C640x480&gdfp_req=1&unviewed_position_start=1&output=vast&env=vp&impl=s&vpos=preroll&correlator=",
    "4107-marketjs": "/68700844/nor3333/Incentive-01-nor3333",
    "4107-behappy": "/68700844/nor3333/Incentive-01-nor3333",
    "4107-91games": "/68700844/nor3333/Incentive-01-nor3333",
    "4107-cpsense": "/68700844/nor3333/Incentive-01-nor3333",
    "4107-cpsense-cd": "/68700844/nor3333/Incentive-01-nor3333",
    "4006-marketjs": "data-ad-client=ca-pub-6201795131710027",
    "4006-behappy": "data-ad-client=ca-pub-6201795131710027",
    "4006-91games": "data-ad-client=ca-pub-6201795131710027",
    "4006-cpsense": "data-ad-client=ca-pub-6201795131710027",
    "4006-cpsense-cd": "data-ad-client=ca-pub-6201795131710027",
    "4049-marketjs": "data-ad-client=ca-pub-6201795131710027",
    "4049-behappy": "data-ad-client=ca-pub-6201795131710027",
    "4049-91games": "data-ad-client=ca-pub-6201795131710027",
    "4049-cpsense": "data-ad-client=ca-pub-6201795131710027",
    "4049-cpsense-cd": "data-ad-client=ca-pub-6201795131710027",
    "4007-marketjs": "data-ad-client=ca-pub-6201795131710027",
    "4007-behappy": "data-ad-client=ca-pub-6201795131710027",
    "4007-91games": "data-ad-client=ca-pub-6201795131710027",
    "4007-cpsense": "data-ad-client=ca-pub-6201795131710027",
    "4007-cpsense-cd": "data-ad-client=ca-pub-6201795131710027",
    "4008-marketjs": "data-ad-client=ca-pub-6201795131710027",
    "4008-behappy": "data-ad-client=ca-pub-6201795131710027",
    "4008-91games": "data-ad-client=ca-pub-6201795131710027",
    "4008-cpsense": "data-ad-client=ca-pub-6201795131710027",
    "4008-cpsense-cd": "data-ad-client=ca-pub-6201795131710027",
    "4094-marketjs": "data-ad-client=ca-pub-6201795131710027",
    "4094-behappy": "data-ad-client=ca-pub-6201795131710027",
    "4094-91games": "data-ad-client=ca-pub-6201795131710027",
    "4094-cpsense": "data-ad-client=ca-pub-6201795131710027",
    "4094-cpsense-cd": "data-ad-client=ca-pub-6201795131710027",
    "4109-marketjs": "/23260759350/fine350/01-reward-fine350",
    "4109-behappy": "/23260759350/fine350/01-reward-fine350",
    "4109-91games": "/23260759350/fine350/01-reward-fine350",
    "4109-cpsense": "/23260759350/fine350/01-reward-fine350",
    "4109-cpsense-cd": "/23260759350/fine350/01-reward-fine350",
    "311-marketjs": "data-ad-client=ca-pub-9261379780030863",
    "311-behappy": "data-ad-client=ca-pub-9261379780030863",
    "311-91games": "data-ad-client=ca-pub-9261379780030863",
    "311-cpsense": "data-ad-client=ca-pub-9261379780030863",
    "311-cpsense-cd": "data-ad-client=ca-pub-9261379780030863",
    "3917-marketjs": "data-ad-client=ca-pub-4134851517660003",
    "221-91games": "/23260026613/h5-game/h5-game-rewarded-91games",
    "221-cpsense": "/23260026613/h5-game/h5-game-rewarded-cpsense",
    "221-cpsense-cd": "/23260026613/h5-game/h5-game-rewarded-cpsense-cd",
    "4300-91games": "data-ad-client=ca-pub-3126784834320338",
    "4300-cpsense": "data-ad-client=ca-pub-3126784834320338",
    "4300-cpsense-cd": "data-ad-client=ca-pub-3126784834320338",
    "4300-behappy": "data-ad-client=ca-pub-3126784834320338",
    "4348-behappy": "data-ad-client=ca-pub-3126784834320338",
    "4348-91games": "data-ad-client=ca-pub-3126784834320338",
    "4348-cpsense": "data-ad-client=ca-pub-3126784834320338",
    "4348-cpsense-cd": "data-ad-client=ca-pub-3126784834320338",
    "4319-behappy": "data-ad-client=ca-pub-3126784834320338",
    "4319-91games": "data-ad-client=ca-pub-3126784834320338",
    "4319-cpsense": "data-ad-client=ca-pub-3126784834320338",
    "4319-cpsense-cd": "data-ad-client=ca-pub-3126784834320338",
    "marketjs": "/23260026613/h5-game/h5-game-rewarded",
    "behappy": "/23260026613/h5-game/h5-game-rewarded",
    "91games": "/23260026613/h5-game/h5-game-rewarded-91games",
    "cpsense": "/23260026613/h5-game/h5-game-rewarded-cpsense",
    "cpsense-cd": "/23260026613/h5-game/h5-game-rewarded-cpsense-cd",
    "default_ads": "/23260026613/h5-game/h5-game-rewarded"
};