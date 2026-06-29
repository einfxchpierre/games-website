// --- MAIN GAME APPLICATION MODULE ---
const TILE_SIZE = 2;
const COLOR_WHITE = 0xffffff;
const COLOR_BLACK = 0x1a1a1a;
const BOARD_LIGHT = 0xeeeeee;
const BOARD_DARK = 0x333333;
const HIGHLIGHT_SELECT = 0x3498db;
const HIGHLIGHT_MOVE = 0x2ecc71;

let game = new Chess();
let history = []; 
let historyIndex = -1; 
let gameMode = 'ai'; 
let playerColor = 'w'; 
let isAnimating = false;
let pointerDownTime = 0;

let capturedWhitePieces = [];
let capturedBlackPieces = [];

let playerElo = parseInt(localStorage.getItem('chess_elo')) || 1200;
let opponentElo = 1600;

let ws;
const SIGNAL_SERVER = "wss://api.piesocket.com/v3/v3?api_key=VCideKJWvvwCw3NGPaeasUMHgwXubvAFwSgKyEQx&notify_self=0"; 

let scene, camera, renderer, controls, raycaster, mouse;
let boardGroup = new THREE.Group();
let piecesGroup = new THREE.Group();
let capturedGroup = new THREE.Group(); 
let squares = {};
let currentPieces = {};
let selectedSquare = null;
let validMoves = [];

const statusEl = document.getElementById('status-msg');
const eloEl = document.getElementById('player-elo');
const oppEl = document.getElementById('opponent-info');
const loadingEl = document.getElementById('loading');
const diffSelect = document.getElementById('difficulty-select');
const colorSelect = document.getElementById('color-select');

// Prozedurale Geometrie-Erzeugung für Schachfiguren
function createPieceMesh(type, colorHex) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.2, metalness: 0.2 });
    
    // Basis-Ring für alle Figuren
    const baseGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.15, 16);
    const base = new THREE.Mesh(baseGeo, mat);
    base.position.y = 0.075;
    base.castShadow = true;
    group.add(base);

    let bodyGeo;
    switch(type) {
        case 'p': // Bauer
            bodyGeo = new THREE.ConeGeometry(0.35, 1.0, 16);
            const pBody = new THREE.Mesh(bodyGeo, mat);
            pBody.position.y = 0.65;
            const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
            const pHead = new THREE.Mesh(headGeo, mat);
            pHead.position.y = 1.25;
            group.add(pBody, pHead);
            break;
        case 'r': // Turm
            bodyGeo = new THREE.CylinderGeometry(0.4, 0.45, 1.2, 16);
            const rBody = new THREE.Mesh(bodyGeo, mat);
            rBody.position.y = 0.75;
            group.add(rBody);
            break;
        case 'n': // Springer
            bodyGeo = new THREE.BoxGeometry(0.35, 1.1, 0.6);
            const nBody = new THREE.Mesh(bodyGeo, mat);
            nBody.position.y = 0.7;
            nBody.rotation.x = 0.2;
            group.add(nBody);
            break;
        case 'b': // Läufer
            bodyGeo = new THREE.CylinderGeometry(0.1, 0.4, 1.3, 16);
            const bBody = new THREE.Mesh(bodyGeo, mat);
            bBody.position.y = 0.8;
            const bHead = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), mat);
            bHead.position.y = 1.4;
            group.add(bBody, bHead);
            break;
        case 'q': // Königin
            bodyGeo = new THREE.CylinderGeometry(0.2, 0.45, 1.5, 16);
            const qBody = new THREE.Mesh(bodyGeo, mat);
            qBody.position.y = 0.9;
            const qTop = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), mat);
            qTop.position.y = 1.7;
            group.add(qBody, qTop);
            break;
        case 'k': // König
            bodyGeo = new THREE.CylinderGeometry(0.25, 0.45, 1.6, 16);
            const kBody = new THREE.Mesh(bodyGeo, mat);
            kBody.position.y = 0.95;
            const crossHorizontal = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), mat);
            crossHorizontal.position.y = 1.9;
            const crossVertical = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat);
            crossVertical.position.y = 1.9;
            group.add(kBody, crossHorizontal, crossVertical);
            break;
    }
    
    group.children.forEach(c => c.castShadow = true);
    return group;
}

function init() {
    eloEl.innerText = playerElo;
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b0b);
    scene.fog = new THREE.Fog(0x0b0b0b, 15, 60);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 16, 18);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 8;
    controls.maxDistance = 45;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.85);
    mainLight.position.set(8, 18, 8);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    const fillLight = new THREE.PointLight(0x3498db, 0.4, 30);
    fillLight.position.set(-10, 5, -10);
    scene.add(fillLight);

    scene.add(boardGroup);
    scene.add(piecesGroup);
    scene.add(capturedGroup);

    createBoard();
    setupEvents();
    startNewMatch();

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    loadingEl.style.opacity = 0;
    animate();
}

function createBoard() {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const isLight = (rank + file) % 2 !== 0;
            const color = isLight ? BOARD_LIGHT : BOARD_DARK;
            const geo = new THREE.BoxGeometry(TILE_SIZE, 0.4, TILE_SIZE);
            const mat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1, color: color });
            const square = new THREE.Mesh(geo, mat);

            const x = (file - 3.5) * TILE_SIZE;
            const z = (3.5 - rank) * TILE_SIZE; 
            square.position.set(x, -0.2, z);
            square.receiveShadow = true;

            const squareName = files[file] + (rank + 1);
            square.userData = { name: squareName, originalColor: color };
            boardGroup.add(square);
            squares[squareName] = square;
        }
    }
}

function startNewMatch() {
    game.reset();
    history = [];
    historyIndex = -1;
    
    while(capturedGroup.children.length > 0){ capturedGroup.remove(capturedGroup.children[0]); }
    capturedWhitePieces = [];
    capturedBlackPieces = [];

    if (gameMode === 'ai') {
        const preferred = colorSelect.value;
        if (preferred === 'random') {
            playerColor = Math.random() < 0.5 ? 'w' : 'b';
        } else {
            playerColor = preferred;
        }
        
        const elos = [800, 1200, 1600, 2000, 2400];
        opponentElo = elos[diffSelect.value];
        oppEl.innerText = `KI Stufe ${parseInt(diffSelect.value)+1} (${opponentElo})`;
    }
    
    let targetZ = (playerColor === 'w') ? 18 : -18;
    new TWEEN.Tween(camera.position).to({ x: 0, y: 16, z: targetZ }, 1200).easing(TWEEN.Easing.Cubic.Out).start();

    syncBoardTo3D();
    updateTimelineUI();
    checkGameState();

    if (gameMode === 'ai' && playerColor === 'b') {
        statusEl.innerText = "KI überlegt...";
        setTimeout(triggerBot, 600);
    }
}

function syncBoardTo3D() {
    while(piecesGroup.children.length > 0){ piecesGroup.remove(piecesGroup.children[0]); }
    currentPieces = {};
    const board = game.board();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const piece = board[r][f];
            if (piece) {
                const sqName = files[f] + (8 - r);
                const colorCode = piece.color === 'w' ? COLOR_WHITE : COLOR_BLACK;
                const mesh = createPieceMesh(piece.type, colorCode);
                if(piece.color === 'b') mesh.rotation.y = Math.PI;

                mesh.position.set(squares[sqName].position.x, 0, squares[sqName].position.z);
                piecesGroup.add(mesh);
                currentPieces[sqName] = mesh;
            }
        }
    }
}

function arrangeCapturedPiece(mesh, pieceColor) {
    piecesGroup.remove(mesh);
    capturedGroup.add(mesh);

    new TWEEN.Tween(mesh.scale).to({x: 0.65, y: 0.65, z: 0.65}, 300).start();
    let count, row, col, xOffset, zOffset;
    
    if (pieceColor === 'w') {
        count = capturedWhitePieces.length;
        capturedWhitePieces.push(mesh);
        row = Math.floor(count / 8);
        col = count % 8;
        xOffset = -9.5 - (row * 1.2);
        zOffset = -7.0 + (col * 1.1); 
    } else {
        count = capturedBlackPieces.length;
        capturedBlackPieces.push(mesh);
        row = Math.floor(count / 8);
        col = count % 8;
        xOffset = 9.5 + (row * 1.2);
        zOffset = 7.0 - (col * 1.1);
    }

    new TWEEN.Tween(mesh.position).to({ x: xOffset, y: 0, z: zOffset }, 600).easing(TWEEN.Easing.Cubic.Out).start();
}

function animateMove3D(move, callback) {
    if (!move) return;
    isAnimating = true;

    const movingMesh = currentPieces[move.from];
    if (!movingMesh) {
        syncBoardTo3D();
        isAnimating = false;
        if(callback) callback();
        return;
    }

    const targetSquare = squares[move.to];
    let capturedSq = move.to;
    if (move.flags.includes('e')) capturedSq = move.to[0] + move.from[1];
    const capturedMesh = currentPieces[capturedSq];
    
    if (capturedMesh) {
        delete currentPieces[capturedSq];
        arrangeCapturedPiece(capturedMesh, game.get(move.to) ? (game.get(move.to).color === 'w'?'b':'w') : 'w'); 
    }

    currentPieces[move.to] = movingMesh;
    delete currentPieces[move.from];

    if (move.flags.includes('k') || move.flags.includes('q')) {
        const isKingSide = move.flags.includes('k');
        const rFrom = move.color === 'w' ? (isKingSide ? 'h1':'a1') : (isKingSide ? 'h8':'a8');
        const rTo = move.color === 'w' ? (isKingSide ? 'f1':'d1') : (isKingSide ? 'f8':'d8');
        const rookMesh = currentPieces[rFrom];
        if(rookMesh) {
            currentPieces[rTo] = rookMesh; delete currentPieces[rFrom];
            new TWEEN.Tween(rookMesh.position).to({ x: squares[rTo].position.x, z: squares[rTo].position.z }, 450).start();
        }
    }

    new TWEEN.Tween(movingMesh.position)
        .to({ x: targetSquare.position.x, z: targetSquare.position.z }, 450)
        .easing(TWEEN.Easing.Cubic.Out)
        .onComplete(() => {
            if (move.flags.includes('p')) { 
                piecesGroup.remove(movingMesh);
                const promoted = createPieceMesh('q', move.color === 'w' ? COLOR_WHITE : COLOR_BLACK);
                promoted.position.set(targetSquare.position.x, 0, targetSquare.position.z);
                piecesGroup.add(promoted);
                currentPieces[move.to] = promoted;
            }
            isAnimating = false;
            if (callback) callback();
        }).start();

    new TWEEN.Tween(movingMesh.position).to({ y: 1.2 }, 225).easing(TWEEN.Easing.Quadratic.Out)
        .chain(new TWEEN.Tween(movingMesh.position).to({ y: 0 }, 225).easing(TWEEN.Easing.Quadratic.In)).start();
}

function executeMove(moveObj) {
    if (moveObj.flags && moveObj.flags.includes('p')) moveObj.promotion = 'q';
    const resultingMove = game.move(moveObj);
    if (!resultingMove) return;

    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    history.push(game.fen());
    historyIndex++;

    animateMove3D(resultingMove, () => {
        updateTimelineUI();
        checkGameState();
        
        if(gameMode === 'ai' && !game.game_over() && game.turn() !== playerColor) {
            statusEl.innerText = "KI überlegt...";
            setTimeout(triggerBot, 100);
        }
    });

    if (gameMode === 'online' && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'move', move: moveObj, senderColor: playerColor }));
    }
}

function triggerBot() {
    const aiMove = calcBestAIMove(game, diffSelect.value);
    if(aiMove) executeMove(aiMove);
}

function travelToHistoryIndex(idx) {
    if (idx < -1 || idx >= history.length) return;
    historyIndex = idx;
    if (historyIndex === -1) game.reset(); else game.load(history[historyIndex]);

    clearHighlights();
    syncBoardTo3D();
    updateTimelineUI();
    checkGameState();
}

function updateTimelineUI() {
    document.getElementById('btn-undo').disabled = (historyIndex < 0);
    document.getElementById('btn-redo').disabled = (historyIndex >= history.length - 1);
    document.getElementById('btn-jump-current').disabled = (historyIndex === history.length - 1);
    document.getElementById('timeline-label').innerText = `${historyIndex + 1} / ${history.length}`;
}

function updateElo(playerWon, draw = false) {
    const K = 32;
    const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    let score = draw ? 0.5 : (playerWon ? 1 : 0);
    playerElo = Math.max(100, Math.round(playerElo + K * (score - expected)));
    localStorage.setItem('chess_elo', playerElo);
    eloEl.innerText = playerElo;
    alert(`Spiel vorbei! Neues ELO: ${playerElo}`);
}

function checkGameState() {
    if (game.in_checkmate()) {
        if (game.turn() === playerColor) { statusEl.innerText = "Schachmatt! Verloren."; updateElo(false); } 
        else { statusEl.innerText = "Schachmatt! Gewonnen!"; updateElo(true); }
    } else if (game.in_draw() || game.in_stalemate()) {
        statusEl.innerText = "Remis!"; updateElo(false, true);
    } else {
        if (gameMode === 'online') statusEl.innerText = game.turn() === playerColor ? "Du bist am Zug!" : "Gegner am Zug...";
        else statusEl.innerText = game.turn() === playerColor ? "Dein Zug!" : "KI überlegt...";
    }
}

function connectToWebsocket(room, isHost) {
    if(ws) ws.close();
    gameMode = 'online';
    
    if(isHost) {
        playerColor = Math.random() < 0.5 ? 'w' : 'b';
    }

    ws = new WebSocket(`${SIGNAL_SERVER}&channel_id=${room}`);
    ws.onopen = () => {
        document.getElementById('mp-status').innerText = `Raum: ${room}`;
        document.getElementById('btn-leave-mp').style.display = 'block';
        document.getElementById('btn-create-room').style.display = 'none';
        document.getElementById('btn-join-room').style.display = 'none';
        document.getElementById('join-code-input').style.display = 'none';
        colorSelect.disabled = true;
        diffSelect.disabled = true;

        if(isHost) {
            setTimeout(() => {
                ws.send(JSON.stringify({type: 'setup-color', hostColor: playerColor}));
            }, 600);
        }
    };

    ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'setup-color' && !isHost) {
            playerColor = (data.hostColor === 'w') ? 'b' : 'w';
            opponentElo = Math.floor(Math.random() * 600 + 1000);
            oppEl.innerText = `Online Spieler (${opponentElo})`;
            startNewMatch();
        }
        if (data.type === 'move' && data.senderColor !== playerColor) {
            executeMove(data.move);
        }
        if (data.type === 'disconnect') { alert("Gegner getrennt."); leaveMultiplayer(); }
    };
}

function leaveMultiplayer() {
    if(ws) ws.close();
    gameMode = 'ai';
    colorSelect.disabled = false;
    diffSelect.disabled = false;
    document.getElementById('btn-leave-mp').style.display = 'none';
    document.getElementById('btn-create-room').style.display = 'block';
    document.getElementById('btn-join-room').style.display = 'block';
    document.getElementById('join-code-input').style.display = 'block';
    document.getElementById('room-code-display').style.display = 'none';
    document.getElementById('mp-status').innerText = "Modus: Offline gegen KI";
    startNewMatch();
}

function setupEvents() {
    document.getElementById('btn-restart').onclick = () => { if(gameMode === 'ai') startNewMatch(); };
    document.getElementById('btn-undo').onclick = () => { travelToHistoryIndex(historyIndex - 1); };
    document.getElementById('btn-redo').onclick = () => { travelToHistoryIndex(historyIndex + 1); };
    document.getElementById('btn-jump-current').onclick = () => { travelToHistoryIndex(history.length - 1); };
    
    document.getElementById('btn-create-room').onclick = () => {
        const randRoom = Math.floor(100000 + Math.random() * 900000).toString();
        document.getElementById('share-code-input').value = randRoom;
        document.getElementById('room-code-display').style.display = 'block';
        connectToWebsocket(randRoom, true);
    };
    document.getElementById('btn-join-room').onclick = () => {
        const code = document.getElementById('join-code-input').value.trim();
        if(code) connectToWebsocket(code, false);
    };
    document.getElementById('btn-leave-mp').onclick = () => { leaveMultiplayer(); };
}

function onPointerDown(event) {
    pointerDownTime = Date.now();
}

function onPointerUp(event) {
    if (isAnimating || historyIndex < history.length - 1) return;
    if (gameMode === 'online' && game.turn() !== playerColor) return;
    if (gameMode === 'ai' && game.turn() !== playerColor) return; 

    if (Date.now() - pointerDownTime > 200) return;

    const rectUi = document.getElementById('ui').getBoundingClientRect();
    const rectMp = document.getElementById('multiplayer-panel').getBoundingClientRect();
    const rectTl = document.getElementById('timeline-panel').getBoundingClientRect();
    
    const x = event.clientX;
    const y = event.clientY;

    if ((x >= rectUi.left && x <= rectUi.right && y >= rectUi.top && y <= rectUi.bottom) ||
        (x >= rectMp.left && x <= rectMp.right && y >= rectMp.top && y <= rectMp.bottom) ||
        (x >= rectTl.left && x <= rectTl.right && y >= rectTl.top && y <= rectTl.bottom)) {
        return;
    }

    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(boardGroup.children);
    if (intersects.length > 0) handleSquareClick(intersects[0].object.userData.name);
}

function handleSquareClick(sqName) {
    if (!selectedSquare) {
        const piece = game.get(sqName);
        if (piece && piece.color === playerColor) {
            selectedSquare = sqName;
            highlightSquare(sqName, HIGHLIGHT_SELECT);
            validMoves = game.moves({ square: sqName, verbose: true });
            validMoves.forEach(m => highlightSquare(m.to, HIGHLIGHT_MOVE));
        }
    } else {
        const move = validMoves.find(m => m.to === sqName);
        clearHighlights();
        if (move) {
            const from = selectedSquare;
            selectedSquare = null;
            validMoves = [];
            executeMove({ from: from, to: sqName });
        } else {
            selectedSquare = null;
            validMoves = [];
            const piece = game.get(sqName);
            if (piece && piece.color === playerColor) handleSquareClick(sqName);
        }
    }
}

function highlightSquare(sqName, hexColor) {
    if (squares[sqName]) squares[sqName].material.color.setHex(hexColor);
}
function clearHighlights() {
    for (let key in squares) squares[key].material.color.setHex(squares[key].userData.originalColor);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
    renderer.render(scene, camera);
}

window.onload = init;