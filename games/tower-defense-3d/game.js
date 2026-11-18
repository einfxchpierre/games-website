/* ==========================================================================
   GAMEHUB · Tower Defense 3D
   three.js r128 · PBR-Materialien, Umgebungsreflexionen, ACES-Tone-Mapping,
   weiche Schatten, additive Glow-Sprites
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Spielfeld ---------- */
  const COLS = 22, ROWS = 13;
  // Wegpunkte in Feldkoordinaten (Spalte, Zeile); Start außerhalb links
  // Karten (Wegpunkte in Feldkoordinaten, Start außerhalb links) und Schwierigkeitsstufen
  const MAPS = [
    { name: "Serpentine",     pts: [[-2, 6], [4, 6], [4, 2], [10, 2], [10, 10], [16, 10], [16, 4], [21, 4]] },
    { name: "Doppelschleife", pts: [[-2, 2], [6, 2], [6, 10], [12, 10], [12, 2], [18, 2], [18, 10], [21, 10]] },
    { name: "Spirale",        pts: [[-2, 11], [19, 11], [19, 1], [2, 1], [2, 8], [15, 8], [15, 4], [8, 4]] }
  ];
  const DIFFS = {
    easy:   { name: "Leicht", hp: 0.75, gold: 280, lives: 25 },
    normal: { name: "Normal", hp: 1,    gold: 220, lives: 20 },
    hard:   { name: "Schwer", hp: 1.35, gold: 180, lives: 12 }
  };
  const MAP_INDEX = Math.min(MAPS.length - 1, +(localStorage.getItem("td3d_map") || 0));
  const DIFF = DIFFS[localStorage.getItem("td3d_diff")] ? localStorage.getItem("td3d_diff") : "normal";
  const WAYPOINTS = MAPS[MAP_INDEX].pts;

  const TOWERS = {
    basic:  { name: "Turm",   cost: 50,  range: 3.2, rate: 0.55, dmg: 22, color: 0xe254d6, css: "#e254d6", desc: "schnell, solide" },
    sniper: { name: "Sniper", cost: 100, range: 6.5, rate: 1.6,  dmg: 95, color: 0x6366f1, css: "#6366f1", desc: "weit, hoher Schaden" },
    frost:  { name: "Frost",  cost: 75,  range: 2.6, rate: 1.0,  dmg: 7,  color: 0x38bdf8, css: "#38bdf8", desc: "verlangsamt", slow: 0.45, slowTime: 1.4 }
  };
  const ENEMIES = {
    normal: { hp: 1,    speed: 1.6,  reward: 12,  color: 0xff5470, r: 0.3,  damage: 1 },
    fast:   { hp: 0.55, speed: 2.7,  reward: 9,   color: 0xff8e3c, r: 0.24, damage: 1 },
    tank:   { hp: 3.4,  speed: 1.05, reward: 32,  color: 0xb146e6, r: 0.42, damage: 2 },
    boss:   { hp: 14,   speed: 0.85, reward: 160, color: 0xff3d5e, r: 0.62, damage: 6 }
  };
  const MAX_LEVEL = 3;

  /* ---------- Zustand ---------- */
  const S = {
    gold: DIFFS[DIFF].gold, lives: DIFFS[DIFF].lives, wave: 0, speed: 1, paused: false, over: false, started: false,
    phase: "build", countdown: 0, spawnQueue: [], spawnTimer: 0,
    build: "basic", selected: null, kills: 0
  };
  const enemies = [], towers = [], projectiles = [], effects = [], particles = [];
  const towerAt = {};
  const pathSet = new Set();

  /* ---------- Hilfen ---------- */
  const $ = (id) => document.getElementById(id);
  const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const key = (c, r) => c + "," + r;
  const wx = (c) => c - (COLS - 1) / 2;
  const wz = (r) => r - (ROWS - 1) / 2;

  let scene, camera, renderer, controls, glowTex;
  const clock = new THREE.Clock();
  let time = 0;

  /* ==========================================================================
     Szene
     ========================================================================== */
  function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
    camera.position.set(0, 19.5, 15);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    $("scene").appendChild(renderer.domElement);

    scene.environment = buildEnvironment();
    glowTex = makeGlowTexture();

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0.6);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 10;
    controls.maxDistance = 34;
    controls.maxPolarAngle = 1.2;
    controls.minPolarAngle = 0.25;

    // Licht
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a0d41, 0.45));
    const sun = new THREE.DirectionalLight(0xfff1e6, 3.0);
    sun.position.set(8, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 12, bottom: -12, near: 1, far: 60 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xe254d6, 2.2);
    rim.position.set(-14, 8, -12);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0x9cc3ff, 0.6);
    fill.position.set(14, 6, -6);
    scene.add(fill);

    buildBoard();
    buildPath();
    buildPortalAndBase();
    createHoverMarker();

    addEventListener("resize", onResize);
    fitCamera();
    setupInput();
    setupUI();
    updateHUD();

    const l = $("loading");
    l.style.opacity = 0;
    setTimeout(() => l.remove(), 500);
    animate();
  }

  function buildEnvironment() {
    const env = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.BoxGeometry(40, 18, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.03, 0.015, 0.04), side: THREE.BackSide }));
    room.position.y = 7;
    env.add(room);
    const panel = (w, h, color, pos, rot) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      m.position.set(...pos);
      m.rotation.set(...rot);
      env.add(m);
    };
    panel(18, 8, new THREE.Color(5.5, 5.2, 5), [0, 15.5, 0], [Math.PI / 2, 0, 0]);
    panel(8, 8, new THREE.Color(3.5, 0.9, 3.2), [-19.5, 6, -4], [0, Math.PI / 2, 0]);
    panel(8, 8, new THREE.Color(1.2, 1.8, 3.2), [19.5, 6, 4], [0, -Math.PI / 2, 0]);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const tex = pmrem.fromScene(env, 0.04).texture;
    pmrem.dispose();
    return tex;
  }

  function makeGlowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.25, "rgba(255,255,255,0.55)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function glow(color, size, opacity) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: lin(color), transparent: true, opacity: opacity == null ? 0.9 : opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    s.scale.set(size, size, 1);
    return s;
  }

  const glowMat = (color) => new THREE.MeshBasicMaterial({ color: lin(color), toneMapped: false });

  function buildBoard() {
    // Bodenplatte
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(COLS + 0.8, 0.5, ROWS + 0.8),
      new THREE.MeshPhysicalMaterial({ color: lin(0x0d0612), roughness: 0.8, metalness: 0.05, clearcoat: 0.2, clearcoatRoughness: 0.6, envMapIntensity: 0.25 })
    );
    slab.position.y = -0.25;
    slab.receiveShadow = true;
    scene.add(slab);

    // Rand mit leuchtender Kante
    const edgeM = glowMat(0xe254d6);
    const w = COLS + 0.8, d = ROWS + 0.8, t = 0.035;
    [[0, -d / 2, w, t], [0, d / 2, w, t], [-w / 2, 0, t, d], [w / 2, 0, t, d]].forEach(([x, z, sx, sz]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.02, sz), edgeM);
      m.position.set(x, 0.005, z);
      scene.add(m);
    });

    // Raster
    const pts = [];
    for (let c = 0; c <= COLS; c++) { const x = c - COLS / 2; pts.push(x, 0.003, -ROWS / 2, x, 0.003, ROWS / 2); }
    for (let r = 0; r <= ROWS; r++) { const z = r - ROWS / 2; pts.push(-COLS / 2, 0.003, z, COLS / 2, 0.003, z); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: lin(0xe254d6), transparent: true, opacity: 0.09, toneMapped: false })));

    // Schattenfänger
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: 0.3 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  /* ---------- Weg ---------- */
  let pathWorld = [];
  function buildPath() {
    // Felder des Weges sammeln
    for (let i = 0; i < WAYPOINTS.length - 1; i++) {
      const [c1, r1] = WAYPOINTS[i], [c2, r2] = WAYPOINTS[i + 1];
      const dc = Math.sign(c2 - c1), dr = Math.sign(r2 - r1);
      let c = c1, r = r1;
      while (true) {
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS) pathSet.add(key(c, r));
        if (c === c2 && r === r2) break;
        c += dc; r += dr;
      }
    }
    pathWorld = WAYPOINTS.map(([c, r]) => new THREE.Vector3(wx(c), 0.12, wz(r)));

    const tileGeo = new THREE.BoxGeometry(1, 0.1, 1);
    const tileMat = new THREE.MeshPhysicalMaterial({ color: lin(0x261732), roughness: 0.45, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 0.6 });
    const edgeGeoH = new THREE.BoxGeometry(1, 0.025, 0.04);
    const edgeGeoV = new THREE.BoxGeometry(0.04, 0.025, 1);
    const edgeMat = glowMat(0xe254d6);
    pathSet.forEach((k) => {
      const [c, r] = k.split(",").map(Number);
      const tile = new THREE.Mesh(tileGeo, tileMat);
      tile.position.set(wx(c), 0.05, wz(r));
      tile.receiveShadow = true;
      scene.add(tile);
      // Leuchtkanten zu Nicht-Weg-Feldern
      const side = (dc, dr) => !pathSet.has(key(c + dc, r + dr)) && !(c + dc < 0 && r + dr === WAYPOINTS[0][1]);
      if (side(0, -1)) addEdge(edgeGeoH, edgeMat, wx(c), wz(r) - 0.48);
      if (side(0, 1)) addEdge(edgeGeoH, edgeMat, wx(c), wz(r) + 0.48);
      if (side(-1, 0)) addEdge(edgeGeoV, edgeMat, wx(c) - 0.48, wz(r));
      if (side(1, 0)) addEdge(edgeGeoV, edgeMat, wx(c) + 0.48, wz(r));
    });

    // Fließende Lichtpunkte entlang des Weges
    for (let i = 0; i < 18; i++) {
      const s = glow(0xe254d6, 0.35, 0.7);
      s.userData.t = i / 18;
      flowDots.push(s);
      scene.add(s);
    }
  }
  const flowDots = [];
  function addEdge(geo, mat, x, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, 0.11, z);
    scene.add(m);
  }

  // Punkt auf dem Weg nach zurückgelegter Strecke
  let pathLength = 0;
  const segLen = [];
  function computePathLength() {
    pathLength = 0;
    for (let i = 0; i < pathWorld.length - 1; i++) {
      const l = pathWorld[i].distanceTo(pathWorld[i + 1]);
      segLen.push(l);
      pathLength += l;
    }
  }
  function pointAt(dist, out) {
    let d = dist;
    for (let i = 0; i < segLen.length; i++) {
      if (d <= segLen[i]) return out.copy(pathWorld[i]).lerp(pathWorld[i + 1], d / segLen[i]);
      d -= segLen[i];
    }
    return out.copy(pathWorld[pathWorld.length - 1]);
  }

  /* ---------- Portal & Kristall ---------- */
  let portal, crystal, crystalRing, crystalLight;
  function buildPortalAndBase() {
    computePathLength();
    const start = new THREE.Vector3(wx(-0.6), 0.75, wz(WAYPOINTS[0][1]));
    portal = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 16, 64), glowMat(0xff5470));
    portal.add(ring);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.58, 48), new THREE.MeshBasicMaterial({ color: lin(0x3a0d1a), transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    portal.add(inner);
    portal.add(glow(0xff5470, 2.6, 0.55));
    portal.position.copy(start);
    portal.rotation.y = Math.PI / 2;
    scene.add(portal);
    const pl = new THREE.PointLight(0xff5470, 6, 6, 2);
    pl.position.copy(start);
    scene.add(pl);

    const end = pathWorld[pathWorld.length - 1];
    crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.MeshPhysicalMaterial({ color: lin(0xe254d6), emissive: lin(0xe254d6), emissiveIntensity: 1.2, roughness: 0.1, metalness: 0.1, clearcoat: 1, transmission: 0 })
    );
    crystal.position.set(end.x, 1.0, end.z);
    crystal.castShadow = true;
    scene.add(crystal);
    crystal.add(glow(0xe254d6, 3.2, 0.6));
    crystalRing = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.03, 12, 64), glowMat(0xe254d6));
    crystalRing.rotation.x = Math.PI / 2;
    crystalRing.position.set(end.x, 0.25, end.z);
    scene.add(crystalRing);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.25, 48), new THREE.MeshPhysicalMaterial({ color: lin(0x1b1023), roughness: 0.3, metalness: 0.4, clearcoat: 1 }));
    pedestal.position.set(end.x, 0.12, end.z);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    scene.add(pedestal);
    crystalLight = new THREE.PointLight(0xe254d6, 8, 7, 2);
    crystalLight.position.set(end.x, 1.2, end.z);
    scene.add(crystalLight);
  }

  /* ---------- Dekoration (Pfeiler am Rand) ---------- */
  function buildDecor() {
    const mat = new THREE.MeshPhysicalMaterial({ color: lin(0x1b1023), roughness: 0.35, metalness: 0.3, clearcoat: 1 });
    const spots = [[-12.2, -7.2], [12.2, -7.2], [-12.2, 7.2], [12.2, 7.2], [0, -7.4], [0, 7.4]];
    spots.forEach(([x, z], i) => {
      const h = 0.9 + (i % 3) * 0.35;
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, 0.4), mat);
      p.position.set(x, h / 2 - 0.5, z);
      p.castShadow = true;
      scene.add(p);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), glowMat(i % 2 ? 0x38bdf8 : 0xe254d6));
      tip.position.set(x, h - 0.48, z);
      scene.add(tip);
    });
  }

  /* ==========================================================================
     Türme
     ========================================================================== */
  function towerStats(t) {
    const d = TOWERS[t.type], k = t.level - 1;
    return {
      dmg: Math.round(d.dmg * Math.pow(1.4, k)),
      range: +(d.range * (1 + 0.12 * k)).toFixed(1),
      rate: +(d.rate * Math.pow(0.88, k)).toFixed(2),
      slow: d.slow ? Math.min(0.7, d.slow + 0.08 * k) : 0
    };
  }
  const upgradeCost = (t) => Math.round(TOWERS[t.type].cost * 0.75 * t.level);
  const sellValue = (t) => Math.round(t.invested * 0.6);

  function towerMesh(type) {
    const d = TOWERS[type];
    const g = new THREE.Group();
    const dark = new THREE.MeshPhysicalMaterial({ color: lin(0x1b1023), roughness: 0.35, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.15 });
    const body = new THREE.MeshPhysicalMaterial({ color: lin(d.color), roughness: 0.25, metalness: 0.2, clearcoat: 1, emissive: lin(d.color), emissiveIntensity: 0.25 });
    const add = (geo, mat, setup, parent) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      if (setup) setup(m);
      (parent || g).add(m);
      return m;
    };
    const baseH = type === "sniper" ? 0.55 : 0.32;
    add(new THREE.CylinderGeometry(0.36, 0.44, baseH, 40), dark, (m) => (m.position.y = baseH / 2));
    add(new THREE.TorusGeometry(0.37, 0.025, 10, 48), glowMat(d.color), (m) => { m.rotation.x = Math.PI / 2; m.position.y = baseH; });

    const head = new THREE.Group();
    head.position.y = baseH + 0.2;
    g.add(head);
    if (type === "basic") {
      add(new THREE.SphereGeometry(0.25, 32, 24), body, null, head);
      add(new THREE.CylinderGeometry(0.055, 0.065, 0.55, 16), dark, (m) => { m.rotation.x = Math.PI / 2; m.position.z = 0.32; }, head);
      add(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 16), glowMat(d.color), (m) => { m.rotation.x = Math.PI / 2; m.position.z = 0.6; }, head);
    } else if (type === "sniper") {
      add(new THREE.BoxGeometry(0.32, 0.22, 0.46), body, null, head);
      add(new THREE.CylinderGeometry(0.035, 0.045, 0.95, 16), dark, (m) => { m.rotation.x = Math.PI / 2; m.position.z = 0.65; }, head);
      add(new THREE.BoxGeometry(0.08, 0.08, 0.2), glowMat(d.color), (m) => { m.position.set(0, 0.15, 0.02); }, head);
    } else {
      const crystal = add(new THREE.IcosahedronGeometry(0.24, 0), new THREE.MeshPhysicalMaterial({ color: lin(d.color), emissive: lin(d.color), emissiveIntensity: 0.9, roughness: 0.1, clearcoat: 1 }), (m) => (m.position.y = 0.1), head);
      crystal.userData.spin = true;
      head.add(glow(d.color, 1.3, 0.5));
    }
    g.userData.head = head;
    g.userData.baseH = baseH;
    g.userData.size = 1.18;
    g.userData.pips = [];
    return g;
  }

  function setPips(t) {
    const g = t.mesh;
    g.userData.pips.forEach((p) => g.remove(p));
    g.userData.pips = [];
    for (let i = 0; i < t.level; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), glowMat(0xffc857));
      const a = Math.PI * 0.75 + i * 0.32;
      p.position.set(Math.cos(a) * 0.42, 0.08, Math.sin(a) * 0.42);
      g.add(p);
      g.userData.pips.push(p);
    }
  }

  function canBuild(c, r) {
    return c >= 0 && c < COLS && r >= 0 && r < ROWS && !pathSet.has(key(c, r)) && !towerAt[key(c, r)];
  }

  function buildTower(c, r) {
    const d = TOWERS[S.build];
    if (!canBuild(c, r)) return false;
    if (S.gold < d.cost) { flash("gold"); return false; }
    S.gold -= d.cost;
    const t = { type: S.build, c, r, level: 1, cooldown: 0, invested: d.cost, kills: 0, mesh: towerMesh(S.build) };
    t.mesh.position.set(wx(c), 0, wz(r));
    t.mesh.scale.set(0.01, 0.01, 0.01);
    t.mesh.userData.tower = t;
    t.mesh.userData.grow = 0;
    scene.add(t.mesh);
    setPips(t);
    towers.push(t);
    towerAt[key(c, r)] = t;
    burst(t.mesh.position.clone().setY(0.3), d.color, 16, 2.5);
    updateHUD();
    return true;
  }

  function upgradeTower(t) {
    if (!t || t.level >= MAX_LEVEL) return;
    const cost = upgradeCost(t);
    if (S.gold < cost) { flash("gold"); return; }
    S.gold -= cost;
    t.invested += cost;
    t.level++;
    setPips(t);
    t.mesh.userData.grow = 0;
    t.mesh.scale.setScalar(0.85 * t.mesh.userData.size);
    burst(t.mesh.position.clone().setY(0.6), 0xffc857, 18, 3);
    updateHUD();
    showTowerPanel(t);
  }

  function sellTower(t) {
    if (!t) return;
    S.gold += sellValue(t);
    scene.remove(t.mesh);
    towers.splice(towers.indexOf(t), 1);
    delete towerAt[key(t.c, t.r)];
    burst(t.mesh.position.clone().setY(0.3), 0xffc857, 12, 2);
    selectTower(null);
    updateHUD();
  }

  /* ==========================================================================
     Gegner & Wellen
     ========================================================================== */
  function enemyMesh(type) {
    const d = ENEMIES[type];
    const g = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({ color: lin(d.color), emissive: lin(d.color), emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.1, clearcoat: 1 });
    let geo;
    if (type === "fast") geo = new THREE.OctahedronGeometry(d.r, 0);
    else if (type === "tank") geo = new THREE.IcosahedronGeometry(d.r, 0);
    else if (type === "boss") geo = new THREE.IcosahedronGeometry(d.r, 1);
    else geo = new THREE.SphereGeometry(d.r, 28, 20);
    const body = new THREE.Mesh(geo, mat);
    body.castShadow = true;
    g.add(body);
    g.add(glow(d.color, d.r * 4, 0.55));
    if (type === "boss") {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(d.r * 1.35, 0.04, 10, 48), glowMat(0xffc857));
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      g.userData.ring = ring;
    }
    // Lebensbalken (Sprites, immer zur Kamera)
    const bw = Math.max(0.6, d.r * 2);
    const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x06020a, transparent: true, opacity: 0.85, depthWrite: false }));
    bg.scale.set(bw + 0.06, 0.1, 1);
    const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color: lin(0x3ddc97), depthWrite: false, toneMapped: false }));
    fg.scale.set(bw, 0.06, 1);
    bg.position.y = fg.position.y = d.r + 0.38;
    bg.renderOrder = 5; fg.renderOrder = 6;
    g.add(bg, fg);
    g.userData = Object.assign(g.userData, { body, fg, bw });
    return g;
  }

  function spawnEnemy(type) {
    const d = ENEMIES[type];
    const hp = Math.round((55 + S.wave * 24 + Math.pow(S.wave, 1.6) * 4) * d.hp * DIFFS[DIFF].hp);
    const e = { type, hp, maxHp: hp, dist: 0, speed: d.speed, slowUntil: 0, slowFactor: 1, mesh: enemyMesh(type), pos: new THREE.Vector3(), alive: true, bob: Math.random() * 6 };
    pointAt(0, e.pos);
    e.mesh.position.copy(e.pos);
    scene.add(e.mesh);
    enemies.push(e);
  }

  function prepareWave() {
    S.wave++;
    const n = 6 + S.wave * 2;
    const q = [];
    for (let i = 0; i < n; i++) {
      let t = "normal";
      if (S.wave >= 3 && i % 3 === 2) t = "fast";
      if (S.wave >= 4 && i % 6 === 5) t = "tank";
      q.push(t);
    }
    if (S.wave % 5 === 0) q.push("boss");
    S.spawnQueue = q;
    S.spawnTimer = 0;
    S.phase = "wave";
    updateHUD();
  }

  function startWaveNow() {
    if (!S.started || S.over) return;
    if (S.phase === "build") {
      // Bonus für frühen Start
      const bonus = Math.floor(S.countdown) * 3;
      if (bonus > 0) { S.gold += bonus; toastGold("+" + bonus + " Gold Frühstart"); }
      prepareWave();
    }
  }

  function damageEnemy(e, dmg, tower) {
    if (!e.alive) return;
    e.hp -= dmg;
    if (e.hp <= 0) {
      e.alive = false;
      S.gold += ENEMIES[e.type].reward;
      S.kills++;
      if (tower) tower.kills++;
      burst(e.mesh.position.clone(), ENEMIES[e.type].color, e.type === "boss" ? 60 : 18, e.type === "boss" ? 5 : 3);
      scene.remove(e.mesh);
      updateHUD();
      if (S.selected) showTowerPanel(S.selected);
    }
  }

  /* ==========================================================================
     Effekte
     ========================================================================== */
  const particleGeo = new THREE.SphereGeometry(0.05, 6, 4);
  function burst(pos, color, n, power) {
    const mat = glowMat(color);
    for (let i = 0; i < n && particles.length < 400; i++) {
      const m = new THREE.Mesh(particleGeo, mat);
      m.position.copy(pos);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(power * (0.5 + Math.random()));
      scene.add(m);
      particles.push({ m, v, life: 0.6 + Math.random() * 0.4 });
    }
  }

  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  function beam(from, to, color, width) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: lin(color), transparent: true, opacity: 1, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.scale.set(width, len, width);
    m.position.copy(from).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    scene.add(m);
    effects.push({ m, life: 0.18, max: 0.18, kind: "fade" });
  }

  const ringGeo = new THREE.RingGeometry(0.92, 1, 64);
  function pulse(pos, color, radius) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: lin(color), transparent: true, opacity: 0.8, toneMapped: false, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, 0.14, pos.z);
    m.scale.set(0.2, 0.2, 0.2);
    scene.add(m);
    effects.push({ m, life: 0.45, max: 0.45, kind: "pulse", radius });
  }

  /* ==========================================================================
     Update
     ========================================================================== */
  const tmp = new THREE.Vector3();
  function update(dt) {
    time += dt;

    // Wellen-Ablauf
    if (S.started && !S.over) {
      if (S.phase === "build") {
        S.countdown -= dt;
        if (S.countdown <= 0) prepareWave();
      } else if (S.phase === "wave") {
        if (S.spawnQueue.length) {
          S.spawnTimer -= dt;
          if (S.spawnTimer <= 0) {
            spawnEnemy(S.spawnQueue.shift());
            S.spawnTimer = Math.max(0.35, 0.8 - S.wave * 0.02);
          }
        } else if (!enemies.length) {
          S.phase = "build";
          S.countdown = 8;
          const bonus = 20 + S.wave * 5;
          S.gold += bonus;
          toastGold("Welle " + S.wave + " geschafft · +" + bonus + " Gold");
          saveBest();
        }
      }
    }

    // Gegner bewegen
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e.alive) { enemies.splice(i, 1); continue; }
      const slow = time < e.slowUntil ? e.slowFactor : 1;
      e.dist += e.speed * slow * dt;
      if (e.dist >= pathLength) {
        e.alive = false;
        scene.remove(e.mesh);
        enemies.splice(i, 1);
        S.lives -= ENEMIES[e.type].damage;
        flash("lives");
        crystal.material.emissive.copy(lin(0xff5470));
        crystalHit = 0.4;
        if (S.lives <= 0 && !S.over) { S.lives = 0; gameOver(); }
        updateHUD();
        continue;
      }
      pointAt(e.dist, e.pos);
      const d = ENEMIES[e.type];
      e.mesh.position.set(e.pos.x, e.pos.y + d.r + Math.abs(Math.sin(time * 6 + e.bob)) * 0.08, e.pos.z);
      e.mesh.userData.body.rotation.y += dt * 2;
      e.mesh.userData.body.rotation.x += dt * (e.type === "fast" ? 4 : 1);
      if (e.mesh.userData.ring) e.mesh.userData.ring.rotation.z += dt * 2;
      // Lebensbalken
      const pct = Math.max(0.001, e.hp / e.maxHp);
      const fg = e.mesh.userData.fg;
      fg.scale.x = e.mesh.userData.bw * pct;
      fg.center.x = 0.5 / pct;
      fg.material.color.copy(lin(pct > 0.5 ? 0x3ddc97 : pct > 0.25 ? 0xffc857 : 0xff5470));
      e.mesh.userData.body.material.emissiveIntensity = slow < 1 ? 0.2 : 0.55;
      e.mesh.userData.body.material.color.copy(lin(slow < 1 ? 0x9ad8ff : d.color));
    }

    // Türme
    towers.forEach((t) => {
      const st = towerStats(t);
      const head = t.mesh.userData.head;
      // Wachstums-Animation
      if (t.mesh.userData.grow < 1) {
        t.mesh.userData.grow = Math.min(1, t.mesh.userData.grow + dt * 4);
        const k = t.mesh.userData.grow, s = (1 + Math.sin(k * Math.PI) * 0.15) * t.mesh.userData.size;
        t.mesh.scale.set(k * s, k * s, k * s);
        if (k >= 1) t.mesh.scale.setScalar(t.mesh.userData.size);
      }
      head.children.forEach((c) => { if (c.userData.spin) { c.rotation.y += dt * 1.5; c.position.y = 0.1 + Math.sin(time * 2.5) * 0.05; } });

      t.cooldown -= dt;
      // Ziel: der Gegner, der am weitesten gekommen ist
      let target = null;
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = e.pos.x - t.mesh.position.x, dz = e.pos.z - t.mesh.position.z;
        if (dx * dx + dz * dz <= st.range * st.range && (!target || e.dist > target.dist)) target = e;
      }
      if (target && t.type !== "frost") {
        tmp.set(target.mesh.position.x, head.getWorldPosition(new THREE.Vector3()).y, target.mesh.position.z);
        head.lookAt(tmp);
      }
      if (t.cooldown > 0 || !target) return;
      t.cooldown = st.rate;

      const muzzle = head.localToWorld(new THREE.Vector3(0, 0, t.type === "sniper" ? 1.1 : 0.62));
      if (t.type === "basic") {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), glowMat(TOWERS.basic.color));
        m.add(glow(TOWERS.basic.color, 0.6, 0.9));
        m.position.copy(muzzle);
        scene.add(m);
        projectiles.push({ m, target, dmg: st.dmg, speed: 11, tower: t });
      } else if (t.type === "sniper") {
        beam(muzzle, target.mesh.position, TOWERS.sniper.color, 0.035);
        burst(target.mesh.position.clone(), TOWERS.sniper.color, 6, 2);
        damageEnemy(target, st.dmg, t);
      } else {
        pulse(t.mesh.position, TOWERS.frost.color, st.range);
        for (const e of enemies) {
          if (!e.alive) continue;
          const dx = e.pos.x - t.mesh.position.x, dz = e.pos.z - t.mesh.position.z;
          if (dx * dx + dz * dz <= st.range * st.range) {
            e.slowUntil = time + TOWERS.frost.slowTime;
            e.slowFactor = 1 - st.slow;
            damageEnemy(e, st.dmg, t);
          }
        }
      }
    });

    // Projektile
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      if (!p.target.alive) { scene.remove(p.m); projectiles.splice(i, 1); continue; }
      tmp.subVectors(p.target.mesh.position, p.m.position);
      const d = tmp.length();
      if (d < 0.25) {
        damageEnemy(p.target, p.dmg, p.tower);
        burst(p.m.position.clone(), TOWERS.basic.color, 5, 1.5);
        scene.remove(p.m);
        projectiles.splice(i, 1);
        continue;
      }
      p.m.position.addScaledVector(tmp.normalize(), Math.min(d, p.speed * dt));
    }

    // Effekte
    for (let i = effects.length - 1; i >= 0; i--) {
      const f = effects[i];
      f.life -= dt;
      const k = Math.max(0, f.life / f.max);
      if (f.kind === "pulse") { const s = f.radius * (1 - k) + 0.2; f.m.scale.set(s, s, s); }
      f.m.material.opacity = k * (f.kind === "pulse" ? 0.8 : 1);
      if (f.life <= 0) { scene.remove(f.m); effects.splice(i, 1); }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.v.y -= 6 * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.m.position.y < 0.05) { p.m.position.y = 0.05; p.v.multiplyScalar(0.4); p.v.y *= -0.5; }
      p.m.scale.setScalar(Math.max(0.01, p.life * 1.4));
      if (p.life <= 0) { scene.remove(p.m); particles.splice(i, 1); }
    }

    updateWaveText();
  }

  let crystalHit = 0;
  function animateScenery(realDt) {
    // Läuft auch in der Pause, damit die Szene lebendig bleibt
    const t = performance.now() / 1000;
    portal.children[0].rotation.z += realDt * 1.5;
    crystal.rotation.y += realDt * 0.8;
    crystal.position.y = 1.0 + Math.sin(t * 2) * 0.12;
    crystalRing.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
    if (crystalHit > 0) {
      crystalHit -= realDt;
      if (crystalHit <= 0) crystal.material.emissive.copy(lin(0xe254d6));
    }
    flowDots.forEach((d) => {
      d.userData.t = (d.userData.t + realDt * 0.02) % 1;
      pointAt(d.userData.t * pathLength, d.position);
      d.position.y = 0.14;
    });
  }

  /* ==========================================================================
     Eingabe
     ========================================================================== */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let hoverTile = null, downPos = null;
  let hoverMarker, rangeRing;

  function createHoverMarker() {
    hoverMarker = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.94), new THREE.MeshBasicMaterial({ color: lin(0xe254d6), transparent: true, opacity: 0.35, toneMapped: false, depthWrite: false }));
    hoverMarker.rotation.x = -Math.PI / 2;
    hoverMarker.position.y = 0.01;
    hoverMarker.visible = false;
    scene.add(hoverMarker);
    rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 96), new THREE.MeshBasicMaterial({ color: lin(0xe254d6), transparent: true, opacity: 0.6, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
    rangeRing.rotation.x = -Math.PI / 2;
    rangeRing.position.y = 0.13;
    rangeRing.visible = false;
    const fillDisc = new THREE.Mesh(new THREE.CircleGeometry(0.97, 96), new THREE.MeshBasicMaterial({ color: lin(0xe254d6), transparent: true, opacity: 0.06, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
    rangeRing.add(fillDisc);
    scene.add(rangeRing);
  }

  function tileFromEvent(e) {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    // Erst Türme treffen (sie sind höher als das Feld)
    const hits = raycaster.intersectObjects(towers.map((t) => t.mesh), true);
    if (hits.length) {
      let o = hits[0].object;
      while (o && !o.userData.tower) o = o.parent;
      if (o) return { c: o.userData.tower.c, r: o.userData.tower.r };
    }
    const p = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, p)) return null;
    const c = Math.round(p.x + (COLS - 1) / 2), rr = Math.round(p.z + (ROWS - 1) / 2);
    if (c < 0 || c >= COLS || rr < 0 || rr >= ROWS) return null;
    return { c, r: rr };
  }

  function showRange(x, z, range, color) {
    rangeRing.visible = true;
    rangeRing.position.x = x;
    rangeRing.position.z = z;
    rangeRing.scale.set(range, range, range);
    rangeRing.material.color.copy(lin(color));
    rangeRing.children[0].material.color.copy(lin(color));
  }

  function refreshHover() {
    rangeRing.visible = false;
    hoverMarker.visible = false;
    if (S.selected) {
      const st = towerStats(S.selected);
      showRange(S.selected.mesh.position.x, S.selected.mesh.position.z, st.range, TOWERS[S.selected.type].color);
    }
    if (!hoverTile || S.over) return;
    const { c, r } = hoverTile;
    const t = towerAt[key(c, r)];
    hoverMarker.visible = true;
    hoverMarker.position.x = wx(c);
    hoverMarker.position.z = wz(r);
    if (t) {
      hoverMarker.material.color.copy(lin(0xffffff));
      hoverMarker.material.opacity = 0.12;
      renderer.domElement.style.cursor = "pointer";
      if (!S.selected) showRange(t.mesh.position.x, t.mesh.position.z, towerStats(t).range, TOWERS[t.type].color);
      return;
    }
    const ok = canBuild(c, r) && S.gold >= TOWERS[S.build].cost;
    hoverMarker.material.color.copy(lin(ok ? 0xe254d6 : 0xff5470));
    hoverMarker.material.opacity = pathSet.has(key(c, r)) ? 0 : 0.35;
    renderer.domElement.style.cursor = ok ? "pointer" : "not-allowed";
    if (!S.selected && !pathSet.has(key(c, r))) showRange(wx(c), wz(r), TOWERS[S.build].range, ok ? TOWERS[S.build].color : 0xff5470);
  }

  function setupInput() {
    const el = renderer.domElement;
    el.addEventListener("pointerdown", (e) => { if (e.button === 0) downPos = { x: e.clientX, y: e.clientY }; });
    el.addEventListener("pointermove", (e) => {
      hoverTile = tileFromEvent(e);
      if (!hoverTile) el.style.cursor = "";
      refreshHover();
    });
    el.addEventListener("pointerleave", () => { hoverTile = null; refreshHover(); });
    el.addEventListener("pointerup", (e) => {
      if (!downPos || e.button !== 0) return;
      const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      downPos = null;
      if (moved > 6 || !S.started || S.over) return;
      const tile = tileFromEvent(e);
      if (!tile) { selectTower(null); return; }
      const t = towerAt[key(tile.c, tile.r)];
      if (t) selectTower(t === S.selected ? null : t);
      else if (canBuild(tile.c, tile.r)) { selectTower(null); buildTower(tile.c, tile.r); }
      else selectTower(null);
      refreshHover();
    });

    addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (k === " ") { e.preventDefault(); if (!S.started) startGame(); else startWaveNow(); return; }
      if (!S.started || S.over) return;
      if (k === "1") setBuild("basic");
      else if (k === "2") setBuild("sniper");
      else if (k === "3") setBuild("frost");
      else if (k === "p") togglePause();
      else if (k === "t") toggleSpeed();
      else if (k === "u") upgradeTower(S.selected);
      else if (k === "v") sellTower(S.selected);
      else if (k === "escape") selectTower(null);
    });
  }

  /* ==========================================================================
     UI
     ========================================================================== */
  function setupUI() {
    $("dock").innerHTML = Object.keys(TOWERS).map((id, i) => {
      const d = TOWERS[id];
      return '<button class="build" data-build="' + id + '"><span class="tp-dot" style="background:' + d.css + ';color:' + d.css + '"></span>' +
        '<span><b>' + d.name + '</b><small><span class="cost">' + d.cost + ' Gold</span> · ' + d.desc + '</small></span><kbd>' + (i + 1) + '</kbd></button>';
    }).join("");
    $("dock").addEventListener("click", (e) => { const b = e.target.closest("[data-build]"); if (b) setBuild(b.dataset.build); });
    $("btnStart").onclick = startGame;
    $("btnWave").onclick = startWaveNow;
    $("btnPause").onclick = togglePause;
    $("btnResume").onclick = togglePause;
    $("btnSpeed").onclick = toggleSpeed;
    $("btnRestart").onclick = () => location.reload();
    $("btnUpgrade").onclick = () => upgradeTower(S.selected);
    $("btnSell").onclick = () => sellTower(S.selected);
    $("tpClose").onclick = () => selectTower(null);
    setBuild("basic");
    buildChoices();
  }

  function setBuild(type) {
    S.build = type;
    document.querySelectorAll(".build").forEach((b) => b.classList.toggle("selected", b.dataset.build === type));
    refreshHover();
  }

  function selectTower(t) {
    S.selected = t;
    if (t) showTowerPanel(t); else $("towerPanel").hidden = true;
    refreshHover();
  }

  function showTowerPanel(t) {
    const d = TOWERS[t.type], st = towerStats(t);
    const next = t.level < MAX_LEVEL ? towerStats({ type: t.type, level: t.level + 1 }) : null;
    $("towerPanel").hidden = false;
    $("tpDot").style.background = d.css;
    $("tpDot").style.color = d.css;
    $("tpName").textContent = d.name;
    $("tpLevel").textContent = "Stufe " + t.level + " von " + MAX_LEVEL;
    const row = (label, v, nv) => '<div class="tp-row"><span>' + label + '</span><b>' + v + (nv != null && nv !== v ? '<span class="up">→ ' + nv + '</span>' : '') + '</b></div>';
    $("tpRows").innerHTML =
      row("Schaden", st.dmg, next && next.dmg) +
      row("Reichweite", st.range, next && next.range) +
      row("Nachladen", st.rate + " s", next && next.rate + " s") +
      (d.slow ? row("Verlangsamung", Math.round(st.slow * 100) + " %", next && Math.round(next.slow * 100) + " %") : "") +
      row("Abschüsse", t.kills);
    const up = $("btnUpgrade");
    if (t.level >= MAX_LEVEL) { up.textContent = "Max. Stufe"; up.disabled = true; }
    else { up.textContent = "Verbessern · " + upgradeCost(t); up.disabled = S.gold < upgradeCost(t); }
    $("btnSell").textContent = "Verkaufen · +" + sellValue(t);
  }

  function updateHUD() {
    $("gold").textContent = S.gold;
    $("lives").textContent = S.lives;
    $("wave").textContent = S.wave;
    $("enemyCount").textContent = enemies.filter((e) => e.alive).length + S.spawnQueue.length;
    document.querySelectorAll(".build").forEach((b) => b.classList.toggle("poor", S.gold < TOWERS[b.dataset.build].cost));
    if (S.selected) showTowerPanel(S.selected);
  }

  let lastWaveText = "";
  function updateWaveText() {
    let txt, showBtn;
    if (!S.started) { txt = "Bereit"; showBtn = false; }
    else if (S.phase === "build") { txt = "Welle " + (S.wave + 1) + (((S.wave + 1) % 5 === 0) ? " (Boss)" : "") + " in " + Math.ceil(S.countdown) + " s"; showBtn = true; }
    else { txt = "Welle " + S.wave + " läuft"; showBtn = false; }
    if (txt !== lastWaveText) {
      lastWaveText = txt;
      $("waveText").textContent = txt;
      $("btnWave").style.display = showBtn ? "" : "none";
      $("enemyCount").textContent = enemies.filter((e) => e.alive).length + S.spawnQueue.length;
    }
  }

  function flash(id) {
    const el = $(id);
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  }

  let toastTimer;
  function toastGold(msg) {
    let el = document.querySelector(".td-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "td-toast";
      el.style.cssText = "position:absolute;top:84px;left:50%;transform:translateX(-50%);z-index:12;padding:8px 14px;border-radius:999px;border:1px solid var(--gh-line-strong);background:rgba(14,7,20,.85);color:var(--gh-warn);font-weight:600;font-size:13px;transition:opacity .3s;pointer-events:none";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = 1;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.style.opacity = 0), 2200);
    updateHUD();
  }

  function buildChoices() {
    $("mapChoice").innerHTML = MAPS.map((m, i) => '<button class="gh-btn' + (i === MAP_INDEX ? " gh-btn-white" : "") + '" data-map="' + i + '">' + m.name + "</button>").join("");
    $("diffChoice").innerHTML = Object.keys(DIFFS).map((k) => '<button class="gh-btn' + (k === DIFF ? " gh-btn-white" : "") + '" data-diff="' + k + '">' + DIFFS[k].name + "</button>").join("");
    $("bestInfo").textContent = "Rekord auf dieser Karte: " + best() + " Wellen";
    $("mapChoice").onclick = (e) => { const b = e.target.closest("[data-map]"); if (b && +b.dataset.map !== MAP_INDEX) { localStorage.setItem("td3d_map", b.dataset.map); location.reload(); } };
    $("diffChoice").onclick = (e) => { const b = e.target.closest("[data-diff]"); if (b && b.dataset.diff !== DIFF) { localStorage.setItem("td3d_diff", b.dataset.diff); location.reload(); } };
  }

  function startGame() {
    if (S.started) return;
    S.started = true;
    S.phase = "build";
    S.countdown = 10;
    $("startOverlay").hidden = true;
    updateHUD();
  }

  function togglePause() {
    if (!S.started || S.over) return;
    S.paused = !S.paused;
    $("pauseOverlay").hidden = !S.paused;
    $("btnPause").textContent = S.paused ? "Weiter" : "Pause";
  }

  function toggleSpeed() {
    S.speed = S.speed === 1 ? 2 : 1;
    $("btnSpeed").textContent = S.speed + "×";
    $("btnSpeed").classList.toggle("on", S.speed === 2);
  }

  // Bestwerte pro Karte & Stufe (GHStats, im Browser gespeichert)
  const bestKey = (m, d) => "best_" + m + "_" + d;
  function best(m, d) {
    return (window.GHStats && GHStats.progress("tower-defense-3d", bestKey(m == null ? MAP_INDEX : m, d || DIFF))) || 0;
  }
  function saveBest() {
    const done = S.phase === "build" ? S.wave : S.wave - 1;
    if (window.GHStats && done > best()) GHStats.progress("tower-defense-3d", bestKey(MAP_INDEX, DIFF), done);
  }

  function gameOver() {
    S.over = true;
    saveBest();
    if (window.GHStats) GHStats.record("tower-defense-3d", Math.max(0, S.wave - 1));
    selectTower(null);
    burst(crystal.position.clone(), 0xe254d6, 80, 6);
    crystal.visible = false;
    $("overText").textContent = "Du hast " + Math.max(0, S.wave - 1) + " Wellen überlebt und " + S.kills + " Gegner besiegt. Rekord (" + MAPS[MAP_INDEX].name + ", " + DIFFS[DIFF].name + "): " + best() + " Wellen.";
    setTimeout(() => ($("overOverlay").hidden = false), 900);
  }

  /* ==========================================================================
     Loop
     ========================================================================== */
  function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    fitCamera();
  }
  // Hochformat (Handy): Kamera so weit zurück, dass das ganze Feld in die Breite passt
  function fitCamera() {
    const aspect = innerWidth / innerHeight;
    if (aspect >= 1.2) { camera.position.set(0, 19.5, 15); return; }
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
    const dist = (COLS / 2 + 1) / Math.tan(hfov / 2);
    camera.position.set(0, dist * 0.92, dist * 0.38);
    controls.maxDistance = dist * 1.6;
  }

  function animate() {
    requestAnimationFrame(animate);
    const realDt = Math.min(0.05, clock.getDelta());
    if (!S.paused) update(realDt * S.speed);
    animateScenery(realDt);
    controls.update();
    renderer.render(scene, camera);
  }

  // Kleine Schnittstelle für automatische Tests (nur lesen)
  window.TD3D = {
    state: S,
    screenOf(c, r) {
      const v = new THREE.Vector3(wx(c), 0, wz(r)).project(camera);
      const rect = renderer.domElement.getBoundingClientRect();
      return { x: rect.left + (v.x + 1) / 2 * rect.width, y: rect.top + (1 - v.y) / 2 * rect.height };
    }
  };

  window.addEventListener("load", init);
})();
