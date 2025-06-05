// backend/src/socket/SocketPongManager.ts
import { Server, Socket } from "socket.io";
import { PongGameLogic } from "../models/PongGameLogic";
import { GameState, PlayerSide, PaddleDirection, GameStatus } from "../types";
import { ClientEvents, ServerEvents, PaddleMovePayload, MatchFoundPayload, GameEndPayload, FindMatchPayload } from "./events";

// Interface to hold game room state
interface GameRoom {
    id: string;
    game: PongGameLogic;
    players: { left: string | null; right: string | null }; 
    
}

export class SocketPongManager {
    private io: Server;
    // Maps to track games and players
    private games: Map<string, GameRoom> = new Map(); // Map gameId to GameRoom
    private playerToGameMap: Map<string, string> = new Map(); // Map socketId to gameId
    private playerToSideMap: Map<string, PlayerSide> = new Map(); // Map socketId to side ('left'/'right')
    private waitingPlayer: string | null = null; // Socket ID of a player waiting for a match
    private playerIntentions: Map<string, PaddleDirection> = new Map(); // Map socketId to paddle direction ('up'/'down'/'idle')

    private gameLoopInterval: NodeJS.Timeout | null = null;
    private lastUpdateTime = performance.now(); // Use performance.now for delta time

    constructor(io: Server, startLoop: boolean = true) {
        this.io = io;
        if (startLoop) {
            this.startGameLoop(); // Start the central game loop when manager is created
        }
    }

    

    // Handles a socket connecting
    handleConnection(socket: Socket): void {
        console.log(`Player connected: ${socket.id}`);

        // Set up listeners for events from this specific socket
        this.handleSocketEvents(socket);
    }

    // Handles a socket disconnecting
    handleDisconnect(socket: Socket): void {
        console.log(`Player disconnected: ${socket.id}`);

        const gameId = this.playerToGameMap.get(socket.id);

        // If the player was in a game
        if (gameId) {
            const room = this.games.get(gameId);
            if (room) {
                 // Find the opponent's socket ID
                 const opponentId = room.players.left === socket.id ? room.players.right : room.players.left;

                 // Notify the opponent
                 if (opponentId) {
                     this.io.to(opponentId).emit(ServerEvents.OPPONENT_DISCONNECTED, {
                         message: 'Your opponent disconnected. Game ended.',
                     });
                      // Clean up opponent's state as well if needed 
                      this.removePlayerFromGame(opponentId);
                 }

                // Clean up the game room and player mappings
                this.endGame(gameId, 'opponent_left');
                console.log(`Game ${gameId} ended due to disconnect.`);
            }
        } else if (this.waitingPlayer === socket.id) {
            // If the player was waiting for a match
            this.waitingPlayer = null; // Remove them from the waiting queue
            console.log(`Waiting player ${socket.id} disconnected.`);
        }

        // Clean up player intention
        this.playerIntentions.delete(socket.id);
    }

    // Handles a client wanting to find/join a match
    findMatch(socket: Socket, payload?: FindMatchPayload): void {
        if (this.playerToGameMap.has(socket.id)) {
            // Player is already in a game, ignore or send an error
             console.log(`Player ${socket.id} is already in a game.`);
             socket.emit(ServerEvents.GAME_ERROR, { message: 'You are already in a game.' });
            return;
        }

        if (this.waitingPlayer) {
            // Found a waiting player, create a new game!
            const player1Id = this.waitingPlayer;
            const player2Id = socket.id;

            // Clear the waiting player
            this.waitingPlayer = null;

            // Create a new game room
            const gameId = this.generateGameId();
            const newGame = new PongGameLogic();
            this.games.set(gameId, { id: gameId, game: newGame, players: { left: player1Id, right: player2Id } });

            // Update player mappings
            this.playerToGameMap.set(player1Id, gameId);
            this.playerToSideMap.set(player1Id, 'left');
            this.playerToGameMap.set(player2Id, gameId);
            this.playerToSideMap.set(player2Id, 'right');

            // Have both players join the game room
            this.io.sockets.sockets.get(player1Id)?.join(gameId); // Get socket instance by ID
            socket.join(gameId);

            console.log(`Match found! Game ${gameId} created with ${player1Id} (left) and ${player2Id} (right).`);

            // Notify players
            this.io.to(player1Id).emit(ServerEvents.MATCH_FOUND, { gameId, playerSide: 'left' } as MatchFoundPayload);
            this.io.to(player2Id).emit(ServerEvents.MATCH_FOUND, { gameId, playerSide: 'right' } as MatchFoundPayload);

            // Start the game (update status in game logic)
            newGame.startGame();

            // Immediately send the initial game state to both players
            this.emitGameState(gameId);

        } else {
            // No player waiting, add this player to the waiting queue
            this.waitingPlayer = socket.id;
            console.log(`Player ${socket.id} is waiting for a match.`);
            socket.emit(ServerEvents.NO_OPPONENT, { message: 'Waiting for opponent...' });
        }
    }

    // Handles a player sending a paddle movement command
    handlePaddleMove(socket: Socket, payload: PaddleMovePayload): void {
        const { gameId, direction } = payload;
        const playerId = socket.id;

        const playerGameId = this.playerToGameMap.get(playerId);
        const playerSide = this.playerToSideMap.get(playerId);

        // Validate that the player is in the game they claim to be in
        if (!playerGameId || playerGameId !== gameId || !playerSide) {
             socket.emit(ServerEvents.GAME_ERROR, { message: 'Invalid game or player state.' });
             console.warn(`Player ${playerId} sent invalid paddle move for game ${gameId}`);
            return;
        }

        // Record the player's intended direction for the game loop
        this.playerIntentions.set(playerId, direction);
    }

     
    handleSocketEvents(socket: Socket): void {
        socket.on(ClientEvents.FIND_MATCH, (payload: FindMatchPayload) => {
            this.findMatch(socket, payload);
        });

        socket.on(ClientEvents.PADDLE_MOVE, (payload: PaddleMovePayload) => {
            this.handlePaddleMove(socket, payload);
        });

         socket.on(ClientEvents.LEAVE_GAME, () => {
            // Implement logic to allow players to leave a game gracefully (optional for initial version)
            console.log(`Player ${socket.id} attempting to leave game.`);
            // For now, we can just treat this like a disconnect if in a game
             const gameId = this.playerToGameMap.get(socket.id);
             if (gameId) {
                 // Simulate disconnect cleanup for this player
                 this.handleDisconnect(socket);
             }
         });

        socket.on('disconnect', () => {
            this.handleDisconnect(socket);
        });

        
    }

    // The main game loop, updates all active games periodically
    private startGameLoop(): void {
         if (this.gameLoopInterval) {
             console.warn("Game loop already running!");
             return; // Prevent multiple intervals
         }

         const frameRate = 60; // Hz
         const intervalMs = 1000 / frameRate;

         this.gameLoopInterval = setInterval(() => {
             const now = performance.now();
             const deltaTime = (now - this.lastUpdateTime) / 1000; // Delta time in seconds
             this.lastUpdateTime = now;

             // Update each active game
             this.games.forEach(room => {
                 // Apply player intentions before updating game logic
                 this.applyPlayerIntentions(room.game, room.players, deltaTime);

                 // Update the game state
                 room.game.update(deltaTime);

                 // Check game status after update
                 const currentStatus = room.game.getGameState().status;

                 // If game is playing or scored, emit the state
                 if (currentStatus === 'playing' || currentStatus === 'scored') {
                     this.emitGameState(room.id);
                 }

                 // If game finished, handle end of game
                 if (currentStatus === 'finished') {
                     this.endGame(room.id, 'scored_out');
                 }
             });

         }, intervalMs);

         console.log(`Game loop started with interval: ${intervalMs}ms (${frameRate} FPS)`);
    }

    // Stops the main game loop (useful for testing or server shutdown)
    stopGameLoop(): void {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
            console.log("Game loop stopped.");
        }
    }

    // Applies the recorded intentions (paddle movements) to the game logic
    private applyPlayerIntentions(game: PongGameLogic, players: { left: string | null; right: string | null }, deltaTime: number): void {
         if (players.left) {
            const direction = this.playerIntentions.get(players.left) || 'idle';
            game.movePaddle('left', direction, deltaTime);
         }
         if (players.right) {
            const direction = this.playerIntentions.get(players.right) || 'idle';
            game.movePaddle('right', direction, deltaTime);
         }

         
    }

    // Emits the current state of a specific game room to all clients in that room
    private emitGameState(gameId: string): void {
        const room = this.games.get(gameId);
        if (room) {
            const gameState = room.game.getGameState();
            this.io.to(gameId).emit(ServerEvents.GAME_STATE, gameState);
        }
    }

     // Ends a specific game room
     private endGame(gameId: string, reason: GameEndPayload['reason']): void {
         const room = this.games.get(gameId);
         if (!room) return;

         // Notify players in the room that the game has ended
         const finalGameState = room.game.getGameState();
         const endPayload: GameEndPayload = {
             winner: finalGameState.winner,
             reason: reason,
             message:"ss"
         };
         this.io.to(gameId).emit(ServerEvents.GAME_END, endPayload);

         // Remove players from the game room state
         if (room.players.left) this.removePlayerFromGame(room.players.left);
         if (room.players.right) this.removePlayerFromGame(room.players.right);
         // Remove spectators if any

         // Remove the game room
         this.games.delete(gameId);
         console.log(`Game room ${gameId} removed.`);
     }

    // Helper to clean up player mappings
    private removePlayerFromGame(playerId: string): void {
         const gameId = this.playerToGameMap.get(playerId);
         if (gameId) {
             this.playerToGameMap.delete(playerId);
             this.playerToSideMap.delete(playerId);
             this.playerIntentions.delete(playerId); // Remove intention
             // Have the socket leave the room
             this.io.sockets.sockets.get(playerId)?.leave(gameId);
              console.log(`Player ${playerId} removed from game state and room ${gameId}.`);
         }
    }

    // Generates a unique ID for a new game room
    private generateGameId(): string {
        return Math.random().toString(36).substring(2, 15); // Simple random string ID
    }

    // Method needed for the test to get game instance (for checking state)
    
    public getGame(gameId: string): PongGameLogic | undefined {
         return this.games.get(gameId)?.game;
    }

     // Method needed for the test to expose waiting player state
    public getWaitingPlayer(): string | null {
         return this.waitingPlayer;
    }

     // Method needed for the test to expose playerToGame map
    public getPlayerToGameMap(): Map<string, string> {
        return this.playerToGameMap;
    }

    // Method needed for the test to expose playerToSide map
    public getPlayerToSideMap(): Map<string, PlayerSide> {
        return this.playerToSideMap;
    }

     // Method needed for the test to expose games map
    public getGamesMap(): Map<string, GameRoom> {
        return this.games;
    }

     // Method needed for the test to expose playerIntentions map
    public getPlayerIntentionsMap(): Map<string, PaddleDirection> {
        return this.playerIntentions;
    }
}