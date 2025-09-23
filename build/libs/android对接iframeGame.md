
android端实现功能:

接口数据格式,以事件类型进行定义 messageArray = [{type:name,value:111},...] //支持多事件

# Android <-> iframe 通信规范（给 Android 开发者参考）

本文档说明 CPSense iframe 游戏与 Android 原生侧的消息协议、必须实现的 JavaScript 接口、事件格式、示例代码与注意事项。

目标：

- 让 Web（iframe）与 Android（WebView）之间互相上报/下发事件，支持广告探测、广告触发、广告回调以及通用的游戏事件上报。
- 采用统一的消息格式：上行/下行均使用 JSON-stringified 的事件数组（messageArray）。

---

## 1. 消息格式

- 统一格式为数组：`messageArray = [{ type: string, value: any }, ...]`。
- 上游发送时请使用字符串化数组：`JSON.stringify(messageArray)`（iframe 端会同时接受直接的对象/数组，但推荐字符串化以保证兼容性）。

示例：

```js
// 单事件
JSON.stringify([{ type: 'game_start', value: { level: 1 } }])

// 多事件
JSON.stringify([
    { type: 'GAME_TIME', value: 123 },
    { type: 'LEVEL_END', value: { score: 100 } }
])
```

## 2. 必须在 Android 端注入的 JS 接口

- `window.CpsenseAppEvent.events(data: string)`
    - 功能：供 Web（iframe）主动上行事件到原生（Android）。
    - 参数：`data` 为 JSON 字符串（即 `JSON.stringify(messageArray)`）。

- `window.CpsenseAppEventCallBack`（可选的回调触发方式，详见下文）
    - 功能：原生向 Web 主动下发事件时调用该函数（可通过 evaluateJavascript 执行 JS 来调用）。
    - 约定：接收参数为 JSON 字符串或对象，形如 `JSON.stringify(messageArray)`。

> 备注：`window.addJavascriptInterface` 的注入名称可以是 `CpsenseAppEvent` 与 `CpsenseAppEventCallBack`，与 iframe 中调用的同名对象对应。

---

## 3. 事件清单（常用）

下面是常见事件的说明，分为上行（Web -> Native）和下行（Native -> Web）：

- 广告能力探测（阶段 1）
    - 上行（Web -> Native）：`{ type: 'app_ads_event', value: 'is_ads_native' }` — Web 向上询问是否启用 Android 广告。
    - 下行（Native -> Web）：`{ type: 'app_ads_on', value: true|false }` — Native 返回是否启用 Android 广告。

- 广告触发（阶段 2，上行）
    - 插页（interstitial）：`{ type: 'interstitial', value: 1 }`
    - 激励（reward）：`{ type: 'reward', value: 1 }`

- 广告回调/状态（阶段 3，下行）
    - `beforeAd`：`{ type: 'beforeAd', value: ... }` — 广告开始前，传递额外信息。
    - `afterAd`：`{ type: 'afterAd', value: ... }` — 广告结束后。
    - `adViewed`：`{ type: 'adViewed', value: ... }` — 广告已完整观看。
    - `adDismissed`：`{ type: 'adDismissed', value: ... }` — 广告被关闭/跳过。
    - `ad_error`：`{ type: 'ad_error', value: 'timeout'|'noAd'|... }` — 报错信息。

- 游戏相关（上行）
    - `game_start`：`{ type: 'game_start', value: { ... } }` — 游戏开始，value 可包含游戏信息。
    - `game_time`：`{ type: 'game_time', value: <seconds> }` — 游戏运行时间（秒）。
    - `level_start`：`{ type: 'level_start', value: { ... } }` — 关卡开始。
    - `level_end`：`{ type: 'level_end', value: { game_name, success, score, level_name, ... } }` — 关卡结束。

- 配置类下行
    - `set_pushtime`：`{ type: 'set_pushtime', value: <seconds> }` — 指示 Web 侧调整上报 pushtime（1~30，默认 3）。

> 注：以上事件并非强制全部实现，Android 端至少需实现 `events(data)` 接口用于接收 Web 发来的上行事件；若需要主动下发事件给 Web，请确保调用 `window.CpsenseAppEventCallBack(...)` 或者通过 evaluateJavascript 执行 JS 调用。

---

## 4. Android 端示例（注册与接收）

以下示例为常见的实现方式，Kotlin/Java 伪代码均可直接参考。

### Kotlin - 注入 JS 接口

```kotlin
// 在 Activity/Fragment 中
val gameBridge = GameDataBridge()
webView.addJavascriptInterface(gameBridge, "CpsenseAppEvent")
Log.d(TAG, "JavaScript interface 'CpsenseAppEvent' registered")

// 如果希望提供一个可被 JS 主动调用的回调对象（可选）
val eventCallBack = AndroidEventCallBack(webView)
webView.addJavascriptInterface(eventCallBack, "CpsenseAppEventCallBack")
```

### Kotlin - 接收上行 events

```kotlin
class GameDataBridge {
        @JavascriptInterface
        fun events(data: String) {
                // data 是 JSON 字符串：'[{"type":"game_start","value":{...}}, ...]'
                // 注意线程：addJavascriptInterface 的调用可能不是在主线程
                Handler(Looper.getMainLooper()).post {
                        // 解析 data 并处理事件
                }
        }
}
```

### Java - 接收上行 events

```java
public class GameDataBridge {
        @JavascriptInterface
        public void events(String data) {
                // 注意线程，UI 更新要 post 到主线程
        }
}
```

---

## 5. Android 向 Web 下发事件（稳健写法）

推荐直接把 payload 当作 JSON literal 嵌入到 evaluateJavascript 中：

```kotlin
// payload 例如: [{"type":"app_ads_on","value":true}]
val payload = "[{\"type\":\"app_ads_on\",\"value\":true}]"
val js = "(function(){ if (typeof window.CpsenseAppEventCallBack === 'function') { try{ window.CpsenseAppEventCallBack($payload); }catch(e){} } })()"
webView.post { webView.evaluateJavascript(js, null) }
```

如果必须把 payload 当成 JS 字符串参数（需要额外转义），请使用 JSON 字符串转义工具：

```kotlin
val safe = org.json.JSONObject.quote(payload) // 将 payload 做 JS 字符串转义
val js = "if (typeof window.CpsenseAppEventCallBack === 'function') { window.CpsenseAppEventCallBack($safe); }"
webView.post { webView.evaluateJavascript(js, null) }
```

注意：第一种方式（直接嵌入合法 JSON literal）更直观且避免二次解析/转义问题；前提是 `payload` 本身是合法的 JSON 文本。

---

## 6. 边界条件与调试建议

- JSON 格式验证：保证 `data`/`payload` 为合法 JSON（尤其注意双引号与转义）。
- 线程安全：`@JavascriptInterface` 方法可能在非主线程被调用，请在需要做 UI 操作时切换到主线程。
- payload 大小：避免一次性发送过大数组，建议按需分批上报。
- 测试用例：在浏览器端也可用 `window.CpsenseAppEvent = { events: (s)=>console.log(s) }` 模拟 Android 行为，便于联调。

常见问题：

- iframe 没收到事件：确认调用 `evaluateJavascript` 的 JS 字符串是否正确，以及 WebView 是否允许 JS 执行（`settings.javaScriptEnabled = true`）。
- JSON 解析失败：在 Android 端打印待发送字符串，粘贴到 JSON 在线解析器中验证。
- 收到重复事件：iframe 端实现了短时间内去重策略（如果存在），可调整去重窗口或在上游加入唯一 id。

---

## 7. 总结

- 协议核心是统一的 `[{type,value},...]` 数组消息。
- Android 端至少需实现 `window.CpsenseAppEvent.events(data)` 用于接收 Web 上行；需要主动下发事件时，可用 `evaluateJavascript` 调用 `window.CpsenseAppEventCallBack(...)`。
- 采用 JSON literal 嵌入的方式进行回调更稳健。

