/* Snake – GAMEHUB-Design */
const speed = 140;
const CELLS = 20;
const boxsize = 20;                 // logische Größe pro Feld
const SIZE = CELLS * boxsize;       // 400 × 400 logisch

const canvas = document.getElementById("snakeCanvas");
const ctx = canvas.getContext("2d");
const scoredisplay = document.getElementById("currentScore");
const bestDisplay = document.getElementById("bestScore");
const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovText = document.getElementById("ovText");
const btnStart = document.getElementById("btnStart");

let score, direction, nextDirection, snake, apple, gameloop = null, paused = false, tick = 0;

function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(canvas.width / SIZE, 0, 0, canvas.height / SIZE, 0, 0);
    draw();
}
window.addEventListener("resize", resize);

function getBest() {
    const data = JSON.parse(localStorage.getItem('myWebGames')) || {};
    return (data.snake && data.snake.highscore) || 0;
}
function savescore(points) {
    const data = JSON.parse(localStorage.getItem('myWebGames')) || {};
    if (!data.snake || points > data.snake.highscore) {
        data.snake = { highscore: points };
        localStorage.setItem('myWebGames', JSON.stringify(data));
    }
}

function spawnapple() {
    let a;
    do {
        a = { x: Math.floor(Math.random() * CELLS) * boxsize, y: Math.floor(Math.random() * CELLS) * boxsize };
    } while (snake && snake.some((s) => s.x === a.x && s.y === a.y));
    return a;
}

function reset() {
    score = 0;
    direction = nextDirection = "RIGHT";
    snake = [{ x: 9 * boxsize, y: 10 * boxsize }, { x: 8 * boxsize, y: 10 * boxsize }, { x: 7 * boxsize, y: 10 * boxsize }];
    apple = spawnapple();
    scoredisplay.innerText = "0";
    bestDisplay.innerText = getBest();
}

function start() {
    reset();
    overlay.style.display = "none";
    paused = false;
    clearInterval(gameloop);
    gameloop = setInterval(update, speed);
}

/* ---------- Steuerung ---------- */
const OPP = { LEFT: "RIGHT", RIGHT: "LEFT", UP: "DOWN", DOWN: "UP" };
function setdir(d) { if (d !== OPP[direction]) nextDirection = d; }

document.addEventListener("keydown", (e) => {
    const map = { ArrowLeft: "LEFT", ArrowUp: "UP", ArrowRight: "RIGHT", ArrowDown: "DOWN", a: "LEFT", w: "UP", d: "RIGHT", s: "DOWN" };
    const d = map[e.key] || map[e.key.toLowerCase()];
    if (d) { e.preventDefault(); setdir(d); return; }
    if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (overlay.style.display !== "none" && !paused) start();
        else togglePause();
    }
});
btnStart.onclick = () => { if (paused) togglePause(); else start(); };

function togglePause() {
    if (!gameloop) return;
    paused = !paused;
    if (paused) {
        clearInterval(gameloop);
        ovTitle.innerText = "Pause";
        ovText.innerText = score + " Punkte";
        btnStart.innerText = "Weiter";
        overlay.style.display = "grid";
    } else {
        overlay.style.display = "none";
        gameloop = setInterval(update, speed);
    }
}

/* ---------- Zeichnen ---------- */
function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function draw() {
    if (!snake) return;
    // Feld im Schachbrettmuster
    for (let y = 0; y < CELLS; y++) {
        for (let x = 0; x < CELLS; x++) {
            ctx.fillStyle = (x + y) % 2 ? "#170c1e" : "#1b1023";
            ctx.fillRect(x * boxsize, y * boxsize, boxsize, boxsize);
        }
    }

    // Apfel (pulsierend)
    const pulse = 1 + Math.sin(tick * 0.5) * 0.06;
    ctx.save();
    ctx.translate(apple.x + boxsize / 2, apple.y + boxsize / 2);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "#ffc857";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#ffc857";
    ctx.beginPath(); ctx.arc(0, 0, boxsize * 0.36, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Schlange mit Farbverlauf
    const n = snake.length;
    snake.forEach((seg, i) => {
        const t = n > 1 ? i / (n - 1) : 0;
        const c1 = [226, 84, 214], c2 = [120, 40, 160];
        const c = c1.map((v, k) => Math.round(v + (c2[k] - v) * t));
        ctx.fillStyle = "rgb(" + c.join(",") + ")";
        if (i === 0) { ctx.shadowColor = "#e254d6"; ctx.shadowBlur = 18; }
        rr(seg.x + 1.5, seg.y + 1.5, boxsize - 3, boxsize - 3, i === 0 ? 6 : 5);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Augen
    const h = snake[0];
    const ex = { LEFT: [-1, 0], RIGHT: [1, 0], UP: [0, -1], DOWN: [0, 1] }[direction];
    const cx = h.x + boxsize / 2, cy = h.y + boxsize / 2;
    const px = -ex[1], py = ex[0];
    ctx.fillStyle = "#fff";
    [-1, 1].forEach((s) => {
        ctx.beginPath(); ctx.arc(cx + ex[0] * 3 + px * 4 * s, cy + ex[1] * 3 + py * 4 * s, 2.4, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = "#120816";
    [-1, 1].forEach((s) => {
        ctx.beginPath(); ctx.arc(cx + ex[0] * 4 + px * 4 * s, cy + ex[1] * 4 + py * 4 * s, 1.2, 0, Math.PI * 2); ctx.fill();
    });
}

/* ---------- Spiel-Loop ---------- */
function update() {
    tick++;
    direction = nextDirection;
    let headx = snake[0].x;
    let heady = snake[0].y;

    if (direction === "LEFT") headx -= boxsize;
    if (direction === "UP") heady -= boxsize;
    if (direction === "RIGHT") headx += boxsize;
    if (direction === "DOWN") heady += boxsize;

    const hitWall = headx < 0 || headx >= SIZE || heady < 0 || heady >= SIZE;
    const hitSelf = snake.slice(0, -1).some((s) => s.x === headx && s.y === heady);
    if (hitWall || hitSelf) return gameOver();

    snake.unshift({ x: headx, y: heady });
    if (headx === apple.x && heady === apple.y) {
        score++;
        scoredisplay.innerText = score;
        apple = spawnapple();
    } else {
        snake.pop();
    }
    draw();
}

function gameOver() {
    clearInterval(gameloop);
    gameloop = null;
    savescore(score);
    bestDisplay.innerText = getBest();
    ovTitle.innerText = "Spiel vorbei";
    ovText.innerText = score + (score === 1 ? " Punkt" : " Punkte") + " · Bestwert " + getBest();
    btnStart.innerText = "Nochmal spielen";
    overlay.style.display = "grid";
}

reset();
resize();
// Leichte Animation des Apfels auch im Startbildschirm
setInterval(() => { if (!gameloop) { tick++; draw(); } }, 140);
