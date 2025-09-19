
class iframeSdk {
    constructor() {
        this.pushtime = 3; // 默认推送间隔，单位秒

        // 事件监听器容器（用于实例级别订阅）
        this._listeners = {};

        // 封闭的事件总线（不暴露到 window），供同域脚本通过实例访问
        this.events_iframe = {
            listeners: {
                'game_time': [],
                'game_start': [],
                'game_score': [],
                'game_level': [],
                'level_end': [],
                'interstitial': [],
                'reward': [],
                'before_ad': [],
                'interstitial_open': [],
                'after_ad': [],
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

        // 初始化完成日志

        this.__sdklog3('iframeSdk 初始化成功');


        if (window.CpsenseAppEvent && typeof window.CpsenseAppEvent.events === 'function') {
            window.CpsenseAppEvent.events(JSON.stringify(this.adsdklayer));
            this.__sdklog('[adsdk] CpsenseAppEvent.events called with', JSON.stringify(this.adsdklayer));
        }


        window.CpsenseAppEventCallBack = function (callbackData) {
            try {
                const data = JSON.parse(callbackData);

                console.log('AndroidData:', data)
                // 如果原生回调标记 app 广告可用，则通知子页启用 ANDROID 广告
                if (data && (data.appads_on === true || data.type === 'APP_ADS_ON')) {
                    try {
                        IframeSdk.sendAppAdsOn(true);
                    } catch (e) {
                        console.warn('[IframeSdk] sendAppAdsOn failed', e);
                    }
                }
            } catch (e) {
                console.error('❌ 回调数据解析失败: ' + e.message);
            }
        };
    }





    /**
     * 处理新的ifamesdkmessage格式消息
     * @param {Array} messageArray - 包含多个事件的数组
     */
    handleifamesdkMessage(messageArray) {
        // this.__sdklog3('[GameStatus] 收到包含', messageArray.length, '个事件');

        if (window.CpsenseAppEvent && typeof window.CpsenseAppEvent.events === 'function') {
            window.CpsenseAppEvent.events(JSON.stringify(messageArray));
            this.__sdklog('[adsdk] CpsenseAppEvent.events called with', JSON.stringify(messageArray));
        }

        messageArray.forEach(message => {
            this.__sdklog3('[GameStatus] 收到', message.type, '|', message.value);
            try {
                switch (message.type) {
                    case 'GAME_TIME':

                        this.events_iframe.emit('game_time', message.value);
                        break;
                    case 'GAME_SCORE':

                        this.events_iframe.emit('game_score', message.value);
                        break;
                    case 'GAME_LEVEL':

                        this.events_iframe.emit('game_level', message.value);
                        break;

                    case 'GAME_START':

                        this.events_iframe.emit('game_start', message.value);
                        break;

                    case 'LEVEL_START':

                        this.events_iframe.emit('level_start', message.value);
                        break;
                    case 'LEVEL_END':

                        this.events_iframe.emit('level_end', message.value);
                        this.events_iframe.emit('game_score', message.value.score);
                        this.events_iframe.emit('game_level', message.value.level || message.value.level_name);
                        break;
                    case 'GAME_STATUS':
                        // 处理完整状态更新
                        if (message.value && typeof message.value === 'object') {
                            if (message.value.time !== undefined) this.__sdklog3(message.value.time)
                            if (message.value.score !== undefined) this.__sdklog3(message.value.score)
                            if (message.value.level !== undefined) this.__sdklog3(message.value.level)
                        }
                        break;
                    default:
                        this.events_iframe.emit(message.type, message.value);
                }
            } catch (error) {
                console.warn('[GameStatus] 处理消息失败:', message, error);
            }
        });
    }


    /**
     * 向 iframe 中的 SDK 发送 pushtime 更新
     * @param {number} seconds
     */
    setSdkPushTime(seconds, target) {
        // normalize target
        let win = null;
        if (!target) {
            // try common ids and selectors
            let el = document.getElementById('game-preview') || document.getElementById('gameFrame') || document.querySelector('.game-preview') || document.querySelector('iframe');
            if (el && el.tagName && el.tagName.toUpperCase() === 'IFRAME') {
                win = el.contentWindow;
            }
        } else if (typeof target === 'string') {
            // accept either an id or a selector
            let el = document.getElementById(target) || document.querySelector(target);
            if (el && el.tagName && el.tagName.toUpperCase() === 'IFRAME') win = el.contentWindow;
        } else if (target instanceof Window) {
            win = target;
        } else if (target && target.tagName && target.tagName.toUpperCase() === 'IFRAME') {
            win = target.contentWindow;
        }

        if (!win) {
            console.warn('[IframeSdk] send failed: no target iframe found');
            // help debugging: print available iframes
            try {
                const all = Array.from(document.getElementsByTagName('iframe')).map(f => ({ id: f.id, class: f.className, src: f.src }));
                console.warn('[IframeSdk] available iframes:', all);
            } catch (e) {}
            return false;
        }

        try {
            win.postMessage({ type: 'iframecommand', command: 'SET_PUSHTIME', value: Number(seconds) || 1 }, '*');
            console.log('[IframeSdk] sent SET_PUSHTIME to', (target || 'game-preview'), 'win=', !!win);
            return true;
        } catch (e) {
            console.warn('[IframeSdk] postMessage error', e);
            return false;
        }
    }

    // 向子页发送 APP_ADS_ON 指令（默认目标 iframe 为 #game-preview）
    sendAppAdsOn(value = true, target) {
        let win = null;
        if (!target) {
            let el = document.getElementById('game-preview');
            if (!(el && el.tagName === 'IFRAME')) {
                el = document.getElementById('gameFrame');
            }
            if (el && el.tagName === 'IFRAME') {
                win = el.contentWindow;
            }
        } else if (typeof target === 'string') {
            const el = document.getElementById(target);
            if (el && el.tagName === 'IFRAME') win = el.contentWindow;
        } else if (target instanceof Window) {
            win = target;
        } else if (target && target.tagName === 'IFRAME') {
            win = target.contentWindow;
        }

        if (!win) {
            console.warn('[IframeSdk] APP_ADS_ON send failed: no target iframe found');
            return false;
        }
        try {
            win.postMessage({ type: 'iframecommand', command: 'APP_ADS_ON', value: !!value }, '*');
            this.__sdklog('[IframeSdk] sent APP_ADS_ON to', target || 'game-preview');
            return true;
        } catch (e) {
            console.warn('[IframeSdk] postMessage APP_ADS_ON error', e);
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

            'background-color: #f9f9f9; ' +
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

// 将 setSdkPushTime 绑定到实例上，确保正确的 this
window.setSdkPushTime = IframeSdk.setSdkPushTime.bind(IframeSdk);

// 对外暴露实例（兼容旧代码）
window.IframeSdk = IframeSdk;

// 尝试在 DOM 就绪后调用 sendAppAdsOn，如果目标 iframe 尚未插入则重试几次
;(function callSendAppAdsOnWhenReady() {
    const maxAttempts = 6;
    let attempts = 0;

    function trySend() {
        attempts += 1;
        try {
            const ok = IframeSdk.sendAppAdsOn(true);
            if (ok) {
                console.log('[IframeSdk] sendAppAdsOn succeeded on attempt', attempts);
                return true;
            }
        } catch (e) {
            console.warn('[IframeSdk] sendAppAdsOn threw', e);
        }
        if (attempts < maxAttempts) {
            setTimeout(trySend, 250);
            return false;
        }
        console.warn('[IframeSdk] sendAppAdsOn failed after', attempts, 'attempts');
        return false;
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        trySend();
    } else {
        document.addEventListener('DOMContentLoaded', trySend, { once: true });
    }
})();