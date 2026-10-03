import * as THREE from 'three';
import {acquirePaintTexture,releasePaintTexture,fitPaintCanvas,worldAssetURL} from './fidelity-assets.js';

/**
 * A front-view reconstruction of the existing painted Research pavilion.
 *
 * The painting supplies the colour of individually constructed architectural
 * surfaces. It is not placed on a whole-building rectangle. Roofs are closed,
 * curved solids; columns are tapered round solids; walls, shelves, plaque and
 * stairs have separate depths. The unseen rear construction is inferred, so
 * this is deliberately a limited-angle material/volume study, not a recovered
 * 360-degree model or a claim of complete one-to-one 3D reconstruction.
 */
export async function createFaithfulResearch({ data, quality='high' } = {}) {
  const root = new THREE.Group();
  root.name = 'research-original-painting-solid-study';
  const resources = new Set();
  const acquired = new Set();
  const parts = [];
  const batches = new Map();
  const lights = [];
  let triangleCount=0;
  const source = { width: 1568, height: 1003, crop: [17, 32, 1551, 965] };
  const width = 15.34, height = 9.82;
  const sx = .01, sy = height / 933;
  const upperDepth=-2.6;
  const X = px => (px - 784) * sx;
  const Y = py => (965 - py) * sy;
  const originalUV = (x, y) => [(x / sx + 784) / source.width, 1 - (965 - y / sy) / source.height];

  const [painting, scholar] = await Promise.all([
    acquirePaintTexture(worldAssetURL('assets/art/research-painted.webp'),{quality}),
    acquirePaintTexture(worldAssetURL('assets/art/scholar-painted.webp'),{quality})
  ]);
  for (const texture of [painting, scholar]) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    acquired.add(texture);
  }

  // The original facade image has a blank plaque: its label was rendered by
  // paint.js at SVG (0, 288.235). Bake that same label into the wood surface,
  // rather than suspend a separate text plane in front of the building.
  const facadeCanvas = document.createElement('canvas');
  facadeCanvas.width = source.width; facadeCanvas.height = source.height;
  const facadeContext = facadeCanvas.getContext('2d');
  facadeContext.drawImage(painting.image, 0, 0, source.width, source.height);
  const label = 'RESEARCH';
  const fontSize = 14 / (384 / 933), spacing = 1 / (600 / 1534);
  facadeContext.font = `${fontSize}px Georgia, serif`;
  facadeContext.textBaseline = 'alphabetic';
  const glyphWidths = [...label].map(letter => facadeContext.measureText(letter).width);
  const textWidth = glyphWidths.reduce((a, b) => a + b, 0) + spacing * (label.length - 1);
  const textY = 32 + (288.235 - 177.235) / (384 / 933);
  function lettering(dx, dy, color) {
    facadeContext.fillStyle = color;
    let cursor = 784 - textWidth / 2 + dx;
    [...label].forEach((letter, i) => { facadeContext.fillText(letter, cursor, textY + dy); cursor += glyphWidths[i] + spacing; });
  }
  lettering(.8, 1.1, '#482916');
  lettering(0, 0, '#f4e8ce');
  let sourceAlpha = facadeContext.getImageData(0,0,source.width,source.height).data;
  const facade = new THREE.CanvasTexture(fitPaintCanvas(facadeCanvas,quality));
  facade.colorSpace = THREE.SRGBColorSpace; facade.anisotropy = 4; resources.add(facade);

  const front = new THREE.MeshBasicMaterial({ map: facade, alphaTest: .12, toneMapped: false });
  const timberSide = new THREE.MeshStandardMaterial({ map: painting, color: '#77716b', roughness: .84, alphaTest: .12 });
  timberSide.emissiveMap=painting;timberSide.emissive.set('#ffffff');timberSide.emissiveIntensity=0;
  const bookFront = new THREE.MeshBasicMaterial({ map: scholar, alphaTest: .08, toneMapped: false });
  const bookSide = new THREE.MeshStandardMaterial({ map: scholar, color: '#c9bca0', roughness: .9 });
  const illuminatedPane = new THREE.MeshBasicMaterial({map:facade,toneMapped:false});
  illuminatedPane.name='original-warm-window-panes';
  [front, timberSide, bookFront, bookSide, illuminatedPane].forEach(material => resources.add(material));
  front.name = 'unaltered-original-painted-fronts';
  timberSide.name = 'original-timber-slate-stone-side-samples';
  bookFront.name = 'original-chinese-book-spines';
  bookSide.name = 'original-book-cloth-and-paper-sides';

  // All static faces sharing a material are merged. The part manifest retains
  // their actual individual construction bounds for review and interaction.
  function tri(material, a, b, c, ua, ub, uc) {
    triangleCount++;
    if (!batches.has(material)) batches.set(material, { positions: [], normals: [], uv: [] });
    const batch = batches.get(material);
    const n = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a))
      .cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c), new THREE.Vector3(...a))).normalize();
    for (const [p, uv] of [[a, ua], [b, ub], [c, uc]]) {
      batch.positions.push(...p); batch.normals.push(n.x, n.y, n.z); batch.uv.push(...uv);
    }
  }
  function quad(material, points, uv) {
    tri(material, points[0], points[1], points[2], uv[0], uv[1], uv[2]);
    tri(material, points[0], points[2], points[3], uv[0], uv[2], uv[3]);
  }
  function cropUV(rect, image = source) {
    const [l, t, r, b] = rect;
    return [[l / image.width, 1 - b / image.height], [r / image.width, 1 - b / image.height],
      [r / image.width, 1 - t / image.height], [l / image.width, 1 - t / image.height]];
  }
  const woodPatch = [530, 560, 1070, 582];
  const stonePatch = [94, 914, 381, 952];
  const slatePatch = [527, 448, 1101, 498];
  const plasterPatch = [713, 339, 871, 377];

  function boxWorld(name, minX, minY, maxX, maxY, z, depth, patch, faceMat = front, sideMat = timberSide, frontUV = originalUV, atlas = source) {
    if(name.startsWith('upper-'))z+=upperDepth;
    const a = [minX, minY, z], b = [maxX, minY, z], c = [maxX, maxY, z], d = [minX, maxY, z];
    const ae = [minX, minY, z - depth], be = [maxX, minY, z - depth], ce = [maxX, maxY, z - depth], de = [minX, maxY, z - depth];
    quad(faceMat, [a, b, c, d], [a, b, c, d].map(p => frontUV(p[0], p[1])));
    const uv = cropUV(patch, atlas);
    quad(sideMat, [b, be, ce, c], uv);
    quad(sideMat, [ae, a, d, de], uv);
    quad(sideMat, [d, c, ce, de], uv);
    quad(sideMat, [ae, be, b, a], uv);
    quad(sideMat, [be, ae, de, ce], uv);
    if (!name.startsWith('lattice-relief-')) parts.push({ name, kind: 'closed-box', bounds: [minX, minY, z - depth, maxX, maxY, z], depth });
  }
  function box(name, rect, z, depth, patch = woodPatch) {
    boxWorld(name, X(rect[0]), Y(rect[3]), X(rect[2]), Y(rect[1]), z, depth, patch);
  }
  function windowBay(name,rect,windowRect,z,depth){
    const[l,t,r,b]=rect,[wl,wt,wr,wb]=windowRect;
    box(`${name}-left`,[l,t,wl,b],z,depth);box(`${name}-right`,[wr,t,r,b],z,depth);
    box(`${name}-above`,[wl,t,wr,wt],z,depth);box(`${name}-below`,[wl,wb,wr,b],z,depth);
  }

  // Keep the original cut-out silhouette on the physical edge as well as on
  // the front material. A loose traced edge can otherwise leave an unpainted
  // floating seam when viewed obliquely.
  function paintedContour(contour) {
    const minX=Math.ceil(Math.max(17,Math.min(...contour.map(p=>p[0]))));
    const maxX=Math.floor(Math.min(1551,Math.max(...contour.map(p=>p[0]))));
    const top=[],bottom=[];
    for(let x=minX;x<=maxX;x+=2){
      const crosses=[];
      for(let i=0;i<contour.length;i++){
        const a=contour[i],b=contour[(i+1)%contour.length];
        if((a[0]<=x&&b[0]>x)||(b[0]<=x&&a[0]>x))crosses.push(a[1]+(x-a[0])/(b[0]-a[0])*(b[1]-a[1]));
      }
      if(crosses.length<2)continue;
      const low=Math.max(32,Math.floor(Math.min(...crosses))),high=Math.min(965,Math.ceil(Math.max(...crosses)));
      let first=-1,last=-1;
      for(let y=low;y<=high;y++)if(sourceAlpha[(y*source.width+x)*4+3]>=28){if(first<0)first=y;last=y;}
      if(first<0)continue;top.push([x,first]);bottom.push([x,last]);
    }
    function simplify(points){
      if(points.length<=2)return points;
      const a=points[0],b=points.at(-1),dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
      let farthest=0,index=0;
      for(let i=1;i<points.length-1;i++){
        const p=points[i],t=den?THREE.MathUtils.clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den,0,1):0;
        const distance=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;
        if(distance>farthest){farthest=distance;index=i;}
      }
      if(farthest<=1.15**2)return[a,b];
      const left=simplify(points.slice(0,index+1)),right=simplify(points.slice(index));return[...left.slice(0,-1),...right];
    }
    return top.length>2?[...simplify(top),...simplify(bottom).reverse()]:contour;
  }

  // Each roof is a nonplanar, closed surface. Its sloping tile courses and
  // upturned eaves follow the painted silhouette, rather than a new roof style.
  function roof(name, contour, ridgeY, eaveY, depth) {
    const outline = paintedContour(contour).map(([px, py]) => new THREE.Vector2(X(THREE.MathUtils.clamp(px, 17, 1551)), Y(py)));
    if (THREE.ShapeUtils.isClockWise(outline)) outline.reverse();
    const triangles = THREE.ShapeUtils.triangulateShape(outline, []);
    function roofZ(x, y) {
      const px = x / sx + 784, py = 965 - y / sy;
      const t = THREE.MathUtils.clamp((py - ridgeY) / (eaveY - ridgeY), 0, 1);
      const tileDepth = Math.pow(Math.sin((px - 286) * Math.PI / 35), 2) * .024 * Math.sin(t * Math.PI);
      return -depth * (1 - t) - tileDepth+(name.startsWith('upper-')?upperDepth:0);
    }
    function subdivide(a, b, c, level = 0) {
      if (level < 7 && Math.max(a.distanceToSquared(b), b.distanceToSquared(c), c.distanceToSquared(a)) > (quality==='low'?.43:.28) ** 2) {
        const ab = a.clone().add(b).multiplyScalar(.5), bc = b.clone().add(c).multiplyScalar(.5), ca = c.clone().add(a).multiplyScalar(.5);
        subdivide(a, ab, ca, level + 1); subdivide(ab, b, bc, level + 1);
        subdivide(ca, bc, c, level + 1); subdivide(ab, bc, ca, level + 1); return;
      }
      const points = [a, b, c].map(p => [p.x, p.y, roofZ(p.x, p.y)]);
      tri(front, ...points, ...points.map(p => originalUV(p[0], p[1])));
      // Thickness runs behind the painted silhouette. Extruding down in Y
      // would invent a dark fascia that was not present in the original art.
      const under = points.map(p => [p[0], p[1], p[2] - .14]);
      tri(timberSide, under[2], under[1], under[0], ...[points[2],points[1],points[0]].map(p=>originalUV(p[0],p[1])));
    }
    triangles.forEach(indices => subdivide(...indices.map(i => outline[i])));
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      const points=[[a.x, a.y, roofZ(a.x, a.y)], [a.x, a.y, roofZ(a.x, a.y) - .14],
        [b.x, b.y, roofZ(b.x, b.y) - .14], [b.x, b.y, roofZ(b.x, b.y)]];
      quad(timberSide,points,points.map(p=>originalUV(p[0],p[1])));
    }
    parts.push({ name, kind: 'closed-curved-pitched-roof', depth, thickness: .14, tileRelief: .024 });
  }

  roof('upper-original-curved-tile-roof', [
    [275,72],[283,73],[288,91],[300,109],[333,121],[377,124],[411,107],[434,86],
    [441,65],[439,44],[445,32],[453,38],[475,47],[491,48],[494,64],[489,76],
    [499,84],[1068,84],[1073,67],[1072,50],[1090,50],[1111,41],[1123,33],[1131,37],
    [1130,71],[1138,92],[1165,111],[1201,121],[1237,122],[1266,106],[1278,84],
    [1279,72],[1288,72],[1298,91],[1290,128],[1277,156],[1259,178],[1222,194],
    [1169,201],[1116,208],[459,207],[369,191],[306,170],[281,144],[275,104]
  ], 83, 187, 2.55);
  roof('lower-original-curved-tile-roof', [
    [17,397],[26,424],[48,440],[90,450],[135,443],[177,421],[198,391],[204,356],
    [209,339],[220,346],[247,356],[269,362],[265,380],[280,391],[450,397],[780,401],
    [1110,398],[1240,391],[1317,379],[1323,357],[1344,346],[1354,343],[1361,352],
    [1358,391],[1386,420],[1430,443],[1464,450],[1498,443],[1523,424],[1540,397],
    [1549,398],[1551,422],[1541,457],[1525,488],[1490,522],[1432,541],[1330,558],
    [260,558],[130,547],[78,530],[43,509],[22,480],[17,443]
  ], 397, 519, 3.55);

  // Closed facade pieces are intentionally separated from the projecting
  // roofs, round columns, shelf edges and windows. Behind each shelf is a
  // recessed wall panel, with no second baked shelf hidden behind it.
  function contourSolid(name, contour, z, depth, patch = woodPatch) {
    if(name.startsWith('upper-'))z+=upperDepth;
    const outline = paintedContour(contour).map(([px, py]) => new THREE.Vector2(X(px), Y(py)));
    if (THREE.ShapeUtils.isClockWise(outline)) outline.reverse();
    for (const indices of THREE.ShapeUtils.triangulateShape(outline, [])) {
      const p = indices.map(i => [outline[i].x, outline[i].y, z]);
      tri(front, ...p, ...p.map(v => originalUV(v[0], v[1])));
      tri(timberSide, [p[2][0],p[2][1],z-depth], [p[1][0],p[1][1],z-depth], [p[0][0],p[0][1],z-depth], ...cropUV(patch).slice(0,3));
    }
    for(let i=0;i<outline.length;i++){
      const a=outline[i],b=outline[(i+1)%outline.length];
      quad(timberSide,[[a.x,a.y,z],[a.x,a.y,z-depth],[b.x,b.y,z-depth],[b.x,b.y,z]],cropUV(patch));
    }
    parts.push({name,kind:'closed-contoured-timber-volume',depth});
  }
  contourSolid('upper-under-eave-timber', [[305,194],[1262,194],[1250,212],[1228,230],[1198,250],[1165,268],
    [1139,268],[1118,246],[449,246],[431,265],[404,265],[369,249],[340,233],[318,213]], -.11, 2.45);
  box('upper-floor-beam', [375,382,1205,416], -.36, 2.55, [392,384,1183,405]);
  contourSolid('upper-left-outer-plaster', [[377,265],[418,265],[418,383],[377,383]], -.92, 2, plasterPatch);
  contourSolid('upper-right-outer-plaster', [[1161,266],[1206,266],[1206,383],[1161,383]], -.92, 2, plasterPatch);
  windowBay('upper-left-window-bay', [451,248,607,385], [504,271,590,372], -.68, 1.85);
  windowBay('upper-right-window-bay', [963,248,1120,385], [977,271,1068,372], -.68, 1.85);
  box('upper-wall-left-of-plaque', [646,249,682,385], -.9, 1.65, plasterPatch);
  box('upper-wall-right-of-plaque', [894,249,925,385], -.9, 1.65, plasterPatch);
  box('upper-wall-above-plaque', [682,248,894,256], -.9, 1.65, plasterPatch);
  box('upper-wall-below-plaque', [682,320,894,385], -.9, 1.65, plasterPatch);
  [[417,451],[606,646],[924,964],[1119,1162]].forEach(([l,r],i)=>box(`upper-integrated-column-backing-${i+1}`,[l,248,r,386],-.96,1.59));
  box('research-engraved-wood-plaque', [682,255,894,322], -.56+upperDepth, .26);
  contourSolid('lower-under-eave-timber', [[49,505],[1516,505],[1504,527],[1465,551],[1411,580],[1363,602],
    [1337,592],[246,592],[225,603],[173,582],[117,557],[78,533]], -.14, 3.42);
  box('lower-main-architrave', [198,555,1380,605], -.32, 3.6);
  contourSolid('lower-left-outer-plaster', [[128,584],[161,584],[161,868],[128,868]], -1.08, 3.15, plasterPatch);
  contourSolid('lower-right-outer-plaster', [[1410,584],[1453,584],[1453,868],[1410,868]], -1.08, 3.15, plasterPatch);
  windowBay('lower-left-door-bay', [201,586,379,871], [279,629,352,762], -.86, 3.25);
  windowBay('lower-right-door-bay', [1205,586,1373,871], [1210,630,1276,763], -.86, 3.25);
  box('lower-shelf-left-frame', [429,580,482,856], -.77, 3.35);
  box('lower-shelf-right-frame', [1093,580,1146,856], -.77, 3.35);
  [[158,202],[377,431],[1144,1207],[1370,1412]].forEach(([l,r],i)=>box(`lower-integrated-column-backing-${i+1}`,[l,581,r,871],-1.12,3));
  [[605,661],[677,737],[751,818],[836,855]].forEach(([t,b], i) => {
    box(`recessed-shelf-wall-${i + 1}`, [478,t,1097,b], -2.47, 1.62, plasterPatch);
  });
  [[660,678],[737,751],[818,837]].forEach(([t,b], i) => {
    box(`real-wood-book-shelf-${i + 1}`, [471,t,1098,b], -.66, 1.85);
  });
  box('shelf-bottom-rail', [470,835,1100,856], -.61, 3.48);

  function roundColumn(name, px, shaftTop, shaftBottom, baseBottom, radius, baseRadius, z) {
    if(name.startsWith('upper-'))z+=upperDepth;
    // Changing profile gives the stone plinth, collar and tapered shaft actual
    // round silhouettes. A half-cylinder is not cut out of the photograph.
    const profile = [[baseBottom, baseRadius], [baseBottom - 7, baseRadius],
      [baseBottom - 18, baseRadius * .84], [shaftBottom + 3, baseRadius * .72],
      [shaftBottom - 3, radius * 1.08], [shaftBottom - 11, radius],
      [shaftTop + 8, radius * .99], [shaftTop, radius * 1.06]];
    const cx = X(px), segments = 48;
    const stoneUV = cropUV(stonePatch), woodUV = cropUV(woodPatch);
    for (let j = 0; j < profile.length - 1; j++) {
      const [py0,r0] = profile[j], [py1,r1] = profile[j+1];
      for (let i = 0; i < segments; i++) {
        const t0 = i / segments * Math.PI * 2 - Math.PI, t1 = (i + 1) / segments * Math.PI * 2 - Math.PI;
        const points = [[cx + Math.sin(t0)*r0,Y(py0),z+Math.cos(t0)*r0],
          [cx + Math.sin(t1)*r0,Y(py0),z+Math.cos(t1)*r0],
          [cx + Math.sin(t1)*r1,Y(py1),z+Math.cos(t1)*r1],
          [cx + Math.sin(t0)*r1,Y(py1),z+Math.cos(t0)*r1]];
        const facing = Math.cos((t0 + t1) / 2) >= 0;
        quad(facing ? front : timberSide, points, facing ? points.map(p => originalUV(p[0], p[1])) : j < 3 ? stoneUV : woodUV);
      }
    }
    // True solid ends, including the broad, grounded stone base.
    for (const [py,r,direction] of [[...profile[0],-1],[...profile.at(-1),1]]) {
      for (let i = 0; i < segments; i++) {
        const t0 = i / segments * Math.PI * 2, t1 = (i + 1) / segments * Math.PI * 2;
        const p = [[cx,Y(py),z],[cx+Math.sin(t0)*r,Y(py),z+Math.cos(t0)*r],[cx+Math.sin(t1)*r,Y(py),z+Math.cos(t1)*r]];
        if (direction < 0) p.reverse();
        tri(timberSide,...p,...(direction < 0 ? stoneUV : woodUV).slice(0,3));
      }
    }
    parts.push({name,kind:'closed-tapered-round-column',radius,baseRadius,z,depth:baseRadius*2});
  }
  [[436,.159,.247],[626,.146,.251],[944,.143,.258],[1137,.16,.25]].forEach(([px,r,br],i) => {
    roundColumn(`upper-round-column-${i+1}`,px,231,386,414,r,br,-.40);
  });
  [[179.5,.164,.344],[397,.15,.38],[1177.5,.15,.354],[1389.5,.165,.365]].forEach(([px,r,br],i) => {
    roundColumn(`lower-round-column-${i+1}`,px,570,839,887,r,br,-.40);
  });

  // The original carved corner brackets are small individual timber volumes
  // with their own silhouette, not four newly invented repeated ornaments.
  function bracket(name, rect, z, depth) {
    if(name.startsWith('upper-'))z+=upperDepth;
    const [l,t,r,b] = rect;
    const pts = [[l,t],[r,t],[r,t+(b-t)*.22],[l+(r-l)*.27,b],[l,b]].map(([x,y])=>new THREE.Vector2(X(x),Y(y)));
    if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
    for (const indices of THREE.ShapeUtils.triangulateShape(pts,[])) {
      const p=indices.map(i=>[pts[i].x,pts[i].y,z]);
      tri(front,...p,...p.map(a=>originalUV(a[0],a[1])));
      tri(timberSide,[p[2][0],p[2][1],z-depth],[p[1][0],p[1][1],z-depth],[p[0][0],p[0][1],z-depth],...cropUV(woodPatch).slice(0,3));
    }
    for(let i=0;i<pts.length;i++){
      const a=pts[i],b=pts[(i+1)%pts.length];
      quad(timberSide,[[a.x,a.y,z],[a.x,a.y,z-depth],[b.x,b.y,z-depth],[b.x,b.y,z]],cropUV(woodPatch));
    }
    parts.push({name,kind:'closed-carved-bracket',depth});
  }
  [[450,253,508,297],[646,251,699,299],[874,251,925,298],[1068,251,1121,298]].forEach((rect,i)=>bracket(`upper-carved-bracket-${i+1}`,rect,-.43,.19));
  [[202,582,277,639],[317,582,378,639],[420,582,486,639],[1074,582,1143,639],[1193,582,1258,639],[1310,582,1375,639]].forEach((rect,i)=>bracket(`lower-carved-bracket-${i+1}`,rect,-.52,.20));

  // Window mouldings project from the recessed illuminated lattice painting.
  [[504,271,590,372],[977,271,1068,372],[279,629,352,762],[1210,630,1276,763]].forEach((rect,i)=>{
    const [l,t,r,b]=rect;
    const depthOffset=i<2?upperDepth:0;
    boxWorld(`lattice-recess-${i+1}`,X(l),Y(b),X(r),Y(t),-.99+depthOffset,.11,woodPatch,illuminatedPane);
    box(`lattice-frame-left-${i+1}`,[l-5,t-5,l,b+5],-.81+depthOffset,.24);
    box(`lattice-frame-right-${i+1}`,[r,t-5,r+5,b+5],-.81+depthOffset,.24);
    box(`lattice-frame-top-${i+1}`,[l,t-5,r,t],-.81+depthOffset,.24);
    box(`lattice-frame-bottom-${i+1}`,[l,b,r,b+5],-.81+depthOffset,.24);
    // Recover shallow lattice relief from the painting's dark timber pixels.
    // No colour replacement: the front still samples the original exact UV.
    const pixels=facadeContext.getImageData(l,t,r-l,b-t),pw=r-l;
    for(let py=t;py<b;py+=3)for(let px=l;px<r;px+=3){
      const ix=Math.min(pw-1,px-l+1),iy=Math.min(b-t-1,py-t+1),offset=(iy*pw+ix)*4;
      const luminance=pixels.data[offset]*.2126+pixels.data[offset+1]*.7152+pixels.data[offset+2]*.0722;
      if(luminance<136) box(`lattice-relief-${i+1}-${px}-${py}`,[px,py,Math.min(r,px+3),Math.min(b,py+3)],-.957+depthOffset,.034);
    }
    const light=new THREE.PointLight('#ffc56e',0,4.3,2);light.position.set(X((l+r)/2),Y((t+b)/2),-.53+depthOffset);root.add(light);lights.push(light);
  });

  // The platform and successive stair fronts meet the original bottom y=0.
  // Each riser advances in depth and is an actual closed stone solid.
  // The central staircase is a genuine opening in the platform. A single
  // full-width plinth box would invisibly occupy the same space as its risers.
  box('timber-ground-floor-left', [145,854,391,888], -.35, 5.18);
  box('timber-ground-floor-right', [1174,854,1435,888], -.35, 5.18);
  box('central-timber-landing', [439,854,1129,891], -.63, 4.95);
  box('grounded-stone-platform-left', [74,887,395,953], -.18, 5.4, stonePatch);
  box('grounded-stone-platform-right', [1174,887,1495,953], -.18, 5.4, stonePatch);
  box('grounded-stone-platform-rear', [395,887,1174,953], -.63, 4.95, stonePatch);
  box('upper-central-stair', [416,891,1153,916], -.42, 1.9, stonePatch);
  box('middle-central-stair', [402,916,1168,941], -.19, 2.13, stonePatch);
  box('lower-central-stair', [395,941,1174,965], 0, 2.32, stonePatch);
  box('left-carved-stair-kerb', [391,893,439,965], -.03, 2.29, stonePatch);
  box('right-carved-stair-kerb', [1129,892,1174,965], -.03, 2.29, stonePatch);

  // Reconstruct the pre-existing publication order and spine widths. This
  // module does not replace or rewrite any publication or English script.
  const content = data ?? (typeof window !== 'undefined' ? window.HJ_DATA : null);
  const themes = content?.themes ?? [];
  const pubs = content?.publications ?? [];
  const order = themes.map(theme=>theme.id);
  const sorted = pubs.slice().sort((a,b)=>order.indexOf(a.theme)-order.indexOf(b.theme)||(a.date<b.date?1:-1));
  const rows = [sorted.filter(p=>p.theme==='agents'||p.theme==='teaming'),sorted.filter(p=>p.theme==='persona'||p.theme==='platforms'),sorted.filter(p=>p.theme==='education')];
  const realContent=pubs.length>0;
  if(!realContent) rows.forEach((row,i)=>{ for(let j=0;j<[12,10,9][i];j++)row.push({title:'Original shelf study',id:`study-${i}-${j}`}); });
  let randomSeed=97;
  function rand(){randomSeed=randomSeed+0x6D2B79F5|0;let t=Math.imul(randomSeed^randomSeed>>>15,1|randomSeed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}
  const scholarSize={width:1536,height:1024};
  const spineCrops=[[373,63,432,535],[866,62,918,541],[1358,68,1424,542]];
  const bodyCrops=[[130,61,345,529],[627,57,854,531],[1115,58,1350,530]];
  const displayScaleX=width/600,displayScaleY=height/384;
  const rowBaseline=[436.435,467.435,500.935];
  let bookIndex=0;
  const bookManifest=[];
  rows.forEach((row,ri)=>{
    let cursor=-120;
    row.forEach(paper=>{
      const w=16+Math.floor(rand()*6),h=32+Math.floor(rand()*9);rand();
      const bw=w*.73,bh=Math.min(28,h*.7),x=cursor*displayScaleX,y=(561.235-rowBaseline[ri])*displayScaleY;
      const crop=spineCrops[bookIndex%3],side=bodyCrops[bookIndex%3],worldWidth=bw*displayScaleX,worldHeight=bh*displayScaleY;
      const uv=(vx,vy)=>[(crop[0]+(vx-x)/worldWidth*(crop[2]-crop[0]))/scholarSize.width,
        1-(crop[3]-(vy-y)/worldHeight*(crop[3]-crop[1]))/scholarSize.height];
      const z=-.665,depth=.43+(bookIndex%3)*.025;
      boxWorld(`publication-spine-${paper.id||bookIndex}`,x,y,x+worldWidth,y+worldHeight,z,depth,side,bookFront,bookSide,uv,scholarSize);
      bookManifest.push({paper,position:[x+worldWidth/2,y+worldHeight/2,z],size:[worldWidth,worldHeight,depth]});
      cursor+=bw+2;bookIndex++;
    });
  });

  // Bamboo manuscript: real rolled ends and joined slats on the lowest shelf.
  // Original scholar paint remains on its curved surfaces.
  function bambooRoll(name,cx,cy,cz,radius,length,crop,orientation='x'){
    const segments=28,uv=cropUV(crop,scholarSize);
    for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
      const p=orientation==='x'?[[cx-length/2,cy+Math.sin(a)*radius,cz+Math.cos(a)*radius],[cx+length/2,cy+Math.sin(a)*radius,cz+Math.cos(a)*radius],
        [cx+length/2,cy+Math.sin(b)*radius,cz+Math.cos(b)*radius],[cx-length/2,cy+Math.sin(b)*radius,cz+Math.cos(b)*radius]]:
        [[cx+Math.sin(a)*radius,cy,cz+Math.cos(a)*radius],[cx+Math.sin(b)*radius,cy,cz+Math.cos(b)*radius],
          [cx+Math.sin(b)*radius,cy+length,cz+Math.cos(b)*radius],[cx+Math.sin(a)*radius,cy+length,cz+Math.cos(a)*radius]];
      quad(bookSide,p,uv);
    }
    parts.push({name,kind:'round-bamboo-manuscript',radius,length});
  }
  const bambooY=(561.235-501.235)*displayScaleY;
  for(let i=0;i<17;i++)bambooRoll(`joined-bamboo-slat-${i+1}`,-.50+i*.071,bambooY+.043,-1.04,.037,.52,[702,690,816,915],'y');
  bambooRoll('rolled-bamboo-manuscript-left',-.58,bambooY+.087,-.82,.087,.57,[649,700,711,942],'y');
  bambooRoll('rolled-bamboo-manuscript-right',.73,bambooY+.07,-1.03,.07,.53,[650,700,711,942],'y');
  for(let i=0;i<3;i++)bambooRoll(`standing-silk-scroll-${i+1}`,1.35+i*.13,bambooY,-1.01-i*.033,.058,.53+(i%2)*.07,[1228,610,1361,930],'y');

  // Preserve the original small plant as separate real pot and leaf volumes.
  // The green/burnished glaze colours are sampled from the original accessory.
  const props=await acquirePaintTexture(worldAssetURL('assets/art/belongings-painted.webp'),{quality});
  acquired.add(props);
  const plantFront=new THREE.MeshBasicMaterial({map:props,alphaTest:.12,toneMapped:false});
  const plantSide=new THREE.MeshStandardMaterial({map:props,color:'#9da796',roughness:.72,alphaTest:.12});
  resources.add(plantFront);resources.add(plantSide);
  const plantCrop=[24,734,349,1063],plantSize={width:1448,height:1086};
  const plantX=84*displayScaleX,plantY=(561.235-500.235)*displayScaleY,plantW=28*displayScaleX,plantH=28*displayScaleY;
  const plantUV=(x,y)=>[(plantCrop[0]+(x-plantX)/plantW*(plantCrop[2]-plantCrop[0]))/plantSize.width,
    1-(plantCrop[3]-(y-plantY)/plantH*(plantCrop[3]-plantCrop[1]))/plantSize.height];
  const potCX=plantX+plantW*.54,potBottom=plantY+.03,potTop=plantY+plantH*.44,potZ=-.86;
  const potProfile=[[potBottom,.12],[potBottom+.06,.16],[potTop-.06,.176],[potTop,.16]];
  for(let j=0;j<potProfile.length-1;j++)for(let i=0;i<32;i++){
    const a=i/32*Math.PI*2,b=(i+1)/32*Math.PI*2;
    const [ya,ra]=potProfile[j],[yb,rb]=potProfile[j+1];
    const p=[[potCX+Math.sin(a)*ra,ya,potZ+Math.cos(a)*ra],[potCX+Math.sin(b)*ra,ya,potZ+Math.cos(b)*ra],
      [potCX+Math.sin(b)*rb,yb,potZ+Math.cos(b)*rb],[potCX+Math.sin(a)*rb,yb,potZ+Math.cos(a)*rb]];
    const face=Math.cos((a+b)/2)>0;quad(face?plantFront:plantSide,p,face?p.map(v=>plantUV(v[0],v[1])):cropUV([158,949,296,1053],plantSize));
  }
  // Separate overlapping, lightly curved leaves give the accessory actual
  // depth while preserving the original plant silhouette from the front.
  const leafContour=[[.08,.52],[.17,.66],[.12,.76],[.23,.78],[.21,.96],[.42,.9],[.54,1],
    [.63,.89],[.83,.98],[.84,.8],[.97,.78],[.88,.66],[.92,.57],[.7,.5],[.56,.49],[.32,.49]];
  const leafShape=leafContour.map(([x,y])=>new THREE.Vector2(plantX+x*plantW,plantY+y*plantH));
  if(THREE.ShapeUtils.isClockWise(leafShape))leafShape.reverse();
  for(const inds of THREE.ShapeUtils.triangulateShape(leafShape,[])){
    const p=inds.map(i=>[leafShape[i].x,leafShape[i].y,-.92+(leafShape[i].x-potCX)*.18]);
    tri(plantFront,...p,...p.map(v=>plantUV(v[0],v[1])));
    tri(plantSide,[p[2][0],p[2][1],p[2][2]-.025],[p[1][0],p[1][1],p[1][2]-.025],[p[0][0],p[0][1],p[0][2]-.025],...cropUV([77,779,295,932],plantSize).slice(0,3));
  }
  parts.push({name:'original-small-potted-plant',kind:'round-pot-and-curved-leaf-relief',depth:.352});

  for(const [material,batch] of batches){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uv,2));
    geometry.computeBoundingBox();geometry.computeBoundingSphere();resources.add(geometry);
    const mesh=new THREE.Mesh(geometry,material);mesh.name=`merged-${material.name||material.type}`;
    mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
    batch.positions.length=0;batch.normals.length=0;batch.uv.length=0;
  }
  sourceAlpha=null;
  if(facade.image!==facadeCanvas){facadeCanvas.width=facadeCanvas.height=1;}

  // Original window panes gain a modest warm night light. No foreign red
  // panels, signs, generic roofs or new typography are introduced.
  let dark=false;
  function setTheme(value){
    dark=!!value;
    front.color.set(dark?'#7d8797':'#ffffff');
    bookFront.color.set(dark?'#858c99':'#ffffff');
    plantFront.color.set(dark?'#808b91':'#ffffff');
    // A small painted ambient term supports the inferred sides. This is an
    // explicit art-lighting approximation, not an undisclosed physical IBL.
    timberSide.emissiveIntensity=dark?.05:0;
    illuminatedPane.color.set(dark?'#ffecd1':'#ffffff');
    lights.forEach(light=>{light.intensity=dark?.48:0;});
  }
  setTheme(false);
  const proxyMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  proxyMaterial.visible=false;resources.add(proxyMaterial);
  const stand=[-120*displayScaleX,0,1.15];
  const readStand=[(bookManifest[0]?.position[0]??-2.8)+.35,Y(941),-.15];
  // Occupancy describes the actual lower-storey solids, not a whole-building
  // rectangle. The open front tread remains a reachable book-reading aisle.
  const colliders=[];
  const occupy=(id,min,max)=>colliders.push({id,type:'box',min,max});
  occupy('recessed-research-back-wall',[X(128),Y(871),-4.23],[X(1453),Y(584),-4.09]);
  occupy('solid-publication-shelving',[X(429),Y(856),-4.12],[X(1146),Y(580),-.61]);
  [[128,161,-1.08,3.15],[1410,1453,-1.08,3.15],
    [201,379,-.86,3.25],[1205,1373,-.86,3.25],
    [158,202,-1.12,3],[377,431,-1.12,3],[1144,1207,-1.12,3],[1370,1412,-1.12,3]
  ].forEach(([l,r,z,depth],i)=>occupy(`lower-wall-or-door-frame-${i}`,[X(l),Y(871),z-depth],[X(r),Y(584),z]));
  [[179.5,.344],[397,.38],[1177.5,.354],[1389.5,.365]].forEach(([px,r],i)=>
    occupy(`grounded-lower-column-${i}`,[X(px)-r,Y(887),-.40-r],[X(px)+r,Y(570),-.40+r]));
  occupy('left-raised-stair-kerb',[X(391),0,-2.32],[X(439),Y(893),-.03]);
  occupy('right-raised-stair-kerb',[X(1129),0,-2.32],[X(1174),Y(892),-.03]);
  const nativeWorldScale=(600/85)/width;
  const colliderRadius=.12/nativeWorldScale;
  const interactables=bookManifest.map((book,index)=>{
    const geometry=new THREE.BoxGeometry(book.size[0]+.09,book.size[1]+.06,book.size[2]);resources.add(geometry);
    const object=new THREE.Mesh(geometry,proxyMaterial);object.position.fromArray(book.position);object.position.z-=book.size[2]/2;
    // Hold the book facing the open courtyard from the first stone tread.
    // The x offset accounts for the right palm; facing the shelf would send
    // this reading pose's supported book into the other publication volumes.
    const bookStand=[book.position[0]+.35,Y(941),-.15];
    const approach=[[bookStand[0],0,.70],bookStand];
    const item={id:book.paper.id||`research-book-${index}`,object,type:'book',point:book.position,title:book.paper.title,focus:{paper:book.paper.id},paper:book.paper,stand:bookStand,approach,facing:0,contactPoint:book.position,hand:'right',retrievePose:book.position[1]<2.25?'crouch':'reach'};
    object.name=`pick-${item.id}`;object.userData={interaction:true,id:item.id,type:item.type,title:item.title,paper:book.paper};root.add(object);return item;
  });
  const bounds=new THREE.Box3(new THREE.Vector3(-width/2,0,-5.6),new THREE.Vector3(width/2,height,0));
  const diagnostics={
    construction:'Separate closed architecture with original projected colour; limited-angle front-view reconstruction.',
    source:'assets/art/research-painted.webp',sourcePixels:[source.width,source.height],sourceCrop:source.crop,
    referenceWidth:width,referenceHeight:height,verticalStretch:1.05226,
    cameraYawLimit:12*Math.PI/180,parts,books:bookManifest,
    publicationOrderPreserved:realContent,
    triangles:triangleCount,
    drawCalls:batches.size,textures:4,
    limitations:[
      'The painting contains baked light. Front surfaces preserve those painted values and are not fully physically relit.',
      'Original hidden rear and side construction cannot be recovered from one front painting; its continuation is inferred.',
      'Window lattice and small carved motifs use shallow physical relief; invisible internal construction is not reconstructed.',
      'The camera is intentionally limited to approximately twelve degrees of yaw; this is not a finished unrestricted 3D environment.',
      ...(!realContent?['No HJ_DATA supplied in this isolated study; placeholder book counts are used without changing live publication content.']:[])
    ]
  };
  root.userData.reconstruction=diagnostics;
  return {root,bounds,setTheme,diagnostics,stand,actionStand:{read:{point:readStand,facing:0}},interactables,colliders,colliderRadius,
    walkAreas:[
      {minX:X(395),maxX:X(1174),minZ:-.19,maxZ:0,y:Y(941)},
      {minX:X(402),maxX:X(1168),minZ:-.42,maxZ:-.19,y:Y(916)},
      {minX:X(416),maxX:X(1153),minZ:-.63,maxZ:-.42,y:Y(891)},
      {minX:X(439),maxX:X(1129),minZ:-4.9,maxZ:-.63,y:Y(854)},
      {minX:X(145),maxX:X(391),minZ:-4.9,maxZ:-.35,y:Y(854)},
      {minX:X(1174),maxX:X(1435),minZ:-4.9,maxZ:-.35,y:Y(854)}
    ],
    dispose(){for(const resource of resources)resource.dispose();for(const texture of acquired)releasePaintTexture(texture);root.clear();}};
}

export {createFaithfulResearch as createResearch};
