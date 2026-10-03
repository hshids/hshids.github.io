import { M as se, a as X, C as Jt, R as wa, N as Wa, S as It, G as At, b as _a, w as La, f as Ya, c as Oa, B as fe, F as L, d as re, e as Ie, P as qa, V as P, g as da, m as Za, r as pa, I as Pt, D as qt, h as Qa, i as Zt, j as Qt, Q as Ke, k as Ka, l as De, n as ua, o as Ha, p as Ja, q as eo, s as ha, T as to, t as ma, u as no, v as fa } from "./fidelity-world-BEwPywHd.js";
const zt = [760, 695], Kt = {
  bark: [[319, 500, 352, 534], [328, 593, 373, 628], [312, 467, 348, 500]],
  // Use the original sun-facing grey-green pigment. Sampling the drawing's
  // deep underside shade as albedo would darken it a second time under PBR.
  needles: [[582, 344, 614, 368], [598, 352, 630, 376], [606, 352, 638, 376]]
};
function ao(C, A, M) {
  const D = document.createElement("canvas");
  D.width = D.height = M;
  const B = D.getContext("2d", { willReadFrequently: !0 });
  B.imageSmoothingEnabled = !0, B.imageSmoothingQuality = "high";
  const [U, S, z, R] = A;
  return B.drawImage(
    C,
    U / zt[0] * C.width,
    S / zt[1] * C.height,
    (z - U) / zt[0] * C.width,
    (R - S) / zt[1] * C.height,
    0,
    0,
    M,
    M
  ), B.getImageData(0, 0, M, M).data;
}
function ga(C, A) {
  const M = C[A], D = C[A + 1], B = C[A + 2];
  return C[A + 3] > 220 && !(M > 150 && D > 145 && B < 80) && !(M > 145 && M > D * 1.65 && D < 120 && B < 100);
}
function ba(C, A, M, D, B = !1) {
  const U = A.map((F) => ao(C, F, M)), S = U.map((F) => {
    const $ = [0, 0, 0];
    let W = 0;
    for (let Z = 0; Z < F.length; Z += 4)
      if (ga(F, Z)) {
        for (let H = 0; H < 3; H++) $[H] += F[Z + H];
        W++;
      }
    if (!W) throw new Error("The pine material patch contains no clean pigment.");
    return $.map((Z) => Z / W);
  }), z = [0, 1, 2].map((F) => S.reduce(($, W) => $ + W[F], 0) / S.length), R = document.createElement("canvas");
  R.width = R.height = M;
  const G = R.getContext("2d"), V = G.createImageData(M, M), N = V.data;
  for (let F = 0; F < M; F++) for (let $ = 0; $ < M; $++) {
    const W = (F * M + $) * 4, Z = $ / M * Math.PI * 2 + 0.65 * Math.sin(F / M * Math.PI * 2), H = U.map((k, Y) => {
      const Q = Math.cos(Z + Y / U.length * Math.PI * 2);
      return B ? Math.exp(3.6 * Q) : 1 + 0.38 * Q;
    }), ge = H.reduce((k, Y) => k + Y, 0);
    for (let k = 0; k < 3; k++) {
      let Y = 0;
      for (let Q = 0; Q < U.length; Q++) {
        const ee = U[Q], Fe = ga(ee, W) ? ee[W + k] : S[Q][k];
        Y += (Fe - S[Q][k] + z[k]) * H[Q] / ge;
      }
      N[W + k] = Math.round(X.clamp(z[k] + D * (Y - z[k]), 0, 255));
    }
    N[W + 3] = 255;
  }
  const ie = Math.max(4, Math.round(M * 0.1)), Be = (F) => F * F * (3 - 2 * F);
  for (const F of [0, 1]) for (let $ = 0; $ < M; $++)
    for (let W = 0; W < ie; W++) {
      const Z = F === 0 ? ($ * M + W) * 4 : (W * M + $) * 4, H = F === 0 ? ($ * M + M - 1 - W) * 4 : ((M - 1 - W) * M + $) * 4, ge = 1 - Be(W / (ie - 1));
      for (let k = 0; k < 3; k++) {
        const Y = N[Z + k], Q = N[H + k], ee = (Y + Q) * 0.5;
        N[Z + k] = Math.round(Y + (ee - Y) * ge), N[H + k] = Math.round(Q + (ee - Q) * ge);
      }
    }
  return G.putImageData(V, 0, 0), { canvas: R, mean: z.map((F) => Math.round(F)), data: N };
}
function Ht(C, A, M, D) {
  const B = new Jt(C);
  return B.name = A, B.colorSpace = M, B.wrapS = B.wrapT = wa, B.anisotropy = D === "low" ? 2 : 4, B;
}
function oo(C) {
  const A = C.canvas.width, M = document.createElement("canvas");
  M.width = M.height = A;
  const D = M.getContext("2d"), B = D.createImageData(A, A);
  for (let U = 0; U < C.data.length; U += 4) {
    const S = 0.2126 * C.data[U] + 0.7152 * C.data[U + 1] + 0.0722 * C.data[U + 2], z = Math.round(X.clamp(128 + (S - 128) * 0.65, 0, 255));
    B.data[U] = B.data[U + 1] = B.data[U + 2] = z, B.data[U + 3] = 255;
  }
  return D.putImageData(B, 0, 0), M;
}
function so({ sourceTexture: C, quality: A = "high" } = {}) {
  if (!C?.image) throw new Error("The tree material kit needs the original pine painting.");
  const M = /* @__PURE__ */ new Set(), D = A === "low" ? 128 : 256, B = ba(C.image, Kt.bark, D, 1.02, !0), U = ba(C.image, Kt.needles, D / 2, 0.42), S = Ht(B.canvas, "original-pine-interior-bark-pigment", It, A), z = Ht(oo(B), "original-pine-subtle-bark-grain", Wa, A), R = Ht(U.canvas, "original-pine-muted-needle-pigment", It, A), G = new se({
    map: S,
    bumpMap: z,
    bumpScale: 25e-4,
    color: "#ffffff",
    metalness: 0,
    roughness: 0.97,
    envMapIntensity: 0.18,
    toneMapped: !1
  });
  G.name = "rounded-pine-branches-with-original-matte-bark";
  const V = new se({
    map: R,
    color: "#ffffff",
    vertexColors: !0,
    metalness: 0,
    roughness: 0.94,
    envMapIntensity: 0.15,
    toneMapped: !1
  });
  V.name = "individual-pine-needles-with-original-painted-pigment", [S, z, R, G, V].forEach((ie) => M.add(ie));
  function N(ie) {
    G.color.set(ie ? "#c5cdd2" : "#ffffff"), V.color.set(ie ? "#c0cbd0" : "#ffffff");
  }
  return N(!1), {
    bark: G,
    needles: V,
    resources: M,
    setTheme: N,
    diagnostics: {
      source: "assets/art/pine.webp",
      sourceRects: Kt,
      barkMeanSRGB: B.mean,
      needleMeanSRGB: U.mean,
      colorMaps: 2,
      scalarMaps: 1,
      estimatedTextureBytes: Math.ceil((D * D * 2 + (D / 2) ** 2) * 4 * 4 / 3),
      projection: "Branch-axis wrapped UV and individual needle UV; no whole-tree or front-facing image card.",
      grainScale: "One bark tile per approximately .18m along/around a branch; ring repeats stay integral for a closed UV seam.",
      lighting: "Shared matte dielectric Standard materials, no metallic or Basic front/side mismatch."
    }
  };
}
async function io({ quality: C = "high" } = {}) {
  const A = new At();
  A.name = "original-painted-riverside-volumes";
  const M = /* @__PURE__ */ new Set(), D = /* @__PURE__ */ new Set(), B = /* @__PURE__ */ new Map(), U = [], S = C === "low", z = -10, R = 83, G = -1.5;
  let V = !1, N = 0, ie = 0, Be = 0;
  const F = 12, $ = /* @__PURE__ */ new Map(), W = /* @__PURE__ */ new Set(), Z = (e) => Math.floor((e - z) / F);
  function H(e) {
    if (!$.has(e)) {
      const t = new At();
      t.name = `riverside-near-detail-segment-${e}`, A.add(t), $.set(e, { group: t, centre: z + (e + 0.5) * F });
    }
    return $.get(e).group;
  }
  const ge = (e) => {
    let t = e >>> 0;
    return () => (t = 1664525 * t + 1013904223 >>> 0, t / 4294967296);
  }, k = ge(186), [Y, Q, ee, Fe, He, Je] = await Promise.all([
    "materials-painted",
    "water-continuous-painted",
    "garden-painted",
    "mountain-wash",
    "pine",
    "pond-phragmites-painted"
  ].map((e) => _a(La(`assets/art/${e}.webp`), { quality: C })));
  [Y, Q, ee, Fe, He, Je].forEach((e) => D.add(e));
  const be = { paint: [1536, 1024], garden: [1774, 887], reeds: [1024, 1536] };
  function _(e, t, n) {
    const a = new e(t);
    return a.name = n, M.add(a), a;
  }
  const we = _(se, { map: Y, color: "#c1bdb4", roughness: 0.94, toneMapped: !1 }, "original-painted-stone-and-paving"), Me = _(se, { map: Y, color: "#c2beb4", roughness: 0.98, toneMapped: !1 }, "original-painted-continuous-bank"), et = _(se, { color: "#756f63", roughness: 1, toneMapped: !1 }, "recessed-lime-mortar"), en = _(se, { map: ee, roughness: 0.82, side: De, alphaTest: 0.35, toneMapped: !1 }, "original-leaf-veins"), Ma = Tt(ee, [200, 306, 229, 352], be.garden, "#c5848a"), tn = _(ua, { map: Ma, color: "#fff0ed", roughness: 0.6, side: De, clearcoat: 0.08, toneMapped: !1 }, "original-pink-lotus-petal-grain"), tt = _(se, { color: "#6c7e50", roughness: 0.9, toneMapped: !1 }, "living-lotus-and-reed-stems"), Bt = _(se, { map: Tt(Je, [322, 92, 477, 306], be.reeds, "#a7977c"), color: "#bba98d", roughness: 0.96, toneMapped: !1 }, "phragmites-fine-feathery-panicle"), Et = _(se, { map: Tt(Je, [504, 942, 559, 1152], be.reeds, "#647d4c"), color: "#bac594", roughness: 0.86, side: De, toneMapped: !1 }, "original-phragmites-leaf-grain"), va = _(se, { color: "#d6af58", roughness: 0.83, toneMapped: !1 }, "warm-lotus-pollen"), nt = _(Ie, { map: ee, alphaTest: 0.22, transparent: !0, opacity: 0.67, toneMapped: !1 }, "original-wash-pavilion-front"), Ee = _(se, { map: ee, color: "#a39d8c", roughness: 0.88, transparent: !0, opacity: 0.67, toneMapped: !1 }, "original-wash-pavilion-depth"), nn = _(Ie, { color: "#ffc990", transparent: !0, opacity: 0.04, toneMapped: !1 }, "distant-warm-window-sources"), at = _(Ie, { map: ee, alphaTest: 0.2, transparent: !0, opacity: 0.66, toneMapped: !1, side: De }, "original-kohaku-pigment-under-water");
  [we, Me, et, tt, Bt, Et].forEach((e) => W.add(e));
  const Te = [38, 726, 1498, 863], ot = (e, t = be.paint) => {
    const [n, a, o, r] = e;
    return [[n / t[0], 1 - r / t[1]], [o / t[0], 1 - r / t[1]], [o / t[0], 1 - a / t[1]], [n / t[0], 1 - a / t[1]]];
  };
  function Ce(e, t, n, a, o, r, d, s) {
    ie++;
    const l = W.has(e) ? Z((t[0] + n[0] + a[0]) / 3) : null, c = `${e.uuid}:${l === null ? "background" : l}`;
    B.has(c) || B.set(c, { mat: e, sector: l, p: [], n: [], uv: [] });
    const u = B.get(c), m = new P().subVectors(new P(...n), new P(...t)).cross(new P().subVectors(new P(...a), new P(...t))).normalize();
    for (const [g, [h, b]] of [[t, o], [n, r], [a, d]].entries())
      u.p.push(...h), u.n.push(...s?.[g] || [m.x, m.y, m.z]), u.uv.push(...b);
  }
  const K = (e, t, n, a) => {
    Ce(e, t[0], t[1], t[2], n[0], n[1], n[2], a), Ce(e, t[0], t[2], t[3], n[0], n[2], n[3], a);
  };
  function Tt(e, t, n, a = "#aaa78b") {
    const [o, r, d, s] = t, l = document.createElement("canvas");
    l.width = Math.max(1, d - o), l.height = Math.max(1, s - r);
    const c = l.getContext("2d");
    c.fillStyle = a, c.fillRect(0, 0, l.width, l.height), c.drawImage(e.image, o / n[0] * e.image.width, r / n[1] * e.image.height, (d - o) / n[0] * e.image.width, (s - r) / n[1] * e.image.height, 0, 0, l.width, l.height);
    const u = new Jt(Ya(l, C));
    return u.colorSpace = It, M.add(u), u;
  }
  const ve = (e) => 3.2 + 0.055 * Math.sin(e * 0.17) + 0.027 * Math.sin(e * 0.49), xe = (e) => 4.3 + 0.11 * Math.sin(e * 0.15 + 0.3) + 0.045 * Math.sin(e * 0.39);
  function Ct(e, t, n, a, o, r, d, s, l = be.paint) {
    const c = [t, n, d], u = [o, n, d], m = [o, r, d], g = [t, r, d], h = [t, n, a], b = [o, n, a], p = [o, r, a], i = [t, r, a], v = ot(s, l);
    [[c, u, m, g], [u, b, p, m], [h, c, g, i], [g, m, p, i], [h, b, u, c], [b, h, i, p]].forEach((f) => K(e, f, v));
  }
  function xa(e, t, n, a, o, r, d) {
    const l = r, c = [e + 9e-3, t + 9e-3, l], u = [n - 9e-3, t + 9e-3, l], m = [n - 9e-3, a - 9e-3, l], g = [e + 9e-3, a - 9e-3, l], h = [[e, t, l - 9e-3], [n, t, l - 9e-3], [n, a, l - 9e-3], [e, a, l - 9e-3]], b = ot(d);
    K(we, [c, u, m, g], b);
    for (let i = 0; i < 4; i++) K(we, [[c, u, m, g][i], [h[i][0], h[i][1], h[i][2]], h[(i + 1) % 4], [c, u, m, g][(i + 1) % 4]], b);
    const p = h.map((i) => [i[0], i[1], o]);
    for (let i = 0; i < 4; i++) K(we, [h[i], p[i], p[(i + 1) % 4], h[(i + 1) % 4]], b);
    K(we, [p[1], p[0], p[3], p[2]], b);
  }
  const ya = [
    { t: 0, b: -0.16, y: [99, 142], j: [38, 121, 334, 549, 762, 976, 1216, 1501] },
    { t: -0.16, b: -0.4, y: [143, 210], j: [38, 212, 427, 643, 857, 1068, 1283, 1501] },
    { t: -0.4, b: -0.61, y: [211, 270], j: [38, 145, 356, 567, 780, 995, 1208, 1426, 1501] },
    { t: -0.61, b: -0.79, y: [271, 315], j: [38, 225, 435, 652, 865, 1078, 1298, 1501] }
  ];
  let an = 0, on = 0;
  ya.forEach((e, t) => {
    for (let n = z - t % 2 * 0.39; n < R; ) {
      const a = 0.71 + k() * 0.15, o = Math.floor(k() * (e.j.length - 1)), r = Math.max(n, z) + 6e-3, d = Math.min(n + a, R) - 6e-3;
      d - r > 0.026 && (xa(r, e.b + 4e-3, d, e.t - 4e-3, ve(n) - 0.3, ve(n) + 0.024, [e.j[o] + 2, e.y[0] + 1, e.j[o + 1] - 2, e.y[1] - 1]), an++), n += a;
    }
  });
  for (let e = z; e < R; e += 1.2) {
    const t = Math.min(e + 1.2, R);
    Ct(et, e, -0.82, ve(e) - 0.34, t, -2e-3, ve(e) - 0.02, [0, 0, 1, 1], [1, 1]);
  }
  Ct(et, z, -0.13, 0, R, -0.012, 3.2, [0, 0, 1, 1], [1, 1]);
  for (let e = 0; e < 5; e++) {
    const t = e * 3.2 / 5, n = (e + 1) * 3.2 / 5;
    for (let a = z - e % 2 * 0.47; a < R; ) {
      const o = 0.85 + k() * 0.24, r = Math.max(a, z) + 6e-3, d = Math.min(a + o, R) - 6e-3;
      if (d > r) {
        const s = Math.floor(k() * 6), l = [121 + s * 213, 101, 121 + s * 213 + 206, 140];
        Ct(we, r, -0.095, t + 6e-3, d, 0, n - 6e-3, l), on++;
      }
      a += o;
    }
  }
  const sn = Math.ceil((R - z) / (S ? 0.7 : 0.4)), ye = 8, st = [];
  for (let e = 0; e <= sn; e++) st.push(z + (R - z) * e / sn);
  for (let e = z + 5.7; e < R; e += 5.7) st.push(e);
  st.sort((e, t) => e - t);
  const rn = st.filter((e, t, n) => t === 0 || Math.abs(e - n[t - 1]) > 1e-5), rt = rn.length - 1, te = (e, t) => {
    const n = rn[e], a = t / ye;
    return [n, -0.79 - 0.82 * a + Math.sin(Math.PI * a) * (0.025 * Math.sin(n * 4.2) + 0.02 * Math.sin(n * 7.9)), X.lerp(ve(n) + 5e-3, xe(n) + 0.1, a)];
  }, cn = (e) => {
    let t = (e[0] - z) / 5.7;
    t = 1 - Math.abs(t % 2 - 1);
    const n = X.clamp((e[2] - ve(e[0])) / (xe(e[0]) + 0.1 - ve(e[0])), 0, 1);
    return [(Te[0] + t * (Te[2] - Te[0])) / 1536, 1 - (Te[1] + n * (Te[3] - Te[1])) / 1024];
  };
  for (let e = 0; e < rt; e++) for (let t = 0; t < ye; t++) {
    const n = [te(e, t), te(e, t + 1), te(e + 1, t + 1), te(e + 1, t)];
    K(Me, n, n.map(cn));
  }
  const it = (e) => {
    const t = cn(e)[0], n = X.clamp((-e[1] - 0.79) / 1.41, 0, 1);
    return [t, 1 - (726 + n * 137) / 1024];
  };
  for (let e = 0; e < rt; e++) {
    const t = te(e, ye), n = te(e + 1, ye), a = [t, [t[0], -2.2, t[2]], [n[0], -2.2, n[2]], n];
    K(Me, a, a.map(it));
  }
  for (let e = 0; e < rt; e++) {
    const t = te(e, 0), n = te(e + 1, 0), a = te(e + 1, ye), o = te(e, ye), r = [[t[0], -2.2, t[2]], t, n, [n[0], -2.2, n[2]]], d = [[t[0], -2.2, t[2]], [n[0], -2.2, n[2]], [a[0], -2.2, a[2]], [o[0], -2.2, o[2]]];
    K(Me, r, r.map(it)), K(Me, d, d.map(it));
  }
  for (const e of [0, rt]) for (let t = 0; t < ye; t++) {
    const n = te(e, t), a = te(e, t + 1), o = [n, a, [a[0], -2.2, a[2]], [n[0], -2.2, n[2]]];
    e === 0 && o.reverse(), K(Me, o, o.map(it));
  }
  const ct = document.createElement("canvas");
  ct.width = 512, ct.height = 128;
  const lt = ct.getContext("2d");
  lt.fillStyle = "#ded9ca", lt.fillRect(0, 0, 512, 128), lt.globalAlpha = 0.022, lt.drawImage(Y.image, 38 / 1536 * Y.image.width, 726 / 1024 * Y.image.height, 1460 / 1536 * Y.image.width, 92 / 1024 * Y.image.height, 0, 0, 512, 128);
  const $e = new Jt(ct);
  $e.colorSpace = It, $e.wrapS = $e.wrapT = wa, M.add($e);
  const ln = _(se, { map: $e, color: "#b8b4a5", roughness: 1, toneMapped: !1 }, "quiet-painted-courtyard-soil"), Sa = z - 32, dn = R + 32;
  for (let e = Sa; e < dn; e += 3) {
    const t = Math.min(e + 3, dn);
    K(ln, [[e, 0, -65], [e, 0, 0], [t, 0, 0], [t, 0, -65]], [[e / 6, 65 / 6], [e / 6, 0], [t / 6, 0], [t / 6, 65 / 6]]);
  }
  const Se = Q.clone();
  Se.wrapS = Se.wrapT = Oa, Se.repeat.set((R - z) / 14, 1.03), Se.needsUpdate = !0, M.add(Se);
  const Xe = _(ua, {
    map: Se,
    color: "#dde7db",
    roughness: 0.32,
    metalness: 0.025,
    clearcoat: 0.32,
    clearcoatRoughness: 0.32,
    transparent: !0,
    opacity: 0.92,
    depthWrite: !1,
    toneMapped: !1,
    emissiveMap: Se,
    emissive: "#738b99",
    emissiveIntensity: 0
  }, "continuous-original-water-with-moving-normals"), pn = (e, t, n) => 0.019 * Math.sin(e * 1.6 + t * 0.7 - n * 0.65) + 0.011 * Math.sin(e * 0.8 - t * 2.1 + n * 0.48), un = { value: 0 };
  Xe.onBeforeCompile = (e) => {
    e.uniforms.uRiversideTime = un, e.vertexShader = `uniform float uRiversideTime;
` + e.vertexShader, e.vertexShader = e.vertexShader.replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
      float tt=uRiversideTime;
      float ddx=.019*1.6*cos(position.x*1.6+position.z*.7-tt*.65)+.011*.8*cos(position.x*.8-position.z*2.1+tt*.48);
      float ddz=.019*.7*cos(position.x*1.6+position.z*.7-tt*.65)-.011*2.1*cos(position.x*.8-position.z*2.1+tt*.48);
      objectNormal=normalize(vec3(-ddx,1.,-ddz));`), e.vertexShader = e.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      float wave=.019*sin(position.x*1.6+position.z*.7-uRiversideTime*.65)+.011*sin(position.x*.8-position.z*2.1+uRiversideTime*.48);
      transformed.y+=wave*smoothstep(0.,.055,uv.y);`), e.fragmentShader = `uniform float uRiversideTime;
` + e.fragmentShader, e.fragmentShader = e.fragmentShader.replace("#include <map_fragment>", `#ifdef USE_MAP
      vec2 flowing=vMapUv+vec2(.018*sin(vMapUv.y*9.+uRiversideTime*.10),.014*sin(vMapUv.x*4.-uRiversideTime*.08));
      diffuseColor*=texture2D(map,flowing);
    #endif`);
  }, Xe.customProgramCacheKey = () => "faithful-river-analytical-waves-v1";
  const ue = Math.ceil((R - z) / (S ? 1 : 0.5)), dt = S ? 16 : 30, hn = [], mn = [], fn = [], gn = [];
  for (let e = 0; e <= dt; e++) for (let t = 0; t <= ue; t++) {
    const n = z + (R - z) * t / ue, a = e / dt;
    hn.push(n, G, X.lerp(xe(n), 18, a)), mn.push(0, 1, 0), fn.push(t / ue, a);
  }
  for (let e = 0; e < dt; e++) for (let t = 0; t < ue; t++) {
    const n = e * (ue + 1) + t, a = n + 1, o = n + ue + 2, r = n + ue + 1;
    gn.push(n, r, a, a, r, o);
  }
  const ke = new fe();
  ke.setAttribute("position", new L(hn, 3)), ke.setAttribute("normal", new L(mn, 3)), ke.setAttribute("uv", new L(fn, 2)), ke.setIndex(gn), ke.computeBoundingSphere(), M.add(ke);
  const pt = new re(ke, Xe);
  pt.name = "one-connected-moving-river", pt.receiveShadow = !0, A.add(pt);
  const We = document.createElement("canvas");
  We.width = 2172, We.height = 724;
  const bn = We.getContext("2d");
  bn.drawImage(Fe.image, 0, 0, 2172, 724);
  let wn = bn.getImageData(0, 0, 2172, 724).data;
  const _e = [];
  for (let e = 0; e < 2172; e += 6) {
    let t = 690;
    for (let n = 170; n < 690; n++) if (wn[(n * 2172 + e) * 4 + 3] > 110) {
      t = n;
      break;
    }
    _e.push(t);
  }
  wn = null, We.width = We.height = 1;
  const Rt = (e) => 1 - Math.abs((e % 2 + 2) % 2 - 1), Vt = (e) => {
    const t = Rt(e) * (_e.length - 1), n = Math.floor(t);
    return X.lerp(_e[n], _e[Math.min(n + 1, _e.length - 1)], t - n);
  }, ut = [
    { front: -12, crest: -21, back: -31, span: 27, phase: 0.18, height: 5.8, opacity: 0.56 },
    { front: -22, crest: -34, back: -45, span: 34, phase: 0.76, height: 8.6, opacity: 0.5 },
    { front: -35, crest: -47, back: -58, span: 43, phase: 1.26, height: 11.5, opacity: 0.4 }
  ], ht = (e, t, n) => {
    const a = t > n.crest ? (n.front - t) / (n.front - n.crest) : (t - n.back) / (n.crest - n.back);
    if (a <= 0) return 0;
    const o = Vt((e + 18) / n.span + n.phase), r = n.height * (690 - o) / 450;
    return Math.sin(Math.min(a, 1) * Math.PI / 2) * r + 0.065 * Math.sin(e * 0.31) * Math.sin(Math.min(a, 1) * Math.PI);
  }, Re = (e, t) => Math.max(0, ...ut.map((n) => ht(e, t, n))), jt = [];
  ut.forEach((e, t) => {
    const n = _(Ie, { map: Fe, transparent: !0, opacity: e.opacity, alphaTest: 0.02, side: De, toneMapped: !1 }, `original-mountain-wash-relief-${t}`);
    jt.push(n);
    const a = S ? 112 : 196, o = S ? 12 : 20, r = [], d = [], s = [], l = -23, c = 98;
    for (let g = 0; g <= o; g++) for (let h = 0; h <= a; h++) {
      const b = X.lerp(l, c, h / a), p = X.lerp(e.front, e.back, g / o), i = ht(b, p, e), v = Rt((b + 18) / e.span + e.phase), f = Vt((b + 18) / e.span + e.phase), x = e.height * (690 - f) / 450;
      r.push(b, i, p), d.push(v, 1 - (690 - X.clamp(i / (x || 1), 0, 1) * (690 - f)) / 724);
    }
    for (let g = 0; g < o; g++) for (let h = 0; h < a; h++) {
      const b = g * (a + 1) + h, p = b + 1, i = b + a + 1, v = i + 1;
      s.push(b, i, p, p, i, v);
    }
    const u = new fe();
    u.setAttribute("position", new L(r, 3)), u.setAttribute("uv", new L(d, 2)), u.setIndex(s), u.computeVertexNormals(), u.computeBoundingSphere(), M.add(u);
    const m = new re(u, n);
    m.name = `source-painted-physical-ridge-${t}`, A.add(m);
  });
  function Mn(e, t, n, a) {
    const o = e.attributes.position, r = e.attributes.uv, d = e.index, s = (c) => new P().fromBufferAttribute(o, c).applyMatrix4(n), l = d ? d.count : o.count;
    for (let c = 0; c < l; c += 3) {
      const u = [0, 1, 2].map((h) => d ? d.getX(c + h) : c + h), m = u.map((h) => s(h).toArray()), g = u.map((h, b) => a ? a(m[b], r ? new ma().fromBufferAttribute(r, h) : null) : [r.getX(h), r.getY(h)]);
      Ce(t, ...m, ...g);
    }
  }
  const ce = new Qt(), mt = new Ke();
  function vn(e, t, n, a, o) {
    const r = new ha(t.map((l) => new P(...l))), d = e === "fine-panicle-branch" ? [1, 3] : e === "reed-stem" ? [6, 5] : [S ? 6 : 10, S ? 5 : 7], s = new to(r, d[0], n, d[1], !1);
    Mn(s, a, new Qt(), o), s.dispose();
  }
  const ft = so({ sourceTexture: He, quality: C }), { bark: xn, needles: Ae } = ft;
  ft.resources.forEach((e) => M.add(e));
  const Le = document.createElement("canvas");
  Le.width = 760, Le.height = 695;
  const yn = Le.getContext("2d");
  yn.drawImage(He.image, 0, 0, 760, 695);
  let Ye = yn.getImageData(0, 0, 760, 695).data;
  const Sn = (e, t) => {
    const n = (Math.min(694, Math.max(0, Math.floor(t))) * 760 + Math.min(759, Math.max(0, Math.floor(e)))) * 4, a = Ye[n], o = Ye[n + 1], r = Ye[n + 2], d = a > 150 && o > 145 && r < 80 || a > 145 && a > o * 1.65 && o < 120 && r < 100;
    return Ye[n + 3] > 115 && !d && o >= a * 0.96 && o >= r * 0.94 && a + o + r > 105 && a + o + r < 580;
  }, kn = { value: 0 }, gt = { value: 0 }, An = { value: 0 };
  let Pn = -100;
  function ka(e, t = N) {
    const n = Array.isArray(e) ? e[0] : e?.x;
    return Number.isFinite(n) ? (kn.value = n, Pn = Number.isFinite(t) ? t : N, !0) : !1;
  }
  const zn = _(Ja, { depthPacking: Ha }, "spatial-pine-needle-breeze-shadow-depth");
  [Ae, zn].forEach((e) => {
    e.onBeforeCompile = (t) => {
      t.uniforms.uPineBreezeX = kn, t.uniforms.uPineBreezeAge = gt, t.uniforms.uPineBreezeStrength = An, t.vertexShader = `uniform float uPineBreezeX;
uniform float uPineBreezeAge;
uniform float uPineBreezeStrength;
` + t.vertexShader, t.vertexShader = t.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      float treeMask=exp(-pow((position.x-uPineBreezeX)/2.0,2.0));
      float needleAnchor=smoothstep(.48,1.45,position.y);
      transformed.x+=.019*sin(uPineBreezeAge*3.6+position.y*1.6)*needleAnchor*treeMask*uPineBreezeStrength;
      transformed.z+=.009*sin(uPineBreezeAge*3.0+position.x*.7)*needleAnchor*treeMask*uPineBreezeStrength;`);
    }, e.customProgramCacheKey = () => "spatial-pine-fixed-roots-canopy-breeze-v2";
  });
  const In = [[-7.25, -0.78, 2.75], [17.4, -0.95, 3.05], [45.15, -1.15, 2.3], [79.15, -0.95, 2.82]], Bn = [], En = _(eo, {
    transparent: !0,
    depthWrite: !1,
    uniforms: { uStrength: { value: 0.3 } },
    vertexShader: "varying vec2 vRootUV; void main(){vRootUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: "uniform float uStrength; varying vec2 vRootUV; void main(){vec2 p=(vRootUV-.5)*2.;float d=length(p);float fade=1.-smoothstep(.30,1.,d);float grain=.93+.07*sin(p.x*22.+sin(p.y*15.));gl_FragColor=vec4(.13,.12,.095,uStrength*fade*fade*grain);}"
  }, "pine-soft-ground-contact");
  In.forEach(([e, t, n], a) => {
    const o = new qa(n * 0.84, n * 0.68);
    o.rotateX(-Math.PI / 2), M.add(o);
    const r = new re(o, En);
    r.name = `pine-root-ground-contact-${a}`, r.position.set(e, 3e-3, t), r.renderOrder = 1, H(Z(e)).add(r);
  });
  const Ve = /* @__PURE__ */ new Map();
  let Ut = 0, Tn = 0, Cn = 0, bt = 0, Rn = 0, Vn = 0;
  function he(e, t, n, a, o) {
    const r = Z((t[0].x + t[1].x + t[2].x) / 3), d = `${e.uuid}:${r}`;
    Ve.has(d) || Ve.set(d, { mat: e, index: r, p: [], n: [], uv: [], color: [] });
    const s = Ve.get(d);
    for (let l = 0; l < 3; l++)
      s.p.push(...t[l].toArray()), s.n.push(...n[l].toArray()), s.uv.push(...a[l]), s.color.push(...o?.[l] || [1, 1, 1]);
    Ut++;
  }
  function wt(e, t, n, a = xn) {
    const o = new ha(e, !1, "centripetal"), r = o.getLength(), d = o.computeFrenetFrames(n.segments, !1), s = [], l = Math.max(1, Math.round(Math.max(...t) * Math.PI * 2 / 0.18)), c = (u) => {
      const m = u * (t.length - 1), g = Math.min(t.length - 2, Math.floor(m));
      return X.lerp(t[g], t[g + 1], m - g);
    };
    for (let u = 0; u <= n.segments; u++) {
      const m = u / n.segments, g = o.getPointAt(m), h = c(m), b = [];
      for (let p = 0; p <= n.radial; p++) {
        const i = p / n.radial * Math.PI * 2, v = d.normals[u].clone().multiplyScalar(Math.cos(i)).addScaledVector(d.binormals[u], Math.sin(i)).normalize(), f = 1 + 0.035 * Math.sin(i * 5 + m * 2.7) + 0.018 * Math.sin(i * 9 - m * 3.1);
        b.push({ p: g.clone().addScaledVector(v, h * f), n: v, uv: [p / n.radial * l, m * r / 0.18] });
      }
      s.push(b);
    }
    for (let u = 0; u < n.segments; u++) for (let m = 0; m < n.radial; m++) {
      const g = s[u][m], h = s[u][m + 1], b = s[u + 1][m + 1], p = s[u + 1][m];
      he(a, [g.p, h.p, p.p], [g.n, h.n, p.n], [g.uv, h.uv, p.uv]), he(a, [h.p, b.p, p.p], [h.n, b.n, p.n], [h.uv, b.uv, p.uv]);
    }
    for (const u of [0, n.segments]) {
      const m = o.getPointAt(u / n.segments), g = d.tangents[u].clone().multiplyScalar(u === 0 ? -1 : 1), h = s[u];
      for (let b = 0; b < n.radial; b++) {
        const p = u === 0 ? [h[b + 1], h[b]] : [h[b], h[b + 1]];
        he(a, [m, ...p.map((i) => i.p)], [g, g, g], [[0.5, 0.5], ...p.map((i) => i.uv)]);
      }
    }
    return Tn++, o;
  }
  function Aa(e, t, n, a, o) {
    const r = Math.abs(t.y) < 0.93 ? new P(0, 1, 0) : new P(1, 0, 0), d = t.clone().cross(r).normalize(), s = t.clone().cross(d).normalize(), l = d.clone().multiplyScalar((o() - 0.5) * n * 0.16).addScaledVector(s, n * 0.05), c = e.clone().addScaledVector(t, n).add(l), u = [], m = 0.88 + o() * 0.17, g = 0.98 + o() * 0.035, h = [m, Math.min(1.05, m * g), m * 0.96], b = 3;
    for (let i = 0; i < b; i++) {
      const v = i / b * Math.PI * 2, f = d.clone().multiplyScalar(Math.cos(v)).addScaledVector(s, Math.sin(v)).normalize();
      u.push({ p: e.clone().addScaledVector(f, a), n: f });
    }
    for (let i = 0; i < b; i++) {
      const v = u[i], f = u[(i + 1) % b];
      he(Ae, [v.p, f.p, c], [v.n, f.n, t], [[i / b, 0], [(i + 1) / b, 0], [0.5, 1]], [h.map((x) => x * 0.92), h.map((x) => x * 0.92), h.map((x) => x * 1.02)]);
    }
    const p = t.clone().negate();
    he(Ae, [u[2].p, u[1].p, u[0].p], [p, p, p], [[1, 0], [0.5, 0], [0, 0]], [h, h, h]), bt++;
  }
  function Pa(e, t, n, a, o) {
    const r = Math.abs(t.y) < 0.93 ? new P(0, 1, 0) : new P(1, 0, 0), d = t.clone().cross(r).normalize(), s = t.clone().cross(d).normalize(), l = S ? 3 : 4, c = S ? 5 : 8, u = o() * 6.283, m = (o() - 0.5) * a * 0.55, g = [], h = [0.97, 0.99, 0.965].map((p) => p * (0.94 + o() * 0.08));
    function b(p, i) {
      const v = Math.pow(Math.max(1e-5, Math.sin(Math.PI * p)), 0.72), f = Math.max(a * 0.012, a * v * (1 + 0.11 * Math.sin(i * 3 + u + p * 2.3) + 0.055 * Math.sin(i * 7 - u + p * 3.7)));
      return e.clone().addScaledVector(t, p * n).addScaledVector(d, m * Math.sin(Math.PI * p) + Math.cos(i) * f).addScaledVector(s, a * 0.12 * Math.sin(p * Math.PI * 2) + Math.sin(i) * f);
    }
    for (let p = 0; p <= l; p++) {
      const i = p / l, v = [];
      for (let f = 0; f <= c; f++) {
        const x = f / c * Math.PI * 2, w = b(i, x), y = b(i, x + 3e-3).sub(b(i, x - 3e-3)), T = b(Math.min(1, i + 3e-3), x).sub(b(Math.max(0, i - 3e-3), x)), E = y.cross(T).normalize();
        v.push({ p: w, n: E, uv: [f / c, i] });
      }
      g.push(v);
    }
    for (let p = 0; p < l; p++) for (let i = 0; i < c; i++) {
      const v = g[p][i], f = g[p][i + 1], x = g[p + 1][i + 1], w = g[p + 1][i];
      he(Ae, [v.p, f.p, w.p], [v.n, f.n, w.n], [v.uv, f.uv, w.uv], [h, h, h]), he(Ae, [f.p, x.p, w.p], [f.n, x.n, w.n], [f.uv, x.uv, w.uv], [h, h, h]);
    }
    for (const p of [0, l]) {
      const i = p / l, v = e.clone().addScaledVector(t, i * n), f = t.clone().multiplyScalar(p === 0 ? -1 : 1);
      for (let x = 0; x < c; x++) {
        const w = p === 0 ? [g[p][x + 1], g[p][x]] : [g[p][x], g[p][x + 1]];
        he(Ae, [v, ...w.map((y) => y.p)], [f, f, f], [[0.5, i], ...w.map((y) => y.uv)], [h, h, h]);
      }
    }
    return { sample: b, u: d, v: s };
  }
  const jn = [
    { rect: [36, 12, 305, 166], count: 36, path: [[326, 130, 0.012], [281, 111, -0.025], [211, 103, -0.07], [99, 131, -0.12]], radius: [0.037, 0.029, 0.018, 7e-3], depth: 0.145 },
    { rect: [278, 5, 532, 170], count: 34, path: [[327, 139, 0.012], [352, 83, 0.055], [417, 91, 0.1], [472, 110, 0.15]], radius: [0.032, 0.024, 0.016, 6e-3], depth: 0.155 },
    { rect: [0, 163, 318, 334], count: 41, path: [[287, 281, -0.018], [232, 244, 0.02], [165, 231, 0.075], [63, 249, 0.125]], radius: [0.049, 0.038, 0.024, 8e-3], depth: 0.205 },
    { rect: [316, 163, 712, 323], count: 48, path: [[294, 287, -0.01], [373, 248, -0.075], [455, 240, -0.12], [567, 265, -0.14], [653, 280, -0.19]], radius: [0.05, 0.039, 0.029, 0.015, 6e-3], depth: 0.215 },
    { rect: [0, 332, 305, 506], count: 42, path: [[249, 421, 0.02], [204, 400, -0.05], [146, 412, -0.1], [59, 446, -0.145]], radius: [0.053, 0.04, 0.022, 7e-3], depth: 0.185 },
    { rect: [304, 320, 759, 512], count: 55, path: [[255, 421, 0.015], [343, 389, 0.08], [450, 368, 0.14], [547, 384, 0.19], [666, 426, 0.215]], radius: [0.063, 0.05, 0.032, 0.019, 7e-3], depth: 0.245 }
  ], za = jn.map((e) => {
    const [t, n, a, o] = e.rect, r = (t + a) / 2, d = (n + o) / 2, s = (a - t) / 2, l = (o - n) / 2, c = [];
    for (let p = n + 3; p < o; p += 6) for (let i = t + 3; i < a; i += 6) Sn(i, p) && ((i - r) / s) ** 2 + ((p - d) / l) ** 2 < 1.16 && c.push([i, p]);
    const u = e.count * 2, m = [], g = new Float64Array(c.length).fill(1 / 0);
    let h = 0, b = 1 / 0;
    c.forEach((p, i) => {
      const v = (p[0] - r) ** 2 + (p[1] - d) ** 2;
      v < b && (b = v, h = i);
    });
    for (let p = 0; p < u; p++) {
      const i = c[h] || [r, d];
      m.push(i);
      let v = -1;
      for (let f = 0; f < c.length; f++) {
        const x = c[f], w = (x[0] - i[0]) ** 2 + (x[1] - i[1]) ** 2;
        g[f] = Math.min(g[f], w), g[f] > v && (v = g[f], h = f);
      }
    }
    return m;
  });
  function Ia(e, t) {
    let n = 1 / 0, a = e.path[0][2];
    for (let o = 1; o < e.path.length; o++) {
      const r = e.path[o - 1], d = e.path[o], s = X.clamp((t - r[0]) / (d[0] - r[0] || 1), 0, 1), l = Math.abs(t - X.lerp(r[0], d[0], s));
      l < n && (n = l, a = X.lerp(r[2], d[2], s));
    }
    return a;
  }
  In.forEach(([e, t, n], a) => {
    const o = n / 695, r = [-0.13, 0.08, 0.2, -0.09][a], d = Math.cos(r), s = Math.sin(r), l = [1.02, 0.92, 1.1, 0.98][a], c = (f, x, w) => {
      const y = (f - 400) * o, T = w * n * l;
      return new P(e + y * d - T * s, (695 - x) * o, t + y * s + T * d);
    }, u = [[401, 695, 0], [416, 645, 0.01], [434, 590, 0.015], [423, 548, -0.012], [365, 503, -0.032], [283, 457, -0.018], [242, 407, 0.01], [254, 351, 0.025], [280, 301, -0.012], [307, 257, -0.025], [283, 204, 8e-3], [302, 151, 0.022], [330, 104, 0.013], [352, 55, 0.018], [350, 29, 8e-3]], m = [0.077, 0.065, 0.056, 0.052, 0.05, 0.047, 0.043, 0.037, 0.032, 0.028, 0.021, 0.016, 0.012, 7e-3, 2e-3].map((f) => f * n);
    wt(u.map((f) => c(...f)), m, { segments: S ? 40 : 64, radial: S ? 10 : 14 }), [[[401, 683, 0], [356, 681, 0.035], [293, 690, 0.09], [245, 695, 0.135]], [[409, 684, 0], [451, 681, -0.02], [490, 691, -0.11], [540, 695, -0.18]], [[402, 682, -5e-3], [391, 688, -0.1], [362, 695, -0.235]], [[407, 683, 0.015], [427, 691, 0.125], [450, 695, 0.255]], [[399, 685, 0], [369, 690, 0.04], [341, 695, 0.14]]].forEach((f, x) => wt(f.map((w) => c(...w)), [0.045, 0.034, 0.02, 4e-3].map((w) => w * n), { segments: S ? 10 : 16, radial: S ? 7 : 10 }));
    let h = 0, b = bt;
    jn.forEach((f, x) => {
      const w = wt(f.path.map((I) => c(...I)), f.radius.map((I) => I * n * 0.42), { segments: S ? 18 : 26, radial: S ? 8 : 10 }), [y, T, E, O] = f.rect, ae = (y + E) / 2, me = (T + O) / 2, de = (E - y) / 2, q = (O - T) / 2, oe = f.count * 2;
      for (let I = 0; I < oe; I++) {
        const j = ge(7631 + a * 7717 + x * 1831 + I * 191);
        let [J, Qe] = za[x][I];
        const ta = J + (j() - 0.5) * 4, na = Qe + (j() - 0.5) * 4;
        Sn(ta, na) && (J = ta, Qe = na);
        const Va = Math.sqrt(Math.max(0.1, 1 - Math.min(0.9, ((J - ae) / de) ** 2 * 0.65 + ((Qe - me) / q) ** 2 * 0.28))), ja = Ia(f, J), Ua = f.depth * 0.55 * Va * Math.sin(J * 0.027 + Qe * 0.035 + x * 0.41) + (j() - 0.5) * 0.035, St = c(J, Qe, ja + Ua), Lt = 24;
        let kt = w.getPointAt(0), aa = 1 / 0, oa = 0;
        for (let pe = 0; pe <= Lt; pe++) {
          const Ge = w.getPointAt(pe / Lt), Ne = St.distanceToSquared(Ge);
          Ne < aa && (aa = Ne, kt = Ge, oa = pe / Lt);
        }
        const sa = St.clone().sub(kt).normalize(), ra = w.getTangentAt(oa), Ga = kt.clone().lerp(St, 0.57).addScaledVector(ra, n * 0.014).add(new P(0, n * 0.01, 0)), ia = n * (15e-4 + j() * 11e-4), ca = St.clone().addScaledVector(sa, n * 0.018).add(new P(0, n * 0.013, 0));
        wt([kt, Ga, ca], [ia, ia * 0.6, n * 55e-5], { segments: S ? 3 : 5, radial: S ? 4 : 5 });
        const Yt = sa.clone().multiplyScalar(0.52).addScaledVector(ra, 0.48).add(new P(0, 0.22, 0)).normalize(), Ot = Pa(ca.clone().addScaledVector(Yt, -n * 0.02), Yt, n * 0.037, n * (85e-4 + j() * 14e-4), j), la = S ? 20 : 40;
        for (let pe = 0; pe < la; pe++) {
          const Ge = 0.09 + (pe + 0.3) / la * 0.82, Ne = pe * 2.399963 + j() * 0.24, Na = Ot.u.clone().multiplyScalar(Math.cos(Ne)).addScaledVector(Ot.v, Math.sin(Ne)), Da = Yt.clone().multiplyScalar(0.88 + Ge * 0.22).addScaledVector(Na, 0.7 + j() * 0.18).normalize(), Fa = Ot.sample(Ge, Ne), $a = n * (0.02 + j() * 0.012) * (1 - 0.11 * Ge), Xa = n * (S ? 116e-5 : 102e-5);
          Aa(Fa, Da, $a, Xa, j);
        }
        h++, Cn++;
      }
    }), Bn.push({ x: e, z: t, y: 0, height: n, style: "branch-supported-spatial-pine", rooted: !0, tufts: h, needles: bt - b, yaw: r });
    const p = new da(n * 1.12, n, n * 0.76);
    M.add(p);
    const i = _(Ie, { transparent: !0, opacity: 0, depthWrite: !1 }, `tree-pick-${a}`);
    i.visible = !1;
    const v = new re(p, i);
    v.position.set(e, n / 2, t), v.name = `grounded-tree-${a}`, A.add(v), U.push({ id: `pine-${a}`, type: "tree", object: v, point: [e, n * 0.62, t], stand: [e, 0, 1.15], title: "A moment under the pine" });
  });
  for (const e of Ve.values()) {
    const t = new fe();
    t.setAttribute("position", new L(e.p, 3)), t.setAttribute("normal", new L(e.n, 3)), t.setAttribute("uv", new L(e.uv, 2)), t.setAttribute("color", new L(e.color, 3)), Rn += Object.values(t.attributes).reduce((o, r) => o + r.array.byteLength, 0);
    const n = Za(t, 1e-6);
    t.dispose(), n.computeBoundingSphere(), M.add(n), Vn += Object.values(n.attributes).reduce((o, r) => o + r.array.byteLength, 0) + (n.index?.array.byteLength || 0);
    const a = new re(n, e.mat);
    a.name = `spatial-pine-${e.mat === xn ? "bark-and-supporting-branches" : "individual-needle-bundles"}-segment-${e.index}`, a.castShadow = !0, a.receiveShadow = !0, e.mat === Ae && (a.customDepthMaterial = zn), H(e.index).add(a), e.p.length = e.n.length = e.uv.length = e.color.length = 0;
  }
  Ye = null, Le.width = Le.height = 1;
  for (const e of [He, Je])
    D.delete(e), pa(e);
  function Ba() {
    const e = new fe(), t = [], n = [], a = [], o = S ? 6 : 8, r = S ? 14 : 18;
    for (let s = 0; s <= r; s++) for (let l = 0; l <= o; l++) {
      const c = s / r, u = l / o * 2 - 1, m = 0.12 * Math.pow(Math.sin(Math.PI * c), 0.68);
      t.push(u * m, 0.37 * c, 0.062 * Math.sin(c * Math.PI) + 0.025 * c - 0.045 * u * u * Math.sin(Math.PI * c)), n.push(l / o, c);
    }
    for (let s = 0; s < r; s++) for (let l = 0; l < o; l++) {
      const c = s * (o + 1) + l, u = c + 1, m = c + o + 1, g = m + 1;
      a.push(c, u, m, u, g, m);
    }
    e.setAttribute("position", new L(t, 3)), e.setAttribute("uv", new L(n, 2)), e.setIndex(a), e.computeVertexNormals();
    const d = e.attributes.normal;
    for (const s of [0, r]) {
      const l = new P();
      for (let c = 0; c <= o; c++) l.add(new P().fromBufferAttribute(d, s * (o + 1) + c));
      l.normalize();
      for (let c = 0; c <= o; c++) d.setXYZ(s * (o + 1) + c, l.x, l.y, l.z);
    }
    return M.add(e), e;
  }
  const Ea = Ba(), le = [];
  for (let e = -6; e < R; e += 7.9) {
    const t = le.length % 2 === 0;
    le.push({ x: e + k() * 1.2, z: xe(e) + 0.72 + k() * 0.7, raised: t, y: t ? G + 0.7 : G + 0.07, scale: 0.76 + k() * 0.26, phase: k() * 6.28 });
  }
  function Ta(e, t, n, a) {
    const o = /* @__PURE__ */ new Map(), r = new Array(n.length);
    n.forEach((s, l) => {
      const c = Z(s);
      o.has(c) || o.set(c, []), o.get(c).push(l);
    });
    const d = [];
    for (const [s, l] of o) {
      const c = new Pt(e, t, l.length);
      c.name = `${a}-segment-${s}`, c.instanceMatrix.setUsage(qt), c.castShadow = !0, H(s).add(c), M.add(c), d.push(c), l.forEach((u, m) => r[u] = { mesh: c, index: m });
    }
    return { setMatrixAt(s, l) {
      const c = r[s];
      c.mesh.setMatrixAt(c.index, l);
    }, commit() {
      d.forEach((s) => s.instanceMatrix.needsUpdate = !0);
    }, bounds() {
      d.forEach((s) => {
        s.computeBoundingSphere(), s.boundingSphere.radius += 0.09;
      });
    }, segments: d.length };
  }
  const Mt = Ta(Ea, tn, le.flatMap((e) => Array(26).fill(e.x)), "individual-opening-lotus-petals"), je = new fe(), Gt = [], Nt = [], Un = [], Gn = 54;
  Gt.push(0, 4e-3, 0), Nt.push(1027 / 1774, 1 - 222 / 887);
  for (let e = 0; e <= Gn; e++) {
    const t = 0.11 + (Math.PI * 2 - 0.22) * e / Gn, n = 0.4 * (1 + 0.023 * Math.sin(t * 7)), a = Math.sin(t) * n, o = Math.cos(t) * n;
    Gt.push(a, 0.016 * Math.sin(t * 3) + 0.01, o), Nt.push((1027 + a / 0.4 * 151) / 1774, 1 - (222 + o / 0.4 * 112) / 887), e > 0 && Un.push(0, e, e + 1);
  }
  je.setAttribute("position", new L(Gt, 3)), je.setAttribute("uv", new L(Nt, 2)), je.setIndex(Un), je.computeVertexNormals(), M.add(je);
  const vt = [];
  le.forEach((e) => {
    for (let t = 0; t < 3; t++) vt.push({ x: e.x + (t - 1) * 0.49, z: e.z + 0.33 + t % 2 * 0.3, scale: 0.52 + k() * 0.35, phase: e.phase + t * 1.3 });
  });
  const Pe = new Pt(je, en, vt.length);
  Pe.name = "real-notched-floating-leaf-discs", Pe.instanceMatrix.setUsage(qt), Pe.frustumCulled = !1, A.add(Pe), M.add(Pe);
  const Nn = new Qa(0.014, 0.021, 1, 8);
  M.add(Nn);
  const ze = new Pt(Nn, tt, le.length);
  ze.name = "lotus-stems-rooted-below-water", ze.instanceMatrix.setUsage(qt), A.add(ze), M.add(ze);
  const Dn = new Zt(0.056, 12, 8);
  M.add(Dn);
  const Oe = new Pt(Dn, va, le.length);
  Oe.name = "volumetric-lotus-hearts", A.add(Oe), M.add(Oe);
  const Fn = new Zt(0.4, 10, 6);
  M.add(Fn);
  const $n = _(Ie, { transparent: !0, opacity: 0, depthWrite: !1 }, "aquatic-pick-volumes");
  $n.visible = !1, le.forEach((e, t) => {
    ce.compose(new P(e.x, (e.y + G - 0.16) / 2, e.z), new Ke(), new P(1, e.y - G + 0.16, 1)), ze.setMatrixAt(t, ce);
    const n = new re(Fn, $n);
    n.position.set(e.x, e.y + 0.12, e.z), A.add(n), U.push({ id: `lotus-${t}`, type: "lotus", title: e.raised ? "A pink lotus" : "A water lily", object: n, point: [e.x, e.y, e.z], stand: [e.x, 0, 2.2] });
  });
  const Dt = [];
  for (let e = -8.5; e < R; e += 6.8) Dt.push({ x: e + k() * 0.55, z: xe(e) + 0.24 + k() * 0.35, phase: k() * 6.28 });
  let Xn = 0, Wn = 0;
  Dt.forEach((e, t) => {
    for (let n = 0; n < 5; n++) {
      const a = e.x + (k() - 0.5) * 0.35, o = e.z + (k() - 0.5) * 0.21, r = 0.92 + k() * 0.64, d = (k() - 0.5) * 0.24;
      vn("reed-stem", [[a, G - 0.14, o], [a + d * 0.2, G + r * 0.45, o + 0.01], [a + d, G + r, o + 0.03]], 8e-3, tt, () => [0.5, 0.5]);
      for (let s = 0; s < 5; s++) {
        const l = G + 0.11 + s * r * 0.16, c = 0.35 + k() * 0.29, u = (s + n) % 2 ? 1 : -1, m = n * 1.27 + s * 0.61, g = Math.cos(m) * u, h = Math.sin(m) * u, b = [], p = [], i = [];
        for (let f = 0; f <= 12; f++) {
          const x = f / 12, w = 0.038 * Math.sin(x * Math.PI), y = new P(a + g * c * x, l + 0.2 * Math.sin(x * Math.PI) - 0.22 * x * x, o + h * c * x), T = new P(-h, 0, g).multiplyScalar(w);
          if (b.push(...y.clone().sub(T).toArray(), ...y.clone().add(T).toArray()), p.push(0, x, 1, x), f < 12) {
            const E = f * 2;
            i.push(E, E + 1, E + 2, E + 1, E + 3, E + 2);
          }
        }
        const v = new fe();
        v.setAttribute("position", new L(b, 3)), v.setAttribute("uv", new L(p, 2)), v.setIndex(i), Mn(v, Et, new Qt()), v.dispose(), Xn++;
      }
      for (let s = 0; s < 13; s++) {
        const l = s / 13, c = G + r - 0.11 + l * 0.31, u = 0.115 * (1 - l) + 0.025;
        for (const m of [-1, 1]) {
          const g = [a + d, c, o + 0.03], h = [a + d + m * u, c + 0.032, o + 0.03 + Math.sin(s * 1.7 + n) * u * 0.56];
          vn("fine-panicle-branch", [g, h], 35e-4, Bt, () => [0.5, X.clamp(l, 0.05, 0.95)]), Wn++;
        }
      }
    }
  });
  const _n = { value: 0 };
  [tt, Et, Bt].forEach((e) => {
    e.onBeforeCompile = (t) => {
      t.uniforms.uRiversideWind = _n, t.vertexShader = `uniform float uRiversideWind;
` + t.vertexShader, t.vertexShader = t.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      #ifndef USE_INSTANCING
      float anchor=clamp((position.y+1.5)/1.7,0.,1.);
      transformed.x+=.025*sin(uRiversideWind*.72+position.x*.34)*anchor*anchor;
      transformed.z+=.014*sin(uRiversideWind*.58+position.x*.29)*anchor*anchor;
      #endif`);
    }, e.customProgramCacheKey = () => "rooted-reed-wind-v1";
  });
  const qe = [], Ln = [];
  function xt(e, t, n, a) {
    const o = n ? [1356, 478, 1545, 828] : [1546, 587, 1762, 829], r = a * (o[2] - o[0]) / (o[3] - o[1]), d = [[e - r * 0.52, t + 0.025], [e + r * 0.52, t + 0.025], [e + r * 0.52, t - 0.92], [e - r * 0.52, t - 0.92]], s = Math.max(Re(e, t), Re(e, t - 0.46), ...d.map(([w, y]) => Re(w, y))) + 8e-3, l = jt[0], c = 4, u = 24, m = (w, y) => {
      const T = y / u * Math.PI * 2, E = X.lerp(r * 0.42, r * 1.16, w / c), O = e + Math.sin(T) * E, ae = t - 0.43 + Math.cos(T) * E * 0.73;
      return [O, X.lerp(s + 0.012, Re(O, ae) - 0.012, w / c), ae];
    }, g = ([w, y, T]) => {
      const E = ut.reduce((de, q) => ht(w, T, q) > ht(w, T, de) ? q : de, ut[0]), O = Rt((w + 18) / E.span + E.phase), ae = Vt((w + 18) / E.span + E.phase), me = E.height * (690 - ae) / 450;
      return [O, 1 - (690 - X.clamp(y / (me || 1), 0, 1) * (690 - ae)) / 724];
    };
    for (let w = 0; w < c; w++) for (let y = 0; y < u; y++) {
      const T = [m(w, y), m(w + 1, y), m(w + 1, y + 1), m(w, y + 1)];
      K(l, T, T.map(g));
    }
    const h = [e, s + 0.012, t - 0.43];
    for (let w = 0; w < u; w++) {
      const y = m(0, w), T = m(0, w + 1);
      Ce(l, h, y, T, g(h), g(y), g(T));
    }
    const b = (w) => e + (w - (o[0] + o[2]) / 2) / (o[2] - o[0]) * r, p = (w) => s + (o[3] - w) / (o[3] - o[1]) * a, i = (w) => [(o[0] + (w[0] - e + r / 2) / r * (o[2] - o[0])) / 1774, 1 - (o[3] - (w[1] - s) / a * (o[3] - o[1])) / 887];
    function v(w, y, T, E = nt) {
      const [O, ae, me, de] = w, q = [[b(O), p(de), y], [b(me), p(de), y], [b(me), p(ae), y], [b(O), p(ae), y]], oe = q.map((I) => [I[0], I[1], I[2] - T]);
      K(E, q, q.map(i)), K(Ee, [oe[1], oe[0], oe[3], oe[2]], ot([1597, 721, 1678, 771], be.garden));
      for (let I = 0; I < 4; I++) K(Ee, [q[I], oe[I], oe[(I + 1) % 4], q[(I + 1) % 4]], ot([1597, 721, 1678, 771], be.garden));
    }
    function f(w) {
      const [y, T, E, O] = w, ae = (y + E) / 2, me = [[y, O - 13], [y + 5, O], [E - 5, O], [E, O - 13], [E - 16, O - 5], [ae, T], [y + 16, O - 5]], de = r * 0.56, q = me.map(([I, j]) => [b(I), p(j), t - (O - j) / (O - T) * de]), oe = q.map((I) => new ma(I[0], I[1]));
      fa.isClockWise(oe) && (oe.reverse(), q.reverse());
      for (const I of fa.triangulateShape(oe, [])) {
        const j = I.map((J) => q[J]);
        Ce(nt, ...j, ...j.map(i)), Ce(Ee, [j[2][0], j[2][1], j[2][2] - 0.07], [j[1][0], j[1][1], j[1][2] - 0.07], [j[0][0], j[0][1], j[0][2] - 0.07], ...j.map(i).reverse());
      }
      q.forEach((I, j) => {
        const J = q[(j + 1) % q.length];
        K(Ee, [I, [I[0], I[1], I[2] - 0.07], [J[0], J[1], J[2] - 0.07], J], [i(I), i(I), i(J), i(J)]);
      });
    }
    n ? ([[1358, 478, 1544, 570], [1358, 580, 1544, 645], [1358, 670, 1544, 710]].forEach(f), [[1392, 565, 1511, 601], [1392, 633, 1511, 677], [1393, 706, 1510, 793]].forEach((w) => v(w, t - 0.17, 0.57)), v([1365, 792, 1540, 828], t + 0.02, 0.86)) : (f([1547, 588, 1761, 705]), v([1583, 702, 1735, 808], t - 0.16, 0.7), v([1563, 808, 1751, 829], t + 0.02, 0.9)), (n ? [0.3, 0.55, 0.77] : [0.43]).forEach((w) => {
      const y = new da(r * 0.11, a * 0.07, 0.055);
      M.add(y);
      const T = new re(y, nn);
      T.position.set(e - r * 0.15, s + a * w, t - 0.11), A.add(T);
      const E = new no("#ffcc89", 0, 2.9, 2);
      E.position.copy(T.position), E.position.z += 0.13, A.add(E), qe.push(E);
    }), Ln.push({ x: e, z: t, baseY: s, height: a, tower: n, terrainY: Re(e, t) });
  }
  xt(7.5, -24, !0, 2.15), xt(28, -32, !1, 1.65), xt(51, -19, !1, 1.8), xt(73, -38, !0, 2.3);
  const ne = new At();
  ne.name = "temporary-swimming-kohaku", ne.visible = !1, A.add(ne);
  const Ze = new Zt(1, S ? 16 : 24, 10), Ft = Ze.attributes.position, Ca = Ze.attributes.uv;
  for (let e = 0; e < Ft.count; e++) {
    const t = new P().fromBufferAttribute(Ft, e);
    t.set(t.x * 0.35, t.y * 0.072, t.z * 0.11), Ft.setXYZ(e, t.x, t.y, t.z), Ca.setXY(e, (1185 + t.x / 0.35 * 141) / 1774, 1 - (700 - t.z / 0.11 * 64) / 887);
  }
  Ze.computeVertexNormals(), M.add(Ze);
  const Yn = new re(Ze, at);
  Yn.renderOrder = 5, ne.add(Yn);
  const yt = new At();
  yt.position.x = -0.33, ne.add(yt);
  function $t(e, t, n, a) {
    const o = new fe();
    o.setAttribute("position", new L(n.flat(), 3)), o.setAttribute("uv", new L(a.flat().map((d, s) => s % 2 ? 1 - d / 887 : d / 1774), 2)), o.setIndex([0, 1, 2, 0, 2, 3]), o.computeVertexNormals(), M.add(o);
    const r = new re(o, at);
    return r.name = t, r.renderOrder = 5, e.add(r), r;
  }
  $t(yt, "separate-koi-tail", [[0, 0, -0.035], [-0.23, 4e-3, -0.155], [-0.19, 4e-3, 0.165], [0, 0, 0.035]], [[1075, 665], [886, 575], [953, 808], [1075, 731]]), $t(ne, "left-translucent-pectoral-fin", [[0.17, 4e-3, 0.075], [0.03, -6e-3, 0.235], [-0.1, -8e-3, 0.2], [-0.02, 4e-3, 0.075]], [[1227, 719], [1179, 792], [1116, 781], [1182, 729]]), $t(ne, "right-translucent-pectoral-fin", [[0.17, 4e-3, -0.075], [-0.02, 4e-3, -0.075], [-0.1, -8e-3, -0.2], [0.03, -6e-3, -0.235]], [[1227, 682], [1182, 674], [1116, 588], [1179, 596]]);
  const Xt = new Ka(0.975, 1, 64);
  Xt.rotateX(-Math.PI / 2), M.add(Xt);
  const On = [];
  for (let e = 0; e < 3; e++) {
    const t = _(Ie, { color: "#c6b78c", transparent: !0, opacity: 0, depthWrite: !1, side: De, toneMapped: !1 }, `koi-surface-ripple-${e}`), n = new re(Xt, t);
    n.renderOrder = 6, n.visible = !1, A.add(n), On.push(n);
  }
  let qn = -100, Ue = [0, G, 6];
  function Zn(e) {
    const t = Array.isArray(e) ? e : [e.x, e.y, e.z], n = X.clamp(t[0], z + 1, R - 1), a = X.clamp(t[2], xe(n) + 0.45, 16.8);
    return Ue = [n, G, a], qn = N, ne.visible = !0, Ue;
  }
  for (const e of B.values()) {
    const t = e.mat, n = new fe();
    n.setAttribute("position", new L(e.p, 3)), n.setAttribute("normal", new L(e.n, 3)), n.setAttribute("uv", new L(e.uv, 2)), n.computeBoundingSphere(), M.add(n);
    const a = new re(n, t);
    a.name = `merged-${t.name}`, a.castShadow = t !== nt && t !== Ee, a.receiveShadow = !0, (e.sector === null ? A : H(e.sector)).add(a), e.p.length = e.n.length = e.uv.length = 0;
  }
  let Wt = 1;
  const Qn = new P(0, 1, 0), Kn = new P(1, 0, 0), _t = new Ke(), Hn = new Ke();
  function Jn(e, t, n, a) {
    const o = typeof a == "number" ? a : a?.x;
    Number.isFinite(o) && (Be = o);
    for (const { group: s, centre: l } of $.values()) s.visible = Math.abs(l - Be) < (S ? 24 : 28);
    qe.forEach((s) => s.visible = V && Math.abs(s.position.x - Be) < (S ? 25 : 35)), N = Number.isFinite(t) ? t : N + Math.min(e || 0, 0.08), un.value = N, _n.value = N, Wt = X.damp(Wt, V ? 0 : 1, 2, e || 0.016), gt.value = Math.max(0, N - Pn), An.value = gt.value < 3.2 ? Math.sin(Math.PI * gt.value / 3.2) ** 2 : 0;
    let r = 0;
    le.forEach((s, l) => {
      const c = 0.019 * Math.sin(N * 0.66 + s.phase), u = X.lerp(0.16, 1.18, Wt), m = s.x + Math.sin(N * 0.66 + s.phase) * 0.012, g = s.y + (s.raised ? 0 : pn(s.x, s.z, N));
      for (let i = 0; i < 3; i++) {
        const v = [12, 9, 5][i], f = s.scale * [1, 0.81, 0.63][i];
        for (let x = 0; x < v; x++) {
          const w = x / v * Math.PI * 2 + i * 0.26;
          _t.setFromAxisAngle(Qn, w), Hn.setFromAxisAngle(Kn, u * (1 - i * 0.17) + c), _t.multiply(Hn), ce.compose(new P(m, g, s.z), _t, new P(f, f, f)), Mt.setMatrixAt(r++, ce);
        }
      }
      ce.compose(new P(m, g + 0.035, s.z), new Ke(), new P(s.scale, s.scale * 0.62, s.scale)), Oe.setMatrixAt(l, ce);
      const h = new P(s.x, G - 0.16, s.z), b = new P(m, g, s.z), p = b.clone().sub(h);
      mt.setFromUnitVectors(Qn, p.clone().normalize()), ce.compose(h.clone().add(b).multiplyScalar(0.5), mt, new P(1, p.length(), 1)), ze.setMatrixAt(l, ce);
    }), Mt.commit(), Oe.instanceMatrix.needsUpdate = !0, ze.instanceMatrix.needsUpdate = !0, vt.forEach((s, l) => {
      mt.setFromAxisAngle(Kn, 0.012 * Math.sin(N * 0.52 + s.phase)), ce.compose(new P(s.x, G + 0.025 + pn(s.x, s.z, N) + 2e-3 * Math.sin(N * 0.7 + s.phase), s.z), mt, new P(s.scale, 1, s.scale)), Pe.setMatrixAt(l, ce);
    }), Pe.instanceMatrix.needsUpdate = !0;
    const d = N - qn;
    ne.visible = d >= 0 && d < 7.5, ne.visible && (ne.position.set(Ue[0] + Math.sin(d * 0.44) * 0.85, G - 0.055 - Math.max(0, d - 5.8) * 0.09, Ue[2] + Math.cos(d * 0.44) * 0.22), ne.rotation.y = -Math.atan2(-Math.sin(d * 0.44) * 0.22, Math.cos(d * 0.44) * 0.85), yt.rotation.y = 0.36 * Math.sin(d * 7.1), at.opacity = 0.66 * Math.min(1, d * 2.5, Math.max(0, (7.5 - d) / 1.3))), On.forEach((s, l) => {
      const c = d - l * 0.37;
      s.visible = c >= 0 && c < 2.3, s.visible && (s.position.set(Ue[0], G + 0.035, Ue[2]), s.scale.setScalar(0.14 + c * 0.42), s.material.opacity = 0.19 * (1 - c / 2.3));
    });
  }
  function ea(e) {
    V = !!e, we.color.set(V ? "#8a91a0" : "#c1bdb4"), Me.color.set(V ? "#7b8391" : "#c2beb4"), et.color.set(V ? "#414650" : "#756f63"), ln.color.set(V ? "#697280" : "#b8b4a5"), Xe.color.set(V ? "#8eabb6" : "#dde7db"), Xe.emissiveIntensity = V ? 0.035 : 0, ft.setTheme(V), En.uniforms.uStrength.value = V ? 0.19 : 0.3, tn.color.set(V ? "#a8abbc" : "#fff0ed"), en.color.set(V ? "#81939a" : "#ffffff"), nt.color.set(V ? "#79838c" : "#ffffff"), Ee.color.set(V ? "#707b84" : "#a39d8c"), nn.opacity = V ? 0.43 : 0.04, qe.forEach((t) => {
      t.intensity = V ? 0.18 : 0, t.visible = V && Math.abs(t.position.x - Be) < (S ? 25 : 35);
    }), jt.forEach((t, n) => t.color.set(V ? ["#748390", "#647482", "#566777"][n] : "#ffffff")), at.color.set(V ? "#a4b6c0" : "#ffffff");
  }
  ea(!1), Jn(0.016, 0), Mt.bounds(), U.push({ id: "river-water", type: "river", title: "A quiet ripple", object: pt, point: [0, G, 6], stand: [0, 0, 2.2] });
  const Ra = {
    units: "metres",
    bounds: [z, R],
    bricks: an,
    slabs: on,
    water: { connected: !0, y: G, segments: [ue, dt], animatedNormals: !0 },
    flora: { flowers: le.length, pads: vt.length, reedClumps: Dt.length, reedBlades: Xn, reedPanicleBranches: Wn, nightPetalsFold: !0 },
    trees: Bn,
    distantSites: Ln,
    staticDrawCalls: B.size + Ve.size,
    staticTriangles: ie + Ut,
    treeGeometry: { batches: Ve.size, triangles: Ut, branches: Tn, tufts: Cn, needles: bt, attributeBytesBefore: Rn, attributeBytesAfter: Vn, indexedWithoutSimplification: !0, materials: ft.diagnostics },
    segments: { width: F, count: $.size, petalGroups: Mt.segments },
    get activeDetailSegments() {
      return [...$.values()].filter((e) => e.group.visible).length;
    },
    get activeNightLights() {
      return qe.filter((e) => e.visible && e.intensity > 0).length;
    },
    authoredNightLights: qe.length,
    sourceTextures: D.size,
    sourceInputs: 6,
    koi: { temporary: !0, volume: !0, tailArticulated: !0 },
    limitations: [
      "The original paintings contain baked light; hidden sides, physical thickness and 3D botanical structure are authored interpretations, not a recovered 360-degree model.",
      "The river uses animated geometry and normals with the original water paint; it does not include expensive screen-space reflections.",
      "Distant mountain paint is mapped onto rolling heightfields. Source pigment is preserved while depth and unseen slopes are inferred.",
      "Pine trunks, roots, boughs and individual needle bundles are closed three-dimensional geometry. The painted front guides unequal crown tiers; hidden branches and botanical thickness are authored interpretations."
    ]
  };
  return {
    root: A,
    update: Jn,
    setTheme: ea,
    showKoi: Zn,
    stir: Zn,
    breeze: ka,
    diagnostics: Ra,
    interactables: U,
    terrainHeight: Re,
    shoreZ: xe,
    walkAreas: [{ minX: z, maxX: R, minZ: 0, maxZ: 3.18, y: 0 }],
    dispose() {
      M.forEach((e) => e.dispose()), D.forEach(pa), A.clear();
    }
  };
}
export {
  io as createFaithfulRiverside
};
