// frontend/src/components/GameArea.tsx
import React, { useEffect, useRef, useState } from 'react';
import { GameState, PlayerSide, PaddleDirection } from '../../../backend/src/types'; // Import types
import socket from '../socket'; // Import socket
import { ClientEvents, PaddleMovePayload } from '../../../backend/src/socket/events'; // Import events

interface GameAreaProps {
  gameId: string;
  playerSide: PlayerSide;
  gameState: GameState;
}

const GameArea: React.FC<GameAreaProps> = ({ gameId, playerSide, gameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paddleDirection, setPaddleDirection] = useState<'up' | 'down' | 'idle'>('idle');

  // --- Drawing Logic ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions based on game state
    canvas.width = gameState.boardWidth;
    canvas.height = gameState.boardHeight;

    // Clear canvas
    ctx.fillStyle = '#000'; // Black background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw middle line (optional)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Draw paddles
    ctx.fillStyle = '#fff'; // White paddles
    const leftPaddle = gameState.paddles.left;
    // Need paddle X positions - add to types.ts or define here relative to width
    const PADDLE_LEFT_X = 20; // Example X position for left paddle
    const PADDLE_RIGHT_X = gameState.boardWidth - 20 - leftPaddle.width; // Example X position for right paddle

    ctx.fillRect(PADDLE_LEFT_X, leftPaddle.y, leftPaddle.width, leftPaddle.height);

    const rightPaddle = gameState.paddles.right;
    ctx.fillRect(PADDLE_RIGHT_X, rightPaddle.y, rightPaddle.width, rightPaddle.height);

    // Draw ball
    ctx.fillStyle = '#fff'; // White ball
    const ball = gameState.ball;
    const ballSize = gameState.boardWidth / (800 / 10); // Scale ball size based on board width if needed
    const ballRadius = ballSize / 2;
    // Draw a circle: arc(x, y, radius, startAngle, endAngle)
    ctx.beginPath();
    ctx.arc(ball.x + ballRadius, ball.y + ballRadius, ballRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw Score (optional, could be separate component)
    ctx.fillStyle = '#fff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${gameState.score.left}`, canvas.width / 4, 50);
    ctx.fillText(`${gameState.score.right}`, canvas.width * 3 / 4, 50);

     // Draw status message if needed (e.g., "Game Over", "Point!")
     if (gameState.status !== 'playing') {
        ctx.fillStyle = '#fff';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
         let statusText = '';
         if (gameState.status === 'waiting') statusText = 'Waiting...';
         else if (gameState.status === 'scored') statusText = 'Point!';
         else if (gameState.status === 'finished') statusText = `Player ${gameState.winner?.toUpperCase()} Wins!`;

         ctx.fillText(statusText, canvas.width / 2, canvas.height / 2 - 50);
     }


  }, [gameState]); // Redraw whenever gameState changes

  // --- Input Handling ---
// Input Handling - Improved Version
useEffect(() => {
  const keysPressed: { [key: string]: boolean } = {};

  const resolveDirection = (): PaddleDirection => {
    if (playerSide === 'left') {
      if (keysPressed['w'] || keysPressed['W']) return 'up';
      if (keysPressed['s'] || keysPressed['S']) return 'down';
    } else if (playerSide === 'right') {
      if (keysPressed['ArrowUp']) return 'up';
      if (keysPressed['ArrowDown']) return 'down';
    }
    return 'idle';
  };

  const updateDirection = () => {
    const newDirection = resolveDirection();
    if (newDirection !== paddleDirection) {
      setPaddleDirection(newDirection);
      socket.emit(ClientEvents.PADDLE_MOVE, { gameId, direction: newDirection });
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      ['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      event.preventDefault();
      keysPressed[event.key] = true;
      updateDirection();
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (
      ['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      keysPressed[event.key] = false;
      updateDirection();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, [gameId, playerSide, paddleDirection]);



  // Render the canvas
  return (
    <div className="game-area-container">
      <canvas ref={canvasRef}></canvas>
      
    </div>
  );
};

export default GameArea;