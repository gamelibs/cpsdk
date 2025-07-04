/**
 * CPSDK 1.1
 * 2025-06-23
 * 配置:3种广告
 * URL?vb=beta开始测试广告
 * 可以不回调beforeAd()
 * 只有adsense有首次判定is_first
 * 修改首次广告为preroll(20250703)
 */

class adSdk {
    constructor(config) {
        this.config = config;
        this.adSdk_isReady = true;

        window.dataLayer = window.dataLayer || [];
        this.gameid = new URLSearchParams(document.location.search).get("gameid");
        this.pubid = new URLSearchParams(document.location.search).get("pubid");
        this.ret = new URLSearchParams(document.location.search).get("ret");
        this.is_ad_test = new URLSearchParams(document.location.search).get("vb") === "beta";
        this.dev_name = new URLSearchParams(document.location.search).get("dev") || this.config.client || 'default';
        this.gamePlayTimer = null;
        this._insert_tagmanager();

        this._eventAds = {
            listeners: {
                'ready': [],
                'beforeAd': [],
                'afterAd': [],
                'adDismissed': [],
                'adViewed': [],
                'error': [],
                'interstitial': [],
                'reward': [],
            },
            on(eventName, callback) {
                if (!this.listeners[eventName]) {

                    return;
                }
                this.listeners[eventName].push(callback);
            },
            emit(eventName, ...args) {
                if (!this.listeners[eventName]) {

                    return;
                }
                this.listeners[eventName].forEach(callback => {
                    callback(...args);
                });
            },
            off(eventName, callback) {
                if (!this.listeners[eventName]) {

                    return;
                }
                this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
            }
        }

        this.is_adsense = null;//是否adsense广告
        this.is_gpt = false; // 是否gpt广告
        this.is_ima = false; // 是否adx广告
        this.ads_code = null; // adsense广告代码
        this.gpt_code = null; // gpt广告代码
        this.ima_code = null; // adx广告代码
        this.adType = null;
        this.adx_type = null; // adx广告类型
        this.gpt_type = null; // gpt广告类型
        this.adsense_type = null; // adsense广告类型
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


        this.adsType = { ADSENSE: 'adsense', IMA: 'ima', GPT: 'gpt' }; // 广告类型

        // ads事件流程 
        this._eventAds.on('ready', (param1, param2) => {
            this.__sdklog(param1, param2);
        })

        this._eventAds.on('interstitial', (param1) => {
            window.gtag('event', 'game_interstitialad', { send: 'sdk', 'ad_type': this.adType });
            this.__sdklog(param1, this.adType);
        })

        this._eventAds.on('reward', (param1) => {
            window.gtag('event', 'game_reward', { send: 'sdk', 'ad_type': this.adType });
            this.__sdklog(param1, this.adType);
        })

        this._eventAds.on('beforeAd', (param1, param2) => {

            if (this.adx_type === "rewardedAd" || param1 === "rewardedAd") {
                window.gtag('event', 'game_reward_open', { send: 'sdk', 'ad_type': this.adType });

            } else {

                window.gtag('event', 'game_interstitialad_open', { send: 'sdk', 'ad_type': this.adType });
            }
            this.__sdklog2("*******adevent**********", param1, param2, this.adType);
        })

        this._eventAds.on('adDismissed', (param1) => {
            window.gtag('event', 'game_reward_dismissed', { send: 'sdk', 'ad_type': this.adType });
            this.__sdklog2("*******adevent**********", param1, this.adType);
        })

        this._eventAds.on('adViewed', (param1) => {
            window.gtag('event', 'game_reward_viewed', { send: 'sdk', 'ad_type': this.adType });
            this.__sdklog2("*******adevent**********", param1, this.adType);
        })

        this._eventAds.on('afterAd', (param1, param2) => {
            window.gtag('event', 'game_interstitialad_viewed', { send: 'sdk', 'ad_type': this.adType });
            this.__sdklog2("*******adevent**********", param1, param2, this.adType);
        })

        this._eventAds.on('error', (param1, param2) => {

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
                    break;
                case 'viewed':
                case 'dismissed':
                    break;
                default:
                    window.gtag('event', 'ad_error', { 'ad_error_type': param2, send: 'sdk', 'ad_type': this.adType });
                    break;
            }
            if (param2 !== 'viewed' && param2 !== 'dismissed') {

                this.__sdklog2("*******adevent**********", param1, param2, this.adType);
            }
        })

        this._initAds();

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



    // 判断广告类型ad_type,根据pubid和dev来获取广告代码
    _initAds() {

        // type_1: adsense
        // type_2: adx
        // type_3: gpt

        let code = ads_list[this.pubid + '-' + this.dev_name] || ads_list[this.dev_name] || ads_list['default_ads'];

        if (code) {

            if (code.startsWith('data-ad-client')) {
                this.adType = this.adsType.ADSENSE;
                this.is_adsense = true;
                this.ads_code = code; // adsense广告代码
                this._openAdsense();
                return;
            }

            if (code.startsWith('https://pubads.g.doubleclick.net/gampad/ads?iu=')) {
                this.adType = this.adsType.IMA;
                this.is_gpt = true; // adx
                this.ima_code = code; // adx广告代码
                this._openIma();
                return;
            }

            if (/^\/\d[^\/]*\//.test(code)) {
                this.adType = this.adsType.GPT;
                this.gpt_code = code;
                this._openGPT();
                return;
            }

            this._openIma(vast_url);

        }

    }

    _timeoutTimer_load = null;

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
                    this._eventAds.emit('ready', "adSdk_isReady:true", "s");
                }
            });

            this._timeoutTimer_load = setTimeout(() => {
                clearTimeout(this._timeoutTimer_load);
                if (!isTimeOut) {
                    this._eventAds.emit('error', "timeout", "notReady-adsense");
                }
            }, 10000);
        }

        adsense_Script.onerror = (error) => {

            this._eventAds.emit('error', "error", "not-loaded-adsense");
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
            this._eventAds.emit('error', "error", "not-loaded-adx");
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
                                self._eventAds.emit('error', 'error', "No ad returned for rewarded ad slot.");
                                if (self.gpt_callback && typeof self.gpt_callback.error === 'function') {
                                    self.gpt_callback.error("No ad returned for rewarded ad slot.");
                                }
                            }
                        }
                    } catch (e) {
                        console.log('event.isEmpty err', e);
                    }
                });

                window.googletag.enableServices();

            });

        }

        gpt_script.onerror = () => {
            this._eventAds.emit('error', "error", "not-loaded-gpt");
            this.__sdklog("gpt load error");
        }
    }

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
            self._eventAds.emit('error', 'error', 'notReady');
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
            self._eventAds.emit('error', 'error', 'notReady');
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

                self._eventAds.emit('error', errorType, errorMessage);
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

        this._eventAds.emit('error', errorType, errorMessage);
        if (this.adx_callback && typeof this.adx_callback.error === 'function') {
            this.adx_callback.error(errorType);
        }

    }

    _showAdx() {

        let self = this;

        // 检查Google IMA SDK是否加载成功
        if (typeof google === 'undefined' || typeof google.ima === 'undefined') {
            self.req_ad_timeout = false; // 重置超时标志，防止后续timeout
            self._eventAds.emit('error', 'error', 'notReady');
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

        self._createAdxDom();


        self.adContainer = document.getElementById('adx-adContainer');
        self.videoContent = document.getElementById('adx-contentElement');


        if (!self.adContainer || !self.videoContent) {
            self.req_ad_timeout = false; // 重置超时标志，防止后续timeout
            self._destroyAdxDom(); // 清理广告容器
            self._eventAds.emit('error', 'error', 'notReady');
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
                self._eventAds.emit('error', 'error', 'timeout');
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
            self._eventAds.emit('error', 'error', 'initError');
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
            self._eventAds.emit('error', 'error', 'notReady');
            if (self.gpt_callback && typeof self.gpt_callback.error === 'function') {
                self.gpt_callback.error('notReady');
            }
            return;
        }

        let gpt_code = self.is_ad_test ? self._getTestAdxUrl("gpt") : self.gpt_code;

        // 设置一个备用超时，如果30秒内没有任何GPT事件响应，直接报错
        self.gptBackupTimeout = setTimeout(() => {
            if (self.req_ad_timeout) {

                self.req_ad_timeout = false;
                self._eventAds.emit('error', 'error', 'gpt_no_response');
                if (self.gpt_callback && typeof self.gpt_callback.error === 'function') {
                    self.gpt_callback.error('gpt_no_response');
                }
            }
        }, 30000);

        window.googletag.cmd.push(() => {
            // 创建新的广告位
            self.rewardedSlot = window.googletag.defineOutOfPageSlot(
                gpt_code,
                window.googletag.enums.OutOfPageFormat.REWARDED,
            );

            if (self.rewardedSlot) {
                self.rewardedSlot.addService(window.googletag.pubads());
                window.googletag.display(self.rewardedSlot);

            } else {

                if (self.gptBackupTimeout) {
                    clearTimeout(self.gptBackupTimeout);
                    self.gptBackupTimeout = null;
                }
                self.req_ad_timeout = false;
                self._eventAds.emit('error', 'error', 'create_slot_failed');
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
            self._eventAds.emit('error', "error", "notReady-adsense");
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
                    self._eventAds.emit('error', "reward_error", breakStatus);
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
                        self._eventAds.emit('error', "interstitial_error", breakStatus);

                        if (breakStatus !== 'viewed') {
                            if (typeof self.adsense_callback.error === 'function') self.adsense_callback.error(breakStatus);
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
                        self._eventAds.emit('error', "interstitial_error", breakStatus);

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
        //     self._eventAds.emit('error', "error", "notReady");
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
                self._eventAds.emit('error', "error", "timeout");
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
                self._eventAds.emit('error', "frequencyinterstitialAd", 'frequencyinterstitialAd');
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


        } else if (self.adType === self.adsType.GPT) {
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


    }

    _debounceTimer_reward = null;
    _timeoutTimer_reward = null;
    // 激励
    _showRewardAd(callback) {
        let self = this;

        // 检查SDK是否准备就绪
        // if (!self.adSdk_isReady) {
        //     if (typeof callback.error === 'function') callback.error("notReady");
        //     self._eventAds.emit('error', "error", "notReady");
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
                self._eventAds.emit('error', "error", "timeout");
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
            self._eventAds.emit('error', "frequencyrewardAd", 'frequencyrewardAd');
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
        }


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
                'dev_name': self.dev_name//self.config.client
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
                'game_interstitialad_viewed'
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
                self.__sdklog3(arguments)
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
                }, 30000);
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
    "495-marketjs": "data-ad-client=ca-pub-2252168419307880,data-ad-host=ca-host-pub-5396158963872751,data-ad-host-channel=9271205033",
    "495-behappy": "data-ad-client=ca-pub-2252168419307880,data-ad-host=ca-host-pub-5396158963872751,data-ad-host-channel=4889854667",
    "495-91games": "data-ad-client=ca-pub-2252168419307880,data-ad-host=ca-host-pub-5396158963872751,data-ad-host-channel=9806299103",
    "495-cpsense": "data-ad-client=ca-pub-2252168419307880,data-ad-host=ca-host-pub-5396158963872751,data-ad-host-channel=6594334796",
    "316-cpsense": "https:\/\/pubads.g.doubleclick.net\/gampad\/ads?iu=\/22846978691\/h5-bwg-vast\/400x300-4174cpsense-id00316-bwg&description_url=https%3A%2F%2Fwww.bestbox.top&tfcd=0&npa=0&sz=400x300%7C640x480&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=",
    "316-marketjs": "https:\/\/pubads.g.doubleclick.net\/gampad\/ads?iu=\/22846978691\/h5-bwg-vast\/400x300-4174cpsense-id00316-bwg&description_url=https%3A%2F%2Fwww.bestbox.top&tfcd=0&npa=0&sz=400x300%7C640x480&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=",
    "316-91games": "https:\/\/pubads.g.doubleclick.net\/gampad\/ads?iu=\/22846978691\/h5-bwg-vast\/400x300-4174cpsense-id00316-bwg&description_url=https%3A%2F%2Fwww.bestbox.top&tfcd=0&npa=0&sz=400x300%7C640x480&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=",
    "316-behappy": "https:\/\/pubads.g.doubleclick.net\/gampad\/ads?iu=\/22846978691\/h5-bwg-vast\/400x300-4174cpsense-id00316-bwg&description_url=https%3A%2F%2Fwww.bestbox.top&tfcd=0&npa=0&sz=400x300%7C640x480&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=",
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
    "3553-marketjs": "data-ad-client=ca-pub-8934204454340791,data-ad-host=ca-host-pub-5396158963872751,data-ad-host-channel=9271205033",
    "3553-behappy": "data-ad-client=ca-pub-8934204454340791,data-ad-host=ca-host-pub-5396158963872751,data-ad-host-channel=4889854667",
    "3553-91games": "data-ad-client=ca-pub-8934204454340791,data-ad-host=ca-host-pub-5396158963872751,data-ad-host-channel=9806299103",
    "3553-cpsense": "data-ad-client=ca-pub-8934204454340791,data-ad-host=ca-host-pub-5396158963872751,data-ad-host-channel=6594334796",
    "3553-cpsense-cd": "data-ad-client=ca-pub-8934204454340791,data-ad-host=ca-host-pub-5396158963872751,data-ad-host-channel=9315884711",
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
    "193-marketjs": "\/91325758\/h5-bwg-game\/reward-game-ads",
    "193-behappy": "\/91325758\/h5-bwg-game\/reward-game-ads",
    "193-91games": "\/91325758\/h5-bwg-game\/reward-game-ads",
    "193-cpsense": "\/91325758\/h5-bwg-game\/reward-game-ads",
    "193-cpsense-cd": "\/91325758\/h5-bwg-game\/reward-game-ads",
    "3942-marketjs": "data-ad-client=ca-pub-4230754353315567",
    "3942-behappy": "data-ad-client=ca-pub-4230754353315567",
    "3942-91games": "data-ad-client=ca-pub-4230754353315567",
    "3942-cpsense": "data-ad-client=ca-pub-4230754353315567",
    "3942-cpsense-cd": "data-ad-client=ca-pub-4230754353315567",
    "marketjs": "data-ad-client=ca-pub-5396158963872751",
    "behappy": "data-ad-client=ca-pub-5396158963872751",
    "91games": "data-ad-client=ca-pub-5396158963872751,data-ad-channel=9348592544",
    "cpsense": "data-ad-client=ca-pub-5396158963872751,data-ad-channel=6920911773",
    "cpsense-cd": "data-ad-client=ca-pub-5396158963872751,data-ad-channel=6940252753",
    "default_ads": "data-ad-client=ca-pub-5396158963872751,data-ad-channel=4449826950"
}