/* A modest front-facing bow of the existing painted figure.
   This is a waist hinge with a shallow perspective projection, not a 3D model.
   The caller owns time, skinning, the original UVs, and the attached lantern. */
(function () {
  "use strict";
  var A = window.HJArt;
  if (!A) return;
  var duration = 1.35, radians = Math.PI / 180;

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function smooth(n) { n = clamp(n, 0, 1); return n * n * (3 - 2 * n); }
  function identity() { return [1, 0, 0, 1, 0, 0]; }
  function product(a, b) {
    return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
      a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
      a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
  }
  function transformed(m, p) {
    return [m[0]*p[0]+m[2]*p[1]+m[4], m[1]*p[0]+m[3]*p[1]+m[5]];
  }

  function sample(config, elapsed, options) {
    var p = config && config.pivots, supported = !!(p && p.hl && p.hr && p.sl && p.sr && config.nativeArms && !config.profileWalk);
    var active = supported && typeof elapsed === "number" && isFinite(elapsed) && elapsed >= 0 && elapsed < duration && !(options && options.reduced);
    var mix = 0;
    if (active) {
      // Ease in, briefly acknowledge the visitor, then rise more slowly.
      // Both end velocities are zero so a class change cannot snap the pose.
      mix = elapsed < .43 ? smooth(elapsed/.43) : elapsed < .57 ? 1 : 1-smooth((elapsed-.57)/.78);
    }
    var waist = supported ? [(p.hl[0]+p.hr[0])/2, (p.hl[1]+p.hr[1])/2-8] : [60, 96];
    var neck = config && config.bowNeck ? config.bowNeck.slice() : [60, 36];
    // A small, stable portrait proportion improves the original fine eyes at
    // world scale. It remains identical in Night front idle and bow, rather
    // than enlarging at the moment of a greeting. Native other views keep theirs.
    var headScale = supported && config.night && config.image === "hanjing-night-closed-native" ? 1.06 : 1;
    var pitch = 26*radians*mix;
    var state = {
      active: active, mix: mix, duration: duration, elapsed: elapsed,
      waist: waist, neck: neck, pitch: pitch, headScale: headScale,
      sin: Math.sin(pitch), cos: Math.cos(pitch),
      cameraDistance: 560, cameraElevation: Math.tan(7*radians),
      shoulders: supported ? [p.sl.slice(), p.sr.slice()] : [[40, 45], [80, 45]],
      headMatrix: identity(), collar: [60, 43], chin: [60, 35]
    };
    state.projectedNeck = projectPoint(state, neck[0], neck[1]);
    state.projectedShoulders = state.shoulders.map(function (at) { return projectPoint(state, at[0], at[1]); });

    // The neck follows the waist hinge. A separate small nod foreshortens the
    // head around that moving neck instead of scaling the whole actor.
    // This retains the face painting and its UV identity, including eye patches.
    var headPitch = pitch + 7*radians*mix;
    var neckHeight = Math.max(0, waist[1]-neck[1]);
    var headScaleX = headScale*state.cameraDistance/(state.cameraDistance-(neckHeight+10)*state.sin);
    var headScaleY = headScaleX*(Math.cos(headPitch)-Math.sin(headPitch)*state.cameraElevation);
    state.headMatrix = [headScaleX, 0, 0, headScaleY,
      state.projectedNeck[0]-headScaleX*neck[0], state.projectedNeck[1]-headScaleY*neck[1]];
    state.chin = transformed(state.headMatrix, [neck[0], 35]);
    state.collar = projectPoint(state, neck[0], 43);
    return state;
  }

  function projectPoint(state, x, y, out) {
    out = out || [0, 0];
    if (!state || state.mix <= 0 || y >= state.waist[1]) { out[0] = x; out[1] = y; return out; }
    var height = state.waist[1]-y;
    // A short flexible waistband joins the upper body to an unmoving pelvis.
    // Shoes, knees and lower coat/skirt material receive no projection.
    var hinge = smooth(height/8), depth = height*state.sin*hinge;
    var perspective = state.cameraDistance/(state.cameraDistance-depth);
    var drop = height*(1-state.cos)*hinge+depth*state.cameraElevation;
    out[0] = state.waist[0]+(x-state.waist[0])*perspective;
    out[1] = y+drop;
    return out;
  }

  function composeBones(state, bones) {
    if (!state || (state.mix <= 0 && state.headScale === 1)) return bones;
    var next = bones.slice();
    // Gravity leaves the hanging arms their original lengths and rotations.
    // Only the shoulder anchors follow the bow; the forearm/hand/lantern follow
    // their existing matrices rather than inheriting torso foreshortening.
    if (state.mix > 0) [[1,2],[3,4]].forEach(function (ids, side) {
      var from = state.shoulders[side], to = state.projectedShoulders[side];
      ids.forEach(function (id) {
        var m = bones[id]; if (!m) return;
        next[id] = m.slice(); next[id][4] += to[0]-from[0]; next[id][5] += to[1]-from[1];
      });
    });
    if (bones[11]) next[11] = product(state.headMatrix, bones[11]);
    return next;
  }

  function projectVertex(state, restX, restY, skinnedX, skinnedY, weights, out) {
    out = out || [0, 0]; out[0] = skinnedX; out[1] = skinnedY;
    if (!state || state.mix <= 0 || restY >= state.waist[1]) return out;
    var body = 0;
    for (var i=0; i<weights.length; i++) if (weights[i][0] === 0) body += weights[i][1];
    if (body <= 0) return out;
    // Skinning already transformed the arm and head weights. Add only bone 0's
    // projected contribution: medial sleeve/head blends stay joined, and no
    // arm or head is projected twice. Use a reusable output array in the caller.
    var height = state.waist[1]-restY, hinge = smooth(height/8), depth = height*state.sin*hinge;
    var perspective = state.cameraDistance/(state.cameraDistance-depth);
    out[0] += body*(restX-state.waist[0])*(perspective-1);
    out[1] += body*(height*(1-state.cos)*hinge+depth*state.cameraElevation);
    return out;
  }

  function shadingUniforms(state, config, poseY) {
    if (!state || state.mix <= 0) return { form: [0,0,0,0], collar: [0,0,0,0], waist: [0,0,0,0] };
    var sy = poseY ? poseY[0] : 1, ty = poseY ? poseY[1] : 0;
    var width = Math.max(12, (state.projectedShoulders[1][0]-state.projectedShoulders[0][0])*.5);
    return {
      form: [state.mix, state.chin[0], state.chin[1]*sy+ty, config && config.night ? 1 : 0],
      collar: [state.collar[0], state.collar[1]*sy+ty, 14.5, 5.2*Math.abs(sy)],
      waist: [state.waist[0], state.waist[1]*sy+ty, width*.91, 3.1*Math.abs(sy)]
    };
  }

  function faceToneUniform(config) {
    // The original front face is substantially paler than the native greeting
    // face (source skin medians 253/230/217 versus 252/213/197). Correct that
    // material mismatch consistently in idle AND bow, before scene lighting.
    // Its existing expression donor already has the warmer greeting skin tone.
    return config && config.night && config.nativeArms && config.image === "hanjing-night-closed-native" ? 1 : 0;
  }

  // Insert once in the existing painted fragment shader; call
  // bowSurfaceShade(gl_FragColor.rgb, actorPosition) before the existing scene
  // light. It modifies RGB only, with no opacity, outlines, fog or image blur.
  var shadingGLSL = [
    "uniform vec4 bowForm; uniform vec4 bowCollar; uniform vec4 bowWaist; uniform float bowFaceTone;",
    "vec3 bowNightFaceTone(vec3 rgb,vec2 sourceUV){",
    " if(bowFaceTone<=0.0)return rgb;",
    " vec2 p=(sourceUV*vec2(1024.0,1536.0)-vec2(500.0,173.0))/vec2(122.0,158.0);",
    " float face=1.0-smoothstep(.74,1.15,dot(p,p));",
    " float skin=smoothstep(.56,.78,rgb.r)*smoothstep(.015,.055,rgb.r-rgb.b);",
    // Moon/window light comes from the scene's right; respect the canvas flip.
    // A narrow jaw/neck occlusion and opposite-cheek falloff add readable form
    // in idle as well as bow. These follow original material UVs, not a floating
    // screen-space face plate. The source eyes and skin texture stay untouched.
    " float side=p.x*surfaceLight.z;",
    " float key=smoothstep(-.72,.70,side)*.65+(1.0-smoothstep(.10,.75,p.y))*.35;",
    " vec2 cheek=vec2((side+.68)/.46,(p.y-.10)/.62);",
    " float cheekShade=(1.0-smoothstep(.15,1.0,dot(cheek,cheek)))*.035;",
    " vec2 jaw=vec2(p.x/.58,(p.y-.47)/.15);",
    " float jawShade=(1.0-smoothstep(.10,1.0,dot(jaw,jaw)))*.055;",
    " float form=mix(.91,1.015,key)-cheekShade-jawShade;",
    " float warm=smoothstep(-.55,.65,side)*(1.0-smoothstep(.4,1.0,abs(p.y)));",
    " vec3 response=vec3(.996,.926,.908)*form*vec3(1.0+.018*warm,1.0+.007*warm,1.0-.007*warm);",
    " return rgb*mix(vec3(1.0),response,face*skin*bowFaceTone);}",
    "float bowLocalShade(vec2 at, vec2 centre, vec2 size){",
    " vec2 q=(at-centre)/max(size,vec2(.001));",
    " return 1.0-smoothstep(.15,1.0,dot(q,q));}",
    "vec3 bowSurfaceShade(vec3 rgb,vec2 at){",
    " if(bowForm.x<=0.0)return rgb;",
    " float chin=bowLocalShade(at,vec2(bowForm.y,bowForm.z+1.8),vec2(10.8,3.3));",
    " float collar=bowLocalShade(at,bowCollar.xy,bowCollar.zw);",
    " float fold=bowLocalShade(at,vec2(bowWaist.x,bowWaist.y-1.3),bowWaist.zw);",
    " float shade=bowForm.x*(chin*.075+collar*.065+fold*.045);",
    " vec3 tone=mix(vec3(1.0,.96,.92),vec3(.91,.96,1.0),bowForm.w);",
    " return rgb*(vec3(1.0)-shade*tone);}",
  ].join("\n");

  A.bowDepth = {
    duration: duration, sample: sample, composeBones: composeBones,
    projectPoint: projectPoint, projectVertex: projectVertex,
    shadingUniforms: shadingUniforms, faceToneUniform: faceToneUniform, shadingGLSL: shadingGLSL
  };
})();
