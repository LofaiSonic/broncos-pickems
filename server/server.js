const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Basic test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Broncos Pickems API Server is running!',
    database: process.env.DATABASE_URL ? 'Connected' : 'Not configured',
    reddit: process.env.REDDIT_CLIENT_ID ? 'Configured' : 'Not configured'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🏈 Broncos Pickems Server running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔐 Reddit OAuth: ${process.env.REDDIT_CLIENT_ID ? 'Configured' : 'Not configured'}`);
});