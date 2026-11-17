/* Tetris – GAMEHUB-Design */
const COLS = 12, ROWS = 20;
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const levelElement = document.getElementById('level');
const bestElement = document.getElementById('best');
const overlay = document.getElementById('overlay');
const ovTitle = document.getElementById('ovTitle');
const ovText = document.getElementById('ovText');
const btnStart = document.getElementById('btnStart');

// Steinfarben im GAMEHUB-Look
const colors = [null, '#e254d6', '#ffc857', '#ff8e3c', '#38bdf8', '#9b5cf6', '#3ddc97', '#ff5470'];

function createPiece(type) {
    if (type === 'T') return [[0, 1, 0], [1, 1, 1], [0, 0, 0]];
    if (type === 'O') return [[2, 2], [2, 2]];
    if (type === 'L') return [[0, 0, 3], [3, 3, 3], [0, 0, 0]];
    if (type === 'J') return [[4, 0, 0], [4, 4, 4], [0, 0, 0]];
    if (type === 'I') return [[0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0]];
    if (type === 'S') return [[0, 6, 6], [6, 6, 0], [0, 0, 0]];
    if (type === 'Z') return [[7, 7, 0], [0, 7, 7], [0, 0, 0]];
}
const randomPiece = () => createPiece('ILJOTSZ'[Math.random() * 7 | 0]);

function createMatrix(w, h) {
    const m = [];
    while (h--) m.push(new Array(w).fill(0));
    return m;
}

/* ---------- Scharfe Canvas-Größen ---------- */
function fit(cnv, ctx, cols, rows) {
    const r = cnv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cnv.width = Math.round(r.width * dpr);
    cnv.height = Math.round(r.height * dpr);
    ctx.setTransform(cnv.width / cols, 0, 0, cnv.height / rows, 0, 0);
}
function resize() { fit(canvas, context, COLS, ROWS); fit(nextCanvas, nextCtx, 5, 5); draw(); drawNext(); }
window.addEventListener('resize', resize);

/* ---------- Zeichnen ---------- */
function block(ctx, x, y, color, alpha) {
    if (alpha != null) {
        // Geisterstein: nur Umriss
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 0.06;
        roundRect(ctx, x + 0.1, y + 0.1, 0.8, 0.8, 0.14);
        ctx.stroke();
        ctx.globalAlpha = 1;
        return;
    }
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(x, y, x + 1, y + 1);
    g.addColorStop(0, color);
    g.addColorStop(1, shade(color, -0.25));
    ctx.fillStyle = g;
    roundRect(ctx, x + 0.05, y + 0.05, 0.9, 0.9, 0.16);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    roundRect(ctx, x + 0.14, y + 0.12, 0.72, 0.16, 0.08);
    ctx.fill();
    ctx.globalAlpha = 1;
}
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
function shade(hex, p) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(c + c * p)));
    return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
}

function draw() {
    context.fillStyle = '#140a1a';
    context.fillRect(0, 0, COLS, ROWS);
    // Raster
    context.strokeStyle = 'rgba(255,255,255,0.035)';
    context.lineWidth = 0.03;
    for (let x = 1; x < COLS; x++) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, ROWS); context.stroke(); }
    for (let y = 1; y < ROWS; y++) { context.beginPath(); context.moveTo(0, y); context.lineTo(COLS, y); context.stroke(); }

    drawMatrix(context, arena, { x: 0, y: 0 });
    if (player.matrix && running) {
        // Geisterstein
        const ghost = { matrix: player.matrix, pos: { x: player.pos.x, y: player.pos.y } };
        while (!collide(arena, ghost)) ghost.pos.y++;
        ghost.pos.y--;
        drawMatrix(context, ghost.matrix, ghost.pos, 0.18);
        drawMatrix(context, player.matrix, player.pos);
    }
}

function drawMatrix(ctx, matrix, offset, alpha) {
    matrix.forEach((row, y) => row.forEach((v, x) => { if (v) block(ctx, x + offset.x, y + offset.y, colors[v], alpha); }));
}

function drawNext() {
    nextCtx.clearRect(0, 0, 5, 5);
    if (!next) return;
    const w = next[0].length, h = next.length;
    // Leere Zeilen/Spalten für die Zentrierung ignorieren
    let minX = w, maxX = -1, minY = h, maxY = -1;
    next.forEach((r, y) => r.forEach((v, x) => { if (v) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); } }));
    const ox = (5 - (maxX - minX + 1)) / 2 - minX, oy = (5 - (maxY - minY + 1)) / 2 - minY;
    drawMatrix(nextCtx, next, { x: ox, y: oy });
}

/* ---------- Logik ---------- */
function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) return true;
        }
    }
    return false;
}

function arenaSweep() {
    let rowCount = 1, cleared = 0;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) if (arena[y][x] === 0) continue outer;
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        player.score += rowCount * 10;
        rowCount *= 2;
        cleared++;
    }
    if (cleared) {
        player.lines += cleared;
        player.level = 1 + Math.floor(player.lines / 10);
        dropInterval = Math.max(110, 1000 - (player.level - 1) * 90);
    }
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) player.pos.x -= dir;
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
    if (dir > 0) matrix.forEach((row) => row.reverse());
    else matrix.reverse();
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        arenaSweep();
        playerReset();
        updateScore();
    }
    dropCounter = 0;
}

function hardDrop() {
    while (!collide(arena, player)) player.pos.y++;
    player.pos.y--;
    player.score += 2;
    playerDrop();
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => row.forEach((v, x) => { if (v) arena[y + player.pos.y][x + player.pos.x] = v; }));
}

function playerReset() {
    player.matrix = next || randomPiece();
    next = randomPiece();
    drawNext();
    player.pos.y = 0;
    player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) gameOver();
}

function updateScore() {
    scoreElement.innerText = player.score.toLocaleString('de-DE');
    linesElement.innerText = player.lines;
    levelElement.innerText = player.level;
}

function getBest() {
    const all = JSON.parse(localStorage.getItem('myWebGames')) || {};
    return (all.tetris && all.tetris.highscore) || 0;
}
function saveScore() {
    const all = JSON.parse(localStorage.getItem('myWebGames')) || {};
    if (!all.tetris || player.score > all.tetris.highscore) {
        all.tetris = { highscore: player.score };
        localStorage.setItem('myWebGames', JSON.stringify(all));
    }
}

/* ---------- Ablauf ---------- */
let dropCounter = 0, dropInterval = 1000, lastTime = 0, running = false, paused = false, next = null;
const arena = createMatrix(COLS, ROWS);
const player = { pos: { x: 0, y: 0 }, matrix: null, score: 0, lines: 0, level: 1 };

function start() {
    arena.forEach((row) => row.fill(0));
    player.score = 0; player.lines = 0; player.level = 1;
    dropInterval = 1000;
    next = null;
    playerReset();
    updateScore();
    running = true; paused = false;
    overlay.style.display = 'none';
}

function gameOver() {
    running = false;
    saveScore();
    bestElement.innerText = getBest().toLocaleString('de-DE');
    ovTitle.innerText = 'Spiel vorbei';
    ovText.innerText = player.score.toLocaleString('de-DE') + ' Punkte · ' + player.lines + ' Reihen';
    btnStart.innerText = 'Nochmal spielen';
    overlay.style.display = 'grid';
}

function togglePause() {
    if (!running) return;
    paused = !paused;
    ovTitle.innerText = 'Pause';
    ovText.innerText = 'Drücke P, um weiterzuspielen.';
    btnStart.innerText = 'Weiter';
    overlay.style.display = paused ? 'grid' : 'none';
}

function update(time = 0) {
    const delta = time - lastTime;
    lastTime = time;
    if (running && !paused) {
        dropCounter += delta;
        if (dropCounter > dropInterval) playerDrop();
    }
    draw();
    requestAnimationFrame(update);
}

document.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) e.preventDefault();
    if (!running) { if (e.key === 'Enter' || e.key === ' ') start(); return; }
    if (e.key.toLowerCase() === 'p') return togglePause();
    if (paused) return;
    if (e.key === 'ArrowLeft') playerMove(-1);
    else if (e.key === 'ArrowRight') playerMove(1);
    else if (e.key === 'ArrowDown') { playerDrop(); player.score += 1; updateScore(); }
    else if (e.key === 'ArrowUp') playerRotate(1);
    else if (e.key === ' ') { hardDrop(); updateScore(); }
});
btnStart.onclick = () => { if (paused) togglePause(); else start(); };

bestElement.innerText = getBest().toLocaleString('de-DE');
player.matrix = null;
resize();
update();
