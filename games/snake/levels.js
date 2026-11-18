/* ==========================================================================
   Snake – Level (gemeinsam für Snake 2D und Snake 3D)
   Spielfeld 20 × 20. Start: Kopf bei (9,10), Richtung rechts.
   goal = Äpfel bis zum nächsten Level, speed = ms pro Schritt
   ========================================================================== */
(function () {
  const N = 20;
  const rect = (x, y, w, h) => { const o = []; for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) o.push([i, j]); return o; };
  const hline = (x1, x2, y) => rect(x1, y, x2 - x1 + 1, 1);
  const vline = (x, y1, y2) => rect(x, y1, 1, y2 - y1 + 1);
  const frame = (x, y, w, h) => [...hline(x, x + w - 1, y), ...hline(x, x + w - 1, y + h - 1), ...vline(x, y, y + h - 1), ...vline(x + w - 1, y, y + h - 1)];
  const gap = (walls, holes) => walls.filter(([x, y]) => !holes.some(([a, b]) => a === x && b === y));

  const LEVELS = [
    { name: "Aufwärmen",   goal: 6,  speed: 150, walls: [] },
    { name: "Säulen",      goal: 8,  speed: 145, walls: [...rect(4, 4, 2, 2), ...rect(14, 4, 2, 2), ...rect(4, 14, 2, 2), ...rect(14, 14, 2, 2)] },
    { name: "Mittelkreuz", goal: 10, speed: 140, walls: gap([...hline(5, 14, 6), ...hline(5, 14, 14)], [[9, 6], [10, 6], [9, 14], [10, 14]]) },
    { name: "Korridore",   goal: 10, speed: 135, walls: [...hline(0, 12, 5), ...hline(7, 19, 15)] },
    { name: "Rahmen",      goal: 12, speed: 130, walls: gap(frame(2, 2, 16, 16), [[9, 2], [10, 2], [9, 17], [10, 17], [2, 9], [17, 9], [2, 10], [17, 10]]) },
    { name: "Kamm",        goal: 12, speed: 125, walls: [...[3, 7, 11, 15].flatMap((x) => vline(x, 0, 6)), ...[5, 9, 13, 17].flatMap((x) => vline(x, 13, 19))] },
    { name: "Käfig",       goal: 14, speed: 120, walls: gap([...frame(5, 13, 10, 5), ...frame(5, 2, 10, 5)], [[9, 6], [10, 6], [9, 13], [10, 13]]) },
    { name: "Treppe",      goal: 14, speed: 115, walls: [[3, 3], [4, 3], [5, 4], [6, 4], [7, 5], [8, 5], [11, 14], [12, 14], [13, 15], [14, 15], [15, 16], [16, 16], ...vline(16, 2, 7), ...vline(3, 13, 17)] },
    { name: "Labyrinth",   goal: 16, speed: 110, walls: [...hline(2, 8, 4), ...hline(11, 17, 4), ...vline(2, 4, 8), ...vline(17, 4, 8), ...hline(2, 8, 16), ...hline(11, 17, 16), ...vline(2, 12, 16), ...vline(17, 12, 16), ...rect(9, 13, 2, 2)] },
    { name: "Finale",      goal: 20, speed: 95,  walls: [...frame(1, 1, 18, 18).filter(([x, y]) => (x + y) % 3 !== 0), ...rect(9, 4, 2, 3), ...rect(9, 14, 2, 3)] }
  ];

  // Startspur (Zeile 10, Spalten 3–16) immer frei halten
  LEVELS.forEach((l) => { l.walls = l.walls.filter(([x, y]) => !(y === 10 && x >= 3 && x <= 16) && x >= 0 && y >= 0 && x < N && y < N); });

  window.SNAKE_LEVELS = LEVELS;
  window.SNAKE_CLASSIC = { name: "Klassik", goal: Infinity, speed: 140, walls: [], classic: true };
  window.SNAKE_SIZE = N;
})();
