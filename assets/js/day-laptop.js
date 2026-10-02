/* A closed space-black notebook, supported by the painted near forearm.
 * The cut-out uses the same dual-quaternion sleeve outline as the walk rig;
 * its original cuff and fingers remain in front of the metal, not beneath it.
 */
(function () {
  'use strict';
  var A=window.HJArt||(window.HJArt={}),ns='http://www.w3.org/2000/svg',serial=0;
  function node(tag,attrs){var el=document.createElementNS(ns,tag);Object.keys(attrs||{}).forEach(function(k){el.setAttribute(k,attrs[k]);});return el;}
  function set(el,key,value){if(el.getAttribute(key)!==value)el.setAttribute(key,value);}
  function mount(root){
    if(root._dayLaptop)return root._dayLaptop;
    var flip=root.querySelector('.painted-character .c-flip');if(!flip)return null;
    var parent=flip.querySelector('.native-view-props');if(!parent)return null;
    var id='dayLaptop'+(++serial),group=node('g',{class:'native-day-laptop','aria-hidden':'true'}),defs=node('defs');
    defs.innerHTML='<linearGradient id="'+id+'metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#57534e"/><stop offset=".24" stop-color="#37383a"/><stop offset=".56" stop-color="#25282c"/><stop offset=".8" stop-color="#343638"/><stop offset="1" stop-color="#171b20"/></linearGradient>'+
      '<linearGradient id="'+id+'bevel" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#a09886"/><stop offset=".2" stop-color="#5e6060"/><stop offset=".64" stop-color="#292c30"/><stop offset="1" stop-color="#7c7d77"/></linearGradient>'+
      '<linearGradient id="'+id+'reflection" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0ddbd" stop-opacity=".15"/><stop offset=".48" stop-color="#e6d7c2" stop-opacity=".02"/><stop offset="1" stop-color="#c5d7e0" stop-opacity=".07"/></linearGradient>'+
      '<linearGradient id="'+id+'logo" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#c5c2b7"/><stop offset=".55" stop-color="#949a9b"/><stop offset="1" stop-color="#777f81"/></linearGradient>';
    var clip=node('clipPath',{id:id+'sleeve',clipPathUnits:'userSpaceOnUse'}),cut=node('path',{'clip-rule':'evenodd','fill-rule':'evenodd'});clip.appendChild(cut);defs.appendChild(clip);group.appendChild(defs);
    var paint=node('g',{'clip-path':'url(#'+id+'sleeve)'}),outline='M51.35 59.55 L72.3 60.9 Q73.45 60.98 73.52 62.15 L73.8 85.85 Q73.82 87.15 72.5 87.08 L51.75 85.72 Q50.55 85.65 50.52 84.35 L50.1 60.95 Q50.08 59.5 51.35 59.55 Z';
    paint.innerHTML='<path d="'+outline+'" transform="translate(-1.1 .9)" fill="#312c23" opacity=".12"/>'+
      '<path d="'+outline+'" transform="translate(-.5 .45)" fill="#181c20" opacity=".2"/>'+
      '<path d="M51.1 59.45 L72.7 60.8 Q74.05 60.88 74.14 62.25 L74.35 86.12 Q74.36 87.7 72.78 87.63 L51.65 86.17 Q50.2 86.08 50.17 84.57 L49.82 60.87 Q49.82 59.37 51.1 59.45 Z" fill="url(#'+id+'bevel)" stroke="#282828" stroke-width=".28"/>'+
      '<path d="'+outline+'" fill="url(#'+id+'metal)" stroke="#242b30" stroke-width=".25"/>'+
      '<path d="M51.14 60.15 L72.05 61.48 Q72.95 61.55 73 62.45 L73.24 85.5 Q73.25 86.6 72.15 86.52 L51.98 85.16 Q51.08 85.1 51.04 84.17 L50.65 61.15 Q50.64 60.11 51.14 60.15 Z" fill="url(#'+id+'reflection)"/>'+
      '<path d="M51.42 60.1 L71.82 61.4 M50.68 61.55 L51.04 83.2" fill="none" stroke="#ddd4bf" stroke-width=".18" opacity=".55"/>'+
      '<path d="M51.58 85.62 L72.4 87 M74 63.22 L74.19 85.9" fill="none" stroke="#a8aca8" stroke-width=".16" opacity=".65"/>'+
      '<path d="M53.02 62.37 L53.12 66.91 M55.1 63.05 L55.18 66.25 M70.91 81.2 L71.02 85.01 M69.16 82.3 L69.22 84.85 M59.05 64.02 L59.1 65.72" stroke="#c0bcae" stroke-width=".1" opacity=".1"/>'+
      '<path d="M73.78 66.7 L73.88 78.2" stroke="#111519" stroke-width=".24" opacity=".8"/>'+
      '<path d="M61.94 71.8 C61.21 71.36 60.51 71.81 60.23 72.46 C59.79 73.54 60.44 74.85 61.03 75.57 C61.41 76.03 61.72 75.68 62.08 75.74 C62.49 75.77 62.8 76.04 63.14 75.59 C63.47 75.19 63.8 74.62 63.87 74.26 C63.07 73.92 62.98 72.93 63.6 72.48 C63.32 71.87 62.8 71.51 61.94 71.8 Z M61.94 71.45 C61.91 70.93 62.25 70.49 62.86 70.32 C62.89 70.88 62.55 71.34 61.94 71.45 Z" fill="url(#'+id+'logo)" opacity=".8"/>';
    group.appendChild(paint);parent.insertBefore(group,parent.firstChild);
    return root._dayLaptop={group:group,cut:cut,config:null,pose:null};
  }
  function armPose(body,bones){
    var det=body[0]*body[3]-body[1]*body[2];
    return [1,2].map(function(i){var m=bones[i],x=m[4]-body[4],y=m[5]-body[5];return [(body[3]*m[0]-body[2]*m[1])/det,(-body[1]*m[0]+body[0]*m[1])/det,(body[3]*x-body[2]*y)/det,(-body[1]*x+body[0]*y)/det].map(function(v){return v.toFixed(4);}).join(',');}).join('|');
  }
  function sleeveHole(c,bones){
    var layer=c.nearArmLayer,st=c.sourceTransform;if(!layer||!st)return '';
    // Match the skin shader's quaternion sign convention and normalization.
    var dual=[];bones.forEach(function(m,i){var a=Math.atan2(m[1],m[0])*.5,co=Math.cos(a),si=Math.sin(a),p={2:1,4:3,6:5,7:6,9:8,10:9}[i]||0;if(i&&co*dual[p][0]+si*dual[p][1]<0){co=-co;si=-si;}dual.push([co,si,(m[4]*co+m[5]*si)*.5,(m[5]*co-m[4]*si)*.5]);});
    var body=bones[0],det=body[0]*body[3]-body[1]*body[2];
    return c.profileSource.nearArm.map(function(v,i){
      var x=st[0]+v[0]*st[2],y=st[1]+v[1]*st[3],q=[0,0,0,0];layer.weights(x,y).forEach(function(w){for(var n=0;n<4;n++)q[n]+=dual[w[0]][n]*w[1];});
      var len=Math.hypot(q[0],q[1]);q=q.map(function(n){return n/len;});var co=q[0]*q[0]-q[1]*q[1],si=2*q[0]*q[1],px=co*x-si*y+2*(q[2]*q[0]-q[3]*q[1])-body[4],py=si*x+co*y+2*(q[3]*q[0]+q[2]*q[1])-body[5];
      return(i?'L':'M')+((body[3]*px-body[2]*py)/det).toFixed(3)+' '+((-body[1]*px+body[0]*py)/det).toFixed(3);
    }).join(' ')+' Z';
  }
  A.dayLaptop=function(root,c,bones){
    var carry=root._rigDayCarry,show=!!(carry&&carry.active&&!c.night&&c.profileWalk&&!root.classList.contains('motion-rig-lost'));
    root.classList.toggle('day-laptop-carry',show);if(!show)return;
    var view=mount(root);if(!view)return;
    var pose=armPose(carry.body,bones);
    if(view.config!==c||view.pose!==pose){set(view.cut,'d','M-40 -40H160V240H-40Z '+sleeveHole(c,bones));view.config=c;view.pose=pose;}
    set(view.group,'transform','matrix('+carry.body.map(function(v){return +v.toFixed(5);}).join(' ')+')');
  };
})();
