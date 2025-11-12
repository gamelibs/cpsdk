{
  "id": "1_1750124387137",
  "name": "游戏管理平台SDK",
  "platform": "web",
  "templateId": "CpLiyang",
  "templateName": "CpLiyang",
  "templateVersion": "1.0.0",
  "description": "游戏管理平台专用SDK实例，支持广告配置和游戏集成",
  "status": "active",
  "config": {
    "basic": {
      "enabled": true,
      "debug": false,
      "initParams": "",
      "thirdPartyScripts": [
      ]
    },
    "features": {
      "ads": {
        "enabled": false,
        "provider": "admob",
        "interval": 30,
        "testMode": false
      },
      "analytics": {
        "enabled": false,
        "provider": "google",
        "trackingId": "",
        "autoEvents": true
      },
      "dot": {
        "enabled": true
      },
      "push": {
        "enabled": false,
        "provider": "fcm",
        "appKey": ""
      },
      "social": {
        "enabled": false,
        "platforms": []
      }
    },
    "adChannel": "cpsense",
    "adProb": 1,
    "updatedAt": "2025-11-04T02:38:25.977Z"
  },
  "testUrl": "http://localhost:3000/sdk/test/1_1750124387137",
  "createdAt": "2025-06-17T01:39:47.139Z",
  "updatedAt": "2025-11-04T02:38:25.992Z",
  "platformId": "1017",
  "environment": "production",
  "enabled": true,
  "debugMode": false,
  "autoTest": false,
 
  "scripts": {
    "testing": {
      "url": "http://192.168.1.155:13200/api/v1/sdk/templates/CpLiyang/",
      "fileName": "CpLiyang.js",
      "version": "1.0"
    },
    "production": {
      "url": "https://cpsense.heiheigame.com/libs/",
      "fileName": "CpLiyang.min.js",
      "version": "1.0"
    }
  },
  "thirdPartyScripts": { //这个是三方脚本配置,游戏配置那边打开编辑时,会拉取这个配置根据对应环境写入游戏配置"thirdPartyScripts": []中,beta环境就写beta下的[]中内容

    "beta": [
      "http://192.168.1.155:13600/src/wsdk-v4.5.js"
    ],
    "release": [
      "https://cpsense.heiheigame.com/libs/wsdk-v4.5.min.js"
    ]
  }
    ,
  "configBase": { // 这个是游戏配置拉取地址配置也是分环境的,此配置会传递给游戏配置页面,游戏配置页面根据环境拉取对应的配置地址
    "testing": "http://192.168.1.155:13200/api/v1/game/1017/",
    "production": "https://cpsense.heiheigame.com/gameconfig/cpliyang/"
  }

}


