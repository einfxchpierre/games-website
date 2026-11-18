/* Tetris 2D – GAMEHUB · Marathon / Sprint / Ultra · Touch · Statistik (Logik: core.js) */
(function () {
  const COLS = 12, ROWS = 20;
  const game = new TetrisCore({ cols: COLS, rows: ROWS });
  const COLORS = TetrisCore.COLORS, MODES = TetrisCore.MODES;
  const $ = (id) => document.getElementById(id);
  const canvas = $("tetris"), ctx = canvas.getContext("2d");
  const nextCanvas = $("next"), nctx = nextCanvas.getContext("2d");
  let mode = localStorage.getItem("tetris_mode") || "marathon";
  let flash = [];

  function fit(cnv, c, cols, rows) {
    const r = cnv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cnv.width = Math.round(r.width * dpr); cnv.height = Math.round(r.height * dpr);
    c.setTransform(cnv.width / cols, 0, 0, cnv.height / rows, 0, 0);
  }
  function resize() { fit(canvas, ctx, COLS, ROWS); fit(nextCanvas, nctx, 5, 5); draw(); drawNext(); }
  addEventListener("resize", resize);

  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function shade(hex, p) {
    const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v + v * p)));
    return "rgb(" + f(n >> 16) + "," + f((n >> 8) & 255) + "," + f(n & 255) + ")";
  }
  function block(c, x, y, color, ghost) {
    if (ghost) {
      c.strokeStyle = color; c.globalAlpha = 0.55; c.lineWidth = 0.06;
      rr(c, x + 0.1, y + 0.1, 0.8, 0.8, 0.14); c.stroke(); c.globalAlpha = 1; return;
    }
    const g = c.createLinearGradient(x, y, x + 1, y + 1);
    g.addColorStop(0, color); g.addColorStop(1, shade(color, -0.25));
    c.fillStyle = g; rr(c, x + 0.05, y + 0.05, 0.9, 0.9, 0.16); c.fill();
    c.fillStyle = "rgba(255,255,255,0.22)"; rr(c, x + 0.14, y + 0.12, 0.72, 0.16, 0.08); c.fill();
  }
  function drawMatrix(c, m, off, ghost) { m.forEach((row, y) => row.forEach((v, x) => { if (v && y + off.y >= 0) block(c, x + off.x, y + off.y, COLORS[v], ghost); })); }

  function draw() {
    ctx.fillStyle = "#140a1a"; ctx.fillRect(0, 0, COLS, ROWS);
    ctx.strokeStyle = "rgba(255,255,255,0.035)"; ctx.lineWidth = 0.03;
    for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ROWS); ctx.stroke(); }
    for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(COLS, y); ctx.stroke(); }
    drawMatrix(ctx, game.arena, { x: 0, y: 0 });
    if (game.piece && game.running) {
      drawMatrix(ctx, game.piece.matrix, { x: game.piece.pos.x, y: game.ghostY() }, true);
      drawMatrix(ctx, game.piece.matrix, game.piece.pos);
    }
    // Aufblitzen gelöschter Reihen
    const now = performance.now();
    flash = flash.filter((f) => now - f.t < 260);
    flash.forEach((f) => { ctx.fillStyle = "rgba(255,255,255," + (0.5 * (1 - (now - f.t) / 260)) + ")"; ctx.fillRect(0, f.y, COLS, 1); });
  }
  function drawNext() {
    nctx.clearRect(0, 0, 5, 5);
    const m = game.next; if (!m) return;
    let minX = 9, maxX = -1, minY = 9, maxY = -1;
    m.forEach((r, y) => r.forEach((v, x) => { if (v) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); } }));
    drawMatrix(nctx, m, { x: (5 - (maxX - minX + 1)) / 2 - minX, y: (5 - (maxY - minY + 1)) / 2 - minY });
  }

  const fmtTime = (ms) => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  function bestText() {
    if (!window.GHStats) return "0";
    if (mode === "sprint") { const b = GHStats.progress("tetris", "sprint"); return b ? (b / 1000).toFixed(2).replace(".", ",") + " s" : "–"; }
    if (mode === "ultra") return (GHStats.progress("tetris", "ultra") || 0).toLocaleString("de-DE");
    return (GHStats.best("tetris") || 0).toLocaleString("de-DE");
  }
  function hud() {
    $("score").textContent = game.score.toLocaleString("de-DE");
    $("lines").textContent = mode === "sprint" ? game.lines + "/40" : game.lines;
    $("level").textContent = game.level;
    const m = MODES[mode];
    $("timeLabel").textContent = m.time ? "Restzeit" : "Zeit";
    $("time").textContent = fmtTime(m.time ? Math.max(0, m.time - game.elapsed) : game.elapsed);
    $("modeName").textContent = MODES[mode].name;
  }

  function buildModes() {
    $("modes").innerHTML = Object.keys(MODES).map((k) => '<button class="gh-btn' + (k === mode ? " gh-btn-white" : "") + '" data-mode="' + k + '">' + MODES[k].name + "</button>").join("");
    $("ovText").textContent = MODES[mode].desc;
    $("best").textContent = bestText();
  }
  $("modes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]"); if (!b) return;
    mode = b.dataset.mode; localStorage.setItem("tetris_mode", mode);
    buildModes(); hud();
  });

  function start() {
    game.start(mode);
    $("overlay").style.display = "none";
    drawNext(); hud();
  }
  $("btnStart").onclick = () => { if (game.paused) game.togglePause(); else start(); };

  game.on("change", () => { hud(); drawNext(); });
  game.on("clear", (d) => { const t = performance.now(); d.rows.forEach((y, i) => flash.push({ y: y + i * 0, t })); });
  game.on("pause", (p) => {
    $("ovTitle").textContent = "Pause"; $("ovText").textContent = "Drücke P, um weiterzuspielen.";
    $("modes").style.display = "none"; $("btnStart").textContent = "Weiter";
    $("overlay").style.display = p ? "grid" : "none";
  });
  game.on("over", (r) => {
    const text = game.saveResult("tetris");
    $("ovTitle").textContent = r.won ? (mode === "sprint" ? "Sprint geschafft!" : "Zeit abgelaufen!") : "Spiel vorbei";
    $("modes").style.display = "";
    buildModes();
    $("ovText").textContent = text;
    $("btnStart").textContent = "Nochmal spielen";
    $("overlay").style.display = "grid";
  });

  document.addEventListener("keydown", (e) => {
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

  // Touch: Tasten + Wischen auf dem Spielfeld
  GHTouch.dpad({ left: "ArrowLeft", right: "ArrowRight", down: "ArrowDown" }, { side: "left", repeat: true });
  GHTouch.buttons([{ label: "II", key: "p" }, { label: "⤓", key: " " }, { label: "↻", key: "ArrowUp", big: true }], { side: "right" });
  GHTouch.swipe(canvas, { left: "ArrowLeft", right: "ArrowRight", down: " ", up: "ArrowUp", tap: "ArrowUp" });

  let last = performance.now();
  function loop(t) {
    game.update(t - last);
    last = t;
    if (game.running && !game.paused) hud();
    draw();
    requestAnimationFrame(loop);
  }

  buildModes();
  resize();
  hud();
  requestAnimationFrame(loop);
})();
