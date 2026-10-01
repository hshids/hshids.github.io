/* JinBingBing's upright following tail and planted, one-paw butterfly play. */
(function () {
  'use strict';
  var A = window.HJArt;
  if (!A) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var uprightTail = [[13,0],[32,0],[35,24],[34,33],[29,42],[20,41],[13,34]];
  var k = 7 / 32;
  // Near hind-paw contact measured in each complete native source pose.
  // These registrations keep her weight on the same stone during the rear-up.
  var hind = [[233,316],[230,316],[238,317],[235,318],[248,317],[248,317],[242,317],[241,317]];
  var paw = [[264,320],[265,320],[271,239],[250,183],[357,116],[358,111],[349,72],[258,204]];
  var timeline = [[.10,0],[.23,1],[.39,2],[.56,3],[.72,4],[.88,5],[1.08,6],
    [1.22,5],[1.36,4],[1.52,7],[1.68,3],[1.86,2],[2.02,1],[2.20,0]];
  function clamp(n,a,b) { return Math.max(a,Math.min(b,n)); }
  function inside(points,x,y) {
    var result = false;
    for (var i=0,j=points.length-1; i<points.length; j=i++) {
      var a=points[i],b=points[j];
      if ((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) result=!result;
    }
    return result;
  }
  A.catV9Configurations = function (base) {
    var originalWeights = base.weights;
    base.image = 'cats-upright-painted';
    // Same native pixel scale as the previous painting, extending its crop
    // upward to preserve the new vertical tail tip. Paws and body do not scale.
    base.crop = [764,2,742,584];
    base.box = [2,6+(2-33)*64/553,86,584*64/553];
    base.weights = function (x,y) {
      if (inside(uprightTail,x,y)) {
        var amount = clamp((42-y)/12,0,1);
        amount = amount*amount*(3-2*amount);
        return amount ? [[13,amount],[0,1-amount]].filter(function (w) { return w[1]>0; }) : [[0,1]];
      }
      return originalWeights(x,y);
    };
    var configs = [base];
    hind.forEach(function (foot,n) {
      configs.push({image:'jinbingbing-butterfly-phases',sheet:[1536,1024],
        crop:[n%4*384,Math.floor(n/4)*341,384,341],
        box:[52.1-foot[0]*k,66.9-foot[1]*k,384*k,341*k],step:2,
        alphaCutoff:.008,nativeCatPose:n,
        footContacts:[{x:52.1,y:66.9,stance:true,lift:0}],
        forepaw:[52.1+(paw[n][0]-foot[0])*k,66.9+(paw[n][1]-foot[1])*k],
        weights:function () { return [[0,1]]; }});
    });
    return configs;
  };
  A.catV9Frame = function (rig,t) {
    var root=rig.root;
    if (!root.classList.contains('is-pouncing') || reduced || rig.configs.length<9) {
      root._rigCatPounceFrame=null;
      return rig.configs[0];
    }
    if (rig.times['is-pouncing']===undefined) rig.times['is-pouncing']=t;
    var elapsed=(t-rig.times['is-pouncing'])/1000,phase=0;
    for (var i=0;i<timeline.length;i++) if (elapsed<timeline[i][0]) { phase=timeline[i][1];break; }
    var config=rig.configs[phase+1];
    root._rigCatPounceFrame={phase:phase,time:elapsed,painting:config.image,
      hind:{x:52.1,y:66.9},forepaw:config.forepaw.slice()};
    root._rigCatTailAngle=0;
    root._rigCatHeadAngle=0;
    root._rigCatSpineAngle=0;
    return config;
  };
  A.catV9TailAngle = function (t) {
    return reduced ? 0 : Math.sin(t/1150)*2.6+Math.sin(t/2690)*.6;
  };
})();
