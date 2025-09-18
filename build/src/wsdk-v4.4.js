/**
 * auth:vidar
 * date: 2025-09-15
 * 新增加上报游戏事件
 * 上报游戏分数,关卡使用事件
 */
'use strict'

// Defining Global variable
window.w_success = null
window.w_failure = null
window.w_preload = null
window.w_timerNow = 0
window.w_AutoAding = false
window.w_LastInteractionAdTime = 0
// ad setting
window.w_isStart = true
window.w_isPreroll = true
window.w_isPreloadAd = false

window.w_isShowAd = false
window.w_isShowAdTime = function () {
  setTimeout(() => {
    window.w_isShowAd = false
  }, 3000)

  return window.w_isShowAd
}

// Define variables and constants
var wsdk = (window.wsdk = wsdk || {})
wsdk.wgtag = null
wsdk.wgtaglist = []
wsdk.ading = false
wsdk.rewardNum = 0;
wsdk.adover = {
  rewarded: false,
  interstitial: false,
}

wsdk._ready = false;
wsdk._callbacks = [];
wsdk._events = {}; // eventName -> [handlers]
// Ensure game_start is only sent once per page load unless explicitly reset
wsdk._gameStartSent = false;
wsdk.config = {
  appId: null,
  apiKey: null,
  instanceId: null,
  templateId: null,
  endpoints: {}
};
//prox
var wop = wop || {}
if (typeof wop.gamelog !== 'undefined' && wop.gamelog('channel', wop.channel)) {

  // creat DotFn
  wsdk.wgtag = (function (base) {
    return function () {
      // dot server
      let argsArray = Array.from(arguments)
      try {
        if (typeof wop !== 'undefined') {
          let args = argsArray[2]
          args.env = wop.env || '--'
          args.lang = wop.lang || '--'
          args.href = wop.href || '--'
          let data = {
            gid: wop.gameId || '--',
            [argsArray[0]]: {
              [argsArray[1]]: args,
            },
          }
        }
      } catch (err) {
        wop.gamelog(err)
      }
      base && base.apply(this, arguments)
    }
  })(function () { })
} else {
  wop.gamelog = function () {
    console.log.apply(console, arguments)
  }
  wop.adProb = 1;
  wop.isDot = true;
}
// expose adInstance to other scripts that may run in the same window
window.adInstance = null;
var adInstance = null,
  isTimeOut = true,
  mTimeOut = true

function loadsdk(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.async = true
    s.src = url
    s.onload = () => resolve(true)
    s.onerror = () => reject(new Error('脚本加载失败: ' + url))
    document.head.appendChild(s)
  })
}

var w_script = {
  onload: null,
  onerror: null,
}

// let plurl = 'https://cpsense.heiheigame.com/libs/cpsdk1.3.js'
// Resolve the loader URL relative to this script file location. When this file
// is included from a page (for example game/index.html -> ../src/wsdk-v4.4.js),
// using './cpsdk1.3.js' would be resolved relative to the page, not this file.
// We prefer the same directory as this script file.
function resolveRelativeToCurrentScript(relPath) {
  try {
    // document.currentScript is the ideal API to get the running script
    const cs = document.currentScript;
    if (cs && cs.src) {
      const base = cs.src.replace(/[^/]*$/, ''); // directory of this script
      return new URL(relPath, base).toString();
    }
  } catch (e) {
    // fallthrough
  }
  // fallback: use page base
  try { return new URL(relPath, document.location.href).toString(); } catch (e) { return relPath; }
}

let plurl = resolveRelativeToCurrentScript('./cpsdk1.3.js');
loadsdk(plurl).then(() => {

  console.log('加载成功', plurl)
  if (typeof w_script.onload === 'function') w_script.onload()
}).catch((e) => {
  console.error('脚本加载失败', plurl, e)
  if (typeof w_script.onerror === 'function') w_script.onerror()
  wsdk.startGame()

})


// Initialize Advertising SDK
w_script.onload = function () {
  console.log('loaded ads')
  const adSdkConfig = {
    el: document.querySelector('#adcontent'),
    client: wop.channel,
    is_test: wop.w_test || false,
  }
  // sdk loaded
  adInstance = new adSdk(adSdkConfig)
  // make sure other scripts (eg. game/main.js) can observe the global ad instance
  try { window.adInstance = adInstance; } catch (e) { /* ignore */ }

  let st = setTimeout(function () {
    clearTimeout(st)
    if (wop.firstAdClick) {
      wop.show_PlayNow()
    } else {
      wop.firstAd
        ? wsdk
          .showAd('fristAd')
          .then(() => {
            // gamecallback && gamecallback()
            console.log('fristAd done')
          })
          .catch((e) => {
            console.log('fristAd err', e)
          })
        : null
    }
  }, 2000)

  wsdk.gameDot(W_DOT.AD_LOAD, 'sdk load yes')
}

w_script.onerror = function () {
  wsdk.gameDot(W_DOT.AD_LOAD_ERROR, 'sdk load no')
}

let gamecallback = null
wsdk.startGame = () => {
  if (!w_isStart) return;
  w_isStart = false
  console.log('game start')
  if (wop.firstAdClick) wop.hide_PlayNow()

  gamecallback && gamecallback()
  gamecallback = null

  // 记录最后一次操作时间戳
  let lastInteractionTime = Date.now() / 1000
  // 记录开始游戏后的时间
  window.w_LastInteractionAdTime = Date.now() / 1000
  // 检测是否支持addEventListener方法，不支持则使用attachEvent方法
  if (window.addEventListener) {
    window.addEventListener('mousemove', function (event) {
      // 在用户离开页面之前执行的操作
      lastInteractionTime = new Date().getTime() / 1000
      event.returnValue = lastInteractionTime // 兼容旧版浏览器
      // console.log("离开页面", lastInteractionTime)
    })
  } else if (window.attachEvent) {
    window.attachEvent('mousemove', function () {
      // 在用户离开页面之前执行的操作
      lastInteractionTime = new Date().getTime() / 1000
      window.event.returnValue = lastInteractionTime
      // console.log("离开页面", lastInteractionTime)
    })
  }

  //start autoAd
  if (wop.w_isAutoAd) {
    let si = wop.autoTime || 35;
    let ssi = 60
    window.w_AutoAding = false
    setInterval(() => {
      const currentTime = new Date().getTime() / 1000
      const inactiveTime = currentTime - lastInteractionTime
      // console.log("inact-----", Math.floor(inactiveTime))
      if (window.w_AutoAding) lastInteractionTime = currentTime
      if (inactiveTime > si && !window.w_AutoAding) {
        typeof wop.gamelog === 'function' &&
          wop.gamelog('AutoAd', si, window.w_AutoAding)
        lastInteractionTime = currentTime
        typeof wop !== 'undefined' && wop.trigger('interstitial')
      }

      const playinactiveTime = currentTime - w_LastInteractionAdTime
      // console.log("play+++++", Math.floor(playinactiveTime))
      if (window.w_AutoAding) w_LastInteractionAdTime = currentTime
      if (playinactiveTime > ssi && !window.w_AutoAding) {
        typeof wop.gamelog === 'function' &&
          wop.gamelog('AutoAd', ssi, !window.w_AutoAding)
        w_LastInteractionAdTime = currentTime
        typeof wop !== 'undefined' && wop.trigger('interstitial')
      }
    }, 1000)
  }
}

wsdk.initAd = (callback) => {
  wsdk.gameDot(W_DOT.GAME_OPEN, 'open_game')
  callback && (gamecallback = callback)
  !wop.firstAd ? gamecallback() : null
}

wsdk.dotga = (func, data, events) => {
  if (wop.isDotWGA) {
    func && func(data)
  }
  if (typeof window.gtag === 'function') {
    window.gtag('event', events, data)
  }
}

wsdk.prob = (prob = 1) => {
  if (prob === 0) {
    return false
  } else if (prob === 1) {
    return true
  } else {
    let m = Math.random()
    wop.gamelog(m)
    if (m < prob) {
      return true
    } else {
      return false
    }
  }
}
// Pre loading and displaying advertisements
let sd, d = 1, timeShowTimer = null;

wsdk.showAd = (type, callback) => {
  if (timeShowTimer) {
    return new Promise((resolve, reject) => {
      resolve(false)
    })

  }

  timeShowTimer = setTimeout(() => {
    clearTimeout(timeShowTimer);
    timeShowTimer = null;
  }, 500)

  // console.log("window.w_isShowAd",window.w_isShowAdTime())
  typeof wother !== 'undefined' && wother && wother(true)

  if (!window.w_isShowAdTime()) {
    window.w_isShowAd = true

    return new Promise((resolve, reject) => {
      if (wop.env === 'dev') {
        typeof wother !== 'undefined' && wother && wother(false)
        resolve()
        callback && callback()
        return
      }

      wsdk.ading = true

      function w_resize() {
        wsdk.ading = false
      }
      window.w_AutoAding = true

      function w_handleSuccess(tb) {
        resolve('success')
        typeof wother !== 'undefined' && wother && wother(false)
        w_resize()
        tb
          ? wsdk.startGame()
          : ((window.w_AutoAding = false),
            (window.w_LastInteractionAdTime = new Date().getTime() / 1000))
      }

      function w_handleError(err, tb) {
        w_resize()
        typeof wother !== 'undefined' && wother && wother(false)

        !callback && reject && reject('nil')

        tb
          ? wsdk.startGame()
          : ((window.w_AutoAding = false),
            (window.w_LastInteractionAdTime = new Date().getTime() / 1000))
      }

      // Display inset ads
      function showFristAd() {
        let isTimeOut = false
        const st_time = setTimeout(() => {
          clearTimeout(st_time)
          if (!isTimeOut) {
            wop.gamelog('fristAd timeout 3s')
            wsdk.gameDot(DOT.AD_ERROR, 'fristAd timeout')
            w_handleError('timeout', true)
          }
        }, 3000)
        try {
          adInstance.interstitialAd({
            beforeAd() {
              isTimeOut = true
              typeof gamebox !== 'undefined' && (gamebox.style.display = 'none')
              wsdk.gameDot(DOT.GAME_INTERSTITIAL_OPEN, 'fristAd open')
            },
            afterAd() {
              isTimeOut = true
              wsdk.gameDot(DOT.GAME_INTERSTITIAL_VIEWED, 'fristAd viewed')
              w_handleSuccess(true)
            },
            error(err) {
              isTimeOut = true
              wsdk.gameDot(DOT.AD_ERROR, 'fristAd ' + err)
              w_handleError(err, true)
            },
          })
        } catch (error) {
          console.log('fristAd error', error)
        }


      }

      // Display inset ads
      function showInterstitialAd(callback) {
        let isAdError = false
        const st_Inter = setTimeout(() => {
          clearTimeout(st_Inter)

          if (!isAdError) {
            wsdk.gameDot(DOT.AD_ERROR, 'inter timeout')
            callback && callback('afterAd-Error-no')
            w_handleError('timerout')
          }
        }, 4000)
        adInstance &&
          adInstance.interstitialAd({
            beforeAd() {
              isAdError = true
              wsdk.gameDot(DOT.GAME_INTERSTITIAL_OPEN, 'ad open')
              callback && callback('beforeAd')
              window.w_AutoAding = true
            },
            afterAd() {
              isAdError = true
              wsdk.gameDot(DOT.GAME_INTERSTITIAL_VIEWED, 'afterAd viewed')
              callback && callback('afterAd-yes')
              w_handleSuccess()
            },
            error(err) {
              isAdError = true
              wsdk.gameDot(DOT.AD_ERROR, err)
              callback && callback('afterAd-Error-no')
              w_handleError(err)
            },
          })


      }

      //Display motivational video advertisements
      function showRewardedVideoAd(callback) {
        const st_video = setTimeout(() => {
          clearTimeout(st_video)

          if (!isAdError) {
            wsdk.gameDot(DOT.AD_ERROR, 'video timerout')
            callback && callback('afterAd-v-no')
            w_handleError('timerout')
          }
        }, 4000)
        let isAdError = false
        adInstance.rewardAd({
          beforeAd() {
            isAdError = true
            wsdk.gameDot(DOT.GAME_REWARD_OPEN, 'ad reward open')
            callback && callback('beforeAd')
          },
          adDismissed() {
            isAdError = true
            wsdk.gameDot(DOT.GAME_REWARD_DISMISSED)
            callback && callback('afterAd-v-no')
            w_handleError('dismiss')
          },
          adViewed() {
            isAdError = true
            wsdk.gameDot(DOT.GAME_REWARD_VIEWED)
            callback && callback('afterAd-v-yes')
            w_handleSuccess()
          },
          error(err) {
            isAdError = true
            wsdk.gameDot(DOT.AD_ERROR, 'video' + err)
            callback && callback('afterAd-Error-no')
            w_handleError(err)
          },
        })


      }

      if (type === 'rewarded') {
        wsdk.gameDot(DOT.GAME_REWARD)
        showRewardedVideoAd(callback)
      }

      // let w_cd = new Date().getTime() / 1000;
      // let cd = Math.floor(w_cd - window.w_timerNow);
      // console.log("cd..", cd);
      // if (cd >= 30) {
      //     window.w_timerNow = w_cd;
      // } else {
      //     callback && callback("afterAd-Error-no");
      //     return;
      // };
      // wop.gamelog("ad", type)

      if (type === 'interstitial' || !type) {
        if (!wsdk.prob(wop.adProb)) {
          resolve()
          callback && callback()
          return
        }
        wsdk.gameDot(DOT.GAME_INTERSTITIAL)
        showInterstitialAd(callback)
      }

      if (type === 'fristAd') {
        wsdk.rewardNum++;
        if (!wsdk.prob(wop.adProb)) {
          resolve()
          gamecallback && gamecallback()
          returnÏ
        }
        wsdk.gameDot(DOT.GAME_INTERSTITIAL, 'fristAd')
        showFristAd(callback)
      }
    })
  } else {
    return new Promise(function (resolve, reject) {
      resolve('error')
      callback && callback()
      typeof wother !== 'undefined' && wother && wother(false)
    })
  }
}


wsdk.preloadAd = (type, callback) => {
  if (!window.w_isPreloadAd) {
    window.w_isPreloadAd = true

    return new Promise(function (resolve, reject) {
      wsdk.showAd(type, () => {
        if (typeof callback === 'function') {
          try {
            // 执行 callback
            window.w_isPreloadAd = false
            callback && callback()
            resolve(true)
          } catch (error) {
            // 如果执行 callback 时出错，将错误信息传递给 reject
            reject(error)
          }
        }
        resolve('Ads Loaded', type)
      })
        .catch(() => { })
    })
  } else {
    return new Promise(function (resolve, reject) {
      resolve('error')
    })
  }
}

wsdk.gameplay = (type) => {
  let _options = window['GD_OPTIONS'] || window['SDK_OPTIONS']
  if (_options) {
    if (type === 'start') {
      _options.onEvent({
        message: '',
        name: 'SDK_GAME_START',
        status: 'success',
      })
    }
    if (type === 'pause') {
      _options.onEvent({
        message: '',
        name: 'SDK_GAME_PAUSE',
        status: 'success',
      })
    }
  }
}

wsdk.AdType = {
  interstitial: 'interstitial',
  rewarded: 'rewarded',
  Interstitial: 'interstitial',
  Rewarded: 'rewarded',
}

wsdk.getSession = () => {
  return 'session null'
}

// Reporting

/**Defining Constants*/
const DOT = {
  GAME_START: 'game_start',
  GAME_PLAY_TIME: 'game_play_time',
  GAME_REWARD: 'game_reward',
  GAME_REWARD_VIEWED: 'game_reward_viewed',
  GAME_REWARD_OPEN: 'game_reward_open',
  GAME_REWARD_DISMISSED: 'game_reward_dismissed',
  GAME_INTERSTITIAL: 'game_interstitialad',
  GAME_INTERSTITIAL_OPEN: 'game_interstitialad_open',
  GAME_INTERSTITIAL_VIEWED: 'game_interstitialad_viewed',
  LEVEL_START: 'level_start',
  LEVEL_END: 'level_end',
  AD_ERROR: 'ad_error',
  GAME_RANK_SCORE: 'game_rank_score',
}

const W_DOT = {
  AD_INIT: 'ad_init',
  AD_OPEN: 'ad_open',
  AD_OPEN_ERROR: 'ad_open_error',
  AD_LOAD: 'ad_load',
  AD_LOAD_ERROR: 'ad_load_error',
  AD_BACK_TYPE: 'ad_back_type',
  GAME_OPEN: 'game_open',
}


/**Report game events*/
wsdk.gameDot = (events, value = '') => {
  // wop.gamelog("dot_type", events, value);
  if (!wop.isDot) {
    wop.gamelog('No dot', events, value)
    return
  }
  switch (events) {
    case DOT.GAME_START:
      // only send GAME_START once per page load
      if (!wsdk._gameStartSent) {
        wsdk._gameStartSent = true;
        wsdk.dotga(
          (v) => {
            wsdk.wgtag('event', events, v)
          },
          {
            game_name: wop.gameTitle,
            dev_name: wop.channel,
            enter_game: value,
          },
          events
        )
        upTimer()
      } else {
        // already sent, ignore subsequent GAME_START events
        wop.gamelog && wop.gamelog('GAME_START ignored (already sent)');
      }
      break
    case DOT.AD_ERROR:
      wsdk.dotga(
        (v) => {
          wsdk.wgtag('event', events, v)
        },
        {
          game_name: wop.gameTitle,
          dev_name: wop.channel,
          ad_error_type: value,
        },
        events
      )

      break
    case DOT.LEVEL_START:
      wsdk.dotga(
        (v) => {
          wsdk.wgtag('event', events, v)
        },
        {
          level_name: value.name,
          game_name: wop.gameTitle,
          dev_name: wop.channel,
        },
        events
      )

      break
    case DOT.LEVEL_END:
      wsdk.dotga(
        (v) => {
          wsdk.wgtag('event', events, v)
        },
        {
          level_name: value.level_name,
          success: value.success,
          score: value.score,
          game_name: wop.gameTitle,
          dev_name: wop.channel,
        },
        events
      )

      break
    default:
      wsdk.dotga(
        (v) => {
          wsdk.wgtag('event', events, v)
        },
        {
          game_name: wop.gameTitle,
          dev_name: wop.channel,
          info: value,
        },
        events
      )

      break
  }
}

/**Report game duration*/
function upTimer() {
  if (!wop.isDuration) return
  setInterval(() => {
    wsdk.gameDot(DOT.GAME_PLAY_TIME)
  }, 1000 * 30)
}

function dotPower(type, data) {

}

// storage
wsdk.getItem = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch (e) { return raw; }
  } catch (e) { return null; }
}

wsdk.setItem = (key, value) => {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    window.localStorage.setItem(key, str);
    return true;
  } catch (e) { return false; }
}

// IndexedDB 读取工具：
wsdk.readIndexedDB = async (dbName, storeName = 'keyvaluepairs', key) => {
  const openDB = (name) => new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      // do not attempt to change schema here
      req.onupgradeneeded = () => { };
    } catch (e) { reject(e); }
  });

  const getAll = (db, store) => new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(store, 'readonly');
      const os = tx.objectStore(store);
      const r = os.getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    } catch (e) { reject(e); }
  });

  const getKey = (db, store, k) => new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(store, 'readonly');
      const os = tx.objectStore(store);
      const r = os.get(k);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    } catch (e) { reject(e); }
  });

  try {
    const db = await openDB(dbName);
    let raw;
    if (typeof key === 'undefined') raw = await getAll(db, storeName); else raw = await getKey(db, storeName, key);

    const parseValue = (item) => {
      // some stores return objects like { key: ..., value: ... } or direct values
      const v = (item && (item.value ?? item)) || item;
      if (typeof v === 'string') {
        try { return JSON.parse(v); } catch (e) { return v; }
      }
      return v;
    };

    if (typeof key === 'undefined') {
      // normalize array of entries
      return Array.isArray(raw) ? raw.map(parseValue) : raw;
    } else {
      if (raw == null) return null;
      return parseValue(raw);
    }
  } catch (e) {
    this.__sdklog('readIndexedDB error', e && e.message ? e.message : e);
    return null;
  }
}

// event system
wsdk.on = (eventName, handler) => {
  if (!wsdk._events[eventName]) wsdk._events[eventName] = [];
  wsdk._events[eventName].push(handler);
}

wsdk.off = (eventName, handler) => {
  if (!wsdk._events[eventName]) return;
  if (!handler) { delete wsdk._events[eventName]; return; }
  const idx = wsdk._events[eventName].indexOf(handler);
  if (idx > -1) wsdk._events[eventName].splice(idx, 1);
}

wsdk.emit = (eventName, payload) => {
  const list = wsdk._events[eventName] || [];
  // 统一事件日志格式，类似GA上报格式
  const logData = payload && typeof payload === 'object' ? Object.keys(payload).map(key => `${key}: ${payload[key]}`).join(', ') : String(payload || '');
  console.log(`[wwwoso] Event: ${eventName}${logData ? ', ' + logData : ''}`);
  list.forEach(fn => { try { fn(payload); } catch (e) { } });
}


wsdk.watchStorage = (key, callback, interval = 2000) => {
  // If localStorage unavailable, return a noop stop function
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined' || window.localStorage == null) {
    return () => { };
  }

  // Use raw string values for reliable equality checks
  let lastRaw = null;
  // try { lastRaw = window.localStorage.getItem(key); } catch (e) { lastRaw = null; }

  const timer = setInterval(() => {
    try {
      const newRaw = window.localStorage.getItem(key);
      if (newRaw !== lastRaw) {
        // parse new value; if parsing fails, treat as raw string
        let parsedNew = null;
        try { parsedNew = wsdk.getItem ? wsdk.getItem(key) : (newRaw == null ? null : JSON.parse(newRaw)); } catch (e) { parsedNew = newRaw; }

        // Only call callback when parsedNew is non-null/defined and different from previous parsed value
        let parsedLast = null;
        try { parsedLast = lastRaw == null ? null : (wsdk.getItem ? null : JSON.parse(lastRaw)); } catch (e) { parsedLast = lastRaw; }

        const isDifferent = (function (a, b) {
          try { return JSON.stringify(a) !== JSON.stringify(b); } catch (e) { return a !== b; }
        })(parsedNew, parsedLast);

        if (parsedNew != null && isDifferent) {
          try { callback(parsedNew); } catch (e) { /* swallow */ }
        }

        lastRaw = newRaw;
      }
    } catch (e) {
      // ignore and continue
    }
  }, interval);

  // 提供一个 stop 方法
  return () => clearInterval(timer);
}

// tracking API
wsdk.trackEvent = async (name, payload = {}) => {

  wsdk.gameDot(name, payload);
  // if (wop.isDotWGA) {
  //   if (adInstance && adInstance._eventAds) {
  //     adInstance._eventAds.emit(name, payload);
  //   }
  // } else {

  //   console.log("idDotWGA no");
  // }
  // wsdk.emit(name, payload);
  // try {
  //   const url = this.config.endpoints?.eventUrl || this.config.endpoints?.reportUrl || null;
  //   if (!url) return { delivered: false, reason: 'no_endpoint' };
  //   // fire-and-forget
  //   fetch(url, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ type: name, ts: Date.now(), instanceId: this.config.instanceId, templateId: this.config.templateId, data: payload })
  //   }).catch(() => { });
  //   return { delivered: true };
  // } catch (e) { return { delivered: false, error: e.message }; 

}

wsdk.trackLevelEnd = async (value = {}) => {
  const data = {
    level_name: value.level_name || 0,
    success: value.success || false,
    score: value.score || 0,
    best: value.best || 0,
    game_name: wop.gameTitle,
    dev_name: wop.channel,
  }
  return await wsdk.trackEvent('level_end', data);
}

wsdk.trackScore = async (payload = {}) => {
  // 支持两种调用方式：trackScore(number) 或 trackScore({score: number})
  let score;
  let scorePayload;

  if (typeof payload === 'number') {
    score = payload;
    scorePayload = { score: payload };
  } else if (payload && typeof payload.score === 'number') {
    score = payload.score;
    scorePayload = payload;
  } else {
    return { delivered: false, reason: 'invalid_score' };
  }

  if (score == null) return { delivered: false, reason: 'invalid_score' };

  // emit local

  // use generic trackEvent
  return await wsdk.trackEvent('game_score', scorePayload);
}

wsdk.trackLevel = async (payload = {}) => {
  let level;
  let levelPayload;

  if (typeof payload === 'number') {
    level = payload;
    levelPayload = { level: payload };
  } else if (payload && typeof payload.level === 'number') {
    level = payload.level;
    levelPayload = payload;
  } else {
    return { delivered: false, reason: 'invalid_level' };
  }

  if (level == null) return { delivered: false, reason: 'invalid_level' };

  // emit local
  // wsdk.emit('level', levelPayload);
  // use generic trackEvent
  return await wsdk.trackEvent('level', levelPayload);
}

// Allow tests or special flows to reset the one-time GAME_START guard
wsdk.resetGameStart = function () {
  wsdk._gameStartSent = false;
}

// watchIndexedDB: poll IndexedDB using wsdk.readIndexedDB and invoke callback when parsed value changes
// - dbName: string or array of candidate DB names (will try in order until one returns data)
// - storeName: object store name (default 'keyvaluepairs')
// - key: optional key (undefined => getAll)
// - callback: function(newVal, meta) called when parsed newVal is non-null and different from previous
// - interval: polling ms (default 2000)
wsdk.watchIndexedDB = (dbName, storeName = 'keyvaluepairs', key, callback, interval = 2000) => {
  if (typeof window === 'undefined' || typeof window.wsdk === 'undefined' || typeof window.wsdk.readIndexedDB !== 'function') {
    return () => { };
  }

  const candidates = Array.isArray(dbName) ? dbName.slice() : [dbName];
  let chosen = null;
  let lastSerialized = null;
  let stopped = false;

  const safeSerialize = (v) => {
    try {
      if (v instanceof ArrayBuffer) return `ArrayBuffer:${v.byteLength}`;
      if (v instanceof Blob) return `Blob:${v.size}:${v.type}`;
      return JSON.stringify(v);
    } catch (e) {
      try { return String(v); } catch (e2) { return 'UNSERIALIZABLE'; }
    }
  };

  const probe = async () => {
    if (stopped) return;
    try {
      if (!chosen) {
        for (const name of candidates) {
          try {
            const val = await window.wsdk.readIndexedDB(name, storeName, key);
            if (val != null && (Array.isArray(val) ? val.length > 0 : true)) {
              chosen = name;
              const s = safeSerialize(val);
              if (s !== lastSerialized) {
                lastSerialized = s;
                try { callback(val, { db: chosen }); } catch (e) { console.error('watchIndexedDB callback error', e); }
              }
              break;
            }
          } catch (e) {
            // ignore individual db errors
          }
        }
      } else {
        try {
          const val = await window.wsdk.readIndexedDB(chosen, storeName, key);
          const s = safeSerialize(val);
          if (s !== lastSerialized) {
            lastSerialized = s;
            if (val != null) {
              try { callback(val, { db: chosen }); } catch (e) { console.error('watchIndexedDB callback error', e); }
            }
          }
        } catch (e) {
          // reading chosen db failed; reset chosen to try others next round
          chosen = null;
        }
      }
    } catch (e) {
      // top-level probe error shouldn't stop polling
      console.error('watchIndexedDB probe error', e);
    }
  };

  // run first probe immediately, then start interval
  probe();
  const timer = setInterval(probe, interval);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
};