/* ==========================================================================
   GAMEHUB · 3D-Baukasten (three.js r128)
   Einheitliche Bildqualität für alle 3D-Spiele:
   ACES-Tone-Mapping, sRGB, Umgebungsreflexionen, weiche Schatten,
   leuchtende Materialien, Glow-Sprites, Partikel, Bildschirm-Wackeln.

   const world = GH3D.create({ container, camera: { fov, pos, target }, orbit, shadows, shadowBox });
   world.onUpdate((dt, t) => { ... });  // pro Bild
   world.start();
   ========================================================================== */
(function () {
  "use strict";
  const T = window.THREE;

  const lin = (hex) => new T.Color(hex).convertSRGBToLinear();

  function buildEnvironment(renderer) {
    const env = new T.Scene();
    const room = new T.Mesh(new T.BoxGeometry(40, 18, 40), new T.MeshBasicMaterial({ color: new T.Color(0.03, 0.015, 0.04), side: T.BackSide }));
    room.position.y = 7;
    env.add(room);
    const panel = (w, h, color, pos, rot) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color, side: T.DoubleSide }));
      m.position.set(...pos); m.rotation.set(...rot); env.add(m);
    };
    panel(18, 8, new T.Color(5.5, 5.2, 5), [0, 15.5, 0], [Math.PI / 2, 0, 0]);
    panel(8, 8, new T.Color(3.5, 0.9, 3.2), [-19.5, 6, -4], [0, Math.PI / 2, 0]);
    panel(8, 8, new T.Color(1.2, 1.8, 3.2), [19.5, 6, 4], [0, -Math.PI / 2, 0]);
    panel(12, 4, new T.Color(2.2, 2, 2), [0, 6, -19.5], [0, 0, 0]);
    const pmrem = new T.PMREMGenerator(renderer);
    const tex = pmrem.fromScene(env, 0.04).texture;
    pmrem.dispose();
    return tex;
  }

  let glowTexCache = null;
  function glowTexture() {
    if (glowTexCache) return glowTexCache;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.25, "rgba(255,255,255,0.5)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    glowTexCache = new T.CanvasTexture(c);
    return glowTexCache;
  }

  const GH3D = {
    lin,

    /** Glänzendes PBR-Material. opts: { color, emissive, glow (0..2), rough, metal, clearcoat, opacity } */
    mat(color, opts) {
      opts = opts || {};
      const m = new T.MeshPhysicalMaterial({
        color: lin(color),
        roughness: opts.rough != null ? opts.rough : 0.3,
        metalness: opts.metal != null ? opts.metal : 0.1,
        clearcoat: opts.clearcoat != null ? opts.clearcoat : 0.8,
        clearcoatRoughness: 0.2,
        envMapIntensity: opts.env != null ? opts.env : 1
      });
      if (opts.glow) { m.emissive = lin(opts.emissive || color); m.emissiveIntensity = opts.glow; }
      if (opts.opacity != null) { m.transparent = true; m.opacity = opts.opacity; }
      return m;
    },
    /** Selbstleuchtendes Material (für Neonkanten, Effekte) */
    neon(color, opacity) {
      const m = new T.MeshBasicMaterial({ color: lin(color), toneMapped: false });
      if (opacity != null) { m.transparent = true; m.opacity = opacity; m.depthWrite = false; }
      return m;
    },
    /** Weicher Leuchtpunkt (additives Sprite) */
    glow(color, size, opacity) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: glowTexture(), color: lin(color), transparent: true, opacity: opacity == null ? 0.9 : opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      s.scale.set(size, size, 1);
      return s;
    },
    /** Abgerundeter Würfel (für Blöcke, Plattformen) */
    roundedBox(w, h, d, r, seg) {
      // Innere Form (um r verkleinert) + Fase r → Gesamtmaß exakt w × h × d
      r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
      const iw = w - 2 * r, ih = h - 2 * r, cr = Math.min(iw, ih) * 0.2;
      const shape = new T.Shape();
      const x = -iw / 2, y = -ih / 2;
      shape.moveTo(x + cr, y);
      shape.lineTo(x + iw - cr, y); shape.quadraticCurveTo(x + iw, y, x + iw, y + cr);
      shape.lineTo(x + iw, y + ih - cr); shape.quadraticCurveTo(x + iw, y + ih, x + iw - cr, y + ih);
      shape.lineTo(x + cr, y + ih); shape.quadraticCurveTo(x, y + ih, x, y + ih - cr);
      shape.lineTo(x, y + cr); shape.quadraticCurveTo(x, y, x + cr, y);
      const g = new T.ExtrudeGeometry(shape, { depth: Math.max(0.0001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: seg || 3, curveSegments: 4 });
      g.translate(0, 0, -(d - 2 * r) / 2);
      g.computeVertexNormals();
      return g;
    },
    /** Text als Textur (z. B. Zahlen auf Feldern) */
    textTexture(text, color, opts) {
      opts = opts || {};
      const c = document.createElement("canvas");
      c.width = c.height = opts.size || 128;
      const g = c.getContext("2d");
      g.fillStyle = color || "#f6f2f9";
      g.font = (opts.weight || 800) + " " + Math.round(c.width * (opts.scale || 0.62)) + "px Inter, system-ui, sans-serif";
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(text, c.width / 2, c.height / 2 + c.height * 0.04);
      const t = new T.CanvasTexture(c);
      t.encoding = T.sRGBEncoding;
      t.anisotropy = 4;
      return t;
    },

    create(opts) {
      opts = opts || {};
      const container = opts.container || document.body;
      const scene = new T.Scene();
      const cam = opts.camera || {};
      const camera = new T.PerspectiveCamera(cam.fov || 45, innerWidth / innerHeight, 0.1, cam.far || 300);
      camera.position.set(...(cam.pos || [0, 10, 14]));

      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(devicePixelRatio, window.GH_TOUCH ? 1.75 : 2));
      renderer.setSize(innerWidth, innerHeight);
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = opts.exposure || 1.05;
      renderer.physicallyCorrectLights = true;
      if (opts.shadows !== false) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = T.PCFSoftShadowMap;
      }
      renderer.domElement.style.display = "block";
      renderer.domElement.style.touchAction = "none";
      container.appendChild(renderer.domElement);
      scene.environment = buildEnvironment(renderer);
      if (opts.fog) scene.fog = new T.Fog(lin(opts.fog.color || 0x06020a), opts.fog.near || 20, opts.fog.far || 60);

      // Licht
      const hemi = new T.HemisphereLight(0xffffff, 0x3a0d41, opts.ambient != null ? opts.ambient : 0.55);
      scene.add(hemi);
      const sun = new T.DirectionalLight(0xfff1e6, opts.sun != null ? opts.sun : 3);
      sun.position.set(...(opts.sunPos || [8, 20, 10]));
      if (opts.shadows !== false) {
        sun.castShadow = true;
        sun.shadow.mapSize.set(window.GH_TOUCH ? 1024 : 2048, window.GH_TOUCH ? 1024 : 2048);
        const b = opts.shadowBox || 14;
        Object.assign(sun.shadow.camera, { left: -b, right: b, top: b, bottom: -b, near: 1, far: 80 });
        sun.shadow.bias = -0.0004;
        sun.shadow.normalBias = 0.02;
      }
      scene.add(sun);
      scene.add(sun.target);
      const rim = new T.DirectionalLight(0xe254d6, opts.rim != null ? opts.rim : 2);
      rim.position.set(-14, 8, -12);
      scene.add(rim);
      const fill = new T.DirectionalLight(0x9cc3ff, 0.6);
      fill.position.set(14, 6, -6);
      scene.add(fill);

      let controls = null;
      if (opts.orbit && T.OrbitControls) {
        controls = new T.OrbitControls(camera, renderer.domElement);
        controls.target.set(...(cam.target || [0, 0, 0]));
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = false;
        Object.assign(controls, opts.orbit === true ? {} : opts.orbit);
      } else {
        camera.lookAt(new T.Vector3(...(cam.target || [0, 0, 0])));
      }

      const updaters = [];
      const particles = [];
      const partGeo = new T.SphereGeometry(0.05, 6, 4);
      const clock = new T.Clock();
      let time = 0, shake = 0;
      const basePos = new T.Vector3();

      const world = {
        scene, camera, renderer, controls, sun, hemi, rim,
        get time() { return time; },
        onUpdate(fn) { updaters.push(fn); return world; },
        /** Partikel-Explosion */
        burst(pos, color, n, power, size) {
          const mat = GH3D.neon(color);
          for (let i = 0; i < n && particles.length < 500; i++) {
            const m = new T.Mesh(partGeo, mat);
            m.position.copy(pos);
            m.scale.setScalar(size || 1);
            const v = new T.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize().multiplyScalar((power || 3) * (0.5 + Math.random()));
            scene.add(m);
            particles.push({ m, v, life: 0.6 + Math.random() * 0.4, size: size || 1 });
          }
        },
        shake(amount) { shake = Math.max(shake, amount); },
        resize() {
          camera.aspect = innerWidth / innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(innerWidth, innerHeight);
          if (opts.onResize) opts.onResize(world);
        },
        /** Bildschirmkoordinaten eines Punkts in der Welt */
        toScreen(v) {
          const p = v.clone().project(camera);
          const r = renderer.domElement.getBoundingClientRect();
          return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
        },
        /** Strahl von Bildschirmposition (clientX/Y) */
        ray(clientX, clientY) {
          const r = renderer.domElement.getBoundingClientRect();
          const rc = new T.Raycaster();
          rc.setFromCamera(new T.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), camera);
          return rc;
        },
        start() {
          addEventListener("resize", world.resize);
          world.resize();
          const loop = () => {
            requestAnimationFrame(loop);
            const dt = Math.min(0.05, clock.getDelta());
            time += dt;
            updaters.forEach((fn) => fn(dt, time));
            for (let i = particles.length - 1; i >= 0; i--) {
              const p = particles[i];
              p.life -= dt;
              p.v.y -= 6 * dt;
              p.m.position.addScaledVector(p.v, dt);
              p.m.scale.setScalar(Math.max(0.01, p.life * 1.4 * p.size));
              if (p.life <= 0) { scene.remove(p.m); particles.splice(i, 1); }
            }
            if (controls) controls.update();
            if (shake > 0) {
              basePos.copy(camera.position);
              camera.position.x += (Math.random() - 0.5) * shake;
              camera.position.y += (Math.random() - 0.5) * shake;
              renderer.render(scene, camera);
              camera.position.copy(basePos);
              shake = Math.max(0, shake - dt * 2);
            } else renderer.render(scene, camera);
          };
          loop();
          return world;
        }
      };
      return world;
    },

    /** Ladebildschirm ausblenden */
    ready() {
      const l = document.getElementById("loading");
      if (l) { l.style.opacity = 0; setTimeout(() => l.remove(), 500); }
    }
  };

  window.GH3D = GH3D;
})();
