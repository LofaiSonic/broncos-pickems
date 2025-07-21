const express = require('express');
const db = require('../models/database');

const router = express.Router();

// Get weekly leaderboard
router.get('/week/:week?', async (req, res) => {
  try {
    const week = req.params.week || await getCurrentWeek();

    const result = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        SUM(p.points_earned) as total_points,
        COUNT(p.id) as total_picks,
        SUM(CASE WHEN p.is_correct = TRUE THEN 1 ELSE 0 END) as correct_picks,
        ROUND(
          (SUM(CASE WHEN p.is_correct = TRUE THEN 1 ELSE 0 END)::DECIMAL / COUNT(p.id)) * 100, 1
        ) as accuracy_percentage
      FROM users u
      JOIN picks p ON u.id = p.user_id
      JOIN games g ON p.game_id = g.id
      JOIN seasons s ON g.season_id = s.id
      WHERE s.is_active = TRUE AND g.week = $1
      GROUP BY u.id, u.username, u.avatar_url
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

// Get season leaderboard
router.get('/season', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        SUM(p.points_earned) as total_points,
        COUNT(p.id) as total_picks,
        SUM(CASE WHEN p.is_correct = TRUE THEN 1 ELSE 0 END) as correct_picks,
        ROUND(
          (SUM(CASE WHEN p.is_correct = TRUE THEN 1 ELSE 0 END)::DECIMAL / COUNT(p.id)) * 100, 1
        ) as accuracy_percentage,
        COUNT(DISTINCT g.week) as weeks_participated
      FROM users u
      JOIN picks p ON u.id = p.user_id
      JOIN games g ON p.game_id = g.id
      JOIN seasons s ON g.season_id = s.id
      WHERE s.is_active = TRUE
      GROUP BY u.id, u.username, u.avatar_url
      HAVING COUNT(p.id) >= 5  -- Minimum 5 picks to appear on leaderboard
      ORDER BY total_points DESC, accuracy_percentage DESC
      LIMIT 100
    `);

    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      userId: row.id,
      username: row.username,
      avatar: row.avatar_url,
      totalPoints: parseInt(row.total_points),
      totalPicks: parseInt(row.total_picks),
      correctPicks: parseInt(row.correct_picks),
      accuracyPercentage: parseFloat(row.accuracy_percentage) || 0,
      weeksParticipated: parseInt(row.weeks_participated)
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching season leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user stats
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Overall stats
    const overallResult = await db.query(`
      SELECT 
        SUM(p.points_earned) as total_points,
        COUNT(p.id) as total_picks,
        SUM(CASE WHEN p.is_correct = TRUE THEN 1 ELSE 0 END) as correct_picks,
        COUNT(DISTINCT g.week) as weeks_participated
      FROM picks p
      JOIN games g ON p.game_id = g.id
      JOIN seasons s ON g.season_id = s.id
      WHERE p.user_id = $1 AND s.is_active = TRUE
    `, [userId]);

    // Weekly breakdown
    const weeklyResult = await db.query(`
      SELECT 
        g.week,
        SUM(p.points_earned) as week_points,
        COUNT(p.id) as week_picks,
        SUM(CASE WHEN p.is_correct = TRUE THEN 1 ELSE 0 END) as week_correct
      FROM picks p
      JOIN games g ON p.game_id = g.id
      JOIN seasons s ON g.season_id = s.id
      WHERE p.user_id = $1 AND s.is_active = TRUE
      GROUP BY g.week
      ORDER BY g.week ASC
    `, [userId]);

    // Favorite teams (most picked)
    const favoriteTeamsResult = await db.query(`
      SELECT 
        t.name,
        t.abbreviation,
        COUNT(*) as pick_count,
        SUM(CASE WHEN p.is_correct = TRUE THEN 1 ELSE 0 END) as correct_count
      FROM picks p
      JOIN teams t ON p.picked_team_id = t.id
      JOIN games g ON p.game_id = g.id
      JOIN seasons s ON g.season_id = s.id
      WHERE p.user_id = $1 AND s.is_active = TRUE
      GROUP BY t.id, t.name, t.abbreviation
      ORDER BY pick_count DESC
      LIMIT 5
    `, [userId]);

    const overall = overallResult.rows[0];
    const stats = {
      totalPoints: parseInt(overall.total_points) || 0,
      totalPicks: parseInt(overall.total_picks) || 0,
      correctPicks: parseInt(overall.correct_picks) || 0,
      accuracyPercentage: overall.total_picks > 0 
        ? Math.round((overall.correct_picks / overall.total_picks) * 100 * 10) / 10
        : 0,
      weeksParticipated: parseInt(overall.weeks_participated) || 0,
      weeklyBreakdown: weeklyResult.rows.map(week => ({
        week: week.week,
        points: parseInt(week.week_points) || 0,
        picks: parseInt(week.week_picks) || 0,
        correct: parseInt(week.week_correct) || 0,
        accuracy: week.week_picks > 0 
          ? Math.round((week.week_correct / week.week_picks) * 100 * 10) / 10
          : 0
      })),
      favoriteTeams: favoriteTeamsResult.rows.map(team => ({
        name: team.name,
        abbreviation: team.abbreviation,
        pickCount: parseInt(team.pick_count),
        correctCount: parseInt(team.correct_count),
        accuracy: team.pick_count > 0 
          ? Math.round((team.correct_count / team.pick_count) * 100 * 10) / 10
          : 0
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Internal server error' });
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