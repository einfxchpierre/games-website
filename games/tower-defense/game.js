/* Tower Defense – GAMEHUB-Design (Spielmechanik wie zuvor) */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W = window.innerWidth, H = window.innerHeight;
function setupCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
setupCanvas();

// Stats & State
let money = 200;
let lives = 20;
let wave = 0;
let selectedTowerType = 'basic';
let isGameOver = false;
let mouse = null;
let time = 0;

let enemies = [];
let towers = [];
let projectiles = [];
let particles = [];

const TOWERS = {
    basic:  { cost: 50,  range: 180, fireRate: 35, damage: 20, c1: '#e254d6', c2: '#b146e6' },
    sniper: { cost: 100, range: 350, fireRate: 80, damage: 50, c1: '#38bdf8', c2: '#6366f1' }
};

// Der Pfad für die Gegner
const path = [
    { x: -50, y: H / 2 },
    { x: W * 0.2, y: H / 2 },
    { x: W * 0.2, y: H * 0.25 },
    { x: W * 0.6, y: H * 0.25 },
    { x: W * 0.6, y: H * 0.8 },
    { x: W + 50, y: H * 0.8 }
];

function distToSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
function canPlace(x, y) {
    if (y < 90) return false; // Bereich der Leiste
    for (let i = 0; i < path.length - 1; i++) if (distToSegment({ x, y }, path[i], path[i + 1]) < 42) return false;
    return !towers.some((t) => Math.hypot(t.x - x, t.y - y) < 46);
}

/* ---------- Klassen ---------- */
class Enemy {
    constructor(hp) {
        this.x = path[0].x; this.y = path[0].y;
        this.hp = hp; this.maxHp = hp;
        this.speed = 1.5 + (wave * 0.1);
        this.pathIndex = 0;
        this.radius = 14;
        this.wobble = Math.random() * 10;
    }
    update() {
        const target = path[this.pathIndex + 1];
        const dx = target.x - this.x, dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) {
            this.pathIndex++;
            if (this.pathIndex >= path.length - 1) { lives--; this.hp = 0; this.escaped = true; return; }
        }
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
    }
    draw() {
        const r = this.radius + Math.sin(time * 0.15 + this.wobble) * 1.2;
        ctx.save();
        ctx.shadowColor = '#ff5470';
        ctx.shadowBlur = 18;
        const g = ctx.createRadialGradient(this.x - 4, this.y - 4, 2, this.x, this.y, r);
        g.addColorStop(0, '#ff8aa0');
        g.addColorStop(1, '#ff3d5e');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // Lebensbalken
        const w = 30, pct = this.hp / this.maxHp;
        ctx.fillStyle = 'rgba(6,2,10,0.8)';
        roundRect(this.x - w / 2, this.y - 26, w, 5, 2.5); ctx.fill();
        ctx.fillStyle = pct > 0.5 ? '#3ddc97' : pct > 0.25 ? '#ffc857' : '#ff5470';
        roundRect(this.x - w / 2, this.y - 26, w * pct, 5, 2.5); ctx.fill();
    }
}

class Tower {
    constructor(x, y, type) {
        this.x = x; this.y = y;
        this.type = type;
        Object.assign(this, { range: TOWERS[type].range, fireRate: TOWERS[type].fireRate });
        this.cooldown = 0;
        this.angle = -Math.PI / 2;
        this.flash = 0;
    }
    update() {
        if (this.cooldown > 0) this.cooldown--;
        if (this.flash > 0) this.flash--;
        const target = enemies.find((e) => Math.hypot(e.x - this.x, e.y - this.y) < this.range);
        if (target) this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        if (this.cooldown === 0 && target) {
            projectiles.push(new Projectile(this.x + Math.cos(this.angle) * 20, this.y + Math.sin(this.angle) * 20, target, this.type));
            this.cooldown = this.fireRate;
            this.flash = 5;
        }
    }
    draw() {
        const t = TOWERS[this.type];
        // Sockel
        ctx.fillStyle = '#1b1023';
        ctx.strokeStyle = '#322f34';
        ctx.lineWidth = 1.5;
        roundRect(this.x - 22, this.y - 22, 44, 44, 12); ctx.fill(); ctx.stroke();
        // Kern
        ctx.save();
        ctx.shadowColor = t.c1;
        ctx.shadowBlur = this.flash ? 26 : 12;
        const g = ctx.createLinearGradient(this.x - 14, this.y - 14, this.x + 14, this.y + 14);
        g.addColorStop(0, t.c1); g.addColorStop(1, t.c2);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(this.x, this.y, 13, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // Lauf
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#f6f2f9';
        roundRect(4, -3.5, this.type === 'sniper' ? 24 : 17, 7, 3.5); ctx.fill();
        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, target, type) {
        this.x = x; this.y = y; this.target = target; this.type = type;
        this.speed = type === 'sniper' ? 12 : 8;
        this.damage = TOWERS[type].damage;
        this.trail = [];
    }
    update() {
        const dx = this.target.x - this.x, dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 6) this.trail.shift();
        if (dist < 10) {
            this.target.hp -= this.damage;
            burst(this.x, this.y, TOWERS[this.type].c1, 6);
            this.x = -5000; return;
        }
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
    }
    draw() {
        const c = TOWERS[this.type].c1;
        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        this.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.shadowColor = c; ctx.shadowBlur = 12;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(this.x, this.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = Math.random() * 3 + 1;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 24, color });
    }
}

function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/* ---------- Spiel-Logik ---------- */
function selectTower(t) {
    selectedTowerType = t;
    document.querySelectorAll('.tower-btn').forEach((b) => b.classList.remove('selected'));
    document.getElementById('btn-' + t).classList.add('selected');
}

canvas.addEventListener('mousemove', (e) => { mouse = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('mouseleave', () => { mouse = null; });
canvas.onclick = (e) => {
    if (isGameOver) return;
    const cost = TOWERS[selectedTowerType].cost;
    if (money >= cost && canPlace(e.clientX, e.clientY)) {
        towers.push(new Tower(e.clientX, e.clientY, selectedTowerType));
        burst(e.clientX, e.clientY, TOWERS[selectedTowerType].c1, 10);
        money -= cost;
        updateUI();
    }
};
document.addEventListener('keydown', (e) => {
    if (e.key === '1') selectTower('basic');
    if (e.key === '2') selectTower('sniper');
});

let spawning = false;
function spawnWave() {
    if (enemies.length === 0 && !isGameOver && !spawning) {
        wave++;
        spawning = true;
        updateUI();
        const count = wave * 5;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                if (!isGameOver) enemies.push(new Enemy(80 + wave * 30));
                if (i === count - 1) spawning = false;
            }, i * 700);
        }
    }
}

function updateUI() {
    document.getElementById('money').innerText = money;
    document.getElementById('lives').innerText = Math.max(0, lives);
    document.getElementById('wave').innerText = wave;
    document.getElementById('btn-basic').classList.toggle('disabled', money < TOWERS.basic.cost);
    document.getElementById('btn-sniper').classList.toggle('disabled', money < TOWERS.sniper.cost);
}

/* ---------- Zeichnen ---------- */
function drawField() {
    ctx.fillStyle = '#06020a';
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(0, H, 0, 0, H, Math.max(W, H) * 0.9);
    glow.addColorStop(0, 'rgba(58,13,65,0.9)');
    glow.addColorStop(1, 'rgba(58,13,65,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Punktraster
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 20; x < W; x += 40) for (let y = 20; y < H; y += 40) ctx.fillRect(x, y, 1.5, 1.5);

    // Pfad
    const line = () => { ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    line(); ctx.strokeStyle = 'rgba(226,84,214,0.10)'; ctx.lineWidth = 64; ctx.stroke();
    line(); ctx.strokeStyle = '#1b1023'; ctx.lineWidth = 46; ctx.stroke();
    line(); ctx.strokeStyle = '#322f34'; ctx.lineWidth = 46; ctx.setLineDash([]); ctx.globalAlpha = 0.0; ctx.stroke(); ctx.globalAlpha = 1;
    line(); ctx.strokeStyle = 'rgba(226,84,214,0.45)'; ctx.lineWidth = 2; ctx.setLineDash([10, 14]); ctx.lineDashOffset = -time * 0.6; ctx.stroke();
    ctx.setLineDash([]);
}

function drawPreview() {
    if (!mouse || isGameOver) return;
    const t = TOWERS[selectedTowerType];
    const ok = canPlace(mouse.x, mouse.y) && money >= t.cost;
    ctx.strokeStyle = ok ? 'rgba(226,84,214,0.5)' : 'rgba(255,84,112,0.5)';
    ctx.fillStyle = ok ? 'rgba(226,84,214,0.06)' : 'rgba(255,84,112,0.06)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, t.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.6;
    roundRect(mouse.x - 22, mouse.y - 22, 44, 44, 12);
    ctx.strokeStyle = ok ? '#e254d6' : '#ff5470'; ctx.stroke();
    ctx.globalAlpha = 1;
}

function loop() {
    if (isGameOver) return;
    time++;
    drawField();

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.update(); e.draw();
        if (e.hp <= 0) {
            if (!e.escaped) { money += 15; burst(e.x, e.y, '#ff5470', 14); }
            enemies.splice(i, 1);
            updateUI();
        }
    }
    towers.forEach((t) => { t.update(); t.draw(); });
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.update(); p.draw();
        if (p.x < -1000) projectiles.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.life--;
        ctx.globalAlpha = p.life / 24;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
        if (p.life <= 0) particles.splice(i, 1);
    }
    ctx.globalAlpha = 1;
    drawPreview();

    if (lives <= 0) { finish(); return; }

    spawnWave();
    requestAnimationFrame(loop);
}

function finish() {
    isGameOver = true;
    updateUI();
    const saved = JSON.parse(localStorage.getItem('myWebGames')) || {};
    let high = saved['tower-defense'] ? saved['tower-defense'].highscore : 0;
    if (wave - 1 > high) high = wave - 1;

    document.getElementById('final-wave').innerText = wave - 1;
    document.getElementById('high-score').innerText = high;
    document.getElementById('game-over-screen').classList.remove('hidden');

    saved['tower-defense'] = { highscore: high };
    localStorage.setItem('myWebGames', JSON.stringify(saved));
}

function restartGame() {
    money = 200; lives = 20; wave = 0;
    enemies = []; towers = []; projectiles = []; particles = [];
    isGameOver = false; spawning = false;
    document.getElementById('game-over-screen').classList.add('hidden');
    updateUI();
    loop();
}

selectTower('basic');
updateUI();
loop();
