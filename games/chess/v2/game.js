document.addEventListener("DOMContentLoaded", () => {
    // Sichere Instanziierung für jede Schach-Bibliotheksversion
    const chess = typeof Chess === 'function' ? new Chess() : new window.Chess.Chess();
    let engine3d = null; 
    let p2p = null;
    
    let playerColor = 'w'; 
    let gameMode = 'ai'; 
    let selectedSquare = null;

    // Unicode Symbole für den Bildschirm-Friedhof
    const pieceSymbols = { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' };

    let playerElo = parseInt(localStorage.getItem('chess_elo')) || 1200;
    document.getElementById('elo-value').innerText = playerElo;

    function updateElo(playerWon, isDraw) {
        let kFactor = 32;
        playerElo = Math.round(playerElo + kFactor * ((isDraw ? 0.5 : (playerWon ? 1 : 0)) - 0.5));
        localStorage.setItem('chess_elo', playerElo);
        document.getElementById('elo-value').innerText = playerElo;
    }

    // Vergleicht den aktuellen Zustand mit der Grundaufstellung und listet geschlagene Figuren auf
    function updateGraveyard() {
        const startCounts = { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 };
        const currentWhite = { p:0, r:0, n:0, b:0, q:0, k:0 };
        const currentBlack = { p:0, r:0, n:0, b:0, q:0, k:0 };

        chess.board().forEach(row => {
            row.forEach(piece => {
                if (piece) {
                    if (piece.color === 'w') currentWhite[piece.type]++;
                    if (piece.color === 'b') currentBlack[piece.type]++;
                }
            });
        });

        let whiteDeadHTML = "";
        let blackDeadHTML = "";

        for (let type in startCounts) {
            let deadWhiteCount = startCounts[type] - currentWhite[type];
            let deadBlackCount = startCounts[type] - currentBlack[type];

            if (deadWhiteCount > 0) whiteDeadHTML += `<span>${pieceSymbols[type]} x${deadWhiteCount}</span>`;
            if (deadBlackCount > 0) blackDeadHTML += `<span style="color:#aaa">${pieceSymbols[type]} x${deadBlackCount}</span>`;
        }

        document.getElementById('graveyard-white').innerHTML = whiteDeadHTML;
        document.getElementById('graveyard-black').innerHTML = blackDeadHTML;
    }

    function handleSquareSelection(square) {
        if (chess.game_over()) return;
        if (chess.turn() !== playerColor) return; // Blockiert Aktionen, wenn du nicht dran bist

        if (!selectedSquare) {
            const piece = chess.get(square);
            if (piece && piece.color === playerColor) {
                selectedSquare = square;
                if (engine3d) {
                    engine3d.highlightSquare(square);
                    // Vorschau berechnen und absenden
                    let moves = chess.moves({ square: square, verbose: true }).map(m => m.to);
                    engine3d.highlightPossibleMoves(moves);
                }
            }
        } else {
            const fromSquare = selectedSquare;
            const toSquare = square;
            selectedSquare = null;
            if (engine3d) engine3d.clearHighlight(); 

            const move = chess.move({ from: fromSquare, to: toSquare, promotion: 'q' });

            if (move) {
                engine3d.updateBoardPieces(chess.board(), { from: fromSquare, to: toSquare });
                updateGraveyard();
                updateStatus();

                if (gameMode === 'p2p' && p2p) {
                    p2p.sendMove({ from: fromSquare, to: toSquare });
                } else if (gameMode === 'ai' && !chess.game_over()) {
                    setTimeout(triggerAIMove, 400);
                }
            } else {
                // Klick auf ungültiges Feld, aber dort steht eine andere eigene Figur -> umwählen
                const piece = chess.get(square);
                if (piece && piece.color === playerColor) {
                    selectedSquare = square;
                    if (engine3d) {
                        engine3d.highlightSquare(square);
                        let moves = chess.moves({ square: square, verbose: true }).map(m => m.to);
                        engine3d.highlightPossibleMoves(moves);
                    }
                }
            }
        }
    }

    function triggerAIMove() {
        if (typeof ChessAI !== 'undefined') {
            const aiMove = ChessAI.makeAdaptiveMove(chess, playerElo);
            if (aiMove) {
                const move = chess.move(aiMove);
                if (move) {
                    engine3d.updateBoardPieces(chess.board(), { from: move.from, to: move.to });
                    updateGraveyard();
                    updateStatus();
                }
            }
        }
    }

    function updateStatus() {
        const turnText = chess.turn() === 'w' ? 'Weiß' : 'Schwarz';
        const colorText = playerColor === 'w' ? 'Weiß' : 'Schwarz';
        let text = `Du bist ${colorText}. — ${turnText} ist am Zug.`;

        if (chess.in_checkmate()) {
            text = "Schachmatt!";
            updateElo(chess.turn() !== playerColor, false);
        } else if (chess.in_draw()) {
            text = "Unentschieden!";
            updateElo(false, true);
        }

        document.getElementById('status-turn').innerText = text;
    }

    document.getElementById('btn-ai').addEventListener('click', () => {
        gameMode = 'ai';
        playerColor = 'w';
        startGame();
    });

    document.getElementById('btn-host').addEventListener('click', () => {
        gameMode = 'p2p';
        playerColor = 'w'; // Hoster startet als Weiß
        p2p = new P2PManager(
            (id) => {
                document.getElementById('room-id').value = id;
                document.getElementById('room-info').classList.remove('hidden');
            },
            () => { startGame(); },
            (incomingMove) => {
                const move = chess.move(incomingMove);
                if (move) {
                    engine3d.updateBoardPieces(chess.board(), { from: move.from, to: move.to });
                    updateGraveyard();
                    updateStatus();
                }
            }
        );
    });

    document.getElementById('btn-join').addEventListener('click', () => {
        const id = document.getElementById('join-id').value.trim();
        if (!id) return alert("Bitte gültigen Code eingeben");
        gameMode = 'p2p';
        playerColor = 'b'; // Beitreter ist Schwarz

        p2p = new P2PManager(
            () => { p2p.connectToPeer(id); },
            () => {
                startGame();
                if (engine3d) engine3d.camera.position.set(0, 7, -8); // Spiegelt Kamera für Schwarz
            },
            (incomingMove) => {
                const move = chess.move(incomingMove);
                if (move) {
                    engine3d.updateBoardPieces(chess.board(), { from: move.from, to: move.to });
                    updateGraveyard();
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
        updateGraveyard();
        updateStatus();
    }
});