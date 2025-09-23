// 监听内部事件
events_iframe

// 接收内嵌页上行事件
 window.addEventListener('message',(event)=>{})

// 接收外部anroid下行事件
window.CpsenseAppEventCallBack


全局接口数据格式,以事件类型进行定义 messageArray = [{type:name,value:111},...] //支持多事件

上行发送数据分为:
1 直接向android 约定接口:window.CpsenseAppEvent.events(JSON.stringify(messageArray));
2 通过iframe 使用window.parent.postMessage(JSON.stringify(messageArray), '*');


下行接收数据分为:
1 直接从adnroid 约定接口:window.CpsenseAppEventCallBack(event){
     eventCallback(event)

}

2 从iframe 接收 window.addEventListener('message', (event) => {

    eventCallback(event.data)
});

eventcallback(messageArray){
    let parsed = null;

    if (typeof messageArray === 'string') {
        parsed = JSON.parse(messageArray);
    } else {
        parsed = messageArray;
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

    normalized.forEach(message => {
        let self = this;
        console.log('[adsStatus] 收到', message.type, '|', message.value);
        // 进行事件分支处理...
    })
}
