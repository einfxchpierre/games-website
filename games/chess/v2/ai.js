const ChessAI = {
    // Bewertet die Figurenstärke auf dem Feld
    evaluateBoard: function(board) {
        const values = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };
        let totalEvaluation = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece) {
                    const value = values[piece.type];
                    totalEvaluation += (piece.color === 'w' ? value : -value);
                }
            }
        }
        return totalEvaluation;
    },

    // Generiert einen Zug basierend auf dem Spieler-ELO
    makeAdaptiveMove: function(chessInstance, playerElo) {
        const moves = chessInstance.moves({ verbose: true });
        if (moves.length === 0) return null;

        // ELO-Skalierung: Je niedriger das Spieler-ELO, desto höher die Fehlerwahrscheinlichkeit der KI
        // ELO 1200 gilt als Standard (50% Fehler / 50% Logik). Ab 1800 spielt sie fehlerfrei.
        let errorProbability = Math.max(0, Math.min(1, (1800 - playerElo) / 1000));

        if (Math.random() < errorProbability) {
            // Zufälliger legaler Zug (KI macht "Fehler")
            return moves[Math.floor(Math.random() * moves.length)];
        }

        // Minimax-Ansatz (Tiefe 1 - sucht direkten Materialvorteil)
        let bestMove = null;
        let bestValue = Infinity; // KI spielt als Schwarz ('b'), will Wert minimieren

        for (let move of moves) {
            chessInstance.move(move);
            let value = this.evaluateBoard(chessInstance.board());
            chessInstance.undo();

            if (value < bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }
        return bestMove || moves[Math.floor(Math.random() * moves.length)];
    }
};