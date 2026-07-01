document.addEventListener("DOMContentLoaded", () => {
    // Falls neuere Versionen geladen werden, sichert dies die Instanziierung
    const chess = typeof Chess === 'function' ? new Chess() : new window.Chess.Chess();
    let engine3d = null; 
    let p2p = null;
    
    let playerColor = 'w'; 
    let gameMode = 'ai'; 
    let selectedSquare = null;

    let playerElo = parseInt(localStorage.getItem('chess_elo')) || 1200;
    document.getElementById('elo-value').innerText = playerElo;

    function updateElo(playerWon, isDraw) {
        let kFactor = 32;
        let expectedScore = 0.5; 
        let actualScore = isDraw ? 0.5 : (playerWon ? 1 : 0);
        
        playerElo = Math.round(playerElo + kFactor * (actualScore - expectedScore));
        localStorage.setItem('chess_elo', playerElo);
        document.getElementById('elo-value').innerText = playerElo;
    }

    function handleSquareSelection(square) {
        if (chess.game_over()) return;
        if (chess.turn() !== playerColor) return; 

        if (!selectedSquare) {
            const piece = chess.get(square);
            if (piece && piece.color === playerColor) {
                selectedSquare = square;
                if (engine3d) engine3d.highlightSquare(square); 
            }
        } else {
            const fromSquare = selectedSquare;
            const toSquare = square;
            selectedSquare = null;
            if (engine3d) engine3d.clearHighlight(); 

            // Bereite ein sauberes Move-Objekt vor
            const moveAttempt = { from: fromSquare, to: toSquare, promotion: 'q' };
            const move = chess.move(moveAttempt);

            if (move) {
                // Gültiger Zug ausgeführt
                engine3d.updateBoardPieces(chess.board(), { from: fromSquare, to: toSquare });
                updateStatus();

                if (gameMode === 'p2p' && p2p) {
                    // Sende exaktes Zug-Objekt statt Roh-Daten
                    p2p.sendMove({ from: fromSquare, to: toSquare });
                } else if (gameMode === 'ai' && !chess.game_over()) {
                    setTimeout(triggerAIMove, 400);
                }
            } else {
                // Klick-Korrektur: Direkt andere eigene Figur wählen
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
            const move = chess.move(aiMove);
            if (move) {
                engine3d.updateBoardPieces(chess.board(), { from: move.from, to: move.to });
                updateStatus();
            }
        }
    }

    function updateStatus() {
        const turn = chess.turn() === 'w' ? 'Weiß' : 'Schwarz';
        let text = `${turn} ist am Zug.`;

        if (chess.in_checkmate()) {
            text = "Schachmatt!";
            updateElo(chess.turn() !== playerColor, false);
        } else if (chess.in_draw()) {
            text = "Unentschieden!";
            updateElo(false, true);
        }

        document.getElementById('status-turn').innerText = text;
    }

    // UI Event Listeners
    document.getElementById('btn-ai').addEventListener('click', () => {
        gameMode = 'ai';
        playerColor = 'w';
        startGame();
    });

    document.getElementById('btn-host').addEventListener('click', () => {
        gameMode = 'p2p';
        playerColor = 'w'; // Hoster fängt immer als Weiß an
        p2p = new P2PManager(
            (id) => {
                document.getElementById('room-id').value = id;
                document.getElementById('room-info').classList.remove('hidden');
            },
            (isClient) => {
                // Wird gefeuert sobald die Verbindung zustande kommt
                startGame();
            },
            (incomingMove) => {
                const move = chess.move(incomingMove);
                if (move) {
                    engine3d.updateBoardPieces(chess.board(), { from: move.from, to: move.to });
                    updateStatus();
                }
            }
        );
    });

    document.getElementById('btn-join').addEventListener('click', () => {
        const id = document.getElementById('join-id').value.trim();
        if (!id) return alert("Bitte gültigen Code eingeben");
        gameMode = 'p2p';
        playerColor = 'b'; // Gast spielt immer Schwarz

        p2p = new P2PManager(
            (myId) => {
                // Sobald Peer geöffnet, direkt zur Ziel-ID verbinden!
                p2p.connectToPeer(id);
            },
            (isClient) => {
                startGame();
                if (engine3d) {
                    // Kamera um 180 Grad drehen für die schwarze Perspektive
                    engine3d.camera.position.set(0, 7, -8);
                }
            },
            (incomingMove) => {
                const move = chess.move(incomingMove);
                if (move) {
                    engine3d.updateBoardPieces(chess.board(), { from: move.from, to: move.to });
                    updateStatus();
                }
            }
        );
    });

    function startGame() {
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('status-turn').classList.remove('hidden');
        
        engine3d = new ThreeChess('canvas-container', handleSquareSelection);
        engine3d.updateBoardPieces(chess.board());
        updateStatus();
    }
});