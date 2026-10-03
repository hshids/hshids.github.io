import * as THREE from 'three';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';

/** Smooth the completed display image. Scene materials retain their own
 * toneMapped choices: painted surfaces and PBR clay are not passed through
 * a second, global tone mapper. No multisample coverage cracks or CPU readback. */
export function createDisplayAntialias(renderer){
  const size=new THREE.Vector2(),uniforms=THREE.UniformsUtils.clone(FXAAShader.uniforms);
  // Preserve the fine painted grain and plaque lettering while softening
  // silhouette edges. Shader defaults are pinned by the Three.js lockfile.
  const fragmentShader=FXAAShader.fragmentShader
    .replace('float _SubpixelBlending = 1.0;','float _SubpixelBlending = 0.5;')
    .replace('float _RelativeThreshold = 0.063;','float _RelativeThreshold = 0.125;');
  const material=new THREE.ShaderMaterial({name:'Completed-display FXAA',uniforms,
    vertexShader:FXAAShader.vertexShader,fragmentShader,
    toneMapped:false,depthTest:false,depthWrite:false,blending:THREE.NoBlending});
  const quad=new FullScreenQuad(material);let texture=null,disposed=false;
  function resize(){
    if(disposed)return;renderer.getDrawingBufferSize(size);
    if(texture&&texture.image.width===size.x&&texture.image.height===size.y)return;
    texture?.dispose();texture=new THREE.FramebufferTexture(size.x,size.y);
    texture.name='Completed sRGB display for FXAA';
    // These are already display-encoded pixels. The FXAA shader reads them
    // as raw values and writes them unchanged outside detected edges.
    texture.colorSpace=THREE.NoColorSpace;
    texture.minFilter=texture.magFilter=THREE.LinearFilter;
    uniforms.tDiffuse.value=texture;uniforms.resolution.value.set(1/size.x,1/size.y);
  }
  return{resize,render(){if(disposed)return;resize();renderer.copyFramebufferToTexture(texture);quad.render(renderer);},
    get texture(){return texture;},
    get diagnostics(){return{mode:'FXAA',msaa:false,subpixel:.5,relativeThreshold:.125,width:size.x,height:size.y,estimatedBytes:size.x*size.y*4,scope:'One GPU display-copy texture, with no additional colour conversion.'};},
    dispose(){if(disposed)return;disposed=true;texture?.dispose();texture=null;material.dispose();quad.dispose();}
  };
}
