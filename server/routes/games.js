const express = require('express');
const db = require('../models/database');
const authenticateToken = require('../middleware/auth');
const nflApi = require('../services/nflApi');

const router = express.Router();

// Get games for current week (no week specified)
router.get('/week', async (req, res) => {
  try {
    const currentWeek = await getCurrentWeek();
    return res.redirect(`/api/games/week/${currentWeek}`);
  } catch (error) {
    console.error('Error getting current week:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get games for specific week
router.get('/week/:week', async (req, res) => {
  try {
    const week = req.params.week || await getCurrentWeek();
    
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

// Get user's picks for a specific week
router.get('/week/:week/picks', authenticateToken, async (req, res) => {
  try {
    const week = req.params.week;
    const userId = req.user.userId;

    const result = await db.query(`
      SELECT p.*, g.id as game_id
      FROM picks p
      JOIN games g ON p.game_id = g.id
      JOIN seasons s ON g.season_id = s.id
      WHERE s.is_active = TRUE AND g.week = $1 AND p.user_id = $2
    `, [week, userId]);

    const picks = result.rows.reduce((acc, pick) => {
      acc[pick.game_id] = {
        pickedTeamId: pick.picked_team_id,
        confidencePoints: pick.confidence_points,
        pointsEarned: pick.points_earned,
        isCorrect: pick.is_correct
      };
      return acc;
    }, {});

    res.json(picks);
  } catch (error) {
    console.error('Error fetching user picks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update games from NFL API
router.post('/sync', async (req, res) => {
  try {
    const currentWeek = await getCurrentWeek();
    const games = await nflApi.fetchWeeklyGames(currentWeek);
    await nflApi.updateGamesInDatabase(games);
    
    res.json({ 
      message: `Successfully synced ${games.length} games for week ${currentWeek}` 
    });
  } catch (error) {
    console.error('Error syncing games:', error);
    res.status(500).json({ error: 'Failed to sync games' });
  }
});

async function getCurrentWeek() {
  try {
    const result = await db.query(
      'SELECT current_week FROM seasons WHERE is_active = TRUE LIMIT 1'
    );
    return result.rows[0]?.current_week || 1;
  } catch (error) {
    console.error('Error getting current week:', error);
    return 1;
  }
}

module.exports = router;