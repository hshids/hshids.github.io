/* One painted JinBingBing: continuous foreleg joints, planted haunches and a happy tail. */
(function () {
  'use strict';
  var A=window.HJArt;
  if(!A)return;
  var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var uprightTail=[[13,0],[32,0],[35,24],[34,33],[29,42],[20,41],[13,34]];
  var curledTail=[[4,34],[34,34],[41,56],[36,71],[4,71]];
  // The forelimbs are isolated native alpha surfaces. Their bind directions
  // are clear of the painted torso; no triangle connects a paw to the belly.
  var front=[
    {p:[62,36.7],k:[69.293,51.143],e:[79.017,62.9405],rest:[61.7,64.3],bone:4,
      crop:[1080,512,438,452],box:[52.562,34.126,31.317,32.318]},
    {p:[51.5,36],k:[42.8175,50.7225],e:[35.4185,63.935],rest:[52.1,64.55],bone:10,
      crop:[1050,32,448,461],box:[27.34,32.376,33.824,34.8055]}
  ];
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function smooth(n){n=clamp(n,0,1);return n*n*(3-2*n);}
  function identity(){return [1,0,0,1,0,0];}
  function multiply(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
  function rotate(deg,x,y){var a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [c,s,-s,c,x-c*x+s*y,y-s*x-c*y];}
  function transform(m,p){return [m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];}
  function inversePoint(m,p){var det=m[0]*m[3]-m[1]*m[2],x=p[0]-m[4],y=p[1]-m[5];return [(m[3]*x-m[2]*y)/det,(-m[1]*x+m[0]*y)/det];}
  function inside(points,x,y){
    var result=false;
    for(var i=0,j=points.length-1;i<points.length;j=i++){var a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])result=!result;}
    return result;
  }
  function bodyWeights(x,y){
    var chest=smooth((61-y)/14)*smooth((x-31)/13);
    return chest===1?[[15,1]]:chest===0?[[0,1]]:[[15,chest],[0,1-chest]];
  }
  function sittingWeights(x,y){
    if(inside(curledTail,x,y)){
      // The coil and its ground contact stay put. Only its upper tip flexes.
      var tip=smooth((37-x)/15)*smooth((64-y)/20);
      return tip?[[13,tip],[0,1-tip]]:[[0,1]];
    }
    return bodyWeights(x,y);
  }
  function headWeights(x,y){
    var face=smooth((39-y)/10);
    return face===1?[[14,1]]:face===0?[[15,1]]:[[14,face],[15,1-face]];
  }
  function limbWeights(leg,x,y){
    var dx=leg.e[0]-leg.k[0],dy=leg.e[1]-leg.k[1],length=Math.hypot(dx,dy);
    var along=((x-leg.k[0])*dx+(y-leg.k[1])*dy)/length;
    var lower=smooth((along+3.3)/6.6),paw=smooth((along-length+4.2)/4.2);
    return [[leg.bone,1-lower],[leg.bone+1,lower*(1-paw)],[leg.bone+2,lower*paw]].filter(function(w){return w[1]>.00001;});
  }
  function mix(a,b,u){return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];}
  function play(time){
    if(time<.25)return {rear:.08*smooth(time/.25),reach:0};
    if(time<.85){var rise=smooth((time-.25)/.6);return {rear:.08+.92*rise,reach:.45*rise};}
    if(time<1.2)return {rear:1,reach:.45+.55*smooth((time-.85)/.35)};
    if(time<2.8)return {rear:1,reach:1};
    if(time<3.15)return {rear:1,reach:1-.55*smooth((time-2.8)/.35)};
    if(time<3.65){var down=1-smooth((time-3.15)/.5);return {rear:down,reach:.45*down};}
    return {rear:0,reach:0};
  }
  function solve(leg,target,parent,amount){
    var aim=inversePoint(parent,target),ux=leg.k[0]-leg.p[0],uy=leg.k[1]-leg.p[1],fx=leg.e[0]-leg.k[0],fy=leg.e[1]-leg.k[1];
    var upper=Math.hypot(ux,uy),lower=Math.hypot(fx,fy),dx=aim[0]-leg.p[0],dy=aim[1]-leg.p[1];
    var distance=clamp(Math.hypot(dx,dy),Math.abs(upper-lower)+.02,upper+lower-.02),direction=Math.atan2(dy,dx),side=ux*fy-uy*fx<0?-1:1;
    var bend=Math.acos(clamp((upper*upper+distance*distance-lower*lower)/(2*upper*distance),-1,1)),angle=direction-side*bend;
    var theta=side*Math.acos(clamp((distance*distance-upper*upper-lower*lower)/(2*upper*lower),-1,1));
    var hi=(angle-Math.atan2(uy,ux))*180/Math.PI,lo=(theta-Math.atan2(fy,fx)+Math.atan2(uy,ux))*180/Math.PI;
    var first=multiply(parent,rotate(hi,leg.p[0],leg.p[1])),second=multiply(first,rotate(lo,leg.k[0],leg.k[1]));
    // Resting toe pads lie across the paving. During the reach the same paw
    // gradually follows its forearm again, keeping the accepted play pose.
    return [first,second,multiply(second,rotate(-(hi+lo)*(1-clamp(amount,0,1)),leg.e[0],leg.e[1]))];
  }
  A.catV9Configurations=function(base){
    var originalWeights=base.weights;
    base.image='cats-upright-painted';base.crop=[764,2,742,584];base.box=[2,6+(2-33)*64/553,86,584*64/553];
    base.weights=function(x,y){if(inside(uprightTail,x,y)){var amount=smooth((42-y)/12);return amount?[[13,amount],[0,1-amount]].filter(function(w){return w[1]>0;}):[[0,1]];}return originalWeights(x,y);};
    var originalHead=[[37+(40-9)*622/68,25+(6-7)*570/62],
      [37+(79-9)*622/68,25+(6-7)*570/62],
      [37+(79-9)*622/68,25+(41-7)*570/62],
      [37+(69-9)*622/68,25+(44.5-7)*570/62],
      [37+(44-9)*622/68,25+(44.5-7)*570/62],
      [37+(37-9)*622/68,25+(35-7)*570/62],
      [37+(37-9)*622/68,25+(22-7)*570/62]];
    var layers=[{image:'jinbingbing-bind-native',sheet:[1536,1024],crop:[0,0,1000,1000],box:[9,7,68,62],step:1.3,dual:true,
      excludePaths:[[[360,0],[1000,0],[1000,590],[500,590],[360,425]]],weights:sittingWeights},
      {image:'cats-painted',sheet:[1536,1024],crop:[37,25,622,570],box:[9,7,68,62],step:1.3,dual:true,clipPath:originalHead,weights:headWeights}];
    front.forEach(function(leg){layers.push({image:'jinbingbing-bind-native',sheet:[1536,1024],crop:leg.crop,box:leg.box,step:1.1,dual:true,weights:function(x,y){return limbWeights(leg,x,y);}});});
    return [base,{image:'cats-painted',sheet:[1536,1024],crop:[37,25,622,570],box:[9,7,68,62],sitFeline:true,front:front,layers:layers,weights:function(){return [[0,1]];}}];
  };
  A.catV10Active=function(root){
    return root.id==='cat'&&!root.classList.contains('is-walking')&&!root.classList.contains('is-settling');
  };
  A.catV9Frame=function(rig){
    var root=rig.root;
    if(root.id==='cat'&&!root.classList.contains('is-walking')&&!root.classList.contains('is-settling'))return rig.configs[1];
    root._rigCatPounceFrame=null;return rig.configs[0];
  };
  A.catV10Bones=function(rig,c,t){
    var root=rig.root,pouncing=!reduced&&root.classList.contains('is-pouncing'),motion=rig.catPlayMotion,elapsed=0;
    if(pouncing){
      if(!motion){motion=rig.catPlayMotion={elapsed:0,last:t,finished:false};}
      elapsed=motion.elapsed;
    }else{rig.catPlayMotion=null;delete rig.times['is-pouncing'];}
    var pose=pouncing?play(elapsed):{rear:0,reach:0},b=Array.from({length:16},identity);
    var torso=rotate(-7*pose.rear,40,56);torso[5]-=.9*pose.rear;b[15]=torso;
    var greeting=!reduced&&(root.classList.contains('is-tail-playing')||root.classList.contains('is-happy')),greet=0;
    if(greeting){if(rig.catGreetingStart===undefined)rig.catGreetingStart=t;var seconds=(t-rig.catGreetingStart)/1000;greet=Math.sin(seconds*5)*Math.max(0,1-seconds/1.8);}else delete rig.catGreetingStart;
    var headAngle=reduced?0:greet*1.8+Math.sin(t/2350)*.18-pose.rear*.7;
    b[14]=multiply(torso,rotate(headAngle,60,28));
    var tailDy=reduced?0:Math.sin(t/1100)*1.45+Math.sin(t/2220)*.35+greet*1.1;
    b[13]=rotate(reduced?0:Math.sin(t/1490)*.75,31,58);b[13][5]+=tailDy;
    var near=pose.reach<.45?mix(front[1].rest,[58.5,47],pose.reach/.45):mix([58.5,47],[76,22],(pose.reach-.45)/.55);
    if(pouncing&&elapsed>=1.2&&elapsed<2.8){near[0]+=Math.sin((elapsed-1.2)*6)*.42;near[1]+=Math.sin((elapsed-1.2)*5)*.34;}
    var far=mix(front[0].rest,[62,43.5],pose.rear);
    [far,near].forEach(function(target,i){var leg=front[i],limbs=solve(leg,target,torso,pose.rear||pose.reach);for(var j=0;j<3;j++)b[leg.bone+j]=limbs[j];});
    root._rigCatTailAngle=0;root._rigCatTailTipDy=tailDy;root._rigCatHeadAngle=headAngle;root._rigCatSpineAngle=-7*pose.rear;
    root._rigCatPounceFrame=pouncing?{continuous:true,time:elapsed,painting:'cats-painted',rear:pose.rear,reach:pose.reach,hind:{x:35,y:68},forepaw:transform(b[12],front[1].e),otherPaw:transform(b[6],front[0].e)}:null;
    return b;
  };
  // rig calls this only after its full painting was successfully drawn.
  // A loading texture cannot consume play time or start the butterfly's exit.
  A.catV10Drawn=function(rig,c,t){
    if(rig.root.id==='cat')rig.root.classList.toggle('cat-continuous-sit',!!c.sitFeline);
    if(!c.sitFeline){rig.catPlayMotion=null;rig.root._rigCatPounceFrame=null;}
    if(!c.sitFeline||!rig.root.classList.contains('is-pouncing')||!rig.catPlayMotion)return;
    var root=rig.root,motion=rig.catPlayMotion,shown=motion.elapsed;
    if(typeof root._onKittyPlayFrame==='function')root._onKittyPlayFrame(Math.min(3.8,shown));
    motion.elapsed+=Math.min(.1,Math.max(0,(t-motion.last)/1000));motion.last=t;
    if(shown>=3.8&&!motion.finished){
      motion.finished=true;
      requestAnimationFrame(function(){if(rig.catPlayMotion===motion&&root.classList.contains('is-pouncing')&&typeof root._onKittyPlayFinished==='function')root._onKittyPlayFinished();});
    }
  };
  A.catPlayUsesRenderedClock=true;
  A.catV9TailAngle=function(t){return reduced?0:Math.sin(t/670)*6.2+Math.sin(t/1710)*.7;};
})();
