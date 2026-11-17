/* Flappy Bird – GAMEHUB-Design (Logik unverändert, Darstellung neu) */
const speed = 20;
const gravity = 0.25;
const jump = -4.5;

// Logische Spielfläche (Kollisionen rechnen in diesen Einheiten)
const W = 320, H = 480;
const BIRD_X = 50, BIRD = 25, PIPE_W = 50;
const gap = 130;

const canvas = document.getElementById("birdCanvas");
const ctx = canvas.getContext("2d");
const scoredisplay = document.getElementById("currentScore");
const bestDisplay = document.getElementById("bestScore");
const finalScore = document.getElementById("finalScore");
const restartMenu = document.getElementById("restartMenu");
const btnRestart = document.getElementById("btnRestart");

let score, birdy, birdv, pipes, gameloop, isGameOver, frame = 0;

// Scharfe Darstellung auf jedem Bildschirm
function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
}
window.addEventListener("resize", () => { resize(); draw(); });

// Sterne für den Hintergrund
const stars = Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.75, r: Math.random() * 1.2 + 0.3, s: Math.random() * 0.3 + 0.05 }));

function getBest() {
    const data = JSON.parse(localStorage.getItem('myWebGames')) || {};
    return (data['flappybird'] && data['flappybird'].highscore) || 0;
}

function init() {
    score = 0;
    birdy = 200;
    birdv = 0;
    pipes = [{ x: W, y: 100 }];
    isGameOver = false;
    scoredisplay.innerText = "0";
    bestDisplay.innerText = getBest();
    restartMenu.style.display = "none";

    if (gameloop) clearInterval(gameloop);
    gameloop = setInterval(update, speed);
}

document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        e.preventDefault();
        if (!isGameOver) flap(); else init();
    }
});
canvas.addEventListener("mousedown", () => { if (!isGameOver) flap(); });
document.getElementById("btnJump").onclick = () => { if (!isGameOver) flap(); };
btnRestart.onclick = init;

function flap() { birdv = jump; }

function savescore(points) {
    const data = JSON.parse(localStorage.getItem('myWebGames')) || {};
    if (!data['flappybird'] || points > data['flappybird'].highscore) {
        data['flappybird'] = { highscore: points };
        localStorage.setItem('myWebGames', JSON.stringify(data));
    }
}

/* ---------- Zeichnen ---------- */
function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#06020a");
    g.addColorStop(0.65, "#1a0820");
    g.addColorStop(1, "#3a0d41");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#f6f2f9";
    stars.forEach((s) => {
        const x = (s.x - frame * s.s + W * 10) % W;
        ctx.globalAlpha = 0.25 + s.r * 0.35;
        ctx.beginPath(); ctx.arc(x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Hügel-Silhouette
    ctx.fillStyle = "rgba(226, 84, 214, 0.08)";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 10) {
        const off = (x + frame * 0.6) * 0.03;
        ctx.lineTo(x, H - 50 - Math.sin(off) * 14 - Math.sin(off * 0.5) * 10);
    }
    ctx.lineTo(W, H);
    ctx.fill();
}

function drawPipe(x, y, h, capAtBottom) {
    const g = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
    g.addColorStop(0, "#b146e6");
    g.addColorStop(0.5, "#e254d6");
    g.addColorStop(1, "#8c2fa8");
    ctx.fillStyle = g;
    ctx.fillRect(x + 3, y, PIPE_W - 6, h);
    // Kappe
    const capY = capAtBottom ? y + h - 16 : y;
    roundRect(x - 2, capY, PIPE_W + 4, 16, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x + 8, y, 4, h);
}

function drawBird() {
    const cx = BIRD_X + BIRD / 2, cy = birdy + BIRD / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.max(-0.5, Math.min(0.9, birdv * 0.09)));
    ctx.shadowColor = "rgba(255, 200, 87, 0.6)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ffc857";
    ctx.beginPath(); ctx.arc(0, 0, BIRD / 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Flügel
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath(); ctx.ellipse(-4, 3 + Math.sin(frame * 0.4) * 2, 7, 4, -0.3, 0, Math.PI * 2); ctx.fill();
    // Auge & Schnabel
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(5, -4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#120816";
    ctx.beginPath(); ctx.arc(6.5, -4, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff5470";
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(17, 2); ctx.lineTo(10, 5); ctx.fill();
    ctx.restore();
}

function draw() {
    if (!pipes) return;
    drawBackground();
    pipes.forEach((p) => {
        drawPipe(p.x, 0, p.y, true);
        drawPipe(p.x, p.y + gap, H - (p.y + gap), false);
    });
    drawBird();
}

function update() {
    frame++;
    birdv += gravity;
    birdy += birdv;

    for (let i = 0; i < pipes.length; i++) {
        pipes[i].x -= 2;

        if (pipes[i].x === 120) {
            pipes.push({
                x: W,
                y: Math.floor(Math.random() * (H - gap - 100)) + 50
            });
        }

        if (
            (BIRD_X + BIRD > pipes[i].x && BIRD_X < pipes[i].x + PIPE_W &&
            (birdy < pipes[i].y || birdy + BIRD > pipes[i].y + gap)) ||
            birdy + BIRD > H || birdy < 0
        ) {
            draw();
            gameOver();
            return;
        }

        if (pipes[i].x === 40) {
            score++;
            scoredisplay.innerText = score;
        }
    }
    if (pipes.length > 5) pipes.shift();
    draw();
}

function gameOver() {
    isGameOver = true;
    clearInterval(gameloop);
    savescore(score);
    bestDisplay.innerText = getBest();
    finalScore.innerText = score + (score === 1 ? " Punkt" : " Punkte") + " · Bestwert " + getBest();
    restartMenu.style.display = "grid";
}

resize();
init();
