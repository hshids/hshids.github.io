/* Continuous 2D skinning of the original painted textures. */
(function () {
  'use strict';
  var A=window.HJArt, rigs=[], images={}, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var artBase=new URL('../art/',document.currentScript.src);
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function identity(){return [1,0,0,1,0,0];}
  function rotate(deg,x,y){var a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [c,s,-s,c,x-c*x+s*y,y-s*x-c*y];}
  function multiply(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
  function asset(name){if(!images[name]){var im=new Image();im.src=new URL(name+'.webp',artBase).href;images[name]=im;}return images[name];}
  function polygon(path){var n=path.match(/-?\d+(?:\.\d+)?/g).map(Number),p=[];for(var i=0;i<n.length;i+=2)p.push([n[i],n[i+1]]);return p;}
  function within(p,x,y){var inside=false;for(var i=0,j=p.length-1;i<p.length;j=i++){if(((p[i][1]>y)!==(p[j][1]>y))&&(x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0]))inside=!inside;}return inside;}
  function shader(gl,type,source){var s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Painted motion shader failed');return s;}
  function renderer(root,type,configurations){
    var canvas=document.createElement('canvas');canvas.className='motion-rig motion-rig-'+type;canvas.setAttribute('aria-hidden','true');
    var width=type==='human'?200:110,height=type==='human'?220:84,pad=type==='human'?40:10,top=type==='human'?10:6;
    canvas.width=width*3;canvas.height=height*3;
    var gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:true,preserveDrawingBuffer:false});if(!gl)return null;
    var sculpted=configurations.filter(function(c){return c.sourceCuts;})[0];
    var cutSource='bool cut(vec4 r){return tex.x>r.x&&tex.x<r.z&&tex.y>r.y&&tex.y<r.w;}';
    if(sculpted){
      function contour(points){return points.map(function(a,i){
        var b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1];
        return '('+dy.toFixed(1)+'*p.x-('+dx.toFixed(1)+')*p.y+('+(dx*a[1]-dy*a[0]).toFixed(1)+')<=0.0)';
      }).join('&&');}
      // Compile the small, convex native skin contours into the shader. Unlike
      // rectangular shoulder cuts, these preserve the painted fabric armhole.
      cutSource='bool cut(vec4 r){if(!(tex.x>r.x&&tex.x<r.z&&tex.y>r.y&&tex.y<r.w))return false;vec2 p=tex*vec2('+sculpted.sheet[0].toFixed(1)+','+sculpted.sheet[1].toFixed(1)+');if(r.x<'+(sculpted.cutouts[1][0]/sculpted.sheet[0]).toFixed(8)+')return '+contour(sculpted.sourceCuts[0])+';return '+contour(sculpted.sourceCuts[1])+';}';
    }
    var program=gl.createProgram();
    gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,'attribute vec2 position;attribute vec2 uv;varying vec2 tex;uniform vec2 extent;uniform vec2 padding;uniform vec2 poseY;void main(){vec2 posed=vec2(position.x,position.y*poseY.x+poseY.y);vec2 p=(posed+padding)/extent;gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0,0.0,1.0);tex=uv;}'));
    gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,'precision highp float;varying vec2 tex;uniform sampler2D painting;uniform vec4 cutLeft;uniform vec4 cutRight;uniform vec4 handPlaneLeft;uniform vec4 handPlaneRight;uniform float handMode;uniform float alphaCutoff;uniform vec2 paintSize;'+cutSource+'bool handCut(vec4 rect,vec4 plane){return cut(rect)&&plane.w>0.0&&dot(plane.xy,tex)+plane.z>=0.0;}void main(){gl_FragColor=texture2D(painting,tex);float nativeAlpha=texture2D(painting,(floor(tex*paintSize)+.5)/paintSize).a;if(nativeAlpha<alphaCutoff)discard;if(handMode>0.0?(handCut(cutLeft,handPlaneLeft)||handCut(cutRight,handPlaneRight)):(cut(cutLeft)||cut(cutRight)))gl_FragColor.a=0.0;}'));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;
    gl.useProgram(program);gl.uniform2f(gl.getUniformLocation(program,'extent'),width,height);gl.uniform2f(gl.getUniformLocation(program,'padding'),pad,top);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.viewport(0,0,canvas.width,canvas.height);
    var position=gl.getAttribLocation(program,'position'),uv=gl.getAttribLocation(program,'uv'),buffer=gl.createBuffer(),indexBuffer=gl.createBuffer(),tex=gl.createTexture();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,16,8);
    gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    function mesh(c){
      var vertices=[],foreground=[],step=c.step||2,box=c.box,cols=Math.ceil(box[2]/step),rows=Math.ceil(box[3]/step);
      function append(list,a,b,d){
        if(c.alphaPrefix){
          var w=c.sheet[0],h=c.sheet[1],stride=w+1,prefix=c.alphaPrefix;
          var l=Math.max(0,Math.floor(Math.min(a.u,b.u,d.u)*w)-1),r=Math.min(w,Math.ceil(Math.max(a.u,b.u,d.u)*w)+2);
          var t=Math.max(0,Math.floor(Math.min(a.v,b.v,d.v)*h)-1),bottom=Math.min(h,Math.ceil(Math.max(a.v,b.v,d.v)*h)+2);
          if(prefix[bottom*stride+r]-prefix[t*stride+r]-prefix[bottom*stride+l]+prefix[t*stride+l]===0)return;
        }
        list.push(a,b,d);
      }
      function vertex(cx,cy){var x=box[0]+cx/cols*box[2],y=box[1]+cy/rows*box[3];return {x:x,y:y,u:(c.crop[0]+cx/cols*c.crop[2])/c.sheet[0],v:(c.crop[1]+cy/rows*c.crop[3])/c.sheet[1],weights:c.weights(x,y)};}
      if(c.grid){
        var previous=null;
        var previousY=0;
        c.grid.forEach(function(row){var next=row.x.map(function(sx,i){var st=c.sourceTransform,x=st?st[0]+sx*st[2]:box[0]+sx/c.sheet[0]*box[2],y=st?st[1]+row.y*st[3]:box[1]+row.y/c.sheet[1]*box[3];return {x:x,y:y,u:sx/c.sheet[0],v:row.y/c.sheet[1],weights:row.domains?c.weightsByDomain(x,y,row.domains[i]):c.weights(x,y)};});if(previous)for(var i=0;i<next.length-1;i++){if(previousY>=c.splitY&&c.gapColumns.some(function(range){return i>=range[0]&&i<range[1];}))continue;var list=c.nativeArms&&row.y>=290&&row.y<=835&&(i<22||i>=62)?foreground:vertices;append(list,previous[i],previous[i+1],next[i]);append(list,previous[i+1],next[i+1],next[i]);}previous=next;previousY=row.y;});
      }else for(var y=0;y<rows;y++)for(var x=0;x<cols;x++){var a=vertex(x,y),b=vertex(x+1,y),d=vertex(x,y+1),e=vertex(x+1,y+1);vertices.push(a,b,d,b,e,d);}
      c.vertices=vertices.concat(foreground);c.data=new Float32Array(c.vertices.length*4);c.frame=0;c.uniqueVertices=[];
      c.vertices.forEach(function(v,i){
        v.linear=c.nativeArms&&v.weights.some(function(w){return w[0]===0;})&&v.weights.some(function(w){return w[0]===1||w[0]===3||!c.night&&w[0]>=5&&w[0]<=10;});
        if(v.dataOffset===undefined){v.dataOffset=i*4;v.drawIndex=c.uniqueVertices.length;c.uniqueVertices.push(v);}
        c.data[i*4+2]=v.u;c.data[i*4+3]=v.v;
      });
      if(c.uniqueVertices.length<=65535){
        c.indices=new Uint16Array(c.vertices.length);c.drawData=new Float32Array(c.uniqueVertices.length*4);
        c.vertices.forEach(function(v,i){c.indices[i]=v.drawIndex;});
        c.uniqueVertices.forEach(function(v,i){c.drawData[i*4+2]=v.u;c.drawData[i*4+3]=v.v;});
      }
      c.alphaPrefix=null;return c;
    }
    configurations.forEach(function(c){if(!c.prepare)mesh(c);});root.appendChild(canvas);
    var current=null,currentMesh=null,rig={root:root,type:type,draw:function(c,bones){
      var image=asset(c.image);if(!image.complete||!image.naturalWidth)return;
      if(c.prepare&&!c.prepared){c.prepare(image);mesh(c);c.prepared=true;}
      if(current!==image){gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);current=image;}
      gl.uniform1f(gl.getUniformLocation(program,'alphaCutoff'),c.alphaCutoff||0);
      gl.uniform2f(gl.getUniformLocation(program,'paintSize'),c.sheet[0],c.sheet[1]);
      gl.uniform2f(gl.getUniformLocation(program,'poseY'),rig.poseY?rig.poseY[0]:1,rig.poseY?rig.poseY[1]:0);
      var handPlanes=c.handBounds&&A.gestureHands?A.gestureHands.cutPlanes(c,c.handMask||{}):null;
      gl.uniform1f(gl.getUniformLocation(program,'handMode'),handPlanes?1:0);
      ['cutLeft','cutRight'].forEach(function(name,i){var side=i?'right':'left',cut=handPlanes?(c.handMask&&c.handMask[side]?c.handBounds[i]:null):(c.cutouts&&c.cutouts[i]);gl.uniform4fv(gl.getUniformLocation(program,name),cut?[cut[0]/c.sheet[0],cut[1]/c.sheet[1],cut[2]/c.sheet[0],cut[3]/c.sheet[1]]:[0,0,0,0]);gl.uniform4fv(gl.getUniformLocation(program,i?'handPlaneRight':'handPlaneLeft'),handPlanes?handPlanes[side]:[0,0,0,0]);});
      // Normalized dual quaternions keep the native sleeve/skin width through
      // a bent elbow, without adding separate shoulder or elbow cover pieces.
      var dq=c.dual?(c.dualData||(c.dualData=new Float32Array(64))):null;
      if(dq)bones.forEach(function(m,i){var a=Math.atan2(m[1],m[0])/2,s=Math.sin(a),co=Math.cos(a),n=i*4,parent={2:1,4:3,6:5,7:6,9:8,10:9}[i]||0;if(i&&co*dq[parent*4]+s*dq[parent*4+1]<0){co=-co;s=-s;}dq[n]=co;dq[n+1]=s;dq[n+2]=(m[4]*co+m[5]*s)/2;dq[n+3]=(m[5]*co-m[4]*s)/2;});
      var stretch=dq&&rig.affine?(c.stretchData||(c.stretchData=new Float32Array(64))):null;
      if(stretch)bones.forEach(function(m,i){var n=i*4,co=dq[n]*dq[n]-dq[n+1]*dq[n+1],si=2*dq[n]*dq[n+1];stretch[n]=co*m[0]+si*m[1];stretch[n+1]=co*m[2]+si*m[3];stretch[n+2]=-si*m[0]+co*m[1];stretch[n+3]=-si*m[2]+co*m[3];});
      // Adjacent triangles share vertices. Transform each shared point once,
      // then copy the same Float32 coordinates without changing the mesh or UVs.
      var drawFrame=++c.frame;
      for(var i=0;i<c.vertices.length;i++){
        var v=c.vertices[i],x=0,y=0,qc=0,qs=0,qx=0,qy=0,sx=0,sxy=0,syx=0,sy=0;
        if(v.drawFrame===drawFrame){c.data[i*4]=c.data[v.dataOffset];c.data[i*4+1]=c.data[v.dataOffset+1];continue;}
        v.drawFrame=drawFrame;
        if(v.weights.length===1){var only=bones[v.weights[0][0]],offset=i*4;c.data[offset]=only[0]*v.x+only[2]*v.y+only[4];c.data[offset+1]=only[1]*v.x+only[3]*v.y+only[5];continue;}
        for(var j=0;j<v.weights.length;j++){
          var w=v.weights[j],m=bones[w[0]];
          if(dq&&!v.linear){var d=w[0]*4;qc+=dq[d]*w[1];qs+=dq[d+1]*w[1];qx+=dq[d+2]*w[1];qy+=dq[d+3]*w[1];if(stretch){sx+=stretch[d]*w[1];sxy+=stretch[d+1]*w[1];syx+=stretch[d+2]*w[1];sy+=stretch[d+3]*w[1];}}
          else{x+=(m[0]*v.x+m[2]*v.y+m[4])*w[1];y+=(m[1]*v.x+m[3]*v.y+m[5])*w[1];}
        }
        if(dq&&!v.linear){var scale=1/Math.hypot(qc,qs);qc*=scale;qs*=scale;qx*=scale;qy*=scale;var co=qc*qc-qs*qs,si=2*qc*qs,px=stretch?sx*v.x+sxy*v.y:v.x,py=stretch?syx*v.x+sy*v.y:v.y;x=co*px-si*py+2*(qx*qc-qy*qs);y=si*px+co*py+2*(qx*qs+qy*qc);}
        var n=i*4;c.data[n]=x;c.data[n+1]=y;
      }
      gl.clear(gl.COLOR_BUFFER_BIT);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      if(c.indices){
        for(var i=0;i<c.uniqueVertices.length;i++){var v=c.uniqueVertices[i],n=i*4;c.drawData[n]=c.data[v.dataOffset];c.drawData[n+1]=c.data[v.dataOffset+1];}
        gl.bufferData(gl.ARRAY_BUFFER,c.drawData,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
        if(currentMesh!==c){gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,c.indices,gl.STATIC_DRAW);currentMesh=c;}
        gl.drawElements(gl.TRIANGLES,c.indices.length,gl.UNSIGNED_SHORT,0);
      }else{gl.bufferData(gl.ARRAY_BUFFER,c.data,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,c.vertices.length);}
      if(!rig.ready){rig.ready=true;}
      if(c.nativeArms)root.classList.add('has-native-arms');
      root.classList.add('has-motion-rig');
    },configs:configurations,times:{}};
    root._paintRig=rig;rigs.push(rig);return rig;
  }
  function human(root){
    function outfit(night){
      // A single complete A-pose painting supplies all of the moving material.
      // The bind arms are clear of the hair, belt and coat; their actual native
      // silhouettes define the mesh rather than independent pasted arm pieces.
      var kx=night?62/345:84/669,ky=night?184/1494:184/1484;
      var ox=night?29-334*kx:24-186*kx,oy=night?8-10*ky:8-27*ky;
      function pt(p){return [ox+p[0]*kx,oy+p[1]*ky];}
      function smooth(a,b,n){var f=clamp((n-a)/(b-a),0,1);return f*f*(3-2*f);}
      function boundary(points,y){
        if(y<=points[0][1])return points[0][0];
        for(var i=1;i<points.length;i++)if(y<=points[i][1]){var a=points[i-1],b=points[i],f=(y-a[1])/(b[1]-a[1]);return a[0]+(b[0]-a[0])*f;}
        return points[points.length-1][0];
      }
      var sources=night?{
        sl:[376,312],el:[302,523],wl:[198,700],handL:[182,757],sr:[625,312],er:[699,523],wr:[801,700],handR:[819,757],
        hl:[451,780],kl:[479,1110],al:[477,1384],hr:[566,780],kr:[586,1110],ar:[561,1389],
        innerL:[[374,305],[380,320],[385,345],[386,360],[385,375],[384,390],[380,405],[376,415],[374,425]],
        innerR:[[623,305],[615,320],[614,345],[614,360],[615,375],[616,390],[620,405],[624,415],[626,425]],
        hands:[[145,660,245,840],[750,660,880,840]],crop:[149,1,703,1512]
      }:{
        sl:[335,330],el:[266,510],wl:[119,697],handL:[105,746],sr:[678,330],er:[757,510],wr:[905,697],handR:[923,746],
        hl:[438,804],kl:[403,1148],al:[343,1427],hr:[573,804],kr:[596,1148],ar:[579,1426],
        innerL:[[340,290],[344,300],[353,320],[348,330],[346,340],[355,350],[357,360],[351,380],[360,400],[365,425],[357,435]],
        innerR:[[659,290],[659,300],[661,315],[668,330],[666,345],[664,360],[661,375],[657,390],[655,400],[650,425],[663,435]],
        hands:[[75,681,142,811],[883,681,949,811]],crop:[69,18,887,1502]
      };
      var pivots={mount:[0,0]};
      ['sl','el','wl','sr','er','wr','hl','kl','al','hr','kr','ar'].forEach(function(key){pivots[key]=pt(sources[key]);});
      pivots.wristL=pt(sources.wl);pivots.wristR=pt(sources.wr);
      // Gesture palms meet the actual narrow wrist, before the resting palm
      // widens. The forearm bones and neutral pose keep their existing axes.
      if(night){pivots.gestureL=pt([208.47,683.179]);pivots.gestureR=pt([791.498,682.077]);}
      pivots.wr=pt(sources.handR);pivots.handL=pt(sources.handL);pivots.handR=pt(sources.handR);pivots.letter=pivots.handR;
      // Bring the clear bind pose down to a natural standing position. These
      // offsets also apply in reduced motion; action rotations add to them.
      function neutral(shoulder,elbow,wrist){
        var up=Math.atan2(elbow[1]-shoulder[1],elbow[0]-shoulder[0])*180/Math.PI;
        var fore=Math.atan2(wrist[1]-elbow[1],wrist[0]-elbow[0])*180/Math.PI;
        return [90-up,up-fore];
      }
      var nl=neutral(pivots.sl,pivots.el,pivots.wristL),nr=neutral(pivots.sr,pivots.er,pivots.wristR);
      var rest=[nl[0],nl[1],nr[0],nr[1]];
      var armRows=null;
      function arm(x,y,left){
        if(y<(night?305:290)||y>835)return null;
        var amount=smooth(night?305:290,night?320:315,y);
        if(y<470){
          // The medial skin/sleeve stays attached to its native armhole while
          // the outer humerus rotates at full weight. This lateral gradient
          // creates the actual deltoid/armpit surface, not a rigid round end.
          var edge=boundary(left?sources.innerL:sources.innerR,y),distance=left?edge-x:x-edge;
          var row=armRows&&armRows[Math.round(clamp(y,0,1535))],outer=row?(left?row[0]:row[1]):edge+(left?-70:70);
          var width=Math.min(30,Math.max(8,Math.abs(edge-outer)*.6)),lateral=smooth(0,width,distance);
          lateral+=(1-lateral)*smooth(425,470,y);
          var at=pt([edge,y]),medial=bodyWeights(at[0],at[1]).reduce(function(n,w){return n+(w[0]===(left?1:3)?w[1]:0);},0);
          amount=amount*lateral+medial*(1-lateral);
        }
        var elbow=left?sources.el:sources.er,fore=smooth(elbow[1]-44,elbow[1]+44,y),ids=left?[1,2]:[3,4];
        return [[0,1-amount],[ids[0],amount*(1-fore)],[ids[1],amount*fore]].filter(function(w){return w[1]>.0001;});
      }
      var trouserRows=[[800,434,507,510,608],[850,420,499,515,626],[900,406,492,520,640],[950,389,486,524,641],[1000,372,480,529,642],[1050,360,473,533,644],[1100,352,467,537,646],[1150,342,461,536,649],[1200,332,456,534,653],[1250,322,450,531,656],[1300,312,446,528,660],[1350,304,440,526,660],[1375,295,436,522,657],[1400,292,430,517,651]];
      function trouserSection(y){
        for(var i=1;i<trouserRows.length;i++)if(y<=trouserRows[i][0]){var a=trouserRows[i-1],z=trouserRows[i],f=clamp((y-a[0])/(z[0]-a[0]),0,1);return [a[1]+(z[1]-a[1])*f,a[2]+(z[2]-a[2])*f,a[3]+(z[3]-a[3])*f,a[4]+(z[4]-a[4])*f];}
        return trouserRows[trouserRows.length-1].slice(1);
      }
      function leg(x,y){
        if(y<(night?1050:800))return null;
        var amount=smooth(night?1050:800,night?1360:1010,y);
        function weights(side,share){var ids=side?[5,6,7]:[8,9,10],knee=side?sources.kl:sources.kr,ankle=side?sources.al:sources.ar,lower=smooth(knee[1]-70,knee[1]+70,y),foot=smooth(ankle[1]-32,ankle[1]+12,y);return [[ids[0],share*(1-lower)],[ids[1],share*lower*(1-foot)],[ids[2],share*lower*foot]];}
        if(night)return [[0,1-amount]].concat(weights(x<522,amount)).filter(function(w){return w[1]>.0001;});
        // Continuous source contours separate wool trousers from the hanging
        // coat and lining. Their weave and painted highlights never determine
        // a joint weight; a broad edge transition keeps neighboring cloth joined.
        var section=trouserSection(y),left=smooth(-36,64,Math.min(x-section[0],section[1]-x)),right=smooth(-36,64,Math.min(x-section[2],section[3]-x)),shoe=smooth(1320,1420,y);
        left=left*(1-shoe)+(x<506?shoe:0);right=right*(1-shoe)+(x>=506?shoe:0);
        var total=left+right;if(total>1){left/=total;right/=total;}
        left*=amount;right*=amount;if(left+right<.0001)return null;
        return [[0,1-left-right]].concat(weights(true,left),weights(false,right)).filter(function(w){return w[1]>.0001;});
      }
      var paintPixels=null;
      var hairL=[[351,260],[478,260],[486,332],[468,392],[425,425],[384,429],[357,417],[352,390],[338,365],[345,336],[337,313]];
      var hairR=[[554,260],[631,260],[661,280],[668,315],[658,345],[666,366],[655,383],[641,390],[616,377],[581,368],[557,334]];
      function bodyWeights(x,y){
        var sx=(x-ox)/kx,sy=(y-oy)/ky,lw=leg(sx,sy);if(lw)return lw;
        if(sy>=(night?305:315)&&sy<430){
          // The native silk armhole belongs to the same shoulder as its skin.
          // A short strip of real fabric joins the arm at weight one, then
          // settles into the chest; both sides of the shared edge stay joined.
          var left=sx<510,edge=boundary(left?sources.innerL:sources.innerR,sy);
          var distance=left?sx-edge:edge-sx;
          var width=night?10:28;
          if(distance>=0&&distance<width){
            var cloth=true;
            if(!night&&paintPixels){var sample=(Math.round(clamp(sy,0,1535))*1024+Math.round(clamp(sx,0,1023)))*4;cloth=paintPixels[sample]>=180&&paintPixels[sample+1]>=125&&!within(left?hairL:hairR,sx,sy);}
            var share=cloth?(1-smooth(0,width,distance))*smooth(night?305:315,night?320:355,sy)*(1-smooth(night?325:380,night?375:430,sy)):0;
            if(share>.0001)return [[left?1:3,share],[0,1-share]];
          }
        }
        if(y<40){var head=clamp((40-y)/8,0,1);return [[11,head],[0,1-head]];}return [[0,1]];
      }
      var group=root.querySelector('.c-root > .'+(night?'o-night':'o-day')),lantern=group.querySelector('.p-lantern');
      if(lantern&&!group.querySelector('.rig-handprop')){
        var wrap=document.createElementNS('http://www.w3.org/2000/svg','g');wrap.setAttribute('class','rig-handprop');
        var painted=lantern.cloneNode(true),offset=document.createElementNS('http://www.w3.org/2000/svg','g');
        offset.setAttribute('transform','translate('+(pivots.handL[0]-33.9)+' '+(pivots.handL[1]-117.9)+')');offset.appendChild(painted);wrap.appendChild(offset);group.appendChild(wrap);
      }
      function prepareNativeArms(image){
        var sampling=document.createElement('canvas');sampling.width=1024;sampling.height=1536;
        var context=sampling.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
        var pixels=context.getImageData(0,0,1024,1536).data;paintPixels=pixels;
        // Source triangles with no visible paint never contribute a fragment.
        // A one-pixel UV margin keeps every bilinear painted edge intact.
        var prefix=new Uint32Array(1025*1537);
        for(var py=0;py<1536;py++){var count=0;for(var px=0;px<1024;px++){if(pixels[(py*1024+px)*4+3]>=64)count++;prefix[(py+1)*1025+px+1]=prefix[py*1025+px+1]+count;}}
        this.alphaPrefix=prefix;
        function alpha(x,y){return pixels[(y*1024+x)*4+3];}
        armRows=[];
        for(var ay=0;ay<470;ay++){var first=1023,last=0;for(var ax=sources.crop[0];ax<sources.crop[0]+sources.crop[2];ax++)if(alpha(ax,ay)>=64){first=Math.min(first,ax);last=Math.max(last,ax);}armRows.push([first,last]);}
        var grid=[],divisions=[10,12,2,18,18,2,12,10],crop=sources.crop;
        for(var y=crop[1];y<=crop[1]+crop[3];y+=y>=280&&y<840?3:8){
          var sy=Math.min(1535,y),il=boundary(sources.innerL,sy),ir=boundary(sources.innerR,sy);
          var ol=Math.max(crop[0]+1,il-100),orr=Math.min(crop[0]+crop[2]-1,ir+100),bl=il,br=ir;
          if(y>=(night?415:430)){
            // Separate alpha islands are the actual arms, clear of the torso.
            // Search near the measured arm chains, never outside a body edge.
            var bodyL=510,bodyR=510;
            while(bodyL>1&&alpha(bodyL-1,sy)>=64)bodyL--;
            while(bodyR<1022&&alpha(bodyR+1,sy)>=64)bodyR++;
            if(y>817){bodyL=1023;bodyR=0;for(var x=crop[0];x<crop[0]+crop[2];x++)if(alpha(x,sy)>=64){bodyL=Math.min(bodyL,x);bodyR=Math.max(bodyR,x);}if(bodyL>bodyR){bodyL=450;bodyR=570;}}
            if(!night&&sy>1232&&sy<1368){
              // Keep the mesh columns steady where the coat hem ends. Its
              // alpha bounds narrow abruptly, while the trousers keep moving.
              var hem=smooth(1232,1264,sy)*(1-smooth(1336,1368,sy));
              bodyL+=(Math.min(bodyL,170)-bodyL)*hem;bodyR+=(Math.max(bodyR,890)-bodyR)*hem;
            }
            var leftFirst=-1,leftLast=-1,rightFirst=-1,rightLast=-1;
            if(y<=817){for(var x=crop[0];x<bodyL;x++)if(alpha(x,sy)>=64){if(leftFirst<0)leftFirst=x;leftLast=x;}
            for(var x=bodyR+1;x<crop[0]+crop[2];x++)if(alpha(x,sy)>=64){if(rightFirst<0)rightFirst=x;rightLast=x;}}
            bl=bodyL;br=bodyR+1;
            if(leftLast>=0){ol=leftFirst-4;il=leftLast+1;}else{il=Math.min(il,bl-20);ol=il-40;}
            if(rightFirst>=0){ir=rightFirst;orr=rightLast+4;}else{ir=Math.max(ir,br+20);orr=ir+40;}
          }
          var stops=[crop[0],ol,il,bl,510,br,ir,orr,crop[0]+crop[2]],xs=[crop[0]],domains=['left'];
          // Transparent rows below the last fingertip keep a monotonic grid.
          for(var j=1;j<stops.length;j++)stops[j]=Math.max(stops[j],stops[j-1]);
          for(var j=0;j<divisions.length;j++)for(var k=1;k<=divisions[j];k++){
            xs.push(stops[j]+(stops[j+1]-stops[j])*k/divisions[j]);
            var domain=j<2?'left':j===2?'gap':j<5?'body':j===5?'gap':'right';if(j===2&&k===divisions[j])domain='body';if(j===5&&k===divisions[j])domain='right';domains.push(domain);
          }
          grid.push({y:y,x:xs,domains:domains});
        }
        this.grid=grid;sampling.width=sampling.height=0;
      }
      var crop=sources.crop;
      return {image:night?'hanjing-night-armed':'hanjing-day-armed',sheet:[1024,1536],crop:crop,box:[ox+crop[0]*kx,oy+crop[1]*ky,crop[2]*kx,crop[3]*ky],sourceTransform:[ox,oy,kx,ky],prepare:prepareNativeArms,splitY:night?320:315,gapColumns:[[22,24],[60,62]],weightsByDomain:function(x,y,domain){
        if(domain==='left'||domain==='right'){var aw=arm((x-ox)/kx,(y-oy)/ky,domain==='left');if(aw)return aw;}
        return bodyWeights(x,y);
      },weights:bodyWeights,alphaCutoff:.25,dual:true,nativeArms:true,night:night,pivots:pivots,rest:rest,handBounds:sources.hands};
    }
    return renderer(root,'human',[outfit(false),outfit(true)]);
  }
  function cat(root){
    var legs=[
      {p:[41,48],k:[39.5,59],e:[45.5,67.8],path:[[32,45],[44,44],[54,60],[52,73],[32,73],[31,57]],phase:.5},
      {p:[60,47],k:[57,58.3],e:[57.5,68.15],path:[[51,44],[65,44],[66,57],[64,72],[51,72]],phase:.75},
      {p:[23,48],k:[18.5,59],e:[18,68.4],path:[[16,46],[33,43],[32,60],[24,64],[24,72],[10,72],[10,61]],phase:0},
      {p:[77,48],k:[75,59.3],e:[79.3,69.9],path:[[69,44],[86,44],[92,73],[70,73]],phase:.25}
    ];
    function edgeDistance(points,x,y){
      var nearest=Infinity;
      for(var i=0,j=points.length-1;i<points.length;j=i++){
        var a=points[j],z=points[i],dx=z[0]-a[0],dy=z[1]-a[1],f=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1);
        nearest=Math.min(nearest,Math.hypot(x-a[0]-dx*f,y-a[1]-dy*f));
      }
      return nearest;
    }
    return renderer(root,'cat',[{image:'cats-painted',sheet:[1536,1024],crop:[764,33,742,553],box:[2,6,86,64],cutouts:[[942,576,998,590]],step:1.5,legs:legs,weights:function(x,y){
      for(var i=legs.length-1;i>=0;i--){var l=legs[i];if(within(l.path,x,y)){
        var feather=clamp(edgeDistance(l.path,x,y)/3,0,1);feather=feather*feather*(3-2*feather);
        feather+=(1-feather)*clamp((y-l.k[1])/5,0,1);
        var a=clamp((y-l.p[1])/7,0,1)*feather,b=clamp((y-l.k[1]+3)/6,0,1),paw=clamp((y-l.e[1]+4.5)/3.5,0,1);
        return [[0,1-a],[1+i*3,a*(1-b)],[2+i*3,a*b*(1-paw)],[3+i*3,a*b*paw]].filter(function(w){return w[1]>0;});
      }}
      if(x<28&&y<42)return [[13,clamp((28-x)/9,0,1)],[0,1-clamp((28-x)/9,0,1)]];
      if(x>61&&y<37)return [[14,clamp((37-y)/9,0,1)],[0,1-clamp((37-y)/9,0,1)]];
      return [[0,1]];
    }}]);
  }
  function active(rig,name,t){if(!rig.root.classList.contains(name)){delete rig.times[name];return null;}if(rig.times[name]===undefined)rig.times[name]=t;return (t-rig.times[name])/1000;}
  function aimAngles(c,target,letter){
    var p=c.pivots,end=letter?p.letter:p.wr,ux=p.er[0]-p.sr[0],uy=p.er[1]-p.sr[1],fx=end[0]-p.er[0],fy=end[1]-p.er[1];
    var upper=Math.hypot(ux,uy),lower=Math.hypot(fx,fy),dx=target[0]-p.mount[0]-p.sr[0],dy=target[1]-p.mount[1]-p.sr[1];
    var distance=clamp(Math.hypot(dx,dy),Math.abs(upper-lower)+.5,upper+lower-.5),direction=Math.atan2(dy,dx);
    dx=Math.cos(direction)*distance;dy=Math.sin(direction)*distance;
    var bend=Math.acos(clamp((upper*upper+distance*distance-lower*lower)/(2*upper*distance),-1,1));
    var a=direction+(letter?bend:-bend);
    var b=Math.atan2(dy-Math.sin(a)*upper,dx-Math.cos(a)*upper);
    return [(a-Math.atan2(uy,ux))*180/Math.PI,(b-a-Math.atan2(fy,fx)+Math.atan2(uy,ux))*180/Math.PI];
  }
  function humanBones(rig,c,t){
    var root=rig.root,p=c.pivots,b=[identity()],moving=!reduced&&root.classList.contains('is-walking'),phase=root._rigStride||0;
    var gaitDt=rig.lastHumanFrame?clamp((t-rig.lastHumanFrame)/1000,0,.1):0;rig.lastHumanFrame=t;
    rig.gaitMix=reduced?0:clamp((rig.gaitMix||0)+(moving?1:-1)*gaitDt/.18,0,1);
    var rest=c.rest||[0,0,0,0],left=rest[0],right=rest[2],lf=rest[1],rf=rest[3],wave=active(rig,'is-waving',t),reach=active(rig,'act-reach',t),point=active(rig,'act-point',t),mail=active(rig,'act-mail',t),toss=active(rig,'act-toss',t),bow=active(rig,'is-bowing',t),jump=active(rig,'is-jumping',t);
    // The complete pose jumps in one coordinate space. Its eyelids, palms and
    // lit prop use this same transform, including when the actor faces left.
    var jumpScale=1,jumpY=0;
    if(!reduced&&jump!==null&&jump<.75){
      var progress=jump/.75,keys=[[0,0,1],[.15,0,.95],[.45,-30,1],[.8,0,1],[.9,0,.97],[1,0,1]];
      for(var ji=1;ji<keys.length;ji++)if(progress<=keys[ji][0]){var from=keys[ji-1],to=keys[ji],jf=(progress-from[0])/(to[0]-from[0]);jf=jf*jf*(3-2*jf);jumpY=from[1]+(to[1]-from[1])*jf;jumpScale=from[2]+(to[2]-from[2])*jf;break;}
    }
    rig.poseY=[jumpScale,193*(1-jumpScale)+jumpY];
    var jumpMatrix=[1,0,0,jumpScale,0,rig.poseY[1]];
    if(moving){var swing=Math.sin(phase*Math.PI*2)*7;right+=swing;left-=swing;lf-=3;rf-=3;}
    function envelope(time,duration){return Math.sin(Math.PI*clamp(time/duration,0,1));}
    if(wave!==null&&wave<1.4){var ease=Math.min(1,wave/.2,(1.4-wave)/.2);right=rest[2]-(c.night?54:74)*ease;rf=rest[3]+((c.night?-144:-126)+Math.sin(wave*18)*6)*ease;}
    if(reach!==null){var grab=aimAngles(c,root._rigHandTarget||[135,49],false),grabEase=Math.min(1,reach/.4);right=rest[2]+(grab[0]-rest[2])*grabEase;rf=rest[3]+(grab[1]-rest[3])*grabEase;}
    if(point!==null&&point<2.6){var pointEase=Math.min(1,point/.35,(2.6-point)/.35);right=rest[2]-84*pointEase;rf=rest[3]-(c.night?28:17)*pointEase;}
    if(mail!==null&&mail<2.6){var post=aimAngles(c,root._rigHandTarget||[112.6,73.1],true),postEase=Math.min(1,mail/.65,(2.6-mail)/.4);right=rest[2]+(post[0]-rest[2])*postEase;rf=rest[3]+(post[1]-rest[3])*postEase;}
    if(toss!==null&&toss<2.4){var lift=Math.min(1,toss/.35,(2.4-toss)/.4);right=rest[2]-(c.night?133:140)*lift;left=rest[0]+(c.night?133:140)*lift;rf=rest[3]-(c.night?10:3)*lift;lf=rest[1]+(c.night?10:3)*lift;}
    if(reduced){left=rest[0];right=rest[2];lf=rest[1];rf=rest[3];}
    b.push(rotate(left,p.sl[0],p.sl[1]));b.push(multiply(b[1],rotate(lf,p.el[0],p.el[1])));b.push(rotate(right,p.sr[0],p.sr[1]));b.push(multiply(b[3],rotate(rf,p.er[0],p.er[1])));
    var walkDy=(c.night?1.8+.35*Math.cos(phase*Math.PI*4):.03)*rig.gaitMix;
    var bowMix=!reduced&&bow!==null&&bow<.9?envelope(bow,.9):0;
    rig.affine=bowMix>0;
    var dy=walkDy+bowMix*2;
    // A small actual crouch makes a planted target reachable without
    // shortening the legs or pulling the shoes away from the paving.
    if(!c.night&&rig.gaitMix>0)[0,.5].forEach(function(offset,i){var ph=(phase+offset)%1,stance=.64,swing=clamp((ph-stance)/(1-stance),0,1),ease=swing*swing*(3-2*swing),x=(ph<stance?3.2*(1-2*ph/stance):-3.2+6.4*ease)*rig.gaitMix,rise=Math.sin(swing*Math.PI)*1.8*rig.gaitMix,h=i?p.hr:p.hl,k=i?p.kr:p.kl,a=i?p.ar:p.al,maxReach=Math.hypot(k[0]-h[0],k[1]-h[1])+Math.hypot(a[0]-k[0],a[1]-k[1])-.03;dy=Math.max(dy,a[1]-rise-h[1]-Math.sqrt(Math.max(0,maxReach*maxReach-(a[0]+x-h[0])*(a[0]+x-h[0])))+.005);});
    var footPose=[];
    [0,.5].forEach(function(offset,i){
      var ph=(phase+offset)%1,stance=.64,swing=clamp((ph-stance)/(1-stance),0,1),ease=swing*swing*(3-2*swing);
      var stroke=c.night?3.4:3.2,lift=c.night?3:1.8;
      var x=(ph<stance?stroke*(1-2*ph/stance):-stroke+2*stroke*ease)*rig.gaitMix;
      var rise=Math.sin(swing*Math.PI)*lift*rig.gaitMix,h=i?p.hr:p.hl,k=i?p.kr:p.kl,a=i?p.ar:p.al;
      var hip=0,knee=0;
      if(rig.gaitMix>0||dy>0){
        var ux=k[0]-h[0],uy=k[1]-h[1],fx=a[0]-k[0],fy=a[1]-k[1];
        var upper=Math.hypot(ux,uy),lower=Math.hypot(fx,fy),dx=a[0]+x-h[0],ddy=a[1]-rise-dy-h[1];
        var d=clamp(Math.hypot(dx,ddy),Math.abs(upper-lower)+.02,upper+lower-.02),direction=Math.atan2(ddy,dx);
        var side=ux*fy-uy*fx<0?-1:1;
        var bend=Math.acos(clamp((upper*upper+d*d-lower*lower)/(2*upper*d),-1,1));
        var theta=side*Math.acos(clamp((d*d-upper*upper-lower*lower)/(2*upper*lower),-1,1));
        hip=(direction-side*bend-Math.atan2(uy,ux))*180/Math.PI;
        knee=(theta-Math.atan2(fy,fx)+Math.atan2(uy,ux))*180/Math.PI;
      }
      var hi=rotate(hip,h[0],h[1]),kn=multiply(hi,rotate(knee,k[0],k[1])),shoe=multiply(kn,rotate(-hip-knee,a[0],a[1]));
      b.push(hi,kn,shoe);
      footPose.push({stance:ph<stance,phase:ph,ankle:[shoe[0]*a[0]+shoe[2]*a[1]+shoe[4],shoe[1]*a[0]+shoe[3]*a[1]+shoe[5]+dy],rest:a,lift:rise});
    });
    root._rigFootPose=footPose;
    var head=rotate(reduced?0:Math.sin(t/1900)*.3,60,43);
    if(bowMix){
      // A frontal nod shortens the visible neck and upper body in depth.
      // Its shoulder joints follow the same torso, while planted shoes stay
      // on their ground plane through the two-bone leg compensation above.
      var torso=[1,0,0,1-.028*bowMix,0,2.8*bowMix];
      var nod=[1,0,0,1-.07*bowMix,0,(43*.07+1.1)*bowMix];
      for(var upper=0;upper<5;upper++)b[upper]=multiply(torso,b[upper]);
      head=multiply(torso,multiply(head,nod));
    }
    b.push(head);
    // The letter follows the same shoulder/elbow matrices as the hand.
    root.querySelectorAll('.c-root > .o-'+(c.night?'night':'day')+' .c-arm-f').forEach(function(el){el.style.animation='none';el.style.transform='rotate('+right+'deg)';el.querySelector('.paint-forearm').style.animation='none';el.querySelector('.paint-forearm').style.transform='rotate('+rf+'deg)';});
    root.querySelectorAll('.c-root > .o-'+(c.night?'night':'day')+' .c-arm-b').forEach(function(el){el.style.animation='none';el.style.transform='rotate('+left+'deg)';el.querySelector('.paint-forearm').style.animation='none';el.querySelector('.paint-forearm').style.transform='rotate('+lf+'deg)';});
    // Every painted point and the separately lit hand prop share the body's
    // translation. The facial features read this same value in followHead.
    b.forEach(function(m){m[5]+=dy;});
    root._rigBodyDy=dy;
    root._rigHeadMatrix=multiply(jumpMatrix,b[11]);
    var face=root._rigFace||(root._rigFace=root.querySelector('.painted-face-rig'));
    if(face)face.setAttribute('transform','matrix('+root._rigHeadMatrix.join(' ')+')');
    footPose.forEach(function(foot){foot.ankle[1]=foot.ankle[1]*jumpScale+rig.poseY[1];});
    var propBones=jumpScale!==1||jumpY!==0?b.map(function(m){return multiply(jumpMatrix,m);}):b;
    if(A.gestureHands&&c.handBounds)c.handMask=A.gestureHands(root,c,propBones,wave!==null&&wave<1.4?'wave':toss!==null&&toss<2.4?'toss':point!==null&&point<2.6?'point':reach!==null?'reach':null);
    root.querySelectorAll('.c-root > .o-'+(c.night?'night':'day')+' .rig-handprop').forEach(function(el){
      // A loose handle follows the palm; gravity keeps the paper body upright.
      var m=propBones[2],hand=p.handL,x=m[0]*hand[0]+m[2]*hand[1]+m[4],y=m[1]*hand[0]+m[3]*hand[1]+m[5];
      var prop=rotate(reduced?0:Math.sin(t/850)*(moving?3:.7),hand[0],hand[1]);prop[4]+=x-hand[0];prop[5]+=y-hand[1];
      el.setAttribute('transform','matrix('+prop.join(' ')+')');
    });
    root.querySelectorAll('.c-root > .o-day .c-upper,.c-root > .o-night .c-upper').forEach(function(el){el.style.animation='none';el.style.transform='translateY('+dy+'px)';});
    return b;
  }
  function catBones(rig,c,t){
    var root=rig.root,phase=root._rigStride||0,moving=!reduced&&(root.classList.contains('is-walking')||root.classList.contains('is-settling')),pounce=active(rig,'is-pouncing',t),gait=root._rigCatGaitMix===undefined?1:root._rigCatGaitMix;
    var body=identity(),cycle=root._rigCatCycleSource||40,stroke=12;
    var facing=root._rigCatFacing||1,bodyX=(root._rigCatWorldX||0)/(66/90)-45;
    // A stationary review demo supplies phase rather than a travelling position.
    // Its virtual belt follows the same stride so the joints can still be inspected.
    if(root._rigCatWorldX===undefined&&moving){
      var advance=rig.catPreviewPhase===undefined?0:(phase-rig.catPreviewPhase+1)%1;
      rig.catPreviewDistance=(rig.catPreviewDistance||0)+advance*cycle;
      bodyX=rig.catPreviewDistance-45;
    }
    rig.catPreviewPhase=phase;
    var travel=moving&&rig.catPreviousBodyX!==undefined?Math.abs(bodyX-rig.catPreviousBodyX):0;
    rig.catPreviousBodyX=moving?bodyX:undefined;
    if(moving)body[5]=(1.2+Math.sin(phase*Math.PI*4)*.12)*gait;
    var b=[body];
    // The visible fur mesh reaches for the butterfly with its forelegs, keeping
    // the shoulder skin attached to the chest through the same joint weights.
    function reachAt(progress){
      var keys=[[0,0],[.14,.12],[.38,1],[.60,0],[.80,.25],[1,0]];
      for(var i=1;i<keys.length;i++)if(progress<=keys[i][0]){
        var a=keys[i-1],z=keys[i],f=(progress-a[0])/(z[0]-a[0]);
        f=f*f*(3-2*f);return a[1]+(z[1]-a[1])*f;
      }
      return 0;
    }
    var reach=pounce!==null&&!reduced?reachAt(clamp(pounce/1.65,0,1)):0;
    rig.catPlants=rig.catPlants||[];
    var targets=[];
    c.legs.forEach(function(l,i){
      var ph=(phase+l.phase)%1,plant=rig.catPlants[i];
      if(moving){
        var initial=!plant,wrapped=false;
        if(initial)plant={phase:ph,cycle:cycle,facing:facing};
        else{
          ph=plant.phase+travel/plant.cycle;
          // Each paw completes the same distance-based step it began. A
          // deceleration cannot turn an airborne paw into a planted one.
          while(ph>=1){var remainder=(ph-1)*plant.cycle;plant.cycle=cycle;ph=remainder/plant.cycle;wrapped=true;}
        }
        var stepCycle=plant.cycle,stepStance=stroke/stepCycle,x,y=l.e[1],swing=ph>=stepStance;
        if(!swing){
          if(initial||wrapped||plant.x===undefined||plant.facing!==facing){
            // The first sampled frame can already be inside stance; recover
            // the phase-zero contact instead of teleporting to a late landing.
            var landing=l.e[0]+stroke/2-ph*stepCycle;
            plant.x=bodyX+(facing>0?landing:90-landing);plant.facing=facing;
          }
          x=facing>0?plant.x-bodyX:90-(plant.x-bodyX);
        }else{
          var u=clamp((ph-stepStance)/(1-stepStance),0,1),ease=u*u*(3-2*u);
          x=l.e[0]-stroke/2+stroke*ease;y-=Math.sin(u*Math.PI)*2.7*gait;
        }
        plant.phase=ph;plant.swing=swing;plant.stance=stepStance;rig.catPlants[i]=plant;
        targets[i]={x:x,y:y,swing:swing,u:swing?u:0};
        var maxReach=Math.hypot(l.k[0]-l.p[0],l.k[1]-l.p[1])+Math.hypot(l.e[0]-l.k[0],l.e[1]-l.k[1])-.04;
        // A small real crouch makes the fixed ground target reachable. Clamping
        // the IK distance instead would pull an extended paw off the stone.
        body[5]=Math.max(body[5],y-l.p[1]-Math.sqrt(Math.max(0,maxReach*maxReach-(x-l.p[0])*(x-l.p[0])))+.015);
      }else{rig.catPlants[i]=null;}
    });
    rig.catBodyDy=body[5];
    c.legs.forEach(function(l,i){
      var upper=0,lower=0,ankle=0;
      if(moving){
        var target=targets[i],x=target.x,y=target.y,swing=target.swing,u=target.u;
        var ux=l.k[0]-l.p[0],uy=l.k[1]-l.p[1],fx=l.e[0]-l.k[0],fy=l.e[1]-l.k[1];
        var l1=Math.hypot(ux,uy),l2=Math.hypot(fx,fy),dx=x-l.p[0],dy=y-l.p[1]-body[5];
        var distance=clamp(Math.hypot(dx,dy),Math.abs(l1-l2)+.05,l1+l2-.02),direction=Math.atan2(dy,dx);
        var side=ux*fy-uy*fx<0?-1:1;
        var bend=Math.acos(clamp((l1*l1+distance*distance-l2*l2)/(2*l1*distance),-1,1));
        var a=direction-side*bend,theta=side*Math.acos(clamp((distance*distance-l1*l1-l2*l2)/(2*l1*l2),-1,1));
        upper=(a-Math.atan2(uy,ux))*180/Math.PI;
        lower=(theta-Math.atan2(fy,fx)+Math.atan2(uy,ux))*180/Math.PI;
        // The paw stays flat on the stone during stance; the toes lift in swing.
        ankle=-upper-lower+(swing?Math.sin(u*Math.PI)*5*gait:0);
      }
      if(i===1||i===3){upper-=reach*24;lower+=reach*8;}
      var hi=multiply(body,rotate(upper,l.p[0],l.p[1])),lo=multiply(hi,rotate(lower,l.k[0],l.k[1]));
      b.push(hi,lo,multiply(lo,rotate(ankle,l.e[0],l.e[1])));
    });
    b.push(multiply(body,rotate(reduced?0:Math.sin(t/750)*1.5,26,40)),multiply(body,rotate(reduced?0:Math.sin(t/1700)*.6-reach*2,64,36)));return b;
  }
  function frame(t){var dark=document.documentElement.dataset.theme==='dark';rigs.forEach(function(r){if(r.type==='cat'&&!r.root.classList.contains('is-pouncing'))delete r.times['is-pouncing'];var hidden=r.type==='human'?(r.root.classList.contains('act-read')||r.root.classList.contains('act-write')||r.root.classList.contains('act-pet')):(!r.root.classList.contains('is-walking')&&!r.root.classList.contains('is-settling')&&!r.root.classList.contains('is-pouncing'));if(hidden||!r.root.isConnected||r.root.closest('[hidden]'))return;if(r.type==='cat'&&r.root._rigCatWorldX!==undefined&&(r.root.classList.contains('is-walking')||r.root.classList.contains('is-settling')))return;var c=r.configs[r.type==='human'&&dark?1:0];r.draw(c,r.type==='human'?humanBones(r,c,t):catBones(r,c,t));});requestAnimationFrame(frame);}
  A.initMotionRigs=function(container){container.querySelectorAll('.painted-character').forEach(function(el){var root=el.closest('#char,.avatar-demo')||el.parentElement;if(!root._paintRig)human(root);});container.querySelectorAll('.painted-cat').forEach(function(el){var root=el.closest('#cat,.cat-demo')||el.parentElement;if(!root._paintRig)cat(root);});};
  A.aimHand=function(root,element,x,y){
    var svg=root.querySelector('.painted-character'),from=element.getScreenCTM(),to=svg.getScreenCTM();
    if(from&&to){var point=new DOMPoint(x,y).matrixTransform(from).matrixTransform(to.inverse());root._rigHandTarget=[point.x,point.y];}
  };
  var oldHuman=A.poseCharacter,oldCat=A.poseCat;
  A.poseCharacter=function(root,stride,moving){root._rigStride=stride;if(!root._paintRig)oldHuman(root,stride,moving);};
  A.poseCat=function(root,stride,moving){root._rigStride=stride;if(!root._paintRig)oldCat(root,stride,moving);else if(moving&&root._rigCatWorldX!==undefined){var r=root._paintRig,c=r.configs[0];r.draw(c,catBones(r,c,performance.now()));}else if(!moving){root._paintRig.catPlants=[];root._paintRig.catPreviousBodyX=undefined;}};
  requestAnimationFrame(frame);
})();
