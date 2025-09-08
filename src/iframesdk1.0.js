class iframeSdk {
    constructor() {
        this.pushtime = 1; // 默认推送间隔，单位秒

        // 事件监听器容器（用于实例级别订阅）
        this._listeners = {};

        // 封闭的事件总线（不暴露到 window），供同域脚本通过实例访问
        this.events_iframe = {
            listeners: {
                'game_time': [],
                'game_score': [],
                'game_level': [],
                'level_end': []
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

        this.setupMessageListener();
        // 初始化完成日志
        try {
            this.__sdklog3('iframeSdk 初始化成功');
        } catch (e) {
            this.__sdklog3('iframeSdk 初始化日志打印失败', e && e.message);
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

    setupMessageListener() {
        // 监听来自游戏iframe的postMessage
        window.addEventListener('message', (event) => {
            try {
                const data = event.data;
                if (!data || typeof data !== 'object') return;

                // 处理新的统一消息格式
                if (data.type === 'ifamesdkmessage' && Array.isArray(data.data)) {
                    this.handleifamesdkMessage(data.data);
                }
                else if (data.type === 'adsdkmessage' && Array.isArray(data.data)) {
                    this.handleifamesdkMessage(data.data);
                }
            } catch (error) {
                console.warn('处理游戏状态消息失败:', error);
            }
        });

        this.__sdklog3('[GameStatus] 消息监听器已设置');
    }

    /**
     * 处理新的ifamesdkmessage格式消息
     * @param {Array} messageArray - 包含多个事件的数组
     */
    handleifamesdkMessage(messageArray) {
        this.__sdklog3('[GameStatus] 收到包含', messageArray.length, '个事件');

        messageArray.forEach(message => {
            this.__sdklog3('[GameStatus] 收到', message.type, '|', message.value);
            try {
                switch (message.type) {
                    case 'GAME_TIME':

                        // 封闭的事件总线 emit（不暴露到 window）
                        this.events_iframe.emit('game_time', message.value);
                        break;
                    case 'GAME_SCORE':

                        this.events_iframe.emit('game_score', message.value);
                        break;
                    case 'GAME_LEVEL':

                        this.events_iframe.emit('game_level', message.value);
                        break;
                    case 'LEVEL_END':

                        this.events_iframe.emit('level_end', message.value);
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
                        this.__sdklog3('[GameStatus] 未知消息类型:', message.type);
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
    setSdkPushTime(seconds) {
        const iframe = document.getElementById('game-preview');
        if (!iframe) return;

        try {
            const v = Number(seconds) || 1;
            // 使用统一命令格式 ifamesdkcommand，子页面 sdk 会监听并处理
            iframe.contentWindow.postMessage({ type: 'iframecommand', command: 'SET_PUSHTIME', value: v }, '*');
            this.__sdklog3('[Preview] 已向 iframe 发送 SET_PUSHTIME:', v);
        } catch (e) {
            console.warn('[Preview] 发送 SET_PUSHTIME 失败:', e && e.message);
        }
    }
}


const IframeSdk = new iframeSdk();

// 将 setSdkPushTime 绑定到实例上，确保正确的 this
window.setSdkPushTime = IframeSdk.setSdkPushTime.bind(IframeSdk);

// 对外暴露实例（兼容旧代码）
window.IframeSdk = IframeSdk;


