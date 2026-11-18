/* Flappy Bird – GAMEHUB-Design · 3 Schwierigkeiten · Touch · Statistik */
const MODES = {
    easy:   { name: "Leicht", gap: 165, speed: 1.7, spacing: 210 },
    normal: { name: "Normal", gap: 135, speed: 2.1, spacing: 190 },
    hard:   { name: "Schwer", gap: 112, speed: 2.7, spacing: 175 }
};
const gravity = 0.25, jump = -4.5, TICK = 20;
const W = 320, H = 480, BIRD_X = 50, BIRD = 25, PIPE_W = 50;

const canvas = document.getElementById("birdCanvas");
const ctx = canvas.getContext("2d");
const $ = (id) => document.getElementById(id);

let mode = localStorage.getItem("flappy_mode") || "normal";
let score = 0, birdy = 200, birdv = 0, pipes = [], loop = null, running = false, frame = 0;

function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    draw();
}
addEventListener("resize", resize);

const stars = Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.75, r: Math.random() * 1.2 + 0.3, s: Math.random() * 0.3 + 0.05 }));
const bestKey = () => "best_" + mode;
const best = () => (window.GHStats && GHStats.progress("flappy-bird", bestKey())) || 0;

function setMode(m) {
    mode = m;
    localStorage.setItem("flappy_mode", m);
    $("modeLabel").textContent = MODES[m].name;
    $("bestScore").textContent = best();
    document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("gh-btn-white", b.dataset.mode === m));
}

function start() {
    score = 0; birdy = 200; birdv = 0; frame = 0;
    pipes = [{ x: W, y: randomGapY(), scored: false }];
    $("currentScore").textContent = "0";
    $("restartMenu").style.display = "none";
    running = true;
    clearInterval(loop);
    loop = setInterval(update, TICK);
}
const randomGapY = () => Math.floor(Math.random() * (H - MODES[mode].gap - 100)) + 50;

function flap() { if (running) birdv = jump; }

addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (running) flap(); else start();
    }
});
canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); if (running) flap(); else start(); });
$("btnRestart").onclick = start;
document.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));

/* ---------- Zeichnen ---------- */
function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#06020a"); g.addColorStop(0.65, "#1a0820"); g.addColorStop(1, "#3a0d41");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f6f2f9";
    stars.forEach((s) => {
        const x = (s.x - frame * s.s + W * 10) % W;
        ctx.globalAlpha = 0.25 + s.r * 0.35;
        ctx.beginPath(); ctx.arc(x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(226, 84, 214, 0.08)";
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 10) { const o = (x + frame * 0.6) * 0.03; ctx.lineTo(x, H - 50 - Math.sin(o) * 14 - Math.sin(o * 0.5) * 10); }
    ctx.lineTo(W, H); ctx.fill();
}
function drawPipe(x, y, h, capAtBottom) {
    const g = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
    g.addColorStop(0, "#b146e6"); g.addColorStop(0.5, "#e254d6"); g.addColorStop(1, "#8c2fa8");
    ctx.fillStyle = g;
    ctx.fillRect(x + 3, y, PIPE_W - 6, h);
    roundRect(x - 2, capAtBottom ? y + h - 16 : y, PIPE_W + 4, 16, 4); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(x + 8, y, 4, h);
}
function drawBird() {
    ctx.save();
    ctx.translate(BIRD_X + BIRD / 2, birdy + BIRD / 2);
    ctx.rotate(Math.max(-0.5, Math.min(0.9, birdv * 0.09)));
    ctx.shadowColor = "rgba(255, 200, 87, 0.6)"; ctx.shadowBlur = 14;
    ctx.fillStyle = "#ffc857"; ctx.beginPath(); ctx.arc(0, 0, BIRD / 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.ellipse(-4, 3 + Math.sin(frame * 0.4) * 2, 7, 4, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(5, -4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#120816"; ctx.beginPath(); ctx.arc(6.5, -4, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff5470"; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(17, 2); ctx.lineTo(10, 5); ctx.fill();
    ctx.restore();
}
function draw() {
    drawBackground();
    const gap = MODES[mode].gap;
    pipes.forEach((p) => { drawPipe(p.x, 0, p.y, true); drawPipe(p.x, p.y + gap, H - (p.y + gap), false); });
    drawBird();
}

/* ---------- Spiel-Loop ---------- */
function update() {
    frame++;
    const m = MODES[mode];
    birdv += gravity;
    birdy += birdv;
    for (const p of pipes) {
        p.x -= m.speed;
        if (!p.scored && p.x + PIPE_W < BIRD_X) { p.scored = true; score++; $("currentScore").textContent = score; }
        const hitPipe = BIRD_X + BIRD > p.x && BIRD_X < p.x + PIPE_W && (birdy < p.y || birdy + BIRD > p.y + m.gap);
        if (hitPipe) { draw(); return gameOver(); }
    }
    if (birdy + BIRD > H || birdy < -BIRD) { draw(); return gameOver(); }
    const last = pipes[pipes.length - 1];
    if (last.x < W - m.spacing) pipes.push({ x: W, y: randomGapY(), scored: false });
    if (pipes[0].x < -PIPE_W - 10) pipes.shift();
    draw();
}

function gameOver() {
    running = false;
    clearInterval(loop);
    const prev = best();
    if (window.GHStats) {
        GHStats.record("flappy-bird", score);
        if (score > prev) GHStats.progress("flappy-bird", bestKey(), score);
    }
    $("bestScore").textContent = best();
    $("menuTitle").textContent = score > prev && score > 0 ? "Neuer Rekord!" : "Spiel vorbei";
    $("finalScore").textContent = score + (score === 1 ? " Punkt" : " Punkte") + " · Bestwert " + MODES[mode].name + ": " + best();
    $("btnRestart").textContent = "Nochmal spielen";
    $("restartMenu").style.display = "grid";
}

setMode(mode);
resize();
$("restartMenu").style.display = "grid";
