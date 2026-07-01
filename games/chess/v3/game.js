document.addEventListener("DOMContentLoaded", () => {
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
        playerElo = Math.round(playerElo + kFactor * ((isDraw ? 0.5 : (playerWon ? 1 : 0)) - 0.5));
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
                if (engine3d) {
                    engine3d.highlightSquare(square);
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
                updateStatus();

                if (gameMode === 'p2p' && p2p) {
                    p2p.sendMove({ from: fromSquare, to: toSquare });
                } else if (gameMode === 'ai' && !chess.game_over()) {
                    setTimeout(triggerAIMove, 400);
                }
            } else {
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

    // --- BUTTON EVENTS ---

    document.getElementById('btn-ai').addEventListener('click', () => {
        gameMode = 'ai';
        playerColor = 'w';
        startGame();
    });

    document.getElementById('btn-host').addEventListener('click', () => {
        gameMode = 'p2p';
        playerColor = 'w'; 
        
        // Wunsch-Code auslesen (wenn leer, generiert PeerJS einen Code)
        const customId = document.getElementById('custom-host-id').value.trim();

        p2p = new P2PManager(
            customId,
            (id) => {
                document.getElementById('room-id').value = id;
                document.getElementById('room-info').classList.remove('hidden');
            },
            () => { startGame(); },
            (incomingMove) => {
                const move = chess.move(incomingMove);
                if (move) {
                    engine3d.updateBoardPieces(chess.board(), { from: move.from, to: move.to });
                    updateStatus();
                }
            }
        );
    });

    // Neu: Kopier-Button Logik
    document.getElementById('btn-copy').addEventListener('click', () => {
        const copyText = document.getElementById('room-id');
        copyText.select();
        copyText.setSelectionRange(0, 99999); // Für Handys
        navigator.clipboard.writeText(copyText.value).then(() => {
            const btn = document.getElementById('btn-copy');
            btn.innerText = "Kopiert!";
            btn.style.background = "#2ecc71";
            setTimeout(() => {
                btn.innerText = "Kopieren";
                btn.style.background = "#4caf50";
            }, 2000);
        });
    });

    document.getElementById('btn-join').addEventListener('click', () => {
        const id = document.getElementById('join-id').value.trim();
        if (!id) return alert("Bitte gültigen Code eingeben");
        gameMode = 'p2p';
        playerColor = 'b'; 

        p2p = new P2PManager(
            '', // Gast braucht keine eigene ID
            () => { p2p.connectToPeer(id); },
            () => {
                startGame();
                if (engine3d) engine3d.camera.position.set(0, 9, -10); 
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