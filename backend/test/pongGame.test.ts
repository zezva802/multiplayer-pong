// backend/test/pongGame.test.ts
import { expect } from 'chai';
import { PongGameLogic } from '../src/models/PongGameLogic';
import {
    BOARD_WIDTH, BOARD_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT,
    BALL_SIZE, INITIAL_BALL_SPEED, MAX_SCORE,
    getInitialGameState, GameState // Import GameState type
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

    // ... other tests ...
});