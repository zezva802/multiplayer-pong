// backend/src/server.ts
import express from "express";
import cors from "cors";
import { createServer } from "http"; // Use Node's http server
import { Server } from "socket.io"; // Import Socket.IO Server
// import gameRoutes from "./routes/gameRoutes"; 
import { SocketPongManager } from "./socket/SocketPongManager"; // Import the manager

const app = express();
const server = createServer(app); // Wrap Express app with HTTP server
const io = new Server(server, { // Create Socket.IO server instance
  cors: {
      origin: "http://localhost:5173", // Allow requests from your frontend's development server
      methods: ["GET", "POST"] // Allowed HTTP methods for CORS
  },
  // Add other socket.io options if needed
});

// Instantiate the Socket Game Manager, passing the Socket.IO server instance
const socketPongManager = new SocketPongManager(io);


const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors()); // Use CORS for the HTTP server too




app.get("/", (req, res) => {
  res.json({ message: "Multiplayer Pong Server is running!" });
});

// --- Socket.io Connection Handling ---
io.on("connection", (socket) => {
  // Pass the new socket connection to the manager
  socketPongManager.handleConnection(socket);
});
// --- End Socket.io Connection Handling ---


// Start the HTTP server (which Socket.IO is attached to)
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server running on port ${PORT}`);
});