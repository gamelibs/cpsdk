// Vite前端入口文件
import './style.css';



const readyButton = document.getElementById('ready');
const beforeAdButton = document.getElementById('before-ad');
const afterAdButton = document.getElementById('after-ad');
const adDismissedButton = document.getElementById('adDismissed');
const adViewedButton = document.getElementById('adViewed');
const errorButton = document.getElementById('error');
const interstitialButton = document.getElementById('interstitial');
const rewardedButton = document.getElementById('rewarded');
const startButton = document.getElementById('start');
const ACTIVE_CLASS = 'active';




// 初始化广告
const adSdkConfig = {
  el: document.querySelector("#adcontent"),
  client: 'cpsense',
  is_test: true
}

const adInstance = new adSdk(adSdkConfig);
window.wsdk = adInstance; // 将实例挂载到 window 对象上，方便调试
// console.log("adInstance:", adInstance);

// 监听广告加载完成事件
adInstance._eventAds.on('ready', () => {
  setButtonActive(readyButton, false); // 就绪按钮不自动恢复
});

adInstance._eventAds.on('beforeAd', () => {
  setButtonActive(beforeAdButton);
});

adInstance._eventAds.on('afterAd', () => {
  setButtonActive(afterAdButton, 2000); // 2000ms 后恢复
});

adInstance._eventAds.on('adDismissed', () => {
  setButtonActive(adDismissedButton);
});

adInstance._eventAds.on('adViewed', () => {
  setButtonActive(adViewedButton);
});

adInstance._eventAds.on('error', (type1, type2) => {
  if (type2 !== "viewed") {
    setButtonActive(errorButton);
  }
});

adInstance._eventAds.on('interstitial', () => {
  setButtonActive(interstitialButton);
});

adInstance._eventAds.on('reward', () => {
  setButtonActive(rewardedButton);
});

function setButtonActive(button, timeout = 10000) {
  button.classList.add(ACTIVE_CLASS);

  // 可选：添加淡入动画效果
  button.style.transition = 'background-color 0.3s ease';

  if (timeout !== false) {
    setTimeout(() => {
      button.classList.remove(ACTIVE_CLASS);
    }, timeout);
  }
}

startButton.addEventListener('click', () => {
  console.log('点击了开始按钮');
  // adInstance.start();
  gtag('event', 'game_start', { send: 'sdk', game_name: 'testgame' });
});

let isClick = false;
interstitialButton.addEventListener('click', () => {
  // if (isClick) {
  //   console.log('请勿重复点击');
  //   return;
  // }
  // isClick = true;
  // setTimeout(() => {
  //   isClick = false;
  // }, 2000); // 2秒内禁止重复点击
  console.log('点击了插页按钮');
  showAd('interstitialAd');
});

rewardedButton.addEventListener('click', () => {
  console.log('点击了激励按钮');
  showAd('rewardAd');
});

const showAd = (type) => {

  if (true) {
    if (type === "rewardAd") {
      adInstance.rewardAd({
        beforeAd() {
          console.log('Prepare for the ad. Mute and pause the game flow.');
        },
        adDismissed() {
          console.log('Player dismissed the ad before completion.');
        },
        adViewed() {
          console.log('Player watched the ad, give them the reward.');
        },
        error(err) {
          console.log(err);
        }
      });
    } else {
      adInstance.interstitialAd({
        beforeAd() {
          console.log('Prepare for the ad. Mute and pause the game flow.');
        },
        afterAd() {
          console.log('Ad show normally,ad has been closed, Resume the game and un-mute the sound.');
        },
        error(err) {
          console.log(err);
        }
      });
    }

  }
  // if ("interstitialAd") {

  // }


};
