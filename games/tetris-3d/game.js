/* ==========================================================================
   Tetris 3D – GAMEHUB · Logik aus /games/tetris/core.js
   ========================================================================== */
(function () {
  "use strict";
  const ID = "tetris-3d";
  const COLS = 10, ROWS = 20;
  const game = new TetrisCore({ cols: COLS, rows: ROWS });
  const MODES = TetrisCore.MODES, COLORS = TetrisCore.COLORS;
  const $ = (id) => document.getElementById(id);
  let mode = localStorage.getItem("tetris3d_mode") || "marathon";

  const wx = (x) => x - COLS / 2 + 0.5;
  const wy = (y) => ROWS - y - 0.5;

  const world = GH3D.create({
    container: $("scene"),
    camera: { fov: 38, pos: [0, 12, 34], target: [0, 10, 0] },
    orbit: { minDistance: 18, maxDistance: 60, minAzimuthAngle: -0.9, maxAzimuthAngle: 0.9, minPolarAngle: 0.6, maxPolarAngle: 1.9,
      mouseButtons: { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }, touches: { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE } },
    sunPos: [6, 26, 18],
    shadowBox: 14,
    onResize: fitCamera
  });
  const { scene, camera, controls } = world;
  world.sun.target.position.set(0, 10, 0);

  function fitCamera() {
    const aspect = innerWidth / innerHeight;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    // Schacht (22 hoch, 12 breit) muss passen
    const distV = 13 / Math.tan(vfov / 2);
    const distH = 8.5 / (Math.tan(vfov / 2) * aspect);
    const d = Math.max(distV, distH) * (aspect < 1 ? 1.22 : 1.08);
    camera.position.set(0, 11, d);
    // Handy: Schacht etwas nach unten schieben (Platz für die Anzeigen oben)
    camera.setViewOffset(innerWidth, innerHeight, 0, aspect < 1 ? -innerHeight * 0.06 : 0, innerWidth, innerHeight);
    camera.updateProjectionMatrix();
    controls.target.set(0, aspect < 1 ? 9 : 10, 0);
  }

  /* ---------- Schacht ---------- */
  const back = new THREE.Mesh(new THREE.PlaneGeometry(COLS, ROWS), new THREE.MeshStandardMaterial({ color: GH3D.lin(0x120a18), roughness: 0.9 }));
  back.position.set(0, ROWS / 2, -0.55);
  back.receiveShadow = true;
  scene.add(back);
  // Raster
  const pts = [];
  for (let x = 0; x <= COLS; x++) pts.push(x - COLS / 2, 0, -0.54, x - COLS / 2, ROWS, -0.54);
  for (let y = 0; y <= ROWS; y++) pts.push(-COLS / 2, y, -0.54, COLS / 2, y, -0.54);
  const gg = new THREE.BufferGeometry();
  gg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: GH3D.lin(0xe254d6), transparent: true, opacity: 0.12, toneMapped: false })));
  // Rahmen
  const frameMat = GH3D.mat(0x1b1023, { metal: 0.5, rough: 0.3 });
  const addBox = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(GH3D.roundedBox(w, h, d, 0.08), m || frameMat); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; scene.add(b); return b; };
  addBox(0.5, ROWS + 1, 1.4, -COLS / 2 - 0.25, ROWS / 2 - 0.25, 0);
  addBox(0.5, ROWS + 1, 1.4, COLS / 2 + 0.25, ROWS / 2 - 0.25, 0);
  addBox(COLS + 1, 0.5, 1.4, 0, -0.25, 0);
  const neon = GH3D.neon(0xe254d6);
  [[-COLS / 2 - 0.02, ROWS / 2, 0.05, ROWS], [COLS / 2 + 0.02, ROWS / 2, 0.05, ROWS]].forEach(([x, y, w, h]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), neon); m.position.set(x, y, 0.72); scene.add(m);
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.35 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.5; floor.receiveShadow = true;
  scene.add(floor);

  /* ---------- Blöcke ---------- */
  const blockGeo = GH3D.roundedBox(0.92, 0.92, 0.92, 0.14, 2);
  const blocks = new THREE.InstancedMesh(blockGeo, GH3D.mat(0xffffff, { rough: 0.32, clearcoat: 0.6, env: 0.55 }), COLS * ROWS + 8);
  blocks.castShadow = blocks.receiveShadow = true;
  blocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(blocks);
  // Damit das Leuchten die Farbe des Blocks hat, tönen wir per instanceColor (wirkt auf color; emissive weiß gering)
  const ghost = new THREE.InstancedMesh(blockGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }), 8);
  scene.add(ghost);
  const nextMesh = new THREE.InstancedMesh(blockGeo, blocks.material, 8);
  nextMesh.castShadow = true;
  const nextGroup = new THREE.Group();
  nextGroup.add(nextMesh);
  scene.add(nextGroup);
  // Farbpuffer sofort anlegen (sonst wird der Shader ohne Instanzfarben kompiliert)
  [blocks, ghost, nextMesh].forEach((m) => { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(m.instanceMatrix.count * 3).fill(1), 3); });
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  const colorCache = COLORS.map((c) => (c ? GH3D.lin(c) : null));

  function setBlock(mesh, i, x, y, c, scale) {
    dummy.position.set(x, y, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(scale || 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (c != null) mesh.setColorAt(i, colorCache[c]);
  }

  let clearFx = []; // { y, t }
  function render(t) {
    let i = 0;
    game.arena.forEach((row, y) => row.forEach((v, x) => { if (v) setBlock(blocks, i++, wx(x), wy(y), v); }));
    let gi = 0;
    if (game.piece && game.running) {
      const p = game.piece, gy = game.ghostY();
      p.matrix.forEach((r, y) => r.forEach((v, x) => {
        if (!v) return;
        if (y + p.pos.y >= 0) setBlock(blocks, i++, wx(x + p.pos.x), wy(y + p.pos.y), v);
        if (y + gy >= 0 && gi < 8) { setBlock(ghost, gi, wx(x + p.pos.x), wy(y + gy), null); ghost.setColorAt(gi++, colorCache[v]); }
      }));
    }
    blocks.count = i; ghost.count = gi;
    blocks.instanceMatrix.needsUpdate = true; ghost.instanceMatrix.needsUpdate = true;
    if (blocks.instanceColor) blocks.instanceColor.needsUpdate = true;
    if (ghost.instanceColor) ghost.instanceColor.needsUpdate = true;

    // Nächster Stein (dreht sich langsam)
    let ni = 0;
    if (game.next) {
      const m = game.next;
      let minX = 9, maxX = -1, minY = 9, maxY = -1;
      m.forEach((r, y) => r.forEach((v, x) => { if (v) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); } }));
      const ox = (minX + maxX) / 2, oy = (minY + maxY) / 2;
      m.forEach((r, y) => r.forEach((v, x) => { if (v) setBlock(nextMesh, ni++, (x - ox) * 0.7, -(y - oy) * 0.7, v, 0.7); }));
    }
    nextMesh.count = ni;
    nextMesh.instanceMatrix.needsUpdate = true;
    if (nextMesh.instanceColor) nextMesh.instanceColor.needsUpdate = true;
    const aspect = innerWidth / innerHeight;
    nextGroup.position.set(aspect < 1 ? COLS / 2 - 1.2 : COLS / 2 + 3.2, aspect < 1 ? ROWS + 1.6 : ROWS - 4, aspect < 1 ? 1.5 : 0);
    nextGroup.rotation.y = Math.sin(t * 0.8) * 0.5;
    nextGroup.visible = game.running;
  }

  /* ---------- HUD & Modi ---------- */
  const fmtTime = (ms) => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  function bestText() {
    if (!window.GHStats) return "–";
    if (mode === "sprint") { const b = GHStats.progress(ID, "sprint"); return b ? (b / 1000).toFixed(2).replace(".", ",") + " s" : "–"; }
    if (mode === "ultra") return (GHStats.progress(ID, "ultra") || 0).toLocaleString("de-DE");
    return (GHStats.best(ID) || 0).toLocaleString("de-DE");
  }
  function hud() {
    $("score").textContent = game.score.toLocaleString("de-DE");
    $("lines").textContent = mode === "sprint" ? game.lines + "/40" : game.lines;
    $("level").textContent = game.level;
    const m = MODES[mode];
    $("timeLabel").textContent = m.time ? "Restzeit" : "Zeit";
    $("time").textContent = fmtTime(m.time ? Math.max(0, m.time - game.elapsed) : game.elapsed);
    $("modeName").textContent = m.name;
    $("best").textContent = bestText();
  }
  function buildModes() {
    $("modes").innerHTML = Object.keys(MODES).map((k) => '<button class="gh-btn' + (k === mode ? " gh-btn-white" : "") + '" data-mode="' + k + '">' + MODES[k].name + "</button>").join("");
    $("ovText").textContent = MODES[mode].desc;
    hud();
  }
  $("modes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]"); if (!b) return;
    mode = b.dataset.mode; localStorage.setItem("tetris3d_mode", mode); buildModes();
  });
  function start() { game.start(mode); $("overlay").hidden = true; hud(); }
  $("btnStart").onclick = () => { if (game.paused) game.togglePause(); else start(); };

  game.on("change", hud);
  game.on("harddrop", () => world.shake(0.18));
  game.on("clear", (d) => {
    d.rows.forEach((y, k) => {
      for (let x = 0; x < COLS; x += 2) world.burst(new THREE.Vector3(wx(x), wy(y - k * 0) , 0.5), 0xffffff, 3, 3);
    });
    if (d.count >= 4) world.shake(0.35);
  });
  game.on("pause", (p) => {
    $("ovTitle").textContent = "Pause"; $("ovText").textContent = "Drücke P, um weiterzuspielen.";
    $("modes").style.display = "none"; $("btnStart").textContent = "Weiter";
    $("overlay").hidden = !p;
  });
  game.on("over", (r) => {
    const text = game.saveResult(ID);
    world.shake(0.3);
    $("ovTitle").textContent = r.won ? (mode === "sprint" ? "Sprint geschafft!" : "Zeit abgelaufen!") : "Spiel vorbei";
    $("modes").style.display = "";
    buildModes();
    $("ovText").textContent = text;
    $("btnStart").textContent = "Nochmal spielen";
    $("overlay").hidden = false;
  });

  addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(e.key)) e.preventDefault();
    if (!game.running) { if (e.key === "Enter" || e.key === " ") start(); return; }
    const k = e.key.toLowerCase();
    if (k === "p" || k === "escape") return game.togglePause();
    if (e.key === "ArrowLeft") game.move(-1);
    else if (e.key === "ArrowRight") game.move(1);
    else if (e.key === "ArrowDown") game.softDrop();
    else if (e.key === "ArrowUp" || k === "x") game.rotate(1);
    else if (k === "z" || k === "y") game.rotate(-1);
    else if (e.key === " ") game.hardDrop();
  });
  GHTouch.dpad({ left: "ArrowLeft", right: "ArrowRight", down: "ArrowDown" }, { side: "left", repeat: true });
  GHTouch.buttons([{ label: "II", key: "p" }, { label: "⤓", key: " " }, { label: "↻", key: "ArrowUp", big: true }], { side: "right" });
  GHTouch.swipe($("scene"), { left: "ArrowLeft", right: "ArrowRight", down: " ", up: "ArrowUp", tap: "ArrowUp" });

  world.onUpdate((dt, t) => {
    game.update(dt * 1000);
    if (game.running && !game.paused) hud();
    render(t);
  });

  fitCamera();
  buildModes();
  world.start();
  GH3D.ready();
})();
