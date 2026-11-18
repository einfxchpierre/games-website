/* Snake 2D – GAMEHUB · Klassik + 10 Level · Touch · Statistik */
const CELLS = window.SNAKE_SIZE, BOX = 20, SIZE = CELLS * BOX;
const canvas = document.getElementById("snakeCanvas");
const ctx = canvas.getContext("2d");
const $ = (id) => document.getElementById(id);

let level = null, levelIndex = -1, runScore = 0, eaten = 0;
let direction, nextDirection, snake, apple, walls, wallSet, loop = null, paused = false, tick = 0, running = false;

function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(canvas.width / SIZE, 0, 0, canvas.height / SIZE, 0, 0);
    draw();
}
addEventListener("resize", resize);

const best = () => (window.GHStats && GHStats.best("snake")) || 0;

/* ---------- Menü ---------- */
function buildMenu() {
    const unlocked = window.GHStats ? GHStats.unlocked("snake") : 1;
    $("levelGrid").innerHTML = SNAKE_LEVELS.map((l, i) =>
        '<button class="lvl' + (i + 1 > unlocked ? " locked" : "") + '" data-level="' + i + '" title="' + l.name + '"' + (i + 1 > unlocked ? " disabled" : "") + '>' + (i + 1) + "</button>"
    ).join("");
    $("bestScore").textContent = best();
}
function showMenu(title, text) {
    $("ovTitle").textContent = title || "Snake";
    $("ovText").textContent = text || "Wähle Klassik oder ein Level.";
    $("menu").hidden = false;
    $("after").hidden = true;
    buildMenu();
    $("overlay").style.display = "grid";
}
function showAfter(title, text, btn) {
    $("ovTitle").textContent = title;
    $("ovText").textContent = text;
    $("menu").hidden = true;
    $("after").hidden = false;
    $("btnStart").textContent = btn;
    $("overlay").style.display = "grid";
}

/* ---------- Spielstart ---------- */
function startLevel(i, keepScore) {
    levelIndex = i;
    level = i < 0 ? SNAKE_CLASSIC : SNAKE_LEVELS[i];
    if (!keepScore) runScore = 0;
    eaten = 0;
    walls = level.walls;
    wallSet = new Set(walls.map(([x, y]) => x + "," + y));
    direction = nextDirection = "RIGHT";
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    apple = spawnApple();
    $("levelLabel").textContent = i < 0 ? "Modus" : "Level " + (i + 1);
    $("levelName").textContent = i < 0 ? "Klassik" : level.name + " · " + eaten + "/" + level.goal;
    $("currentScore").textContent = runScore;
    $("overlay").style.display = "none";
    paused = false; running = true;
    clearInterval(loop);
    loop = setInterval(update, level.speed);
    draw();
}

function spawnApple() {
    let a;
    do { a = { x: Math.floor(Math.random() * CELLS), y: Math.floor(Math.random() * CELLS) }; }
    while (wallSet.has(a.x + "," + a.y) || (snake && snake.some((s) => s.x === a.x && s.y === a.y)));
    return a;
}

/* ---------- Steuerung ---------- */
const OPP = { LEFT: "RIGHT", RIGHT: "LEFT", UP: "DOWN", DOWN: "UP" };
function setdir(d) { if (d !== OPP[direction]) nextDirection = d; }
document.addEventListener("keydown", (e) => {
    const map = { ArrowLeft: "LEFT", ArrowUp: "UP", ArrowRight: "RIGHT", ArrowDown: "DOWN", a: "LEFT", w: "UP", d: "RIGHT", s: "DOWN" };
    const d = map[e.key] || map[(e.key || "").toLowerCase()];
    if (d) { e.preventDefault(); if (running) setdir(d); return; }
    if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (running) togglePause();
        else if (!$("after").hidden) $("btnStart").click();
    }
});
GHTouch.swipe($("snakeCanvas"), { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" });
GHTouch.dpad({ up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }, { side: "right" });

$("btnClassic").onclick = () => startLevel(-1);
$("levelGrid").addEventListener("click", (e) => { const b = e.target.closest("[data-level]"); if (b && !b.disabled) startLevel(+b.dataset.level); });
$("btnMenu").onclick = () => showMenu();
let afterAction = null;
$("btnStart").onclick = () => afterAction && afterAction();

function togglePause() {
    paused = !paused;
    if (paused) {
        clearInterval(loop);
        afterAction = togglePause;
        showAfter("Pause", (levelIndex < 0 ? "Klassik" : "Level " + (levelIndex + 1)) + " · " + runScore + " Äpfel", "Weiter");
    } else {
        $("overlay").style.display = "none";
        loop = setInterval(update, level.speed);
    }
}

/* ---------- Zeichnen ---------- */
function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function draw() {
    for (let y = 0; y < CELLS; y++) for (let x = 0; x < CELLS; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#170c1e" : "#1b1023";
        ctx.fillRect(x * BOX, y * BOX, BOX, BOX);
    }
    if (!snake) return;
    // Wände
    (walls || []).forEach(([x, y]) => {
        ctx.fillStyle = "#3a2445";
        rr(x * BOX + 1, y * BOX + 1, BOX - 2, BOX - 2, 4); ctx.fill();
        ctx.fillStyle = "rgba(226,84,214,0.5)";
        ctx.fillRect(x * BOX + 3, y * BOX + 1, BOX - 6, 2);
    });
    // Apfel
    const pulse = 1 + Math.sin(tick * 0.5) * 0.06;
    ctx.save();
    ctx.translate(apple.x * BOX + BOX / 2, apple.y * BOX + BOX / 2);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "#ffc857"; ctx.shadowBlur = 16; ctx.fillStyle = "#ffc857";
    ctx.beginPath(); ctx.arc(0, 0, BOX * 0.36, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Schlange
    const n = snake.length;
    snake.forEach((seg, i) => {
        const t = n > 1 ? i / (n - 1) : 0;
        const c = [226, 84, 214].map((v, k) => Math.round(v + ([120, 40, 160][k] - v) * t));
        ctx.fillStyle = "rgb(" + c.join(",") + ")";
        if (i === 0) { ctx.shadowColor = "#e254d6"; ctx.shadowBlur = 18; }
        rr(seg.x * BOX + 1.5, seg.y * BOX + 1.5, BOX - 3, BOX - 3, i === 0 ? 6 : 5); ctx.fill();
        ctx.shadowBlur = 0;
    });
    const h = snake[0];
    const ex = { LEFT: [-1, 0], RIGHT: [1, 0], UP: [0, -1], DOWN: [0, 1] }[direction];
    const cx = h.x * BOX + BOX / 2, cy = h.y * BOX + BOX / 2, px = -ex[1], py = ex[0];
    [-1, 1].forEach((s) => {
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx + ex[0] * 3 + px * 4 * s, cy + ex[1] * 3 + py * 4 * s, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#120816"; ctx.beginPath(); ctx.arc(cx + ex[0] * 4 + px * 4 * s, cy + ex[1] * 4 + py * 4 * s, 1.2, 0, Math.PI * 2); ctx.fill();
    });
}

/* ---------- Spiel-Loop ---------- */
function update() {
    tick++;
    direction = nextDirection;
    const d = { LEFT: [-1, 0], RIGHT: [1, 0], UP: [0, -1], DOWN: [0, 1] }[direction];
    const hx = snake[0].x + d[0], hy = snake[0].y + d[1];
    const hitWall = hx < 0 || hx >= CELLS || hy < 0 || hy >= CELLS || wallSet.has(hx + "," + hy);
    const hitSelf = snake.slice(0, -1).some((s) => s.x === hx && s.y === hy);
    if (hitWall || hitSelf) return gameOver();
    snake.unshift({ x: hx, y: hy });
    if (hx === apple.x && hy === apple.y) {
        runScore++; eaten++;
        $("currentScore").textContent = runScore;
        if (levelIndex >= 0) $("levelName").textContent = level.name + " · " + eaten + "/" + level.goal;
        if (eaten >= level.goal) return levelDone();
        apple = spawnApple();
    } else snake.pop();
    draw();
}

function levelDone() {
    clearInterval(loop); running = false;
    draw();
    const next = levelIndex + 1;
    if (window.GHStats) GHStats.unlock("snake", next + 1);
    if (next >= SNAKE_LEVELS.length) {
        if (window.GHStats) GHStats.record("snake", runScore);
        afterAction = () => showMenu();
        showAfter("Alle Level geschafft!", runScore + " Äpfel insgesamt · Bestwert " + best(), "Zum Menü");
    } else {
        afterAction = () => startLevel(next, true);
        showAfter("Level " + (levelIndex + 1) + " geschafft!", "Weiter mit Level " + (next + 1) + ": " + SNAKE_LEVELS[next].name, "Weiter");
    }
}

function gameOver() {
    clearInterval(loop); running = false;
    const prev = best();
    if (window.GHStats) GHStats.record("snake", runScore);
    $("bestScore").textContent = best();
    afterAction = () => startLevel(levelIndex, false);
    showAfter(runScore > prev && runScore > 0 ? "Neuer Rekord!" : "Spiel vorbei",
        runScore + (runScore === 1 ? " Apfel" : " Äpfel") + (levelIndex >= 0 ? " · Level " + (levelIndex + 1) : "") + " · Bestwert " + best(), "Nochmal");
}

snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
walls = []; wallSet = new Set(); direction = "RIGHT"; apple = { x: 14, y: 10 };
resize();
showMenu();
setInterval(() => { if (!running) { tick++; draw(); } }, 140);
