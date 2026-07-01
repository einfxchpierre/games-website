document.addEventListener("DOMContentLoaded", () => {
    const chess = new Chess();
    let engine3d = null; 
    let p2p = null;
    
    let playerColor = 'w'; 
    let gameMode = 'ai'; 
    let selectedSquare = null;

    // ELO System via Local Storage laden
    let playerElo = parseInt(localStorage.getItem('chess_elo')) || 1200;
    document.getElementById('elo-value').innerText = playerElo;

    function updateElo(playerWon, isDraw) {
        let kFactor = 32;
        let expectedScore = 1 / (1 + Math.pow(10, (playerElo - playerElo) / 400)); 
        let actualScore = isDraw ? 0.5 : (playerWon ? 1 : 0);
        
        playerElo = Math.round(playerElo + kFactor * (actualScore - expectedScore));
        localStorage.setItem('chess_elo', playerElo);
        document.getElementById('elo-value').innerText = playerElo;
    }

    function handleSquareSelection(square) {
        if (chess.game_over()) return;
        if (chess.turn() !== playerColor) return; // Nicht dein Zug!

        if (!selectedSquare) {
            // 1. Klick: Figur auswählen
            const piece = chess.get(square);
            // Nur auswählen, wenn eine eigene Figur auf dem Feld steht
            if (piece && piece.color === playerColor) {
                selectedSquare = square;
                if (engine3d) engine3d.highlightSquare(square); // Optisches Feedback
            }
        } else {
            // 2. Klick: Zug ausführen auf Zielquadrat
            const fromSquare = selectedSquare;
            const toSquare = square;
            selectedSquare = null;
            if (engine3d) engine3d.clearHighlight(); // Highlight entfernen

            // Zug-Validierung gegen chess.js ausführen
            const move = chess.move({ 
                from: fromSquare, 
                to: toSquare, 
                promotion: 'q' // Automatische Umwandlung in Dame bei Bauern auf der Grundlinie
            });

            if (move) {
                // Zug war gültig -> 3D Brett neu zeichnen
                engine3d.updateBoardPieces(chess.board());
                updateStatus();

                if (gameMode === 'p2p') {
                    p2p.sendMove(move);
                } else if (gameMode === 'ai' && !chess.game_over()) {
                    setTimeout(triggerAIMove, 600);
                }
            } else {
                // Falls der Zug illegal war, aber das neue Feld eine eigene Figur ist,
                // wählen wir diese stattdessen direkt als neue Auswahl aus
                const piece = chess.get(square);
                if (piece && piece.color === playerColor) {
                    selectedSquare = square;
                    if (engine3d) engine3d.highlightSquare(square);
                }
            }
        }
    }

    function triggerAIMove() {
        const aiMove = ChessAI.makeAdaptiveMove(chess, playerElo);
        if (aiMove) {
            chess.move(aiMove);
            engine3d.updateBoardPieces(chess.board());
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

    // UI Event Listener Buttons
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
                startGame();
                if(isClient && engine3d) {
                     engine3d.camera.position.set(0, 8, -9);
                }
            },
            (incomingMove) => {
                chess.move(incomingMove);
                engine3d.updateBoardPieces(chess.board());
                updateStatus();
            }
        );
    });

    document.getElementById('btn-join').addEventListener('click', () => {
        const id = document.getElementById('join-id').value;
        if (!id) return alert("Bitte Code eingeben");
        gameMode = 'p2p';
        
        document.getElementById('btn-host').click(); 
        setTimeout(() => p2p.connectToPeer(id), 1000);
    });

    function startGame() {
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('status-turn').classList.remove('hidden');
        
        engine3d = new ThreeChess('canvas-container', handleSquareSelection);
        engine3d.updateBoardPieces(chess.board());
        updateStatus();
    }
});