/**
 * auth: vidar
 * date: 2025/07/03
 * 定义全局stats
 * 支持不同类型加载参数设置
 * 支持模块化加载.json类型
 */

// 'use strict';

window.stats = {
  isModule: false,
  crossorigin: false,
  insertToHead: false,
}

var w_random = Math.random()
var w_progress = 0
var w_timer

// show ad
var wshowAd = function (adType, callback = null, binder = null) {
  var model = wop.w_gameMode

  function gameStop() {
    if (model == 1) window.game && game.state.game.gamePaused()
    if (model == 2) {
      let _options = window['GD_OPTIONS'] || window['SDK_OPTIONS']
      _options.onEvent({
        message: '',
        name: 'SDK_GAME_PAUSE',
        status: 'success',
      })
    }
    if (model == 3) window.game && (game.state.game.paused = true)
    if (model == 4)
      window.WebAudioEngine && (window.WebAudioEngine.muted = true)
    if (model == 5) window.game && game.ticker.stop()
    if (model == 6) wother(true)
  }

  function gameStart() {
    if (model == 1) window.game && game.state.game.gameResumed()
    if (model == 2) {
      let _options = window['GD_OPTIONS'] || window['SDK_OPTIONS']
      _options.onEvent({
        message: '',
        name: 'SDK_GAME_START',
        status: 'success',
      })
    }
    if (model == 3) window.game && (game.state.game.paused = false)
    if (model == 4)
      window.WebAudioEngine && (window.WebAudioEngine.muted = false)
    if (model == 5) window.game && game.ticker.start()
    if (model == 6) wother(false)
  }

  function cb(s) {
    switch (s) {
      case 'beforeAd':
        gameStop()
        break
      case 'afterAd-no':
        gameStart()
        typeof callback == 'function' && callback.call(binder, false, 0)
        break
      case 'afterAd-yes':
        gameStart()
        typeof callback == 'function' && callback.call(binder, true, 0)
        break
      case 'afterAd-v-no':
        gameStart()
        typeof callback == 'function' && callback.call(binder, false, 1)
        break
      case 'afterAd-v-yes':
        gameStart()
        typeof callback == 'function' && callback.call(binder, true, 1)
        break
      case 'afterAd-Error-no':
        gameStart()
        typeof callback == 'function' && callback.call(binder, false)
        break
      default:
        gameStart()
        typeof callback == 'function' && callback.call(binder, false)
    }
  }

  if (wop.env !== 'dev' && !wop.parentObj.gad) {
    if (wop.w_Sdk == 'gsdk') {
      wsdk.gsdk(adType, (s) => {
        cb(s)
      })
    } else if (wop.w_Sdk == 'wsdk') {
      wsdk.showAd(adType, (s) => {
        cb(s)
      })
    } else if (wop.w_Sdk == 'yandex') {
      wsdk.showAd(adType, (s) => {
        cb(s)
      })
    }
  } else {
    typeof callback == 'function' && callback.call(binder, false)
  }
}

var wop = wop || {};
wop.parentObj = {};
wop['stats'] = {
  isModule: false,
  crossorigin: false,
  insertToHead: false,
}
wop.isRremo = false;
wop.is_init = false;
wop.showAd = null;
wop.initialize = function (parentObj) {
  console.log('initialize...')
  if (wop.is_init) return
  wop.is_init = true;
  wop.parentObj = parentObj || window.woso;
  wop.v = wop.parentObj.gameinfo.version || '---'

  wop.env = wop.parentObj.sandbox === 'beta' ? 'beta' : wop.env

  if (wop.env === 'dev') {
    let list = wop.manifest.initial.concat()
    wop.isEnter
      ? wop.loadScript(list, function () {
        if (wop.isLoading) {
          w_timer = setInterval(() => {
            wop.updateProgress(1)
          }, 10)
        }
        w_init()
        wop.parentObj.getElement('w_loadingdots') !== 'undefined' &&
          (wop.parentObj.getElement('w_loadingdots').style.display =
            'none')
        wop.parentObj.getElement('w_progressbar') !== 'undefined' &&
          (wop.parentObj.getElement('w_progressbar').style.display =
            'flex')
        let nowA = new Date().getTime() / 1000
        woso.delayA = Math.floor(nowA - woso.w_now)
        wop.gamelog(wop.parentObj.delayA, 's')
      })
      : null
  } else if (wop.env === 'beta') {
    let plurl = '../../libs/wsdk-v' + wop.version + '.js'
    if(wop.parentObj && wop.parentObj.w_ver){
      plurl = '../../libs/wsdk-v' + wop.w_ver + '.js'
    }
    // 不启动ad
    if (wop.parentObj.gad !== 'undefined' && JSON.parse(wop.parentObj.gad)) {
      let list = wop.manifest.initial.concat()
      wop.gamelog('gameloading')
      wop.isEnter
        ? wop.loadScript(list, function () {
          if (wop.isLoading) {
            w_timer = setInterval(() => {
              wop.updateProgress(1)
            }, 10)
          }
          wop.gamelog('initialize...')
          w_init()
          wop.parentObj.getElement('w_loadingdots') !==
            'undefined' &&
            (wop.parentObj.getElement('w_loadingdots').style.display =
              'none')
          wop.parentObj.getElement('w_progressbar') !==
            'undefined' &&
            (wop.parentObj.getElement('w_progressbar').style.display =
              'flex')
          let nowA = new Date().getTime() / 1000
          woso.delayA = Math.floor(nowA - woso.w_now)
          wop.gamelog(wop.parentObj.delayA, 's')
        })
        : null
    } else {
      // 加载ad
      wop.loadSingleScript(plurl, (e) => {
        console.log(e)
        wsdk.initAd(() => {
          let list = wop.manifest.initial.concat()
          wop.gamelog('gameloading')
          wop.isEnter
            ? wop.loadScript(list, function () {
              console.log('loaded game')
              if(wsdk && wsdk.showAd){
                wop.showAd = wsdk.showAd.bind(wsdk);
              }
              if (wop.isLoading) {
                w_timer = setInterval(() => {
                  wop.updateProgress(1)
                }, 10)
              }
              wop.gamelog('initialize...')
              w_init()
              woso.getElement('w_loadingdots').style.display =
                'none'
              woso.getElement('w_progressbar').style.display =
                'flex'
              let nowA = new Date().getTime() / 1000
              woso.delayA = Math.floor(nowA - woso.w_now)
              wop.gamelog(wop.parentObj.delayA, 's')
            })
            : null
        })
      })
    }
  } else if (wop.env === 'release') {
    let plurl = '../../libs/wsdk-v' + wop.version + '.min.js'
    if(wop.parentObj && wop.parentObj.w_ver){
      plurl = '../../libs/wsdk-v' + wop.w_ver + '.js'
    }
    wop.loadSingleScript(plurl, () => {
      wsdk.initAd(() => {
        let list = wop.manifest.initial.concat()
        wop.gamelog('gameloading')
        wop.isEnter
          ? wop.loadScript(list, function () {
            if(wsdk && wsdk.showAd){
                wop.showAd = wsdk.showAd.bind(wsdk);
              }
            if (wop.isLoading) {
              w_timer = setInterval(() => {
                wop.updateProgress(1)
              }, 10)
            }
            wop.gamelog('initialize...')
            if (!wop.isLog && wop.env === 'release') {
              // console.log =
              //   console.info =
              //   console.warn =
              //     function () {}
            }
            w_init()
            let nowA = new Date().getTime() / 1000
            delayA = Math.floor(nowA - woso.w_now)
            wop.gamelog(delayA, 's')
            woso.getElement('w_loadingdots').style.display =
              'none'
            woso.getElement('w_progressbar').style.display =
              'flex'
          })
          : null
      })
    })
  } else {
    console.log('no test!!!')
  }
}



function debounce(func, delay) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}



// window.addEventListener('resize', debounce(wop.resize, 300));



wop.parentObj.update = (cb) => {
  if (typeof cb === 'function') {
    const inId = setInterval(cb, 200)
    return inId
  }
}

wop.iscompleted = false
wop.trigger = function (key, data, binder) {
  // wop.gamelog(key, data, binder);
  switch (key) {
    case 'restore':
      // restore(data);
      !(function (e, a) {
        e.callback.call(a, null, localStorage.getItem(e.key))
      })(data, binder)
      break

    case 'loading.completed':
      if (wop.iscompleted) return
      wop.iscompleted = true
      wop.loadingComplete(data, binder)
      break

    case 'loading.update':
      wop.loadingUpdate(data, binder)
      break
    case 'loading.auto':
      wop.autoloading(data, binder)
    case 'levelStart':
      wop.levelStart(data, binder)
      break

    case 'gameTracking':
    case 'start':
    case 'levelFinish':
      wop.nothing(data)
      break

    case 'save':
      !(function (e, a) {
        localStorage.setItem(e.key, e.value), e.callBack && e.callback.call(a)
      })(data, binder)
      break
    case 'gameOver':
    case 'beforePlayButtonDisplay':
    case 'playButtonPressed':
      !(function (e, a) {
        e.callback.call(a)
      })(data, binder)
      break

    case 'inter':
    case 'interstitial':
    case 'interstitialAd':
      wshowAd('interstitial', data && data.callback, binder)
      break

    case 'reward':
    case 'rewarded':
    case 'rewardedAd':
      wshowAd('rewarded', data && data.callback, binder)
      break

    case 'dotPower':
      if (wop.isDotPower) {
        dotPower(data.type, data.value)
      }
      break

    default:
      console.log('No event')
      break
  }
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
wop.loadSingleScript = function (src, callback, ds = true, retryLimit = 2, customType = '') {
  let attempts = 0;
  const finalSrc = wop.isMath ? src + '?v=' + (ds && w_random) : src;

  function tryLoad() {
    // ---- 1. 如果是 import-map.json ----
    if (src.endsWith('.json')) {
      const s = document.createElement('script');
      s.async = false;
      // 默认使用 systemjs-importmap
      s.type = customType || 'systemjs-importmap';
      s.src = finalSrc;

      document.body.appendChild(s);
      setTimeout(() => callback && callback(true), 0);
      return;
    }

    // ---- 2. 其他普通脚本 ----
    const s = document.createElement('script');
    s.async = false;

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

wop.showBanner = (type, callback = null, binder = null) => {
  let _type = type || 'inter'
  wop.trigger(
    _type,
    {
      callback: callback,
    },
    binder
  )
}



wop.W_onClick = () => {
  if (wop.w_isStart) {
    wop.w_isStart = false
  } else {
    return
  }
  if (wop.firstAdClick) {
    wop.firstAd ? wsdk.showAd('fristAd') : wsdk.startGame()
  } else {
    wop.trigger('inter', {
      callback: () => {
        wop.removeLoad()
      },
    })
  }
}

wop.updateProgress = (increment) => {
  w_progress += increment
  if (typeof wop.parentObj.getElement('w_progressbar') === 'undefined') return
  wop.parentObj.getElement('w_progressbar').value = w_progress
  if (wop.parentObj.getElement('w_progressbar').value >= 100) {
    clearInterval(w_timer)
    if (wop.isAutoBar) {
      wop.trigger('loading.completed')
    }
  }
}

wop.show_PlayNow = () => {
  wop.parentObj.getElement('w_progressbar').style.display = 'none'
  wop.parentObj.getElement('w_loadingdots').style.display = 'none'
  wop.parentObj.getElement('w_PlayNow').style.display = 'flex'
}

wop.hide_PlayNow = () => {
  wop.parentObj.getElement('w_progressbar').style.display = 'flex'
  wop.parentObj.getElement('w_loadingdots').style.display = 'none'
  wop.parentObj.getElement('w_PlayNow').style.display = 'none'
}
wop.nothing = (data) => { }
wop.levelStart = (data) => { }
wop.removeLoad = (v = null) => {
  if (wop.isRremo) return;
  wop.isRremo = true
  if (v) {
    wop.parentObj.getElement('w_progressbar').style.display = 'none'
    wop.parentObj.getElement('w_PlayNow').style.display = 'flex'
  } else {
    wop.parentObj.clearElement('w_gamebox')
  }
  let nowA = new Date().getTime() / 1000
  let delay = Math.floor(nowA - wop.parentObj.w_now)
  wop.gamelog(delay, 's')
  wop.gamelog('enter game')
  if (typeof wsdk !== 'undefined' && typeof DOT !== "undefined") {
    wsdk.gameDot(DOT.GAME_START, wop.parentObj.delayA + '|' + delay)
  }
}

wop.loadingUpdate = (data) => {
  let progress = data.pre
  if (typeof wop.parentObj.getElement('w_progressbar') === 'undefined') return
  wop.parentObj.getElement('w_progressbar').value = progress
  if (progress == 100) {
    if (wop.isGo) wop.trigger('loading.completed')
  }
}

wop.auto_st = null
wop.autoloading = (data, binder) => {

  if (data && data.isAuto) {
    let loadNum = 0;
    wop.auto_st = setInterval(function () {
      if (loadNum >= 100) {

        loadNum = 0;
      }
      loadNum += 1;
      wop.trigger("loading.update", { pre: loadNum });
    }, 500);
  }
  if (data && !data.isAuto) {
    clearInterval(wop.auto_st);
    wop.trigger("loading.update", { pre: 100 });
    wop.trigger("loading.completed");
  }

}


wop.loadingComplete = (data = null, binder = null) => {
  let st = setTimeout(() => {
    wop.removeLoad(false)
    clearTimeout(st)
  }, 2000)
  data && data.callback.call(binder)
}

wop.restore = (data) => {
  const item = localStorage.getItem(data.key)

  data.callback(null, item)
}

wop.w_power_db = null

wop.w_indexedDB = {
  /**
   * 打开数据库
   * @param {object} dbName 数据库的名字
   * @param {string} storeName 仓库名称
   * @param {string} version 数据库的版本
   * @return {object} 该函数会返回一个数据库实例
   */
  openDB: function (dbName, version = 2) {
    return new Promise((resolve, reject) => {
      //  兼容浏览器
      var indexedDB =
        window.indexedDB ||
        window.mozIndexedDB ||
        window.webkitIndexedDB ||
        window.msIndexedDB
      let db
      // 打开数据库，若没有则会创建
      const request = indexedDB.open(dbName, version)
      // 数据库打开成功回调
      request.onsuccess = function (event) {
        db = event.target.result // 数据库对象
        wop.gamelog('db open')
        // let transaction = db.transaction(["keyvaluepairs"],'readwrite');
        // transaction.oncomplete = function(event){
        //     console.log("data update")
        // }
        resolve(db)
      }
      // 数据库打开失败的回调
      request.onerror = function (event) {
        wop.gamelog('db error')
      }
      // 数据库有更新时候的回调
      request.onupgradeneeded = function (event) {
        // 数据库创建或升级的时候会触发
        wop.gamelog('onupgradeneeded')
        db = event.target.result // 数据库对象
        var objectStore
        // 创建存储库
        objectStore = db.createObjectStore('keyvaluepairs')
      }
    })
  },

  addData: function (db, storeName, data) {
    var request = db.transaction([storeName], 'readwrite')
    request.objectStore(storeName) // 仓库对象
    request.add(data)

    request.onsuccess = function (event) {
      console.log('db wirte end')
    }

    request.onerror = function (event) {
      console.log('db wirte error')
    }
  },

  getData: function (db, storeName, key) {
    return new Promise((resolve, reject) => {
      var transaction = db.transaction([storeName]) // 事务
      var objectStore = transaction.objectStore(storeName) // 仓库对象
      var request = objectStore.get(key) // 通过主键获取数据

      transaction.oncomplete

      request.onerror = function (event) {
        wop.gamelog('event error')
      }

      request.onsuccess = function (event) {
        wop.gamelog('keyvalue: ', request.result)
        resolve(request.result)
      }
    })
  },
}
gamelog = wop.gamelog.bind(wop)
wop.info = wop.initialize()
window.W_onClick = wop.W_onClick
window.V_lib = 'v-' + wop.v
