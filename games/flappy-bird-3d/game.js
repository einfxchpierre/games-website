/* ==========================================================================
   Flappy Bird 3D – GAMEHUB · Physik wie Flappy Bird 2D (Einheiten: Pixel)
   1 Welteinheit = 40 px · Boden bei y = 0, Decke bei y = 12
   ========================================================================== */
(function () {
  "use strict";
  const ID = "flappy-bird-3d";
  const MODES = {
    easy:   { name: "Leicht", gap: 165, speed: 1.7, spacing: 210 },
    normal: { name: "Normal", gap: 135, speed: 2.1, spacing: 190 },
    hard:   { name: "Schwer", gap: 112, speed: 2.7, spacing: 175 }
  };
  const GRAV = 0.25, JUMP = -4.5, TICK = 20, H = 480, BIRD_X = 50, BIRD = 25, PIPE_W = 50, PX = 40;
  const $ = (id) => document.getElementById(id);
  let mode = localStorage.getItem("flappy3d_mode") || "normal";
  let birdy = 220, birdv = 0, pipes = [], score = 0, running = false, dead = false, acc = 0, scroll = 0;

  const toX = (x) => (x - BIRD_X) / PX;
  const toY = (y) => (H - y) / PX;

  const world = GH3D.create({
    container: $("scene"),
    camera: { fov: 45, pos: [4.5, 6.5, 15], target: [4, 6, 0] },
    sunPos: [10, 24, 14], shadowBox: 16, rim: 2.6,
    fog: { color: 0x06020a, near: 22, far: 70 },
    onResize: fit
  });
  const { scene, camera } = world;
  world.sun.target.position.set(4, 0, 0);
  function fit() {
    const aspect = innerWidth / innerHeight;
    if (aspect < 1) { camera.position.set(2.2, 6.4, 24); camera.lookAt(2.2, 6.2, 0); }
    else { camera.position.set(4.5, 6.5, 15); camera.lookAt(4, 6, 0); }
  }

  /* ---------- Kulisse ---------- */
  // Sterne
  const starGeo = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 600; i++) sp.push((Math.random() - 0.5) * 160, Math.random() * 50 + 4, -30 - Math.random() * 30);
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xf6f2f9, size: 0.18, transparent: true, opacity: 0.8 })));
  // Stadt-Silhouette (Instanzen, Parallaxe)
  const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), GH3D.mat(0x150b1c, { rough: 0.8, clearcoat: 0, glow: 0.05, emissive: 0xe254d6 }), 70);
  const cityData = [];
  const d = new THREE.Object3D();
  for (let i = 0; i < 70; i++) cityData.push({ x: -30 + i * 1.6, h: 2 + Math.random() * 9, w: 1 + Math.random() * 1.2, z: -12 - Math.random() * 8 });
  scene.add(city);
  // Fenster-Lichter
  const win = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.18, 0.25), GH3D.neon(0xffc857, 0.8), 260);
  const winData = [];
  for (let i = 0; i < 260; i++) { const b = cityData[i % 70]; winData.push({ b, ox: (Math.random() - 0.5) * b.w * 0.7, oy: Math.random() * b.h * 0.85 + 0.3 }); }
  scene.add(win);
  // Boden
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 60), GH3D.mat(0x0d0612, { rough: 0.6, clearcoat: 0.4, env: 0.3 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -10); ground.receiveShadow = true;
  scene.add(ground);
  const gridGeo = new THREE.BufferGeometry(), gp = [];
  for (let x = -60; x <= 60; x += 2) gp.push(x, 0.01, -40, x, 0.01, 8);
  for (let z = -40; z <= 8; z += 2) gp.push(-60, 0.01, z, 60, 0.01, z);
  gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(gp, 3));
  const grid = new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: GH3D.lin(0xe254d6), transparent: true, opacity: 0.22, toneMapped: false }));
  scene.add(grid);

  /* ---------- Vogel ---------- */
  const bird = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), GH3D.mat(0xffc857, { glow: 0.25, rough: 0.25 }));
  body.castShadow = true;
  bird.add(body);
  const wingMat = GH3D.mat(0xf59e0b, { rough: 0.35 });
  const wings = [-1, 1].map((s) => {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), wingMat);
    w.scale.set(1.3, 0.35, 0.8); w.position.set(-0.08, 0.02, s * 0.3); w.castShadow = true; bird.add(w); return w;
  });
  const eyeW = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }), eyeB = new THREE.MeshStandardMaterial({ color: 0x120816 });
  [-1, 1].forEach((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), eyeW); e.position.set(0.2, 0.13, s * 0.17); bird.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), eyeB); p.position.set(0.28, 0.14, s * 0.18); bird.add(p);
  });
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 16), GH3D.mat(0xff5470, { rough: 0.3 }));
  beak.rotation.z = -Math.PI / 2; beak.position.set(0.38, 0, 0); bird.add(beak);
  bird.add(GH3D.glow(0xffc857, 1.6, 0.3));
  scene.add(bird);

  /* ---------- Röhren ---------- */
  const pipeGeo = new THREE.CylinderGeometry(0.58, 0.58, 1, 40, 1, true);
  const capGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.4, 40);
  const pipeMat = GH3D.mat(0xb146e6, { glow: 0.25, emissive: 0xe254d6, rough: 0.25, metal: 0.3 });
  const capMat = GH3D.mat(0xe254d6, { glow: 0.45, rough: 0.2 });
  const ringMat = GH3D.neon(0xff8af0);
  const pipePool = [];
  function makePipe() {
    const g = new THREE.Group();
    const top = new THREE.Mesh(pipeGeo, pipeMat), bot = new THREE.Mesh(pipeGeo, pipeMat);
    const ct = new THREE.Mesh(capGeo, capMat), cb = new THREE.Mesh(capGeo, capMat);
    const rt = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.03, 8, 40), ringMat), rb = rt.clone();
    rt.rotation.x = rb.rotation.x = Math.PI / 2;
    [top, bot, ct, cb].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
    g.add(top, bot, ct, cb, rt, rb);
    g.userData = { top, bot, ct, cb, rt, rb };
    scene.add(g);
    return g;
  }
  function layoutPipe(g, p) {
    const gap = MODES[mode].gap;
    const topH = p.y / PX, botY = toY(p.y + gap);
    const u = g.userData;
    u.top.scale.y = topH + 2; u.top.position.y = 12 - (topH + 2) / 2 + 2;
    u.bot.scale.y = botY; u.bot.position.y = botY / 2;
    u.ct.position.y = toY(p.y) + 0.2; u.cb.position.y = botY - 0.2;
    u.rt.position.y = toY(p.y) + 0.02; u.rb.position.y = botY - 0.02;
    g.position.set(toX(p.x + PIPE_W / 2), 0, 0);
  }

  /* ---------- Logik ---------- */
  const randGap = () => Math.floor(Math.random() * (H - MODES[mode].gap - 100)) + 50;
  const bestKey = () => "best_" + mode;
  const best = () => (window.GHStats && GHStats.progress(ID, bestKey())) || 0;

  function setMode(m) {
    mode = m; localStorage.setItem("flappy3d_mode", m);
    $("modeLabel").textContent = MODES[m].name;
    $("best").textContent = best();
    document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("gh-btn-white", b.dataset.mode === m));
  }
  function start() {
    birdy = 220; birdv = 0; score = 0; dead = false; acc = 0;
    pipes.forEach((p) => (p.g.visible = false));
    pipes = [];
    addPipe(BIRD_X + 520);
    $("score").textContent = "0";
    $("overlay").hidden = true;
    running = true;
  }
  function addPipe(x) {
    let g = pipePool.find((q) => !q.visible);
    if (!g) { g = makePipe(); pipePool.push(g); }
    g.visible = true;
    pipes.push({ x, y: randGap(), scored: false, g });
  }
  function flap() { if (running) { birdv = JUMP; } else if ($("overlay").hidden === false && !dead) start(); }

  function tick() {
    const m = MODES[mode];
    birdv += GRAV; birdy += birdv;
    for (const p of pipes) {
      p.x -= m.speed;
      if (!p.scored && p.x + PIPE_W < BIRD_X) {
        p.scored = true; score++; $("score").textContent = score;
        world.burst(new THREE.Vector3(0.5, toY(birdy), 0), 0xffc857, 8, 2);
      }
      if (BIRD_X + BIRD > p.x && BIRD_X < p.x + PIPE_W && (birdy < p.y || birdy + BIRD > p.y + m.gap)) return crash();
    }
    if (birdy + BIRD > H || birdy < -BIRD) return crash();
    const last = pipes[pipes.length - 1];
    if (last.x < BIRD_X + 520 - m.spacing) addPipe(BIRD_X + 520);
    if (pipes[0].x < BIRD_X - 360) { pipes[0].g.visible = false; pipes.shift(); }
    scroll += m.speed;
  }

  function crash() {
    running = false; dead = true;
    world.shake(0.35);
    world.burst(bird.position.clone(), 0xffc857, 40, 4);
    const prev = best();
    if (window.GHStats) { GHStats.record(ID, score); if (score > prev) GHStats.progress(ID, bestKey(), score); }
    setTimeout(() => {
      dead = false;
      $("best").textContent = best();
      $("ovTitle").textContent = score > prev && score > 0 ? "Neuer Rekord!" : "Spiel vorbei";
      $("ovText").textContent = score + (score === 1 ? " Punkt" : " Punkte") + " · Bestwert " + MODES[mode].name + ": " + best();
      $("btnStart").textContent = "Nochmal spielen";
      $("overlay").hidden = false;
    }, 700);
  }

  addEventListener("keydown", (e) => { if (e.code === "Space" || e.key === " ") { e.preventDefault(); flap(); } });
  $("scene").addEventListener("pointerdown", (e) => { e.preventDefault(); flap(); });
  $("btnStart").onclick = start;
  document.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));

  /* ---------- Bild ---------- */
  world.onUpdate((dt, t) => {
    if (running) {
      acc += dt * 1000;
      while (acc >= TICK && running) { acc -= TICK; tick(); }
    } else if (!dead) {
      birdy = 220 + Math.sin(t * 2.5) * 12; // Schweben im Menü
      scroll += 0.6;
    } else if (birdy < H - BIRD) { birdv += GRAV; birdy = Math.min(H - BIRD, birdy + birdv); }
    bird.position.set(0, toY(birdy + BIRD / 2), 0);
    bird.rotation.z = THREE.MathUtils.lerp(bird.rotation.z, Math.max(-1.1, Math.min(0.5, -birdv * 0.11)), 0.25);
    const flapA = running ? Math.sin(t * 22) * 0.6 : Math.sin(t * 8) * 0.4;
    wings[0].rotation.x = flapA; wings[1].rotation.x = -flapA;
    pipes.forEach((p) => layoutPipe(p.g, p));
    // Parallaxe
    const off = scroll / PX;
    cityData.forEach((b, i) => {
      let x = ((b.x - off * 0.25) % 112 + 112) % 112 - 30;
      d.position.set(x, b.h / 2, b.z); d.scale.set(b.w, b.h, b.w); d.updateMatrix(); city.setMatrixAt(i, d.matrix);
      b._x = x;
    });
    city.instanceMatrix.needsUpdate = true;
    winData.forEach((w, i) => { d.position.set(w.b._x + w.ox, w.oy, w.b.z + w.b.w / 2 + 0.01); d.scale.set(1, 1, 1); d.updateMatrix(); win.setMatrixAt(i, d.matrix); });
    win.instanceMatrix.needsUpdate = true;
    grid.position.x = -(off % 2);
  });

  setMode(mode);
  fit();
  world.start();
  GH3D.ready();
})();
