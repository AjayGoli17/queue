import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import { initDatabase } from './config/database.js';
import { seedDatabase } from './seed/seedData.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Health Check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Startup & Initialization
async function startServer() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    
    // Seed default demo state on startup if needed
    console.log('Checking & seeding demo data...');
    await seedDatabase('active_demo');

    app.listen(PORT, () => {
      console.log(`🚀 Hospital Queue API Server running at http://localhost:${PORT}`);
      console.log(`👉 Health check: http://localhost:${PORT}/health`);
      console.log(`👉 Queue overview: http://localhost:${PORT}/api/queue/overview`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
