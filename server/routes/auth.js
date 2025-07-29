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
  
  // Detect mobile devices from User-Agent - improved detection for mobile browsers
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS/i.test(userAgent);
  
  let redditAuthUrl;
  
  if (isMobile) {
    // Use www.reddit.com for mobile which should open the app if installed
    // or fall back to mobile web version if app not available
    redditAuthUrl = `https://www.reddit.com/api/v1/authorize?` +
      `client_id=${process.env.REDDIT_CLIENT_ID}&` +
      `response_type=code&` +
      `state=${state}&` +
      `redirect_uri=${encodeURIComponent(process.env.REDDIT_REDIRECT_URI)}&` +
      `duration=permanent&` +
      `scope=${scopes}`;
  } else {
    // Use old.reddit.com for desktop (stays in browser)
    redditAuthUrl = `https://old.reddit.com/api/v1/authorize?` +
      `client_id=${process.env.REDDIT_CLIENT_ID}&` +
      `response_type=code&` +
      `state=${state}&` +
      `redirect_uri=${encodeURIComponent(process.env.REDDIT_REDIRECT_URI)}&` +
      `duration=permanent&` +
      `scope=${scopes}`;
  }
  
  console.log(`Mobile OAuth: isMobile=${isMobile}, userAgent=${userAgent}`);
  console.log(`Reddit OAuth URL: ${redditAuthUrl}`);
  
  res.redirect(redditAuthUrl);
});

router.get('/reddit/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    console.log('OAuth callback received:', { code: !!code, state, query: req.query });
    
    if (!code) {
      console.log('No code received, redirecting with access_denied error');
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
    console.log('OAuth: Access token received from Reddit');

    // Get user profile
    const profileResponse = await axios.get('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'User-Agent': process.env.REDDIT_USER_AGENT
      }
    });

    const profile = profileResponse.data;
    console.log('OAuth: Reddit profile received:', profile.name);

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

    console.log('OAuth successful, redirecting with token for user:', user.username);
    console.log('Redirect URL:', `${process.env.CLIENT_URL}/auth/success?token=${token.substring(0, 20)}...`);

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  } catch (error) {
    console.error('Reddit OAuth error:', error);
    console.error('Error details:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error || error.message || 'oauth_failed';
    res.redirect(`${process.env.CLIENT_URL}?error=oauth_failed&details=${encodeURIComponent(errorMessage)}`);
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