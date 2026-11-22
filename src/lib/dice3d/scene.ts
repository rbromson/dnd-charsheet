/**
 * 3D-кости на WebGL (three.js): настоящие многогранники d4–d20 с числами на гранях,
 * «самоцветный» материал, тень на столе. Бросок — сценарный (не физика): кость кувыркается,
 * дважды отскакивает и ложится выпавшей гранью к камере, числом вверх.
 */
import * as THREE from 'three';

import { ROLL_MS, expandSpecs, type DieSpec, type PhysDie, type Tone } from './spec';
export { SUPPORTED, ROLL_MS, type DieSpec, type Tone } from './spec';

const TONES: Record<Tone, { bg: [string, string]; ink: string; edge: number; emissive: number }> = {
  ember: { bg: ['#f4a368', '#c9562a'], ink: '#2a1206', edge: 0xffd2a6, emissive: 0x3a1206 },
  gold: { bg: ['#ffe39a', '#c8921e'], ink: '#2a1a04', edge: 0xfff0c2, emissive: 0x3a2804 },
  bad: { bg: ['#e98a76', '#9b3a28'], ink: '#fff4ef', edge: 0xf0a898, emissive: 0x2a0804 },
  dim: { bg: ['#6b5a48', '#3a2c22'], ink: '#d8c8ad', edge: 0x8a7458, emissive: 0x000000 },
  wine: { bg: ['#c8607e', '#6e2440'], ink: '#fff2ea', edge: 0xf2b8c6, emissive: 0x200410 },
};

interface Face {
  start: number; // первый индекс вершины в non-indexed геометрии
  count: number; // число вершин
  normal: THREE.Vector3;
  up: THREE.Vector3; // «верх» числа на грани
}
interface DieModel {
  geometry: THREE.BufferGeometry;
  faces: Face[];
  radius: number;
}

// ---------- геометрия ----------

/** Пятиугольный трапецоэдр (d10): 10 «воздушных змеев», каждый из двух треугольников. */
function d10Geometry(): THREE.BufferGeometry {
  const h = 1;
  const r = 0.95;
  const P = (ang: number, z: number) => new THREE.Vector3(r * Math.cos(ang), z, r * Math.sin(ang));
  const deg = Math.PI / 180;
  // высота колец, при которой «змеи» плоские (бисекция)
  const planar = (a: number) => {
    const T = new THREE.Vector3(0, h, 0);
    const U0 = P(0, a);
    const U1 = P(72 * deg, a);
    const L0 = P(36 * deg, -a);
    const n = new THREE.Vector3().subVectors(U0, T).cross(new THREE.Vector3().subVectors(U1, T));
    return new THREE.Vector3().subVectors(L0, T).dot(n);
  };
  let lo = 0.001;
  let hi = 0.99;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (Math.sign(planar(mid)) === Math.sign(planar(lo))) lo = mid;
    else hi = mid;
  }
  const a = (lo + hi) / 2;
  const top = new THREE.Vector3(0, h, 0);
  const bot = new THREE.Vector3(0, -h, 0);
  const pos: number[] = [];
  const tri = (p: THREE.Vector3, q: THREE.Vector3, s: THREE.Vector3) => pos.push(p.x, p.y, p.z, q.x, q.y, q.z, s.x, s.y, s.z);
  for (let k = 0; k < 5; k++) {
    const U = P(72 * k * deg, a);
    const Un = P(72 * (k + 1) * deg, a);
    const L = P((72 * k + 36) * deg, -a);
    const Ln = P((72 * (k + 1) + 36) * deg, -a);
    // верхний змей: top, U, L, Un (против часовой при взгляде снаружи)
    tri(top, Un, L);
    tri(top, L, U);
    // нижний змей: bot, L, Un, Ln
    tri(bot, L, Un);
    tri(bot, Un, Ln);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

function baseGeometry(sides: number): THREE.BufferGeometry {
  switch (sides) {
    case 4:
      return new THREE.TetrahedronGeometry(1.15);
    case 6:
      return new THREE.BoxGeometry(1.35, 1.35, 1.35);
    case 8:
      return new THREE.OctahedronGeometry(1.1);
    case 10:
      return d10Geometry();
    case 12:
      return new THREE.DodecahedronGeometry(1.05);
    default:
      return new THREE.IcosahedronGeometry(1.1);
  }
}

/** Делим на грани: треугольники с общей нормалью (для d10 — пары по порядку), задаём UV и группы. */
function buildModel(sides: number): DieModel {
  let g = baseGeometry(sides);
  if (g.index) g = g.toNonIndexed();
  const p = g.getAttribute('position');
  const triCount = p.count / 3;
  const tris: { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (let i = 0; i < triCount; i++) {
    const a = new THREE.Vector3().fromBufferAttribute(p, i * 3);
    const b = new THREE.Vector3().fromBufferAttribute(p, i * 3 + 1);
    const c = new THREE.Vector3().fromBufferAttribute(p, i * 3 + 2);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    tris.push({ a, b, c, n });
  }
  // группировка
  const groups: number[][] = [];
  if (sides === 10) for (let i = 0; i < triCount; i += 2) groups.push([i, i + 1]);
  else
    tris.forEach((t, i) => {
      const gidx = groups.findIndex((gr) => tris[gr[0]].n.dot(t.n) > 0.999);
      if (gidx >= 0) groups[gidx].push(i);
      else groups.push([i]);
    });

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const faces: Face[] = [];
  let radius = 0;
  const out = new THREE.BufferGeometry();
  for (const gr of groups) {
    const verts = gr.flatMap((i) => [tris[i].a, tris[i].b, tris[i].c]);
    const n = gr.reduce((s, i) => s.add(tris[i].n), new THREE.Vector3()).normalize();
    const c = verts.reduce((s, v) => s.add(v), new THREE.Vector3()).multiplyScalar(1 / verts.length);
    const ref = Math.abs(n.y) > 0.9 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
    // «верх» числа: для d10 — к вершине-апексу, иначе — к мировому верху
    let up = ref.clone().sub(n.clone().multiplyScalar(ref.dot(n))).normalize();
    if (sides === 10) {
      const apex = verts.reduce((best, v) => (Math.abs(v.y) > Math.abs(best.y) ? v : best), verts[0]);
      up = apex.clone().sub(c).sub(n.clone().multiplyScalar(apex.clone().sub(c).dot(n))).normalize();
    }
    const right = new THREE.Vector3().crossVectors(up, n).normalize();
    const R = Math.max(...verts.map((v) => v.distanceTo(c)));
    const start = positions.length / 3;
    for (const v of verts) {
      positions.push(v.x, v.y, v.z);
      normals.push(n.x, n.y, n.z);
      const d = v.clone().sub(c);
      uvs.push(0.5 + d.dot(right) / (2 * R), 0.5 + d.dot(up) / (2 * R));
      radius = Math.max(radius, v.length());
    }
    out.addGroup(start, verts.length, faces.length);
    faces.push({ start, count: verts.length, normal: n, up });
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.dispose();
  return { geometry: out, faces, radius };
}

const models = new Map<number, DieModel>();
const model = (sides: number) => {
  let m = models.get(sides);
  if (!m) models.set(sides, (m = buildModel(sides)));
  return m;
};

// ---------- текстуры граней ----------

const texCache = new Map<string, THREE.CanvasTexture>();
function faceTexture(label: string, tone: Tone, sides: number): THREE.CanvasTexture {
  const key = `${tone}|${sides}|${label}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  const t = TONES[tone];
  const gr = g.createRadialGradient(S * 0.38, S * 0.3, S * 0.05, S / 2, S / 2, S * 0.75);
  gr.addColorStop(0, t.bg[0]);
  gr.addColorStop(1, t.bg[1]);
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  const scale = (sides === 4 ? 0.32 : sides === 20 ? 0.42 : sides === 12 ? 0.4 : sides === 6 ? 0.5 : 0.44) * (label.length >= 2 && sides === 10 ? 0.6 : 1);
  g.font = `700 ${Math.round(S * scale)}px Alegreya, Georgia, serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,240,220,0.35)';
  const y = S * (sides === 4 ? 0.6 : sides === 10 ? 0.44 : 0.52);
  g.fillText(label, S / 2, y + 3);
  g.fillStyle = t.ink;
  g.fillText(label, S / 2, y);
  if (label === '6' || label === '9') {
    g.fillRect(S / 2 - S * 0.08, y + S * scale * 0.42, S * 0.16, S * 0.025);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}


// ---------- сцена ----------

interface Live {
  spec: PhysDie;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  mats: THREE.MeshStandardMaterial[];
  target: THREE.Quaternion;
  spinAxis: THREE.Vector3;
  spin: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  delay: number;
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** Высота подпрыгивания по времени 0..1: падение, два затухающих отскока. */
function bounce(t: number): number {
  if (t < 0.42) {
    const k = t / 0.42;
    return 1 - k * k;
  }
  if (t < 0.7) {
    const k = (t - 0.42) / 0.28;
    return 0.32 * 4 * k * (1 - k);
  }
  if (t < 0.88) {
    const k = (t - 0.7) / 0.18;
    return 0.09 * 4 * k * (1 - k);
  }
  return 0;
}

export class DiceScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  private dice: Live[] = [];
  private raf = 0;
  private start = 0;
  private idleSpin = false;
  private ro: ResizeObserver;
  onLanded: (() => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene.add(new THREE.HemisphereLight(0xffe2c0, 0x2a1408, 1.1));
    const key = new THREE.DirectionalLight(0xffe7cc, 2.2);
    key.position.set(3, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.radius = 6;
    this.scene.add(key);
    const rim = new THREE.PointLight(0xff8a40, 18, 20);
    rim.position.set(-4, 2, 3);
    this.scene.add(rim);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.45 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.15;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
  }

  private resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.frame();
  }

  /** Камера подстраивается под число костей. */
  private frame() {
    const n = Math.max(1, this.dice.length);
    const width = n * 2.6;
    const fit = Math.max(2.5, width / Math.max(this.camera.aspect, 0.5));
    const dist = fit / (2 * Math.tan((this.camera.fov * Math.PI) / 360)) + 0.6;
    this.camera.position.set(0, dist * 0.62, dist * 0.78);
    this.camera.lookAt(0, -0.2, 0);
    this.camera.updateProjectionMatrix();
    this.render();
  }

  private clear() {
    for (const d of this.dice) {
      this.scene.remove(d.mesh);
      d.mats.forEach((m) => m.dispose());
      d.edges.geometry.dispose();
      (d.edges.material as THREE.Material).dispose();
    }
    this.dice = [];
  }

  private materials(spec: PhysDie): THREE.MeshStandardMaterial[] {
    const tone = spec.tone;
    const m = model(spec.sides);
    return m.faces.map(
      (_, i) =>
        new THREE.MeshStandardMaterial({
          map: faceTexture(spec.labels[i] ?? String(i + 1), tone, spec.sides),
          roughness: 0.32,
          metalness: 0.12,
          emissive: TONES[tone].emissive,
          transparent: spec.struck,
          opacity: spec.struck ? 0.55 : 1,
        }),
    );
  }

  /** Ориентация, при которой грань со значением смотрит в камеру числом вверх. */
  private targetFor(sides: number, faceIndex: number, pos: THREE.Vector3): THREE.Quaternion {
    const m = model(sides);
    const face = m.faces[Math.max(0, Math.min(m.faces.length - 1, faceIndex))];
    const D = this.camera.position.clone().sub(pos).normalize();
    const q1 = new THREE.Quaternion().setFromUnitVectors(face.normal, D);
    const up = face.up.clone().applyQuaternion(q1);
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    camUp.sub(D.clone().multiplyScalar(camUp.dot(D))).normalize();
    const twist = Math.atan2(new THREE.Vector3().crossVectors(up, camUp).dot(D), up.dot(camUp));
    // небольшой наклон — чтобы кость не выглядела «наклейкой»
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0.8, 0.6, 0).normalize(), sides === 20 || sides === 12 ? 0.16 : 0.34);
    return new THREE.Quaternion().setFromAxisAngle(D, twist).multiply(q1).premultiply(tilt);
  }

  private place(input: DieSpec[]) {
    this.clear();
    const specs = expandSpecs(input);
    const n = specs.length;
    specs.forEach((spec, i) => {
      const m = model(spec.sides);
      const mats = this.materials(spec);
      const mesh = new THREE.Mesh(m.geometry, mats);
      mesh.castShadow = true;
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(m.geometry, 10),
        new THREE.LineBasicMaterial({ color: TONES[spec.tone].edge, transparent: true, opacity: 0.55 }),
      );
      mesh.add(edges);
      const to = new THREE.Vector3((i - (n - 1) / 2) * 2.6, 0, 0);
      const side = i % 2 ? 1 : -1;
      const from = new THREE.Vector3(to.x + side * (1.6 + Math.random() * 0.8), 2.3, -1.4);
      this.scene.add(mesh);
      this.dice.push({
        spec,
        mesh,
        edges,
        mats,
        target: new THREE.Quaternion(),
        spinAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        spin: Math.PI * (5 + Math.random() * 3),
        from,
        to,
        delay: i * 0.07,
      });
    });
    this.frame();
    for (const d of this.dice) d.target = this.targetFor(d.spec.sides, d.spec.face, d.to);
  }

  /** Бросок: кости кувыркаются и ложатся заданными значениями. */
  roll(specs: DieSpec[]) {
    this.idleSpin = false;
    this.place(specs);
    this.start = performance.now();
    cancelAnimationFrame(this.raf);
    const tick = (now: number) => {
      const T = (now - this.start) / ROLL_MS;
      let done = true;
      for (const d of this.dice) {
        const t = Math.min(1, Math.max(0, (T - d.delay) / (1 - d.delay)));
        if (t < 1) done = false;
        const e = ease(t);
        d.mesh.position.set(d.from.x + (d.to.x - d.from.x) * e, d.to.y + bounce(t) * d.from.y, d.from.z + (d.to.z - d.from.z) * e);
        const extra = new THREE.Quaternion().setFromAxisAngle(d.spinAxis, d.spin * (1 - e));
        d.mesh.quaternion.copy(d.target).multiply(extra);
      }
      this.render();
      if (done) {
        this.onLanded?.();
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Показать кости сразу в итоговом положении (просмотр истории, «меньше анимаций»). */
  show(specs: DieSpec[]) {
    this.idleSpin = false;
    cancelAnimationFrame(this.raf);
    this.place(specs);
    for (const d of this.dice) {
      d.mesh.position.copy(d.to);
      d.mesh.quaternion.copy(d.target);
    }
    this.render();
  }

  /** Обновить вид (крит/провал, отброшенная кость) без нового броска. */
  restyle(specs: DieSpec[]) {
    const phys = expandSpecs(specs);
    this.dice.forEach((d, i) => {
      const s = phys[i];
      if (!s || (s.tone === d.spec.tone && s.struck === d.spec.struck)) return;
      d.spec = { ...d.spec, tone: s.tone, struck: s.struck };
      d.mats.forEach((m) => m.dispose());
      d.mats = this.materials(d.spec);
      d.mesh.material = d.mats;
      (d.edges.material as THREE.LineBasicMaterial).color.setHex(TONES[s.tone].edge);
    });
    this.render();
  }

  /** Медленное вращение одной кости (окно подготовки броска). */
  idle(sides: number, value: number, tone: Tone = 'ember') {
    this.place([{ sides, value, tone }]);
    const d = this.dice[0];
    d.mesh.position.set(0, 0.15, 0);
    this.idleSpin = true;
    cancelAnimationFrame(this.raf);
    const axis = new THREE.Vector3(0.35, 1, 0.15).normalize();
    const t0 = performance.now();
    const tick = (now: number) => {
      if (!this.idleSpin) return;
      const t = (now - t0) / 1000;
      d.mesh.quaternion.setFromAxisAngle(axis, t * 0.7);
      d.mesh.position.y = 0.15 + Math.sin(t * 1.6) * 0.12;
      this.render();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.idleSpin = false;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

/** Есть ли WebGL на устройстве. */
export function webglOk(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
