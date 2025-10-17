/**
 * @date 2025/05/29
 * @auth vidar
 * 升级版：修改包名，修改加载配置
 */

var woso = woso || {};

var wop = wop || {};

wop.gamelog = function () {
    let _log = wop.env !== 'release' ? false : true
    if (!wop.isLog && _log) return
    const argsArray = Array.from(arguments)
    console.log(
        '%c' + JSON.stringify(argsArray),
        'color: green; font-size: 14px;'
    )
}

woso.getNow = function () {
    return new Date().getTime() / 1000
}

woso.w_now = woso.getNow()

woso.getSysInfo = function () {
    try {
        // 权重：系统 + 系统版本 > 平台 > 内核 + 载体 + 内核版本 + 载体版本
        const ua = navigator.userAgent.toLowerCase()
        const testUa = (regexp) => regexp.test(ua)
        const testVs = (regexp) => {
            const matchResult = ua.match(regexp)
            if (matchResult) {
                return matchResult
                    .toString()
                    .replace(/[^0-9|_.]/g, '')
                    .replace(/_/g, '.')
            } else {
                return null // 或者返回适当的默认值
            }
        }
        // 系统
        let system = 'unknow'
        if (testUa(/windows|win32|win64|wow32|wow64/g)) {
            system = 'windows' // windows系统
        } else if (testUa(/macintosh|macintel/g)) {
            system = 'macos' // macos系统
        } else if (testUa(/x11/g)) {
            system = 'linux' // linux系统
        } else if (testUa(/android|adr/g)) {
            system = 'android' // android系统
        } else if (testUa(/ios|iphone|ipad|ipod|iwatch/g)) {
            system = 'ios' // ios系统
        }
        // 系统版本
        let systemVs = 'unknow'
        if (system === 'windows') {
            if (testUa(/windows nt 5.0|windows 2000/g)) {
                systemVs = '2000'
            } else if (testUa(/windows nt 5.1|windows xp/g)) {
                systemVs = 'xp'
            } else if (testUa(/windows nt 5.2|windows 2003/g)) {
                systemVs = '2003'
            } else if (testUa(/windows nt 6.0|windows vista/g)) {
                systemVs = 'vista'
            } else if (testUa(/windows nt 6.1|windows 7/g)) {
                systemVs = '7'
            } else if (testUa(/windows nt 6.2|windows 8/g)) {
                systemVs = '8'
            } else if (testUa(/windows nt 6.3|windows 8.1/g)) {
                systemVs = '8.1'
            } else if (testUa(/windows nt 10.0|windows 10/g)) {
                systemVs = '10'
            }
        } else if (system === 'macos') {
            systemVs = testVs(/os x [\d._]+/g)
        } else if (system === 'android') {
            systemVs = testVs(/android [\d._]+/g)
        } else if (system === 'ios') {
            systemVs = testVs(/os [\d._]+/g)
        }
        // 平台
        let platform = 'unknow'
        if (system === 'windows' || system === 'macos' || system === 'linux') {
            platform = 'desktop' // 桌面端
        } else if (system === 'android' || system === 'ios' || testUa(/mobile/g)) {
            platform = 'mobile' // 移动端
        }
        // 内核和载体
        let engine = 'unknow'
        let supporter = 'unknow'
        if (testUa(/applewebkit/g)) {
            engine = 'webkit' // webkit内核
            if (testUa(/edge/g)) {
                supporter = 'edge' // edge浏览器
            } else if (testUa(/opr/g)) {
                supporter = 'opera' // opera浏览器
            } else if (testUa(/chrome/g)) {
                supporter = 'chrome' // chrome浏览器
            } else if (testUa(/safari/g)) {
                supporter = 'safari' // safari浏览器
            }
        } else if (testUa(/gecko/g) && testUa(/firefox/g)) {
            engine = 'gecko' // gecko内核
            supporter = 'firefox' // firefox浏览器
        } else if (testUa(/presto/g)) {
            engine = 'presto' // presto内核
            supporter = 'opera' // opera浏览器
        } else if (testUa(/trident|compatible|msie/g)) {
            engine = 'trident' // trident内核
            supporter = 'iexplore' // iexplore浏览器
        }
        // 内核版本
        let engineVs = 'unknow'
        if (engine === 'webkit') {
            engineVs = testVs(/applewebkit\/[\d._]+/g)
        } else if (engine === 'gecko') {
            engineVs = testVs(/gecko\/[\d._]+/g)
        } else if (engine === 'presto') {
            engineVs = testVs(/presto\/[\d._]+/g)
        } else if (engine === 'trident') {
            engineVs = testVs(/trident\/[\d._]+/g)
        }
        // 载体版本
        let supporterVs = 'unknow'
        if (supporter === 'chrome') {
            supporterVs = testVs(/chrome\/[\d._]+/g)
        } else if (supporter === 'safari') {
            supporterVs = testVs(/version\/[\d._]+/g)
        } else if (supporter === 'firefox') {
            supporterVs = testVs(/firefox\/[\d._]+/g)
        } else if (supporter === 'opera') {
            supporterVs = testVs(/opr\/[\d._]+/g)
        } else if (supporter === 'iexplore') {
            supporterVs = testVs(/(msie [\d._]+)|(rv:[\d._]+)/g)
        } else if (supporter === 'edge') {
            supporterVs = testVs(/edge\/[\d._]+/g)
        }

        let language = 'en'
        if (navigator.languages && navigator.languages.length) {
            // 最新的浏览器支持 navigator.languages 属性
            language = navigator.languages[0]
        } else if (navigator.browserLanguage) {
            // Internet Explorer 使用 navigator.browserLanguage
            language = navigator.browserLanguage
        } else if (navigator.userLanguage) {
            // IE <= 10 使用 navigator.userLanguage
            language = navigator.userLanguage
        }

        let sourceurl = ''
        sourceurl = window.location.protocol + '//' + window.location.host

        return Object.assign({
            engine, // webkit gecko presto trident
            engineVs,
            platform, // desktop mobile
            supporter, // chrome safari firefox opera iexplore edge
            supporterVs,
            system, // windows macos linux android ios
            systemVs,
            language,
            sourceurl,
        })
    } catch (e) {
        console.log(e)
    }
}

woso.divBox = function () {
    let b = `
    <div id="w_orientation"></div>
    <div id="w_gamebox">
        <div id="smallText">v</div>
        <img id="w_icon" alt="" src="../../gameicon/default.jpg">
        <div id="playBox"><img alt="" id="logo" src="../../gameicon/logo02.png">
            <div id="bbc">
                <div id="play_img"><img id="w_icon" alt="" src="../../gameicon/default.jpg"></div><span id="gameName"></span>
            </div><progress id="w_progressbar" max="100" value="0"></progress><!-- START --> <a href="javascript:;"
                id="w_PlayNow" onclick="window.W_onClick()">PLAY</a>
            <ul id="w_loadingdots">
                <li class="loading-dots-dot"></li>
                <li class="loading-dots-dot"></li>
                <li class="loading-dots-dot"></li>
            </ul>
        </div>
    </div>
    `
    return b
}

woso.stylBox = function () {
    return `
    :root {
        --sat: env(safe-area-inset-top);
        --sar: env(safe-area-inset-right);
        --sab: env(safe-area-inset-bottom);
        --sal: env(safe-area-inset-left)
    }
    
    html {
        width: 100%;
        height: 100%;
        font-size: 18px;
        scroll-behavior: smooth;
        font-family: Segoe UI Historic, Segoe UI, Helvetica, Arial, sans-serif;
        background-color: #191919;
        touch-action: none
    }
    
    body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        color: #fff;
        background: 0 0;
        overflow: hidden;
        -webkit-tap-highlight-color: transparent;
        cursor: default;
        -webkit-touch-callout: none; /* 禁止长按链接、图片弹出菜单 */
        -webkit-user-select: none; /* 禁止用户选中文字 */
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0); /* 清除点击高亮效果 */
    }

    #w_gamebox {
        z-index: 99;
        position: fixed;
        height: 100%;
        width: 100%;
        /* display: none */
    }
    
    a {
        display: none;
        text-decoration: none;
        -webkit-tap-highlight-color: transparent
    }
    
    #playBox {
        background: rgba(32, 21, 71, .85)
    }
    
    #w_PlayNow,
    #w_progressbar::-webkit-progress-value {
        background: #fff !important
    }
    
    #w_progressbar::-moz-progress-bar {
        background-color: #fff
    }
    
    #w_progressbar {
        color: #fff;
        display: none
    }
    
    @keyframes w_loadingdots {
    
        0%,
        100% {
            transform: scale(1);
            background: rgba(255, 255, 255, .8)
        }
    
        50% {
            transform: scale(1.5);
            background: #fff
        }
    }
    
    #w_gamebox>img {
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, .3);
        -webkit-filter: blur(10px);
        -moz-filter: blur(10px);
        -ms-filter: blur(10px);
        filter: blur(10px);
        object-position: center;
        object-fit: cover
    }
    
    #w_gamebox #playBox {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center
    }
    
    #w_gamebox #playBox #logo {
        display: block;
        width: 620px;
        height: 103px
    }
    
    @media screen and (max-width:1281px) {
        #w_gamebox #playBox #logo {
            width: 254px;
            height: 43px
        }
    }
    
    #w_gamebox #playBox #bbc {
        position: relative;
        display: flex;
        align-items: center;
        flex-direction: column;
        justify-content: center;
        margin: 160px 0
    }
    
    #w_gamebox #playBox #bbc #play_img {
        width: 160px;
        height: 160px;
        border: 3px solid #fff;
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 15px
    }
    
    #w_gamebox #playBox #bbc #play_img>img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center
    }
    
    @media screen and (max-width:1281px) {
        #w_gamebox #playBox #bbc #play_img {
            width: 96px;
            height: 96px
        }
    }
    
    #w_gamebox #playBox #bbc>span {
        color: #fff;
        font-size: 24px;
        font-weight: 700
    }
    
    @media screen and (max-height:600px) {
        #w_gamebox #playBox #bbc {
            margin: 80px 0
        }
    
        #w_gamebox #playBox #bbc>span {
            font-size: 18px
        }
    }
    
    @media screen and (max-height:500px) {
        #w_gamebox #playBox #bbc {
            margin: 30px 0
        }
    }

    #w_gamebox #playBox #w_PlayNow {
        display: none;
        width: 170px;
        height: 50px;
        justify-content: center;
        align-items: center;
        border-radius: 5px;
        text-align: center;
        font-weight: 700
    }
    
    #w_loadingdots {
        padding: 0 !important
    }
    
    #w_gamebox #playBox #w_loadingdots {
        position: relative;
        display: flex;
        align-content: center;
        list-style: none
    }
    
    #w_gamebox #playBox #w_loadingdots>li {
        position: relative;
        height: 12px;
        width: 12px;
        border-radius: 50%;
        margin: 0 8px;
        background: rgba(255, 255, 255, .8);
        animation: w_loadingdots 1s infinite ease-in-out
    }
    
    #w_gamebox #playBox #w_loadingdots>li:nth-child(1) {
        animation-delay: -.2s
    }
    
    #w_gamebox #playBox #w_loadingdots>li:nth-child(2) {
        animation-delay: -.1s
    }
    
    #w_gamebox #playBox #w_progressbar::-webkit-progress-bar {
        background: rgba(32, 21, 71, .6)
    }
    
    #w_gamebox #playBox #w_progressbar {
        width: 645px;
        height: 8px;
        border-radius: 8px;
        overflow: hidden;
        background: rgba(32, 21, 71, .6)
    }
    
    @media screen and (max-width:1281px) {
        #w_gamebox #playBox #w_progressbar {
            width: 200px
        }
    }
    
    #smallText {
        position: fixed;
        right: 0;
        bottom: 0;
        font-size: 10px;
        z-index: 10
    }

    #adcontent {
        width: 100%;
        height: 100%;
        position: fixed;
        z-index: 1
    }

    #w_orientation {
        position: fixed;
        background: black;
        z-index: 999;
        width: 100%;
        height: 100%;
        display: none
    }

    #w_orientation img{
        object-fit: contain;
        position: relative;
        transform: translate(-50%, -50%);
        left: 50%;
        top: 50%;
        box-shadow: rgb(0 0 0 / 10%) 0 0 16px 16px
    }
    `
}

woso.w_loadjs = function (src, callback) {
    let s = document.createElement('script')
    s.async = false
    s.src = src
    let onLoad = function () {
        s.parentNode.removeChild(s)
        s.removeEventListener('load', onLoad, false)
        if (typeof callback === 'function') {
            callback()
        }
    }
    s.addEventListener('load', onLoad, false)
    document.body.appendChild(s)
}

woso.clearElement = function (element) {
    let _element = woso.getElement(element)
    if (_element && _element.parentNode) {
        _element.parentNode.removeChild(_element)
    }
}

woso.getElement = function (element) {
    let dc = document.getElementById(element)
    if (dc) {
        return dc
    } else {
        console.log('div nil')
    }
}


wop.loadSingleScript = function (src, callback, ds = true, retryLimit = 2, customType = '') {
    let attempts = 0;
    const finalSrc = wop.isMath ? src + '?v=' + (ds && w_random) : src;

    function tryLoad() {
        const s = document.createElement('script');
        s.async = false;

        // 设置类型
        if (customType) {
            s.type = customType;
        } else if (window.stats?.isModule) {
            s.type = 'module';
        }

        if (window.stats?.crossorigin) s.crossOrigin = 'anonymous';
        s.src = finalSrc;

        const timeout = setTimeout(() => {
            console.warn(`脚本加载超时：${src}`);
            cleanup();
            retryOrFail();
        }, 8000);

        function cleanup() {
            clearTimeout(timeout);
            s.removeEventListener('load', onLoad);
            s.removeEventListener('error', onError);
            if (!window.stats?.insertToHead && s.parentNode) {
                s.parentNode.removeChild(s);
            }
        }

        function onLoad() {
            cleanup();
            callback && callback(true);
        }

        function onError() {
            console.error(`脚本加载失败：${src}`);
            cleanup();
            retryOrFail();
        }

        function retryOrFail() {
            attempts++;
            if (attempts <= retryLimit) {
                console.warn(`重试加载脚本（${attempts}/${retryLimit}）：${src}`);
                tryLoad();
            } else {
                callback && callback(false);
            }
        }

        s.addEventListener('load', onLoad);
        s.addEventListener('error', onError);

        try {
            (window.stats?.insertToHead ? document.head : document.body).appendChild(s);
        } catch (e) {
            document.body.appendChild(s);
        }
    }

    tryLoad();
}

wop.loadScript = function (list, callback) {
    if (list.length === 0) {
        callback && callback()
        return
    }
    var loaded = 0
    var loadNext = function () {
        wop.loadSingleScript(list[loaded], function () {
            loaded++
            if (loaded >= list.length) {
                callback()
            } else {
                loadNext()
            }
        })
    }
    loadNext()
}

// Orientation watcher helpers: start/stop polling based on wop.orientationMode
wop.startOrientationWatcher = function (intervalMs = 1000) {
    try {
        wop.stopOrientationWatcher();
        if (Number(wop.orientationMode || 0) === 0) return;
        wop._orientIntervalId = setInterval(function () { wop.resize(); }, Number(intervalMs) || 1000);
    } catch (e) { }
}

wop.stopOrientationWatcher = function () {
    try {
        if (wop._orientIntervalId) {
            clearInterval(wop._orientIntervalId);
            wop._orientIntervalId = null;
        }
    } catch (e) { }
}

!(function () {
    let b_s, b_r, b_a, b_d, b_o, b_u
    b_u = true
    b_s = woso.stylBox()
    b_r = document.head || document.getElementsByTagName('head')[0]
    b_a = document.createElement('style')
    b_a.innerHTML = b_s
    b_r.appendChild(b_a)

    b_d = woso.divBox()
        ; (b_o = document.createElement('div')).innerHTML = b_d
        ; (b_r =
            document.body || document.getElementsByTagName('body')[0]).insertBefore(
                b_o,
                b_r.firstChild
            )

    woso['sysinfo'] = woso.getSysInfo()
    woso.delayA = 0
    fetch('./opt.json')
        .then(response => response.json())
        .then(o => {
            console.log(o)
            woso["gameinfo"] = {
                gid: o.id
            }
            var iconSize =
                woso.sysinfo.platform === 'desktop' ? '512.png' : '128.jpg'

            var h_img = document.querySelectorAll('#w_icon') // 获取所有需要更换图标的元素

            for (var i = 0; i < h_img.length; i++) {
                // 使用模板字符串拼接路径，并替换掉原有的 'default.jpg'
                let _icon = h_img[i].src.replace(
                    /default\.jpg$/,
                    `${o.id}-icon-${iconSize}`
                )
                h_img[i].src = _icon // 重新设置元素的src属性
            }


            woso.w_orient = woso.getElement('w_orientation')
            woso.w_orient.style.display = 'none'

            woso.adcontent = woso.getElement('adcontent')



            fetch('../../gameconfig/cpsense/' + o.id + ".json").then(res => res.json()).then(cfg => {
                console.log('cfg:',cfg);


                fetch('../../gameconfig/cpsense/' + o.id + ".json").then(res => res.json()).then(manifest => {

                    let fn_dir = () => {
                        try {
                            
                            return  (manifest.info && typeof manifest.info.radio !== 'undefined' ? manifest.info.radio : 0)
                        } catch (error) {
                            return 0
                        }
                    }
                    // resize
                    // Persist orientation mode to wop.orientationMode for later checks
                    try {
                        wop.orientationMode = Number(fn_dir()) || 0; // 0: no detect, 1: landscape hint, 2: portrait hint
                    } catch (e) {
                        wop.orientationMode = 0;
                    }

                    if (wop.orientationMode === 1) {
                        let h = document.createElement('img')
                        h.src = '../../gameicon/rotate_screen.png'
                        woso.w_orient.appendChild(h)
                    } else if (wop.orientationMode === 2) {
                        let v = document.createElement('img')
                        v.src = '../../gameicon/rotate_screen_v.png'
                        woso.w_orient.appendChild(v)
                    }

                    // 初始调整方向检查
                    // Use start/stop functions so we only poll when orientationMode !== 0
                    if (typeof wop.startOrientationWatcher === 'function') {
                        wop.startOrientationWatcher();
                    } else {
                        // fallback: create simple watcher if helpers not defined yet
                        if (Number(wop.orientationMode || 0) !== 0) {
                            wop._orientIntervalId = setInterval(function () { wop.resize(); }, 1000);
                        }
                    }

                    const urlP = new URLSearchParams(window.location.search)
                    window.gchannel = urlP.get('g-channel') // g-channel=切换对应的广告渠道
                    window.guri = urlP.get('g-uri') || window.location.hostname
                    woso.sandbox = urlP.get('vb') // vb = beta,则打开测试广告
                    woso.gad = JSON.parse(urlP.get('g-ad')) || false // g-ad = true,则广告不加载
                    woso.tc = JSON.parse(urlP.get('tc')) || false // tc = true,则打开加载测试lib
                    woso.wdot = JSON.parse(urlP.get('w-dot')) || false // w-dot = true,则打开埋点
                    woso.w_ver = urlP.get('w-v') || null // v=版本号


                    wop.manifest = manifest
                    let info = manifest.info
                    // wop.info = info

                    wop.gamelog(
                        woso.sysinfo.language,
                        info.env,
                        info.id,
                        info.title,
                        'mode',
                        info.mode,
                        info.ves
                    )
                    if (info.id !== woso.gameinfo.gid) {
                        console.log('gid err!')
                        return
                    }
                    wop.gameId = info.id
                    wop.firstAd = info.firstAd
                    wop.firstAdClick = info.firstAdClick
                    wop.gameTitle = info.title
                    wop.w_gameMode = info.mode
                    wop.env = wop.sandbox === 'beta' ? 'beta' : info.env
                    wop.isDuration = info.isDuration //30s
                    wop.isDot = info.isDot //all dot
                    wop.isDotWGA = info.isDotWGA || woso.wdot// wga dot
                    wop.w_ver = woso.w_ver || info.ves
                    wop.isLog = info.isLog
                    wop.isEnter = info.isEnter
                    wop.w_test =
                        wop.sandbox === 'beta'
                            ? true
                            : info.env === 'release'
                                ? false
                                : true
                    wop.w_random = info.env === 'beta' ? '' + wop.w_random : '0'
                    wop.isLoading = info.isAutoLoadBar
                    wop.isAutoBar = info.isAutoBar
                    wop.adProb = +info.adProb
                    wop.isMath = info.isMath
                    wop.w_Sdk = info.adSdk
                    wop.channel = info.adChannel
                    wop.isDotPower = info.isDotPower
                    wop.isGo = info.isGo
                    wop.w_isAutoAd = info.isAutoAd
                    wop.autoTime = info.autoTime
                    wop.version = info.version
                    wop.libSdk = info.libVersion
                    document.getElementById('gameName').textContent = info.title
                    document.querySelector('title').textContent = info.title
                    let smallText = document.getElementById('smallText')
                    smallText.innerHTML = info.version


                    if (woso.sandbox === 'beta') {
                        woso.w_loadjs('../../libs/lib.' + wop.libSdk + '.js')
                    } else {
                        woso.w_loadjs('../../libs/lib.' + wop.libSdk + '.min.js')
                    }


                }).catch(err => console.error(err))

            }).catch(err => console.error(err))

        })
        .catch(err => console.error(err))


    wop.resize = function () {
        let platform = woso.sysinfo.platform
        if (platform === 'desktop') {
            woso.w_orient.style.display = 'none'
            return
        }
        if (typeof wsdk !== 'undefined' && wsdk.ading) return
        wop.checkOrientation()
    }



    wop.checkOrientation = function () {
        // orientationMode: 0 = no detection, 1 = show hint for landscape, 2 = show hint for portrait
        const mode = typeof wop.orientationMode !== 'undefined' ? Number(wop.orientationMode) : 0;
        if (mode === 0) {
            // do not show any orientation hint
            if (woso && woso.w_orient) woso.w_orient.style.display = 'none'
            return
        }

        let isLandscape = false
        if (typeof window.orientation !== 'undefined') {
            isLandscape = Math.abs(window.orientation) === 90
        } else {
            isLandscape = window.innerWidth > window.innerHeight
        }

        // mode === 1 -> show only when landscape; mode === 2 -> show only when portrait
        const shouldShow = (mode === 1 && isLandscape) || (mode === 2 && !isLandscape)
        if (woso && woso.w_orient) woso.w_orient.style.display = shouldShow ? 'block' : 'none'
    }

})()
