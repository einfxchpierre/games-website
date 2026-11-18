/* ==========================================================================
   Jump'n Run 3D – GAMEHUB
   Level und Physik wie Jump'n Run 2D (Einheiten: Pixel, 1 Feld = 40 px).
   Darstellung: 1 Feld = 1 Welteinheit, y nach oben.
   ========================================================================== */
import { levels } from "/games/jumpnrun/level/levels.js";

const ID = "jumpnrun-3d";
const TILE = 40, CFG = { gravity: 0.8, speed: 6, jump: -15 };
const PW = 32, PH = 38;
const $ = (id) => document.getElementById(id);

let layout = [], rows = 15, levelIndex = 0, lives = 3, coins = 0, running = false;
let blocks = [], enemies = [], spawn = { x: 50, y: 50 }, checkpoint = null;
let pX = 0, pY = 0, vX = 0, vY = 0, grounded = false, facing = 1;
const keys = {};

const world = GH3D.create({
  container: $("scene"),
  camera: { fov: 42, pos: [0, 8, 16], target: [0, 7, 0] },
  sunPos: [-6, 22, 14], shadowBox: 22, rim: 2.4, ambient: 0.5,
  fog: { color: 0x06020a, near: 26, far: 70 }
});
const { scene, camera } = world;

// Hintergrund: Sterne + ferne Berge
const sg = new THREE.BufferGeometry(), sp = [];
for (let i = 0; i < 700; i++) sp.push(Math.random() * 160 - 20, Math.random() * 40 - 2, -25 - Math.random() * 25);
sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xf6f2f9, size: 0.2 })));
const hillMat = GH3D.mat(0x1d0b24, { rough: 0.9, clearcoat: 0, glow: 0.06, emissive: 0xe254d6 });
for (let i = 0; i < 26; i++) {
  const h = 4 + Math.random() * 8;
  const m = new THREE.Mesh(new THREE.ConeGeometry(4 + Math.random() * 3, h, 4), hillMat);
  m.position.set(i * 6 - 10, h / 2 - 3, -16 - Math.random() * 6);
  m.rotation.y = Math.random();
  scene.add(m);
}

const levelGroup = new THREE.Group();
scene.add(levelGroup);
const blockGeo = GH3D.roundedBox(1, 1, 1.6, 0.08, 2);
const blockMat = GH3D.mat(0x2a1a33, { rough: 0.45, clearcoat: 0.4 });
const platMat = GH3D.mat(0x3a2445, { rough: 0.35, glow: 0.08, emissive: 0xe254d6 });
const topGeo = new THREE.BoxGeometry(1, 0.05, 1.62);
const topMat = GH3D.neon(0xe254d6);
const coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 28);
const coinMat = GH3D.mat(0xffc857, { glow: 0.6, metal: 0.6, rough: 0.2 });

const wx = (px) => px / TILE;
const wy = (py) => rows - py / TILE;

/* ---------- Spieler ---------- */
const player = new THREE.Group();
const pBody = new THREE.Mesh(GH3D.roundedBox(0.8, 0.95, 0.8, 0.22), GH3D.mat(0xe254d6, { glow: 0.35, rough: 0.2 }));
pBody.castShadow = true;
player.add(pBody);
const eyeW = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), eyeW); e.position.set(0.22, 0.18, s * 0.18 + 0.2); player.add(e); return e; });
player.add(GH3D.glow(0xe254d6, 2, 0.35));
const pLight = new THREE.PointLight(0xe254d6, 5, 5, 2);
player.add(pLight);
scene.add(player);

/* ---------- Level aufbauen ---------- */
class Enemy {
  constructor(x, y, mesh) { this.x = x; this.y = y; this.mesh = mesh; this.dir = 1; this.speed = 2; }
  update() {
    this.x += this.dir * this.speed;
    for (const b of blocks) {
      if ((b.type === "X" || b.type === "#" || b.type === "-") && this.x < b.x + 35 && this.x + 34 > b.x && this.y === b.y) { this.dir *= -1; this.x += this.dir * 5; break; }
    }
  }
}

function enemyMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 20), GH3D.mat(0xff5470, { glow: 0.45, rough: 0.25 }));
  body.scale.y = 0.85; body.castShadow = true;
  g.add(body);
  const eB = new THREE.MeshStandardMaterial({ color: 0x120816 });
  [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), eB); e.position.set(s * 0.15, 0.12, 0.38); g.add(e); });
  g.add(GH3D.glow(0xff5470, 1.6, 0.35));
  return g;
}

async function loadLevel(i, fresh) {
  levelIndex = i;
  if (fresh) { lives = 3; coins = 0; checkpoint = null; }
  const mod = await import("/games/jumpnrun/level/" + levels[i] + ".js");
  layout = mod.layout;
  rows = layout.length;
  while (levelGroup.children.length) levelGroup.remove(levelGroup.children[0]);
  blocks = []; enemies = [];
  spawn = { x: 50, y: 50 };
  const solid = [], plats = [], tops = [];
  const at = (r, c) => (layout[r] || "")[c] || " ";
  layout.forEach((row, y) => row.split("").forEach((ch, x) => {
    const bx = x * TILE, by = y * TILE;
    if (ch === "S") { spawn = { x: bx, y: by }; return; }
    if (ch === " ") return;
    if (ch === "E") { const m = enemyMesh(); levelGroup.add(m); enemies.push(new Enemy(bx, by, m)); return; }
    const b = { x: bx, y: by, w: 40, h: 40, type: ch, mesh: null };
    if (ch === "#") { solid.push([x, y]); if (at(y - 1, x) !== "#" && at(y - 1, x) !== "-") tops.push([x, y]); }
    if (ch === "-") { plats.push([x, y]); tops.push([x, y]); }
    if (ch === "C") { const m = new THREE.Mesh(coinGeo, coinMat); m.rotation.x = Math.PI / 2; m.position.set(x + 0.5, rows - y - 0.5, 0); m.castShadow = true; levelGroup.add(m); b.mesh = m; }
    if (ch === "P") {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 10, 32), GH3D.neon(0x38bdf8, 0.6));
      m.position.set(x + 0.5, rows - y - 0.5, 0); levelGroup.add(m); b.mesh = m;
    }
    if (ch === "F") {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 12), GH3D.mat(0xf6f2f9, { rough: 0.3 }));
      pole.position.y = 0.7;
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.04), GH3D.mat(0xe254d6, { glow: 0.8 }));
      cloth.position.set(0.42, 1.6, 0);
      g.add(pole, cloth, GH3D.glow(0xe254d6, 3, 0.5));
      g.position.set(x + 0.5, rows - y - 1, 0);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      levelGroup.add(g); b.mesh = g;
    }
    blocks.push(b);
  }));
  const inst = (list, geo, mat, y0) => {
    if (!list.length) return;
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    const d = new THREE.Object3D();
    list.forEach(([x, y], k) => { d.position.set(x + 0.5, rows - y - 0.5 + (y0 || 0), 0); d.updateMatrix(); m.setMatrixAt(k, d.matrix); });
    m.castShadow = m.receiveShadow = true;
    levelGroup.add(m);
  };
  inst(solid, blockGeo, blockMat);
  inst(plats, blockGeo, platMat);
  inst(tops, topGeo, topMat, 0.5);
  const start = checkpoint || spawn;
  pX = start.x; pY = start.y; vX = 0; vY = 0; grounded = false;
  world.sun.position.set(pX / TILE - 6, 22, 14);
  hud();
}

/* ---------- Physik (wie 2D) ---------- */
function step() {
  if (keys.ArrowRight || keys.d) { vX = CFG.speed; facing = 1; }
  else if (keys.ArrowLeft || keys.a) { vX = -CFG.speed; facing = -1; }
  else vX = 0;
  if ((keys.ArrowUp || keys.w || keys[" "]) && grounded) { vY = CFG.jump; grounded = false; }
  vY += CFG.gravity; pX += vX; pY += vY;
  grounded = false;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (pX < b.x + b.w && pX + PW > b.x && pY < b.y + b.h && pY + PH > b.y) {
      if (b.type === "C") { coins++; world.burst(b.mesh.position.clone(), 0xffc857, 10, 2.5); levelGroup.remove(b.mesh); blocks.splice(i, 1); hud(); continue; }
      if (b.type === "F") { win(); return false; }
      if (b.type === "P") {
        if (!checkpoint || checkpoint.x !== b.x) { checkpoint = { x: b.x, y: b.y }; b.mesh.material = GH3D.neon(0x38bdf8); b.mesh.add(GH3D.glow(0x38bdf8, 1.6, 0.7)); world.burst(b.mesh.position.clone(), 0x38bdf8, 16, 3); }
        continue;
      }
      if (b.type === "X") continue;
      if (vY > 0 && pY + 20 < b.y) { pY = b.y - PH; vY = 0; grounded = true; }
      else if (vY < 0 && pY > b.y + 10) { pY = b.y + b.h; vY = 0; }
      else pX -= vX;
    }
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.update();
    if (pX < e.x + 34 && pX + PW > e.x && pY < e.y + 34 && pY + PH > e.y) {
      if (vY > 0 && pY + 10 < e.y) {
        world.burst(e.mesh.position.clone(), 0xff5470, 22, 3.5);
        levelGroup.remove(e.mesh); enemies.splice(i, 1); vY = CFG.jump / 1.5;
      } else { die(); return false; }
    }
  }
  if (pY > rows * TILE + 400) { die(); return false; }
  return true;
}

function die() {
  running = false;
  world.shake(0.4);
  world.burst(player.position.clone(), 0xe254d6, 40, 4);
  lives--;
  hud();
  setTimeout(() => {
    if (lives <= 0) {
      if (window.GHStats) GHStats.record(ID, levelIndex);
      showMenu("Keine Leben mehr", "Du bist bis Level " + (levelIndex + 1) + " gekommen.");
    } else loadLevel(levelIndex, false).then(() => (running = true));
  }, 800);
}

function win() {
  running = false;
  world.burst(player.position.clone(), 0xffc857, 60, 5);
  checkpoint = null;
  if (window.GHStats) {
    GHStats.unlock(ID, levelIndex + 2);
    GHStats.setBest(ID, levelIndex + 1);
  }
  const next = levelIndex + 1;
  setTimeout(() => {
    if (next >= levels.length) {
      if (window.GHStats) GHStats.record(ID, levels.length);
      showMenu("Gewonnen!", "Du hast alle " + levels.length + " Level gemeistert – mit " + coins + " Münzen.");
    } else {
      $("ovTitle").textContent = "Level " + (levelIndex + 1) + " geschafft!";
      $("ovText").textContent = coins + " Münzen gesammelt.";
      $("levelGrid").style.display = "none";
      $("btnNext").hidden = false;
      $("btnNext").onclick = () => { $("overlay").hidden = true; loadLevel(next, false).then(() => { running = true; document.body.classList.remove("in-menu"); }); };
      $("overlay").hidden = false;
    }
  }, 900);
}

/* ---------- Menü & HUD ---------- */
function hud() {
  $("level").textContent = levelIndex + 1;
  $("lives").textContent = "♥".repeat(Math.max(0, lives)) || "–";
  $("coins").textContent = coins;
}
function showMenu(title, text) {
  running = false;
  document.body.classList.add("in-menu");
  const unlocked = window.GHStats ? GHStats.unlocked(ID) : 1;
  $("levelGrid").innerHTML = levels.map((_, i) => '<button data-level="' + i + '"' + (i + 1 > unlocked ? " disabled" : "") + (i + 1 < unlocked ? ' class="done"' : "") + ">" + (i + 1) + "</button>").join("");
  $("levelGrid").style.display = "";
  $("btnNext").hidden = true;
  $("ovTitle").textContent = title || "Jump'n Run 3D";
  $("ovText").textContent = text || "12 Level – springe Gegnern auf den Kopf und erreiche die Flagge.";
  $("overlay").hidden = false;
}
$("levelGrid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-level]"); if (!b || b.disabled) return;
  $("overlay").hidden = true;
  document.body.classList.remove("in-menu");
  loadLevel(+b.dataset.level, true).then(() => (running = true));
});
$("btnMenu").onclick = () => showMenu();

addEventListener("keydown", (e) => { keys[e.key] = true; if (e.key === " " || e.key.startsWith("Arrow")) e.preventDefault(); });
addEventListener("keyup", (e) => { keys[e.key] = false; });
GHTouch.dpad({ left: "ArrowLeft", right: "ArrowRight" }, { side: "left" });
GHTouch.buttons([{ label: "Sprung", key: " ", big: true }], { side: "right" });

/* ---------- Bild ---------- */
let acc = 0;
const camPos = new THREE.Vector3(0, 8, 16);
world.onUpdate((dt, t) => {
  if (running) {
    acc += dt * 1000;
    while (acc >= 1000 / 60) { acc -= 1000 / 60; if (!step()) break; }
  }
  const x = wx(pX + PW / 2), y = wy(pY + PH / 2);
  player.position.set(x, y, 0);
  pBody.rotation.y = THREE.MathUtils.lerp(pBody.rotation.y, facing > 0 ? 0 : Math.PI, 0.2);
  eyes.forEach((e) => (e.position.x = facing * 0.22));
  pBody.scale.set(1, grounded ? 1 + Math.sin(t * 16) * (vX ? 0.04 : 0.01) : 1.08, 1);
  enemies.forEach((e) => { e.mesh.position.set(wx(e.x + 17), wy(e.y + 34) + 0.42, 0); e.mesh.rotation.y = e.dir > 0 ? 0.6 : -0.6; });
  levelGroup.children.forEach((m) => { if (m.geometry === coinGeo) m.rotation.z += dt * 4; });
  // Kamera folgt weich
  const aspect = innerWidth / innerHeight;
  const dist = aspect < 1 ? 22 : 15;
  camPos.set(x + 1.5, Math.max(y + 2, rows * 0.45), dist);
  camera.position.lerp(camPos, Math.min(1, dt * 4));
  camera.lookAt(camera.position.x - 0.5, camera.position.y - 2.2, 0);
  world.sun.position.set(camera.position.x - 6, 22, 14);
  world.sun.target.position.set(camera.position.x, 5, 0);
});

world.start();
GH3D.ready();
loadLevel(0, true).then(() => showMenu());
