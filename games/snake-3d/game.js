/* ==========================================================================
   Snake 3D – GAMEHUB · gleiche Level wie Snake 2D (levels.js)
   ========================================================================== */
(function () {
  "use strict";
  const ID = "snake-3d";
  const N = window.SNAKE_SIZE;
  const $ = (id) => document.getElementById(id);
  const cx = (x) => x - (N - 1) / 2;

  let level, levelIndex = -1, runScore = 0, eaten = 0;
  let dir = "RIGHT", nextDir = "RIGHT", snake = [], prev = [], apple = { x: 14, y: 10 };
  let wallSet = new Set(), running = false, paused = false, tickTimer = 0, afterAction = null;

  /* ---------- Szene ---------- */
  const world = GH3D.create({
    container: $("scene"),
    camera: { fov: 40, pos: [0, 21, 16], target: [0, 0, 1] },
    orbit: { minDistance: 14, maxDistance: 46, maxPolarAngle: 1.25, mouseButtons: { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }, touches: { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE } },
    shadowBox: 13,
    onResize: fitCamera
  });
  const { scene, camera, controls } = world;

  function fitCamera() {
    const aspect = innerWidth / innerHeight;
    if (aspect < 1) {
      const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
      const h = 11.5 / Math.tan(hfov / 2);
      camera.position.set(0, h, h * 0.18);
    } else camera.position.set(0, 26, 18.5);
    controls.target.set(0, 0, aspect < 1 ? 0 : 1);
  }

  // Spielfeld: Schachbrett-Textur
  const tex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 640;
    const g = c.getContext("2d"), s = 640 / N;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { g.fillStyle = (x + y) % 2 ? "#140a1b" : "#2e1c3b"; g.fillRect(x * s, y * s, s, s); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
  })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(N, N), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0, envMapIntensity: 0.15 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const slab = new THREE.Mesh(GH3D.roundedBox(N + 1, 0.8, N + 1, 0.25), GH3D.mat(0x0e0614, { rough: 0.6, clearcoat: 0.3, env: 0.3 }));
  slab.position.y = -0.41;
  slab.receiveShadow = true;
  scene.add(slab);
  const edge = GH3D.neon(0xe254d6);
  [[0, -N / 2 - 0.03, N + 0.1, 0.05], [0, N / 2 + 0.03, N + 0.1, 0.05], [-N / 2 - 0.03, 0, 0.05, N + 0.1], [N / 2 + 0.03, 0, 0.05, N + 0.1]].forEach(([x, z, w, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), edge); m.position.set(x, 0.01, z); scene.add(m);
  });

  // Wände (Instanzen)
  const wallMesh = new THREE.InstancedMesh(GH3D.roundedBox(0.94, 0.75, 0.94, 0.14), GH3D.mat(0x3a2445, { glow: 0.06, emissive: 0xe254d6, rough: 0.35 }), N * N);
  wallMesh.castShadow = wallMesh.receiveShadow = true;
  wallMesh.count = 0;
  scene.add(wallMesh);

  // Schlange (Instanzen) + Kopf
  const segGeo = GH3D.roundedBox(0.84, 0.62, 0.84, 0.22);
  const segMesh = new THREE.InstancedMesh(segGeo, GH3D.mat(0xffffff, { rough: 0.25, glow: 0.18, emissive: 0xe254d6 }), N * N);
  segMesh.castShadow = true;
  segMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(segMesh);
  const head = new THREE.Group();
  const headBody = new THREE.Mesh(GH3D.roundedBox(0.94, 0.72, 0.94, 0.28), GH3D.mat(0xe254d6, { glow: 0.35, rough: 0.2 }));
  headBody.castShadow = true;
  head.add(headBody);
  const eyeW = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }), eyeB = new THREE.MeshStandardMaterial({ color: 0x120816 });
  [-1, 1].forEach((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), eyeW); e.position.set(0.3, 0.22, s * 0.2); head.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), eyeB); p.position.set(0.4, 0.24, s * 0.2); head.add(p);
  });
  head.add(GH3D.glow(0xe254d6, 2.2, 0.35));
  scene.add(head);

  // Apfel
  const appleG = new THREE.Group();
  const appleM = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 24), GH3D.mat(0xffc857, { glow: 0.9, rough: 0.15 }));
  appleM.castShadow = true;
  appleG.add(appleM, GH3D.glow(0xffc857, 1.8, 0.7));
  const appleLight = new THREE.PointLight(0xffc857, 5, 5, 2);
  appleG.add(appleLight);
  scene.add(appleG);

  const col = new THREE.Color(), c1 = GH3D.lin(0xe254d6), c2 = GH3D.lin(0x6a2a9a);
  const dummy = new THREE.Object3D();

  /* ---------- Logik ---------- */
  const best = () => (window.GHStats && GHStats.best(ID)) || 0;
  function setWalls(walls) {
    wallSet = new Set(walls.map(([x, y]) => x + "," + y));
    walls.forEach(([x, y], i) => { dummy.position.set(cx(x), 0.375, cx(y)); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); wallMesh.setMatrixAt(i, dummy.matrix); });
    wallMesh.count = walls.length;
    wallMesh.instanceMatrix.needsUpdate = true;
  }
  function spawnApple() {
    let a;
    do { a = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; }
    while (wallSet.has(a.x + "," + a.y) || snake.some((s) => s.x === a.x && s.y === a.y));
    return a;
  }
  function startLevel(i, keep) {
    levelIndex = i;
    level = i < 0 ? SNAKE_CLASSIC : SNAKE_LEVELS[i];
    if (!keep) runScore = 0;
    eaten = 0;
    setWalls(level.walls);
    dir = nextDir = "RIGHT";
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    prev = snake.map((s) => ({ ...s }));
    apple = spawnApple();
    $("levelLabel").textContent = i < 0 ? "Modus" : "Level " + (i + 1);
    hud();
    $("overlay").hidden = true;
    running = true; paused = false; tickTimer = 0;
  }
  function hud() {
    $("levelName").textContent = levelIndex < 0 ? "Klassik" : level.name + " · " + eaten + "/" + level.goal;
    $("score").textContent = runScore;
    $("best").textContent = best();
  }
  const OPP = { LEFT: "RIGHT", RIGHT: "LEFT", UP: "DOWN", DOWN: "UP" };
  const VEC = { LEFT: [-1, 0], RIGHT: [1, 0], UP: [0, -1], DOWN: [0, 1] };

  function step() {
    dir = nextDir;
    prev = snake.map((s) => ({ ...s }));
    const [dx, dy] = VEC[dir];
    const hx = snake[0].x + dx, hy = snake[0].y + dy;
    if (hx < 0 || hx >= N || hy < 0 || hy >= N || wallSet.has(hx + "," + hy) || snake.slice(0, -1).some((s) => s.x === hx && s.y === hy)) return gameOver();
    snake.unshift({ x: hx, y: hy });
    prev.unshift({ ...snake[1] });
    if (hx === apple.x && hy === apple.y) {
      runScore++; eaten++;
      world.burst(new THREE.Vector3(cx(hx), 0.5, cx(hy)), 0xffc857, 22, 3.5);
      if (eaten >= level.goal) { hud(); return levelDone(); }
      apple = spawnApple();
      prev.push({ ...prev[prev.length - 1] });
    } else { snake.pop(); prev.pop(); }
    hud();
  }

  function showAfter(t, txt, btn, action) {
    $("ovTitle").textContent = t; $("ovText").textContent = txt;
    $("menu").hidden = true; $("after").hidden = false;
    $("btnNext").textContent = btn; afterAction = action;
    $("overlay").hidden = false;
  }
  function showMenu() {
    const unlocked = window.GHStats ? GHStats.unlocked(ID) : 1;
    $("levelGrid").innerHTML = SNAKE_LEVELS.map((l, i) => '<button data-level="' + i + '" title="' + l.name + '"' + (i + 1 > unlocked ? " disabled" : "") + (i + 1 < unlocked ? ' class="done"' : "") + ">" + (i + 1) + "</button>").join("");
    $("ovTitle").textContent = "Snake 3D"; $("ovText").textContent = "Wähle Klassik oder ein Level.";
    $("menu").hidden = false; $("after").hidden = true; $("overlay").hidden = false;
    $("best").textContent = best();
  }
  function levelDone() {
    running = false;
    const next = levelIndex + 1;
    if (window.GHStats) GHStats.unlock(ID, next + 1);
    if (next >= SNAKE_LEVELS.length) {
      if (window.GHStats) GHStats.record(ID, runScore);
      showAfter("Alle Level geschafft!", runScore + " Äpfel insgesamt · Bestwert " + best(), "Zum Menü", showMenu);
    } else showAfter("Level " + (levelIndex + 1) + " geschafft!", "Weiter mit Level " + (next + 1) + ": " + SNAKE_LEVELS[next].name, "Weiter", () => startLevel(next, true));
  }
  function gameOver() {
    running = false;
    world.shake(0.35);
    world.burst(new THREE.Vector3(cx(snake[0].x), 0.5, cx(snake[0].y)), 0xff5470, 40, 4);
    const prevBest = best();
    if (window.GHStats) GHStats.record(ID, runScore);
    hud();
    showAfter(runScore > prevBest && runScore > 0 ? "Neuer Rekord!" : "Spiel vorbei",
      runScore + (runScore === 1 ? " Apfel" : " Äpfel") + (levelIndex >= 0 ? " · Level " + (levelIndex + 1) : "") + " · Bestwert " + best(), "Nochmal", () => startLevel(levelIndex, false));
  }
  function togglePause() {
    if (!running && !paused) return;
    paused = !paused;
    running = !paused;
    if (paused) showAfter("Pause", runScore + " Äpfel", "Weiter", togglePause);
    else $("overlay").hidden = true;
  }

  /* ---------- Steuerung ---------- */
  addEventListener("keydown", (e) => {
    const map = { ArrowLeft: "LEFT", ArrowUp: "UP", ArrowRight: "RIGHT", ArrowDown: "DOWN", a: "LEFT", w: "UP", d: "RIGHT", s: "DOWN" };
    const d = map[e.key] || map[(e.key || "").toLowerCase()];
    if (d) { e.preventDefault(); if (running && d !== OPP[dir]) nextDir = d; return; }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (running || paused) { if (e.key === " ") togglePause(); }
      else if (!$("after").hidden && afterAction) afterAction();
    }
  });
  GHTouch.swipe($("scene"), { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }, { min: 20 });
  GHTouch.dpad({ up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }, { side: "right" });
  $("btnClassic").onclick = () => startLevel(-1);
  $("levelGrid").addEventListener("click", (e) => { const b = e.target.closest("[data-level]"); if (b && !b.disabled) startLevel(+b.dataset.level); });
  $("btnMenu").onclick = showMenu;
  $("btnNext").onclick = () => afterAction && afterAction();

  /* ---------- Darstellung ---------- */
  const ROT = { RIGHT: 0, DOWN: -Math.PI / 2, LEFT: Math.PI, UP: Math.PI / 2 };
  world.onUpdate((dt, t) => {
    if (running) {
      tickTimer += dt * 1000;
      if (tickTimer >= level.speed) { tickTimer -= level.speed; step(); }
    }
    const a = level ? Math.min(1, tickTimer / level.speed) : 0;
    const n = snake.length;
    for (let i = 1; i < n; i++) {
      const p = prev[i] || snake[i], s = snake[i];
      dummy.position.set(cx(p.x + (s.x - p.x) * a), 0.33 + Math.sin(t * 6 - i * 0.5) * 0.02, cx(p.y + (s.y - p.y) * a));
      const sc = 1 - (i / Math.max(n, 8)) * 0.25;
      dummy.scale.set(sc, sc, sc);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      segMesh.setMatrixAt(i - 1, dummy.matrix);
      col.copy(c1).lerp(c2, n > 1 ? i / (n - 1) : 0);
      segMesh.setColorAt(i - 1, col);
    }
    segMesh.count = Math.max(0, n - 1);
    segMesh.instanceMatrix.needsUpdate = true;
    if (segMesh.instanceColor) segMesh.instanceColor.needsUpdate = true;
    if (n) {
      const p = prev[0] || snake[0], s = snake[0];
      head.position.set(cx(p.x + (s.x - p.x) * a), 0.38, cx(p.y + (s.y - p.y) * a));
      const target = ROT[dir];
      let d = target - head.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      head.rotation.y += d * Math.min(1, dt * 14);
    }
    appleG.position.set(cx(apple.x), 0.45 + Math.sin(t * 3) * 0.08, cx(apple.y));
    appleM.rotation.y += dt;
  });

  // Startbild
  snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
  prev = snake.map((s) => ({ ...s }));
  setWalls([]);
  fitCamera();
  world.start();
  GH3D.ready();
  showMenu();
})();
