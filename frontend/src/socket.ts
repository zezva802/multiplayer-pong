// frontend/src/socket.ts
import { io, Socket } from 'socket.io-client';
import { ClientEvents, ServerEvents } from '../../backend/src/socket/events';
import type { MatchFoundPayload, GameEndPayload, GameErrorPayload } from '../../backend/src/socket/events';
import type { GameState } from '../../backend/src/types';



interface ClientToServerEvents {
    [ClientEvents.FIND_MATCH]: () => void; 
    [ClientEvents.PADDLE_MOVE]: (payload: { direction: 'up' | 'down' | 'idle'; gameId: string }) => void; // Add gameId to payload
    [ClientEvents.LEAVE_GAME]: (payload: { gameId: string }) => void; // Add gameId
}

interface ServerToClientEvents {
    [ServerEvents.MATCH_FOUND]: (payload: MatchFoundPayload) => void;
    [ServerEvents.GAME_STATE]: (state: GameState) => void;
    [ServerEvents.GAME_START]: () => void; 
    [ServerEvents.GAME_END]: (payload: GameEndPayload) => void;
    [ServerEvents.NO_OPPONENT]: (payload: { message: string }) => void;
    [ServerEvents.OPPONENT_DISCONNECTED]: (payload: { message: string }) => void;
    [ServerEvents.GAME_ERROR]: (payload: GameErrorPayload) => void;
    
}


const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'; 

// Create the socket connection

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(BACKEND_URL);

// Export the socket instance
export default socket;


socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err);
});