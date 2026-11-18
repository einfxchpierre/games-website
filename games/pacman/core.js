/* ==========================================================================
   Pac Man – gemeinsame Spiellogik für Pac Man 2D und Pac Man 3D
   Drei Labyrinthe, Level mit steigendem Tempo, Scatter/Chase-KI.
   Positionen in "Einheiten": 1 Feld = 20 Einheiten (ganzzahlige Schritte,
   dadurch bleiben Figuren immer exakt auf dem Raster).
   Zeichen: # Wand · . Punkt · o Kraftpille · - Tür · G Geisterhaus
            B Start Blinky · P Start Pac-Man · Leerzeichen = frei
   ========================================================================== */
(function () {
  "use strict";
  const T = 20;
  const MAZES = [
    { name: "Klassik", rows: [
      "###########################",
      "#o...........#...........o#",
      "#.####.#####.#.#####.####.#",
      "#.........................#",
      "#.####.#.#########.#.####.#",
      "#.........................#",
      "####.##.#.#######.#.##.####",
      "####.##.     B     .##.####",
      "####.##.# ###-### #.##.####",
      "    .   # #GGGGG# #   .    ",
      "####.##.# ####### #.##.####",
      "####.##.     P     .##.####",
      "#o.....#...........#.....o#",
      "#.........................#",
      "###########################"
    ] },
    { name: "Zickzack", rows: [
      "###########################",
      "#o.......................o#",
      "#.#####.###.###.###.#####.#",
      "#.#.....................#.#",
      "#.#.###.###.###.###.###.#.#",
      "#.......#.........#.......#",
      "####.##.#.#######.#.##.####",
      "####.##.     B     .##.####",
      "####.##.# ###-### #.##.####",
      "    .   # #GGGGG# #   .    ",
      "####.##.# ####### #.##.####",
      "####.##.     P     .##.####",
      "#o.....#.#.#####.#.#.....o#",
      "#.........................#",
      "###########################"
    ] },
    { name: "Festung", rows: [
      "###########################",
      "#o.........#...#.........o#",
      "#.###.###..#...#..###.###.#",
      "#.#.....#.........#.....#.#",
      "#.#.###.#.#######.#.###.#.#",
      "#.......#....#....#.......#",
      "####.##.####.#.####.##.####",
      "####.##.     B     .##.####",
      "####.##.# ###-### #.##.####",
      "    .   # #GGGGG# #   .    ",
      "####.##.# ####### #.##.####",
      "####.##.     P     .##.####",
      "#o.......#.#####.#.......o#",
      "#.........................#",
      "###########################"
    ] }
  ];

  const GHOSTS = [
    { type: "blinky", color: "#ff5470", corner: [25, 0] },
    { type: "pinky",  color: "#e254d6", corner: [1, 0] },
    { type: "inky",   color: "#38bdf8", corner: [26, 14] },
    { type: "clyde",  color: "#ff8e3c", corner: [0, 14] }
  ];
  const DIRS = [[0, -1], [-1, 0], [0, 1], [1, 0]];

  class PacCore {
    constructor() { this.listeners = {}; this.score = 0; this.lives = 3; this.level = 1; this.state = "idle"; this.loadMaze(0); this.resetActors(); }
    on(e, f) { (this.listeners[e] = this.listeners[e] || []).push(f); return this; }
    emit(e, d) { (this.listeners[e] || []).forEach((f) => f(d)); }

    get cols() { return 27; }
    get rows() { return 15; }
    get mazeIndex() { return (this.level - 1) % MAZES.length; }
    get mazeName() { return MAZES[this.mazeIndex].name; }

    loadMaze(i) {
      const rows = MAZES[i].rows;
      this.grid = rows.map((r) => r.split("").map((c) => ({ "#": 1, ".": 2, o: 3, "-": 4, G: 5 }[c] || 0)));
      this.pellets = this.grid.flat().filter((v) => v === 2 || v === 3).length;
      this.start = {};
      rows.forEach((r, y) => r.split("").forEach((c, x) => { if (c === "P") this.start.pac = [x, y]; if (c === "B") this.start.blinky = [x, y]; }));
      const house = [];
      rows.forEach((r, y) => r.split("").forEach((c, x) => { if (c === "G") house.push([x, y]); }));
      this.house = house;
    }

    newGame() {
      this.score = 0; this.lives = 3; this.level = 1; this.extraLife = false;
      this.loadMaze(0);
      this.resetActors();
      this.state = "ready"; this.readyTimer = 90;
      this.emit("change");
    }
    nextLevel() {
      this.level++;
      this.loadMaze(this.mazeIndex);
      this.resetActors();
      this.state = "ready"; this.readyTimer = 90;
      this.emit("level", this.level);
      this.emit("change");
    }

    get pacSpeed() { return Math.min(2.6, 2 + (this.level - 1) * 0.1); }
    get ghostSpeed() { return Math.min(2.5, 1.7 + (this.level - 1) * 0.15); }
    get frightTime() { return Math.max(120, 420 - (this.level - 1) * 45); }

    resetActors() {
      const [px, py] = this.start.pac, [bx, by] = this.start.blinky;
      this.pac = { x: px * T, y: py * T, dx: 0, dy: 0, ndx: -1, ndy: 0, acc: 0, mouth: 0 };
      const mid = this.house[Math.floor(this.house.length / 2)];
      this.ghosts = GHOSTS.map((g, i) => ({
        ...g, i,
        x: (i === 0 ? bx : mid[0] + (i - 2) * 2) * T, y: (i === 0 ? by : mid[1]) * T,
        dx: i === 0 ? -1 : 0, dy: 0, acc: 0,
        inHouse: i !== 0, release: 60 + i * 120, eaten: false
      }));
      this.fright = 0; this.combo = 0;
      this.modeTimer = 0;
    }

    cell(x, y) {
      if (y < 0 || y >= this.rows) return 1;
      x = (x + this.cols) % this.cols;
      return this.grid[y][x];
    }
    walkable(x, y, ghost) { const c = this.cell(x, y); return c !== 1 && c !== 4 && c !== 5; }

    setDir(dx, dy) { this.pac.ndx = dx; this.pac.ndy = dy; }

    // Scatter 7 s / Chase 20 s im Wechsel (60 Bilder = 1 s)
    get scatter() { const t = this.modeTimer % (27 * 60); return t < 7 * 60; }

    target(g) {
      const p = this.pac, px = Math.round(p.x / T), py = Math.round(p.y / T);
      if (this.scatter) return g.corner;
      if (g.type === "blinky") return [px, py];
      if (g.type === "pinky") return [px + p.dx * 4, py + p.dy * 4];
      if (g.type === "inky") {
        const b = this.ghosts[0], tx = px + p.dx * 2, ty = py + p.dy * 2;
        return [tx + (tx - Math.round(b.x / T)), ty + (ty - Math.round(b.y / T))];
      }
      const gx = Math.round(g.x / T), gy = Math.round(g.y / T);
      return (gx - px) ** 2 + (gy - py) ** 2 > 64 ? [px, py] : g.corner;
    }

    stepPac() {
      const p = this.pac;
      if (p.x % T === 0 && p.y % T === 0) {
        const gx = p.x / T, gy = p.y / T;
        const c = this.cell(gx, gy);
        if (c === 2 || c === 3) {
          this.grid[gy][(gx + this.cols) % this.cols] = 0;
          this.pellets--;
          this.score += c === 2 ? 10 : 50;
          this.emit(c === 2 ? "eat" : "power", { x: gx, y: gy });
          if (c === 3) { this.fright = this.frightTime; this.combo = 0; this.ghosts.forEach((g) => { if (!g.inHouse && !g.eaten) { g.dx = -g.dx; g.dy = -g.dy; } }); }
          if (!this.extraLife && this.score >= 10000) { this.extraLife = true; this.lives++; this.emit("extralife"); }
          if (this.pellets <= 0) { this.state = "clear"; this.clearTimer = 120; this.emit("clear"); return; }
        }
        if (this.walkable(gx + p.ndx, gy + p.ndy)) { p.dx = p.ndx; p.dy = p.ndy; }
        if (!this.walkable(gx + p.dx, gy + p.dy)) { p.dx = 0; p.dy = 0; }
      } else if (p.ndx === -p.dx && p.ndy === -p.dy) { p.dx = p.ndx; p.dy = p.ndy; } // sofort umdrehen
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x += this.cols * T;
      if (p.x >= this.cols * T) p.x -= this.cols * T;
    }

    stepGhost(g) {
      if (g.x % T === 0 && g.y % T === 0) {
        const gx = g.x / T, gy = g.y / T;
        let options = DIRS.filter(([dx, dy]) => !(dx === -g.dx && dy === -g.dy) && this.walkable(gx + dx, gy + dy, true));
        if (!options.length) options = [[-g.dx, -g.dy]];
        let choice;
        if (this.fright > 0 && !g.eaten) choice = options[Math.floor(Math.random() * options.length)];
        else {
          const [tx, ty] = this.target(g);
          let best = Infinity;
          options.forEach((o) => { const d = (gx + o[0] - tx) ** 2 + (gy + o[1] - ty) ** 2; if (d < best) { best = d; choice = o; } });
        }
        g.dx = choice[0]; g.dy = choice[1];
      }
      g.x += g.dx; g.y += g.dy;
      if (g.x < 0) g.x += this.cols * T;
      if (g.x >= this.cols * T) g.x -= this.cols * T;
    }

    // Bewegung mit Akkumulator: Geschwindigkeit in Einheiten/Bild, aber Schritte immer 1 Einheit
    move(actor, speed, stepFn) {
      actor.acc += speed;
      while (actor.acc >= 1) { actor.acc -= 1; stepFn(actor); if (this.state !== "play") return; }
    }

    update() {
      if (this.state === "ready") { if (--this.readyTimer <= 0) { this.state = "play"; this.emit("go"); } return; }
      if (this.state === "dying") { if (--this.deathTimer <= 0) this.afterDeath(); return; }
      if (this.state === "clear") { if (--this.clearTimer <= 0) this.nextLevel(); return; }
      if (this.state !== "play") return;

      this.modeTimer++;
      if (this.fright > 0) this.fright--;
      this.pac.mouth += 0.25;
      this.move(this.pac, this.pacSpeed, () => this.stepPac());
      if (this.state !== "play") return;

      for (const g of this.ghosts) {
        if (g.inHouse) {
          if (--g.release <= 0) {
            g.inHouse = false; g.eaten = false;
            g.x = this.start.blinky[0] * T; g.y = this.start.blinky[1] * T; g.dx = g.i % 2 ? 1 : -1; g.dy = 0; g.acc = 0;
          }
          continue;
        }
        const sp = this.fright > 0 ? this.ghostSpeed * 0.55 : this.ghostSpeed;
        this.move(g, sp, (a) => this.stepGhost(a));
        // Kollision
        const d = Math.hypot(this.pac.x - g.x, this.pac.y - g.y);
        if (d < T * 0.7) {
          if (this.fright > 0) {
            this.combo++;
            const pts = 200 * Math.pow(2, this.combo - 1);
            this.score += pts;
            this.emit("ghost", { g, pts });
            const mid = this.house[Math.floor(this.house.length / 2)];
            g.inHouse = true; g.release = 150; g.x = mid[0] * T; g.y = mid[1] * T;
          } else {
            this.state = "dying"; this.deathTimer = 90;
            this.emit("death");
            return;
          }
        }
      }
    }

    afterDeath() {
      this.lives--;
      if (this.lives <= 0) { this.state = "over"; this.emit("over", { score: this.score, level: this.level }); return; }
      this.resetActors();
      this.state = "ready"; this.readyTimer = 60;
      this.emit("change");
    }
  }

  PacCore.TILE = T;
  PacCore.MAZES = MAZES;
  window.PacCore = PacCore;
})();
