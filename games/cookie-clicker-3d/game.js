/* ==========================================================================
   Cookie Clicker 3D – GAMEHUB
   Spiellogik & Shop: /games/cookie-clicker/core.js + game.js (wie 2D)
   Hier: 3D-Keks und Gebäude als Modelle rund um den Keks.
   ========================================================================== */
(function () {
  "use strict";
  const C = window.CookieCore;
  const $ = (id) => document.getElementById(id);

  const world = GH3D.create({
    container: $("scene"),
    camera: { fov: 42, pos: [0, 5, 13], target: [0, 1.6, 0] },
    sunPos: [6, 18, 12], shadowBox: 14, rim: 2.6,
    onResize: layout
  });
  const { scene, camera } = world;

  /* ---------- Keks ---------- */
  const cookie = new THREE.Group();
  const prof = [];
  const R = 2.1, Hh = 0.32;
  prof.push(new THREE.Vector2(0, -Hh));
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + (i / 12) * Math.PI; prof.push(new THREE.Vector2(R - 0.3 + Math.cos(a) * 0.3, Math.sin(a) * Hh)); }
  prof.push(new THREE.Vector2(0, Hh));
  const dough = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), GH3D.mat(0xd9a86c, { rough: 0.75, clearcoat: 0.1, env: 0.6 }));
  dough.rotation.x = Math.PI / 2;
  dough.castShadow = true;
  cookie.add(dough);
  // Teig-Unebenheiten
  const bumpMat = GH3D.mat(0xc8935a, { rough: 0.8, clearcoat: 0 });
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 1.6;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.18 + Math.random() * 0.12, 10, 8), bumpMat);
    b.scale.z = 0.35;
    b.position.set(Math.cos(a) * r, Math.sin(a) * r, Hh * 0.82 * (Math.random() < 0.5 ? 1 : -1));
    cookie.add(b);
  }
  // Schokostücke
  const chipMat = GH3D.mat(0x3d2418, { rough: 0.35, clearcoat: 0.6 });
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.3 + Math.sqrt(Math.random()) * 1.45;
    const chip = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + Math.random() * 0.08, 0), chipMat);
    chip.position.set(Math.cos(a) * r, Math.sin(a) * r, (Hh + 0.02) * (i % 2 ? 1 : -1));
    chip.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    chip.castShadow = true;
    cookie.add(chip);
  }
  cookie.position.set(0, 2.6, 0);
  scene.add(cookie);
  const cookieGlow = GH3D.glow(0xe254d6, 9, 0.18);
  cookieGlow.position.set(0, 2.6, -1);
  scene.add(cookieGlow);

  /* ---------- Boden ---------- */
  const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), GH3D.mat(0x0b0610, { rough: 0.8, clearcoat: 0.15, env: 0.12 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  scene.add(floor);
  [3.2, 7.2, 11.2].forEach((r) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.02, r + 0.02, 128), GH3D.neon(0xe254d6, 0.35));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
  });

  /* ---------- Gebäude-Modelle ---------- */
  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg || 16);
  const MODELS = [
    { geo: new THREE.ConeGeometry(0.12, 0.34, 3), mat: GH3D.mat(0xf6f2f9, { glow: 0.3 }) },                                       // Cursor
    { geo: lathe([[0, 0], [0.2, 0], [0.18, 0.35], [0.12, 0.42], [0.14, 0.5], [0.12, 0.6], [0, 0.64]]), mat: GH3D.mat(0xff8ad8, { rough: 0.4 }) }, // Oma
    { geo: GH3D.roundedBox(0.5, 0.4, 0.5, 0.05), mat: GH3D.mat(0x3ddc97, { rough: 0.5 }) },                                      // Farm
    { geo: new THREE.ConeGeometry(0.34, 0.55, 5), mat: GH3D.mat(0x8a8494, { rough: 0.6, metal: 0.3 }) },                           // Mine
    { geo: GH3D.roundedBox(0.55, 0.6, 0.45, 0.05), mat: GH3D.mat(0x6b6375, { rough: 0.4, metal: 0.5 }) },                          // Fabrik
    { geo: GH3D.roundedBox(0.5, 0.5, 0.5, 0.06), mat: GH3D.mat(0xffc857, { metal: 0.8, rough: 0.2, glow: 0.15 }) },                // Bank
    { geo: new THREE.ConeGeometry(0.42, 0.6, 4), mat: GH3D.mat(0xe0c08a, { rough: 0.5 }) },                                         // Tempel
    { geo: new THREE.ConeGeometry(0.22, 1.1, 6), mat: GH3D.mat(0x9b5cf6, { glow: 0.4, rough: 0.25 }) },                            // Zauberturm
    { geo: lathe([[0, 0], [0.16, 0], [0.18, 0.1], [0.16, 0.7], [0.08, 0.95], [0, 1.05]], 20), mat: GH3D.mat(0xf6f2f9, { metal: 0.4, rough: 0.2 }) } // Raumschiff
  ];
  const CAP = 18;
  const meshes = MODELS.map((m, i) => {
    const im = new THREE.InstancedMesh(m.geo, m.mat, i === 0 ? 40 : CAP);
    im.count = 0;
    im.castShadow = true;
    scene.add(im);
    return im;
  });
  const d = new THREE.Object3D();
  const lastCounts = [];
  function placeBuildings(t) {
    const s = C.state;
    // Cursor kreisen um den Keks
    const nc = Math.min(40, s.buildings[0]);
    for (let k = 0; k < nc; k++) {
      const a = (k / Math.max(nc, 1)) * Math.PI * 2 + t * 0.4;
      d.position.set(Math.cos(a) * 2.75, 2.6 + Math.sin(a) * 2.75, 0.2);
      d.rotation.set(0, 0, a + Math.PI / 2);
      d.scale.setScalar(1 + Math.max(0, Math.sin(t * 6 + k)) * 0.3);
      d.updateMatrix();
      meshes[0].setMatrixAt(k, d.matrix);
    }
    meshes[0].count = nc;
    meshes[0].instanceMatrix.needsUpdate = true;
    // Übrige Gebäude in Ringen auf dem Boden
    for (let i = 1; i < MODELS.length; i++) {
      const n = Math.min(CAP, s.buildings[i]);
      if (n === lastCounts[i] && i !== 7 && i !== 8) continue;
      lastCounts[i] = n;
      const ring = 3.9 + (i - 1) * 0.95;
      for (let k = 0; k < n; k++) {
        // Bogen hinter und neben dem Keks, damit nichts verdeckt
        const a = Math.PI * (1.06 + (n > 1 ? k / (n - 1) : 0.5) * 0.88) + (i % 2) * 0.04;
        d.position.set(Math.cos(a) * ring, 0, Math.sin(a) * ring);
        d.rotation.set(0, -a, 0);
        d.scale.setScalar(1);
        if (i === 8) d.position.y = Math.max(0, Math.sin(t * 1.5 + k) * 0.25); // Raumschiffe schweben
        if (i === 2 || i === 4 || i === 5) d.position.y = 0.22;
        d.updateMatrix();
        meshes[i].setMatrixAt(k, d.matrix);
      }
      meshes[i].count = n;
      meshes[i].instanceMatrix.needsUpdate = true;
    }
  }

  /* ---------- Klickfläche über dem Keks + Effekte ---------- */
  const hit = $("cookie-container");
  function layout() {
    const wide = innerWidth > 820;
    const shift = wide ? 210 : 0;
    camera.setViewOffset(innerWidth, innerHeight, shift, wide ? 0 : innerHeight * 0.07, innerWidth, innerHeight);
    camera.updateProjectionMatrix();
    camera.position.set(0, 6.5, innerWidth / innerHeight < 1 ? 30 : 17.5);
    camera.lookAt(0, 1.9, 0);
    const p = world.toScreen(new THREE.Vector3(0, 2.6, 0));
    const e = world.toScreen(new THREE.Vector3(2.1, 2.6, 0));
    const r = Math.abs(e.x - p.x);
    Object.assign(hit.style, { left: p.x - r + "px", top: p.y - r + "px", width: r * 2 + "px", height: r * 2 + "px" });
  }
  let squash = 0;
  hit.addEventListener("pointerdown", () => {
    squash = 1;
    world.burst(new THREE.Vector3((Math.random() - 0.5) * 2, 2.6 + (Math.random() - 0.5) * 2, 0.6), 0xd9a86c, 6, 2.5);
  });

  world.onUpdate((dt, t) => {
    squash = Math.max(0, squash - dt * 7);
    const s = 1 - squash * 0.08;
    cookie.scale.set(s, s, 1 + squash * 0.2);
    cookie.rotation.z += dt * 0.15;
    cookie.rotation.y = Math.sin(t * 0.6) * 0.25;
    cookie.position.y = 2.6 + Math.sin(t * 1.2) * 0.08;
    cookieGlow.material.opacity = 0.16 + C.cps() * 0 + squash * 0.25;
    placeBuildings(t);
  });

  world.start();
  layout();
  setTimeout(layout, 300);
  GH3D.ready();
})();
