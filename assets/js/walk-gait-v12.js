/* Continuous side-view gait using the native heel and fore-sole surfaces. */
(function () {
  'use strict';
  var A=window.HJArt, TAU=Math.PI*2, FLOOR=192;
  var outsole={
    day:{far:[[119,694],[168,710]],near:[[450,715],[502,697]]},
    night:{far:[[68,786],[116,813]],near:[[325,829],[385,832]]}
  };
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function smooth(n){n=clamp(n,0,1);return n*n*n*(10+n*(-15+6*n));}
  // Integrating a short, smooth velocity handoff avoids the large backward/
  // forward overshoot of one whole-swing Hermite curve. A planted foot has
  // world velocity zero; swing starts and ends with that same velocity.
  function swingTravel(s,span,d){
    var e=.12,v=(span+e*d)/(1-e),integral=function(q){return 2.5*Math.pow(q,4)-3*Math.pow(q,5)+Math.pow(q,6);};
    if(s<e){var q=s/e;return e*(-d*q+(v+d)*integral(q));}
    if(s>1-e)return span-swingTravel(1-s,span,d);
    return e*(v-d)/2+v*(s-e);
  }
  function identity(){return[1,0,0,1,0,0];}
  function rotate(a,x,y){var co=Math.cos(a),si=Math.sin(a);return[co,si,-si,co,x-co*x+si*y,y-si*x-co*y];}
  function multiply(a,b){return[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
  function point(m,p){return[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];}
  function stepWorld(night){return night?80:95;}
  function bind(c){
    if(c._walkGaitV12Bind)return c._walkGaitV12Bind;
    var p=c.pivots,theme=c.night?'night':'day',legs=[];
    [false,true].forEach(function(near){
      var top=near?5:8,shoe=c.layers.filter(function(l){return l.sourceAffine&&l.image===c.image&&l.weights(0,0).some(function(w){return w[0]===top+2;});})[0];
      if(!shoe)throw new Error('Native walking shoe registration is missing for '+theme+' '+(near?'near':'far'));
      var edge=outsole[theme][near?'near':'far'].map(function(v){return point(shoe.sourceAffine,v);}),hip=p[near?'hl':'hr'],knee=p[near?'kl':'kr'],ankle=p[near?'al':'ar'],mid=[(edge[0][0]+edge[1][0])/2,(edge[0][1]+edge[1][1])/2],pitch=Math.atan2(edge[1][1]-edge[0][1],edge[1][0]-edge[0][0]),co=Math.cos(-pitch),si=Math.sin(-pitch),off=[mid[0]-ankle[0],mid[1]-ankle[1]];
      legs.push({near:near,top:top,index:near?1:0,hip:hip,knee:knee,ankle:ankle,heel:edge[0],fore:edge[1],mid:mid,pitch:pitch,half:Math.hypot(edge[1][0]-edge[0][0],edge[1][1]-edge[0][1])/2,offset:off,flatOffset:[co*off[0]-si*off[1],si*off[0]+co*off[1]],upper:Math.hypot(knee[0]-hip[0],knee[1]-hip[1]),lower:Math.hypot(ankle[0]-knee[0],ankle[1]-knee[1])});
    });
    var center=legs.reduce(function(n,l){return n+l.hip[0]+l.flatOffset[0];},0)/2;
    return c._walkGaitV12Bind={legs:legs,center:center};
  }
  function twoLink(l,target){
    var h=l.hip,k=l.knee,a=l.ankle,dx=target[0]-h[0],dy=target[1]-h[1],distance=Math.hypot(dx,dy),reach=clamp(distance,Math.abs(l.upper-l.lower)+.0001,l.upper+l.lower-.0001),direction=Math.atan2(dy,dx),bend=((k[0]-h[0])*(a[1]-k[1])-(k[1]-h[1])*(a[0]-k[0]))<0?-1:1;
    var first=direction-bend*Math.acos(clamp((l.upper*l.upper+reach*reach-l.lower*l.lower)/(2*l.upper*reach),-1,1)),second=direction+bend*Math.acos(clamp((l.lower*l.lower+reach*reach-l.upper*l.upper)/(2*l.lower*reach),-1,1)),rest1=Math.atan2(k[1]-h[1],k[0]-h[0]),rest2=Math.atan2(a[1]-k[1],a[0]-k[0]),upper=rotate(first-rest1,h[0],h[1]),lower=multiply(upper,rotate(second-first-rest2+rest1,k[0],k[1]));
    return{upper:upper,lower:lower,angle:second-rest2,reachError:Math.max(0,distance-reach),kneeDegrees:Math.abs(second-first)*180/Math.PI};
  }
  function sample(c,options){
    var o=options||{},phase=((o.phase||0)%1+1)%1,scale=Math.max(.1,o.scale||.875),p=c.pivots,rest=bind(c),period=stepWorld(c.night),travel=period/scale,stance=.53,swing=1-stance,span=travel*stance,prepared=[];
    rest.legs.forEach(function(l){
      var u=(phase+(l.near?0:.5))%1,supported=u<stance,s=supported?u/stance:(u-stance)/swing,x,roll,lift=0;
      if(supported){
        x=(l.hip[0]+l.flatOffset[0])+span/2-travel*u;
        roll=s<.12?-6*(1-smooth(s/.12)):s>.86?9*smooth((s-.86)/.14):0;
      }else{
        // Equal endpoint velocities match the translating planted sole. Both
        // acceleration and clearance start/end continuously at the ground.
        x=(l.hip[0]+l.flatOffset[0])-span/2+swingTravel(s,span,travel*swing);
        lift=(c.night?2.5:3.2)*Math.pow(Math.sin(Math.PI*s),2);
        roll=9-15*smooth(s);
      }
      roll*=Math.PI/180;
      var midX=x+Math.sign(roll)*l.half*(1-Math.cos(roll)),soft=supported?0:.006*Math.pow(Math.sin(Math.PI*s),2),midY=FLOOR-lift-l.half*Math.sqrt(Math.sin(roll)*Math.sin(roll)+soft*soft),angle=roll-l.pitch,co=Math.cos(angle),si=Math.sin(angle),target=[midX-co*l.offset[0]+si*l.offset[1],midY-si*l.offset[0]-co*l.offset[1]],dx=target[0]-l.hip[0],length=l.upper+l.lower-.05;
      prepared.push({leg:l,phase:u,stance:supported,roll:roll,angle:angle,target:target,minBody:target[1]-l.hip[1]-Math.sqrt(Math.max(0,length*length-dx*dx)),lift:lift});
    });
    // One common hip height belongs to the complete body. It is derived from
    // the genuine lengths of both legs, without scaling or stretching them.
    var a=prepared[0].minBody,b=prepared[1].minBody,bodyDown=(a+b+Math.sqrt((a-b)*(a-b)+.35*.35))/2+.12,body=[1,0,0,1,0,bodyDown],bones=Array.from({length:12},identity),feet=[],reach=[],knees=[];
    bones[0]=body;
    var theta=phase*TAU,nearSwing=c.night?(-5+5*Math.cos(theta)):(-18+18*Math.cos(theta)),farSwing=(c.night?12:16)*(1-Math.cos(theta));
    bones[1]=multiply(body,rotate(nearSwing*Math.PI/180,p.sl[0],p.sl[1]));bones[2]=multiply(bones[1],rotate((c.night?2:4)*Math.sin(theta)*Math.PI/180,p.el[0],p.el[1]));bones[3]=multiply(body,rotate(farSwing*Math.PI/180,p.sr[0],p.sr[1]));bones[4]=multiply(bones[3],rotate(-4*Math.sin(theta)*Math.PI/180,p.er[0],p.er[1]));
    prepared.forEach(function(v){
      var l=v.leg,ik=twoLink(l,[v.target[0],v.target[1]-bodyDown]),top=l.top;
      bones[top]=multiply(body,ik.upper);bones[top+1]=multiply(body,ik.lower);bones[top+2]=multiply(body,multiply(ik.lower,rotate(v.angle-ik.angle,l.ankle[0],l.ankle[1])));
      var heel=point(bones[top+2],l.heel),fore=point(bones[top+2],l.fore),mid=point(bones[top+2],l.mid),bottom=Math.max(heel[1],fore[1]);
      feet[l.index]={x:mid[0],y:bottom,actualY:bottom,stance:v.stance,lift:Math.max(0,FLOOR-bottom),phase:v.phase,support:v.stance?1:0,heel:{x:heel[0],y:heel[1]},forefoot:{x:fore[0],y:fore[1]},soleAngle:v.roll*180/Math.PI,sourcePitch:l.pitch*180/Math.PI,supportMode:v.stance?(v.roll<-.001?'heel':v.roll>.001?'forefoot':'flat'):'swing'};
      reach[l.index]=ik.reachError;knees[l.index]=ik.kneeDegrees;
    });
    var grip=c.nearGrip?point(bones[2],c.nearGrip):null;
    return{phase:phase,stepWorld:period,bodyDown:bodyDown,bones:bones,feet:feet,nearArm:nearSwing,farArm:farSwing,reachError:reach,kneeDegrees:knees,grip:grip,sourcePitch:feet.map(function(f){return f.sourcePitch;})};
  }
  A.walkGaitV12={version:12,sample:sample,stepWorld:stepWorld,bind:bind};
})();
