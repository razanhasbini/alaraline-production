import * as THREE from 'three';

// The Christmas ribbon, as real satin: soft strips whose shape is recomputed every frame, so the ribbon can bend,
// lift and flow. Two bands cross on the lid (one round the sides, one front to back), tied in a bow with two loops
// and two tails. Untying: one tail is pulled, the loops slip through the knot, then the bands lift off the box from
// the knot outward and float away. untie() and peel() take 0…1; running them backwards wraps the box again.

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

class Strip {
  mesh: THREE.Mesh;
  private pos: Float32Array;
  private geo: THREE.BufferGeometry;
  private n: number;
  constructor(n: number, mat: THREE.Material) {
    this.n = n;
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3);
    const idx: number[] = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
  }
  // centre line, the direction of the ribbon's width at each point, and its width
  set(p: THREE.Vector3[], across: THREE.Vector3[], width: (i: number) => number) {
    for (let i = 0; i < this.n; i++) {
      const w = width(i) / 2, a = across[i];
      this.pos.set([p[i].x - a.x * w, p[i].y - a.y * w, p[i].z - a.z * w, p[i].x + a.x * w, p[i].y + a.y * w, p[i].z + a.z * w], i * 6);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
  }
}

// a band wrapped round the box: a rounded rectangle in one plane, starting at the knot on the lid
function band(halfSpan: number, top: number, n: number, along: 'x' | 'z', offset: number) {
  const r = .035, a = halfSpan, b = 0, t = top;
  // corners of the rectangle (u along the band's axis, v up), clockwise from the top middle
  const pts: [number, number, number, number][] = [];   // u, v, normal u, normal v
  const arc = (cu: number, cv: number, from: number, to: number) => { for (let k = 0; k <= 6; k++) { const ang = from + (to - from) * k / 6; pts.push([cu + Math.cos(ang) * r, cv + Math.sin(ang) * r, Math.cos(ang), Math.sin(ang)]); } };
  pts.push([0, t, 0, 1]);
  arc(a - r, t - r, Math.PI / 2, 0);
  arc(a - r, b + r, 0, -Math.PI / 2);
  arc(-a + r, b + r, -Math.PI / 2, -Math.PI);
  arc(-a + r, t - r, Math.PI, Math.PI / 2);
  pts.push([0, t, 0, 1]);
  // resample evenly along the length
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = len[len.length - 1];
  const out: { p: THREE.Vector3; n: THREE.Vector3; d: number }[] = [];
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1) * L;
    let k = 1; while (k < len.length - 1 && len[k] < s) k++;
    const f = (s - len[k - 1]) / (len[k] - len[k - 1] || 1);
    const u = pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f, v = pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f;
    const nu = pts[k - 1][2] + (pts[k][2] - pts[k - 1][2]) * f, nv = pts[k - 1][3] + (pts[k][3] - pts[k - 1][3]) * f;
    const p = along === 'x' ? new THREE.Vector3(u, v, offset) : new THREE.Vector3(offset, v, u);
    const nn = (along === 'x' ? new THREE.Vector3(nu, nv, 0) : new THREE.Vector3(0, nv, nu)).normalize();
    out.push({ p, n: nn, d: Math.min(s, L - s) / (L / 2) });   // d: 0 at the knot, 1 under the box
  }
  return out;
}

export function createRibbon(box: { w: number; d: number; h: number; knotX: number; knotZ: number }, mat: THREE.Material) {
  const group = new THREE.Group();
  const WIDTH = .2, N = 180;
  const top = box.h + .012;
  const bands = [
    { path: band(box.w / 2 + .012, top, N, 'x', box.knotZ), across: new THREE.Vector3(0, 0, 1), strip: new Strip(N, mat) },
    { path: band(box.d / 2 + .012, top, N, 'z', box.knotX), across: new THREE.Vector3(1, 0, 0), strip: new Strip(N, mat) },
  ];
  // the bands start a hair above the lid so they never fight with it; z-offset the second so they cross cleanly
  bands[1].path.forEach(b => b.p.addScaledVector(b.n, .004));
  bands.forEach(b => group.add(b.strip.mesh));

  const knotAt = new THREE.Vector3(box.knotX, top + .012, box.knotZ);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(.1, 32, 16), mat);
  knot.scale.set(1, .45, .8); knot.position.copy(knotAt); knot.castShadow = true; group.add(knot);

  const LOOP_N = 48, TAIL_N = 40;
  const loops = [new Strip(LOOP_N, mat), new Strip(LOOP_N, mat)];
  const tails = [new Strip(TAIL_N, mat), new Strip(TAIL_N, mat)];
  [...loops, ...tails].forEach(s => group.add(s.mesh));

  const P = Array.from({ length: Math.max(N, LOOP_N, TAIL_N) }, () => new THREE.Vector3());
  const A = Array.from({ length: Math.max(N, LOOP_N, TAIL_N) }, () => new THREE.Vector3());
  const tmp = new THREE.Vector3(), tan = new THREE.Vector3();
  const flyDir = new THREE.Vector3(.9, 0, .45);

  let untie = 0, peel = 0, clock = 0;

  const draw = () => {
    /* ---- the bands: lift off from the knot outward, rise and drift away, then thin out ---- */
    const front = peel * 1.45;
    const fade = 1 - smooth(.72, 1, peel);
    for (const b of bands) {
      b.path.forEach((pt, i) => {
        const lift = smooth(0, .32, front - pt.d);
        P[i].copy(pt.p)
          .addScaledVector(pt.n, lift * .22)
          .add(tmp.set(0, 1, 0).multiplyScalar(lift * lift * 2.6))
          .addScaledVector(flyDir, lift * lift * 1.3);
        P[i].y += Math.sin(pt.d * 9 - clock * 5) * .05 * lift;   // a soft ripple as it flies
        A[i].copy(b.across);
        if (lift > 0) A[i].applyAxisAngle(tmp.set(0, 1, 0), lift * .6).normalize();   // the satin twists a little
      });
      b.strip.set(P, A, () => WIDTH * fade);
      b.strip.mesh.visible = fade > .01;
    }

    /* ---- the bow: loops slip through as the tail is pulled; the knot goes with them ---- */
    const pull = smooth(0, 1, untie);
    const loopSize = 1 - pull;
    loops.forEach((s, side) => {
      const sx = side ? 1 : -1;
      for (let i = 0; i < LOOP_N; i++) {
        const th = i / (LOOP_N - 1) * Math.PI * 2;
        const L = .42 * loopSize, h = .13 * loopSize;
        P[i].set(sx * L * (1 - Math.cos(th)) / 2, h * Math.sin(th) + .05 * loopSize * (1 - Math.cos(th)), -.06 * Math.sin(th) * loopSize)
          .applyAxisAngle(tmp.set(0, 1, 0), sx * .18).add(knotAt);
        A[i].set(0, .45, 1).normalize();
      }
      s.set(P, A, () => WIDTH * .95 * Math.max(.001, loopSize));
      s.mesh.visible = loopSize > .01;
    });
    knot.scale.set(1, .45, .8).multiplyScalar(Math.max(.001, 1 - smooth(.65, 1, untie)));

    tails.forEach((s, side) => {
      const sx = side ? 1 : -1;
      const pulled = side === 1;                                 // the right tail is the one that gets pulled
      const len = pulled ? .62 + 1.4 * pull : .58 * (1 - pull);
      for (let i = 0; i < TAIL_N; i++) {
        const f = i / (TAIL_N - 1), s2 = f * len;
        // resting: lying on the lid toward the front corners, with a soft wave
        P[i].set(sx * (.06 + s2 * .62), .006 + Math.max(0, Math.sin(f * 7 + side)) * .015, .05 + s2 * .78).add(knotAt);
        if (pulled) {
          // being pulled: the tail rises up and away in a smooth curve, rippling
          P[i].y += pull * Math.pow(f, 1.4) * 1.5 + Math.sin(f * 8 - clock * 6) * .04 * pull;
          P[i].x += pull * f * .5;
          P[i].addScaledVector(flyDir, peel * peel * 2.4 * f);
          P[i].y += peel * peel * 2 * f;
        }
        P[i].y = Math.max(P[i].y, top + .006);
        if (i > 0) { tan.subVectors(P[i], P[i - 1]).normalize(); A[i].crossVectors(tan, tmp.set(0, 1, 0)).normalize(); } else A[i].set(.8, 0, -.6).normalize();
        if (i === 1) A[0].copy(A[1]);
      }
      const end = (i: number) => (i > TAIL_N - 4 ? .75 : 1);      // a cut, slightly narrower end
      s.set(P, A, i => WIDTH * .9 * end(i) * (pulled ? fade : Math.max(.001, 1 - pull)));
      s.mesh.visible = pulled ? fade > .01 : pull < .99;
    });

    group.visible = !(peel >= .999 && untie >= .999);
  };
  draw();

  return {
    group,
    // untie 0…1 (bow), peel 0…1 (bands); t = the scene clock, for the ripple
    update: (u: number, p: number, t: number) => { untie = u; peel = p; clock = t; draw(); },
  };
}
