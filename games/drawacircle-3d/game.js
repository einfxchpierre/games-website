/* ==========================================================================
   Draw a Circle 3D – GAMEHUB
   Gezeichnet wird in der Ebene einer schwebenden Scheibe (lokale Koordinaten).
   Bewertung wie in der 2D-Version; Herausforderungen aus challenges.js.
   ========================================================================== */
(function () {
  "use strict";
  const ID = "drawacircle-3d";
  const DISC = 4; // Radius der Scheibe
  const $ = (id) => document.getElementById(id);

  const world = GH3D.create({
    container: $("scene"),
    camera: { fov: 40, pos: [0, 2.5, 13.5], target: [0, 0.2, 0] },
    sunPos: [6, 14, 12], shadowBox: 8, rim: 3,
    onResize: fit
  });
  const { scene, camera } = world;
  function fit() {
    const aspect = innerWidth / innerHeight;
    // Hochformat: so weit zurück, dass die Scheibe (Ø 8) mit Rand in die Breite passt
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
    camera.position.set(0, 2.5, aspect < 1 ? 5.2 / Math.tan(hfov / 2) : 17.5);
    camera.lookAt(0, aspect < 1 ? 1.4 : 1.1, 0);
  }

  /* ---------- Scheibe ---------- */
  const disc = new THREE.Group();
  disc.rotation.x = -0.32; // leicht zur Kamera geneigt
  scene.add(disc);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(DISC, DISC, 0.25, 96), GH3D.mat(0x1b1023, { rough: 0.35, metal: 0.3, clearcoat: 1 }));
  plate.rotation.x = Math.PI / 2;
  plate.castShadow = true;
  disc.add(plate);
  const face = new THREE.Mesh(new THREE.CircleGeometry(DISC - 0.08, 96), GH3D.mat(0x120a18, { rough: 0.6, clearcoat: 0.6, env: 0.4 }));
  face.position.z = 0.13;
  disc.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(DISC, 0.05, 12, 128), GH3D.neon(0xe254d6));
  disc.add(rim);
  // feine Hilfskreise
  [1.5, 2.75].forEach((r) => { const m = new THREE.Mesh(new THREE.RingGeometry(r - 0.01, r + 0.01, 128), GH3D.neon(0xe254d6, 0.12)); m.position.z = 0.135; disc.add(m); });
  const halo = GH3D.glow(0xe254d6, 14, 0.12);
  halo.position.z = -1;
  disc.add(halo);
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.3 }));
  shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.position.y = -5; shadowFloor.receiveShadow = true;
  scene.add(shadowFloor);

  // Perlen der Spur
  const MAX = 4000;
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), MAX);
  beads.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3).fill(1), 3);
  beads.count = 0;
  disc.add(beads);
  // Idealkreis
  const ideal = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 128), GH3D.neon(0xe254d6, 0.5));
  ideal.visible = false; ideal.position.z = 0.15;
  disc.add(ideal);
  const pen = GH3D.glow(0xffffff, 0.9, 0.9);
  pen.visible = false;
  disc.add(pen);

  /* ---------- Zeichnen ---------- */
  let points = [], drawing = false, finished = false, startT = 0;
  const d = new THREE.Object3D();
  const white = GH3D.lin(0xf6f2f9);
  function localHit(e) {
    const hits = world.ray(e.clientX, e.clientY).intersectObject(face, false);
    if (!hits.length) return null;
    const p = disc.worldToLocal(hits[0].point.clone());
    return { x: p.x, y: p.y };
  }
  function addBead(p) {
    if (beads.count >= MAX) return;
    d.position.set(p.x, p.y, 0.16);
    d.updateMatrix();
    beads.setMatrixAt(beads.count, d.matrix);
    beads.setColorAt(beads.count, white);
    beads.count++;
    beads.instanceMatrix.needsUpdate = true;
    beads.instanceColor.needsUpdate = true;
  }
  function addPoint(p) {
    const last = points[points.length - 1];
    if (last) {
      // Lücken auffüllen, damit die Spur durchgehend wirkt
      const dist = Math.hypot(p.x - last.x, p.y - last.y), n = Math.floor(dist / 0.06);
      for (let k = 1; k <= n; k++) addBead({ x: last.x + (p.x - last.x) * k / (n + 1), y: last.y + (p.y - last.y) * k / (n + 1) });
    }
    points.push(p);
    addBead(p);
    pen.position.set(p.x, p.y, 0.2);
  }
  function reset() {
    points = []; beads.count = 0; finished = false; drawing = false;
    ideal.visible = false; pen.visible = false;
    $("result").classList.remove("show");
    $("again").hidden = true;
    renderChallenges();
  }
  const el = world.renderer.domElement;
  el.addEventListener("pointerdown", (e) => {
    if (finished) return;
    const p = localHit(e); if (!p) return;
    reset();
    drawing = true; startT = performance.now(); pen.visible = true;
    addPoint(p);
    $("info").textContent = "Schließe den Kreis …";
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = localHit(e); if (p) addPoint(p);
  });
  const end = () => {
    if (!drawing) return;
    drawing = false; pen.visible = false;
    if (points.length < 15) { $("info").textContent = "Das war zu kurz. Versuche es nochmal!"; beads.count = 0; points = []; return; }
    evaluate();
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);

  /* ---------- Bewertung (wie 2D) ---------- */
  function evaluate() {
    let sx = 0, sy = 0;
    points.forEach((p) => { sx += p.x; sy += p.y; });
    const cx = sx / points.length, cy = sy / points.length;
    let sr = 0;
    points.forEach((p) => (sr += Math.hypot(p.x - cx, p.y - cy)));
    const r = sr / points.length;
    if (r < 0.25) { $("info").textContent = "Kreis ist zu klein!"; beads.count = 0; points = []; return; }
    let dev = 0;
    points.forEach((p) => (dev += Math.abs(Math.hypot(p.x - cx, p.y - cy) - r) / r));
    let score = (1 - (dev / points.length) * 2.2) * 100;
    const gap = Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y);
    score = Math.max(0, score - (gap / r) * 20);
    score = Math.round(score * 10) / 10;
    finished = true;

    // Perlen einfärben
    const cG = GH3D.lin(0x3ddc97), cY = GH3D.lin(0xffc857), cR = GH3D.lin(0xff5470);
    const m = new THREE.Matrix4(), pos = new THREE.Vector3();
    for (let i = 0; i < beads.count; i++) {
      beads.getMatrixAt(i, m); pos.setFromMatrixPosition(m);
      const dr = Math.abs(Math.hypot(pos.x - cx, pos.y - cy) - r) / r;
      beads.setColorAt(i, dr < 0.06 ? cG : dr < 0.15 ? cY : cR);
    }
    beads.instanceColor.needsUpdate = true;
    ideal.scale.set(r, r, 1); ideal.position.set(cx, cy, 0.15); ideal.visible = true;

    const color = score > 70 ? "#3ddc97" : score > 50 ? "#ffc857" : "#ff5470";
    $("pct").textContent = score.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";
    $("pct").style.color = color;
    $("result").classList.add("show");
    $("again").hidden = false;
    world.burst(disc.localToWorld(new THREE.Vector3(cx, cy, 0.3)), score > 70 ? 0x3ddc97 : 0xe254d6, score > 85 ? 60 : 20, 4);
    if (score > 85) spin = 1;

    // Statistik & Herausforderung
    if (window.GHStats) GHStats.record(ID, score);
    $("best").textContent = bestText();
    const res = { score, r: r / DISC, time: performance.now() - startT };
    if (challenge >= 0) {
      const c = CIRCLE_CHALLENGES[challenge], chk = checkCircleChallenge(c, res);
      if (chk.ok) {
        if (window.GHStats) GHStats.unlock(ID, challenge + 2);
        renderChallenges();
        $("info").textContent = challenge + 1 < CIRCLE_CHALLENGES.length ? "✓ Geschafft! Herausforderung " + (challenge + 2) + " ist freigeschaltet." : "✓ Alle Herausforderungen gemeistert!";
      } else $("info").textContent = "✗ Nicht geschafft: " + chk.why;
    } else $("info").textContent = "Auswertung fertig!";
  }
  $("again").onclick = () => { reset(); };

  /* ---------- Herausforderungen ---------- */
  let challenge = -1;
  const bestText = () => { const b = window.GHStats && GHStats.best(ID); return b != null ? b.toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " %" : "–"; };
  function renderChallenges() {
    const unlocked = window.GHStats ? GHStats.unlocked(ID) : 1;
    $("challenges").innerHTML = '<button class="ch' + (challenge < 0 ? " on" : "") + '" data-ch="-1">Frei</button>' +
      CIRCLE_CHALLENGES.map((c, i) => '<button class="ch' + (challenge === i ? " on" : "") + (i + 1 < unlocked ? " done" : "") + '" data-ch="' + i + '" title="' + c.desc + '"' + (i + 1 > unlocked ? " disabled" : "") + ">" + (i + 1 < unlocked ? "✓ " : "") + (i + 1) + "</button>").join("");
    if (!finished) $("info").textContent = challenge < 0 ? "Zeichne einen Kreis auf die Scheibe!" : "Herausforderung " + (challenge + 1) + " · " + CIRCLE_CHALLENGES[challenge].name + ": " + CIRCLE_CHALLENGES[challenge].desc;
    $("best").textContent = bestText();
  }
  $("challenges").addEventListener("click", (e) => {
    const b = e.target.closest("[data-ch]"); if (!b || b.disabled) return;
    challenge = +b.dataset.ch; reset();
  });

  let spin = 0;
  world.onUpdate((dt, t) => {
    disc.position.y = Math.sin(t * 1.2) * 0.12;
    if (spin > 0) { spin = Math.max(0, spin - dt * 0.8); disc.rotation.z = (1 - spin) * Math.PI * 2 * (spin > 0 ? 1 : 0); }
    rim.material.color.setHSL(0.86 + Math.sin(t) * 0.03, 0.75, 0.6);
  });

  renderChallenges();
  fit();
  world.start();
  GH3D.ready();
})();
