const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/games'));
app.use('/api/picks', require('./routes/picks'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

app.get('/', (req, res) => {
  res.json({ 
    message: '🏈 Denver Broncos Pickems API Server',
    status: 'Running',
    version: '1.0.0',
    database: process.env.DATABASE_URL ? 'Connected' : 'Not configured',
    reddit: process.env.REDDIT_CLIENT_ID ? 'Configured' : 'Not configured',
    endpoints: [
      'GET /api/auth/reddit',
      'GET /api/games/week/:week',
      'POST /api/picks',
      'GET /api/leaderboard/week/:week',
      'GET /api/leaderboard/season'
    ]
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🏈 Broncos Pickems Server running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔐 Reddit OAuth: ${process.env.REDDIT_CLIENT_ID ? 'Configured' : 'Not configured'}`);
  console.log(`🌐 Frontend URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
});