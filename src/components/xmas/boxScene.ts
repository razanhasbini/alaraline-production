import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PINK, PINK_INSIDE, lidArt, type Art } from './textures';
import { bottle, jar, miracle, tube, type Built } from './products';
import { createRibbon } from './ribbon';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// The ÀLara Christmas PR box as a short film that plays by itself, in a loop:
//   turn     the box is already in place as the page loads, turning gently to face the front
//   unwrap   straight away, a ribbon tail is pulled, the bow slips undone and the satin lifts away
//   open     the lid swings up, gold sparks burst out, the box glows from inside
//   reveal   the products rise out of the tray and stand in an arc in front of the lid, each with its name
//   settle   they go back into the tray and the camera settles over the open box, where the film ends
// Visitors can drag to turn it at any time and hover a product to bring it forward; Replay plays it again.

export type BoxProduct = { id: string; name: string };
export type Phase = 'arrive' | 'turn' | 'unwrap' | 'open' | 'reveal' | 'settle' | 'rest';
export type BoxScene = { replay: () => void; dispose: () => void };
type Options = {
  reducedMotion: boolean;
  products: BoxProduct[];
  tagLayer: HTMLElement;                       // the scene places each product's name tag here
  onPhase: (p: Phase) => void;
  onActive: (id: string | null) => void;       // the product rising, or under the pointer
};

const W = 3.4, D = 2.4, H = .72, T = .05;
const LID_T = .045, LID_W = W + .05, LID_D = D + .05;
const INSERT_TOP = H - .2;
const OPEN_ANGLE = -1.9;

// the film, in seconds; it plays once and ends over the open box
// it starts straight away: the box is already in place, the ribbon unties at once and the lid is open by 3.6 s
const TL = { untieStart: .3, untieEnd: 1.3, peelStart: .9, peelEnd: 2.5, openEnd: 3.6, riseEnd: 6.6, holdEnd: 13.3, lowerEnd: 15.3, end: 17.1 };
const SPOT = 1.2;   // seconds each product is presented, left to right, once each

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const inOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const smoother = (t: number) => t * t * t * (t * (6 * t - 15) + 10);   // eases in and out with no jolt at either end

function tex(c: HTMLCanvasElement, colour: boolean, aniso: number) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  return t;
}

// a soft round sprite for the glitter, the sparks and the pool of light
function dot(inner: string, outer: string) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d')!, g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner); g.addColorStop(.25, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// fine paper grain, used as a bump map so the box reads as printed board, not plastic
function grain() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!, img = x.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) { const v = 118 + Math.random() * 20; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.colorSpace = THREE.NoColorSpace;
  return t;
}

// a photo studio for reflections: a dark warm room with softboxes, so plastic, glass and gold get real highlights
function studio(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 14, 24), new THREE.MeshBasicMaterial({ color: '#2b0c16', side: THREE.BackSide })));
  const box = (w: number, h: number, x: number, y: number, z: number, colour: string, power: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 1, 0); env.add(m);
  };
  box(9, 4, 0, 6.5, 0, '#fff6ef', 3.2);       // overhead softbox
  box(1.4, 7, -7, 2.5, 1.5, '#fff2ea', 3.2);  // tall strip, left
  box(1.4, 7, 7, 2.5, .5, '#ffe9f0', 2.4);    // tall strip, right
  box(7, 2.2, 0, 1.6, 8, '#fff0e6', 1.3);     // soft front fill
  box(8, 1.2, 0, 3, -8, '#ff9cc0', 1.8);      // pink rim from behind
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, .02).texture;
  pm.dispose();
  return tex;
}

export async function createBoxScene(canvas: HTMLCanvasElement, opts: Options): Promise<BoxScene> {
  await Promise.all(['400 54px "PT Serif"', 'italic 400 40px "PT Serif"'].map(f => document.fonts.load(f)));

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;   // made for product renders: keeps the pinks true
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const loader = new THREE.TextureLoader();

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = pmrem.fromScene(new RoomEnvironment(), .04).texture;   // the gold foil keeps its softer room reflections
  scene.environment = studio(renderer);
  scene.environmentIntensity = .7;
  scene.background = new THREE.Color('#4a0c1f');   // burgundy
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 100);

  scene.add(new THREE.HemisphereLight('#ffe9ef', '#3a0a18', .45));
  const key = new THREE.DirectionalLight('#fff1e4', 1.9);
  key.position.set(-4, 7, 5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 6, bottom: -5, near: 1, far: 20 });
  scene.add(key);
  const rim = new THREE.DirectionalLight('#ffc2d6', 1.5); rim.position.set(3, 3, -6); scene.add(rim);
  const glint = new THREE.PointLight('#ffe2b0', 4, 12, 1.6); glint.position.set(2.5, 3.2, 3); scene.add(glint);
  const fill = new THREE.DirectionalLight('#ffe6ee', .45); fill.position.set(0, 2, 8); scene.add(fill);   // lights the labels

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .32, color: '#12010a' }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const poolMat = new THREE.MeshBasicMaterial({ map: dot('rgba(150,40,64,.5)', 'rgba(120,20,45,0)')   /* a faint wine-red glow, not pink */, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), poolMat);
  pool.rotation.x = -Math.PI / 2; pool.position.y = .005; scene.add(pool);

  const art = await lidArt();
  const bump = grain();
  const paper = (colour: string, rough = .8) => new THREE.MeshPhysicalMaterial({ color: colour, roughness: rough, sheen: .35, sheenColor: new THREE.Color('#ffe3ec'), sheenRoughness: .8, bumpMap: bump, bumpScale: .35 });
  const printed = (a: Art) => new THREE.MeshPhysicalMaterial({ map: tex(a.map, true, aniso), roughness: .82, sheen: .25, sheenColor: new THREE.Color('#ffd9e6'), sheenRoughness: .8, bumpMap: bump, bumpScale: .3 });
  // gold foil: a glossy Phong layer above the print, only where the foil map is white
  // (physically based materials rendered this transparent layer black; Phong keeps the gold and its glint)
  const foilLayer = (a: Art) => new THREE.MeshPhongMaterial({
    map: tex(a.map, true, aniso), alphaMap: tex(a.foil!, false, aniso), transparent: true, depthWrite: false,
    specular: new THREE.Color('#ffe2a8'), shininess: 80, envMap: room, reflectivity: .14, combine: THREE.MixOperation,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
  const outside = paper(PINK), inside = paper(PINK_INSIDE, .85);
  const satin = new THREE.MeshPhysicalMaterial({ color: '#5a0c22', roughness: .34, sheen: 1, sheenColor: new THREE.Color('#d0587a'), sheenRoughness: .28, clearcoat: .4, clearcoatRoughness: .22, side: THREE.DoubleSide });

  const stage = new THREE.Group(); scene.add(stage);     // the visitor's drag turns this
  const spin = new THREE.Group(); stage.add(spin);      // the film's turntable
  const box = new THREE.Group(); spin.add(box);

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, parent: THREE.Object3D = box) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const board = (w: number, h: number, d: number) => new RoundedBoxGeometry(w, h, d, 3, .012);

  /* ---- base, walls, tray ---- */
  add(board(W, T, D), outside, 0, T / 2, 0);
  add(board(W, H, T), [outside, outside, outside, outside, outside, inside], 0, H / 2, -D / 2 + T / 2);
  add(board(W, H, T), [outside, outside, outside, outside, inside, outside], 0, H / 2, D / 2 - T / 2);
  add(board(T, H, D - 2 * T), [inside, outside, outside, outside, outside, outside], -W / 2 + T / 2, H / 2, 0);
  add(board(T, H, D - 2 * T), [outside, inside, outside, outside, outside, outside], W / 2 - T / 2, H / 2, 0);

  const slots = {
    shampoo: { x: -1.2, z: .06, w: .74, l: 1.7 },
    conditioner: { x: -.42, z: .06, w: .74, l: 1.7 },
    tube: { x: .3, z: .22, w: .56, l: 1.3 },
    miracle: { x: 1.13, z: -.55, w: .55, l: 1.06 },
    jar: { x: 1.13, z: .6, r: .39 },
  };
  const rr = (s: THREE.Shape | THREE.Path, cx: number, cz: number, w: number, l: number, r: number) => {
    const x0 = cx - w / 2, z0 = cz - l / 2;
    s.moveTo(x0 + r, z0); s.lineTo(x0 + w - r, z0); s.quadraticCurveTo(x0 + w, z0, x0 + w, z0 + r);
    s.lineTo(x0 + w, z0 + l - r); s.quadraticCurveTo(x0 + w, z0 + l, x0 + w - r, z0 + l);
    s.lineTo(x0 + r, z0 + l); s.quadraticCurveTo(x0, z0 + l, x0, z0 + l - r); s.lineTo(x0, z0 + r); s.quadraticCurveTo(x0, z0, x0 + r, z0);
  };
  const tray = new THREE.Shape(); rr(tray, 0, 0, W - 2 * T, D - 2 * T, .01);
  for (const k of ['shampoo', 'conditioner', 'tube', 'miracle'] as const) { const s = slots[k]; const p = new THREE.Path(); rr(p, s.x, s.z, s.w, s.l, .16); tray.holes.push(p); }
  const jarHole = new THREE.Path(); jarHole.absarc(slots.jar.x, slots.jar.z, slots.jar.r + .02, 0, Math.PI * 2, false); tray.holes.push(jarHole);
  const insert = add(new THREE.ExtrudeGeometry(tray, { depth: .1, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 2, curveSegments: 32 }), inside, 0, INSERT_TOP, 0);
  insert.rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(W - 2 * T, .02, D - 2 * T), paper('#d48aa5', .9), 0, T + .01, 0);   // the floor under the cut-outs

  const glow = new THREE.PointLight('#ffdbe6', 0, 4, 1.5); glow.position.set(0, 1, .2); box.add(glow);

  /* ---- the products: lying in the tray, then standing in the arc for the reveal ---- */
  const LIE = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));   // label up, top toward the back (the tube's cap to the front)
  const UPRIGHT = new THREE.Quaternion();
  type Item = { casting: boolean; id: string; name: string; g: THREE.Group; model: THREE.Group; photo: THREE.Mesh; front: number | null; rest: THREE.Vector3; restQ: THREE.Quaternion; show: THREE.Vector3; showQ: THREE.Quaternion; hover: number; tag: HTMLElement | null; drop: number };
  const items: Item[] = [];
  const nameOf = (id: string) => opts.products.find(p => p.id === id)?.name ?? '';
  // the arc in front of the open lid (box space): x, y, z, a turn toward the centre, a lean back toward the camera
  const showAt: Record<string, [number, number, number, number, number]> = {
    shampoo: [-2.1, 2.0, 1.4, .16, -.1],
    conditioner: [-1.05, 2.3, 1.22, .08, -.1],
    tube: [0, 2.35, 1.16, 0, -.1],
    miracle: [1.02, 2.15, 1.22, -.08, -.1],
    jar: [2.05, 1.8, 1.4, -.16, .1],
  };
  const place = (built: Built, id: string, x: number, y: number, z: number, lying: boolean) => {
    const g = built.group; box.add(g);
    g.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
    const [sx, sy, sz, ry, rx] = showAt[id];
    const name = nameOf(id);
    let tag: HTMLElement | null = null;
    if (name) { tag = document.createElement('span'); tag.className = 'xh-tag'; tag.textContent = name; opts.tagLayer.appendChild(tag); }
    const restQ = (lying ? LIE : UPRIGHT).clone();
    // the name sits just below the product's photo, clear of its cap, even when it steps forward (scaled 1.08)
    const nameDrop = -(built.photo.position.y - (built.photo.geometry as THREE.PlaneGeometry).parameters.height / 2) * 1.08 + .08;
    built.photo.castShadow = false;   // the photo never casts: its 3D body does, and only while resting in the tray
    items.push({ casting: true, id, name, g, model: built.model, photo: built.photo, front: built.front, rest: new THREE.Vector3(x, y, z), restQ, show: new THREE.Vector3(sx, sy, sz), showQ: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)), hover: 0, tag, drop: nameDrop });
    g.position.set(x, y, z); g.quaternion.copy(restQ);
  };
  place(bottle(loader, 'shampoo.webp', aniso, 'photo-shampoo.webp'), 'shampoo', slots.shampoo.x, INSERT_TOP + .02, slots.shampoo.z + .09, true);
  place(bottle(loader, 'conditioner.webp', aniso, 'photo-conditioner.webp'), 'conditioner', slots.conditioner.x, INSERT_TOP + .02, slots.conditioner.z + .09, true);
  // sunk into its slot, with the cap's end against the slot's front wall so only the photo's cap shows
  place(tube(loader, aniso), 'tube', slots.tube.x, INSERT_TOP - .16, slots.tube.z - .03, true);
  place(miracle(loader, aniso), 'miracle', slots.miracle.x, INSERT_TOP + .01, slots.miracle.z + .14, true);
  place(jar(loader, aniso), 'jar', slots.jar.x, T + .02 + .27, slots.jar.z, false);

  /* ---- the lid ---- */
  const hinge = new THREE.Group(); hinge.position.set(0, H + .002, -LID_D / 2); box.add(hinge);
  const lidTop = new THREE.Mesh(new RoundedBoxGeometry(LID_W, LID_T, LID_D, 3, .015), outside); lidTop.position.set(0, LID_T / 2, LID_D / 2); lidTop.castShadow = true; hinge.add(lidTop);
  const plane = (w: number, h: number) => new THREE.PlaneGeometry(w, h);
  const topPrint = new THREE.Mesh(plane(LID_W - .02, LID_D - .02), printed(art.top)); topPrint.rotation.x = -Math.PI / 2; topPrint.position.set(0, LID_T + .001, LID_D / 2); hinge.add(topPrint);
  const topFoil = new THREE.Mesh(topPrint.geometry, foilLayer(art.top)); topFoil.rotation.x = -Math.PI / 2; topFoil.position.set(0, LID_T + .003, LID_D / 2); hinge.add(topFoil);
  // the inside is a photo of the real box, so it is lit mostly by itself to keep the photo's own colour and shine
  const insideMap = tex(art.inside.map, true, aniso);
  const inPrint = new THREE.Mesh(plane(LID_W - .04, LID_D - .04), new THREE.MeshPhysicalMaterial({ map: insideMap, emissiveMap: insideMap, emissive: new THREE.Color('#ffffff'), emissiveIntensity: .45, roughness: .75 }));
  inPrint.rotation.x = Math.PI / 2; inPrint.position.set(0, -.001, LID_D / 2); hinge.add(inPrint);
  const flapH = H + LID_T;
  const flap = new THREE.Mesh(new RoundedBoxGeometry(LID_W, flapH, LID_T, 3, .015), outside); flap.position.set(0, LID_T - flapH / 2, LID_D - LID_T / 2); flap.castShadow = true; hinge.add(flap);
  const flapPrint = new THREE.Mesh(plane(LID_W - .02, flapH - .02), printed(art.flap)); flapPrint.position.set(0, LID_T - flapH / 2, LID_D + .001); hinge.add(flapPrint);
  const flapFoil = new THREE.Mesh(flapPrint.geometry, foilLayer(art.flap)); flapFoil.position.set(0, LID_T - flapH / 2, LID_D + .003); hinge.add(flapFoil);

  /* ---- the satin ribbon ---- */
  // tied off-centre, so the crowned bee, the logo and the bee on the front flap all stay visible
  const ribbon = createRibbon({ w: LID_W, d: LID_D, h: H + LID_T, knotX: -1.15, knotZ: .3 }, satin);
  box.add(ribbon.group);

  /* ---- glitter: gold specks drifting down through the whole scene ---- */
  const GL = 520, gp = new Float32Array(GL * 3), gs: number[] = [];
  for (let i = 0; i < GL; i++) { gp[i * 3] = (Math.random() - .5) * 16; gp[i * 3 + 1] = Math.random() * 8; gp[i * 3 + 2] = (Math.random() - .5) * 10 - 1; gs.push(.15 + Math.random() * .5); }
  const glitterGeo = new THREE.BufferGeometry(); glitterGeo.setAttribute('position', new THREE.BufferAttribute(gp, 3));
  const glitterMat = new THREE.PointsMaterial({ size: .07, map: dot('rgba(255,236,190,1)', 'rgba(255,200,120,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 });
  scene.add(new THREE.Points(glitterGeo, glitterMat));

  /* ---- the burst of sparks when the lid opens ---- */
  const SP = 220, sp = new Float32Array(SP * 3), sv: THREE.Vector3[] = [];
  const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparkMat = new THREE.PointsMaterial({ size: .09, map: dot('rgba(255,244,214,1)', 'rgba(255,190,110,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  box.add(new THREE.Points(sparkGeo, sparkMat));
  let burstAt = -1;
  const burst = (now: number) => {
    burstAt = now;
    for (let i = 0; i < SP; i++) {
      sp[i * 3] = (Math.random() - .5) * 2.4; sp[i * 3 + 1] = INSERT_TOP + .1; sp[i * 3 + 2] = (Math.random() - .5) * 1.6;
      const a = Math.random() * Math.PI * 2, out = .4 + Math.random() * 1.2;
      sv[i] = new THREE.Vector3(Math.cos(a) * out, 2.4 + Math.random() * 2.6, Math.sin(a) * out * .6 + .5);
    }
    sparkGeo.attributes.position.needsUpdate = true;
  };

  /* ---- camera ---- */
  const poses = {
    turn: { pos: new THREE.Vector3(0, 3.5, 7.4), look: new THREE.Vector3(0, .4, 0) },
    reveal: { pos: new THREE.Vector3(0, 4.2, 12.2), look: new THREE.Vector3(0, 1.75, 0) },
    rest: { pos: new THREE.Vector3(0, 7.8, 8.9), look: new THREE.Vector3(0, 1.05, -.45) },
  };
  let wide = true;
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; wide = w / h > 1.25;
    camera.fov = wide ? 28 : 38;
    camera.updateProjectionMatrix();
  };
  const target = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), .07, .35, .98));   // only the sparks
  composer.addPass(new OutputPass());
  const resizeAll = () => {
    resize();
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    composer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    composer.setSize(w, h);
  };
  resizeAll();
  const ro = new ResizeObserver(resizeAll); ro.observe(canvas);

  /* ---- the film's clock and phases ---- */
  let t = opts.reducedMotion ? TL.end : 0;   // reduced motion: the last frame, the products in the open box
  let phase: Phase | null = null;
  let lastActive: string | null = null;
  const setPhase = (p: Phase) => { if (p !== phase) { phase = p; opts.onPhase(p); } };
  const rise = (i: number) => span(t, TL.openEnd - .3 + i * .5, TL.openEnd + 1.3 + i * .5);   // 0 in the tray … 1 in the arc
  const lower = (i: number) => span(t, TL.holdEnd + (items.length - 1 - i) * .22, TL.holdEnd + 1.3 + (items.length - 1 - i) * .22);

  /* ---- the visitor: drag turns the stage (it eases back), hover lifts a product ---- */
  let drag = 0, dragV = 0, dragging = false, lastX = 0;
  let hovered: Item | null = null;
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; dragV = 0; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; };
  const onMove = (e: PointerEvent) => {
    if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; drag += dx * .008; dragV = dx * .5; return; }
    const r = canvas.getBoundingClientRect();
    pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(items.map(i => i.g), true)[0];
    const it = hit ? items.find(i => i.g.getObjectById(hit.object.id)) ?? null : null;
    hovered = it && it.name && (phase === 'reveal' || phase === 'rest') ? it : null;
    canvas.style.cursor = hovered ? 'pointer' : 'grab';
  };
  const onUp = () => { dragging = false; canvas.style.cursor = 'grab'; };
  const onLeave = () => { hovered = null; };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp); canvas.addEventListener('pointerleave', onLeave);
  canvas.style.cursor = 'grab'; canvas.style.touchAction = 'pan-y';

  const pos = new THREE.Vector3(), look = new THREE.Vector3(), v = new THREE.Vector3(), q = new THREE.Quaternion(), sway = new THREE.Quaternion(), yAxis = new THREE.Vector3(0, 1, 0);
  const timer = new THREE.Timer();
  let raf = 0, running = true, smoothDt = 1 / 60;

  const frame = (now?: number) => {
    raf = requestAnimationFrame(frame);
    timer.update(now);
    if (!running) return;
    smoothDt += (Math.min(timer.getDelta(), .05) - smoothDt) * .12;   // a steady clock: one slow frame never jolts the film
    const dt = smoothDt;
    const clock = timer.getElapsed();
    if (!opts.reducedMotion) t = Math.min(TL.end, t + dt);

    setPhase(t < TL.untieStart ? 'turn' : t < TL.peelEnd ? 'unwrap' : t < TL.openEnd ? 'open' : t < TL.holdEnd ? 'reveal' : t < TL.end ? 'settle' : 'rest');

    // the box turns gently to face the front while the ribbon comes off
    spin.rotation.y = -.6 * (1 - smoother(span(t, 0, TL.openEnd)));

    // the ribbon: untie the bow, then lift the bands off (it stays off)
    ribbon.update(inOutSine(span(t, TL.untieStart, TL.untieEnd)), inOutSine(span(t, TL.peelStart, TL.peelEnd)), clock);

    // the lid; the box glows from inside and the pool of light brightens
    const lid = smoother(span(t, TL.peelEnd - .3, TL.openEnd));
    hinge.rotation.x = OPEN_ANGLE * lid;
    glow.intensity = lid * 2.2 * (1 - span(t, TL.riseEnd, TL.riseEnd + 2.5));   // a warm glow as it opens, gone once the products are out
    poolMat.opacity = .3 + lid * .1;
    if (t < TL.peelEnd - .3) burstAt = -1;
    else if (lid > .35 && burstAt < 0 && t < TL.riseEnd && !opts.reducedMotion) burst(clock);

    if (burstAt >= 0) {
      for (let i = 0; i < SP; i++) {
        sv[i].y -= 3.2 * dt;
        sp[i * 3] += sv[i].x * dt; sp[i * 3 + 1] += sv[i].y * dt; sp[i * 3 + 2] += sv[i].z * dt;
      }
      sparkGeo.attributes.position.needsUpdate = true;
      sparkMat.opacity = Math.max(0, 1 - (clock - burstAt) / 2.2);
    }

    // during the hold the film spotlights one product at a time; the pointer overrides it
    const named = items.filter(i => i.name);
    const slot = Math.floor((t - TL.riseEnd - .2) / SPOT);
    const spot = t >= TL.riseEnd + .2 && slot < named.length ? named[slot] : null;
    const focus = hovered ?? spot;

    // products rise out of the tray, stand up into the arc, sway gently, then go back
    let rising: string | null = null;
    items.forEach((it, i) => {
      const k = t < TL.holdEnd ? smoother(rise(i)) : 1 - smoother(lower(i));
      if (k > 0 && k < 1 && t < TL.holdEnd) rising = it.id;
      it.hover += ((it === focus ? 1 : 0) - it.hover) * Math.min(1, dt * 6);
      // a product in the air casts no shadow (floating shadows on the lid and tray looked wrong); in the tray it does
      const casting = k < .02;
      if (casting !== it.casting) { it.casting = casting; it.model.traverse(o => { o.castShadow = casting; }); }
      look.copy(it.show); if (!wide) look.x *= .7;           // phones: a tighter arc
      v.lerpVectors(it.rest, look, k); v.y += Math.sin(k * Math.PI) * .7;   // lift clear of the tray before travelling
      const bob = Math.sin(clock * 1.3 + i) * .05 * k;
      it.g.position.set(v.x, v.y + bob + it.hover * .1, v.z + it.hover * (phase === 'rest' ? .05 : .35));
      q.slerpQuaternions(it.restQ, it.showQ, k);
      sway.setFromAxisAngle(yAxis, Math.sin(clock * .7 + i * 1.7) * .14 * k);
      it.g.quaternion.copy(sway).multiply(q);
      it.g.scale.setScalar(1 + it.hover * .08);

      // the product's own photo is what the viewer sees: lying label-up on its 3D body in the tray (the body gives it
      // thickness and a shadow), turning to face the viewer as it stands up out of the box, and lying back down at the end
      const ph = it.photo.material as THREE.MeshBasicMaterial;
      const face = THREE.MathUtils.smoothstep(k, .25, .85);   // 0 lying with the product … 1 facing the camera
      if (it.front !== null) {
        // the body only gives thickness in the tray: it flattens away behind the photo before the photo starts to
        // turn, so it can never poke out from behind it in the air
        const thick = 1 - THREE.MathUtils.smoothstep(k, .02, .25);
        ph.opacity = 1;
        it.model.visible = thick > .001;
        it.model.scale.z = Math.max(thick, .001);
        it.photo.position.z = it.front * thick;
      } else {
        ph.opacity = THREE.MathUtils.smoothstep(k, .62, .9);  // the jar stands in the tray, so its real lid shows instead
        it.model.visible = ph.opacity < .999;
      }
      it.photo.visible = ph.opacity > .001;
      if (it.photo.visible) {
        it.g.updateMatrixWorld();
        it.g.getWorldQuaternion(q).invert().multiply(camera.quaternion);   // facing the camera, in the product's own space
        it.photo.quaternion.identity().slerp(q, it.front !== null ? face : 1);
      }
    });
    const active = focus ? focus.id : rising;
    if (active !== lastActive) { lastActive = active; opts.onActive(active); }

    const cam = smoother(span(t, TL.peelEnd - 1, TL.riseEnd - .4));
    const settle = smoother(span(t, TL.holdEnd + .2, TL.end));
    pos.lerpVectors(poses.turn.pos, poses.reveal.pos, cam).lerp(poses.rest.pos, settle);
    look.lerpVectors(poses.turn.look, poses.reveal.look, cam).lerp(poses.rest.look, settle);
    pos.x += Math.sin(clock * .25) * .25 * (1 - settle * .6);
    if (!wide) pos.multiplyScalar(1.1 - .16 * cam);
    camera.position.copy(pos); camera.lookAt(look);
    camera.filmOffset = wide ? -6.2 : 0; camera.updateProjectionMatrix();

    if (!dragging) { drag += dragV * dt; dragV *= Math.pow(.02, dt); drag *= Math.pow(.25, dt); }
    stage.rotation.y = drag;

    if (!opts.reducedMotion) {
      for (let i = 0; i < GL; i++) {
        gp[i * 3 + 1] -= gs[i] * dt;
        gp[i * 3] += Math.sin(clock * .6 + i) * .002;
        if (gp[i * 3 + 1] < 0) gp[i * 3 + 1] = 8;
      }
      glitterGeo.attributes.position.needsUpdate = true;
      glitterMat.opacity = .65 + Math.sin(clock * 3) * .2;
    }

    composer.render(dt);

    // name tags under each product while they are out
    const w = canvas.clientWidth, h = canvas.clientHeight;
    items.forEach((it, i) => {
      if (!it.tag) return;
      const k = t < TL.holdEnd ? rise(i) : 1 - lower(i);
      const show = (k > .92 || phase === 'rest') && it === focus;
      it.tag.classList.toggle('is-on', show);
      it.tag.classList.toggle('is-hot', it === hovered);
      if (!show) return;
      it.g.getWorldPosition(v); v.y -= it.drop; v.project(camera);
      it.tag.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px) translate(-50%, 0)`;
    });
  };
  frame();

  const io = new IntersectionObserver(([en]) => { running = en.isIntersecting && !document.hidden; });
  io.observe(canvas);
  const vis = () => { running = !document.hidden; };
  document.addEventListener('visibilitychange', vis);

  return {
    replay: () => { t = opts.reducedMotion ? TL.end : 0; burstAt = -1; },
    dispose: () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', vis);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); canvas.removeEventListener('pointerleave', onLeave);
      items.forEach(i => i.tag?.remove());
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
        mats.forEach(mt => { Object.values(mt).forEach(val => { if (val instanceof THREE.Texture) val.dispose(); }); mt.dispose(); });
      });
      composer.dispose(); target.dispose(); timer.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
