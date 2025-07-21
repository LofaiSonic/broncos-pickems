const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const db = require('./models/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: '🏈 Denver Broncos Pickems API Server',
    status: 'Running',
    version: '1.0.0',
    database: process.env.DATABASE_URL ? 'Connected' : 'Not configured',
    reddit: process.env.REDDIT_CLIENT_ID ? 'Configured' : 'Not configured',
    endpoints: [
      'GET /api/auth/reddit',
      'GET /api/games/week/1',
      'POST /api/picks',
      'GET /api/leaderboard/week/1'
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Reddit OAuth routes
app.get('/api/auth/reddit', (req, res) => {
  const state = Math.random().toString(36).substring(7);
  const scopes = 'identity';
  const redditAuthUrl = `https://www.reddit.com/api/v1/authorize?` +
    `client_id=${process.env.REDDIT_CLIENT_ID}&` +
    `response_type=code&` +
    `state=${state}&` +
    `redirect_uri=${encodeURIComponent(process.env.REDDIT_REDIRECT_URI)}&` +
    `duration=permanent&` +
    `scope=${scopes}`;
  
  res.redirect(redditAuthUrl);
});

app.get('/api/auth/reddit/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL}?error=access_denied`);
    }

    // Exchange code for access token
    const tokenResponse = await axios.post('https://www.reddit.com/api/v1/access_token', 
      `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(process.env.REDDIT_REDIRECT_URI)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': process.env.REDDIT_USER_AGENT,
          'Authorization': `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')}`
        }
      }
    );

    const { access_token } = tokenResponse.data;

    // Get user profile
    const profileResponse = await axios.get('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'User-Agent': process.env.REDDIT_USER_AGENT
      }
    });

    const profile = profileResponse.data;

    // Check if user exists
    let result = await db.query(
      'SELECT * FROM users WHERE reddit_id = $1',
      [profile.id]
    );

    let user = result.rows[0];

    if (!user) {
      // Create new user
      result = await db.query(
        'INSERT INTO users (reddit_id, username, avatar_url) VALUES ($1, $2, $3) RETURNING *',
        [profile.id, profile.name, profile.icon_img]
      );
      user = result.rows[0];
    } else {
      // Update user info
      result = await db.query(
        'UPDATE users SET username = $1, avatar_url = $2, updated_at = CURRENT_TIMESTAMP WHERE reddit_id = $3 RETURNING *',
        [profile.name, profile.icon_img, profile.id]
      );
      user = result.rows[0];
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, redditId: user.reddit_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  } catch (error) {
    console.error('Reddit OAuth error:', error);
    res.redirect(`${process.env.CLIENT_URL}?error=oauth_failed`);
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, reddit_id, username, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Games routes
app.get('/api/games/week/:week', async (req, res) => {
  try {
    const week = req.params.week;
    
    const result = await db.query(`
      SELECT 
        g.*,
        ht.name as home_team_name,
        ht.abbreviation as home_team_abbr,
        ht.logo_url as home_team_logo,
        ht.primary_color as home_team_color,
        at.name as away_team_name,
        at.abbreviation as away_team_abbr,
        at.logo_url as away_team_logo,
        at.primary_color as away_team_color
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      JOIN seasons s ON g.season_id = s.id
      WHERE s.is_active = TRUE AND g.week = $1
      ORDER BY g.game_time ASC
    `, [week]);

    const games = result.rows.map(game => ({
      id: game.id,
      week: game.week,
      gameTime: game.game_time,
      homeTeam: {
        id: game.home_team_id,
        name: game.home_team_name,
        abbreviation: game.home_team_abbr,
        logo: game.home_team_logo,
        color: game.home_team_color,
        score: game.home_score
      },
      awayTeam: {
        id: game.away_team_id,
        name: game.away_team_name,
        abbreviation: game.away_team_abbr,
        logo: game.away_team_logo,
        color: game.away_team_color,
        score: game.away_score
      },
      spread: game.spread,
      overUnder: game.over_under,
      isFinal: game.is_final,
      picksLocked: game.picks_locked,
      weatherConditions: game.weather_conditions
    }));

    res.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leaderboard routes
app.get('/api/leaderboard/week/:week', async (req, res) => {
  try {
    const week = req.params.week;

    const result = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        COALESCE(SUM(p.points_earned), 0) as total_points,
        COUNT(p.id) as total_picks,
        COALESCE(SUM(CASE WHEN p.is_correct = TRUE THEN 1 ELSE 0 END), 0) as correct_picks,
        CASE 
          WHEN COUNT(p.id) > 0 THEN ROUND((COALESCE(SUM(CASE WHEN p.is_correct = TRUE THEN 1 ELSE 0 END), 0)::DECIMAL / COUNT(p.id)) * 100, 1)
          ELSE 0 
        END as accuracy_percentage
      FROM users u
      LEFT JOIN picks p ON u.id = p.user_id
      LEFT JOIN games g ON p.game_id = g.id AND g.week = $1
      LEFT JOIN seasons s ON g.season_id = s.id AND s.is_active = TRUE
      GROUP BY u.id, u.username, u.avatar_url
      HAVING COUNT(p.id) > 0
      ORDER BY total_points DESC, accuracy_percentage DESC
      LIMIT 50
    `, [week]);

    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      userId: row.id,
      username: row.username,
      avatar: row.avatar_url,
      totalPoints: parseInt(row.total_points),
      totalPicks: parseInt(row.total_picks),
      correctPicks: parseInt(row.correct_picks),
      accuracyPercentage: parseFloat(row.accuracy_percentage) || 0
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching weekly leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test database connection
app.get('/api/test/db', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) FROM teams');
    res.json({ 
      status: 'Connected',
      teams_count: parseInt(result.rows[0].count),
      message: '✅ Database connection successful'
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      status: 'Error',
      error: error.message,
      message: '❌ Database connection failed'
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🏈 Broncos Pickems Server running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔐 Reddit OAuth: ${process.env.REDDIT_CLIENT_ID ? 'Configured' : 'Not configured'}`);
  console.log(`🌐 Frontend URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
});