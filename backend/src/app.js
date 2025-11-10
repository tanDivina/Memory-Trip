// backend/src/app.js
import express from 'express';
import cors from 'cors';
import localGameRoutes from './routes/localGameRoutes.js';
import onlineGameRoutes from './routes/onlineGameRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api', localGameRoutes);
app.use('/api', onlineGameRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Error handling middleware
app.use(errorHandler);

export default app;
