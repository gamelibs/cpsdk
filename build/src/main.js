// 游戏页面主脚本 - 调整为新的 UI 结构，日志输出到页面
const logBox = document.getElementById('logBox');
const logContent = document.getElementById('logContent');
const clearBtn = document.getElementById('clearLog');

const interstitialBtn = document.getElementById('interstitialBtn');
const rewardedBtn = document.getElementById('rewardedBtn');
const startBtn = document.getElementById('startBtn');
const levelStartBtn = document.getElementById('levelStartBtn');
const levelEndBtn = document.getElementById('levelEndBtn');
const sdkReadyEl = document.getElementById('sdk-ready');
const refreshBtn = document.getElementById('refreshBtn');

// accumulate game state for level/score
let accumulatedLevel = 0;
let accumulatedScore = 0;

function log(...args) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  logContent.appendChild(entry);
  logBox.scrollTop = logBox.scrollHeight;
  console.log.apply(console, args);
}

clearBtn.addEventListener('click', () => {
  logContent.innerHTML = '';
});

// We rely on wsdk to manage ad SDK initialization. If present, `window.adInstance`
// should be set by wsdk-v4.4. Subscribe to its event bus to show logs.
sdkReadyEl.textContent = 'waiting for wsdk';

function attachAdListeners(ai) {
  if (!ai || !ai._eventAds || typeof ai._eventAds.on !== 'function') return false;
  ai._eventAds.on('ready', () => { sdkReadyEl.textContent = 'ready'; log('[ad] ready'); });
  ai._eventAds.on('beforeAd', (t1, t2) => { log('[ad] beforeAd', t1, t2); });
  ai._eventAds.on('afterAd', (t1, t2) => { log('[ad] afterAd', t1, t2); });
  ai._eventAds.on('interstitial', (data) => { log('[ad] interstitial', data); });
  ai._eventAds.on('reward', (data) => { log('[ad] reward', data); });
  ai._eventAds.on('adViewed', () => { log('[ad] adViewed'); });
  ai._eventAds.on('adDismissed', () => { log('[ad] adDismissed'); });
  ai._eventAds.on('error', (a,b) => { log('[ad] error', a, b); });
  return true;
}

// Try immediate attach then poll for a short time
if (attachAdListeners(window.adInstance)) {
  sdkReadyEl.textContent = 'attached';
} else {
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    if (attachAdListeners(window.adInstance)) { clearInterval(poll); sdkReadyEl.textContent = 'attached'; }
    if (attempts > 30) { clearInterval(poll); log('[ad] no adInstance found'); }
  }, 200);
}

// button handlers
interstitialBtn.addEventListener('click', () => {
  log('click interstitial');
  try {
    if (window.wsdk && typeof window.wsdk.showAd === 'function') {
      window.wsdk.showAd('interstitial').then(() => log('[ad] showAd resolved')).catch(e => log('[ad] showAd error', e));
    } else if (window.adInstance) {
      // last-resort: call adInstance directly
      try { window.adInstance._showInterstitialAd && window.adInstance._showInterstitialAd(); } catch (e) { log('interstitial direct error', e); }
    } else {
      log('no ad provider available');
    }
  } catch (e) { log('interstitial error', e); }
});

rewardedBtn.addEventListener('click', () => {
  log('click rewarded');
  try {
    if (window.wsdk && typeof window.wsdk.showAd === 'function') {
      window.wsdk.showAd('rewarded').then(() => log('[ad] showAd resolved')).catch(e => log('[ad] showAd error', e));
    } else if (window.adInstance) {
      try { window.adInstance._showRewardAd && window.adInstance._showRewardAd(); } catch (e) { log('reward direct error', e); }
    } else {
      log('no ad provider available');
    }
  } catch (e) { log('reward error', e); }
});


// Also report via wsdk.gameDot for centralized tracking (if available)
startBtn.addEventListener('click', () => {
  try {
    if (window.wsdk && typeof window.wsdk.gameDot === 'function') {
      window.wsdk.gameDot('game_start', 'user_clicked');
    }
  } catch (e) { log('wsdk.gameDot error', e); }
});

levelStartBtn.addEventListener('click', () => {
  try {
    if (window.wsdk && typeof window.wsdk.gameDot === 'function') {
      window.wsdk.gameDot('level_start', { level_name: 0 });
      log('[wsdk] level_start sent');
    }
  } catch (e) { log('wsdk.gameDot error', e); }
});

levelEndBtn.addEventListener('click', () => {
  try {
    // increment counters
    accumulatedLevel = (accumulatedLevel || 0) + 1;
    accumulatedScore = (accumulatedScore || 0) + 10;

    const payload = {
      level_name: accumulatedLevel,
      success: true,
      score: accumulatedScore
    };

    if (window.wsdk && typeof window.wsdk.gameDot === 'function') {
      window.wsdk.gameDot('level_end', payload);
      log('[wsdk] level_end sent', payload);
    } else {
      log('wsdk not available, level_end not sent via wsdk');
    }

  } catch (e) { log('wsdk.gameDot error', e); }
});

// expose a simple debug API
window.gameLogger = { log };

// refresh button inside iframe
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    log('refresh clicked');
    try { window.location.reload(); } catch (e) { log('refresh error', e); }
  });
}

