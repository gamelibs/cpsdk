
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


        // 监听来自iframe的查询请求
        window.addEventListener('message', (event) => {
            try {
                const data = event.data;
                if (data && data.type === 'appevent' && data.value === 'is_android') {
                    this.__sdklog('[IframeSdk] 收到Android广告状态查询请求');
                    // 检查Android广告状态并响应
                    setTimeout(() => {
                        IframeSdk.sendAppAdsOn(true);
                    }, 100);
                }
            } catch (e) {
                console.warn('[IframeSdk] 处理消息失败:', e);
            }
        });

        window.CpsenseAppEventCallBack = function (callbackData) {
            try {
                const data = JSON.parse(callbackData);
                console.log('AndroidData:', data);
                // 原生回调数据处理
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
     * 通用的向iframe发送消息的封装方法
     * @param {Object} message - 要发送的消息对象
     * @param {string|HTMLElement|Window} target - 目标iframe
     * @param {string} logPrefix - 日志前缀
     * @returns {boolean} - 发送是否成功
     */
    _postMessageToIframe(message, target, logPrefix = 'message') {
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
            this.__sdklog(`[IframeSdk] sent ${logPrefix} to ${targetName}:`, JSON.stringify(message));
            return true;
        } catch (e) {
            console.warn(`[IframeSdk] postMessage ${logPrefix} error:`, e);
            return false;
        }
    }


    /**
     * 向 iframe 中的 SDK 发送 pushtime 更新
     * @param {number} seconds
     */
    setSdkPushTime(seconds, target) {
        const message = { type: 'iframecommand', command: 'SET_PUSHTIME', value: Number(seconds) || 1 };
        return this._postMessageToIframe(message, target, 'SET_PUSHTIME');
    }

    // 向子页发送 APP_ADS_ON 指令（默认目标 iframe 为 #game-preview）
    sendAppAdsOn(value = true, target) {
        const message = { type: 'APP_ADS_ON', value: !!value };
        return this._postMessageToIframe(message, target, 'APP_ADS_ON');
    }

    /**
     * 通用的向iframe发送消息方法（对外暴露）
     * @param {Object} message - 要发送的消息对象
     * @param {string|HTMLElement|Window} target - 目标iframe
     * @returns {boolean} - 发送是否成功
     */
    sendMessage(message, target) {
        return this._postMessageToIframe(message, target, 'custom message');
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


