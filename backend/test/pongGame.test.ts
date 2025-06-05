// backend/test/pongGame.test.ts
import { expect } from 'chai';
import { PongGameLogic } from '../src/models/PongGameLogic';
import {
    BOARD_WIDTH, BOARD_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT,
    BALL_SIZE, PADDLE_LEFT_X, // Import the left paddle X position constant
    getInitialGameState, GameState, PADDLE_RIGHT_X, SPEED_INCREASE_FACTOR, PADDLE_SPEED // Import types and helpers
} from '../src/types';

describe('PongGameLogic', () => {
    let game: PongGameLogic;
    const initialState: GameState = getInitialGameState(); // Get a consistent initial state

    beforeEach(() => {
        // We will instantiate the game here once we create the class
        // game = new PongGameLogic(); // Keep this commented for the first "Red" run
    });

    it('should initialize with the correct initial state', () => {
        // This test currently expects a PongGameLogic class and its state
        // Let's uncomment the initialization line
        game = new PongGameLogic(); // Now this line will run

        // Assertions to check the initial state
        const currentState = game.getGameState(); // We'll need a getGameState method

        // Basic structural check
        expect(currentState).to.have.keys(['ball', 'paddles', 'score', 'status', 'winner', 'boardWidth', 'boardHeight']);

        // Check board dimensions
        expect(currentState.boardWidth).to.equal(BOARD_WIDTH);
        expect(currentState.boardHeight).to.equal(BOARD_HEIGHT);

        // Check initial scores
        expect(currentState.score.left).to.equal(0);
        expect(currentState.score.right).to.equal(0);

        // Check initial status
        expect(currentState.status).to.equal('waiting'); // Or 'playing', depending on your design choice. 'waiting' is safer for multiplayer.

        // Check paddle positions (vertically centered) and size
        expect(currentState.paddles.left.y).to.equal(BOARD_HEIGHT / 2 - PADDLE_HEIGHT / 2);
        expect(currentState.paddles.left.width).to.equal(PADDLE_WIDTH);
        expect(currentState.paddles.left.height).to.equal(PADDLE_HEIGHT);
        expect(currentState.paddles.right.y).to.equal(BOARD_HEIGHT / 2 - PADDLE_HEIGHT / 2);
        expect(currentState.paddles.right.width).to.equal(PADDLE_WIDTH);
        expect(currentState.paddles.right.height).to.equal(PADDLE_HEIGHT);


        // Check ball initial position (centered) and size
        expect(currentState.ball.x).to.equal(BOARD_WIDTH / 2 - BALL_SIZE / 2);
        expect(currentState.ball.y).to.equal(BOARD_HEIGHT / 2 - BALL_SIZE / 2);
        expect(currentState.ball.vx).to.not.equal(0); // Ensure initial velocity is non-zero
        expect(currentState.ball.vy).to.not.equal(0); // Ensure initial velocity is non-zero
        // We can't check the exact vx/vy values because they are randomized,
        // but we can check their magnitude or direction sign later if needed.
        // For now, just ensure they exist and are numbers.
        expect(currentState.ball.vx).to.be.a('number');
        expect(currentState.ball.vy).to.be.a('number');

        expect(currentState.winner).to.be.null; // No winner initially
    });


    it('should update ball position based on velocity', () => {
        game = new PongGameLogic(); // Ensure game is initialized
        game.startGame(); // Start the game so the ball might move

        // Set a known initial state for this specific test
        const initialX = 100;
        const initialY = 150;
        const initialVx = 50; // Pixels per second
        const initialVy = 100; // Pixels per second
        game['state'].ball = { x: initialX, y: initialY, vx: initialVx, vy: initialVy, }; // Directly modify state for test setup

        const deltaTime = 1 / 60; // Simulate one frame at 60 FPS

        game.update(deltaTime); // Call the method we are testing

        const expectedX = initialX + initialVx * deltaTime;
        const expectedY = initialY + initialVy * deltaTime;

        const currentState = game.getGameState();
        // Use `closeTo` for floating-point comparisons
        expect(currentState.ball.x).to.be.closeTo(expectedX, 0.001);
        expect(currentState.ball.y).to.be.closeTo(expectedY, 0.001);
    });

    it('should bounce ball off the top wall', () => {
        game.startGame(); // Start the game
        const deltaTime = 1 / 60;

        // Position the ball near the top edge, moving upwards
        const ballRadius = BALL_SIZE / 2;
        const initialX = BOARD_WIDTH / 2;
        const initialY = ballRadius - 1; // Just above the top edge (y=0)
        const initialVx = 50;
        const initialVy = -100; // Moving upwards

        game['state'].ball = { x: initialX, y: initialY, vx: initialVx, vy: initialVy }; // Setup state

        game.update(deltaTime); // Update the game state

        const currentState = game.getGameState();

        // Expect vertical velocity to be reversed
        expect(currentState.ball.vy).to.be.closeTo(-initialVy, 0.001); // vy should be positive

        // Expect ball not to go past the top edge (y should be >= 0 + ballRadius)
        // Add a small tolerance because of floating point math and deltaTime
        expect(currentState.ball.y).to.be.at.least(ballRadius - 0.001);

        // Expect horizontal position to update normally
        const expectedX = initialX + initialVx * deltaTime;
        expect(currentState.ball.x).to.be.closeTo(expectedX, 0.001);
    });


    it('should bounce ball off the bottom wall', () => {
        game.startGame(); // Start the game
        const deltaTime = 1 / 60;

        // Position the ball near the bottom edge, moving downwards
        const ballRadius = BALL_SIZE / 2;
        const initialX = BOARD_WIDTH / 2;
        const initialY = BOARD_HEIGHT - ballRadius + 1; // Just below the bottom edge (y=BOARD_HEIGHT)
        const initialVx = 50;
        const initialVy = 100; // Moving downwards

        game['state'].ball = { x: initialX, y: initialY, vx: initialVx, vy: initialVy }; // Setup state

        game.update(deltaTime); // Update the game state

        const currentState = game.getGameState();

        // Expect vertical velocity to be reversed
        expect(currentState.ball.vy).to.be.closeTo(-initialVy, 0.001); // vy should be negative

        // Expect ball not to go past the bottom edge (y should be <= BOARD_HEIGHT - ballRadius)
        // Add a small tolerance
        expect(currentState.ball.y).to.be.at.most(BOARD_HEIGHT - ballRadius + 0.001);

        // Expect horizontal position to update normally
        const expectedX = initialX + initialVx * deltaTime;
        expect(currentState.ball.x).to.be.closeTo(expectedX, 0.001);
    });


    it('should bounce ball off the left paddle', () => {
        const deltaTime = 1 / 60;
        const ballRadius = BALL_SIZE / 2;
        const paddleHeight = PADDLE_HEIGHT;

        // Position the ball just to the right of the left paddle, moving left
        const initialX = PADDLE_LEFT_X + PADDLE_WIDTH + ballRadius + 5; // 5 units right of paddle edge
        const initialY = BOARD_HEIGHT / 2; // Center vertically for simplicity
        const initialVx = -200; // Moving left
        const initialVy = 50; // Small vertical movement

        // Position the left paddle to intersect the ball's vertical path
        const paddleY = initialY - paddleHeight / 2; // Center paddle vertically with ball

        game['state'].ball = { x: initialX, y: initialY, vx: initialVx, vy: initialVy };
        game['state'].paddles.left.y = paddleY;

        // Run update multiple times to ensure collision occurs
        // (This is a bit less pure TDD, ideally you calculate exact deltaTime,
        // but simpler for simulation in test)
        for (let i = 0; i < 5; i++) {
             game.update(deltaTime);
        }


        const currentState = game.getGameState();

        // Expect horizontal velocity to be reversed (moving right)
        expect(currentState.ball.vx).to.be.greaterThan(0);
        expect(currentState.ball.vx).to.be.closeTo(Math.abs(initialVx), Math.abs(initialVx * 0.1));
 // Check magnitude (allow for slight speed increase later)

        // Expect vertical velocity to potentially change (depending on hit location relative to paddle center)
        // For this simple test where we hit the center, vy might stay roughly the same or flip sign depending on implementation
        // Let's just assert it's still a number for now, and refine later if adding angle logic
        expect(currentState.ball.vy).to.be.a('number');
        // A basic check: if we hit the center (y=paddle.y + height/2), vy direction might not flip
        // Refine this assertion based on your planned angle logic
        // If hitting top half (y < paddle.y + height/2), vy should become more negative
        // If hitting bottom half (y > paddle.y + height/2), vy should become more positive
        // For now, let's skip asserting exact vy change and focus on vx flip and position
        // expect(currentState.ball.vy).to.be.closeTo(initialVy, 0.001); // If no angle change logic

        // Expect ball position to be to the right of the paddle (pushed out)
        expect(currentState.ball.x - ballRadius).to.be.at.least(PADDLE_LEFT_X + PADDLE_WIDTH - 0.001); // Ball's left edge should be >= paddle's right edge
    });

    it('should bounce ball off the right paddle', () => {
        const deltaTime = 1 / 60;
        const ballRadius = BALL_SIZE / 2;
        const paddleHeight = PADDLE_HEIGHT;

        // Position the ball just to the left of the right paddle, moving right
        const initialX = PADDLE_RIGHT_X - ballRadius - 5; // 5 units left of paddle edge
        const initialY = BOARD_HEIGHT / 2; // Center vertically
        const initialVx = 200; // Moving right
        const initialVy = -50; // Small vertical movement

        // Position the right paddle to intersect the ball's vertical path
        const paddleY = initialY - paddleHeight / 2; // Center paddle vertically with ball

        game['state'].ball = { x: initialX, y: initialY, vx: initialVx, vy: initialVy };
        game['state'].paddles.right.y = paddleY;

        // Run update multiple times to ensure collision occurs
        for (let i = 0; i < 5; i++) {
             game.update(deltaTime);
        }

        const currentState = game.getGameState();

        // Expect horizontal velocity to be reversed (moving left)
        expect(currentState.ball.vx).to.be.lessThan(0);
         // Check magnitude (allow for slight speed increase later)
        const initialSpeed = Math.sqrt(initialVx * initialVx + initialVy * initialVy);
        const currentSpeed = Math.sqrt(currentState.ball.vx * currentState.ball.vx + currentState.ball.vy * currentState.ball.vy);
        // Check if speed increased slightly (based on SPEED_INCREASE_FACTOR)
        // Expect speed to be roughly initialSpeed * SPEED_INCREASE_FACTOR
         expect(currentSpeed).to.be.closeTo(initialSpeed * SPEED_INCREASE_FACTOR, initialSpeed * SPEED_INCREASE_FACTOR * 0.1); // Allow 10% tolerance


        // Expect vertical velocity to potentially change (depending on hit location)
        expect(currentState.ball.vy).to.be.a('number');
        // Add assertion for angle logic if implemented, similar to the left paddle test.

        // Expect ball position to be to the left of the paddle (pushed out)
        expect(currentState.ball.x + ballRadius).to.be.at.most(PADDLE_RIGHT_X + 0.001); // Ball's right edge should be <= paddle's left edge
    });

    it('should score a point for the left player when ball goes past right paddle', () => {
    const deltaTime = 1 / 60;
    const ballRadius = BALL_SIZE / 2;

    // Place ball just beyond right edge
    const initialX = BOARD_WIDTH + ballRadius + 1;
    const initialY = BOARD_HEIGHT / 2;
    const initialVx = 100;
    const initialVy = 0;

    game['state'].ball = { x: initialX, y: initialY, vx: initialVx, vy: initialVy };
    game['state'].score.left = 0;
    game['state'].score.right = 0;

    // Single update should be enough
    game.update(deltaTime);

    const currentState = game.getGameState();

    expect(currentState.score.left).to.equal(1);
    expect(currentState.score.right).to.equal(0);
    expect(currentState.status).to.equal('playing');
    expect(currentState.ball.x).to.be.closeTo(getInitialGameState().ball.x, 0.001);
});


it('should score a point for the right player when ball goes past left paddle', () => {
    const deltaTime = 1 / 60;
    const ballRadius = BALL_SIZE / 2;

    // Place ball just beyond the left edge
    const initialX = -ballRadius - 1;
    const initialY = BOARD_HEIGHT / 2;
    const initialVx = -100; // Moving left
    const initialVy = 0;

    game['state'].ball = { x: initialX, y: initialY, vx: initialVx, vy: initialVy };
    game['state'].score.left = 0;
    game['state'].score.right = 0;

    // Single update should be enough to register score
    game.update(deltaTime);

    const currentState = game.getGameState();

    // Expect right player to score
    expect(currentState.score.right).to.equal(1);
    expect(currentState.score.left).to.equal(0);

    // Expect ball reset to initial state
    const initialGameState = getInitialGameState();
    expect(currentState.ball.x).to.be.closeTo(initialGameState.ball.x, 0.001);
    expect(currentState.ball.y).to.be.closeTo(initialGameState.ball.y, 0.001);
    expect(currentState.ball.vx).to.not.equal(0);
    expect(currentState.ball.vy).to.not.equal(0);

    // Expect paddle positions to be reset
    expect(currentState.paddles.left.y).to.be.closeTo(initialGameState.paddles.left.y, 0.001);
    expect(currentState.paddles.right.y).to.be.closeTo(initialGameState.paddles.right.y, 0.001);

    // Expect game status to be 'playing'
    expect(currentState.status).to.equal('playing');
});


it('should move the left paddle up', () => {
        const deltaTime = 1 / 60;
        const initialY = BOARD_HEIGHT / 2; // Start paddle in the middle
        game['state'].paddles.left.y = initialY; // Setup initial position

        const distance = PADDLE_SPEED * deltaTime; // Calculate expected movement distance

        game.movePaddle('left', 'up', deltaTime); // Call the method we are testing

        const currentState = game.getGameState();
        const expectedY = initialY - distance;

        // Expect paddle Y position to decrease
        expect(currentState.paddles.left.y).to.be.closeTo(expectedY, 0.001);
    });

    it('should move the left paddle down', () => {
        const deltaTime = 1 / 60;
        const initialY = BOARD_HEIGHT / 2; // Start paddle in the middle
        game['state'].paddles.left.y = initialY; // Setup initial position

        const distance = PADDLE_SPEED * deltaTime;

        game.movePaddle('left', 'down', deltaTime);

        const currentState = game.getGameState();
        const expectedY = initialY + distance;

        // Expect paddle Y position to increase
        expect(currentState.paddles.left.y).to.be.closeTo(expectedY, 0.001);
    });

    it('should move the right paddle up', () => {
        const deltaTime = 1 / 60;
        const initialY = BOARD_HEIGHT / 2; // Start paddle in the middle
        game['state'].paddles.right.y = initialY; // Setup initial position

        const distance = PADDLE_SPEED * deltaTime;

        game.movePaddle('right', 'up', deltaTime);

        const currentState = game.getGameState();
        const expectedY = initialY - distance;

        // Expect paddle Y position to decrease
        expect(currentState.paddles.right.y).to.be.closeTo(expectedY, 0.001);
    });

    it('should move the right paddle down', () => {
        const deltaTime = 1 / 60;
        const initialY = BOARD_HEIGHT / 2; // Start paddle in the middle
        game['state'].paddles.right.y = initialY; // Setup initial position

        const distance = PADDLE_SPEED * deltaTime;

        game.movePaddle('right', 'down', deltaTime);

        const currentState = game.getGameState();
        const expectedY = initialY + distance;

        // Expect paddle Y position to increase
        expect(currentState.paddles.right.y).to.be.closeTo(expectedY, 0.001);
    });

    it('should prevent left paddle from moving off top edge', () => {
        const deltaTime = 1 / 60;
        const initialY = 5; // Start paddle near top edge
        game['state'].paddles.left.y = initialY;

        // Move paddle up multiple times to try and force it past the edge
        for (let i = 0; i < 10; i++) {
             game.movePaddle('left', 'up', deltaTime);
        }

        const currentState = game.getGameState();

        // Expect paddle Y position to be at 0 (top edge)
        expect(currentState.paddles.left.y).to.be.closeTo(0, 0.001);
    });

    it('should prevent left paddle from moving off bottom edge', () => {
        const deltaTime = 1 / 60;
        const initialY = BOARD_HEIGHT - PADDLE_HEIGHT - 5; // Start paddle near bottom edge
        game['state'].paddles.left.y = initialY;

        // Move paddle down multiple times
        for (let i = 0; i < 10; i++) {
             game.movePaddle('left', 'down', deltaTime);
        }

        const currentState = game.getGameState();

        // Expect paddle Y position to be at BOARD_HEIGHT - PADDLE_HEIGHT (bottom edge)
        expect(currentState.paddles.left.y).to.be.closeTo(BOARD_HEIGHT - PADDLE_HEIGHT, 0.001);
    });

     it('should prevent right paddle from moving off top edge', () => {
        const deltaTime = 1 / 60;
        const initialY = 5; // Start paddle near top edge
        game['state'].paddles.right.y = initialY;

        // Move paddle up multiple times
        for (let i = 0; i < 10; i++) {
             game.movePaddle('right', 'up', deltaTime);
        }

        const currentState = game.getGameState();

        // Expect paddle Y position to be at 0 (top edge)
        expect(currentState.paddles.right.y).to.be.closeTo(0, 0.001);
    });

    it('should prevent right paddle from moving off bottom edge', () => {
        const deltaTime = 1 / 60;
        const initialY = BOARD_HEIGHT - PADDLE_HEIGHT - 5; // Start paddle near bottom edge
        game['state'].paddles.right.y = initialY;

        // Move paddle down multiple times
        for (let i = 0; i < 10; i++) {
             game.movePaddle('right', 'down', deltaTime);
        }

        const currentState = game.getGameState();

        // Expect paddle Y position to be at BOARD_HEIGHT - PADDLE_HEIGHT (bottom edge)
        expect(currentState.paddles.right.y).to.be.closeTo(BOARD_HEIGHT - PADDLE_HEIGHT, 0.001);
    });


     it('should do nothing if direction is idle', () => {
        const deltaTime = 1 / 60;
        const initialY = BOARD_HEIGHT / 2;
        game['state'].paddles.left.y = initialY;
        game['state'].paddles.right.y = initialY;

        game.movePaddle('left', 'idle', deltaTime);
        game.movePaddle('right', 'idle', deltaTime);

        const currentState = game.getGameState();
        expect(currentState.paddles.left.y).to.be.closeTo(initialY, 0.001);
        expect(currentState.paddles.right.y).to.be.closeTo(initialY, 0.001);
     });

     it('should not move paddle if game is not playing', () => {
        const deltaTime = 1 / 60;
        const initialY = BOARD_HEIGHT / 2;
        game = new PongGameLogic(); // Reset game, status will be 'waiting'
        game['state'].paddles.left.y = initialY;

        game.movePaddle('left', 'up', deltaTime); // Try to move up

        const currentState = game.getGameState();
        // Expect paddle position to remain unchanged
        expect(currentState.paddles.left.y).to.be.closeTo(initialY, 0.001);
     });


    // ... other tests ...
});