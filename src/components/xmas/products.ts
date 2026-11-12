import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// The five products in the PR box. Each has two forms:
//   model  a 3D version at its real proportions wearing its real label, for lying in the tray seen from above;
//   photo  the studio photo itself, cut out, shown when the product stands facing the viewer.
// Built standing up: y is up, the label faces +z. Scene units ≈ 10 cm: the 500 mL bottles are 1.42 tall.

const PRODUCTS = `/live/xmas/products/`;

const loadTex = (loader: THREE.TextureLoader, file: string, aniso: number) => {
  const t = loader.load(PRODUCTS + file);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  return t;
};

// satin-gloss plastic: soft studio highlights, like the bottles in the product shots
const softPlastic = (colour: string, extra: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({
  color: colour, roughness: .4, clearcoat: .55, clearcoatRoughness: .22, sheen: .25, sheenColor: new THREE.Color('#ffe4ee'), sheenRoughness: .5, ...extra,
});
// a printed label: lit by the scene, and lit a little by itself so it keeps the photo's own colour and shading
const labelled = (map: THREE.Texture, extra: THREE.MeshPhysicalMaterialParameters = {}) =>
  softPlastic('#ffffff', { map, emissiveMap: map, emissive: new THREE.Color('#ffffff'), emissiveIntensity: .22, ...extra });

// `front`: how far the label face sits in front of the centre; the photo lies there when the product is in the tray
export type Built = { group: THREE.Group; height: number; model: THREE.Group; photo: THREE.Mesh; front: number | null };

// moves what was built into `model` and adds the photo: `w` wide, its centre `cy` above the group's origin
function withPhoto(g: THREE.Group, height: number, loader: THREE.TextureLoader, aniso: number, file: string, w: number, h: number, cy: number, front: number | null): Built {
  const model = new THREE.Group();
  while (g.children.length) model.add(g.children[0]);
  g.add(model);
  const map = loadTex(loader, file, aniso);
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: .03, opacity: 0, toneMapped: false }));
  photo.position.set(0, cy, front ?? .38);   // no `front`: the jar, whose photo stands just in front of its body photo.visible = false; photo.renderOrder = 2;
  g.add(photo);
  return { group: g, height, model, photo, front };
}

// Hydra Gloss / Intense Hydration: 500 mL soft-square bottle with a round screw cap
export function bottle(loader: THREE.TextureLoader, labelFile: string, aniso: number, photoFile: string): Built {
  const g = new THREE.Group();
  const W = .66, H = 1.42, Dp = .3;
  const body = softPlastic('#de97af');
  const label = labelled(loadTex(loader, labelFile, aniso));
  // the label covers the front face; the other faces are the bottle's own pink
  const shell = new THREE.Mesh(new RoundedBoxGeometry(W, H, Dp, 8, .13), [body, body, body, body, label, body]);
  g.add(shell);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.105, .108, .19, 48), softPlastic('#e49cb6', { roughness: .42 }));
  cap.position.y = H / 2 + .09; g.add(cap);
  // the fine thread line where the cap meets the shoulder
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.104, .006, 8, 48), softPlastic('#d48aa4'));
  ring.rotation.x = Math.PI / 2; ring.position.y = H / 2 + .005; g.add(ring);
  const ph = W * 981 / 423;                                   // the photo's own proportions
  return withPhoto(g, H + .19, loader, aniso, photoFile, W, ph, -H / 2 + ph / 2, Dp / 2 + .004);
}

// Leave-in Hair Cream: a squeeze tube, round at the cap and pressed flat into a crimp at the top
export function tube(loader: THREE.TextureLoader, aniso: number): Built {
  const g = new THREE.Group();
  const RINGS = 48, SEG = 64, L = .995, CAP = .17;   // with the crimp, exactly as long as the tube in the photo
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= RINGS; i++) {
    const v = i / RINGS;                                   // 0 at the cap, 1 at the crimp
    const w = .32 + (.48 - .32) * Math.pow(v, .8);        // wider toward the crimp, as in the photo
    const t = .3 * (1 - Math.pow(v, 2.4)) + .018;         // round at the cap, flat at the crimp
    for (let j = 0; j <= SEG; j++) {
      const u = j / SEG * Math.PI * 2;
      const x = Math.sin(u) * w / 2, z = Math.cos(u) * t / 2;
      pos.push(x, -L / 2 + v * L, z);
      uv.push(x / w + .5, v);                              // the label is projected straight on from the front
    }
  }
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEG; j++) {
    const a = i * (SEG + 1) + j, b = a + SEG + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, labelled(loadTex(loader, 'tube.webp', aniso), { roughness: .44 })));
  const crimp = new THREE.Mesh(new RoundedBoxGeometry(.49, .07, .03, 2, .01), softPlastic('#e08fae'));
  crimp.position.y = L / 2 + .03; g.add(crimp);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.155, .158, CAP, 48), softPlastic('#ffffff', { roughness: .3 }));
  cap.position.y = -L / 2 - CAP / 2; g.add(cap);
  const pw = .49, ph = pw * 733 / 292;
  return withPhoto(g, L + .065 + CAP, loader, aniso, 'photo-tube.png', pw, ph, -L / 2 - CAP + ph / 2, .175);
}

// Buttered Up Mask: a frosted white jar, bowl-shaped, with a pink lid and pink print
export function jar(loader: THREE.TextureLoader, aniso: number): Built {
  const g = new THREE.Group();
  // lathe outlines run bottom to top, so the surfaces face outward
  const lidProfile = [[.366, 0], [.372, .015], [.372, .16], [.365, .185], [.33, .2], [0, .2]].map(([x, y]) => new THREE.Vector2(x, y));
  const lid = new THREE.Mesh(new THREE.LatheGeometry(lidProfile, 96), softPlastic('#efa8c0', { roughness: .4, clearcoat: .35 }));
  g.add(lid);
  const baseProfile = [[0, -.335], [.18, -.33], [.27, -.3], [.322, -.23], [.352, -.14], [.36, -.05], [.356, 0]].map(([x, y]) => new THREE.Vector2(x, y));
  const base = new THREE.Mesh(new THREE.LatheGeometry(baseProfile, 96), new THREE.MeshPhysicalMaterial({
    color: '#f8f2f2', roughness: .32, clearcoat: .4, clearcoatRoughness: .3, sheen: .5, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: .4,
  }));
  g.add(base);
  // the print wraps the front of the jar
  const printTex = loadTex(loader, 'jar-print.png', aniso);
  const print = new THREE.Mesh(new THREE.CylinderGeometry(.3618, .356, .15, 64, 1, true, -1.45, 2.9), new THREE.MeshLambertMaterial({ map: printTex, transparent: true, depthWrite: false }));
  print.position.y = -.08; g.add(print);
  // the top of the lid is the real one, from the photo of the open box (it stands upright in the tray, lid showing)
  const lidMap = loadTex(loader, 'jar-lid-top.png', aniso);
  const lidTop = new THREE.Mesh(new THREE.CircleGeometry(.335, 96), new THREE.MeshBasicMaterial({ map: lidMap, transparent: true, toneMapped: false }));
  lidTop.rotation.x = -Math.PI / 2; lidTop.position.y = .2015; g.add(lidTop);
  g.children.forEach(m => { m.position.y += .068; });     // centre the jar on its height
  const pw = .744, ph = pw * 629 / 730;
  return withPhoto(g, .535, loader, aniso, 'photo-jar.png', pw, ph, 0, null);
}

// The Miracle Pro Edition: square magenta glass, ribbed gold collar, white dropper
export function miracle(loader: THREE.TextureLoader, aniso: number): Built {
  const g = new THREE.Group();
  const W = .47, H = .73, Dp = .21;
  const glass = new THREE.Mesh(new RoundedBoxGeometry(W, H, Dp, 4, .035), new THREE.MeshPhysicalMaterial({
    color: '#e0359a', roughness: .06, transmission: .5, thickness: .35, ior: 1.5, clearcoat: 1, clearcoatRoughness: .04,
    attenuationColor: new THREE.Color('#a40d5e'), attenuationDistance: .5,
  }));
  g.add(glass);
  const printTex = loadTex(loader, 'miracle-print.png', aniso);
  const print = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: printTex, transparent: true, depthWrite: false }));
  print.position.z = Dp / 2 + .002; g.add(print);
  // ribbed collar: a lathe with fine ridges
  const ridges: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= 20; i++) ridges.push(new THREE.Vector2(.074 + (i % 2 ? .005 : 0), i / 20 * .1));
  ridges.push(new THREE.Vector2(0, .1));
  const collar = new THREE.Mesh(new THREE.LatheGeometry(ridges, 64), new THREE.MeshPhysicalMaterial({ color: '#d9ad62', metalness: 1, roughness: .22 }));
  collar.position.y = H / 2; g.add(collar);
  const bulb = new THREE.Mesh(new THREE.CapsuleGeometry(.048, .1, 8, 32), softPlastic('#fbf8f7', { roughness: .35 }));
  bulb.position.y = H / 2 + .1 + .09; g.add(bulb);
  const k = W / 438, pw = 440 * k, ph = 921 * k;                 // the photo's glass is 438 px wide
  return withPhoto(g, H + .29, loader, aniso, 'photo-miracle.png', pw, ph, -H / 2 + ph / 2, Dp / 2 + .004);
}
