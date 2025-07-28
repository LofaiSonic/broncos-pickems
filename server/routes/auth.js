const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const db = require('../models/database');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Reddit OAuth without passport - simpler approach
router.get('/reddit', (req, res) => {
  const state = Math.random().toString(36).substring(7);
  const scopes = 'identity';
  
  // Detect mobile devices from User-Agent
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Use www.reddit.com for mobile (opens app), old.reddit.com for desktop (stays in browser)
  const redditDomain = isMobile ? 'www.reddit.com' : 'old.reddit.com';
  
  const redditAuthUrl = `https://${redditDomain}/api/v1/authorize?` +
    `client_id=${process.env.REDDIT_CLIENT_ID}&` +
    `response_type=code&` +
    `state=${state}&` +
    `redirect_uri=${encodeURIComponent(process.env.REDDIT_REDIRECT_URI)}&` +
    `duration=permanent&` +
    `scope=${scopes}`;
  
  console.log(`Mobile OAuth: isMobile=${isMobile}, domain=${redditDomain}, userAgent=${userAgent}`);
  console.log(`Reddit OAuth URL: ${redditAuthUrl}`);
  
  res.redirect(redditAuthUrl);
});

router.get('/reddit/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
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

router.get('/me', authenticateToken, async (req, res) => {
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

router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});


module.exports = router;