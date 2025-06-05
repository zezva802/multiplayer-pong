// backend/src/socket/events.ts

// Events emitted by the client
export const ClientEvents = {
    FIND_MATCH: 'find-match',       // Client wants to find/join a game
    PADDLE_MOVE: 'paddle-move',     // Client sends paddle movement intent
    GAME_INPUT: 'game-input',       // Alternative, more general input event
    LEAVE_GAME: 'leave-game',       // Client wants to leave current game
} as const;

// Events emitted by the server
export const ServerEvents = {
    MATCH_FOUND: 'match-found',     // Server tells client an opponent was found, gives gameId
    GAME_STATE: 'game-state',       // Server sends the current game state (position, score, etc.)
    GAME_UPDATE: 'game-update',     // Alternative name for game state updates
    GAME_START: 'game-start',       // Server signals the game has started
    GAME_END: 'game-end',           // Server signals the game has ended (winner/loser)
    NO_OPPONENT: 'no-opponent',     // Server tells client they are waiting for an opponent
    OPPONENT_DISCONNECTED: 'opponent-disconnected', // Server tells client their opponent left
    GAME_ERROR: 'game-error',       // Server sends an error related to game action
} as const;

// Types for event payloads (optional but good practice)
export interface FindMatchPayload {
    // Could include desired mode, player name, etc.
}

export interface PaddleMovePayload {
    direction: 'up' | 'down' | 'idle';
    gameId: string; // Client confirms which game
    // Player ID is implicit from the socket
}

// GameState is already defined in types.ts

export interface MatchFoundPayload {
    gameId: string;
    playerSide: 'left' | 'right'; // Which paddle the client controls
}

export interface GameEndPayload {
    winner: 'left' | 'right' | 'draw' | null; // Null if opponent disconnected
    reason: 'scored_out' | 'opponent_left';
    message: "ss"
}

export interface GameErrorPayload {
    message: string;
}