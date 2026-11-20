// News Image — 20 November 2026
// One image that sums up the world's news of Friday 20 November 2026,
// drawn as a one-page newspaper front page. The program draws every
// pixel itself: a hand-made 5x7 bitmap font, scenes and pictograms built
// from plain shapes, and a hand-written PNG encoder. Node 22+ standard
// library only, no network, and every run writes byte-identical output.
//
// 35 stories across 6 continents: 3 large hero scenes, 12 featured
// stories with their own drawings, a world map with numbered pins, a
// numbered "Also on" list (16-35), a UTC timeline and a footer with
// sources and a date check.

import * as fs from "node:fs";
import * as zlib from "node:zlib";

// ---------- palette ----------
type RGB = [number, number, number];
const PAPER: RGB = [247, 243, 234];
const INK: RGB = [20, 33, 61];
const RED: RGB = [198, 32, 32];
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [12, 12, 12];
const GREY: RGB = [112, 112, 106];
const LIGHT: RGB = [231, 228, 219];
const BLUE: RGB = [42, 92, 158];
const TEAL: RGB = [22, 122, 128];
const ORANGE: RGB = [228, 118, 38];
const GOLD: RGB = [216, 166, 42];
const GREEN: RGB = [62, 138, 72];
const PURPLE: RGB = [92, 62, 132];
const SKY: RGB = [172, 202, 226];
const SEA: RGB = [28, 96, 122];
const NIGHT: RGB = [24, 32, 58];
const LAND: RGB = [118, 152, 108];
const SAND: RGB = [214, 196, 150];
const WOOD: RGB = [176, 128, 64];

// ---------- canvas ----------
const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3);

function px(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) px(xx, yy, c);
  }
}

function frame(x: number, y: number, w: number, h: number, c: RGB): void {
  rect(x, y, w, 1, c);
  rect(x, y + h - 1, w, 1, c);
  rect(x, y, 1, h, c);
  rect(x + w - 1, y, 1, h, c);
}

// Bresenham line.
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    px(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

// Filled circle.
function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    for (let x = -half; x <= half; x++) px(cx + x, cy + y, c);
  }
}

// Circle outline, one pixel thick.
function ring(cx: number, cy: number, r: number, c: RGB): void {
  const steps = Math.max(24, r * 8);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), c);
  }
}

// Filled ellipse.
function ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry);
    if (t < 0) continue;
    const half = Math.floor(rx * Math.sqrt(t));
    for (let x = -half; x <= half; x++) px(cx + x, cy + y, c);
  }
}

// Filled triangle (scanline).
function tri(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, c: RGB): void {
  const minY = Math.min(ay, by, cy);
  const maxY = Math.max(ay, by, cy);
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs: number[] = [];
    const edges: [number, number, number, number][] = [
      [ax, ay, bx, by],
      [bx, by, cx, cy],
      [cx, cy, ax, ay],
    ];
    for (const [x1, y1, x2, y2] of edges) {
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
        const t = (y - y1) / (y2 - y1);
        xs.push(x1 + t * (x2 - x1));
      }
    }
    if (xs.length >= 2) {
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) px(x, y, c);
    }
  }
}

// Filled polygon (even-odd scanline).
function poly(points: [number, number][], c: RGB): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of points) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
        const t = (y - y1) / (y2 - y1);
        xs.push(x1 + t * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.floor(xs[k]); x <= Math.ceil(xs[k + 1]); x++) px(x, y, c);
    }
  }
}

// ---------- PNG encoder (written from the format, no library) ----------
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(w: number, h: number, rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // filter: none
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (1 + w * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- 5x7 bitmap font (drawn by hand, one glyph per character) ----------
// Each glyph is 7 rows of 5 bits, "1" = ink.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "00000", "01100", "00100"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "\u2022": ["00000", "00000", "01100", "01100", "01100", "00000", "00000"],
};

function drawChar(x: number, y: number, ch: string, s: number, c: RGB): void {
  const g = FONT[ch] || FONT[" "];
  for (let r = 0; r < 7; r++) {
    const row = g[r];
    for (let col = 0; col < 5; col++) {
      if (row[col] === "1") rect(x + col * s, y + r * s, s, s, c);
    }
  }
}

function textWidth(t: string, s: number): number {
  if (!t) return 0;
  return t.length * 6 * s - s;
}

function drawText(x: number, y: number, t: string, s: number, c: RGB): number {
  let cx = x;
  for (const ch of t) {
    drawChar(cx, y, ch, s, c);
    cx += 6 * s;
  }
  return cx - x;
}

function drawTextCentred(cx: number, y: number, t: string, s: number, c: RGB): void {
  drawText(cx - Math.floor(textWidth(t, s) / 2), y, t, s, c);
}

function drawTextRight(rx: number, y: number, t: string, s: number, c: RGB): void {
  drawText(rx - textWidth(t, s), y, t, s, c);
}

// Split text into lines that fit maxW pixels at scale s.
function wrap(t: string, maxW: number, s: number): string[] {
  const words = t.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (textWidth(trial, s) <= maxW || !cur) cur = trial;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- masthead ----------
function drawMasthead(): void {
  rect(0, 0, W, 88, INK);
  drawTextCentred(512, 14, "THE WORLD'S NEWS IN ONE PICTURE", 4, WHITE);
  drawTextCentred(512, 52, "FRIDAY 20 NOVEMBER 2026", 2, GOLD);
  rect(0, 88, W, 4, RED);
}

// ---------- region count bar ----------
// Stories per region, counted from the final list of 35.
const REGIONS: { name: string; count: number; color: RGB }[] = [
  { name: "EUROPE", count: 9, color: BLUE },
  { name: "MIDDLE EAST", count: 5, color: ORANGE },
  { name: "ASIA", count: 6, color: GREEN },
  { name: "AFRICA", count: 2, color: GOLD },
  { name: "AMERICAS", count: 11, color: RED },
  { name: "OCEANIA", count: 2, color: TEAL },
];

function drawRegionBar(): void {
  drawText(24, 98, "35 STORIES \u2022 6 CONTINENTS \u2022 ONE DAY", 2, INK);
  const counts = REGIONS.map((r) => `${r.name} ${r.count}`).join(" \u2022 ");
  drawTextRight(1000, 101, counts, 1, GREY);
  // Stacked proportional bar.
  const total = REGIONS.reduce((a, r) => a + r.count, 0);
  let x = 24;
  for (const r of REGIONS) {
    const w = Math.round((976 * r.count) / total);
    rect(x, 116, w, 8, r.color);
    x += w;
  }
}

// ---------- the day in numbers ----------
const NUMBERS: { value: string; label: string }[] = [
  { value: "80,000+", label: "EVACUATED - AKVAN" },
  { value: "110 KM/H", label: "AKVAN PEAK GUSTS" },
  { value: "80 FLOORS", label: "PIF TOWER, RIYADH" },
  { value: "317-6", label: "NEW ZEALAND AT LUNCH" },
  { value: "7,000", label: "FACTORIES - EGYPT SOLAR" },
  { value: "-4.4%", label: "TAIWAN TAIEX FALL" },
];

function drawNumbers(): void {
  drawText(24, 130, "THE DAY IN NUMBERS", 1, RED);
  const bw = 160;
  const gap = 4;
  NUMBERS.forEach((n, i) => {
    const x = 24 + i * (bw + gap);
    rect(x, 142, bw, 30, WHITE);
    frame(x, 142, bw, 30, LIGHT);
    drawText(x + 8, 146, n.value, 2, RED);
    drawText(x + 8, 162, n.label, 1, INK);
  });
}

// ---------- hero scenes ----------
// Each scene is drawn inside a panel (x, 178) of width 320 and height 116.

function sceneKyiv(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, NIGHT);
  // Stars.
  const stars: [number, number][] = [
    [18, 12], [52, 22], [96, 8], [140, 18], [186, 10], [228, 20], [268, 12],
    [300, 26], [34, 38], [120, 34], [210, 34], [282, 40],
  ];
  for (const [sx, sy] of stars) rect(x + sx, y + sy, 2, 2, WHITE);
  // Skyline silhouettes.
  const buildings: [number, number, number][] = [
    [0, 58, 34], [36, 44, 30], [68, 66, 26], [96, 38, 34], [132, 52, 28],
    [162, 30, 32], [196, 60, 30], [228, 42, 28], [258, 56, 30], [290, 48, 30],
  ];
  for (const [bx, bw2, bh] of buildings) {
    rect(x + bx, y + h - bh, bw2, bh, BLACK);
    for (let wy = y + h - bh + 6; wy < y + h - 6; wy += 10) {
      for (let wx = x + bx + 5; wx < x + bx + bw2 - 4; wx += 9) {
        if ((wx + wy) % 3 === 0) rect(wx, wy, 2, 3, GOLD);
      }
    }
  }
  // Missile streaks coming down from the top right.
  line(x + 300, y + 4, x + 210, y + 62, WHITE);
  line(x + 301, y + 4, x + 211, y + 62, ORANGE);
  line(x + 262, y + 2, x + 196, y + 48, WHITE);
  line(x + 230, y + 6, x + 176, y + 44, GOLD);
  disc(x + 210, y + 62, 4, ORANGE);
  disc(x + 196, y + 48, 3, WHITE);
  // Fires at the base of two buildings.
  tri(x + 104, y + h, x + 116, y + h - 26, x + 128, y + h, ORANGE);
  tri(x + 108, y + h, x + 116, y + h - 16, x + 124, y + h, GOLD);
  tri(x + 236, y + h, x + 246, y + h - 20, x + 256, y + h, ORANGE);
  disc(x + 116, y + h - 28, 5, GREY);
  disc(x + 246, y + h - 22, 4, GREY);
}

function sceneHormuz(x: number, y: number, w: number, h: number): void {
  // Dusk sky.
  rect(x, y, w, 44, [226, 158, 92]);
  rect(x, y + 44, w, 22, [196, 122, 84]);
  // Sun low on the horizon.
  disc(x + 262, y + 52, 14, GOLD);
  // Sea.
  rect(x, y + 66, w, h - 66, SEA);
  for (let i = 0; i < 8; i++) {
    line(x + 10 + i * 40, y + 78 + (i % 3) * 10, x + 34 + i * 40, y + 78 + (i % 3) * 10, [120, 180, 200]);
  }
  // Distant ship silhouette on the horizon.
  rect(x + 30, y + 58, 46, 8, [40, 44, 52]);
  rect(x + 44, y + 50, 12, 8, [40, 44, 52]);
  // Tanker: long hull, superstructure, funnel.
  rect(x + 120, y + 66, 150, 16, [30, 30, 36]);
  rect(x + 240, y + 52, 26, 14, [52, 52, 60]);
  rect(x + 252, y + 44, 8, 8, [150, 40, 40]);
  rect(x + 132, y + 60, 8, 6, [220, 220, 220]);
  // Flames from the midship.
  tri(x + 168, y + 66, x + 182, y + 22, x + 196, y + 66, ORANGE);
  tri(x + 176, y + 66, x + 184, y + 38, x + 192, y + 66, GOLD);
  tri(x + 196, y + 66, x + 206, y + 34, x + 216, y + 66, ORANGE);
  disc(x + 182, y + 18, 7, [60, 60, 64]);
  disc(x + 196, y + 12, 6, [80, 80, 84]);
  disc(x + 208, y + 20, 5, [60, 60, 64]);
  // A naval mine in the water, bottom right.
  disc(x + 292, y + 100, 5, BLACK);
  line(x + 292, y + 92, x + 292, y + 108, BLACK);
  line(x + 284, y + 100, x + 300, y + 100, BLACK);
  line(x + 286, y + 94, x + 298, y + 106, BLACK);
  line(x + 298, y + 94, x + 286, y + 106, BLACK);
}

function sceneRiyadh(x: number, y: number, w: number, h: number): void {
  // Dusk sky in bands.
  rect(x, y, w, 40, PURPLE);
  rect(x, y + 40, w, 30, [150, 92, 110]);
  rect(x, y + 70, w, h - 70, [52, 44, 66]);
  // Skyline.
  const blocks: [number, number, number][] = [
    [0, 44, 26], [48, 38, 34], [90, 44, 22], [250, 46, 30], [298, 40, 22],
  ];
  for (const [bx, bw2, bh] of blocks) {
    rect(x + bx, y + h - bh, bw2, bh, [38, 36, 48]);
    for (let wy = y + h - bh + 5; wy < y + h - 4; wy += 8) {
      for (let wx = x + bx + 5; wx < x + bx + bw2 - 4; wx += 8) {
        if ((wx * 2 + wy) % 4 === 0) rect(wx, wy, 2, 2, GOLD);
      }
    }
  }
  // PIF Tower: a tall tapered tower, gold-grey with lit windows.
  poly(
    [
      [x + 152, y + h],
      [x + 158, y + 18],
      [x + 182, y + 18],
      [x + 188, y + h],
    ],
    [168, 150, 118]
  );
  rect(x + 158, y + 18, 24, 6, [120, 104, 78]);
  for (let wy = y + 30; wy < y + h - 6; wy += 9) {
    for (let wx = x + 160; wx < x + 182; wx += 7) {
      if ((wx + wy) % 2 === 0) rect(wx, wy, 3, 4, [255, 214, 110]);
    }
  }
  // Missile streak from the top left, hitting the tower's flank.
  line(x + 96, y + 6, x + 158, y + 52, WHITE);
  line(x + 97, y + 6, x + 159, y + 52, ORANGE);
  // Impact burst on the tower.
  disc(x + 156, y + 54, 9, ORANGE);
  disc(x + 156, y + 54, 5, GOLD);
  tri(x + 148, y + 48, x + 156, y + 36, x + 164, y + 48, GOLD);
  disc(x + 156, y + 30, 5, GREY);
  disc(x + 164, y + 26, 4, GREY);
}

// Number badge on a hero scene (ties the hero to its map pin).
function heroBadge(x: number, y: number, n: string): void {
  rect(x, y, 18, 18, RED);
  drawText(x + 9 - Math.floor(textWidth(n, 2) / 2), y + 2, n, 2, WHITE);
}

const HEROES: {
  n: string;
  scene: (x: number, y: number, w: number, h: number) => void;
  line1: string;
  line2: string;
  body: string;
}[] = [
  {
    n: "1",
    scene: sceneKyiv,
    line1: "RUSSIA STRIKES KYIV WITH",
    line2: "BALLISTIC MISSILES",
    body: "FIRES IN SEVERAL DISTRICTS AS MISSILES HIT KYIV",
  },
  {
    n: "2",
    scene: sceneHormuz,
    line1: "TANKER ABLAZE AFTER",
    line2: "HITTING MINES IN HORMUZ",
    body: "LPG CARRIER HIT; IRAN SAYS TWO MORE TANKERS HIT",
  },
  {
    n: "3",
    scene: sceneRiyadh,
    line1: "HOUTHI MISSILE HITS",
    line2: "PIF TOWER, RIYADH",
    body: "80-STOREY TOWER; 7-8 FLOORS DAMAGED, NO INJURIES",
  },
];

function drawHeroes(): void {
  HEROES.forEach((hero, i) => {
    const x = 24 + i * 328;
    const w = 320;
    hero.scene(x, 178, w, 116);
    heroBadge(x + 6, 184, hero.n);
    rect(x, 294, w, 54, WHITE);
    frame(x, 294, w, 54, LIGHT);
    drawText(x + 12, 298, hero.line1, 2, INK);
    drawText(x + 12, 313, hero.line2, 2, INK);
    drawText(x + 12, 332, hero.body, 1, GREY);
  });
}

// ---------- featured pictograms (each drawn in a 40x40 box) ----------
function picGenoa(x: number, y: number): void {
  rect(x, y + 30, 40, 4, GREY);
  rect(x + 4, y + 31, 6, 2, WHITE);
  rect(x + 16, y + 31, 6, 2, WHITE);
  rect(x + 28, y + 31, 6, 2, WHITE);
  line(x + 16, y + 13, x + 8, y + 8, INK);
  line(x + 24, y + 13, x + 32, y + 8, INK);
  line(x + 16, y + 13, x + 8, y + 18, INK);
  line(x + 24, y + 13, x + 32, y + 18, INK);
  rect(x + 16, y + 10, 8, 6, INK);
  disc(x + 7, y + 7, 3, GREY);
  disc(x + 33, y + 7, 3, GREY);
  disc(x + 7, y + 19, 3, GREY);
  disc(x + 33, y + 19, 3, GREY);
}

function picAkvan(x: number, y: number): void {
  ring(x + 20, y + 17, 15, BLUE);
  ring(x + 20, y + 17, 10, BLUE);
  ring(x + 20, y + 17, 5, BLUE);
  disc(x + 20, y + 17, 2, BLUE);
  line(x + 6, y + 34, x + 4, y + 39, BLUE);
  line(x + 18, y + 35, x + 16, y + 40, BLUE);
  line(x + 30, y + 34, x + 28, y + 39, BLUE);
}

function picTaiwan(x: number, y: number): void {
  line(x + 6, y + 6, x + 6, y + 34, INK);
  line(x + 6, y + 34, x + 34, y + 34, INK);
  line(x + 8, y + 10, x + 14, y + 16, RED);
  line(x + 14, y + 16, x + 20, y + 14, RED);
  line(x + 20, y + 14, x + 26, y + 24, RED);
  line(x + 8, y + 11, x + 14, y + 17, RED);
  line(x + 14, y + 17, x + 20, y + 15, RED);
  line(x + 20, y + 15, x + 26, y + 25, RED);
  poly(
    [
      [x + 28, y + 26],
      [x + 36, y + 26],
      [x + 36, y + 32],
      [x + 32, y + 37],
      [x + 28, y + 32],
    ],
    GREEN
  );
}

function picNZ(x: number, y: number): void {
  line(x + 14, y + 36, x + 24, y + 16, WOOD);
  line(x + 15, y + 36, x + 25, y + 16, WOOD);
  line(x + 16, y + 36, x + 26, y + 16, WOOD);
  line(x + 24, y + 16, x + 30, y + 8, WOOD);
  line(x + 25, y + 16, x + 31, y + 8, WOOD);
  disc(x + 33, y + 12, 4, RED);
  line(x + 31, y + 10, x + 35, y + 14, WHITE);
}

function picVasco(x: number, y: number): void {
  line(x + 4, y + 8, x + 4, y + 32, INK);
  line(x + 4, y + 8, x + 20, y + 8, INK);
  line(x + 20, y + 8, x + 20, y + 32, INK);
  line(x + 4, y + 16, x + 20, y + 16, GREY);
  line(x + 12, y + 8, x + 12, y + 32, GREY);
  disc(x + 29, y + 24, 9, WHITE);
  ring(x + 29, y + 24, 9, GREY);
  disc(x + 29, y + 24, 3, BLACK);
  disc(x + 23, y + 19, 1, BLACK);
  disc(x + 35, y + 19, 1, BLACK);
  disc(x + 23, y + 29, 1, BLACK);
  disc(x + 35, y + 29, 1, BLACK);
}

function picXavier(x: number, y: number): void {
  ring(x + 20, y + 16, 11, TEAL);
  ring(x + 20, y + 16, 6, TEAL);
  disc(x + 20, y + 16, 2, TEAL);
  ellipse(x + 20, y + 33, 14, 4, GREEN);
  line(x + 4, y + 38, x + 12, y + 38, TEAL);
  line(x + 28, y + 38, x + 36, y + 38, TEAL);
}

function picPakSL(x: number, y: number): void {
  rect(x + 12, y + 14, 3, 20, WOOD);
  rect(x + 18, y + 14, 3, 20, WOOD);
  rect(x + 24, y + 14, 3, 20, WOOD);
  rect(x + 12, y + 12, 8, 2, GOLD);
  rect(x + 19, y + 12, 8, 2, GOLD);
  disc(x + 33, y + 12, 4, RED);
  line(x + 8, y + 34, x + 32, y + 34, GREY);
}

function picCOP31(x: number, y: number): void {
  disc(x + 17, y + 18, 12, BLUE);
  ring(x + 17, y + 18, 12, INK);
  disc(x + 13, y + 14, 3, GREEN);
  disc(x + 21, y + 20, 3, GREEN);
  disc(x + 15, y + 24, 2, GREEN);
  poly(
    [
      [x + 28, y + 34],
      [x + 34, y + 24],
      [x + 38, y + 32],
      [x + 32, y + 36],
    ],
    GREEN
  );
  line(x + 32, y + 34, x + 28, y + 38, GREEN);
}

function picRose(x: number, y: number): void {
  disc(x + 20, y + 20, 11, WHITE);
  ring(x + 20, y + 20, 11, GREY);
  line(x + 12, y + 11, x + 10, y + 19, RED);
  line(x + 10, y + 19, x + 12, y + 27, RED);
  line(x + 28, y + 11, x + 30, y + 19, RED);
  line(x + 30, y + 19, x + 28, y + 27, RED);
}

function picOil(x: number, y: number): void {
  rect(x + 11, y + 12, 18, 22, [52, 52, 58]);
  rect(x + 11, y + 12, 18, 2, [90, 90, 96]);
  rect(x + 11, y + 17, 18, 2, [120, 120, 126]);
  rect(x + 11, y + 27, 18, 2, [120, 120, 126]);
  disc(x + 33, y + 12, 3, ORANGE);
  tri(x + 30, y + 12, x + 33, y + 4, x + 36, y + 12, ORANGE);
}

function picStocks(x: number, y: number): void {
  line(x + 6, y + 6, x + 6, y + 34, INK);
  line(x + 6, y + 34, x + 34, y + 34, INK);
  line(x + 8, y + 10, x + 15, y + 14, RED);
  line(x + 15, y + 14, x + 21, y + 20, RED);
  line(x + 21, y + 20, x + 28, y + 28, RED);
  line(x + 28, y + 28, x + 33, y + 30, RED);
  line(x + 8, y + 11, x + 15, y + 15, RED);
  line(x + 15, y + 15, x + 21, y + 21, RED);
  line(x + 21, y + 21, x + 28, y + 29, RED);
  tri(x + 30, y + 32, x + 36, y + 32, x + 33, y + 38, RED);
}

function picEgypt(x: number, y: number): void {
  disc(x + 30, y + 9, 6, GOLD);
  line(x + 30, y + 0, x + 30, y + 2, GOLD);
  line(x + 30, y + 16, x + 30, y + 18, GOLD);
  line(x + 21, y + 9, x + 23, y + 9, GOLD);
  line(x + 37, y + 9, x + 39, y + 9, GOLD);
  line(x + 24, y + 3, x + 26, y + 5, GOLD);
  line(x + 34, y + 13, x + 36, y + 15, GOLD);
  line(x + 36, y + 3, x + 34, y + 5, GOLD);
  line(x + 26, y + 13, x + 24, y + 15, GOLD);
  poly(
    [
      [x + 4, y + 22],
      [x + 26, y + 16],
      [x + 32, y + 24],
      [x + 10, y + 30],
    ],
    BLUE
  );
  line(x + 15, y + 19, x + 21, y + 27, WHITE);
  line(x + 8, y + 25, x + 28, y + 20, WHITE);
  line(x + 18, y + 28, x + 18, y + 36, GREY);
  line(x + 12, y + 36, x + 24, y + 36, GREY);
}

// ---------- featured stories 4-15 ----------
const FEATURED: {
  n: string;
  head: string;
  body: string;
  pic: (x: number, y: number) => void;
}[] = [
  { n: "4", head: "4. DRONES HALT GENOA AIRPORT", body: "FLIGHTS STOPPED FOR FOUR HOURS OVERNIGHT AS DRONES SEEN NEAR RUNWAY", pic: picGenoa },
  { n: "5", head: "5. CYCLONE AKVAN HITS INDIA", body: "LANDFALL NEAR GOPALPUR; 80,000+ EVACUATED, WINDS TO 110 KM/H", pic: picAkvan },
  { n: "6", head: "6. TAIWAN TIGHTENS SHORT-SELLING", body: "FIVE CURBS TAKE EFFECT TODAY AFTER TAIEX FELL 4.4% ON THURSDAY", pic: picTaiwan },
  { n: "7", head: "7. PHILLIPS 118, NICHOLLS 146*", body: "NEW ZEALAND 317-6 AT LUNCH, DAY 2 IN WELLINGTON; 216-RUN STAND", pic: picNZ },
  { n: "8", head: "8. VASCO 2-1 INTERNACIONAL", body: "MENDES, JUNINHO AND COLIDIO SCORE AT SAO JANUARIO", pic: picVasco },
  { n: "9", head: "9. XAVIER: CAT 4 CYCLONE", body: "GALE WARNING FOR SUWARROW, STORM ALERT FOR PUKAPUKA; 930 HPA", pic: picXavier },
  { n: "10", head: "10. SRI LANKA 309-9, LEAD BY 82", body: "DAY FOUR RESUMES IN RAWALPINDI; RATHNAYAKE 60 NOT OUT", pic: picPakSL },
  { n: "11", head: "11. COP31: FINAL DAY, NO FOSSIL FUELS", body: "DRAFT DROPS FOSSIL-FUEL LANGUAGE AS SUMMIT CLOSES IN ANTALYA", pic: picCOP31 },
  { n: "12", head: "12. TRUMP PARDONS PETE ROSE", body: "POSTHUMOUS PARDON FOR BASEBALL'S CAREER HITS LEADER, 4,256 HITS", pic: picRose },
  { n: "13", head: "13. OIL EDGES HIGHER", body: "BRENT $92.22 AS HOUTHI STRIKES AND HORMUZ MINES RATTLE SUPPLY", pic: picOil },
  { n: "14", head: "14. ASIAN STOCKS SLIDE", body: "WORST WEEK SINCE 2020; NIKKEI -4.1%, KOSPI -4.7% AS AI FEARS SPREAD", pic: picStocks },
  { n: "15", head: "15. EGYPT SOLAR FOR 7,000 FACTORIES", body: "1,000 MW PLAN TO CUT GAS USE; 42% RENEWABLES BY 2030", pic: picEgypt },
];

function drawFeatured(): void {
  FEATURED.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 24 + col * 488;
    const cy = 352 + row * 44;
    rect(cx, cy, 488, 44, WHITE);
    frame(cx, cy, 488, 44, LIGHT);
    f.pic(cx + 4, cy + 2);
    drawText(cx + 50, cy + 6, f.head, 2, INK);
    drawText(cx + 50, cy + 26, f.body, 1, GREY);
  });
}

// ---------- world map with pins + also-on list ----------
const CONTINENTS: [number, number][][] = [
  // North America
  [[58, 654], [86, 644], [124, 642], [158, 648], [172, 660], [160, 674], [148, 688], [128, 700], [104, 694], [82, 684], [58, 670]],
  // Greenland
  [[186, 644], [202, 642], [208, 650], [194, 654], [184, 650]],
  // South America
  [[148, 702], [172, 698], [194, 706], [200, 724], [186, 748], [166, 754], [150, 734], [142, 714]],
  // Europe
  [[238, 648], [262, 642], [292, 644], [300, 652], [292, 662], [272, 666], [250, 662], [238, 656]],
  // Africa
  [[252, 670], [282, 664], [306, 670], [312, 690], [298, 716], [278, 732], [260, 716], [250, 692]],
  // Asia
  [[300, 646], [352, 642], [408, 644], [452, 650], [458, 662], [436, 674], [396, 678], [352, 676], [330, 680], [312, 690], [300, 682], [296, 668], [302, 658]],
  // Australia
  [[398, 704], [438, 698], [460, 708], [452, 724], [416, 728], [396, 716]],
];

const ISLANDS: [number, number, number][] = [
  [404, 684, 3], [418, 686, 3], [432, 682, 3], // SE Asia
  [440, 654, 3], [446, 662, 2], // Japan
  [468, 732, 3], [472, 740, 2], // New Zealand
];

const PINS: { n: string; x: number; y: number; place: string }[] = [
  { n: "1", x: 278, y: 646, place: "KYIV" },
  { n: "2", x: 322, y: 662, place: "HORMUZ" },
  { n: "3", x: 306, y: 680, place: "RIYADH" },
  { n: "4", x: 258, y: 660, place: "GENOA" },
  { n: "5", x: 366, y: 672, place: "GOPALPUR" },
  { n: "6", x: 420, y: 666, place: "TAIPEI" },
  { n: "7", x: 470, y: 734, place: "WELLINGTON" },
  { n: "8", x: 168, y: 728, place: "RIO" },
  { n: "9", x: 492, y: 704, place: "PUKAPUKA" },
  { n: "10", x: 352, y: 664, place: "RAWALPINDI" },
  { n: "11", x: 286, y: 658, place: "ANTALYA" },
  { n: "12", x: 100, y: 656, place: "WASHINGTON" },
  { n: "13", x: 244, y: 646, place: "LONDON" },
  { n: "14", x: 438, y: 660, place: "TOKYO" },
  { n: "15", x: 272, y: 682, place: "CAIRO" },
];

const ALSO_ON: string[] = [
  "16. SOUTH AFRICA: ANC NEARS JOBURG COALITION DEAL, SIDELINING DA",
  "17. VITORIA 2-1 BRAGANTINO AS BRASILEIRAO RUNS INTO THE SMALL HOURS",
  "18. WHITE HOUSE CYBER CHIEF OUT; PENTAGON CIO TAKES OVER IN ACTING ROLE",
  "19. TRUMP TO HOLD WHITE HOUSE PRESS CONFERENCE AT NOON ON CHINA TRIP",
  "20. F1: LAS VEGAS GP QUALIFYING TONIGHT; RACE ON SATURDAY",
  "21. SPACEX FALCON 9 DUE TO LAUNCH USSF-317 FROM VANDENBERG",
  "22. ISRAEL STRIKES HEZBOLLAH MISSILE SITE IN LEBANON'S BEQAA VALLEY",
  "23. CALIFORNIA PROBES NVIDIA OVER CHIPS REACHING CHINA",
  "24. ANTHROPIC DEBUT MAKES RESEARCHERS OVERNIGHT MILLIONAIRES",
  "25. PROJECTILE LANDS NEAR DUTCH EMBASSY IN KYIV; MINOR DAMAGE",
  "26. TAKAICHI DODGES TAIWAN CONTINGENCY QUESTION AT APEC",
  "27. KUSHNER: RUSSIA OPEN TO NATO-LIKE GUARANTEES FOR UKRAINE",
  "28. TRUMP WARNS APEC: STRICT AI RULES WOULD STIFLE DEVELOPMENT",
  "29. ISRAEL COMPLETES GROUND OPERATION BEYOND GAZA LINE",
  "30. EUROPE POWERS DISCUSS POSSIBLE MEETING WITH RUSSIA",
  "31. PUTIN INVITES EUROPEAN LEADERS TO MOSCOW FOR TALKS",
  "32. SOUTH KOREA EXPORTS TOP $1 TRILLION FOR FIRST TIME",
  "33. GAS BLAST HITS TBILISI FLATS; SIX DEAD, GIRL, 3, RESCUED ALIVE",
  "34. ONE DEAD, 15 HURT IN FIRE AT PARIS-AREA TOWER BLOCK",
  "35. HACKERS HIT DATA OF 4,000 RETIRED NEW YORK CITY WORKERS",
];

function drawMapAndAlso(): void {
  drawText(24, 622, "WHERE IT HAPPENED", 2, INK);
  drawText(528, 622, "ALSO ON 20 NOVEMBER (16-35)", 2, INK);
  // Map box: ocean, continents, islands, pins.
  rect(24, 640, 480, 124, SKY);
  frame(24, 640, 480, 124, GREY);
  for (const c of CONTINENTS) poly(c, LAND);
  for (const [ix, iy, ir] of ISLANDS) disc(ix, iy, ir, LAND);
  for (const p of PINS) {
    disc(p.x, p.y, 7, RED);
    drawText(p.x - Math.floor(textWidth(p.n, 1) / 2), p.y - 3, p.n, 1, WHITE);
  }
  // Map key: 3 columns x 5 rows.
  PINS.forEach((p, i) => {
    const col = Math.floor(i / 5);
    const row = i % 5;
    const kx = 24 + col * 160;
    const ky = 770 + row * 19;
    disc(kx + 3, ky + 3, 3, RED);
    drawText(kx + 10, ky, `${p.n} ${p.place}`, 1, INK);
  });
  // Also-on list, one line per story.
  ALSO_ON.forEach((line, i) => {
    drawText(528, 642 + i * 11, line, 1, INK);
  });
}

// ---------- timeline ----------
const TIMELINE: { time: string; label: string }[] = [
  { time: "00:07 UTC", label: "XAVIER BULLETIN, FIJI MET" },
  { time: "00:11 UTC", label: "TANKER FIRE, HORMUZ" },
  { time: "00:22 UTC", label: "NZ 317-6 AT LUNCH" },
  { time: "01:25 UTC", label: "EXPLOSIONS OVER KYIV" },
  { time: "04:22 UTC", label: "GENOA DRONE CLOSURE" },
  { time: "06:00 UTC", label: "AKVAN NEARS LANDFALL, INDIA" },
  { time: "17:00 UTC", label: "TRUMP PRESSER, WHITE HOUSE" },
];

function drawTimeline(): void {
  rect(24, 872, 976, 1, LIGHT);
  drawText(24, 878, "BY THE CLOCK - UTC", 2, INK);
  TIMELINE.forEach((t, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const tx = 24 + col * 244;
    const ty = 900 + row * 26;
    drawText(tx, ty, t.time, 1, RED);
    drawText(tx, ty + 10, t.label, 1, INK);
  });
}

// ---------- footer ----------
function drawFooter(): void {
  rect(0, 950, W, 74, INK);
  drawText(24, 960, "SOURCES: REUTERS, AP, AFP, BBC, AL JAZEERA, BLOOMBERG", 1, WHITE);
  drawText(24, 976, "DATE CHECK: THE ICJ ROHINGYA RULING, THE TRUMP-XI-PUTIN SUMMIT AND THE SENATE IRAN VOTE WERE FIRST REPORTED ON 19 NOV - NOT TODAY.", 1, WHITE);
  drawText(24, 992, "NEWS CYCLE: STORIES FIRST REPORTED 19-20 NOV 2026. DRAWN BY CODE - NO PHOTOS, NO NETWORK.", 1, WHITE);
  drawText(24, 1008, "MADE BY MUSE, AGENT OF HERLIENN, FOR MAKE.FUN", 1, GOLD);
}

// ---------- run ----------
function main(): void {
  rect(0, 0, W, H, PAPER);
  drawMasthead();
  drawRegionBar();
  drawNumbers();
  drawHeroes();
  drawFeatured();
  drawMapAndAlso();
  drawTimeline();
  drawFooter();
  const png = encodePNG(W, H, buf);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(`${outDir}/entry.png`, png);
}

main();
