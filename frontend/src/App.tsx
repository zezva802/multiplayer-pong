
import React, { useEffect, useState } from 'react';
import socket from './socket'; // Import the socket client instance
import type { GameState} from '../../backend/src/types'; // Import backend types
import type { MatchFoundPayload, GameEndPayload, GameErrorPayload } from '../../backend/src/socket/events';
import { ServerEvents, ClientEvents } from '../../backend/src/socket/events'; // Import event names
import GameArea from './components/GameArea'; // We'll create this component next
import './App.css'; // Basic styling

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [gameId, setGameId] = useState<string | null>(null); // ID of the current game room
  const [playerSide, setPlayerSide] = useState<'left' | 'right' | null>(null); // Player's side in the game
  const [gameState, setGameState] = useState<GameState | null>(null); // Full game state from server
  const [statusMessage, setStatusMessage] = useState('Connecting...'); // Messages for the user
  const [gameEndedMessage, setGameEndedMessage] = useState<string | null>(null); // Message when game ends


  // --- Socket Event Listeners ---
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setStatusMessage('Connected! Click "Find Match" to play.');
       setGameEndedMessage(null); // Clear end message on new connection
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setGameId(null); // Clear game state on disconnect
      setPlayerSide(null);
      setGameState(null);
      setStatusMessage('Disconnected. Attempting to reconnect...');
       setGameEndedMessage(null); // Clear end message on disconnect
    };

    const onNoOpponent = (payload: { message: string }) => {
        setStatusMessage(payload.message);
        setGameId(null); // Ensure game state is clear if waiting
        setPlayerSide(null);
        setGameState(null);
        setGameEndedMessage(null);
    };

    const onMatchFound = (payload: MatchFoundPayload) => {
        console.log('Match found:', payload);
        setGameId(payload.gameId);
        setPlayerSide(payload.playerSide);
        setStatusMessage(`Match found! You are player ${payload.playerSide.toUpperCase()}.`);
        setGameEndedMessage(null);
         // Initial game state will be sent immediately after match found
    };

     // Server sends full game state updates frequently
    const onGameState = (state: GameState) => {
         // console.log('Received Game State:', state);
         setGameState(state);
         // Update status message based on game state, but keep match found message until game starts playing
         if (state.status === 'playing') {
             setStatusMessage(`Player ${state.score.left} - ${state.score.right}`); // Show score
         } else if (state.status === 'scored') {
              const scoredSide = state.ball.x > state.boardWidth / 2 ? 'left' : 'right'; // Simple guess based on x position
              setStatusMessage(`Point for ${scoredSide === 'left' ? 'Left' : 'Right'}! ${state.score.left} - ${state.score.right}`);
         }
    };

    const onGameEnd = (payload: GameEndPayload) => {
        console.log('Game ended:', payload);
        setGameState(null); // Clear game state
        setGameId(null); // Clear game ID
        setPlayerSide(null); // Clear side
        setStatusMessage('Game Over!');
        if (payload.reason === 'scored_out') {
             setGameEndedMessage(`Player ${payload.winner?.toUpperCase()} wins! Final Score: ${gameState?.score.left} - ${gameState?.score.right}`);
        } else if (payload.reason === 'opponent_left') {
             setGameEndedMessage(payload.message || 'Your opponent disconnected.');
        } else {
             setGameEndedMessage('Game ended.');
        }
    };

     const onOpponentDisconnected = (payload: { message: string }) => {
         console.log('Opponent disconnected:', payload.message);
         setGameState(null); // Clear game state
         setGameId(null); // Clear game ID
         setPlayerSide(null); // Clear side
         setStatusMessage('Opponent disconnected.');
         setGameEndedMessage(payload.message);
     };

     const onGameError = (payload: GameErrorPayload) => {
         console.error('Game Error:', payload.message);
         setStatusMessage(`Error: ${payload.message}`);
     }


    // Attach listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(ServerEvents.NO_OPPONENT, onNoOpponent);
    socket.on(ServerEvents.MATCH_FOUND, onMatchFound);
    socket.on(ServerEvents.GAME_STATE, onGameState);
    socket.on(ServerEvents.GAME_END, onGameEnd);
    socket.on(ServerEvents.OPPONENT_DISCONNECTED, onOpponentDisconnected);
    socket.on(ServerEvents.GAME_ERROR, onGameError);


    // Clean up listeners on component unmount
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(ServerEvents.NO_OPPONENT, onNoOpponent);
      socket.off(ServerEvents.MATCH_FOUND, onMatchFound);
      socket.off(ServerEvents.GAME_STATE, onGameState);
      socket.off(ServerEvents.GAME_END, onGameEnd);
      socket.off(ServerEvents.OPPONENT_DISCONNECTED, onOpponentDisconnected);
      socket.off(ServerEvents.GAME_ERROR, onGameError);
    };
  }, [gameState]); // Added gameState to dependencies for status message update on scored

  // --- Client Event Emitters ---
  const findMatch = () => {
    if (isConnected) {
        socket.emit(ClientEvents.FIND_MATCH);
        setStatusMessage('Finding match...');
        setGameEndedMessage(null);
    } else {
        setStatusMessage('Cannot find match. Not connected.');
    }
  };

    // We won't emit paddle moves directly from App, but from GameArea


  return (
    <div className="App">
      <h1>Multiplayer Pong</h1>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>

      {gameId === null && ( // Only show find match button if not in a game
         <button onClick={findMatch} disabled={!isConnected || statusMessage.includes('Waiting') || statusMessage.includes('Finding')}>
             Find Match
         </button>
      )}

      {statusMessage && <p>{statusMessage}</p>}
      {gameEndedMessage && <p className="game-ended-message">{gameEndedMessage}</p>}


      {gameId && playerSide && gameState ? (
        // Render the GameArea component if in a game and state is available
        <GameArea
          gameId={gameId}
          playerSide={playerSide}
          gameState={gameState}
        />
      ) : (
         // Show a placeholder or waiting message when not in a game or state not ready
          gameId === null && !statusMessage.includes('Waiting') && !statusMessage.includes('Finding') && <p>Click "Find Match" to start a game.</p>
      )}
    </div>
  );
}

export default App;