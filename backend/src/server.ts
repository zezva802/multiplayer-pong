// backend/src/server.ts
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { SocketPongManager } from "./socket/SocketPongManager";

const app = express();
const server = createServer(app);

// --- MODIFICATION START ---
// Allow connections from the frontend's public URL, read from an environment variable
// Fallback to localhost for local development
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
      // origin can be a string (one URL), an array of strings (multiple URLs),
      // or a function for more complex logic.
      // For a simple case with one frontend, a string or array is fine.
      // If using an array: origin: [allowedOrigin, "http://localhost:5173"]
      origin: allowedOrigin, // Use the environment variable value
      methods: ["GET", "POST"]
  },
  // Add other socket.io options if needed
});
// --- MODIFICATION END ---

const socketPongManager = new SocketPongManager(io);

const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors()); // Use CORS for the HTTP server too (less critical for websockets, but good practice)

app.get("/", (req, res) => {
  res.json({ message: "Multiplayer Pong Server is running!" });
});

io.on("connection", (socket) => {
  socketPongManager.handleConnection(socket);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server running on port ${PORT}`);
  console.log(`Allowed frontend origin for sockets: ${allowedOrigin}`); // Log this to verify
});