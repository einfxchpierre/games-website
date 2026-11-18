/* ==========================================================================
   Minesweeper 3D – GAMEHUB
   ========================================================================== */
(function () {
  "use strict";
  const ID = "minesweeper-3d";
  const DIFFS = {
    easy:   { name: "Anfänger", rows: 9,  cols: 9,  mines: 10 },
    medium: { name: "Normal",   rows: 13, cols: 15, mines: 40 },
    hard:   { name: "Profi",    rows: 16, cols: 30, mines: 99 },
    expert: { name: "Experte",  rows: 20, cols: 30, mines: 145 }
  };
  const NUM_COLORS = [null, "#38bdf8", "#3ddc97", "#ff5470", "#9b5cf6", "#ffc857", "#22d3ee", "#e254d6", "#f6f2f9"];
  const $ = (id) => document.getElementById(id);

  let diff = localStorage.getItem("ms3d_diff") || "easy";
  let cells = [], rows = 0, cols = 0, first = true, over = false, started = 0, elapsed = 0, timer = null, tool = "dig", flags = 0;

  const world = GH3D.create({
    container: $("scene"),
    camera: { fov: 40, pos: [0, 14, 9], target: [0, 0, 0] },
    orbit: { minDistance: 6, maxDistance: 70, maxPolarAngle: 1.25, mouseButtons: { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }, touches: { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE } },
    shadowBox: 18,
    onResize: fit
  });
  const { scene, camera, controls } = world;

  function fit() {
    if (!cols) return;
    const aspect = innerWidth / innerHeight;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const dist = Math.max((cols / 2 + 1) / Math.tan(hfov / 2), (rows / 2 + 2) / Math.tan(vfov / 2));
    const tilt = aspect < 1 ? 0.15 : 0.5;
    camera.position.set(0, dist * Math.cos(Math.atan(tilt)), dist * Math.sin(Math.atan(tilt)));
    controls.target.set(0, 0, 0.3);
  }

  /* ---------- Bausteine ---------- */
  const tileGeo = GH3D.roundedBox(0.9, 0.3, 0.9, 0.08, 2);
  const tileMat = GH3D.mat(0x3a2445, { rough: 0.45, clearcoat: 0.35, env: 0.55 });
  const tileHover = GH3D.mat(0x5a3a6a, { rough: 0.3, glow: 0.15, emissive: 0xe254d6 });
  const baseMat = GH3D.mat(0x0d0712, { rough: 0.7, clearcoat: 0.2, env: 0.3 });
  const numTex = NUM_COLORS.map((c, i) => (c ? GH3D.textTexture(String(i), c) : null));
  const numGeo = new THREE.PlaneGeometry(0.8, 0.8);
  const mineMat = GH3D.mat(0x1b1023, { metal: 0.6, rough: 0.25 });
  const flagMat = GH3D.mat(0xe254d6, { glow: 0.6 });
  const poleMat = GH3D.mat(0xf6f2f9, { rough: 0.3 });
  const boardGroup = new THREE.Group();
  scene.add(boardGroup);
  const wx = (c) => c - (cols - 1) / 2, wz = (r) => r - (rows - 1) / 2;

  function mineMesh() {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), mineMat);
    g.add(core);
    const spikeGeo = new THREE.ConeGeometry(0.05, 0.18, 8);
    [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0], [0, 0.7, 0.7], [0, 0.7, -0.7]].forEach((v) => {
      const s = new THREE.Mesh(spikeGeo, mineMat);
      const dir = new THREE.Vector3(...v).normalize();
      s.position.copy(dir.clone().multiplyScalar(0.25));
      s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.add(s);
    });
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), GH3D.neon(0xff5470));
    light.position.set(0.1, 0.18, 0.12);
    g.add(light, GH3D.glow(0xff5470, 1.2, 0.6));
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    return g;
  }
  function flagMesh() {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8), poleMat);
    pole.position.y = 0.3;
    const cloth = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 3), flagMat);
    cloth.rotation.z = -Math.PI / 2; cloth.position.set(0.15, 0.48, 0);
    g.add(pole, cloth, GH3D.glow(0xe254d6, 0.8, 0.5));
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    return g;
  }

  /* ---------- Spielfeld ---------- */
  function newGame() {
    const D = DIFFS[diff];
    rows = D.rows; cols = D.cols;
    while (boardGroup.children.length) boardGroup.remove(boardGroup.children[0]);
    const base = new THREE.Mesh(GH3D.roundedBox(cols + 0.6, 0.3, rows + 0.6, 0.12), baseMat);
    base.position.y = -0.2; base.receiveShadow = true;
    boardGroup.add(base);
    cells = [];
    for (let r = 0; r < rows; r++) {
      cells.push([]);
      for (let c = 0; c < cols; c++) {
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.set(wx(c), 0.15, wz(r));
        tile.castShadow = tile.receiveShadow = true;
        tile.userData = { r, c };
        boardGroup.add(tile);
        cells[r].push({ r, c, mine: false, open: false, flag: false, n: 0, tile, flagObj: null, anim: 0 });
      }
    }
    first = true; over = false; elapsed = 0; flags = 0;
    clearInterval(timer); timer = null;
    hud();
    fit();
  }
  function placeMines(sr, sc) {
    const D = DIFFS[diff];
    let placed = 0;
    while (placed < D.mines) {
      const r = Math.floor(Math.random() * rows), c = Math.floor(Math.random() * cols);
      if (cells[r][c].mine || (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1)) continue;
      cells[r][c].mine = true; placed++;
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells[r][c].n = neighbors(r, c).filter((x) => x.mine).length;
  }
  function neighbors(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(cells[nr][nc]);
    }
    return out;
  }

  function reveal(cell) {
    if (over || cell.open || cell.flag) return;
    if (first) {
      first = false; placeMines(cell.r, cell.c);
      started = Date.now();
      timer = setInterval(() => { elapsed = Math.floor((Date.now() - started) / 1000); hud(); }, 250);
    }
    if (cell.mine) return lose(cell);
    // Flutfüllung
    const stack = [cell];
    let wave = 0;
    while (stack.length) {
      const x = stack.pop();
      if (x.open || x.flag) continue;
      x.open = true;
      x.anim = -(Math.abs(x.r - cell.r) + Math.abs(x.c - cell.c)) * 0.03; // Welle
      if (x.n === 0) neighbors(x.r, x.c).forEach((nb) => { if (!nb.open && !nb.mine) stack.push(nb); });
      wave++;
    }
    checkWin();
  }
  function showNumber(cell) {
    if (cell.n > 0) {
      const m = new THREE.Mesh(numGeo, new THREE.MeshBasicMaterial({ map: numTex[cell.n], transparent: true, toneMapped: false, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(wx(cell.c), 0.02, wz(cell.r));
      boardGroup.add(m);
    }
  }
  function toggleFlag(cell) {
    if (over || cell.open) return;
    cell.flag = !cell.flag;
    if (cell.flag) {
      cell.flagObj = flagMesh();
      cell.flagObj.position.set(wx(cell.c), 0.3, wz(cell.r));
      cell.flagObj.scale.setScalar(0.01);
      boardGroup.add(cell.flagObj);
      flags++;
    } else { boardGroup.remove(cell.flagObj); cell.flagObj = null; flags--; }
    if (navigator.vibrate) navigator.vibrate(12);
    hud();
  }
  function lose(cell) {
    over = true;
    clearInterval(timer);
    cell.open = true; cell.anim = 0;
    world.shake(0.5);
    world.burst(new THREE.Vector3(wx(cell.c), 0.4, wz(cell.r)), 0xff5470, 50, 5);
    let k = 0;
    cells.flat().filter((x) => x.mine).forEach((x) => {
      setTimeout(() => {
        x.open = true; x.anim = 0;
        const m = mineMesh(); m.position.set(wx(x.c), 0.25, wz(x.r)); boardGroup.add(m);
        if (x.flagObj) { boardGroup.remove(x.flagObj); x.flagObj = null; }
      }, (k++) * 25);
    });
    setTimeout(() => showResult(false), 900);
  }
  function checkWin() {
    if (cells.flat().some((x) => !x.mine && !x.open)) return;
    over = true;
    clearInterval(timer);
    elapsed = Math.floor((Date.now() - started) / 1000);
    cells.flat().filter((x) => x.mine && !x.flag).forEach(toggleFlag);
    world.burst(new THREE.Vector3(0, 1, 0), 0x3ddc97, 80, 6);
    setTimeout(() => showResult(true), 800);
  }
  function showResult(won) {
    let note = "";
    if (won && window.GHStats) {
      GHStats.record(ID, elapsed, { lowerIsBetter: true });
      const k = "best_" + diff, prev = GHStats.progress(ID, k);
      if (prev == null || elapsed < prev) { GHStats.progress(ID, k, elapsed); note = " Neue Bestzeit!"; }
    }
    $("ovTitle").textContent = won ? "Gewonnen!" : "Boom!";
    $("ovText").textContent = won ? "Gelöst in " + elapsed + " Sekunden." + note : "Du hast eine Mine erwischt.";
    $("btnStart").textContent = "Nochmal spielen";
    buildDiffs();
    $("overlay").hidden = false;
    hud();
  }

  /* ---------- HUD & Menü ---------- */
  function hud() {
    $("diffName").textContent = DIFFS[diff].name;
    $("mines").textContent = DIFFS[diff].mines - flags;
    $("time").textContent = elapsed + " s";
    const b = window.GHStats && GHStats.progress(ID, "best_" + diff);
    $("best").textContent = b != null ? b + " s" : "–";
  }
  function buildDiffs() {
    $("diffs").innerHTML = Object.keys(DIFFS).map((k) => '<button class="gh-btn' + (k === diff ? " gh-btn-white" : "") + '" data-d="' + k + '">' + DIFFS[k].name + "</button>").join("");
  }
  $("diffs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-d]"); if (!b) return;
    diff = b.dataset.d; localStorage.setItem("ms3d_diff", diff); buildDiffs(); newGame();
  });
  $("btnStart").onclick = () => { $("overlay").hidden = true; newGame(); };
  $("btnMenu").onclick = () => { $("ovTitle").textContent = "Minesweeper 3D"; $("ovText").textContent = "Wähle eine Schwierigkeit."; $("btnStart").textContent = "Spiel starten"; buildDiffs(); $("overlay").hidden = false; };
  const setTool = (t) => { tool = t; $("toolDig").classList.toggle("on", t === "dig"); $("toolFlag").classList.toggle("on", t === "flag"); };
  $("toolDig").onclick = () => setTool("dig");
  $("toolFlag").onclick = () => setTool("flag");

  /* ---------- Eingabe ---------- */
  const el = world.renderer.domElement;
  let down = null, lp = null, hovered = null;
  function cellAt(e) {
    const hits = world.ray(e.clientX, e.clientY).intersectObjects(boardGroup.children, false);
    for (const h of hits) if (h.object.userData && h.object.userData.r != null) return cells[h.object.userData.r][h.object.userData.c];
    return null;
  }
  el.addEventListener("contextmenu", (e) => e.preventDefault());
  el.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, b: e.button, long: false };
    if (e.pointerType !== "mouse") {
      clearTimeout(lp);
      lp = setTimeout(() => { const c = cellAt(e); if (c && down) { down.long = true; toggleFlag(c); } }, 420);
    }
  });
  el.addEventListener("pointerup", (e) => {
    clearTimeout(lp);
    if (!down || down.long) { down = null; return; }
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const b = down.b; down = null;
    if (moved > 8) return;
    const c = cellAt(e); if (!c) return;
    if (b === 2 || tool === "flag") toggleFlag(c); else if (b === 0) reveal(c);
  });
  el.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) clearTimeout(lp); return; }
    const c = cellAt(e);
    if (hovered && hovered !== c && !hovered.open) hovered.tile.material = tileMat;
    hovered = c;
    if (c && !c.open && !over) { c.tile.material = tileHover; el.style.cursor = "pointer"; } else el.style.cursor = "";
  });

  /* ---------- Animation ---------- */
  world.onUpdate((dt) => {
    cells.forEach((row) => row.forEach((x) => {
      if (x.open && x.tile.visible) {
        x.anim += dt * 3.2;
        if (x.anim > 0) {
          const k = Math.min(1, x.anim);
          x.tile.rotation.x = k * Math.PI;
          x.tile.position.y = 0.15 + Math.sin(k * Math.PI) * 0.6;
          x.tile.scale.setScalar(1 - k * 0.9);
          if (k >= 1) { x.tile.visible = false; if (!x.mine) showNumber(x); }
        }
      }
      if (x.flagObj && x.flagObj.scale.x < 1) x.flagObj.scale.setScalar(Math.min(1, x.flagObj.scale.x + dt * 6));
    }));
  });

  buildDiffs();
  newGame();
  world.start();
  GH3D.ready();
})();
