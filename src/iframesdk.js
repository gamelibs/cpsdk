class iframeSdk {
    constructor() {
        this.pushtime = 1; // 默认推送间隔，单位秒

        this.setupMessageListener();

        essageListener();
    }

    setupMessageListener() {
        // 监听来自游戏iframe的postMessage
        window.addEventListener('message', (event) => {
            try {
                const data = event.data;
                if (!data || typeof data !== 'object') return;

                // 处理新的统一消息格式
                if (data.type === 'ovomessage' && Array.isArray(data.data)) {
                    this.handleOvoMessage(data.data);
                }
                else if (data.type === 'adsdkmessage' && Array.isArray(data.data)) {
                    this.handleOvoMessage(data.data);
                }
            } catch (error) {
                console.warn('处理游戏状态消息失败:', error);
            }
        });

        console.log('[GameStatus] 消息监听器已设置');
    }

    /**
     * 处理新的ovomessage格式消息
     * @param {Array} messageArray - 包含多个事件的数组
     */
    handleOvoMessage(messageArray) {
        console.log('[GameStatus] 收到ovomessage，包含', messageArray.length, '个事件');

        messageArray.forEach(message => {
            try {
                switch (message.type) {
                    case 'GAME_TIME':
                        this.updateTime(message.value);
                        break;
                    case 'GAME_SCORE':
                        this.updateScore(message.value);
                        break;
                    case 'GAME_LEVEL':
                        this.updateLevel(message.value);
                        break;
                    case 'GAME_STATUS':
                        // 处理完整状态更新
                        if (message.value && typeof message.value === 'object') {
                            if (message.value.time !== undefined) console.log(message.value.time) //this.updateTime(message.value.time);
                            if (message.value.score !== undefined) console.log(message.value.score) //this.updateScore(message.value.score);
                            if (message.value.level !== undefined) (message.value.level) // this.updateLevel(message.value.level);
                        }
                        break;
                    default:
                        console.log('[GameStatus] 未知消息类型:', message.type);
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
            // 使用统一命令格式 ovocommand，子页面 sdk 会监听并处理
            iframe.contentWindow.postMessage({ type: 'iframecommand', command: 'SET_PUSHTIME', value: v }, '*');
            console.log('[Preview] 已向 iframe 发送 SET_PUSHTIME:', v);
        } catch (e) {
            console.warn('[Preview] 发送 SET_PUSHTIME 失败:', e && e.message);
        }
    }
}


IframeSdk = new iframeSdk();


window.setSdkPushTime = IframeSdk.setSdkPushTime;


