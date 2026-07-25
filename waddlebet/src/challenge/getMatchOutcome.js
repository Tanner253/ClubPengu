/**
 * Resolve local win/loss/draw for P2P minigame result screens.
 * Prefer server-authoritative winnerPlayerId from matchResult.
 */
export function getMatchOutcome({ matchState, matchResult, localPlayerId }) {
    const reason = matchResult?.reason;

    if (reason === 'disconnect') {
        return { isDraw: false, didWin: false, didLose: false, isVoid: true };
    }

    const isDraw = reason === 'draw'
        || matchResult?.winner === 'draw'
        || matchState?.winner === 'draw';

    if (isDraw) {
        return { isDraw: true, didWin: false, didLose: false, isVoid: false };
    }

    if (matchResult?.winnerPlayerId && localPlayerId) {
        const didWin = matchResult.winnerPlayerId === localPlayerId;
        return { isDraw: false, didWin, didLose: !didWin, isVoid: false };
    }

    return { isDraw: false, didWin: false, didLose: false, isVoid: false };
}

/**
 * Preserve board/symbol winners when match_end sends player1/player2 roles.
 */
export function resolveMatchEndWinner(prevWinner, resultWinner) {
    if (prevWinner && prevWinner !== 'player1' && prevWinner !== 'player2') {
        return prevWinner;
    }
    if (resultWinner === 'draw') return 'draw';
    if (resultWinner === 'player1' || resultWinner === 'player2') return resultWinner;
    return resultWinner ?? prevWinner;
}
