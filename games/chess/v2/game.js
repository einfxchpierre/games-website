document.addEventListener("DOMContentLoaded", () => {
    const chess = new Chess();
    let 3dEngine = null;
    let p2p = null;
    
    let playerColor = 'w'; // 'w' oder 'b'
    let gameMode = 'ai'; // 'ai' oder 'p2p'
    let selectedSquare = null;

    // ELO System initialisieren
    let playerElo = parseInt(localStorage.getItem('chess_elo')) || 1200;
    document.getElementById('elo-value').innerText = playerElo;

    function updateElo(playerWon, isDraw) {
        let kFactor = 32;
        let expectedScore = 1 / (1 + Math.pow(10, (playerElo - playerElo) / 400)); // Da KI-Elo = Spieler-Elo, immer 0.5
        let actualScore = isDraw ? 0.5 : (playerWon ? 1 : 0);
        
        playerElo = Math.round(playerElo + kFactor * (actualScore - expectedScore));
        localStorage.setItem('chess_elo', playerElo);
        document.getElementById('elo-value').innerText = playerElo;
    }

    // Klick/Touch Logik für das 3D Brett
    function handleSquareSelection(square) {
        if (chess.game_over()) return;
        if (chess.turn() !== playerColor) return; // Nicht dein Zug

        if (!selectedSquare) {
            // Erster Klick: Figur auswählen
            const piece = chess.get(square);
            if (piece && piece.color === playerColor) {
                selectedSquare = square;
            }
        } else {
            // Zweiter Klick: Ziel wählen & Zug versuchen
            const move = chess.move({ from: selectedSquare, to: square, promotion: 'q' });
            selectedSquare = null;

            if (move) {
                3dEngine.updateBoardPieces(chess.board());
                updateStatus();

                if (gameMode === 'p2p') {
                    p2p.sendMove(move);
                } else if (gameMode === 'ai' && !chess.game_over()) {
                    // KI triggern nach kurzem Delay für Realismus
                    setTimeout(triggerAIMove, 600);
                }
            }
        }
    }

    function triggerAIMove() {
        const aiMove = ChessAI.makeAdaptiveMove(chess, playerElo);
        if (aiMove) {
            chess.move(aiMove);
            3dEngine.updateBoardPieces(chess.board());
            updateStatus();
        }
    }

    function updateStatus() {
        const turn = chess.turn() === 'w' ? 'Weiß' : 'Schwarz';
        let text = `${turn} ist am Zug.`;

        if (chess.in_checkmate()) {
            text = "Schachmatt!";
            const playerWon = chess.turn() !== playerColor;
            updateElo(playerWon, false);
        } else if (chess.in_draw()) {
            text = "Unentschieden!";
            updateElo(false, true);
        }

        document.getElementById('status-turn').innerText = text;
    }

    // UI Event Listener
    document.getElementById('btn-ai').addEventListener('click', () => {
        gameMode = 'ai';
        playerColor = 'w';
        startGame();
    });

    document.getElementById('btn-host').addEventListener('click', () => {
        gameMode = 'p2p';
        p2p = new P2PManager(
            (id) => {
                document.getElementById('room-id').value = id;
                document.getElementById('room-info').classList.remove('hidden');
            },
            (isClient) => {
                playerColor = isClient ? 'b' : 'w';
                if(isClient) {
                     // Wenn Hoster, Kamera drehen
                     3dEngine.camera.position.set(0, 8, -9);
                }
                startGame();
            },
            (incomingMove) => {
                chess.move(incomingMove);
                3dEngine.updateBoardPieces(chess.board());
                updateStatus();
            }
        );
    });

    document.getElementById('btn-join').addEventListener('click', () => {
        const id = document.getElementById('join-id').value;
        if (!id) return alert("Bitte Code eingeben");
        gameMode = 'p2p';
        
        // Host anfragen
        document.getElementById('btn-host').click(); 
        setTimeout(() => p2p.connectToPeer(id), 1000);
    });

    function startGame() {
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('status-turn').classList.remove('hidden');
        
        // 3D Engine starten
        3dEngine = new ThreeChess('canvas-container', handleSquareSelection);
        3dEngine.updateBoardPieces(chess.board());
        updateStatus();
    }
});