// backend/src/types.ts

export interface BallState {
  x: number;
  y: number;
  vx: number; // velocity x
  vy: number; // velocity y
}

export interface PaddleState {
  y: number; // only need y, x is fixed for left/right
  width: number;
  height: number;
}

export interface ScoreState {
  left: number;
  right: number;
}

export type GameStatus = 'waiting' | 'playing' | 'scored' | 'finished';
export type PlayerSide = 'left' | 'right';
export type PaddleDirection = 'up' | 'down' | 'idle';

export interface GameState {
  ball: BallState;
  paddles: {
    left: PaddleState;
    right: PaddleState;
  };
  score: ScoreState;
  status: GameStatus;
  winner: PlayerSide | null; // Used when status is 'finished'
  // Add board dimensions for client rendering reference
  boardWidth: number;
  boardHeight: number;
}

// Constants for game
export const BOARD_WIDTH = 800;
export const BOARD_HEIGHT = 600;
export const PADDLE_WIDTH = 10;
export const PADDLE_HEIGHT = 80;
export const BALL_SIZE = 10; // Ball is a square for simplicity
export const INITIAL_BALL_SPEED = 200; // Pixels per second
export const PADDLE_SPEED = 300; // Pixels per second
export const MAX_SCORE = 5; // Game ends when someone reaches this score
export const SPEED_INCREASE_FACTOR = 1.05;

// Initial state values (can be used in constructor and reset)
export const getInitialBallState = (): BallState => ({
    x: BOARD_WIDTH / 2 - BALL_SIZE / 2,
    y: BOARD_HEIGHT / 2 - BALL_SIZE / 2,
    vx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1), // Random initial direction
    vy: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1) * 0.5, // Slower initial vertical speed
});

export const getInitialPaddleState = (side: PlayerSide): PaddleState => ({
    y: BOARD_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    // x is implicitly defined by side
});

export const getInitialGameState = (): GameState => ({
    ball: getInitialBallState(),
    paddles: {
        left: {...getInitialPaddleState('left')}, // Use spread to create new objects
        right: {...getInitialPaddleState('right')},
    },
    score: { left: 0, right: 0 },
    status: 'waiting', // Or 'playing' if we start immediately
    winner: null,
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
});
// Paddle fixed X positions
export const PADDLE_LEFT_X = 30; // distance from the left edge
export const PADDLE_RIGHT_X = BOARD_WIDTH - 30 - PADDLE_WIDTH; // distance from right edge minus paddle width
