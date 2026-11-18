/* ==========================================================================
   Neon Runner 3D – GAMEHUB
   Drei Spuren, hohe Blöcke ausweichen, niedrige Barrieren überspringen.
   Münzen & Power-up-Stufen werden mit der 2D-Version geteilt (localStorage).
   ========================================================================== */
(function () {
  "use strict";
  const ID = "runner-3d";
  const LANES = [-2.2, 0, 2.2];
  const ZONES = [["Magenta", 0xe254d6], ["Eis", 0x38bdf8], ["Mint", 0x3ddc97], ["Gold", 0xffc857], ["Glut", 0xff5470], ["Violett", 0x9b5cf6]];
  const POWERS = { god: { n: "Unverwundbar", c: 0xffc857, css: "#ffc857" }, mult: { n: "Doppelte Punkte", c: 0x3ddc97, css: "#3ddc97" }, mag: { n: "Magnet", c: 0x38bdf8, css: "#38bdf8" } };
  const $ = (id) => document.getElementById(id);

  let coins = parseInt(localStorage.getItem("coins")) || 0;
  const upLevels = JSON.parse(localStorage.getItem("upLevels") || "null") || { god: 5, mult: 5, mag: 5 };
  const skin = localStorage.getItem("selectedSkin") || "#e254d6";

  let running = false, paused = false, score = 0, speed = 14, lane = 1, px = 0, py = 0, vy = 0, zone = 0;
  let entities = [], spawnIn = 6, dist = 0, power = null, powerLeft = 0, powerMax = 1;

  const world = GH3D.create({
    container: $("scene"),
    camera: { fov: 60, pos: [0, 3.3, 6.5], target: [0, 1, -6] },
    sunPos: [4, 18, 8], shadowBox: 12, rim: 1.5, ambient: 0.5,
    fog: { color: 0x06020a, near: 18, far: 70 },
    onResize: fit
  });
  const { scene, camera } = world;
  world.sun.target.position.set(0, 0, -6);
  function fit() {
    const aspect = innerWidth / innerHeight;
    camera.fov = aspect < 1 ? 78 : 60;
    camera.position.set(0, aspect < 1 ? 4.2 : 3.3, aspect < 1 ? 7.5 : 6.5);
    camera.lookAt(0, 1, -6);
    camera.updateProjectionMatrix();
  }

  /* ---------- Strecke ---------- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 120), GH3D.mat(0x120a18, { rough: 0.45, clearcoat: 0.7, env: 0.4 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -50; floor.receiveShadow = true;
  scene.add(floor);
  const sideMat = GH3D.neon(0xe254d6);
  const sides = [-4.5, 4.5].map((x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 120), sideMat); m.position.set(x, 0.04, -50); scene.add(m); return m; });
  const laneMat = GH3D.neon(0xffffff, 0.08);
  [-1.1, 1.1].forEach((x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 120), laneMat); m.position.set(x, 0.01, -50); scene.add(m); });
  // Querlinien (bewegt)
  const stripes = [];
  for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(9, 0.01, 0.06), GH3D.neon(0xffffff, 0.05)); m.position.set(0, 0.012, -i * 4); scene.add(m); stripes.push(m); }
  // Tunnelbögen
  const arches = [];
  const archMat = GH3D.neon(0xe254d6, 0.9);
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group();
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6, 0.12), archMat), r = l.clone(), t = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.12, 0.12), archMat);
    l.position.set(-4.6, 3, 0); r.position.set(4.6, 3, 0); t.position.set(0, 6, 0);
    g.add(l, r, t);
    g.position.z = -i * 10;
    scene.add(g);
    arches.push(g);
  }
  // Sterne
  const sg = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 500; i++) sp.push((Math.random() - 0.5) * 120, Math.random() * 40 + 8, -20 - Math.random() * 60);
  sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xf6f2f9, size: 0.25 })));

  /* ---------- Spieler ---------- */
  const player = new THREE.Group();
  const pBody = new THREE.Mesh(GH3D.roundedBox(0.9, 1.3, 0.9, 0.28), GH3D.mat(skin, { glow: 0.5, rough: 0.2 }));
  pBody.position.y = 0.65; pBody.castShadow = true;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.05), GH3D.neon(0xffffff));
  visor.position.set(0, 1.0, -0.46);
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1.05, 32, 16), new THREE.MeshBasicMaterial({ color: GH3D.lin(0xffc857), transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false }));
  shield.position.y = 0.65; shield.visible = false;
  player.add(pBody, visor, shield, GH3D.glow(skin, 2.6, 0.4));
  const pLight = new THREE.PointLight(new THREE.Color(skin), 6, 6, 2);
  pLight.position.y = 1.2;
  player.add(pLight);
  scene.add(player);

  /* ---------- Objekte ---------- */
  const tallGeo = GH3D.roundedBox(1.6, 2.2, 1.0, 0.18), lowGeo = GH3D.roundedBox(1.8, 0.55, 0.5, 0.12);
  const obstMat = GH3D.mat(0xff5470, { glow: 0.35, rough: 0.25 }), lowMat = GH3D.mat(0xff8e3c, { glow: 0.4, rough: 0.25 });
  const coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 32), coinMat = GH3D.mat(0xffc857, { glow: 0.6, metal: 0.6, rough: 0.2 });
  const powGeo = new THREE.IcosahedronGeometry(0.38, 1);

  function spawnRow() {
    const r = Math.random();
    const z = -70;
    if (r < 0.62) {
      // Hindernisreihe: 1–2 Spuren blockiert, mindestens eine frei oder niedrig
      const blocked = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, Math.random() < 0.45 ? 2 : 1);
      blocked.forEach((l) => add(Math.random() < (score > 10 ? 0.35 : 0.2) ? "low" : "tall", l, z));
      // Münzen in einer freien Spur
      const free = [0, 1, 2].filter((l) => !blocked.includes(l));
      if (free.length && Math.random() < 0.6) { const l = free[Math.floor(Math.random() * free.length)]; for (let k = 0; k < 4; k++) add("coin", l, z - 2 - k * 1.6); }
    } else if (r < 0.9) {
      const l = Math.floor(Math.random() * 3);
      for (let k = 0; k < 6; k++) add("coin", l, z - k * 1.6);
    } else {
      add("p_" + ["god", "mult", "mag"][Math.floor(Math.random() * 3)], Math.floor(Math.random() * 3), z);
    }
  }
  function add(type, l, z) {
    let m;
    if (type === "tall") { m = new THREE.Mesh(tallGeo, obstMat); m.position.y = 1.1; }
    else if (type === "low") { m = new THREE.Mesh(lowGeo, lowMat); m.position.y = 0.28; }
    else if (type === "coin") { m = new THREE.Mesh(coinGeo, coinMat); m.rotation.x = Math.PI / 2; m.position.y = 0.8; }
    else { const p = POWERS[type.slice(2)]; m = new THREE.Group(); const core = new THREE.Mesh(powGeo, GH3D.mat(p.c, { glow: 0.9, rough: 0.15 })); m.add(core, GH3D.glow(p.c, 2, 0.6)); m.position.y = 0.9; }
    m.position.x = LANES[l]; m.position.z = z;
    m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(m);
    entities.push({ type, lane: l, m });
  }

  /* ---------- Steuerung ---------- */
  function move(d) { if (running && !paused) lane = Math.max(0, Math.min(2, lane + d)); }
  function jump() { if (running && !paused && py <= 0.001) vy = 9.5; }
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", " "].includes(k)) e.preventDefault();
    if (!running) { if (k === "enter" || k === " ") start(); return; }
    if (k === "arrowleft" || k === "a") move(-1);
    else if (k === "arrowright" || k === "d") move(1);
    else if (k === "arrowup" || k === "w" || k === " ") jump();
    else if (k === "p" || k === "escape") togglePause();
  });
  if (window.GH_TOUCH) GHTouch.swipe($("scene"), { left: () => move(-1), right: () => move(1), up: jump, tap: jump }, { min: 22 });
  else $("scene").addEventListener("pointerdown", (e) => { if (e.button === 0) move(e.clientX < innerWidth / 2 ? -1 : 1); });

  function togglePause() {
    paused = !paused;
    $("ovTitle").textContent = "Pause"; $("ovText").textContent = "Drücke P, um weiterzulaufen.";
    $("btnStart").textContent = "Weiter";
    $("overlay").hidden = !paused;
  }
  $("btnStart").onclick = () => { if (paused) togglePause(); else start(); };

  /* ---------- Ablauf ---------- */
  const best = () => (window.GHStats && GHStats.best(ID)) || 0;
  function hud() {
    $("score").textContent = score;
    $("coins").textContent = coins;
    $("zoneNo").textContent = zone + 1;
    $("best").textContent = best();
  }
  function setZoneColor() {
    const c = GH3D.lin(ZONES[zone % ZONES.length][1]);
    sideMat.color.copy(c); archMat.color.copy(c);
    const z = $("zone");
    z.textContent = "Zone " + (zone + 1) + " · " + ZONES[zone % ZONES.length][0];
    z.style.color = "#" + new THREE.Color(ZONES[zone % ZONES.length][1]).getHexString();
    z.classList.add("show");
    clearTimeout(setZoneColor.t);
    setZoneColor.t = setTimeout(() => z.classList.remove("show"), 1600);
  }
  function start() {
    entities.forEach((e) => scene.remove(e.m));
    entities = []; score = 0; speed = 14; lane = 1; px = 0; py = 0; vy = 0; zone = 0; spawnIn = 4; power = null;
    $("power").style.display = "none"; shield.visible = false;
    $("overlay").hidden = true;
    running = true; paused = false;
    setZoneColor();
    hud();
  }
  function crash() {
    running = false;
    world.shake(0.5);
    world.burst(player.position.clone().setY(0.8), 0xff5470, 50, 6);
    localStorage.setItem("coins", coins);
    const prev = best();
    if (window.GHStats) GHStats.record(ID, score);
    setTimeout(() => {
      $("ovTitle").textContent = score > prev && score > 0 ? "Neuer Rekord!" : "Crash!";
      $("ovText").textContent = score + " Punkte · Zone " + (zone + 1) + " · Bestwert " + best();
      $("btnStart").textContent = "Nochmal";
      $("overlay").hidden = false;
      hud();
    }, 700);
  }

  world.onUpdate((dt, t) => {
    const active = running && !paused;
    const v = active ? speed : (running ? 0 : 5);
    dist += v * dt;
    // Kulisse bewegen
    stripes.forEach((s) => { s.position.z += v * dt; if (s.position.z > 6) s.position.z -= 120; });
    arches.forEach((a) => { a.position.z += v * dt; if (a.position.z > 8) a.position.z -= 120; });
    // Spieler
    px += (LANES[lane] - px) * Math.min(1, dt * 14);
    vy -= 26 * dt; py = Math.max(0, py + vy * dt); if (py === 0) vy = Math.max(vy, 0);
    player.position.set(px, py, 0);
    player.rotation.z = (LANES[lane] - px) * -0.12;
    pBody.scale.y = 1 + (py > 0 ? 0.08 : Math.sin(t * 18) * 0.03);
    if (!active) return;

    speed = Math.min(40, speed + dt * 0.25);
    spawnIn -= v * dt;
    if (spawnIn <= 0) { spawnRow(); spawnIn = Math.max(9, 18 - speed * 0.2); }

    if (power) {
      powerLeft -= dt;
      $("powerBar").style.width = (powerLeft / powerMax) * 100 + "%";
      if (powerLeft <= 0) { power = null; $("power").style.display = "none"; shield.visible = false; }
    }
    if (shield.visible) shield.material.opacity = 0.12 + Math.sin(t * 10) * 0.06;

    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i];
      e.m.position.z += v * dt;
      if (e.type === "coin") {
        e.m.rotation.z += dt * 4;
        if (power === "mag" && e.m.position.z > -14) e.m.position.x += (px - e.m.position.x) * Math.min(1, dt * 6);
      } else if (e.type.startsWith("p_")) e.m.rotation.y += dt * 2;
      const dz = Math.abs(e.m.position.z);
      const dx = Math.abs(e.m.position.x - px);
      if (dz < 0.7 && dx < 0.9) {
        if (e.type === "tall" && power !== "god") return crash();
        if (e.type === "low" && py < 0.55 && power !== "god") return crash();
        if (e.type === "coin") { coins += power === "mult" ? 2 : 1; world.burst(e.m.position.clone(), 0xffc857, 6, 2); scene.remove(e.m); entities.splice(i, 1); hud(); continue; }
        if (e.type.startsWith("p_")) {
          power = e.type.slice(2); powerMax = powerLeft = upLevels[power] || 5;
          $("power").style.display = "block"; $("powerName").textContent = POWERS[power].n; $("powerName").style.color = POWERS[power].css;
          $("powerBar").style.background = POWERS[power].css;
          shield.visible = power === "god";
          world.burst(e.m.position.clone(), POWERS[power].c, 24, 3);
          scene.remove(e.m); entities.splice(i, 1);
          continue;
        }
      }
      if (e.m.position.z > 4) {
        if (e.type === "tall" || e.type === "low") {
          score += power === "mult" ? 2 : 1;
          const z = Math.floor(score / 25);
          if (z !== zone) { zone = z; setZoneColor(); }
          hud();
        }
        scene.remove(e.m); entities.splice(i, 1);
      }
    }
    if (Math.floor(t) % 3 === 0) localStorage.setItem("coins", coins);
  });

  hud();
  fit();
  world.start();
  GH3D.ready();
})();
