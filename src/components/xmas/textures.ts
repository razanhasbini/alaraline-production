// Textures for the 3D PR box: the pink lid with gold honeycomb, four-point stars, the crowned bee and the ÀLara
// wordmark, drawn in the browser at full resolution; the front flap's gold bee; and the inside of the lid,
// taken from a photo of the real box.
// Each surface returns a colour map and a "foil" map (white where the print is gold, so only the gold is metallic).

export const PINK = '#e7a3bb';
export const PINK_INSIDE = '#eeb0c5';
export const GOLD = '#c08d4a';

export type Art = { map: HTMLCanvasElement; foil?: HTMLCanvasElement };

const load = (src: string) => new Promise<HTMLImageElement>((ok, fail) => {
  const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = src;
});

function canvas(w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')!] as const;
}

// an image used as a stencil, filled with one colour
function tinted(img: CanvasImageSource & { width: number; height: number }, colour: string) {
  const [c, x] = canvas(img.width, img.height);
  x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = colour; x.fillRect(0, 0, c.width, c.height);
  return c;
}

// a line of capitals with even letter spacing, centred on cx
function spaced(x: CanvasRenderingContext2D, text: string, cx: number, y: number, track: number) {
  const chars = [...text], widths = chars.map(ch => x.measureText(ch).width);
  let px = cx - (widths.reduce((a, w) => a + w, 0) + track * (chars.length - 1)) / 2;
  x.textAlign = 'left';
  chars.forEach((ch, i) => { x.fillText(ch, px, y); px += widths[i] + track; });
}

function star(x: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const k = r * .16;
  x.beginPath();
  x.moveTo(cx, cy - r);
  x.quadraticCurveTo(cx + k, cy - k, cx + r, cy); x.quadraticCurveTo(cx + k, cy + k, cx, cy + r);
  x.quadraticCurveTo(cx - k, cy + k, cx - r, cy); x.quadraticCurveTo(cx - k, cy - k, cx, cy - r);
  x.fill();
}

// flat-topped hexagons in a honeycomb, as on the lid's corners
function honeycomb(x: CanvasRenderingContext2D, ox: number, oy: number, r: number, cells: [number, number][]) {
  const h = Math.sqrt(3) * r;
  for (const [c, row] of cells) {
    const cx = ox + c * 1.5 * r, cy = oy + row * h + (c % 2 ? h / 2 : 0);
    x.beginPath();
    for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; x[k ? 'lineTo' : 'moveTo'](cx + r * Math.cos(a), cy + r * Math.sin(a)); }
    x.closePath(); x.stroke();
  }
}

export async function lidArt(): Promise<{ top: Art; flap: Art; inside: Art }> {
  const [bee, logo] = await Promise.all([load(`/live/xmas/lid-bee.webp`), load(`/live/xmas/logo-mask.png`)]);
  const goldLogo = tinted(logo, GOLD), foilLogo = tinted(logo, '#fff');
  const foilBee = tinted(bee, '#fff');

  /* ---- lid top: 2048 × 1452 (the lid is 3.44 × 2.44) ---- */
  const W = 2048, H = 1452;
  const [map, m] = canvas(W, H), [foil, f] = canvas(W, H);
  m.fillStyle = PINK; m.fillRect(0, 0, W, H);
  f.fillStyle = '#000'; f.fillRect(0, 0, W, H);
  const both = (draw: (x: CanvasRenderingContext2D, gold: string) => void) => { draw(m, GOLD); draw(f, '#fff'); };
  both((x, c) => {
    x.strokeStyle = c; x.lineWidth = 15; x.lineJoin = 'round';
    honeycomb(x, 1610, -70, 104, [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1], [3, 2], [4, 1]]);
    honeycomb(x, -120, 980, 104, [[0, 0], [0, 1], [1, 0], [1, 1], [2, 1], [2, 2]]);
    x.fillStyle = c;
    for (const [sx, sy, r] of [[620, 300, 22], [760, 210, 12], [1270, 220, 14], [1330, 330, 20], [1490, 290, 13], [600, 640, 12], [660, 760, 9],
      [1430, 650, 12], [1390, 770, 9], [930, 860, 20], [700, 880, 8], [1530, 520, 8]] as const) star(x, sx, sy, r * 1.35);
  });
  const bw = 820, bh = bw * bee.height / bee.width, bx = (W - bw) / 2, by = 250;
  m.drawImage(bee, bx, by, bw, bh); f.globalAlpha = .9; f.drawImage(foilBee, bx, by, bw, bh); f.globalAlpha = 1;
  const lw = 470, lh = lw * logo.height / logo.width, lx = (W - lw) / 2 + 10, ly = 980;
  m.drawImage(goldLogo, lx, ly, lw, lh); f.drawImage(foilLogo, lx, ly, lw, lh);

  /* ---- the lid's front flap, where it opens: the gold bee in the middle (canvas in the flap's own 3.45 × .76 proportions) ---- */
  const FW = 2048, FH = 452;
  const [fm, fx] = canvas(FW, FH), [ff, fy] = canvas(FW, FH);
  fx.fillStyle = PINK; fx.fillRect(0, 0, FW, FH); fy.fillStyle = '#000'; fy.fillRect(0, 0, FW, FH);
  const sw = 380, sh = sw * bee.height / bee.width;
  fx.drawImage(bee, (FW - sw) / 2, (FH - sh) / 2, sw, sh); fy.drawImage(foilBee, (FW - sw) / 2, (FH - sh) / 2, sw, sh);

  /* ---- inside the lid: the box's own print, from a photo of the open box flattened to face the camera ---- */
  const inside = await load(`/live/xmas/inside-lid.webp`);
  const [im, ix] = canvas(inside.width, inside.height);
  ix.drawImage(inside, 0, 0);
  // the lid's line, redrawn crisp where it is printed (the photo's own lettering was too soft to read)
  await document.fonts.load('500 66px Butler');
  ix.fillStyle = '#fffaf6'; ix.font = '500 66px Butler, "PT Serif", serif';
  ix.shadowColor = 'rgba(120, 40, 70, .4)'; ix.shadowBlur = 5; ix.shadowOffsetY = 2;
  spaced(ix, 'YOUR BEE-AUTIFUL', 1375, 1228, 8);
  spaced(ix, 'HAIR JOURNEY BEGINS HERE', 1375, 1310, 8);

  return { top: { map, foil }, flap: { map: fm, foil: ff }, inside: { map: im } };
}

