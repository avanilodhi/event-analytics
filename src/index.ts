import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/db';
import eventRoutes from './routes/eventRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import { globalLimiter, perKeyLimiter } from './middleware/rateLimiter';


dotenv.config();

const app = express();
app.use(cors({
  origin: "http://localhost:3000", // your frontend
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "x-api-key"]
}));

// Middleware
app.use(helmet());         // Security headers
app.use(morgan('dev'));    // Logging
app.use(express.json());    // Parse JSON

// DB Connection
connectDB();

// Global IP rate limiter
app.use(globalLimiter);

// Protect /api/* with API key + per-key limiter BEFORE mounting routes
app.use('/api', apiKeyAuth, perKeyLimiter);


// Routes
app.use('/api/events', eventRoutes);
app.use('/api/analytics', analyticsRoutes);

// Simple root/health check
app.get('/', (req, res) => res.send('Event Analytics API is running 🚀'));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
