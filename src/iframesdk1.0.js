/**
 * iframeSdk 1.0
 * 支持iframe内嵌游戏与宿主页面的消息通信(20250923)
 * 支持android广告调用,上下桥接(20250923)
 */

class iframeSdk {
    constructor() {
        this.pushtime = 3; // 默认推送间隔，单位秒

        this.isAndroid = (!!window.CpsenseAppEvent && typeof window.CpsenseAppEvent.events === 'function');

        // 封闭的事件，供同域脚本通过实例访问
        this.events_iframe = {
            listeners: {
                'game_time': [],
                'game_start': [],
                'game_score': [],
                'game_level': [],
                'level_end': [],
                'interstitial': [],
                'reward': [],
                'beforeAd': [],
                'interstitial_open': [],
                'afterAd': [],
                'interstitial_viewed': [],
                'reward_dismissed': [],
                'reward_viewed': [],
                'ad_error': [],
            },
            on(eventName, callback) {
                if (!this.listeners[eventName]) return;
                if (typeof callback !== 'function') return;
                this.listeners[eventName].push(callback);
            },
            emit(eventName, ...args) {
                if (!this.listeners[eventName]) return;
                this.listeners[eventName].forEach(cb => {
                    try { cb(...args); } catch (e) { console.warn('events_iframe callback error', e && e.message); }
                });
            },
            off(eventName, callback) {
                if (!this.listeners[eventName]) return;
                if (!callback) { this.listeners[eventName] = []; return; }
                this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
            }
        };

        // 监听iframe 的 postMessage 上行
        window.addEventListener('message', (event) => {
            try {
                const raw = event.data;

                // 支持 stringified JSON、单对象或数组三种输入形式，最终规范为 [{type, value}, ...]
                let parsed = null;
                if (typeof raw === 'string') {
                    try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
                } else {
                    parsed = raw;
                }

                // 强制只接收数组：如果是单个对象则封装为数组，否则忽略
                if (!Array.isArray(parsed)) {
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
                        normalized.push({ type, value, __raw: item });
                    } catch (e) {
                        continue;
                    }
                }

                if (!normalized.length) return;

                this.__sdklog3('[IframeSdk] 收到Android广告状态查询请求(app_ads_event/is_ads_native)');

                normalized.forEach(message => {
                    this.__sdklog3('[GameStatus] 收到', message.type, '|', message.value);
                    try {
                        switch (message.type) {
                            case 'GAME_TIME':

                                this.events_iframe.emit('game_time', message.value);
                                if (this.isAndroid) {
                                    window.CpsenseAppEvent.events(JSON.stringify([{ type: message.type, value: message.value }]));
                                }
                                break;

                            case 'GAME_START':

                                this.events_iframe.emit('game_start', message.value);
                                if (this.isAndroid) {
                                    window.CpsenseAppEvent.events(JSON.stringify([{ type: message.type, value: message.value }]));
                                }
                                break;

                            case 'LEVEL_START':

                                this.events_iframe.emit('level_start', message.value);
                                if (this.isAndroid) {
                                    window.CpsenseAppEvent.events(JSON.stringify([{ type: message.type, value: message.value }]));
                                }
                                break;
                            case 'LEVEL_END':

                                this.events_iframe.emit('level_end', message.value);
                                this.events_iframe.emit('game_score', message.value.score);
                                this.events_iframe.emit('game_level', message.value.level || message.value.level_name);
                                if (this.isAndroid) {
                                    window.CpsenseAppEvent.events(JSON.stringify([{ type: message.type, value: message.value }]));
                                }
                                break;
                            case 'app_ads_event':
                                if (this.isAndroid) {
                                    window.CpsenseAppEvent.events(JSON.stringify([{ type: message.type, value: message.value }]));
                                } else {
                                    console.warn('[IframeSdk] 非安卓环境，忽略 app_ads_event 请求');
                                    this._postMessageToIframe({ type: 'app_ads_on', value: false });
                                }

                                break;
                            case 'interstitial':

                                this.events_iframe.emit('interstitial', message.value);
                                if (this.isAndroid) {
                                    window.CpsenseAppEvent.events(JSON.stringify([{ type: message.type, value: message.value }]));
                                }
                                break;
                            case 'reward':

                                this.events_iframe.emit('reward', message.value);
                                if (this.isAndroid) {
                                    window.CpsenseAppEvent.events(JSON.stringify([{ type: message.type, value: message.value }]));
                                }
                                break;

                            default:
                                this.events_iframe.emit(message.type, message.value);
                                if (this.isAndroid) {
                                    window.CpsenseAppEvent.events(JSON.stringify([{ type: message.type, value: message.value }]));
                                }

                        }
                    } catch (error) {
                        console.warn('[GameStatus] 处理消息失败:', message, error);
                    }
                });


            } catch (e) {
                console.warn('[IframeSdk] 处理消息失败:', e);
            }
        });

        // 原生回调：下行
        window.CpsenseAppEventCallBack = (messageArray) => {
            if (this.isAndroid) {
                const self = this;
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
                    self.__sdklog3('[GameStatus] 收到', message.type, '|', message.value);
                    try {
                        switch (message.type) {
                            case 'app_ads_on':
                                this._postMessageToIframe({ type: 'app_ads_on', value: message.value });
                                break;
                            case 'set_pushtime':
                                this._postMessageToIframe({ type: 'set_pushtime', value: message.value });
                                break;
                            case 'beforeAd':
                                this._postMessageToIframe({ type: 'beforeAd', value: message.value });
                                break;
                            case 'afterAd':
                                this._postMessageToIframe({ type: 'afterAd', value: message.value });
                                break;
                            case 'adViewed':
                                this._postMessageToIframe({ type: 'adViewed', value: message.value });
                                break;
                            case 'adDismissed':
                                this._postMessageToIframe({ type: 'adDismissed', value: message.value });
                                break;
                            case 'ad_error':
                                this._postMessageToIframe({ type: 'ad_error', value: message.value });
                                break;
                            default:
                                this.__sdklog3('[GameStatus] 未知消息类型，忽略:', message.type, message.value);

                        }
                    } catch (error) {
                        console.warn('[GameStatus] 处理消息失败:', message, error);
                    }
                })
            }
        };

        // 初始化完成日志
        this.__sdklog3('iframeSdk 初始化成功');
    }


    /**
     * 通用的向iframe发送消息的封装方法
     * @param {Object} message - 要发送的消息对象
     * @param {string|HTMLElement|Window} target - 目标iframe
     * @param {string} logPrefix - 日志前缀
     * @returns {boolean} - 发送是否成功
     */
    _postMessageToIframe(message, target, logPrefix = 'cpsense-iframe-message') {
        let win = null;
        let targetName = 'game-preview';

        if (!target) {
            // 默认查找iframe的逻辑
            let el = document.getElementById('game-preview');
            if (!(el && el.tagName === 'IFRAME')) {
                el = document.getElementById('gameFrame');
                targetName = 'gameFrame';
            }
            if (!(el && el.tagName === 'IFRAME')) {
                el = document.querySelector('.game-preview');
                targetName = '.game-preview';
            }
            if (!(el && el.tagName === 'IFRAME')) {
                el = document.querySelector('iframe');
                targetName = 'first iframe';
            }
            if (el && el.tagName === 'IFRAME') {
                win = el.contentWindow;
            }
        } else if (typeof target === 'string') {
            const el = document.getElementById(target);
            if (el && el.tagName === 'IFRAME') {
                win = el.contentWindow;
                targetName = target;
            }
        } else if (target instanceof Window) {
            win = target;
            targetName = 'window object';
        } else if (target && target.tagName === 'IFRAME') {
            win = target.contentWindow;
            targetName = target.id || 'iframe element';
        }

        if (!win) {
            console.warn(`[IframeSdk] ${logPrefix} send failed: no target iframe found`);
            return false;
        }

        try {
            win.postMessage(message, '*');
            this.__sdklog3(`[IframeSdk] sent ${logPrefix} to ${targetName}:`, JSON.stringify(message));
            return true;
        } catch (e) {
            console.warn(`[IframeSdk] postMessage ${logPrefix} error:`, e);
            return false;
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
            `%c ***Ifamesdk***: ${params}`,

            'background-color: #390000ff; ' +
            'border: 2px solid #00ff00; ' +
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
            `%c ***Ifamesdk***: ${params}`,
            'background: linear-gradient(to right, #50ad44ff, #43ff9eff); ' +
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
            `%c ***Ifamesdk***: ${params}`,
            'background: linear-gradient(to right,rgba(157, 173, 68, 1),rgba(167, 173, 4, 1)); ' +
            'color: white; ' +
            'padding: 5px 15px; ' +
            'border-radius: 5px; ' +
            'font-weight: bold; ' +
            'text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);'

        );
    }

}


var IframeSdk = new iframeSdk();

window.IframeSdk = IframeSdk;


