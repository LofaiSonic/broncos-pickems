// Additional Admin Endpoints

// Reset game status (mark games as incomplete)
app.post('/api/admin/reset-game-status', async (req, res) => {
  try {
    const { week } = req.body;
    let query = 'UPDATE games SET is_final = FALSE, home_score = NULL, away_score = NULL';
    let params = [];
    
    if (week) {
      query += ' WHERE week = $1';
      params = [week];
    }
    
    const result = await db.query(query, params);
    res.json({ 
      success: true, 
      message: `Reset ${result.rowCount} games${week ? ` for week ${week}` : ` across all weeks`}`,
      gamesReset: result.rowCount
    });
  } catch (error) {
    console.error('Error resetting game status:', error);
    res.status(500).json({ error: 'Failed to reset game status', details: error.message });
  }
});

// Clear all picks
app.post('/api/admin/clear-all-picks', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM picks');
    res.json({ 
      success: true, 
      message: `Cleared ${result.rowCount} picks`,
      picksCleared: result.rowCount
    });
  } catch (error) {
    console.error('Error clearing picks:', error);
    res.status(500).json({ error: 'Failed to clear picks', details: error.message });
  }
});

// Reset leaderboard points
app.post('/api/admin/reset-leaderboard', async (req, res) => {
  try {
    const result = await db.query('UPDATE picks SET is_correct = NULL, points_earned = 0');
    res.json({ 
      success: true, 
      message: `Reset leaderboard for ${result.rowCount} picks`,
      picksReset: result.rowCount
    });
  } catch (error) {
    console.error('Error resetting leaderboard:', error);
    res.status(500).json({ error: 'Failed to reset leaderboard', details: error.message });
  }
});