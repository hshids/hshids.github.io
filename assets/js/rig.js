/* Continuous 2D skinning of the original painted textures. */
(function () {
  'use strict';
  var A=window.HJArt, rigs=[], images={}, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var artBase=new URL('../art/',document.currentScript.src);
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function identity(){return [1,0,0,1,0,0];}
  function rotate(deg,x,y){var a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [c,s,-s,c,x-c*x+s*y,y-s*x-c*y];}
  function multiply(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
  function asset(name){if(!images[name]){var im=new Image();im.src=new URL(name+'.webp',artBase).href;if(im.decode){im._hjMotionDecode=im.decode();im._hjMotionDecode.catch(function(){});}images[name]=im;}return images[name];}
  function polygon(path){var n=path.match(/-?\d+(?:\.\d+)?/g).map(Number),p=[];for(var i=0;i<n.length;i+=2)p.push([n[i],n[i+1]]);return p;}
  function within(p,x,y){var inside=false;for(var i=0,j=p.length-1;i<p.length;j=i++){if(((p[i][1]>y)!==(p[j][1]>y))&&(x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0]))inside=!inside;}return inside;}
  function shader(gl,type,source){var s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Painted motion shader failed');return s;}
  function renderer(root,type,configurations){
    var canvas=document.createElement('canvas');canvas.className='motion-rig motion-rig-'+type;canvas.setAttribute('aria-hidden','true');
    var width=type==='human'?200:110,height=type==='human'?220:84,pad=type==='human'?40:10,top=type==='human'?10:6;
    var rasterScale=Math.max(1.5,Math.min(2,window.devicePixelRatio||1));
    canvas.width=Math.round(width*rasterScale);canvas.height=Math.round(height*rasterScale);
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
      cutSource='bool cut(vec4 r){if(!(tex.x>r.x&&tex.x<r.z&&tex.y>r.y&&tex.y<r.w))return false;if(cutContourMode<0.5)return true;vec2 p=tex*vec2('+sculpted.sheet[0].toFixed(1)+','+sculpted.sheet[1].toFixed(1)+');if(r.x<'+(sculpted.cutouts[1][0]/sculpted.sheet[0]).toFixed(8)+')return '+contour(sculpted.sourceCuts[0])+';return '+contour(sculpted.sourceCuts[1])+';}';
    }
    var program=gl.createProgram();
    gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,'attribute vec2 position;attribute vec2 uv;attribute vec4 skinIndices;attribute vec4 skinWeights;attribute vec3 nativeWind;varying vec2 tex;varying vec2 actorPosition;uniform vec2 extent;uniform vec2 padding;uniform vec2 poseY;uniform float gpuSkin;uniform vec4 skinDual[12];uniform vec2 walkWind;void main(){vec2 local=position;if(gpuSkin>.5){vec4 q=skinDual[int(skinIndices.x)]*skinWeights.x+skinDual[int(skinIndices.y)]*skinWeights.y+skinDual[int(skinIndices.z)]*skinWeights.z+skinDual[int(skinIndices.w)]*skinWeights.w;q/=max(.0001,length(q.xy));float co=q.x*q.x-q.y*q.y,si=2.0*q.x*q.y;local=vec2(co*position.x-si*position.y,si*position.x+co*position.y)+2.0*vec2(q.z*q.x-q.w*q.y,q.w*q.x+q.z*q.y);float h=sin(walkWind.x/860.0+position.y*.15),c=sin(walkWind.x/1040.0+position.y*.075),b=sin(walkWind.x/1030.0+position.y*.11);local.x+=nativeWind.x*mix(.65,.24,walkWind.y)*h+nativeWind.y*mix(1.10,.35,walkWind.y)*c+nativeWind.z*.4*b;local.y+=nativeWind.x*.13*cos(walkWind.x/1100.0+position.x*.2)+nativeWind.y*mix(.23,.08,walkWind.y)*sin(walkWind.x/1210.0+position.y*.08);}vec2 posed=vec2(local.x,local.y*poseY.x+poseY.y);vec2 p=(posed+padding)/extent;gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0,0.0,1.0);tex=uv;actorPosition=posed;}'));
    gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,'precision highp float;varying vec2 tex;varying vec2 actorPosition;uniform sampler2D painting;uniform sampler2D nativeMask;uniform vec4 nativeMaskCrop;uniform float nativeMaskOn;uniform vec4 cutLeft;uniform vec4 cutRight;uniform vec4 handPlaneLeft;uniform vec4 handPlaneRight;uniform float handMode;uniform float cutContourMode;uniform float alphaCutoff;uniform vec2 paintSize;uniform vec4 surfaceLight;uniform vec3 localLamp;'+(A.bowDepth?A.bowDepth.shadingGLSL:'')+cutSource+'bool handCut(vec4 rect,vec4 plane){return cut(rect)&&plane.w>0.0&&dot(plane.xy,tex)+plane.z>=0.0;}void main(){gl_FragColor=texture2D(painting,tex);if(nativeMaskOn>.5){gl_FragColor.a*=texture2D(nativeMask,(tex*paintSize-nativeMaskCrop.xy)/nativeMaskCrop.zw).r;if(gl_FragColor.a<.01)discard;}float nativeAlpha=texture2D(painting,(floor(tex*paintSize)+.5)/paintSize).a;if(nativeAlpha<alphaCutoff)discard;if(handMode>0.0?(handCut(cutLeft,handPlaneLeft)||handCut(cutRight,handPlaneRight)):(cut(cutLeft)||cut(cutRight)))gl_FragColor.a=0.0;'+(A.bowDepth?'gl_FragColor.rgb=bowNightFaceTone(gl_FragColor.rgb,tex);gl_FragColor.rgb=bowSurfaceShade(gl_FragColor.rgb,actorPosition);':'')+'if(surfaceLight.x>0.0){vec2 scenePosition=vec2(surfaceLight.z<0.0?120.0-actorPosition.x:actorPosition.x,actorPosition.y);float upper=clamp(1.0-scenePosition.y/200.0,0.0,1.0);float right=clamp((scenePosition.x-15.0)/95.0,0.0,1.0);float key=right*0.58+upper*0.42;vec3 day=mix(vec3(0.945,0.972,1.008),vec3(1.055,1.030,0.996),key);vec2 distanceToLamp=(actorPosition-localLamp.xy)/vec2(32.0,42.0);float warmth=exp(-dot(distanceToLamp,distanceToLamp)*1.4)*localLamp.z;vec3 night=vec3(0.74,0.82,0.93)+vec3(0.245,0.132,0.018)*warmth;vec3 tint=mix(day,night,surfaceLight.y);gl_FragColor.rgb*=mix(vec3(1.0),tint,surfaceLight.x);}}'));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;
    gl.useProgram(program);gl.uniform2f(gl.getUniformLocation(program,'extent'),width,height);gl.uniform2f(gl.getUniformLocation(program,'padding'),pad,top);
    var skinAttributes={ids:gl.getAttribLocation(program,'skinIndices'),weights:gl.getAttribLocation(program,'skinWeights'),wind:gl.getAttribLocation(program,'nativeWind')},skinUniforms={enabled:gl.getUniformLocation(program,'gpuSkin'),dual:gl.getUniformLocation(program,'skinDual[0]'),wind:gl.getUniformLocation(program,'walkWind')},skinBuffer=gl.createBuffer();
    var maskUniforms={sampler:gl.getUniformLocation(program,'nativeMask'),crop:gl.getUniformLocation(program,'nativeMaskCrop'),enabled:gl.getUniformLocation(program,'nativeMaskOn')};gl.uniform1i(maskUniforms.sampler,1);
    var bowUniforms={form:gl.getUniformLocation(program,'bowForm'),collar:gl.getUniformLocation(program,'bowCollar'),waist:gl.getUniformLocation(program,'bowWaist'),face:gl.getUniformLocation(program,'bowFaceTone')};
    var lightUniforms={surface:gl.getUniformLocation(program,'surfaceLight'),lamp:gl.getUniformLocation(program,'localLamp'),contour:gl.getUniformLocation(program,'cutContourMode')};
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.viewport(0,0,canvas.width,canvas.height);
    var position=gl.getAttribLocation(program,'position'),uv=gl.getAttribLocation(program,'uv'),buffer=gl.createBuffer(),indexBuffer=gl.createBuffer(),tex=gl.createTexture();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,16,8);
    gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    function mesh(c){
      var vertices=[],foreground=[],behind=[],step=c.step||2,box=c.box,cols=Math.ceil(box[2]/step),rows=Math.ceil(box[3]/step),lattice={};
      function append(list,a,b,d){
        if(c.alphaPrefix){
          var w=c.sheet[0],h=c.sheet[1],stride=w+1,prefix=c.alphaPrefix;
          var l=Math.max(0,Math.floor(Math.min(a.u,b.u,d.u)*w)-1),r=Math.min(w,Math.ceil(Math.max(a.u,b.u,d.u)*w)+2);
          var t=Math.max(0,Math.floor(Math.min(a.v,b.v,d.v)*h)-1),bottom=Math.min(h,Math.ceil(Math.max(a.v,b.v,d.v)*h)+2);
          if(prefix[bottom*stride+r]-prefix[t*stride+r]-prefix[bottom*stride+l]+prefix[t*stride+l]===0)return;
        }
        list.push(a,b,d);
      }
      function vertex(cx,cy){var key=cy*(cols+1)+cx;if(lattice&&lattice[key])return lattice[key];var sx=c.crop[0]+cx/cols*c.crop[2],sy=c.crop[1]+cy/rows*c.crop[3],m=c.sourceAffine,x=m?m[0]*sx+m[2]*sy+m[4]:box[0]+cx/cols*box[2],y=m?m[1]*sx+m[3]*sy+m[5]:box[1]+cy/rows*box[3],v={x:x,y:y,u:sx/c.sheet[0],v:sy/c.sheet[1],weights:c.weights(x,y)};if(lattice)lattice[key]=v;return v;}
      if(c.grid){
        var previous=null;
        var previousY=0;
        c.grid.forEach(function(row){var next=row.x.map(function(sx,i){var st=c.sourceTransform,x=st?st[0]+sx*st[2]:box[0]+sx/c.sheet[0]*box[2],y=st?st[1]+row.y*st[3]:box[1]+row.y/c.sheet[1]*box[3];return {x:x,y:y,u:sx/c.sheet[0],v:row.y/c.sheet[1],weights:row.domains?c.weightsByDomain(x,y,row.domains[i]):c.weights(x,y)};});if(previous)for(var i=0;i<next.length-1;i++){if(previousY>=c.splitY&&c.gapColumns.some(function(range){return i>=range[0]&&i<range[1];}))continue;var list=c.nativeArms&&row.y>=290&&row.y<=835&&(i<22||i>=62)?foreground:vertices;append(list,previous[i],previous[i+1],next[i]);append(list,previous[i+1],next[i+1],next[i]);}previous=next;previousY=row.y;});
      }else for(var y=0;y<rows;y++)for(var x=0;x<cols;x++){
        var a=vertex(x,y),b=vertex(x+1,y),d=vertex(x,y+1),e=vertex(x+1,y+1);
        // A shelf arm starts above the chest in its native painting. On the
        // return its skin crosses in front of that chest, so source row order
        // must not let the later stationary torso paint over the carrying arm.
        var raised=c.armForeground&&[a,b,d,e].some(function(v){return v.weights.some(function(w){return (w[0]===3||w[0]===4)&&w[1]>.02;});});
        var list=raised?foreground:vertices;if(c.profileWalk&&c.layer){var mid=[(a.x+b.x+d.x+e.x)/4,(a.y+b.y+d.y+e.y)/4],layer=c.layer(mid[0],mid[1]);list=layer<0?behind:layer>0?foreground:vertices;}append(list,a,b,d);append(list,b,e,d);
      }
      c.vertices=behind.concat(vertices,foreground);c.data=new Float32Array(c.vertices.length*4);c.frame=0;c.uniqueVertices=[];
      c.vertices.forEach(function(v,i){
        v.linear=c.nativeArms&&v.weights.some(function(w){return w[0]===0;})&&v.weights.some(function(w){return w[0]===1||w[0]===3||!c.night&&w[0]>=5&&w[0]<=10;});
        if(v.dataOffset===undefined){v.dataOffset=i*4;v.drawIndex=c.uniqueVertices.length;c.uniqueVertices.push(v);}
        c.data[i*4+2]=v.u;c.data[i*4+3]=v.v;
      });
      if(c.uniqueVertices.length<=65535){
        c.indices=new Uint16Array(c.vertices.length);c.drawData=new Float32Array(c.uniqueVertices.length*4);
        c.vertices.forEach(function(v,i){c.indices[i]=v.drawIndex;});
        c.uniqueVertices.forEach(function(v,i){c.drawData[i*4]=v.x;c.drawData[i*4+1]=v.y;c.drawData[i*4+2]=v.u;c.drawData[i*4+3]=v.v;});
      }
      if(c.profileWalk){c.skinData=new Float32Array(c.uniqueVertices.length*11);c.uniqueVertices.forEach(function(v,i){var n=i*11;v.weights.forEach(function(w,j){c.skinData[n+j]=w[0];c.skinData[n+4+j]=w[1];});var wind=c.windWeights(v.x,v.y);c.skinData[n+8]=wind[0];c.skinData[n+9]=wind[1];c.skinData[n+10]=wind[2];});}
      c.alphaPrefix=null;return c;
    }
    function initialize(c){if(c.layers){c.layers.forEach(initialize);return;}if(c.gaitFrame!==undefined&&!c.profileWalk)return;if(!c.prepare)mesh(c);}configurations.forEach(initialize);root.appendChild(canvas);
    function ensurePainting(c,image){
      var cached=paintTextures[c.image];if(cached)return cached;
      cached=rig.textureUploads===0?tex:gl.createTexture();paintTextures[c.image]=cached;
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,cached);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);rig.textureUploads++;return cached;
    }
    function ensureNativeMask(c,image){
      if(!(c.clipPath||c.excludePaths||c.clipColor||c.componentSeed))return null;
        if(!c.nativeMaskTexture){
          var nativeMask=document.createElement('canvas');nativeMask.width=c.crop[2];nativeMask.height=c.crop[3];var maskContext=nativeMask.getContext('2d');maskContext.fillStyle='black';maskContext.fillRect(0,0,nativeMask.width,nativeMask.height);maskContext.translate(-c.crop[0],-c.crop[1]);
          function fillPath(path,color){maskContext.fillStyle=color;maskContext.beginPath();path.forEach(function(p,i){if(i)maskContext.lineTo(p[0],p[1]);else maskContext.moveTo(p[0],p[1]);});maskContext.closePath();maskContext.fill();}
          if(c.clipPath)fillPath(c.clipPath,'white');else{maskContext.fillStyle='white';maskContext.fillRect(c.crop[0],c.crop[1],nativeMask.width,nativeMask.height);}
          if(c.excludePaths)c.excludePaths.forEach(function(path){fillPath(path,'black');});
          if(c.clipColor){var sampling=document.createElement('canvas');sampling.width=nativeMask.width;sampling.height=nativeMask.height;var sampler=sampling.getContext('2d',{willReadFrequently:true});sampler.drawImage(image,c.crop[0],c.crop[1],c.crop[2],c.crop[3],0,0,sampling.width,sampling.height);var nativePixels=sampler.getImageData(0,0,sampling.width,sampling.height).data,maskPixels=maskContext.getImageData(0,0,nativeMask.width,nativeMask.height);for(var mi=0;mi<nativePixels.length;mi+=4){var py=c.crop[1]+Math.floor(mi/4/nativeMask.width),red=nativePixels[mi],green=nativePixels[mi+1],blue=nativePixels[mi+2],retain=c.clipColor==='coat'?py<310||red-blue>24:c.clipColor==='trousers'?py>630||red<150&&red-blue<45:c.clipColor==='skin-leg'?py>775||red>130&&green>75&&red-blue>24:c.clipColor==='body-coat'?py<270||red-green>18||green-blue>18:c.clipColor==='head-hair'?py<145||red<155&&red-green>9&&red-blue>20:true;if(!retain){maskPixels.data[mi]=maskPixels.data[mi+1]=maskPixels.data[mi+2]=0;}}maskContext.putImageData(maskPixels,0,0);sampling.width=sampling.height=0;}

          if(c.componentSeed){
            // A supplied isolated bind part is selected by its true-alpha
            // connected component, never by fabric/skin RGB or a highlight
            // cutoff. This also excludes neighboring limbs in the atlas.
            var sample=document.createElement('canvas');sample.width=nativeMask.width;sample.height=nativeMask.height;var sampleContext=sample.getContext('2d',{willReadFrequently:true});sampleContext.drawImage(image,c.crop[0],c.crop[1],c.crop[2],c.crop[3],0,0,sample.width,sample.height);var pixels=sampleContext.getImageData(0,0,sample.width,sample.height).data,w=sample.width,h=sample.height,visited=new Uint8Array(w*h),queue=new Int32Array(w*h),head=0,tail=0,seed=(Math.round(c.componentSeed[1])-c.crop[1])*w+Math.round(c.componentSeed[0])-c.crop[0];
            function visit(index){if(index>=0&&index<w*h&&!visited[index]&&pixels[index*4+3]>0){visited[index]=1;queue[tail++]=index;}}
            visit(seed);while(head<tail){var index=queue[head++],col=index%w;if(col)visit(index-1);if(col<w-1)visit(index+1);visit(index-w);visit(index+w);}
            var component=maskContext.createImageData(w,h);for(var ci=0;ci<visited.length;ci++){var n=ci*4;component.data[n]=component.data[n+1]=component.data[n+2]=visited[ci]?255:0;component.data[n+3]=255;}maskContext.putImageData(component,0,0);sample.width=sample.height=0;c.componentPixels=tail;
          }
          c.nativeMaskTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,c.nativeMaskTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,nativeMask);nativeMask.width=nativeMask.height=0;
        }
      return c.nativeMaskTexture;
    }
    var current=null,currentMesh=null,currentMask=null,paintTextures={},rig={root:root,type:type,textureUploads:0,draw:function(c,bones,keepCanvas){
      if(c.layers){function sourceReady(layer){return layer.layers?layer.layers.every(sourceReady):asset(layer.image).complete&&asset(layer.image).naturalWidth;}if(!c.layers.every(sourceReady))return false;var savedSurface=rig.layerSurface;rig.layerSurface=A.actorSurfaceLight?A.actorSurfaceLight(root,c,bones,type):null;if(!keepCanvas)gl.clear(gl.COLOR_BUFFER_BIT);var complete=true;c.layers.forEach(function(layer){if(c.walkTime!==undefined)layer.walkTime=c.walkTime;if(!rig.draw(layer,bones,true))complete=false;});rig.layerSurface=savedSurface;return complete;}
      var image=asset(c.image);if(!image.complete||!image.naturalWidth)return false;
      if(c.prepare&&!c.prepared){c.prepare(image);mesh(c);c.prepared=true;}
      // Keep each decoded native painting in this rig's own GL context.
      // Each walking part retains one fixed native material; other actions
      // reuse cached textures without uploading them every frame.
      gl.activeTexture(gl.TEXTURE0);
      tex=ensurePainting(c,image);current=image;
      gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.uniform1f(gl.getUniformLocation(program,'alphaCutoff'),c.alphaCutoff||0);
      gl.uniform2f(gl.getUniformLocation(program,'paintSize'),c.sheet[0],c.sheet[1]);
      gl.uniform2f(gl.getUniformLocation(program,'poseY'),rig.poseY?rig.poseY[0]:1,rig.poseY?rig.poseY[1]:0);
      gl.uniform1f(lightUniforms.contour,c.sourceCuts?1:0);
      var litConfig=c;if(c.gaitFrame!==undefined&&rig.gaitBlend&&c.night){var g=rig.gaitBlend;litConfig=Object.assign({},c,{lamp:g.first.lamp.map(function(p,i){return p+(g.next.lamp[i]-p)*g.u;})});}var surface=keepCanvas?rig.layerSurface:(A.actorSurfaceLight?A.actorSurfaceLight(root,litConfig,bones,type):null);
      gl.uniform4fv(lightUniforms.surface,surface?surface.light:[0,0,1,0]);
      gl.uniform3fv(lightUniforms.lamp,surface?surface.lamp:[0,0,0]);
      var handPlanes=c.handBounds&&A.gestureHands?A.gestureHands.cutPlanes(c,c.handMask||{}):null;
      gl.uniform1f(gl.getUniformLocation(program,'handMode'),handPlanes?1:0);
      ['cutLeft','cutRight'].forEach(function(name,i){var side=i?'right':'left',cut=handPlanes?(c.handMask&&c.handMask[side]?c.handBounds[i]:null):(c.cutouts&&c.cutouts[i]);gl.uniform4fv(gl.getUniformLocation(program,name),cut?[cut[0]/c.sheet[0],cut[1]/c.sheet[1],cut[2]/c.sheet[0],cut[3]/c.sheet[1]]:[0,0,0,0]);gl.uniform4fv(gl.getUniformLocation(program,i?'handPlaneRight':'handPlaneLeft'),handPlanes?handPlanes[side]:[0,0,0,0]);});
      if(A.bowDepth){var shade=A.bowDepth.shadingUniforms(rig.bowState,c,rig.poseY);gl.uniform4fv(bowUniforms.form,shade.form);gl.uniform4fv(bowUniforms.collar,shade.collar);gl.uniform4fv(bowUniforms.waist,shade.waist);gl.uniform1f(bowUniforms.face,A.bowDepth.faceToneUniform(c));}
      var masked=c.clipPath||c.excludePaths||c.clipColor||c.componentSeed;
      gl.uniform1f(maskUniforms.enabled,masked?1:0);
      if(masked){
        currentMask=ensureNativeMask(c,image);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,currentMask);
        gl.uniform4fv(maskUniforms.crop,c.crop);gl.activeTexture(gl.TEXTURE0);
      }
      // Normalized dual quaternions keep the native sleeve/skin width through
      // a bent elbow, without adding separate shoulder or elbow cover pieces.
      var dq=c.dual?(c.dualData||(c.dualData=new Float32Array(64))):null;
      if(dq)bones.forEach(function(m,i){var a=Math.atan2(m[1],m[0])/2,s=Math.sin(a),co=Math.cos(a),n=i*4,parent={2:1,4:3,6:5,7:6,9:8,10:9}[i]||0;if(i&&co*dq[parent*4]+s*dq[parent*4+1]<0){co=-co;s=-s;}dq[n]=co;dq[n+1]=s;dq[n+2]=(m[4]*co+m[5]*s)/2;dq[n+3]=(m[5]*co-m[4]*s)/2;});
      var stretch=dq&&rig.affine?(c.stretchData||(c.stretchData=new Float32Array(64))):null;
      if(stretch)bones.forEach(function(m,i){var n=i*4,co=dq[n]*dq[n]-dq[n+1]*dq[n+1],si=2*dq[n]*dq[n+1];stretch[n]=co*m[0]+si*m[1];stretch[n+1]=co*m[2]+si*m[3];stretch[n+2]=-si*m[0]+co*m[1];stretch[n+3]=-si*m[2]+co*m[3];});
      // Adjacent triangles share vertices. Transform each shared point once,
      // then copy the same Float32 coordinates without changing the mesh or UVs.
      var drawFrame=++c.frame;
      if(!c.profileWalk)for(var i=0;i<c.vertices.length;i++){
        var v=c.vertices[i],x=0,y=0,qc=0,qs=0,qx=0,qy=0,sx=0,sxy=0,syx=0,sy=0;
        if(v.drawFrame===drawFrame){c.data[i*4]=c.data[v.dataOffset];c.data[i*4+1]=c.data[v.dataOffset+1];continue;}
        v.drawFrame=drawFrame;
        if(v.weights.length===1){var only=bones[v.weights[0][0]],offset=i*4,warp=c.gaitWarp,w=warp?v.drawIndex*2:0,vx=v.x+(warp?warp[w]:0),vy=v.y+(warp?warp[w+1]:0);c.data[offset]=only[0]*vx+only[2]*vy+only[4];c.data[offset+1]=only[1]*vx+only[3]*vy+only[5];if(rig.bowState&&rig.bowState.mix>0&&A.bowDepth){var bowPoint=A.bowDepth.projectVertex(rig.bowState,v.x,v.y,c.data[offset],c.data[offset+1],v.weights,rig._bowPoint||(rig._bowPoint=[0,0]));c.data[offset]=bowPoint[0];c.data[offset+1]=bowPoint[1];}continue;}
        for(var j=0;j<v.weights.length;j++){
          var w=v.weights[j],m=bones[w[0]];
          if(dq&&!v.linear){var d=w[0]*4;qc+=dq[d]*w[1];qs+=dq[d+1]*w[1];qx+=dq[d+2]*w[1];qy+=dq[d+3]*w[1];if(stretch){sx+=stretch[d]*w[1];sxy+=stretch[d+1]*w[1];syx+=stretch[d+2]*w[1];sy+=stretch[d+3]*w[1];}}
          else{x+=(m[0]*v.x+m[2]*v.y+m[4])*w[1];y+=(m[1]*v.x+m[3]*v.y+m[5])*w[1];}
        }
        if(dq&&!v.linear){var scale=1/Math.hypot(qc,qs);qc*=scale;qs*=scale;qx*=scale;qy*=scale;var co=qc*qc-qs*qs,si=2*qc*qs,px=stretch?sx*v.x+sxy*v.y:v.x,py=stretch?syx*v.x+sy*v.y:v.y;x=co*px-si*py+2*(qx*qc-qy*qs);y=si*px+co*py+2*(qx*qs+qy*qc);}
        if(rig.bowState&&rig.bowState.mix>0&&A.bowDepth){var bowPoint=A.bowDepth.projectVertex(rig.bowState,v.x,v.y,x,y,v.weights,rig._bowPoint||(rig._bowPoint=[0,0]));x=bowPoint[0];y=bowPoint[1];}var n=i*4;c.data[n]=x;c.data[n+1]=y;
      }
      gl.uniform1f(skinUniforms.enabled,c.profileWalk?1:0);
      if(c.profileWalk){gl.uniform4fv(skinUniforms.dual,dq.subarray(0,48));gl.uniform2f(skinUniforms.wind,c.walkTime||0,c.night?1:0);if(!c.skinBuffer){c.skinBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,c.skinBuffer);gl.bufferData(gl.ARRAY_BUFFER,c.skinData,gl.STATIC_DRAW);}else gl.bindBuffer(gl.ARRAY_BUFFER,c.skinBuffer);[skinAttributes.ids,skinAttributes.weights,skinAttributes.wind].forEach(function(a){gl.enableVertexAttribArray(a);});gl.vertexAttribPointer(skinAttributes.ids,4,gl.FLOAT,false,44,0);gl.vertexAttribPointer(skinAttributes.weights,4,gl.FLOAT,false,44,16);gl.vertexAttribPointer(skinAttributes.wind,3,gl.FLOAT,false,44,32);}
      else{[skinAttributes.ids,skinAttributes.weights,skinAttributes.wind].forEach(function(a){gl.disableVertexAttribArray(a);});}
      if(!keepCanvas)gl.clear(gl.COLOR_BUFFER_BIT);if(c.profileWalk){if(!c.positionBuffer){c.positionBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,c.positionBuffer);gl.bufferData(gl.ARRAY_BUFFER,c.drawData,gl.STATIC_DRAW);}else gl.bindBuffer(gl.ARRAY_BUFFER,c.positionBuffer);}else gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.vertexAttribPointer(position,2,gl.FLOAT,false,16,0);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,16,8);
      if(c.indices){
        if(!c.profileWalk)for(var i=0;i<c.uniqueVertices.length;i++){var v=c.uniqueVertices[i],n=i*4;c.drawData[n]=c.data[v.dataOffset];c.drawData[n+1]=c.data[v.dataOffset+1];}
        if(c.profileWalk){if(!c.indexBuffer){c.indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,c.indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,c.indices,gl.STATIC_DRAW);}else gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,c.indexBuffer);}else{gl.bufferData(gl.ARRAY_BUFFER,c.drawData,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);if(currentMesh!==c){gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,c.indices,gl.STATIC_DRAW);currentMesh=c;}}
        gl.drawElements(gl.TRIANGLES,c.indices.length,gl.UNSIGNED_SHORT,0);
      }else{gl.bufferData(gl.ARRAY_BUFFER,c.data,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,c.vertices.length);}
      if(!rig.ready){rig.ready=true;}
      if(c.nativeArms)root.classList.add('has-native-arms');
      root.classList.add('has-motion-rig');return true;
    },configs:configurations,times:{}};
    root._paintRig=rig;rigs.push(rig);
    if(type==='human'){
      var warming=[],warmScheduled=false,warmTotal=0,warmDone=0;
      rig.cacheWarm={total:0,complete:0,tasks:[],errors:[]};
      function enqueue(layer){
        var image=asset(layer.image);warmTotal++;rig.cacheWarm.total=warmTotal;
        var decoded=image._hjMotionDecode||new Promise(function(resolve,reject){if(image.complete&&image.naturalWidth)resolve();else{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',reject,{once:true});}});
        Promise.resolve(decoded).then(function(){warming.push(layer);scheduleWarm();}).catch(function(){rig.cacheWarm.errors.push(layer.image);});
      }
      function scheduleWarm(){if(warmScheduled||!warming.length)return;warmScheduled=true;if(window.requestIdleCallback)window.requestIdleCallback(warmOne,{timeout:150});else setTimeout(warmOne,25);}
      function warmOne(){
        warmScheduled=false;var layer=warming.shift();if(!layer)return;var started=performance.now(),image=asset(layer.image),uploads=rig.textureUploads;
        try{
          // Preparation never clears/draws the actor or changes its pose/class.
          // Preserve the textures used by the currently visible rendering.
          ensurePainting(layer,image);ensureNativeMask(layer,image);layer.cachePrepared=true;warmDone++;rig.cacheWarm.complete=warmDone;
          rig.cacheWarm.tasks.push({image:layer.image,duration:performance.now()-started,uploads:rig.textureUploads-uploads});
        }catch(error){rig.cacheWarm.errors.push(layer.image+': '+error.message);}
        finally{gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,currentMask);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);}
        scheduleWarm();
      }
      var dark=document.documentElement.dataset.theme==='dark';configurations.filter(function(c){return c.profileWalk&&c.layers;}).sort(function(a,b){return(a.night===dark?0:1)-(b.night===dark?0:1);}).forEach(function(c){c.layers.forEach(enqueue);});
    }
    return rig;
  }
  function human(root){
    function outfit(night){
      // A single complete A-pose painting supplies all of the moving material.
      // The bind arms are clear of the hair, belt and coat; their actual native
      // silhouettes define the mesh rather than independent pasted arm pieces.
      var ky=night?184/1507:184/1484,kx=night?ky:84/669;
      var ox=night?60-500*kx:24-186*kx,oy=night?8-13*ky:8-27*ky;
      function pt(p){return [ox+p[0]*kx,oy+p[1]*ky];}
      function smooth(a,b,n){var f=clamp((n-a)/(b-a),0,1);return f*f*(3-2*f);}
      function boundary(points,y){
        if(y<=points[0][1])return points[0][0];
        for(var i=1;i<points.length;i++)if(y<=points[i][1]){var a=points[i-1],b=points[i],f=(y-a[1])/(b[1]-a[1]);return a[0]+(b[0]-a[0])*f;}
        return points[points.length-1][0];
      }
      var sources=night?{
        sl:[376,312],el:[302,523],wl:[198,700],handL:[182,757],sr:[625,312],er:[699,523],wr:[801,700],handR:[819,757],
        hl:[451,795],kl:[465,1130],al:[464,1432],hr:[566,795],kr:[555,1130],ar:[558,1432],
        innerL:[[374,305],[380,320],[385,345],[386,360],[385,375],[384,390],[380,405],[376,415],[374,425]],
        innerR:[[623,305],[615,320],[614,345],[614,360],[615,375],[616,390],[620,405],[624,415],[626,425]],
        hands:[[145,660,245,840],[750,660,880,840]],crop:[145,1,705,1529]
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
        if(night){
          var shoulder=left?sources.sl:sources.sr,upper=left?sources.el:sources.er,ux=upper[0]-shoulder[0],uy=upper[1]-shoulder[1];
          amount=smooth(-8,35,((x-shoulder[0])*ux+(y-shoulder[1])*uy)/Math.hypot(ux,uy));
        }else if(y<470){
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
        if(night&&sy>=305&&sy<=415){
          var side=sx<510,skinEdge=boundary(side?sources.innerL:sources.innerR,sy);
          if(side?sx<skinEdge:sx>skinEdge){var skin=arm(sx,sy,side);if(skin)return skin;}
        }
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
            var share=cloth?(1-smooth(0,width,distance))*smooth(night?305:315,night?320:355,sy)*(1-smooth(night?395:380,night?425:430,sy)):0;
            if(night&&share>0){var shoulder=left?sources.sl:sources.sr,elbow=left?sources.el:sources.er,dx=elbow[0]-shoulder[0],dy=elbow[1]-shoulder[1];share*=smooth(-8,35,((sx-shoulder[0])*dx+(sy-shoulder[1])*dy)/Math.hypot(dx,dy));}
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
      return {image:night?'hanjing-night-closed-native':'hanjing-day-armed',sheet:[1024,1536],crop:crop,box:[ox+crop[0]*kx,oy+crop[1]*ky,crop[2]*kx,crop[3]*ky],sourceTransform:[ox,oy,kx,ky],prepare:prepareNativeArms,splitY:night?320:315,gapColumns:[[22,24],[60,62]],weightsByDomain:function(x,y,domain){
        if(domain==='left'||domain==='right'){var aw=arm((x-ox)/kx,(y-oy)/ky,domain==='left');if(aw)return aw;}
        return bodyWeights(x,y);
      },weights:bodyWeights,alphaCutoff:.25,dual:true,nativeArms:true,night:night,pivots:pivots,rest:rest,handBounds:sources.hands,gestureHandScale:night?.14:.18};
    }
    var configs=[outfit(false),outfit(true),nativeView(false,false),nativeView(true,false),nativeView(false,true),nativeView(true,true)];
    [false,true].forEach(function(night){for(var phase=0;phase<8;phase++)configs.push(nativeWalkFrame(night,phase));});
    configs.push(nativeHold(false),nativeHold(true));
    for(var gesturePhase=0;gesturePhase<8;gesturePhase++)configs.push(nativeWaveFrame(gesturePhase));
    ['point','toss'].forEach(function(action){for(var phase=0;phase<5;phase++)configs.push(nativeGestureFrame(action,phase));});
    for(var returnPhase=0;returnPhase<4;returnPhase++)configs.push(nativeShelfReturnFrame(returnPhase));
    function preload(c){if(c.layers)c.layers.forEach(preload);else if(c.gaitFrame===undefined||c.profileWalk)asset(c.image);}configs.forEach(preload);
    var rig=renderer(root,'human',configs);
    if(rig){
      var nightFace=root.querySelector('.painted-face-rig > .o-night'),ratio=(184/1507)/(62/345),yRatio=(184/1507)/(184/1494);
      if(nightFace)nightFace.setAttribute('transform','matrix('+ratio+' 0 0 '+yRatio+' '+((60-500*184/1507)-(29-334*62/345)*ratio)+' '+((8-13*184/1507)-(8-10*184/1494)*yRatio)+')');
      root.classList.add('has-native-human-views');
      prepareNativeProps(root);
      root._gaitWarmState={complete:0,total:0};
    }
    return rig;
  }
  // Side and rear views are complete native paintings. No horizontal scale
  // can turn the front painting into a profile; each view has its own joints.
  function nativeView(night,shelf){
    var crop=shelf?(night?[1028,13,400,998]:[165,10,495,1001]):(night?[865,8,228,1116]:[289,5,390,1121]);
    var sheet=shelf?[1536,1024]:[1374,1145],k=184/crop[3],center=shelf?(night?1190:405):(night?979:540),ox=60-center*k,oy=8-crop[1]*k;
    function pt(a){return [ox+a[0]*k,oy+a[1]*k];}
    function smooth(a,b,n){var f=clamp((n-a)/(b-a),0,1);return f*f*(3-2*f);}
    var source=shelf?(night?{
      sl:[1079,232],el:[1074,358],wl:[1057,475],handL:[1050,515],sr:[1210,168],er:[1315,224],wr:[1383,137],handR:[1401,92],hl:[1155,530],kl:[1116,749],al:[1115,945],hr:[1230,530],kr:[1228,749],ar:[1221,947]
    }:{
      sl:[285,236],el:[249,342],wl:[226,456],handL:[221,510],sr:[429,166],er:[521,217],wr:[604,139],handR:[630,93],hl:[346,539],kl:[309,760],al:[289,954],hr:[423,539],kr:[426,760],ar:[425,954]
    }):(night?{
      sl:[944,227],el:[952,432],wl:[1008,580],handL:[1025,621],sr:[944,227],er:[954,426],wr:[1010,580],handR:[1029,621],hl:[960,579],kl:[954,845],al:[958,1063],hr:[1005,579],kr:[1011,845],ar:[1019,1063]
    }:{
      sl:[455,231],el:[480,443],wl:[523,577],handL:[536,620],sr:[455,231],er:[480,443],wr:[523,577],handR:[539,620],hl:[509,575],kl:[497,842],al:[492,1074],hr:[563,575],kr:[567,842],ar:[578,1074]
    });
    var p={mount:[0,0]};Object.keys(source).forEach(function(key){p[key]=pt(source[key]);});p.letter=p.handR;
    var armPixels=null,armOutline=shelf?(night?[[1168,138],[1238,138],[1298,176],[1306,176],[1344,122],[1374,82],[1394,52],[1444,48],[1444,127],[1414,144],[1380,216],[1356,256],[1316,264],[1240,245],[1202,230],[1171,208],[1164,166]]:[[396,135],[460,138],[510,175],[542,178],[576,127],[595,69],[627,50],[672,54],[680,124],[645,173],[611,209],[566,258],[526,271],[459,254],[424,238],[403,207],[394,169]]):null;
    function prepareArmSkin(image){
      var sampling=document.createElement('canvas');sampling.width=1536;sampling.height=1024;
      var context=sampling.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
      armPixels=context.getImageData(0,0,1536,1024).data;sampling.width=sampling.height=0;
    }
    function nativeSkin(sx,sy){
      if(!armPixels)return true;
      function skin(x,y){var i=(Math.round(clamp(y,0,1023))*1536+Math.round(clamp(x,0,1535)))*4,r=armPixels[i],g=armPixels[i+1],b=armPixels[i+2];return armPixels[i+3]>64&&r>140&&g>90&&b>60&&r-b>20;}
      // Include the original fine skin outline without admitting a broad
      // piece of the black dress into the rotating upper-arm domain.
      return skin(sx,sy)||skin(sx-1.5,sy)||skin(sx+1.5,sy)||skin(sx,sy-1.5)||skin(sx,sy+1.5);
    }
    function weights(x,y){
      if(!shelf)return [[0,1]];
      var sx=(x-ox)/k,sy=(y-oy)/k;
      if(within(armOutline,sx,sy)){
        if(night&&!nativeSkin(sx,sy))return [[0,1]];
        var upper=source.sr,e=source.er,w=source.wr,ux=e[0]-upper[0],uy=e[1]-upper[1],ul=Math.hypot(ux,uy);
        // In this raised rear pose, the hand is above the shoulder. Its
        // attachment follows distance along the arm, never vertical image y.
        var shoulder=smooth(-8,35,((sx-upper[0])*ux+(sy-upper[1])*uy)/ul),dx=w[0]-e[0],dy=w[1]-e[1];
        if(night)shoulder=1;
        if(night&&sy>=154&&sy<=244){
          // The measured medial skin contour joins the silk armhole. Opaque
          // cloth below that curved border stays on the chest; the complete
          // upper arm, forearm and fingertips remain within the arm domain.
          var edge=[[154,1192],[165,1182],[181,1180],[198,1185],[211,1193],[225,1211],[230,1266],[235,1285],[240,1306],[244,1322]],medial=edge[edge.length-1][1];
          for(var q=1;q<edge.length;q++)if(sy<=edge[q][0]){var ea=edge[q-1],ez=edge[q],f=(sy-ea[0])/(ez[0]-ea[0]);medial=ea[1]+(ez[1]-ea[1])*f;break;}
          // Only the narrow native shirt seam attaches to the torso. Keeping
          // half of the deltoid fixed while rotating the other half ninety
          // degrees stretched its original skin into a broad striped fan.
          shoulder=smooth(-1,5,sx-medial);
        }
        if(night&&sx<1280&&sy<154)shoulder*=smooth(148,154,sy);
        var fore=smooth(-18,25,((sx-e[0])*dx+(sy-e[1])*dy)/Math.hypot(dx,dy));
        return [[0,1-shoulder],[3,shoulder*(1-fore)],[4,shoulder*fore]].filter(function(a){return a[1]>.0001;});
      }
      return [[0,1]];
    }
    return {image:shelf?'hanjing-shelf-native':'hanjing-profile-turn-native',sheet:sheet,crop:crop,box:[ox+crop[0]*k,8,crop[2]*k,184],step:shelf?.8:4,weights:weights,prepare:shelf&&night?prepareArmSkin:null,dual:shelf,armForeground:shelf,nativeView:shelf?'shelf':'profile',night:night,pivots:p,rest:[0,0,0,0],sourceTransform:[ox,oy,k,k],alphaCutoff:.35};
  }
  var nightWavePhases=[{"sheet":"a","crop":[96,7,343,919],"center":286.76,"soles":[[264.72,925],[322.12,925]]},{"sheet":"a","crop":[450,7,335,919],"center":646.17,"soles":[[623.73,925],[680.12,925]]},{"sheet":"a","crop":[810,7,328,919],"center":1003.75,"soles":[[981.36,925],[1038.62,925]]},{"sheet":"a","crop":[1180,7,400,919],"center":1379.58,"soles":[[1355.9,925],[1412.79,925]]},{"sheet":"b","crop":[95,7,392,918],"center":286.94,"soles":[[265.54,924],[321.77,924]],"cutouts":[[430,290,500,941]]},{"sheet":"b","crop":[444,7,369,918],"center":645.28,"soles":[[623.39,924],[679.77,924]],"cutouts":[[440,0,505,295]]},{"sheet":"b","crop":[825,7,330,918],"center":1020.65,"soles":[[997.39,924],[1054.1,924]]},{"sheet":"b","crop":[1208,7,344,918],"center":1403.15,"soles":[[1379.11,924],[1435.75,924]]}];
  function nativeWaveFrame(phase){
    var part=nightWavePhases[phase],crop=part.crop,k=184/crop[3],ox=60-part.center*k,oy=8-crop[1]*k;
    // The complete gesture carries the same lantern and bronze loop as
    // the front pose. Its fixed grip never drifts with the waving arm.
    return {image:'hanjing-wave-night-phases-'+part.sheet,sheet:[1672,941],crop:crop,box:[ox+crop[0]*k,8,crop[2]*k,184],step:4,weights:function(){return [[0,1]];},nativeView:'wave',waveFrame:phase,night:true,pivots:{mount:[0,0],handL:[45.18,104.57]},lamp:[45.18,120.57],footContacts:part.soles.map(function(p){return {x:ox+p[0]*k,y:oy+p[1]*k,stance:true,lift:0};}),cutouts:part.cutouts||null,alphaCutoff:.45};
  }
  var nightGesturePhases={"point":{"image":"hanjing-night-point-phases-native","sheet":[2172,724],"frames":[{"crop":[135,15,227,703],"headCenter":255.5,"headCrown":18,"soleY":714,"soles":[[223.63,714],[272.57,714]]},{"crop":[559,14,330,704],"headCenter":682.0,"headCrown":17,"soleY":714,"soles":[[649.9,714],[699.0,714]]},{"crop":[966,15,408,703],"headCenter":1088.0,"headCrown":18,"soleY":714,"soles":[[1056.45,714],[1105.1,714]]},{"crop":[1418,15,337,703],"headCenter":1540.5,"headCrown":18,"soleY":714,"soles":[[1508.63,714],[1557.77,714]]},{"crop":[1810,15,228,703],"headCenter":1930.5,"headCrown":18,"soleY":714,"soles":[[1898.63,714],[1947.49,714]]}]},"toss":{"image":"hanjing-night-toss-phases-native","sheet":[2172,724],"frames":[{"crop":[112,23,229,693],"headCenter":234.0,"headCrown":26,"soleY":712,"soles":[[202.93,712],[249.1,712]]},{"crop":[496,23,319,693],"headCenter":661.0,"headCrown":26,"soleY":712,"soles":[[632.65,712],[678.0,712]]},{"crop":[868,11,437,705],"headCenter":1092.0,"headCrown":27,"soleY":712,"soles":[[1063.89,711],[1109.76,712]]},{"crop":[1361,24,322,692],"headCenter":1526.5,"headCrown":27,"soleY":712,"soles":[[1498.38,711],[1543.32,712]]},{"crop":[1832,23,229,693],"headCenter":1952.5,"headCrown":26,"soleY":712,"soles":[[1922.76,712],[1969.18,712]]}]}};
  function nativeGestureFrame(action,phase){
    var source=nightGesturePhases[action],part=source.frames[phase],crop=part.crop,k=184/(part.soleY-part.headCrown),ox=60-part.headCenter*k,oy=8-part.headCrown*k;
    var hand=action==='point'?[60-104.5*k,oy+383*k]:null;
    return {image:source.image,sheet:source.sheet,crop:crop,box:[ox+crop[0]*k,oy+crop[1]*k,crop[2]*k,crop[3]*k],step:4,weights:function(){return [[0,1]];},nativeView:'gesture',gestureAction:action,gestureFrame:phase,night:true,pivots:hand?{mount:[0,0],handL:hand}:{mount:[0,0]},lamp:hand?[hand[0],hand[1]+16]:null,footContacts:part.soles.map(function(p){return {x:ox+p[0]*k,y:oy+p[1]*k,stance:true,lift:0};}),alphaCutoff:.45};
  }
  var nightShelfReturnPhases=[{"phase":1,"crop":[536,6,280,775],"headCrown":12,"soleY":777,"bodyCenterRegistration":671,"bookCenter":[792,96],"handGrip":[791,109],"soles":[[608,772],[682,776]]},{"phase":2,"crop":[900,4,237,777],"headCrown":9,"soleY":777,"bodyCenterRegistration":1026,"bookCenter":[1105,168],"handGrip":[1110,190],"soles":[[964,773],[1042,776]]},{"phase":3,"crop":[1286,4,261,777],"headCrown":9,"soleY":777,"bodyCenterRegistration":1408.5,"bookCenter":[1497,186],"handGrip":[1490,218],"soles":[[1350,773],[1429,776]]},{"phase":4,"crop":[1679,5,237,779],"headCrown":11,"soleY":779,"bodyCenterRegistration":1792,"bookCenter":[1863,214],"handGrip":[1840,243],"soles":[[1754,777],[1848,778]]}];
  function nativeShelfReturnFrame(phase){
    var part=nightShelfReturnPhases[phase],crop=part.crop,k=184/(part.soleY-part.headCrown),ox=60-part.bodyCenterRegistration*k,oy=8-part.headCrown*k;
    function pt(a){return [ox+a[0]*k,oy+a[1]*k];}
    // Each withdrawal frame contains the complete painted shoulder, arms,
    // hands and the same book. None of its skin is reweighted or stretched.
    return {image:'hanjing-night-shelf-return-native',sheet:[1983,793],crop:crop,box:[ox+crop[0]*k,oy+crop[1]*k,crop[2]*k,crop[3]*k],step:4,weights:function(){return [[0,1]];},nativeView:'shelf',shelfReturnFrame:phase,shelfSourcePhase:part.phase,night:true,pivots:{mount:[0,0]},heldBookCenter:pt(part.bookCenter),heldBookGrip:pt(part.handGrip),footContacts:part.soles.map(function(p){return {x:ox+p[0]*k,y:oy+p[1]*k,stance:true,lift:0};}),alphaCutoff:.45};
  }
  function nativeHold(night){
    var crop=night?[917,16,280,996]:[360,13,419,992],center=night?1062:596,k=184/crop[3],ox=60-center*k,oy=8-crop[1]*k;
    var soles=night?[[48.0184,190.3373],[71.9434,191.8153]]:[[41.1158,190.3306],[72.7898,191.8145]];
    return {image:'hanjing-hold-native',sheet:[1536,1024],crop:crop,box:[ox+crop[0]*k,8,crop[2]*k,184],step:4,weights:function(){return [[0,1]];},nativeView:'hold',night:night,pivots:{mount:[0,0]},footContacts:soles.map(function(p){return {x:p[0],y:p[1],stance:true,lift:0};}),heldBookCenter:night?[70.6225,63.8835]:[71.3145,65.1290],alphaCutoff:.35};
  }
  var walkSheets={"day-a":{"sheet":[2079,756],"frames":[{"crop":[29,13,521,706],"nose":364},{"crop":[568,12,392,704],"nose":861},{"crop":[1066,13,329,704],"nose":1344},{"crop":[1541,12,520,707],"nose":1856}]},"day-b":{"sheet":[2054,766],"frames":[{"crop":[48,11,550,738],"nose":402},{"crop":[567,10,417,740],"nose":867},{"crop":[1029,10,447,739],"nose":1358},{"crop":[1526,9,500,742],"nose":1852}]},"night-a":{"sheet":[1844,853],"frames":[{"crop":[61,1,385,833],"nose":301},{"crop":[518,2,337,831],"nose":775},{"crop":[948,2,340,830],"nose":1216},{"crop":[1485,2,348,830],"nose":1649}]},"night-b":{"sheet":[1852,849],"frames":[{"crop":[67,14,405,809],"nose":322},{"crop":[551,14,327,811],"nose":772},{"crop":[1031,14,299,811],"nose":1237},{"crop":[1431,13,402,806],"nose":1663}]}};
  var walkSoles={"day-a":[[[194.9,713],[436.77,718]],[[715.21,706],[913.42,715]],[[1240.25,671],[1336.09,716]],[[1758.75,718],[1961,676]]],"day-b":[[[215.32,748],[490.93,743]],[[719.5,712],[933.63,749]],[[1146.9,674],[1380.21,748]],[[1784.6,748],[1917,689]]],"night-a":[[[155.42,822],[396.68,833]],[[582.67,801],[763.81,832]],[[1022.68,766],[1201.32,831]],[[1629.19,831],[1719.7,782]]],"night-b":[[[153.33,818],[368,822]],[[626,799],[785.1,824]],[[1103.67,783],[1233.18,824]],[[1543.7,812],[1734.7,804]]],"day-return":[null,null,null,[[1764,730],[1968.9,687]]],"night-return":[null,null,null,[[1630.5,828],[1723.8,781]]]};
  function nativeWalkFrame(night,phase){
    var key=(night?'night':'day')+(phase<4?'-a':'-b'),source=walkSheets[key],part=source.frames[phase%4],image='hanjing-walk-'+(night?'night':'day')+'-motion'+(phase<4?'-a':'-b');if(phase===7){key=(night?'night':'day')+'-return';source={sheet:night?[1844,853]:[2079,756]};part=night?{crop:[1460,7,371,824],nose:1644}:{crop:[1544,13,521,720],nose:1859};image=night?'hanjing-walk-night-empty-a':'hanjing-walk-day-a';}var crop=part.crop,k=184/crop[3],ox=69-part.nose*k,oy=8-crop[1]*k;
    var soles=walkSoles[key][phase%4],support=phase%4===0?(soles[0][1]>soles[1][1]?0:1):phase%4===3?0:1;
    var feet=soles.map(function(p,i){var y=oy+p[1]*k;return {x:ox+p[0]*k,y:y,stance:i===support,lift:Math.max(0,192-y)};});
    // Each phase is a complete native drawing of the clothing and anatomy.
    // Never skin a shared painted shoe or silk skirt with two opposing knees.
    var config=gaitControls({image:image,sheet:source.sheet,crop:crop,box:[ox+crop[0]*k,8,crop[2]*k,184],step:4,weights:function(){return [[0,1]];},nativeView:'profile',gaitFrame:phase,footContacts:feet,night:night,pivots:{mount:[0,0]},lamp:part.lamp?[ox+part.lamp[0]*k,oy+part.lamp[1]*k]:null,cutouts:!night&&key==='day-b'?(phase===4?[[557,0,620,666]]:phase===5?[[565,675,628,766]]:null):null,alphaCutoff:.45},key,phase%4,k,ox,oy);
    return phase===0?profileWalkConfig(config):config;
  }
  // Walking uses one fixed side-view painting per outfit. Its complete
  // material is skinned continuously on the GPU; no second pose, opacity
  // crossfade, or atlas transition participates in a walking frame.
  var walkHands={"day-a":[[[185,394],[430,357]],[[776,408],[921,357]],[[1370,385],[1190,380]],[[1920,360],[1693,384]]],"day-b":[[[423,402],[214,387]],[[840,418],[711,399]],[[1178,400],[1442,374]],[[1890,392],[1681,391]]],"night-a":[[[157,450],[388,419]],[[715,458],[833,425]],[[1247,435],[1088,429]],[[1700,430],[1516,440]]],"night-b":[[[369,425],[165,441]],[[704,450],[859,432]],[[1110,445],[1304,436]],[[1700,429],[1511,438]]],"day-return":[null,null,null,[[1689,409],[1942,350]]],"night-return":[null,null,null,[[1525,445],[1720,438]]]};
  function gaitControls(c,key,part,k,ox,oy){
    function pt(p){return[ox+p[0]*k,oy+p[1]*k];}
    var hands=walkHands[key][part],feet=c.footContacts.map(function(f){return[f.x,f.y];});
    var points=[[59,15],[69,24],[60,36],[55,44],[67,44],[49,77],[68,77],[59,99],[69,101]];
    hands.forEach(function(h,i){var hand=pt(h),shoulder=points[3+i];points.push([(shoulder[0]+hand[0])*.5,shoulder[1]+23],hand);});
    feet.forEach(function(f){points.push([(61+f[0])*.5,134+(f[1]-190)*.18],[f[0],f[1]-7],f,[f[0]-5,f[1]-2],[f[0]+6,f[1]-2]);});
    c.gaitControls=points;c.nearGrip=pt(hands[0]);
    if(c.night)c.lamp=[c.nearGrip[0],c.nearGrip[1]+16];
    return c;
  }
  function profileWalkConfig(c){
    var crop=c.crop,k=184/crop[3],ox=c.box[0]-crop[0]*k,oy=8-crop[1]*k,night=c.night;
    function pt(p){return[ox+p[0]*k,oy+p[1]*k];}
    function soft(a,b,z){var u=clamp((z-a)/(b-a),0,1);return u*u*(3-2*u);}
    function applied(m,p){return[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];}
    function similarity(from,to,a,b,scale,mirror){
      var dx=to[0]-from[0],dy=to[1]-from[1];if(mirror)dx=-dx;
      var angle=Math.atan2(b[1]-a[1],b[0]-a[0])-Math.atan2(dy,dx),co=Math.cos(angle),si=Math.sin(angle),sign=mirror?-1:1;
      var m=[scale*co*sign,scale*si*sign,-scale*si,scale*co,0,0];m[4]=a[0]-m[0]*from[0]-m[2]*from[1];m[5]=a[1]-m[1]*from[0]-m[3]*from[1];return m;
    }
    var source=night?{
      nearArm:[[205,150],[183,166],[164,231],[140,310],[135,389],[125,436],[129,456],[156,468],[172,449],[178,385],[194,308],[221,230],[231,173]],
      sl:[206,169],el:[168,301],wl:[148,416],sr:[222,180],er:[333,354],wr:[365,378],
      hl:[264,433],kl:[310,610],al:[337,770],hr:[246,433],kr:[192,626],ar:[112,763],
      soles:[[155.42,822],[396.68,833]]
    }:{
      nearArm:[[282,133],[264,141],[249,160],[224,211],[192,279],[170,326],[159,374],[148,401],[174,423],[201,399],[223,352],[252,291],[276,232],[301,174],[302,151]],
      sl:[281,161],el:[233,282],wl:[190,370],sr:[331,174],er:[369,308],wr:[413,334],
      hl:[322,344],kl:[380,507],al:[433,663],hr:[285,344],kr:[236,518],ar:[156,661],
      soles:[[194.9,713],[436.77,718]]
    };
    var p={};['sl','el','wl','sr','er','wr','hl','kl','al','hr','kr','ar'].forEach(function(name){p[name]=pt(source[name]);});
    p.mount=[60,0];c.pivots=p;c.rest={};c.profileWalk=true;c.dual=true;c.step=2;c.cutouts=null;c.nearGrip=pt(walkHands[night?'night-a':'day-a'][0][0]);
    c.profileSoles=source.soles.map(pt);c.profileSource=source;c.weights=function(){return[[0,1]];};
    function fixed(){return[[0,1]];}
    function piece(path,weights){var l=Math.max(crop[0],Math.floor(Math.min.apply(null,path.map(function(a){return a[0];}))-2)),top=Math.max(crop[1],Math.floor(Math.min.apply(null,path.map(function(a){return a[1];}))-2)),right=Math.min(crop[0]+crop[2],Math.ceil(Math.max.apply(null,path.map(function(a){return a[0];}))+2)),bottom=Math.min(crop[1]+crop[3],Math.ceil(Math.max.apply(null,path.map(function(a){return a[1];}))+2));return{image:c.image,sheet:c.sheet,crop:[l,top,right-l,bottom-top],box:[ox+l*k,oy+top*k,(right-l)*k,(bottom-top)*k],clipPath:path,weights:weights,profileWalk:true,gaitFrame:0,night:night,dual:true,step:1.8,windWeights:function(){return[0,0,0];}};}
    function nativePart(image,sheet,partCrop,m,weights){
      var corners=[[partCrop[0],partCrop[1]],[partCrop[0]+partCrop[2],partCrop[1]],[partCrop[0],partCrop[1]+partCrop[3]],[partCrop[0]+partCrop[2],partCrop[1]+partCrop[3]]].map(function(v){return applied(m,v);}),xs=corners.map(function(v){return v[0];}),ys=corners.map(function(v){return v[1];}),left=Math.min.apply(null,xs),top=Math.min.apply(null,ys);
      return{image:image,sheet:sheet,crop:partCrop,box:[left,top,Math.max.apply(null,xs)-left,Math.max.apply(null,ys)-top],sourceAffine:m,weights:weights,profileWalk:true,gaitFrame:0,night:night,dual:true,step:1.8,windWeights:function(){return[0,0,0];}};
    }
    function along(a,b,x,y){var dx=b[0]-a[0],dy=b[1]-a[1];return((x-a[0])*dx+(y-a[1])*dy)/Math.hypot(dx,dy);}
    function armWeight(near){return function(x,y){var shoulder=p[near?'sl':'sr'],elbow=p[near?'el':'er'],wrist=p[near?'wl':'wr'],top=near?1:3,fore=soft(-4,4,along(elbow,wrist,x,y));return[[top,1-fore],[top+1,fore]].filter(function(w){return w[1]>.00001;});};}
    function completeLeg(near){
      var originalHip=p[near?'hl':'hr'],originalKnee=p[near?'kl':'kr'],originalAnkle=p[near?'al':'ar'],oldSole=c.profileSoles[near?1:0].slice(),a,b,d,bounds;
      if(!night){a=near?[166,140]:[638,140];b=near?[300,485]:[559,488];d=near?[154,938]:[770,938];bounds=near?[63,18,328,952]:[491,14,403,959];}
      else{a=near?[935,140]:[1408,140];b=near?[1062,489]:[1262,495];d=near?[1145,950]:[1442,946];bounds=near?[829,19,373,964]:[1204,22,298,956];}
      var length=Math.hypot(originalKnee[0]-originalHip[0],originalKnee[1]-originalHip[1])+Math.hypot(originalAnkle[0]-originalKnee[0],originalAnkle[1]-originalKnee[1]),nativeLength=Math.hypot(b[0]-a[0],b[1]-a[1])+Math.hypot(d[0]-b[0],d[1]-b[1]),m=similarity(a,d,originalHip,originalAnkle,length/nativeLength,!near),newKnee=applied(m,b),newAnkle=applied(m,d),delta=[newAnkle[0]-originalAnkle[0],newAnkle[1]-originalAnkle[1]],top=near?5:8;
      p[near?'kl':'kr']=newKnee;p[near?'al':'ar']=newAnkle;c.profileSoles[near?1:0]=[oldSole[0]+delta[0],oldSole[1]+delta[1]];
      var layer=nativePart('human-bind-v11-legs',[1536,1024],bounds,m,function(x,y){var shin=soft(-5,5,along(newKnee,newAnkle,x,y)),foot=soft(-3,2,along(newAnkle,[newAnkle[0]+newAnkle[0]-newKnee[0],newAnkle[1]+newAnkle[1]-newKnee[1]],x,y));return[[top,(1-shin)*(1-foot)],[top+1,shin*(1-foot)],[top+2,foot]].filter(function(w){return w[1]>.00001;});});
      var shoePath=night?(near?[[305,750],[329,761],[373,778],[399,779],[433,792],[447,821],[445,845],[367,845],[327,837],[310,805],[302,780]]:[[85,716],[122,723],[150,738],[164,765],[181,778],[183,807],[155,835],[74,831],[54,795],[61,756],[73,732]]):(near?[[401,654],[426,651],[466,644],[490,649],[524,646],[551,665],[551,726],[421,732],[397,707],[384,682],[391,664]]:[[105,638],[124,645],[166,656],[222,669],[234,694],[232,722],[94,719],[84,681],[96,653]]);
      var shoe=piece(shoePath,function(){return[[top+2,1]];});shoe.sourceAffine=[k,0,0,k,ox+delta[0],oy+delta[1]];shoe.box[0]+=delta[0];shoe.box[1]+=delta[1];
      layer.componentSeed=a.slice();layer.bindJoints={hip:originalHip.slice(),knee:newKnee.slice(),ankle:newAnkle.slice(),native:[a,b,d],matrix:m.slice()};return[layer,shoe];
    }
    var farLeg=completeLeg(false),nearLeg=completeLeg(true);
    // The hidden upper sleeve is genuine native material. Its endpoint and the
    // original hand overlap at the same wrist; no body-to-hand triangle exists.
    var armStart=night?[1008,205]:[292,183],armElbow=night?[1120,601]:[465,594],armEnd=night?[1382,924]:[761,899],armScale=Math.hypot(p.wr[0]-p.sr[0],p.wr[1]-p.sr[1])/Math.hypot(armEnd[0]-armStart[0],armEnd[1]-armStart[1]),armMap=similarity(armStart,armEnd,p.sr,p.wr,armScale,false);
    p.er=applied(armMap,armElbow);
    var farArm=nativePart('human-bind-v11-far-arms',[1470,1070],night?[895,85,539,872]:[165,57,641,886],armMap,armWeight(false));
    var farHand=piece(night?[[352,368],[369,362],[393,385],[412,411],[410,432],[391,443],[375,438],[361,420],[356,400]]:[[406,331],[419,322],[441,339],[456,354],[459,376],[444,389],[424,374],[410,355]],function(){return[[4,1]];});
    var nearArm=piece(source.nearArm,armWeight(true));
    var head=night?[[167,1],[255,1],[304,32],[303,79],[274,98],[263,124],[269,144],[221,155],[190,139],[147,121],[122,87],[112,54],[134,18]]:[[230,13],[313,13],[355,45],[365,70],[352,107],[333,110],[322,129],[321,139],[306,136],[291,128],[280,132],[267,137],[251,145],[244,160],[247,180],[238,213],[230,238],[200,228],[171,215],[145,194],[135,163],[152,138],[166,116],[182,92],[207,62]];
    var headLayer=piece(head,fixed),hairPath=night?[[122,103],[185,101],[199,121],[198,145],[175,144],[145,125]]:[[120,140],[205,140],[231,165],[226,200],[229,242],[120,242]];
    // Face, ear and neck stay rigid. Only the backmost true-alpha hair tips
    // have wind weights, separated from the cheek by a stationary seam.
    headLayer.excludePaths=[hairPath];var hairLayer=piece(hairPath,fixed);hairLayer.windWeights=function(x,y){var sx=(x-ox)/k,sy=(y-oy)/k;return[night?.28*soft(104,127,sy)*(1-soft(178,199,sx)):soft(145,203,sy)*(1-soft(190,228,sx)),0,0];};
    var frontHair=night?null:piece([[307,120],[321,123],[330,138],[336,151],[343,167],[352,177],[353,191],[337,199],[331,189],[319,195],[307,191],[297,190],[286,180],[282,165],[292,159],[287,144],[296,137]],fixed);
    function clothWind(x,y){return[0,soft(110,150,y)*(1-soft(174,188,y))*soft(7,21,Math.abs(x-60)),!night?soft(83,93,y)*(1-soft(108,116,y))*soft(10,25,Math.abs(x-60)):0];}
    var layers=[];
    if(!night){
      var garmentScale=.091,shoulder=[639,124],gm=[garmentScale,0,0,garmentScale,p.sl[0]-shoulder[0]*garmentScale,p.sl[1]-shoulder[1]*garmentScale],garment=nativePart('human-bind-v11-coat',[1076,1461],[0,26,1076,1408],gm,fixed);garment.windWeights=clothWind;
      layers=[farArm,farHand].concat(farLeg,nearLeg,[garment,nearArm,headLayer,hairLayer,frontHair]);
    }else{
      // Lower silk panels follow the thighs gently, while the waist and collar
      // remain on the torso. A complete leg continues beneath each panel.
      function silkWeights(x,y){var follow=.48*soft(108,176,y),front=soft(41,58,x),near=follow*front,far=follow*(1-front);return[[0,1-follow],[5,near],[8,far]].filter(function(w){return w[1]>.00001;});}
      var garmentScale=.147,shoulder=[1120,64],gx=p.sl[0]-shoulder[0]*garmentScale,gy=p.sl[1]-shoulder[1]*garmentScale,gm=[garmentScale,0,0,garmentScale,gx,gy];
      var garment=nativePart('human-bind-v10-costumes',[1536,1024],[938,13,491,991],gm,silkWeights);garment.windWeights=clothWind;
      // The far arm passes behind the torso; complete hidden material is
      // occluded by the gown, rather than clipped out of the native limb.
      layers=farLeg.concat(nearLeg,[farArm,farHand,garment,nearArm,headLayer,hairLayer]);
    }
    c.layers=layers;c.bindVersion=11;c.faceRigid=true;c.profileSource.completeParts=['human-bind-v11-legs','human-bind-v11-far-arms',night?'human-bind-v10-costumes':'human-bind-v11-coat'];return c;
  }
  function profileTwoLink(hip,knee,ankle,target){
    var ux=knee[0]-hip[0],uy=knee[1]-hip[1],vx=ankle[0]-knee[0],vy=ankle[1]-knee[1],l1=Math.hypot(ux,uy),l2=Math.hypot(vx,vy),dx=target[0]-hip[0],dy=target[1]-hip[1],distance=Math.hypot(dx,dy),reach=clamp(distance,Math.abs(l1-l2)+.001,l1+l2-.001),a=Math.atan2(dy,dx),bend=(ux*vy-uy*vx)<0?-1:1,cos1=clamp((l1*l1+reach*reach-l2*l2)/(2*l1*reach),-1,1),cos2=clamp((l2*l2+reach*reach-l1*l1)/(2*l2*reach),-1,1),first=a-bend*Math.acos(cos1),second=a+bend*Math.acos(cos2),rest1=Math.atan2(uy,ux),rest2=Math.atan2(vy,vx),upper=rotate((first-rest1)*180/Math.PI,hip[0],hip[1]),lower=multiply(upper,rotate((second-first-rest2+rest1)*180/Math.PI,knee[0],knee[1]));
    return{upper:upper,lower:lower,angle:second-rest2,reachError:Math.max(0,distance-reach)};
  }
  function profileWalkBones(rig,c,t){
    var root=rig.root,p=c.pivots,b=Array.from({length:12},identity),phase=c.walkPhase===undefined?(root._rigStride||0):c.walkPhase,theta=phase*Math.PI*2;
    rig.poseY=[1,0];rig.affine=false;c.walkTime=reduced?0:t;var bodyDown=c.night?1.65+3*Math.cos(theta*2):2+5*Math.cos(theta*2),body=[1,0,0,1,0,bodyDown];b[0]=body;
    var nearSwing=c.night?(-5+5*Math.cos(theta)):(-18+18*Math.cos(theta)),farSwing=(c.night?12:16)*(1-Math.cos(theta));
    b[1]=multiply(body,rotate(nearSwing,p.sl[0],p.sl[1]));b[2]=multiply(b[1],rotate((c.night?2:4)*Math.sin(theta),p.el[0],p.el[1]));b[3]=multiply(body,rotate(farSwing,p.sr[0],p.sr[1]));b[4]=multiply(b[3],rotate(-4*Math.sin(theta),p.er[0],p.er[1]));
    var scale=root._rigHumanWorldScale||.875,span=(c.night?45:55)/scale,center=c.night?70:64,feet=[],reach=[];
    function leg(near){
      var u=(phase+(near?0:.5))%1,stance=u<.5,s=stance?u/.5:(u-.5)/.5,x=stance?center+span/2-span*s:center-span/2+span*(s*s*(3-2*s)),lift=stance?0:(c.night?8:12)*Math.sin(s*Math.PI),angle=stance?(s<.18?-6*(1-s/.18):s>.8?6*(s-.8)/.2:0):6*Math.sin(s*Math.PI)-6*s;
      var index=near?1:0,hip=p[near?'hl':'hr'],knee=p[near?'kl':'kr'],ankle=p[near?'al':'ar'],sole=c.profileSoles[index],offset=[sole[0]-ankle[0],sole[1]-ankle[1]],a=angle*Math.PI/180,co=Math.cos(a),si=Math.sin(a),target=[x-co*offset[0]+si*offset[1],192-lift-si*offset[0]-co*offset[1]-bodyDown],ik=profileTwoLink(hip,knee,ankle,target),top=near?5:8;
      b[top]=multiply(body,ik.upper);b[top+1]=multiply(body,ik.lower);b[top+2]=multiply(body,multiply(ik.lower,rotate((a-ik.angle)*180/Math.PI,ankle[0],ankle[1])));var m=b[top+2],actual=[m[0]*sole[0]+m[2]*sole[1]+m[4],m[1]*sole[0]+m[3]*sole[1]+m[5]];feet[index]={x:actual[0],y:actual[1],actualY:actual[1],stance:stance,lift:Math.max(0,192-actual[1]),phase:u,support:stance?1:0};reach.push(ik.reachError);
    }
    leg(true);leg(false);
    c.footContacts=feet;root._rigNativeFeet=feet;root._rigFootPose=null;root._rigContinuousGait={phase:phase,stepWorld:c.night?90:110,singlePainting:c.image,nearArm:nearSwing,farArm:farSwing,reachError:reach,vertexCount:c.layers?c.layers.reduce(function(n,layer){return n+(layer.uniqueVertices?layer.uniqueVertices.length:0);},0):0,drawCalls:c.layers?c.layers.length:1,fixedMaterials:true};
    root._rigNativeFrame={phase:phase,painting:c.image,crop:c.crop,singleSource:true};root._rigNativeConfig=c;root._rigNativeView='profile';root._rigNativeBones=b;root._rigBodyDy=bodyDown;root._rigHeadMatrix=body;root._rigCapAnchor={x:60,y:8,headWidth:c.night?30:34,width:c.night?30:34};
    root.classList.add('native-gait-frames');root.classList.remove('native-wave-frames','native-gesture-frames','native-point-view','native-shelf-return');
    var hand=c.nearGrip,m=b[2],grip=[m[0]*hand[0]+m[2]*hand[1]+m[4],m[1]*hand[0]+m[3]*hand[1]+m[5]];c.lamp=c.night?[grip[0],grip[1]+16]:null;var lantern=root.querySelector('.native-profile-lantern');if(lantern&&c.lamp)lantern.setAttribute('transform','translate('+(grip[0]-33.9)+' '+(grip[1]-117.9)+')');
    return b;
  }
  function prepareNativeProps(root){
    var svg=root.querySelector('.painted-character'),flip=svg&&svg.querySelector('.c-flip');if(!flip)return;
    var ns='http://www.w3.org/2000/svg',layer=document.createElementNS(ns,'g');layer.setAttribute('class','native-view-props');
    var lantern=root.querySelector('.c-root > .o-night .p-lantern');if(lantern){var l=lantern.cloneNode(true);l.setAttribute('class','native-profile-lantern');layer.appendChild(l);}
    // Use the red cover from the native holding painting throughout the carry.
    var b=document.createElementNS(ns,'g'),paint=document.createElementNS(ns,'image');
    b.setAttribute('class','native-shelf-book');paint.setAttribute('class','painted-sprite');
    paint.setAttribute('href',new URL('research-red-book-native.webp',artBase).href);
    paint.setAttribute('width','1808');paint.setAttribute('height','870');
    b.appendChild(paint);layer.appendChild(b);asset('research-red-book-native');
    flip.appendChild(layer);
  }
  function researchBookSignal(root,name,motion,flag){
    if(motion[flag]||typeof root[name]!=='function')return;
    motion[flag]=true;var callback=root[name];
    // Draw the complete reach/carry frame before world changes the shelf spine
    // or switches to the full holding painting on the following frame.
    requestAnimationFrame(function(){if(root._paintRig&&root._paintRig.researchBookMotion===motion&&root[name]===callback)callback();});
  }
  function nativeHumanBones(rig,c,t){
    rig.bowState=null;if(c.profileWalk)return profileWalkBones(rig,c,t);
    var root=rig.root,p=c.pivots,b=[];for(var j=0;j<12;j++)b.push(identity());
    var jumpScale=1,jumpY=0,jump=c.gestureAction==='toss'?active(rig,'is-jumping',t):null;
    if(!reduced&&jump!==null&&jump<.75){
      var progress=jump/.75,keys=[[0,0,1],[.15,0,.95],[.45,-30,1],[.8,0,1],[.9,0,.97],[1,0,1]];
      for(var ji=1;ji<keys.length;ji++)if(progress<=keys[ji][0]){var from=keys[ji-1],to=keys[ji],jf=(progress-from[0])/(to[0]-from[0]);jf=jf*jf*(3-2*jf);jumpY=from[1]+(to[1]-from[1])*jf;jumpScale=from[2]+(to[2]-from[2])*jf;break;}
    }
    rig.poseY=[jumpScale,193*(1-jumpScale)+jumpY];rig.affine=false;
    if(c.nativeView==='shelf'){
      var target=root._rigHandTarget,held=root.classList.contains('has-book'),motion=rig.researchBookMotion;
      if(!motion)motion=rig.researchBookMotion={reach:0,returned:0,dwell:0,last:t};
      // Busy frames can extend the action, but cannot skip the visible carry.
      var dt=reduced?.08:clamp((t-motion.last)/1000,0,.055);motion.last=t;
      var reaching=root.classList.contains('act-reach'),reach=motion.reach;
      if(target){
        var ready=asset(c.image).complete&&asset('research-red-book-native').complete&&asset('research-red-book-native').naturalWidth;
        if(c.night){var returnPaint=asset('hanjing-night-shelf-return-native');ready=ready&&returnPaint.complete&&returnPaint.naturalWidth;}
        if(reaching&&ready){
          if(!held){
            motion.reach=clamp(motion.reach+dt/(reduced?.08:.48),0,1);reach=motion.reach;
            if(reach===1){motion.dwell+=dt;if(motion.dwell>=(reduced?0:.14))researchBookSignal(root,'_onResearchReachReady',motion,'reachSignalled');}
          }else if(!c.night||c.shelfReturnFrame!==undefined){
            motion.returned=clamp(motion.returned+dt/(reduced?.08:.66),0,1);
            if(motion.returned===1){motion.dwell+=dt;if(motion.dwell>=(reduced?0:.32))researchBookSignal(root,'_onResearchBookReturned',motion,'returnSignalled');}
            else motion.dwell=c.shelfReturnFrame!==undefined?0:.14;
          }
        }
        var ret=motion.returned;ret=ret*ret*(3-2*ret);
        var hold=rig.configs[22+(c.night?1:0)].heldBookCenter,dest=[target[0]+(hold[0]+7-target[0])*ret,target[1]+(hold[1]+3.8-target[1])*ret];
        motion.angle=-10*(1-ret);motion.progress=ret;motion.holdCenter=hold;
        if(c.shelfReturnFrame===undefined){var goal=aimAngles(c,dest,true);b[3]=rotate(goal[0]*reach,p.sr[0],p.sr[1]);b[4]=multiply(b[3],rotate(goal[1]*reach,p.er[0],p.er[1]));}
      }
    }
    root._rigFootPose=null;
    root._rigNativeFeet=c.footContacts?c.footContacts.map(function(foot){var actualY=foot.y*rig.poseY[0]+rig.poseY[1],lift=Math.max(0,foot.y-actualY);return {x:foot.x,y:foot.y,actualY:actualY,stance:foot.stance&&lift<1.5,lift:Math.max(foot.lift||0,lift)};}):null;
    root.classList.toggle('native-gesture-frames',c.gestureFrame!==undefined);root.classList.toggle('native-point-view',c.gestureAction==='point');
    root._rigNativeGestureFrame=c.gestureFrame===undefined?null:{action:c.gestureAction,phase:c.gestureFrame,painting:c.image,crop:c.crop};
    root.classList.toggle('native-gait-frames',c.gaitFrame!==undefined);root.classList.toggle('native-wave-frames',c.waveFrame!==undefined);
    root._rigNativeWaveFrame=c.waveFrame===undefined?null:{phase:c.waveFrame,painting:c.image,crop:c.crop};
    root.classList.toggle('native-shelf-return',c.shelfReturnFrame!==undefined);
    root._rigNativeShelfReturnFrame=c.shelfReturnFrame===undefined?null:{phase:c.shelfReturnFrame,sourcePhase:c.shelfSourcePhase,painting:c.image,crop:c.crop};
    if(c.shelfReturnFrame!==undefined)root._rigBookPose={stage:'native-return',progress:rig.researchBookMotion.returned,reach:rig.researchBookMotion.reach,center:c.heldBookCenter.slice(),grip:c.heldBookGrip.slice(),painting:c.image,phase:c.shelfReturnFrame};
    root._rigNativeFrame=c.gaitFrame===undefined?null:{phase:c.gaitFrame,painting:c.image,crop:c.crop,mix:rig.gaitBlend?rig.gaitBlend.u:0};
    if(c.gaitFrame!==undefined&&rig.gaitBlend){var g=rig.gaitBlend;root._rigNativeFeet=g.first.footContacts.map(function(f,i){var other=g.next.footContacts[i],x=f.x+(other.x-f.x)*g.u,y=f.y+(other.y-f.y)*g.u;return{x:x,y:y,actualY:y,stance:y>189.5,lift:Math.max(0,192-y)};});}
    root._rigBodyDy=jumpY;root._rigHeadMatrix=multiply([1,0,0,jumpScale,0,rig.poseY[1]],b[0]);root._rigCapAnchor={x:60,y:8,headWidth:c.night?30:34,width:c.night?30:34};
    var lantern=root.querySelector('.native-profile-lantern');
    if(lantern){
      if(c.lamp){var lamp=c.lamp;if(c.gaitFrame!==undefined&&rig.gaitBlend){var g=rig.gaitBlend;lamp=g.first.lamp.map(function(p,i){return p+(g.next.lamp[i]-p)*g.u;});}lantern.setAttribute('transform','translate('+(lamp[0]-33.9)+' '+(lamp[1]-133.9)+')');}
      else if(p.handL){var lp=p.handL,m=b[4],lx=m[0]*lp[0]+m[2]*lp[1]+m[4],ly=m[1]*lp[0]+m[3]*lp[1]+m[5];lantern.setAttribute('transform','translate('+(lx-33.9)+' '+(ly-117.9)+')');}
    }
    var book=root.querySelector('.native-shelf-book');
    if(book&&p.handR){
      var hand=p.handR,m=b[4],hx=m[0]*hand[0]+m[2]*hand[1]+m[4],hy=m[1]*hand[0]+m[3]*hand[1]+m[5];
      var bm=rig.researchBookMotion||{},angle=bm.angle||0,radians=angle*Math.PI/180,cos=Math.cos(radians),sin=Math.sin(radians);
      // Match the native hold's measured size and red-cover reference point.
      // The palm supports the lower right cover rather than its center.
      var k=184/(c.night?996:992),width=(c.night?153:155)*k,height=74*k;
      var anchorX=67+1691*(c.night?75.5/153:76/155),anchorY=45+785*(c.night?40.5/74:47/74);
      book.setAttribute('transform','translate('+hx+' '+hy+') rotate('+angle+') translate(-7 -3.8) scale('+(width/1691)+' '+(height/785)+') translate('+(-anchorX)+' '+(-anchorY)+')');
      root._rigBookPose={stage:held?'return':'reach',progress:bm.progress||0,reach:bm.reach||0,center:[hx-7*cos+3.8*sin,hy-7*sin-3.8*cos],grip:[hx,hy],width:width,height:height,painting:'research-red-book-native'};
    }
    root._rigNativeView=c.nativeView;root._rigNativeBones=b;root._rigNativeConfig=c;return b;
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
    var base={image:'cats-painted',sheet:[1536,1024],crop:[764,33,742,553],box:[2,6,86,64],cutouts:[[942,576,998,590]],step:1.5,legs:legs,weights:function(x,y){
      for(var i=legs.length-1;i>=0;i--){var l=legs[i];if(within(l.path,x,y)){
        var feather=clamp(edgeDistance(l.path,x,y)/3,0,1);feather=feather*feather*(3-2*feather);
        feather+=(1-feather)*clamp((y-l.k[1])/5,0,1);
        var a=clamp((y-l.p[1])/7,0,1)*feather,b=clamp((y-l.k[1]+3)/6,0,1),paw=clamp((y-l.e[1]+4.5)/3.5,0,1);
        return [[0,1-a],[1+i*3,a*(1-b)],[2+i*3,a*b*(1-paw)],[3+i*3,a*b*paw]].filter(function(w){return w[1]>0;});
      }}
      if(x<28&&y<42)return [[13,clamp((28-x)/9,0,1)],[0,1-clamp((28-x)/9,0,1)]];
      if(x>61&&y<37)return [[14,clamp((37-y)/9,0,1)],[0,1-clamp((37-y)/9,0,1)]];
      // The upper back has a small independent fur motion; the chest, legs
      // and planted paws keep their original dimensions and ground targets.
      if(x>=28&&x<=64&&y<49){var back=clamp((49-y)/17,0,1)*clamp(Math.min(x-26,67-x)/8,0,1);return [[15,back],[0,1-back]].filter(function(w){return w[1]>0;});}
      return [[0,1]];
    }};var configs=A.catV9Configurations?A.catV9Configurations(base):[base];function preload(c){if(c.layers)c.layers.forEach(preload);else asset(c.image);}configs.forEach(preload);return renderer(root,'cat',configs);
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
    root._rigNativeView='front';root._rigNativeConfig=c;root._rigNativeBones=null;root._rigNativeFeet=null;
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
    if(wave!==null&&wave<1.4){var ease=Math.min(1,wave/.3,(1.4-wave)/.28);ease=ease*ease*(3-2*ease);right=rest[2]-50*ease;rf=rest[3]+(-112+Math.sin(wave*12)*4)*ease;}
    if(reach!==null){var grab=aimAngles(c,root._rigHandTarget||[135,49],false),grabEase=Math.min(1,reach/.4);right=rest[2]+(grab[0]-rest[2])*grabEase;rf=rest[3]+(grab[1]-rest[3])*grabEase;}
    if(point!==null&&point<2.6){var pointEase=Math.min(1,point/.35,(2.6-point)/.35);right=rest[2]-84*pointEase;rf=rest[3]-(c.night?28:17)*pointEase;}
    if(mail!==null&&mail<2.6){var post=aimAngles(c,root._rigHandTarget||[112.6,73.1],true),postEase=Math.min(1,mail/.65,(2.6-mail)/.4);right=rest[2]+(post[0]-rest[2])*postEase;rf=rest[3]+(post[1]-rest[3])*postEase;}
    if(toss!==null&&toss<2.4){var lift=Math.min(1,toss/.35,(2.4-toss)/.4);right=rest[2]-(c.night?133:140)*lift;left=rest[0]+(c.night?133:140)*lift;rf=rest[3]-(c.night?10:3)*lift;lf=rest[1]+(c.night?10:3)*lift;}
    if(reduced){left=rest[0];right=rest[2];lf=rest[1];rf=rest[3];}
    b.push(rotate(left,p.sl[0],p.sl[1]));b.push(multiply(b[1],rotate(lf,p.el[0],p.el[1])));b.push(rotate(right,p.sr[0],p.sr[1]));b.push(multiply(b[3],rotate(rf,p.er[0],p.er[1])));
    var walkDy=(c.night?1.8+.35*Math.cos(phase*Math.PI*4):.03)*rig.gaitMix;
    rig.bowState=A.bowDepth?A.bowDepth.sample(c,bow,{reduced:reduced}):null;root._rigBowState=rig.bowState;rig.affine=!!(rig.bowState&&(rig.bowState.mix>0||rig.bowState.headScale!==1));var dy=walkDy;
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
    b.push(head);if(rig.bowState&&(rig.bowState.mix>0||rig.bowState.headScale!==1))b=A.bowDepth.composeBones(rig.bowState,b,c);
    // The letter follows the same shoulder/elbow matrices as the hand.
    root.querySelectorAll('.c-root > .o-'+(c.night?'night':'day')+' .c-arm-f').forEach(function(el){el.style.animation='none';el.style.transform='rotate('+right+'deg)';el.querySelector('.paint-forearm').style.animation='none';el.querySelector('.paint-forearm').style.transform='rotate('+rf+'deg)';});
    root.querySelectorAll('.c-root > .o-'+(c.night?'night':'day')+' .c-arm-b').forEach(function(el){el.style.animation='none';el.style.transform='rotate('+left+'deg)';el.querySelector('.paint-forearm').style.animation='none';el.querySelector('.paint-forearm').style.transform='rotate('+lf+'deg)';});
    // Every painted point and the separately lit hand prop share the body's
    // translation. The facial features read this same value in followHead.
    b.forEach(function(m){m[5]+=dy;});
    root._rigBodyDy=dy;
    root._rigCapAnchor={x:c.night?60:64,y:8,headWidth:c.night?30:34,width:c.night?30:34};
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
    // The native walking painting already carries its fluffy tail upright.
    // A restrained slow tip sweep, soft back flex and small look-ahead nod
    // accompany the footfall instead of bouncing the whole cat sprite.
    var tail=A.catV9TailAngle?A.catV9TailAngle(t):reduced?0:Math.sin(t/1050)*4.2+Math.sin(t/2470)*1.2;
    var head=reduced?0:Math.sin(t/1870)*1.1+(moving?Math.sin(phase*Math.PI*2)*.55*gait:0)-reach*2;
    var spine=reduced?0:moving?Math.sin(phase*Math.PI*2+.7)*.55*gait:Math.sin(t/1900)*.2;
    b.push(multiply(body,rotate(tail,28,40)),multiply(body,rotate(head,64,36)),multiply(body,rotate(spine,43,42)));
    root._rigCatTailAngle=tail;root._rigCatHeadAngle=head;root._rigCatSpineAngle=spine;
    return b;
  }
  function humanView(r,t,dark){
    var root=r.root,view=root._rigRequestedView,wave=active(r,'is-waving',t);r.gaitBlend=null;
    root.classList.remove('native-wave-frames','native-gesture-frames','native-point-view','native-shelf-return');root._rigNativeWaveFrame=null;root._rigNativeGestureFrame=null;root._rigNativeShelfReturnFrame=null;
    if(!view){
      if(root.classList.contains('is-walking'))view='profile';
      else if(root.classList.contains('native-step-settling')&&t-r.settleStart<(r.settleDuration||240))view='profile';
      else{view='front';root.classList.remove('native-step-settling');}
    }
    root.classList.toggle('native-profile-view',view==='profile');root.classList.toggle('native-shelf-view',view==='shelf');root.classList.toggle('native-hold-view',view==='hold');
    var direction=view==='front'?(root.classList.contains('face-left')?-1:1):(root._rigViewDirection||(root.classList.contains('face-left')?-1:1));
    // The canvas and native prop layer use the same true-facing coordinate
    // space. Front idle is an upright portrait when a travelling step ends.
    r.root.querySelector('.motion-rig-human').style.transform=direction<0?'scaleX(-1)':'none';
    if(view==='profile'&&!root._rigRequestedView){
      var phase=root._rigStride||0;
      if(root.classList.contains('native-step-settling')){
        var fraction=clamp((t-r.settleStart)/(r.settleDuration||240),0,1),travel=Math.min(1,fraction/.72),contact=r.settleContact;
        phase=(r.settlePhase+(contact-r.settlePhase)*travel)%1;
      }
      var base=6+(dark?8:0),profile=r.configs[base];profile.walkPhase=phase;return profile;
    }
    root.classList.remove('native-gait-frames');root._rigNativeFrame=null;
    if(view==='front'&&dark&&wave!==null&&wave<1.4&&!reduced){
      var keys=[[.10,0],[.22,1],[.34,2],[.46,3],[.60,4],[.74,5],[.88,4],[1.02,5],[1.14,3],[1.26,6],[1.4,7]],phase=7;
      for(var q=0;q<keys.length;q++)if(wave<keys[q][0]){phase=keys[q][1];break;}
      return r.configs[24+phase];
    }
    if(view==='front'&&dark&&!reduced){
      var point=active(r,'act-point',t),toss=active(r,'act-toss',t),phase;
      if(point!==null&&point<2.6){phase=point<.15?0:point<.4?1:point<2.12?2:point<2.4?3:4;return r.configs[32+phase];}
      if(toss!==null&&toss<2.4){phase=toss<.12?0:toss<.3?1:toss<.68?2:toss<1?3:4;return r.configs[37+phase];}
    }
    if(view==='shelf'&&dark&&root.classList.contains('has-book')){
      var withdrawal=asset('hanjing-night-shelf-return-native');
      if(withdrawal.complete&&withdrawal.naturalWidth){var returnProgress=r.researchBookMotion?r.researchBookMotion.returned:0;return r.configs[42+Math.min(3,Math.floor(returnProgress*4))];}
    }
    var index=(view==='profile'?2:view==='shelf'?4:view==='hold'?22:0)+(dark?1:0);return r.configs[index];
  }
  function frame(t){var dark=document.documentElement.dataset.theme==='dark';rigs.forEach(function(r){if(r.type==='cat'&&!r.root.classList.contains('is-pouncing'))delete r.times['is-pouncing'];var hidden=r.type==='human'?(r.root.classList.contains('act-read')||r.root.classList.contains('act-write')||r.root.classList.contains('act-pet')):(!r.root.classList.contains('is-walking')&&!r.root.classList.contains('is-settling')&&!r.root.classList.contains('is-pouncing')&&!(A.catV10Active&&A.catV10Active(r.root)));if(r.type==='human'&&hidden){r.root.classList.remove('native-profile-view','native-shelf-view','native-hold-view','native-wave-frames','native-gesture-frames','native-point-view','native-shelf-return','native-step-settling');r.root._rigNativeShelfReturnFrame=null;if(r.hiddenTheme!==dark){var rest=r.configs[dark?1:0],paint=asset(rest.image);if(paint.complete&&paint.naturalWidth){r.gaitBlend=null;r.poseY=null;r.draw(rest,Array.from({length:12},identity));r.hiddenTheme=dark;}}}else if(r.type==='human')r.hiddenTheme=null;if(hidden||!r.root.isConnected||r.root.closest('[hidden]'))return;if(r.type==='cat'&&r.root._rigCatWorldX!==undefined&&(r.root.classList.contains('is-walking')||r.root.classList.contains('is-settling')))return;var c=r.type==='human'?humanView(r,t,dark):(A.catV9Frame?A.catV9Frame(r,t):r.configs[0]);var drawn=r.draw(c,r.type==='human'?(c.nativeView?nativeHumanBones(r,c,t):humanBones(r,c,t)):(c.sitFeline&&A.catV10Bones?A.catV10Bones(r,c,t):catBones(r,c,t)));if(drawn&&r.type==='cat'&&A.catV10Drawn)A.catV10Drawn(r,c,t);});requestAnimationFrame(frame);}
  A.initMotionRigs=function(container){container.querySelectorAll('.painted-character').forEach(function(el){var root=el.closest('#char,.avatar-demo')||el.parentElement;if(!root._paintRig)human(root);});container.querySelectorAll('.painted-cat').forEach(function(el){var root=el.closest('#cat,.cat-demo')||el.parentElement;if(!root._paintRig)cat(root);});};
  A.aimHand=function(root,element,x,y){
    var svg=root.querySelector('.painted-character'),from=element.getScreenCTM(),to=svg.getScreenCTM();
    if(from&&to){var point=new DOMPoint(x,y).matrixTransform(from).matrixTransform(to.inverse());root._rigHandTarget=[point.x,point.y];}
  };
  A.humanGaitStepWorld=function(dark){return dark?90:110;};
  var oldHuman=A.poseCharacter,oldCat=A.poseCat;
  A.setHumanView=function(root,view,direction){root._rigRequestedView=view==='front'?null:view;root._rigViewDirection=direction||1;if(root._paintRig){delete root._paintRig.bookRetractStart;root._paintRig.settleStart=0;}root.classList.remove('native-step-settling');};
  A.resetHumanStep=function(root){root._rigStride=0;root._rigFootPose=null;root.classList.remove('native-step-settling');if(root._paintRig){root._paintRig.wasHumanMoving=false;root._paintRig.settleStart=0;}};
  A.poseCharacter=function(root,stride,moving){
    root._rigStride=stride;var r=root._paintRig;if(!r){oldHuman(root,stride,moving);return;}
    var worldX=root._rigHumanWorldX,travel=worldX!==undefined&&r.worldX!==undefined?worldX-r.worldX:0;
    r.worldX=worldX;
    var direction=Math.abs(travel)>.001?(travel<0?-1:1):(root.classList.contains('face-left')?-1:1),transition=moving&&(!r.wasHumanMoving||r.moveDirection!==direction);
    if(moving){root._rigRequestedView=null;root._rigViewDirection=direction;root.classList.remove('native-step-settling');}
    else if(r.wasHumanMoving){r.settleStart=performance.now();r.settlePhase=stride;r.settleContact=Math.ceil(stride*2+.001)/2;r.settleDuration=240;root.classList.add('native-step-settling');}
    r.wasHumanMoving=moving;r.moveDirection=direction;
    // World updates the walking class before its final facing CSS. Use the
    // actual displacement, and paint the initial / turned pose in this same
    // hook so a compositor frame cannot expose a previous view or direction.
    if(transition&&!root.classList.contains('act-write')&&!root.classList.contains('act-read')&&!root.classList.contains('act-pet')){var now=performance.now(),dark=document.documentElement.dataset.theme==='dark',c=humanView(r,now,dark);r.draw(c,c.nativeView?nativeHumanBones(r,c,now):humanBones(r,c,now));}
  };
  A.poseCat=function(root,stride,moving){root._rigStride=stride;if(!root._paintRig)oldCat(root,stride,moving);else if(moving&&root._rigCatWorldX!==undefined){var r=root._paintRig,c=r.configs[0],t=performance.now(),drawn=r.draw(c,catBones(r,c,t));if(drawn&&A.catV10Drawn)A.catV10Drawn(r,c,t);}else if(!moving){root._paintRig.catPlants=[];root._paintRig.catPreviousBodyX=undefined;}};
  requestAnimationFrame(frame);
})();
