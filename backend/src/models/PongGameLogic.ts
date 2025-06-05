// backend/src/models/PongGameLogic.ts
import {
    GameState, BallState, PaddleState, ScoreState, GameStatus, PlayerSide, PaddleDirection,
    BOARD_WIDTH, BOARD_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_SIZE,
    INITIAL_BALL_SPEED, MAX_SCORE, PADDLE_SPEED, PADDLE_LEFT_X, PADDLE_RIGHT_X, // Import paddle X constants
    getInitialGameState, getInitialBallState, getInitialPaddleState, SPEED_INCREASE_FACTOR
} from '../types';

// Add a constant for how much to increase speed after a hit
 // Increase speed by 5% on each hit

export class PongGameLogic {
    private state: GameState;
    // We might need a way to track if the ball has just hit a paddle to avoid
    // double-counting collisions in a single frame if delta time is large.
    // For simplicity initially, we might skip this, but keep it in mind for bugs.
    // private lastHitPaddle: PlayerSide | null = null; // Could add this later

    constructor() {
        this.state = getInitialGameState();
    }

    getGameState(): GameState {
        // Returning a shallow copy to be slightly safer
        return {
            ...this.state,
            ball: { ...this.state.ball },
            paddles: {
                left: { ...this.state.paddles.left },
                right: { ...this.state.paddles.right },
            },
            score: { ...this.state.score },
        };
    }

    update(deltaTime: number): void {
        if (this.state.status !== 'playing') {
            return;
        }

        // 1. Update ball position
        this.state.ball.x += this.state.ball.vx * deltaTime;
        this.state.ball.y += this.state.ball.vy * deltaTime;

        // 2. Check and handle collisions (walls and paddles)
        this.checkCollisions();

        // 3. Check for scoring (ball goes past paddles)
        this.checkScoring();
        

        // 4. Check game end condition
        // @ts-ignore
        if (this.state.status !== 'scored') { // Only check if not in a scoring state
             this.checkGameEnd();
        }


        // If the game is in a 'scored' state, perhaps pause or reset
        // @ts-ignore
        if (this.state.status === 'scored') {
             // This state could be used to trigger a reset timer on the server
             // For now, let's assume an external mechanism calls resetBall() after a delay
        }
    }

    movePaddle(side: PlayerSide, direction: PaddleDirection, deltaTime: number): void {
        // Only allow movement if game is playing
        if (this.state.status !== 'playing') {
            return;
        }

        const paddle = this.state.paddles[side];
        const distance = PADDLE_SPEED * deltaTime;

        if (direction === 'up') {
            paddle.y -= distance;
            // Prevent moving off top edge (y cannot be less than 0)
            if (paddle.y < 0) {
                paddle.y = 0;
            }
        } else if (direction === 'down') {
             paddle.y += distance;
             // Prevent moving off bottom edge (paddle.y + paddle.height cannot be greater than BOARD_HEIGHT)
             if (paddle.y + paddle.height > BOARD_HEIGHT) {
                 paddle.y = BOARD_HEIGHT - paddle.height;
             }
        }
        // 'idle' direction means the paddle velocity is zero for this frame, so it doesn't move.
        // No code needed for 'idle' if we're just applying movement distance here.
    }


    private checkCollisions(): void {
        const ball = this.state.ball;
        const ballRadius = BALL_SIZE / 2;

        // Check collision with top wall (y = 0)
        if (ball.y - ballRadius < 0) {
            ball.y = ballRadius; // Correct position
            ball.vy *= -1; // Reverse vertical velocity
        }

        // Check collision with bottom wall (y = BOARD_HEIGHT)
        if (ball.y + ballRadius > BOARD_HEIGHT) {
            ball.y = BOARD_HEIGHT - ballRadius; // Correct position
            ball.vy *= -1; // Reverse vertical velocity
        }

        // Check collision with paddles
        this.checkPaddleCollision('left', this.state.paddles.left);
        this.checkPaddleCollision('right', this.state.paddles.right);
    }

    private checkPaddleCollision(side: PlayerSide, paddle: PaddleState): void {
        const ball = this.state.ball;
        const ballRadius = BALL_SIZE / 2;
        const ballLeft = ball.x - ballRadius;
        const ballRight = ball.x + ballRadius;
        const ballTop = ball.y - ballRadius;
        const ballBottom = ball.y + ballRadius;
        const paddleX = side === 'left' ? PADDLE_LEFT_X : PADDLE_RIGHT_X;
        const paddleHeight = PADDLE_HEIGHT; // Already a constant, but good to use

        // Determine if collision is possible based on ball direction and X position
        const canCollide =
            (side === 'left' && ball.vx < 0 && ballRight >= paddleX) ||
            (side === 'right' && ball.vx > 0 && ballLeft <= paddleX + PADDLE_WIDTH);

        // Check for overlap if collision is possible
        if (canCollide &&
            ballLeft <= paddleX + PADDLE_WIDTH && ballRight >= paddleX && // Ball horizontal overlap check
            ballBottom >= paddle.y && ballTop <= paddle.y + paddleHeight // Ball vertical overlap check
           )
        {
            // Collision detected!
            const hitRelative = (ball.y - (paddle.y + paddleHeight / 2)) / (paddleHeight / 2); // -1 to 1 range
            const maxBounceAngle = Math.PI / 4; // 45 degrees

             // Calculate new speed magnitude (increase speed on hit)
             const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
             const newSpeed = currentSpeed * SPEED_INCREASE_FACTOR;

            // Calculate new velocities based on hit angle and new speed
            if (side === 'left') {
                 ball.vx = newSpeed * Math.cos(hitRelative * maxBounceAngle);
                 ball.vy = newSpeed * Math.sin(hitRelative * maxBounceAngle);
                 // Correct position
                 ball.x = paddleX + PADDLE_WIDTH + ballRadius;
                 // Ensure moving right
                 if (ball.vx < 0) ball.vx *= -1;

            } else { // side === 'right'
                 ball.vx = newSpeed * -Math.cos(hitRelative * maxBounceAngle); // Note the negative sign for right paddle
                 ball.vy = newSpeed * Math.sin(hitRelative * maxBounceAngle);
                 // Correct position
                 ball.x = paddleX - ballRadius;
                 // Ensure moving left
                 if (ball.vx > 0) ball.vx *= -1;
            }

            // Optional: Add a cooldown/flag if needed to prevent multi-collision per frame
            // this.lastHitPaddle = side;
        }
         // Optional: If using a cooldown/flag, reset it if the ball is far from the paddle
         // if (this.lastHitPaddle === side && (side === 'left' && ballLeft > paddleX + PADDLE_WIDTH + BALL_SIZE) || (side === 'right' && ballRight < paddleX - BALL_SIZE)) {
         //     this.lastHitPaddle = null;
         // }
    }

    // Method to check for scoring (ball goes past paddles)
    private checkScoring(): void {
         const ball = this.state.ball;
         const ballRadius = BALL_SIZE / 2;

         // Ball goes past Right edge (left scores)
         // Check if the ball's left edge is past the right edge of the board
         if (ball.x - ballRadius > BOARD_WIDTH) {
             this.state.score.left++;
             this.resetBall(); // Reset state for the next round
             this.checkGameEnd(); // Check if game ended due to scoring
             return; // Stop further checks in this update
         }

         // Ball goes past Left edge (right scores)
         // Check if the ball's right edge is past the left edge of the board (0)
         if (ball.x + ballRadius < 0) {
              
              this.state.score.right++;
              this.resetBall();
              this.checkGameEnd();
              return;
         }
    }

    // Method to reset ball after a score
    // Note: This just resets position/velocity. Server game loop needs to handle state transition/pause.
    private resetBall(): void {
         this.state.ball = getInitialBallState(); // Reset ball position and velocity
         this.state.paddles.left = getInitialPaddleState('left'); // Reset paddles too
         this.state.paddles.right = getInitialPaddleState('right'); // Reset paddles too
         this.state.status = 'playing'; // Immediately resume after reset in this simple model
         // In a real game, you might set status to 'scored', wait a bit, then transition to 'playing'
    }


     // Method to check game end conditions
     private checkGameEnd(): void {
          if (this.state.score.left >= MAX_SCORE) {
              this.state.status = 'finished';
              this.state.winner = 'left';
          } else if (this.state.score.right >= MAX_SCORE) {
              this.state.status = 'finished';
              this.state.winner = 'right';
          }
      }

    // Method to start the game (called by manager when 2 players join)
    startGame(): void {
        if (this.state.status === 'waiting') {
            this.state.status = 'playing';
            // Initial ball velocity is set in getInitialBallState, no need to do it here again
        }
    }
}