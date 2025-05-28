System.register("chunks:///_virtual/Layout_AboutMe.ts",["./rollupPluginModLoBabelHelpers.js","cc"],(function(t){var e,o,r,n,i,u,a,c;return{setters:[function(t){e=t.applyDecoratedDescriptor,o=t.inheritsLoose,r=t.initializerDefineProperty,n=t.assertThisInitialized},function(t){i=t.cclegacy,u=t._decorator,a=t.Button,c=t.Component}],execute:function(){var l,s,p,y,b;i._RF.push({},"ef566+K4g1FM6XZ5ySGiuCg","Layout_AboutMe",void 0);var f=u.ccclass,_=u.property;t("Layout_AboutMe",(l=f("Layout_AboutMe"),s=_(a),l((b=e((y=function(t){function e(){for(var e,o=arguments.length,i=new Array(o),u=0;u<o;u++)i[u]=arguments[u];return e=t.call.apply(t,[this].concat(i))||this,r(e,"btnClose",b,n(e)),e}return o(e,t),e}(c)).prototype,"btnClose",[s],{configurable:!0,enumerable:!0,writable:!0,initializer:null}),p=y))||p));i._RF.pop()}}}));

System.register("chunks:///_virtual/Layout_Setting.ts",["./rollupPluginModLoBabelHelpers.js","cc"],(function(e){var t,n,i,o,r,l,a,u,c,s;return{setters:[function(e){t=e.applyDecoratedDescriptor,n=e.inheritsLoose,i=e.initializerDefineProperty,o=e.assertThisInitialized},function(e){r=e.cclegacy,l=e._decorator,a=e.Button,u=e.Node,c=e.Toggle,s=e.Component}],execute:function(){var p,g,b,y,f,d,m,_,h,z,v;r._RF.push({},"da7dfa8kqFO7Ipp4zKlfMmm","Layout_Setting",void 0);var L=l.ccclass,T=l.property;e("Layout_Setting",(p=L("Layout_Setting"),g=T(a),b=T(u),y=T(c),f=T(c),p((_=t((m=function(e){function t(){for(var t,n=arguments.length,r=new Array(n),l=0;l<n;l++)r[l]=arguments[l];return t=e.call.apply(e,[this].concat(r))||this,i(t,"btnClose",_,o(t)),i(t,"content",h,o(t)),i(t,"musicToggle",z,o(t)),i(t,"soundToggle",v,o(t)),t}return n(t,e),t}(s)).prototype,"btnClose",[g],{configurable:!0,enumerable:!0,writable:!0,initializer:null}),h=t(m.prototype,"content",[b],{configurable:!0,enumerable:!0,writable:!0,initializer:null}),z=t(m.prototype,"musicToggle",[y],{configurable:!0,enumerable:!0,writable:!0,initializer:null}),v=t(m.prototype,"soundToggle",[f],{configurable:!0,enumerable:!0,writable:!0,initializer:null}),d=m))||d));r._RF.pop()}}}));

System.register("chunks:///_virtual/module_extra",["./Layout_AboutMe.ts","./UI_AboutMe_Impl.ts","./Layout_Setting.ts","./UI_Setting_Impl.ts"],(function(){return{setters:[null,null,null,null],execute:function(){}}}));

System.register("chunks:///_virtual/UI_AboutMe_Impl.ts",["./rollupPluginModLoBabelHelpers.js","cc","./tgx.ts","./GameUILayers.ts","./UIDef.ts","./Layout_AboutMe.ts","./ModuleContext.ts"],(function(t){var e,n,o,u,s,i;return{setters:[function(t){e=t.inheritsLoose},function(t){n=t.cclegacy},null,function(t){o=t.GameUILayers},function(t){u=t.UI_AboutMe},function(t){s=t.Layout_AboutMe},function(t){i=t.ModuleContext}],execute:function(){n._RF.push({},"b9113zWxwlLxpIz2ENLIXZG","UI_AboutMe_Impl",void 0);var r=t("UI_AboutMe_Impl",function(t){function n(){return t.call(this,"ui_about/UI_AboutMe",o.POPUP,s)||this}e(n,t);var u=n.prototype;return u.getRes=function(){return[]},u.onCreated=function(){var t=this,e=this.layout;this.onButtonEvent(e.btnClose,(function(){t.hide()}))},n}(u));i.attachImplClass(u,r),n._RF.pop()}}}));

System.register("chunks:///_virtual/UI_Setting_Impl.ts",["./rollupPluginModLoBabelHelpers.js","cc","./AudioMgr.ts","./tgx.ts","./GameUILayers.ts","./UIDef.ts","./Layout_Setting.ts","./AliensAudioMgr.ts","./ModuleContext.ts"],(function(t){var n,i,e,o,s,u,c,g;return{setters:[function(t){n=t.inheritsLoose},function(t){i=t.cclegacy},function(t){e=t.AudioMgr},null,function(t){o=t.GameUILayers},function(t){s=t.UI_Setting},function(t){u=t.Layout_Setting},function(t){c=t.AliensAudioMgr},function(t){g=t.ModuleContext}],execute:function(){i._RF.push({},"bf6207lZAVGO4mPPabXKPX4","UI_Setting_Impl",void 0);var l=t("UI_Setting_Impl",function(t){function i(){return t.call(this,"ui_setting/UI_Setting",o.POPUP,u)||this}n(i,t);var s=i.prototype;return s.getRes=function(){return[]},s.onCreated=function(){var t=this,n=this.layout;this.onButtonEvent(n.btnClose,(function(){c.playOneShot(c.getMusicIdName(2),1),t.hide()})),this.initilizeUI()},s.initilizeUI=function(){var t=this.layout,n=t.musicToggle,i=t.soundToggle;n.node.on("toggle",this.musicSwitch,this),i.node.on("toggle",this.soundSwitch,this);var o=e.inst,s=o.bgMusicEnabled,u=o.soundEffectsEnabled;e.inst.toggleBgMusic(s),e.inst.toggleSoundEffects(u),n.isChecked=s,i.isChecked=u},s.musicSwitch=function(t){e.inst.toggleBgMusic(t.isChecked)},s.soundSwitch=function(t){e.inst.toggleSoundEffects(t.isChecked)},i}(s));g.attachImplClass(s,l),i._RF.pop()}}}));

(function(r) {
  r('virtual:///prerequisite-imports/module_extra', 'chunks:///_virtual/module_extra'); 
})(function(mid, cid) {
    System.register(mid, [cid], function (_export, _context) {
    return {
        setters: [function(_m) {
            var _exportObj = {};

            for (var _key in _m) {
              if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _m[_key];
            }
      
            _export(_exportObj);
        }],
        execute: function () { }
    };
    });
});