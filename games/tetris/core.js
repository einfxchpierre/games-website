/* ==========================================================================
   Tetris – gemeinsame Spiellogik für Tetris 2D und Tetris 3D
   Modi: marathon (endlos, Level steigt), sprint (40 Reihen auf Zeit),
         ultra (möglichst viele Punkte in 2 Minuten)
   ========================================================================== */
(function () {
  "use strict";

  const SHAPES = {
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    O: [[2, 2], [2, 2]],
    L: [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
    J: [[4, 0, 0], [4, 4, 4], [0, 0, 0]],
    I: [[0, 0, 0, 0], [5, 5, 5, 5], [0, 0, 0, 0], [0, 0, 0, 0]],
    S: [[0, 6, 6], [6, 6, 0], [0, 0, 0]],
    Z: [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
  };
  const COLORS = [null, "#e254d6", "#ffc857", "#ff8e3c", "#38bdf8", "#9b5cf6", "#3ddc97", "#ff5470"];
  const MODES = {
    marathon: { name: "Marathon", desc: "Endlos – das Tempo steigt mit jedem Level." },
    sprint:   { name: "Sprint",   desc: "40 Reihen so schnell wie möglich.", lines: 40 },
    ultra:    { name: "Ultra",    desc: "So viele Punkte wie möglich in 2 Minuten.", time: 120000 }
  };
  const LINE_SCORE = [0, 100, 300, 500, 800];

  class TetrisCore {
    constructor(opts) {
      opts = opts || {};
      this.cols = opts.cols || 10;
      this.rows = opts.rows || 20;
      this.mode = opts.mode || "marathon";
      this.listeners = {};
      this.reset();
    }
    on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); return this; }
    emit(ev, d) { (this.listeners[ev] || []).forEach((f) => f(d)); }

    reset() {
      this.arena = Array.from({ length: this.rows }, () => new Array(this.cols).fill(0));
      this.score = 0; this.lines = 0; this.level = 1;
      this.elapsed = 0; this.dropCounter = 0;
      this.over = false; this.won = false; this.running = false; this.paused = false;
      this.bag = []; this.next = null; this.piece = null;
    }
    start(mode) {
      if (mode) this.mode = mode;
      this.reset();
      this.running = true;
      this.spawn();
      this.emit("change");
    }
    get dropInterval() { return Math.max(70, 1000 * Math.pow(0.86, this.level - 1)); }

    randomShape() {
      if (!this.bag.length) this.bag = Object.keys(SHAPES).sort(() => Math.random() - 0.5); // 7er-Beutel
      return SHAPES[this.bag.pop()].map((r) => r.slice());
    }
    spawn() {
      this.piece = { matrix: this.next || this.randomShape(), pos: { x: 0, y: 0 } };
      this.next = this.randomShape();
      this.piece.pos.x = ((this.cols / 2) | 0) - ((this.piece.matrix[0].length / 2) | 0);
      this.piece.pos.y = this.piece.matrix[0].every((v) => !v) ? -1 : 0;
      if (this.collide(this.piece)) this.finish(false);
    }
    collide(p) {
      const m = p.matrix, o = p.pos;
      for (let y = 0; y < m.length; y++) for (let x = 0; x < m[y].length; x++) {
        if (!m[y][x]) continue;
        const ay = y + o.y, ax = x + o.x;
        if (ax < 0 || ax >= this.cols || ay >= this.rows) return true;
        if (ay >= 0 && this.arena[ay][ax]) return true;
      }
      return false;
    }
    move(dir) {
      if (!this.active()) return;
      this.piece.pos.x += dir;
      if (this.collide(this.piece)) this.piece.pos.x -= dir;
      else this.emit("move");
    }
    rotate(dir) {
      if (!this.active()) return;
      dir = dir || 1;
      const m = this.piece.matrix, x0 = this.piece.pos.x;
      this._rot(m, dir);
      let off = 1;
      while (this.collide(this.piece)) {
        this.piece.pos.x += off;
        off = -(off + (off > 0 ? 1 : -1));
        if (Math.abs(off) > m[0].length + 1) { this._rot(m, -dir); this.piece.pos.x = x0; return; }
      }
      this.emit("rotate");
    }
    _rot(m, dir) {
      for (let y = 0; y < m.length; y++) for (let x = 0; x < y; x++) [m[x][y], m[y][x]] = [m[y][x], m[x][y]];
      if (dir > 0) m.forEach((r) => r.reverse()); else m.reverse();
    }
    softDrop() {
      if (!this.active()) return;
      this.piece.pos.y++;
      if (this.collide(this.piece)) { this.piece.pos.y--; this.lock(); }
      else this.score += 1;
      this.dropCounter = 0;
      this.emit("change");
    }
    hardDrop() {
      if (!this.active()) return;
      let n = 0;
      while (!this.collide(this.piece)) { this.piece.pos.y++; n++; }
      this.piece.pos.y--;
      this.score += Math.max(0, n - 1) * 2;
      this.lock();
      this.emit("harddrop");
      this.emit("change");
    }
    ghostY() {
      if (!this.piece) return 0;
      const g = { matrix: this.piece.matrix, pos: { x: this.piece.pos.x, y: this.piece.pos.y } };
      while (!this.collide(g)) g.pos.y++;
      return g.pos.y - 1;
    }
    lock() {
      const p = this.piece;
      p.matrix.forEach((r, y) => r.forEach((v, x) => { if (v && y + p.pos.y >= 0) this.arena[y + p.pos.y][x + p.pos.x] = v; }));
      const full = [];
      for (let y = this.rows - 1; y >= 0; y--) if (this.arena[y].every((v) => v)) full.push(y);
      if (full.length) {
        full.sort((a, b) => a - b).forEach((y) => { this.arena.splice(y, 1); this.arena.unshift(new Array(this.cols).fill(0)); });
        this.score += LINE_SCORE[full.length] * this.level;
        this.lines += full.length;
        const newLevel = 1 + Math.floor(this.lines / 10);
        if (newLevel > this.level && this.mode === "marathon") { this.level = newLevel; this.emit("levelup", this.level); }
        else if (this.mode !== "marathon") this.level = Math.min(newLevel, 10);
        this.emit("clear", { rows: full, count: full.length });
      }
      this.emit("lock");
      const m = MODES[this.mode];
      if (m.lines && this.lines >= m.lines) return this.finish(true);
      this.spawn();
    }
    finish(won) {
      this.over = true; this.won = won; this.running = false;
      this.emit("over", { won, score: this.score, lines: this.lines, time: this.elapsed, mode: this.mode });
    }
    active() { return this.running && !this.paused && !this.over && this.piece; }
    update(dt) {
      if (!this.active()) return;
      this.elapsed += dt;
      const m = MODES[this.mode];
      if (m.time && this.elapsed >= m.time) { this.elapsed = m.time; return this.finish(true); }
      this.dropCounter += dt;
      if (this.dropCounter > this.dropInterval) {
        this.piece.pos.y++;
        if (this.collide(this.piece)) { this.piece.pos.y--; this.lock(); }
        this.dropCounter = 0;
        this.emit("change");
      }
    }
    togglePause() { if (this.running && !this.over) { this.paused = !this.paused; this.emit("pause", this.paused); } }

    // Ergebnis in GHStats speichern; gibt Text für den Ergebnisdialog zurück
    saveResult(gameId) {
      const S = window.GHStats;
      if (!S) return "";
      const fmtTime = (ms) => (ms / 1000).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " s";
      if (this.mode === "sprint") {
        if (!this.won) return "Sprint nicht geschafft – " + this.lines + "/40 Reihen.";
        const prev = S.progress(gameId, "sprint");
        if (prev == null || this.elapsed < prev) S.progress(gameId, "sprint", this.elapsed);
        S.record(gameId + ":sprint", this.elapsed, { lowerIsBetter: true });
        return "Zeit: " + fmtTime(this.elapsed) + " · Bestzeit: " + fmtTime(S.progress(gameId, "sprint"));
      }
      if (this.mode === "ultra") {
        const prev = S.progress(gameId, "ultra") || 0;
        if (this.score > prev) S.progress(gameId, "ultra", this.score);
        return this.score.toLocaleString("de-DE") + " Punkte in 2 Minuten · Bestwert: " + S.progress(gameId, "ultra").toLocaleString("de-DE");
      }
      const r = S.record(gameId, this.score);
      return this.score.toLocaleString("de-DE") + " Punkte · " + this.lines + " Reihen · Bestwert: " + r.best.toLocaleString("de-DE");
    }
  }

  TetrisCore.COLORS = COLORS;
  TetrisCore.MODES = MODES;
  window.TetrisCore = TetrisCore;
})();
