import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import fs from 'fs';
import apiRoutes from './routes/api.js';
import { initDatabase } from './config/database.js';
import { seedDatabase } from './seed/seedData.js';
import { wsService } from './services/websocketService.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 5001);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Health Check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve the built React frontend (client/dist) from the same service in production.
// Only active when a production build exists, so local dev (Vite on :3000) is unaffected.
const clientDist = path.resolve(__dirname, '../../client/dist');
const clientIndex = path.join(clientDist, 'index.html');

if (fs.existsSync(clientIndex)) {
  app.use(express.static(clientDist));

  // SPA fallback: /reception, /display, /track/:token etc. -> index.html.
  // /api/* and /ws are never handled here (/ws is an HTTP upgrade handled by the ws server).
  app.get(/^\/(?!api(\/|$)|ws(\/|$)|assets\/|health$).*/, (_req, res) => {
    res.sendFile(clientIndex);
  });
  console.log(`Serving frontend build from ${clientDist}`);
}

// Unknown API routes should return JSON 404, never the SPA HTML
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Startup & Initialization
async function startServer() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    
    // Seed default demo state on startup if needed
    console.log('Checking & seeding demo data...');
    await seedDatabase('active_demo');

    // Attach WebSocket server for real-time synchronization
    wsService.init(server);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Hospital Queue API & Realtime Server running at http://localhost:${PORT}`);
      console.log(`👉 Health check: http://localhost:${PORT}/health`);
      console.log(`👉 Queue overview: http://localhost:${PORT}/api/queue/overview`);
      console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
