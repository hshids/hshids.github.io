import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** A small, fully closed Packer Chapel keepsake, rather than a thick facade.
 * The simplified stone nave, rose window and circular apse retain the campus
 * identity. Roof, cornice and radial windows share the apse's physical axis.
 */
export function createLehighCampus({ source: s, quality = 'high' }) {
  const root = new THREE.Group(); root.name = 'lehigh-complete-chapel';
  const resources = new Set(), parts = [], buckets = new Map();
  const radial = quality === 'low' ? 24 : 48;
  function material(name, options) {
    const m = new THREE.MeshStandardMaterial({ roughness: .88, ...options });
    m.name = `lehigh-${name}`; resources.add(m); return m;
  }
  const stone = material('warm-sandstone', { color: '#b69c75' });
  const trim = material('carved-limestone', { color: '#d0b88c' });
  const base = material('grounded-stone-plinth', { color: '#958a73' });
  const roof = material('soft-slate-roof', { color: '#485664', roughness: .78 });
  const lead = material('window-lead-and-door-hardware', { color: '#45474b', metalness: .28 });
  const wood = material('recessed-oak-door', { color: '#665139' });
  const glass = material('stained-glass', { color: '#59696f', roughness: .46, emissive: '#ffc46d', emissiveIntensity: 0 });
  const roseGlass = material('rose-amber-glass', { color: '#d3a276', roughness: .5, emissive: '#ffd091', emissiveIntensity: 0 });
  const greenery = material('rounded-campus-planting', { color: '#647363' });
  const x = n => s.X(n), y = n => s.Y(n);

  function add(name, g, mat, position = [0, 0, 0], rotation = [0, 0, 0], extra = {}) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(matrix); g.computeBoundingBox();
    parts.push({ name, scene: 'education', min: g.boundingBox.min.toArray(), max: g.boundingBox.max.toArray(),
      construction: 'closed spatial chapel component', ...extra });
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    if (!buckets.has(mat)) buckets.set(mat, []); buckets.get(mat).push(g); return g;
  }
  function box(name, min, max, mat = stone, extra) {
    const a = new THREE.Vector3(...min), b = new THREE.Vector3(...max);
    return add(name, new THREE.BoxGeometry(...b.clone().sub(a).toArray()), mat, a.add(b).multiplyScalar(.5).toArray(), undefined, extra);
  }
  function prism(name, outline, front, depth, mat) {
    const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(...p)));
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: radial });
    return add(name, g, mat, [0, 0, front - depth]);
  }
  function cylinder(name, rTop, rBottom, h, p, mat) {
    return add(name, new THREE.CylinderGeometry(rTop, rBottom, h, radial), mat, p);
  }
  function pitched(name, left, right, bottom, eave, peak, front, back) {
    const cx = (left + right) / 2, half = (right - left) / 2;
    box(`${name}-walls`, [left, bottom, back], [right, eave, front]);
    prism(`${name}-stone-gable`, [[left,eave],[right,eave],[cx,peak]], front, front - back, stone);
    const rise = peak - eave, span = Math.hypot(half + .035, rise);
    const angle = Math.atan2(rise, half + .035);
    for (const side of [-1, 1]) add(`${name}-pitched-slate-${side}`,
      new THREE.BoxGeometry(span, .026, front - back + .095), roof,
      [cx + side * (half + .035) / 2, (eave + peak) / 2 + .018, (front + back) / 2], [0, 0, -side * angle]);
    // Closed ridge cap covers the meeting seam without protruding through a wall.
    add(`${name}-slate-ridge`,new THREE.CylinderGeometry(.016,.016,front-back+.095,radial),roof,
      [cx,peak+.025,(front+back)/2],[Math.PI/2,0,0]);
  }
  // The base contacts y=0; every wall/buttress terminates on its top at .105.
  box('lehigh-grounded-foundation', [x(25),0,-1.02], [x(723),.105,.145], base);
  const floor = .105, front = .025, back = -.905;
  pitched('lehigh-main-nave', x(215), x(427), floor, y(132), y(23), front, back);
  pitched('lehigh-left-wing', x(48), x(215), floor, y(183), y(109), -.007, -.80);
  pitched('lehigh-right-link', x(427), x(489), floor, y(183), y(145), -.034, -.72);

  // One shared XYZ centre for the circular wall, cornices and conical roof.
  const centre = [x(574), (floor + y(160)) / 2, -.44], radius = x(693) - x(574), wallTop = y(160);
  cylinder('lehigh-round-apse-wall', radius, radius, wallTop - floor, centre, stone);
  cylinder('lehigh-apse-foot-course', radius + .018, radius + .018, .075, [centre[0],floor + .0375,centre[2]], base);
  cylinder('lehigh-apse-cornice', radius + .027, radius + .027, .045, [centre[0],wallTop,centre[2]], trim);
  const apex = y(53), roofBase = wallTop + .022;
  cylinder('lehigh-shared-axis-conical-roof', 0, radius + .04, apex - roofBase,
    [centre[0], (apex + roofBase) / 2, centre[2]], roof);
  cylinder('lehigh-apse-attached-finial', .008, .012, .12, [centre[0],apex + .059,centre[2]], trim);

  function archShape(w, h) {
    const q = new THREE.Shape(); q.moveTo(-w/2, 0); q.lineTo(w/2,0); q.lineTo(w/2,h-w/2);
    q.absarc(0,h-w/2,w/2,0,Math.PI,false); q.lineTo(-w/2,0); return q;
  }
  function panel(name, w, h, position, angle = 0, isDoor = false) {
    // Surface mount is .012 in front of its wall, then a shallower inset pane.
    // At the apse, all axes point radially outward; rear panes have real backs.
    const q = new THREE.Group(); q.position.set(...position); q.rotation.y = angle;
    const pose = (offset, g, mat, suffix) => {
      const matrix = q.matrix.compose(q.position, q.quaternion, q.scale);
      g.translate(...offset); g.applyMatrix4(matrix);
      return add(`${name}-${suffix}`,g,mat);
    };
    pose([0,0,-.009],new THREE.ExtrudeGeometry(archShape(w+.031,h+.018),{depth:.02,bevelEnabled:false,curveSegments:radial}),trim,'stone-frame');
    pose([0,.013,.012],new THREE.ExtrudeGeometry(archShape(w,h-.022),{depth:.009,bevelEnabled:false,curveSegments:radial}),isDoor?wood:glass,'inset');
    const mid = new THREE.BoxGeometry(.008,h-w*.3,.012);
    pose([0,(h-w*.3)/2+.013,.026],mid,lead,'centre-mullion');
    if(!isDoor) for(const f of [.35,.66]) pose([0,h*f,.026],new THREE.BoxGeometry(w,.008,.012),lead,`cross-lead-${f}`);
    else pose([w*.2,h*.43,.034],new THREE.SphereGeometry(.008,8,6),lead,'door-knob');
  }
  for(const z of [front+.005,back-.005]) {
    const a = z>-.5?0:Math.PI;
    for(const nativeX of [91,132,174]) for(const nativeY of [257,347])
      panel(`lehigh-left-window-${z}-${nativeX}-${nativeY}`, .066, .202, [x(nativeX),y(nativeY),z], a);
    panel(`lehigh-nave-door-${z}`, .18, .40, [x(323),floor,z],a,true);
    for(const nativeX of [246,397]) panel(`lehigh-nave-lancet-${z}-${nativeX}`, .067, .265, [x(nativeX),y(347),z],a);
    const roseR = .215;
    add(`lehigh-rose-stone-surround-${z}`,new THREE.TorusGeometry(roseR,.02,8,radial),trim,[x(323),y(177),z+.024*Math.cos(a)]);
    add(`lehigh-rose-glass-${z}`,new THREE.CylinderGeometry(roseR-.021,roseR-.021,.018,radial),roseGlass,[x(323),y(177),z+.019*Math.cos(a)],[Math.PI/2,0,0]);
    for(let j=0;j<8;j++) add(`lehigh-rose-carved-ray-${z}-${j}`,new THREE.BoxGeometry(.011,(roseR-.022)*2,.014),trim,
      [x(323),y(177),z+.031*Math.cos(a)],[0,0,j*Math.PI/8]);
    add(`lehigh-rose-centre-${z}`,new THREE.SphereGeometry(.027,12,8),trim,[x(323),y(177),z+.035*Math.cos(a)]);
  }
  for(let j=0;j<8;j++) {
    const a=j/8*Math.PI*2, sin=Math.sin(a), cos=Math.cos(a);
    panel(`lehigh-apse-radial-window-${j}`, .09, .40,
      [centre[0]+(radius+.004)*sin,.27,centre[2]+(radius+.004)*cos],a);
    const b=a+Math.PI/8;
    cylinder(`lehigh-apse-attached-pilaster-${j}`,.012,.015,wallTop-floor-.035,
      [centre[0]+radius*Math.sin(b),(floor+wallTop)/2,centre[2]+radius*Math.cos(b)],trim);
  }
  for(const nativeX of [48,215,427]) {
    const xx=x(nativeX),top=nativeX===48?y(187):y(146);
    box(`lehigh-front-buttress-${nativeX}`,[xx-.025,floor,front-.015],[xx+.025,top,front+.045],trim);
    box(`lehigh-rear-buttress-${nativeX}`,[xx-.025,floor,back-.035],[xx+.025,top,back+.015],trim);
  }
  for(let i=0;i<4;i++) box(`lehigh-door-step-${i}`,
    [x(323)-.16-i*.018,0,front+.04+i*.04], [x(323)+.16+i*.018,.10-i*.023,front+.08+i*.04],base);
  for(let j=0;j<5;j++) {
    const xx=x(55+j*22),r=.05+j%2*.012;
    add(`lehigh-rounded-low-shrub-${j}`,new THREE.SphereGeometry(r,12,8),greenery,[xx,floor+r*.6,.083]);
  }
  const doorLight=new THREE.PointLight('#ffd29a',0,.9,2);doorLight.name='lehigh-real-entry-warm-light';
  doorLight.position.set(x(323),.56,.15);root.add(doorLight);
  // Merge static pieces by material. Shape and lighting remain identical on low tier.
  let triangles=0;
  for(const [mat,gs] of buckets) {
    const converted=gs.map(g=>g.index?g.toNonIndexed():g), merged=mergeGeometries(converted,false);
    if(!merged)throw new Error(`Cannot merge Lehigh ${mat.name}`);
    for(const g of new Set([...gs,...converted]))g.dispose();
    merged.computeBoundingBox();merged.computeBoundingSphere();resources.add(merged);
    const mesh=new THREE.Mesh(merged,mat);mesh.name=`lehigh-merged-${mat.name}`;mesh.castShadow=true;mesh.receiveShadow=true;
    triangles+=merged.attributes.position.count/3;root.add(mesh);
  }
  const setTheme=dark=>{glass.emissiveIntensity=dark?1.05:0;roseGlass.emissiveIntensity=dark?.9:0;doorLight.intensity=dark?.12:0;};
  setTheme(false);
  return {root,resources,parts,setTheme,diagnostics:{triangles,drawCalls:buckets.size,groundY:0,apseAxis:[centre[0],centre[2]],style:'warm simplified fully spatial chapel'}};
}
