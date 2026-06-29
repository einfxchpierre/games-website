// --- AI ENGINE MODULE ---
const pawnEval = [
    [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0], [5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
    [1.0,  1.0,  2.0,  3.0,  3.0,  2.0,  1.0,  1.0], [0.5,  0.5,  1.0,  2.5,  2.5,  1.0,  0.5,  0.5],
    [0.0,  0.0,  0.0,  2.0,  2.0,  0.0,  0.0,  0.0], [0.5, -0.5, -1.0,  0.0,  0.0, -1.0, -0.5,  0.5],
    [0.5,  1.0, 1.0,  -2.0, -2.0,  1.0,  1.0,  0.5], [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0]
];
const knightEval = [
    [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0], [-4.0, -2.0,  0.0,  0.0,  0.0,  0.0, -2.0, -4.0],
    [-3.0,  0.0,  1.0,  1.5,  1.5,  1.0,  0.0, -3.0], [-3.0,  0.5,  1.5,  2.0,  2.0,  1.5,  0.5, -3.0],
    [-3.0,  0.0,  1.5,  2.0,  2.0,  1.5,  0.0, -3.0], [-3.0,  0.5,  1.0,  1.5,  1.5,  1.0,  0.5, -3.0],
    [-4.0, -2.0,  0.0,  0.5,  0.5,  0.0, -2.0, -4.0], [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0]
];
const bishopEval = [
    [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0], [-1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -1.0],
    [-1.0,  0.0,  0.5,  1.0,  1.0,  0.5,  0.0, -1.0], [-1.0,  0.5,  0.5,  1.0,  1.0,  0.5,  0.5, -1.0],
    [-1.0,  0.0,  1.0,  1.0,  1.0,  1.0,  0.0, -1.0], [-1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0, -1.0],
    [-1.0,  0.5,  0.0,  0.0,  0.0,  0.0,  0.5, -1.0], [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0]
];
const rookEval = [
    [0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0], [0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5], [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5], [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5], [0.0,  0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0]
];
const queenEval = [
    [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0], [-1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -1.0],
    [-1.0,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -1.0], [-0.5,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -0.5],
    [0.0,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -0.5], [-1.0,  0.5,  0.5,  0.5,  0.5,  0.5,  0.0, -1.0],
    [-1.0,  0.0,  0.5,  0.0,  0.0,  0.5,  0.0, -1.0], [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0]
];
const kingEval = [
    [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0], [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0], [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [-2.0, -3.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0], [-1.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -1.0],
    [2.0,  2.0,  0.0,  0.0,  0.0,  0.0,  2.0,  2.0], [2.0,  3.0,  1.0,  0.0,  0.0,  1.0,  3.0,  2.0]
];

const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function evaluateBoard(chessGame) {
    let totalEval = 0;
    const board = chessGame.board();
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const piece = board[r][f];
            if (piece) {
                let value = pieceValues[piece.type];
                if (piece.type === 'p') value += pawnEval[r][f];
                else if (piece.type === 'n') value += knightEval[r][f];
                else if (piece.type === 'b') value += bishopEval[r][f];
                else if (piece.type === 'r') value += rookEval[r][f];
                else if (piece.type === 'q') value += queenEval[r][f];
                else if (piece.type === 'k') value += kingEval[r][f];

                totalEval += (piece.color === 'w') ? value : -value;
            }
        }
    }
    return totalEval;
}

function minimax(chessGame, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || chessGame.game_over()) return evaluateBoard(chessGame);
    const moves = chessGame.moves();
    
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let move of moves) {
            chessGame.move(move);
            let ev = minimax(chessGame, depth - 1, alpha, beta, false);
            chessGame.undo();
            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let move of moves) {
            chessGame.move(move);
            let ev = minimax(chessGame, depth - 1, alpha, beta, true);
            chessGame.undo();
            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function calcBestAIMove(chessGame, difficulty) {
    const moves = chessGame.moves({ verbose: true });
    if (moves.length === 0) return null;

    let targetDepth = 1;
    let blunderChance = 0;

    switch(parseInt(difficulty)) {
        case 0: targetDepth = 1; blunderChance = 0.50; break;
        case 1: targetDepth = 1; blunderChance = 0.20; break;
        case 2: targetDepth = 2; blunderChance = 0.05; break;
        case 3: targetDepth = 3; blunderChance = 0.00; break;
        case 4: targetDepth = 4; blunderChance = 0.00; break;
    }

    if (Math.random() < blunderChance) {
        return moves[Math.floor(Math.random() * moves.length)];
    }

    let bestMove = null;
    let bestValue = (chessGame.turn() === 'w') ? -Infinity : Infinity;
    moves.sort(() => Math.random() - 0.5);

    for (let move of moves) {
        chessGame.move(move);
        let val = minimax(chessGame, targetDepth - 1, -Infinity, Infinity, chessGame.turn() === 'w');
        chessGame.undo();

        if (chessGame.turn() === 'b') {
            if (val < bestValue) { bestValue = val; bestMove = move; }
        } else {
            if (val > bestValue) { bestValue = val; bestMove = move; }
        }
    }
    return bestMove || moves[0];
}