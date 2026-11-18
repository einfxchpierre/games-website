/* ==========================================================================
   Pac Man 3D – GAMEHUB · Logik aus /games/pacman/core.js
   1 Feld = 1 Welteinheit · Spalte c → x = c − 13 · Zeile r → z = r − 7
   ========================================================================== */
(function () {
  "use strict";
  const ID = "pacman-3d";
  const game = new PacCore();
  const T = PacCore.TILE, C = 27, R = 15;
  const $ = (id) => document.getElementById(id);
  const wx = (c) => c - (C - 1) / 2, wz = (r) => r - (R - 1) / 2;
  let paused = false;

  const world = GH3D.create({
    container: $("scene"),
    camera: { fov: 40, pos: [0, 22, 13], target: [0, 0, 0.6] },
    orbit: { minDistance: 12, maxDistance: 60, maxPolarAngle: 1.2, mouseButtons: { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }, touches: { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE } },
    shadowBox: 16, ambient: 0.4,
    onResize: fit
  });
  const { scene, camera, controls } = world;
  function fit() {
    const aspect = innerWidth / innerHeight;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const dist = Math.max(15.5 / Math.tan(hfov / 2), 10.5 / Math.tan(vfov / 2));
    const tilt = aspect < 1 ? 0.12 : 0.55;
    camera.position.set(0, dist * Math.cos(Math.atan(tilt)), dist * Math.sin(Math.atan(tilt)));
    controls.target.set(0, 0, aspect < 1 ? 0 : 0.6);
  }

  /* ---------- Statische Teile ---------- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(C + 2, R + 2), GH3D.mat(0x0b0510, { rough: 0.7, clearcoat: 0.3, env: 0.25 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  scene.add(floor);

  const mazeGroup = new THREE.Group();
  scene.add(mazeGroup);
  const wallGeo = GH3D.roundedBox(1, 0.7, 1, 0.08, 2);
  const wallMat = GH3D.mat(0x1d1127, { rough: 0.4, metal: 0.2, clearcoat: 0.6 });
  const edgeGeoH = new THREE.BoxGeometry(1, 0.03, 0.06), edgeGeoV = new THREE.BoxGeometry(0.06, 0.03, 1);
  const edgeMat = GH3D.neon(0xe254d6);
  const pelletGeo = new THREE.SphereGeometry(0.1, 12, 8);
  const pelletMat = GH3D.mat(0xf6f2f9, { glow: 0.6, rough: 0.2 });
  const powerMat = GH3D.mat(0xffc857, { glow: 1.2, rough: 0.15 });
  let pellets = null, pelletIndex = {}, powers = {};
  const d = new THREE.Object3D();

  function buildMaze() {
    while (mazeGroup.children.length) mazeGroup.remove(mazeGroup.children[0]);
    const g = game.grid;
    const walls = [], edgesH = [], edgesV = [];
    const open = (r, c) => r >= 0 && r < R && c >= 0 && c < C && g[r][c] !== 1;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (g[r][c] !== 1) continue;
      walls.push([c, r]);
      if (open(r - 1, c)) edgesH.push([wx(c), wz(r) - 0.47]);
      if (open(r + 1, c)) edgesH.push([wx(c), wz(r) + 0.47]);
      if (open(r, c - 1)) edgesV.push([wx(c) - 0.47, wz(r)]);
      if (open(r, c + 1)) edgesV.push([wx(c) + 0.47, wz(r)]);
    }
    const wm = new THREE.InstancedMesh(wallGeo, wallMat, walls.length);
    walls.forEach(([c, r], i) => { d.position.set(wx(c), 0.35, wz(r)); d.scale.set(1, 1, 1); d.updateMatrix(); wm.setMatrixAt(i, d.matrix); });
    wm.castShadow = wm.receiveShadow = true;
    mazeGroup.add(wm);
    [[edgesH, edgeGeoH], [edgesV, edgeGeoV]].forEach(([list, geo]) => {
      const em = new THREE.InstancedMesh(geo, edgeMat, list.length);
      list.forEach(([x, z], i) => { d.position.set(x, 0.71, z); d.updateMatrix(); em.setMatrixAt(i, d.matrix); });
      mazeGroup.add(em);
    });
    // Tür
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (g[r][c] === 4) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 0.12), GH3D.neon(0xff8aa0));
      door.position.set(wx(c), 0.3, wz(r));
      mazeGroup.add(door);
    }
    // Punkte
    const list = [];
    powers = {};
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (g[r][c] === 2) list.push([c, r]);
      if (g[r][c] === 3) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), powerMat);
        p.position.set(wx(c), 0.35, wz(r));
        p.add(GH3D.glow(0xffc857, 1.4, 0.6));
        mazeGroup.add(p);
        powers[c + "," + r] = p;
      }
    }
    pellets = new THREE.InstancedMesh(pelletGeo, pelletMat, list.length);
    pelletIndex = {};
    list.forEach(([c, r], i) => { d.position.set(wx(c), 0.3, wz(r)); d.scale.set(1, 1, 1); d.updateMatrix(); pellets.setMatrixAt(i, d.matrix); pelletIndex[c + "," + r] = i; });
    mazeGroup.add(pellets);
  }

  /* ---------- Pac-Man ---------- */
  const pac = new THREE.Group();
  const pacMat = GH3D.mat(0xffc857, { glow: 0.35, rough: 0.25 });
  const upper = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), pacMat);
  const lower = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), pacMat);
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x3a0d1a, side: THREE.DoubleSide });
  const lid1 = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), mouthMat), lid2 = lid1.clone();
  lid1.rotation.x = Math.PI / 2; lid2.rotation.x = -Math.PI / 2;
  upper.add(lid1); lower.add(lid2);
  const hinge1 = new THREE.Group(), hinge2 = new THREE.Group();
  hinge1.add(upper); hinge2.add(lower);
  [upper, lower].forEach((m) => (m.castShadow = true));
  pac.add(hinge1, hinge2, GH3D.glow(0xffc857, 2, 0.35));
  const pacLight = new THREE.PointLight(0xffc857, 4, 4, 2);
  pacLight.position.y = 0.6;
  pac.add(pacLight);
  scene.add(pac);

  /* ---------- Geister ---------- */
  // Geisterform: Saum unten, gerade Seiten, runde Kuppel
  const ghostProfile = [new THREE.Vector2(0.44, 0), new THREE.Vector2(0.42, 0.08), new THREE.Vector2(0.4, 0.45)];
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI / 2; ghostProfile.push(new THREE.Vector2(Math.cos(a) * 0.4, 0.45 + Math.sin(a) * 0.4)); }
  const ghostGeo = new THREE.LatheGeometry(ghostProfile, 32);
  const scaredMat = GH3D.mat(0x6366f1, { glow: 0.5, rough: 0.3 });
  const whiteMat = GH3D.mat(0xf6f2f9, { glow: 0.5, rough: 0.3 });
  const ghostMeshes = game.ghosts.map((g) => {
    const grp = new THREE.Group();
    const mat = GH3D.mat(g.color, { glow: 0.45, rough: 0.25 });
    const body = new THREE.Mesh(ghostGeo, mat);
    body.castShadow = true;
    grp.add(body);
    const eyeW = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }), eyeB = new THREE.MeshStandardMaterial({ color: 0x120816 });
    const pupils = [];
    [-1, 1].forEach((s) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), eyeW); e.position.set(s * 0.15, 0.5, 0.3); grp.add(e);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), eyeB); p.position.set(s * 0.15, 0.5, 0.39); grp.add(p); pupils.push(p);
    });
    grp.add(GH3D.glow(g.color, 1.6, 0.35));
    scene.add(grp);
    return { grp, body, mat, pupils };
  });

  /* ---------- HUD ---------- */
  const best = () => (window.GHStats && GHStats.best(ID)) || 0;
  function hud() {
    $("score").textContent = game.score.toLocaleString("de-DE");
    $("lives").textContent = game.lives;
    $("level").textContent = game.level;
    $("maze").textContent = game.mazeName;
    $("best").textContent = best().toLocaleString("de-DE");
  }
  function banner(text, ms) {
    const b = $("banner");
    b.textContent = text; b.classList.add("show");
    clearTimeout(banner.t);
    if (ms) banner.t = setTimeout(() => b.classList.remove("show"), ms);
  }

  game.on("eat", (p) => {
    const i = pelletIndex[p.x + "," + p.y];
    if (i != null) { d.position.set(0, -10, 0); d.scale.set(0, 0, 0); d.updateMatrix(); pellets.setMatrixAt(i, d.matrix); pellets.instanceMatrix.needsUpdate = true; }
    hud();
  });
  game.on("power", (p) => {
    const m = powers[p.x + "," + p.y];
    if (m) { m.visible = false; world.burst(m.position.clone(), 0xffc857, 18, 3); }
    hud();
  });
  game.on("ghost", (e) => { world.burst(new THREE.Vector3(wx(e.g.x / T), 0.5, wz(e.g.y / T)), 0x6366f1, 26, 3.5); banner("+" + e.pts, 700); hud(); });
  game.on("death", () => { world.shake(0.35); world.burst(pac.position.clone(), 0xffc857, 40, 4); });
  game.on("change", () => { hud(); if (game.state === "ready") banner(game.level > 1 ? "Level " + game.level + " · " + game.mazeName : "Bereit!"); });
  game.on("go", () => $("banner").classList.remove("show"));
  game.on("clear", () => banner("Level geschafft!"));
  game.on("level", () => { buildMaze(); hud(); });
  game.on("extralife", () => banner("+1 Leben", 1200));
  game.on("over", (r) => {
    const prev = best();
    const res = window.GHStats ? GHStats.record(ID, r.score) : { best: r.score };
    $("ovTitle").textContent = r.score > prev && r.score > 0 ? "Neuer Rekord!" : "Spiel vorbei";
    $("ovText").textContent = r.score.toLocaleString("de-DE") + " Punkte · Level " + r.level + " · Bestwert " + res.best.toLocaleString("de-DE");
    $("btnStart").textContent = "Nochmal spielen";
    $("overlay").hidden = false;
    hud();
  });

  function start() { $("overlay").hidden = true; paused = false; game.newGame(); buildMaze(); hud(); }
  function togglePause() {
    if (game.state === "idle" || game.state === "over") return;
    paused = !paused;
    $("ovTitle").textContent = "Pause"; $("ovText").textContent = "Drücke P, um weiterzuspielen.";
    $("btnStart").textContent = "Weiter";
    $("overlay").hidden = !paused;
  }
  $("btnStart").onclick = () => { if (paused) togglePause(); else start(); };
  addEventListener("keydown", (e) => {
    if (e.key.startsWith("Arrow")) e.preventDefault();
    const k = e.key.toLowerCase();
    if (e.key === "Enter" && (game.state === "idle" || game.state === "over")) return start();
    if (k === "p" || e.key === "Escape") return togglePause();
    if (e.key === "ArrowUp" || k === "w") game.setDir(0, -1);
    if (e.key === "ArrowDown" || k === "s") game.setDir(0, 1);
    if (e.key === "ArrowLeft" || k === "a") game.setDir(-1, 0);
    if (e.key === "ArrowRight" || k === "d") game.setDir(1, 0);
  });
  GHTouch.swipe($("scene"), { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }, { min: 18 });
  GHTouch.dpad({ up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }, { side: "right" });

  /* ---------- Bild ---------- */
  let acc = 0;
  const DIR_ROT = (dx, dy) => (dx === 1 ? 0 : dx === -1 ? Math.PI : dy === 1 ? -Math.PI / 2 : Math.PI / 2);
  world.onUpdate((dt, t) => {
    acc += dt * 1000;
    while (acc >= 1000 / 60) { if (!paused) game.update(); acc -= 1000 / 60; }

    const p = game.pac;
    pac.position.set(wx(p.x / T), 0.42, wz(p.y / T));
    const dying = game.state === "dying";
    const open = dying ? Math.min(1.5, (90 - game.deathTimer) / 60) : 0.05 + Math.abs(Math.sin(p.mouth)) * 0.45;
    hinge1.rotation.z = open; hinge2.rotation.z = -open;
    const target = p.dx || p.dy ? DIR_ROT(p.dx, p.dy) : pac.rotation.y;
    let dd = target - pac.rotation.y;
    while (dd > Math.PI) dd -= Math.PI * 2;
    while (dd < -Math.PI) dd += Math.PI * 2;
    pac.rotation.y += dd * Math.min(1, dt * 16);
    pac.scale.setScalar(dying ? Math.max(0.01, game.deathTimer / 90) : 1);

    const scared = game.fright > 0;
    const blink = scared && game.fright < 60 && Math.floor(game.fright / 10) % 2 === 0;
    game.ghosts.forEach((g, i) => {
      const m = ghostMeshes[i];
      m.grp.visible = !dying;
      m.grp.position.set(wx(g.x / T), 0.05 + Math.abs(Math.sin(t * 5 + i)) * 0.06, wz(g.y / T));
      m.body.material = scared && !g.inHouse ? (blink ? whiteMat : scaredMat) : m.mat;
      m.grp.rotation.y = g.dx || g.dy ? DIR_ROT(g.dx, g.dy) + Math.PI / 2 : m.grp.rotation.y;
      m.grp.children.forEach((c) => { if (c.material && c.material.opacity != null && c.isSprite) c.material.opacity = g.inHouse ? 0.15 : 0.35; });
    });
    Object.values(powers).forEach((m) => { if (m.visible) m.scale.setScalar(1 + Math.sin(t * 6) * 0.15); });
  });

  buildMaze();
  hud();
  fit();
  world.start();
  GH3D.ready();
})();
