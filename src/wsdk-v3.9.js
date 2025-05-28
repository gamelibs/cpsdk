/**
 * auth:vidar
 * date: 2024-10-31
 *增加60秒自动弹出广告
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
wsdk.adover = {
  rewarded: false,
  interstitial: false,
}

typeof gamelog !== 'undefined' && gamelog('channel', wop.channel)
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
      gamelog(err)
    }
    base && base.apply(this, arguments)
  }
})(function () {})
var adInstance,
  isTimeOut = true,
  mTimeOut = true
try {
  var w_script = document.createElement('script')
  w_script.async = true
  w_script.src = 'https://www.cpsense.com/public/PRESDK3.0.1.js'
  // w_script.setAttribute('crossorigin', 'anonymous');
  document.head.appendChild(w_script)
} catch (e) {
  console.log(e)
}

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

  let st = setTimeout(function () {
    clearTimeout(st)
    if (wop.firstAdClick) {
      wop.show_PlayNow()
    } else {
      wop.firstAd
        ? wsdk
            .showAd('fristAd')
            .then(() => {
              gamecallback && gamecallback()
            })
            .catch(() => {})
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
      console.log("inact-----", Math.floor(inactiveTime))
      if (window.w_AutoAding) lastInteractionTime = currentTime
      if (inactiveTime > si && !window.w_AutoAding) {
        typeof gamelog === 'function' &&
          gamelog('AutoAd', si, window.w_AutoAding)
        lastInteractionTime = currentTime
        typeof wop !== 'undefined' && wop.trigger('interstitial')
      }

      const playinactiveTime = currentTime - w_LastInteractionAdTime
      // console.log("play+++++", Math.floor(playinactiveTime))
      if (window.w_AutoAding) w_LastInteractionAdTime = currentTime
      if (playinactiveTime > ssi && !window.w_AutoAding) {
        typeof gamelog === 'function' &&
          gamelog('AutoAd', ssi, !window.w_AutoAding)
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

wsdk.prob = (prob) => {
  if (prob === 0) {
    return false
  } else if (prob === 1) {
    return true
  } else {
    let m = Math.random()
    gamelog(m)
    if (m < prob) {
      return true
    } else {
      return false
    }
  }
}
// Pre loading and displaying advertisements
let sd,
  d = 1
wsdk.showAd = (type, callback) => {
  // console.log("window.w_isShowAd",window.w_isShowAdTime())
  typeof wother !== 'undefined' && wother && wother(true)
  if (wwwoso['tc']) {
    return new Promise((resolve, reject) => {
      resolve(true)
      callback && callback()
      typeof wother !== 'undefined' && wother && wother(false)
    })
  } else {
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

          adInstance.interstitialAd({
            beforeAd() {
              isTimeOut = true
              typeof gamebox !== 'undefined' && (gamebox.style.display = 'none')
              wsdk.gameDot(DOT.GAME_INTERSTITIAL_OPEN, 'fristAd open')
            },
            afterAd() {
              isTimeOut = true
              wsdk.gameDot(DOT.GAME_INTERSTITIAL_VIEWED, 'fristAd viewed')
              typeof gamebox !== 'undefined' &&
                (gamebox.style.display = 'block')
              w_handleSuccess(true)
            },
            error(err) {
              isTimeOut = true
              gamelog('fristAd', err)
              wsdk.gameDot(DOT.AD_ERROR, 'fristAd ' + err)
              w_handleError(err, true)
            },
          })

          const st_time = setTimeout(() => {
            clearTimeout(st_time)
            if (!isTimeOut) {
              gamelog('fristAd timeout 3s')
              wsdk.gameDot(DOT.AD_ERROR, 'fristAd timeout')
              w_handleError('timeout', true)
            }
          }, 3000)
        }

        // Display inset ads
        function showInterstitialAd(callback) {
          let isAdError = false
          adInstance &&
            adInstance.interstitialAd({
              beforeAd() {
                isAdError = true
                wsdk.gameDot(DOT.GAME_INTERSTITIAL_OPEN, 'ad open')
                if (wwwoso.sdkType === 2) {
                  wsdk.gameplay('pause')
                }
                callback && callback('beforeAd')
                window.w_AutoAding = true
              },
              afterAd() {
                isAdError = true
                wsdk.gameDot(DOT.GAME_INTERSTITIAL_VIEWED, 'afterAd viewed')
                if (wwwoso.sdkType === 2) {
                  wsdk.gameplay('start')
                }
                callback && callback('afterAd-yes')
                w_handleSuccess()
              },
              error(err) {
                isAdError = true
                wsdk.gameDot(DOT.AD_ERROR, err)
                if (wwwoso.sdkType === 2) {
                  wsdk.gameplay('start')
                }
                callback && callback('afterAd-Error-no')
                w_handleError(err)
              },
            })

          const st_Inter = setTimeout(() => {
            clearTimeout(st_Inter)

            if (!isAdError) {
              wsdk.gameDot(DOT.AD_ERROR, 'inter timeout')
              if (wwwoso.sdkType === 2) {
                wsdk.gameplay('start')
              }
              callback && callback('afterAd-Error-no')
              w_handleError('timerout')
            }
          }, 2000)
        }

        //Display motivational video advertisements
        function showRewardedVideoAd(callback) {
          let isAdError = false
          adInstance.rewardAd({
            beforeAd() {
              isAdError = true
              wsdk.gameDot(DOT.GAME_REWARD_OPEN, 'ad reward open')
              if (wwwoso.sdkType === 2) {
                wsdk.gameplay('pause')
              }
              callback && callback('beforeAd')
            },
            adDismissed() {
              isAdError = true
              wsdk.gameDot(DOT.GAME_REWARD_DISMISSED)
              if (wwwoso.sdkType === 2) {
                wsdk.gameplay('start')
              }
              callback && callback('afterAd-v-no')

              window.success && window.success(false)
              window.failure && window.failure(false)
              w_handleError('dismiss')
            },
            adViewed() {
              isAdError = true
              wsdk.gameDot(DOT.GAME_REWARD_VIEWED)
              if (wwwoso.sdkType === 2) {
                wsdk.gameplay('start')
              }
              callback && callback('afterAd-v-yes')
              window.success && window.success(true)
              w_handleSuccess()
            },
            error(err) {
              isAdError = true
              wsdk.gameDot(DOT.AD_ERROR, 'video' + err)
              if (wwwoso.sdkType === 2) {
                wsdk.gameplay('start')
              }
              callback && callback('afterAd-Error-no')
              w_handleError(err)
            },
          })

          const st_video = setTimeout(() => {
            clearTimeout(st_video)

            if (!isAdError) {
              wsdk.gameDot(DOT.AD_ERROR, 'video timerout')
              if (wwwoso.sdkType === 2) {
                wsdk.gameplay('start')
              }
              callback && callback('afterAd-v-no')
              w_handleError('timerout')
            }
          }, 2000)
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
        // gamelog("ad", type)

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
          if (!wsdk.prob(wop.adProb)) {
            resolve()
            gamecallback && gamecallback()
            return
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
        .catch(() => {})
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
//prox
var wop = wop || {}

/**Report game events*/
wsdk.gameDot = (events, value = '') => {
  // gamelog("dot_type", events, value);
  if (!wop.isDot) {
    gamelog('No dot', events, value)
    return
  }
  switch (events) {
    case DOT.GAME_START:
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
  var datavalue = {
    score: 0,
    success: true,
    level_name: 0,
  }

  switch (type) {
    case 1: //ex1 localStorage
      datavalue.score = data[1]
      datavalue.level_name = data[2]
      wsdk.gameDot(DOT.LEVEL_END, datavalue)
      break
    case 2: //ex2 IndexedDB
      let database_name = data[0]
      let version_number = 2

      let request = indexedDB.open(database_name, version_number)

      request.onsuccess = function (event) {
        let db = event.target.result
        let store_name = 'keyvaluepairs'

        let transaction = db.transaction([store_name], 'readonly')
        let objectStore = transaction.objectStore(store_name)

        let getRequest1 = objectStore.get(data[1])

        getRequest1.onsuccess = function (event) {
          let value = event.target.result
          datavalue.score = value || 0
          console.log('score', value)
        }

        getRequest1.onerror = function (event) {
          console.log('score err', event)
        }

        let getRequest2 = objectStore.get(data[2])

        getRequest2.onsuccess = function (event) {
          let value = event.target.result
          datavalue.level_name = value || 0
          console.log('level', value)
        }

        getRequest2.onerror = function (event) {
          console.log('level err', event)
        }

        transaction.oncomplete = function (event) {
          db.close()
          wsdk.gameDot(DOT.LEVEL_END, datavalue)
        }
      }

      request.onerror = function (event) {
        console.log('open indexdata')
      }
  }
}
