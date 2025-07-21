const express = require('express');
const db = require('../models/database');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Submit picks for a week
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { picks } = req.body; // Array of { gameId, pickedTeamId, confidencePoints }
    const userId = req.user.userId;

    // Validate picks format
    if (!Array.isArray(picks)) {
      return res.status(400).json({ error: 'Picks must be an array' });
    }

    // Check if any games are locked
    const gameIds = picks.map(pick => pick.gameId);
    const lockedGamesResult = await db.query(`
      SELECT id, picks_locked, game_time 
      FROM games 
      WHERE id = ANY($1) AND (picks_locked = TRUE OR game_time <= NOW())
    `, [gameIds]);

    if (lockedGamesResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Some games are already locked for picks',
        lockedGames: lockedGamesResult.rows.map(g => g.id)
      });
    }

    // Start transaction
    await db.query('BEGIN');

    try {
      // Delete existing picks for these games
      await db.query(`
        DELETE FROM picks 
        WHERE user_id = $1 AND game_id = ANY($2)
      `, [userId, gameIds]);

      // Insert new picks
      for (const pick of picks) {
        await db.query(`
          INSERT INTO picks (user_id, game_id, picked_team_id, confidence_points)
          VALUES ($1, $2, $3, $4)
        `, [
          userId,
          pick.gameId,
          pick.pickedTeamId,
          pick.confidencePoints || 1
        ]);
      }

      await db.query('COMMIT');
      res.json({ message: 'Picks submitted successfully' });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error submitting picks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get picks for a specific game
router.get('/game/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;

    const result = await db.query(`
      SELECT 
        p.*,
        u.username,
        u.avatar_url,
        t.name as picked_team_name,
        t.abbreviation as picked_team_abbr
      FROM picks p
      JOIN users u ON p.user_id = u.id
      JOIN teams t ON p.picked_team_id = t.id
      WHERE p.game_id = $1
      ORDER BY p.confidence_points DESC, u.username ASC
    `, [gameId]);

    const picks = result.rows.map(pick => ({
      userId: pick.user_id,
      username: pick.username,
      avatar: pick.avatar_url,
      pickedTeam: {
        id: pick.picked_team_id,
        name: pick.picked_team_name,
        abbreviation: pick.picked_team_abbr
      },
      confidencePoints: pick.confidence_points,
      pointsEarned: pick.points_earned,
      isCorrect: pick.is_correct
    }));

    res.json(picks);
  } catch (error) {
    console.error('Error fetching game picks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate and update scores for completed games
router.post('/calculate-scores', async (req, res) => {
  try {
    // Get completed games without calculated picks
    const completedGames = await db.query(`
      SELECT DISTINCT g.id, g.home_team_id, g.away_team_id, g.home_score, g.away_score, g.spread
      FROM games g
      JOIN picks p ON g.id = p.game_id
      WHERE g.is_final = TRUE AND p.points_earned = 0 AND p.is_correct IS NULL
    `);

    for (const game of completedGames.rows) {
      const winningTeamId = game.home_score > game.away_score 
        ? game.home_team_id 
        : game.away_team_id;

      // Check for upset (underdog wins)
      const isUpset = checkIfUpset(game);

      // Update picks for this game
      await db.query(`
        UPDATE picks 
        SET 
          is_correct = (picked_team_id = $1),
          points_earned = CASE 
            WHEN picked_team_id = $1 THEN 
              CASE WHEN $2 THEN confidence_points + 1 ELSE confidence_points END
            ELSE 0 
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE game_id = $3
      `, [winningTeamId, isUpset, game.id]);
    }

    res.json({ 
      message: `Calculated scores for ${completedGames.rows.length} games` 
    });
  } catch (error) {
    console.error('Error calculating scores:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function checkIfUpset(game) {
  // Simple upset detection: if spread exists and underdog wins
  if (!game.spread) return false;
  
  const homeIsUnderdog = game.spread > 0;
  const homeWins = game.home_score > game.away_score;
  
  return (homeIsUnderdog && homeWins) || (!homeIsUnderdog && !homeWins);
}

module.exports = router;