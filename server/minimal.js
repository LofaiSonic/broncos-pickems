const express = require('express');
const cors = require('cors');
const db = require('./models/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    message: '🏈 Broncos Pickems API - Minimal Server',
    status: 'Running',
    database: process.env.DATABASE_URL ? 'Connected' : 'Not configured'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test database connection
app.get('/test/db', async (req, res) => {
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

// Add sample games for testing
app.post('/test/add-games', async (req, res) => {
  try {
    // Get the current season
    const seasonResult = await db.query('SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1');
    if (!seasonResult.rows[0]) {
      return res.status(400).json({ error: 'No active season found' });
    }
    const seasonId = seasonResult.rows[0].id;

    // Get some teams for sample games
    const teamsResult = await db.query('SELECT id, name, abbreviation FROM teams LIMIT 8');
    const teams = teamsResult.rows;

    if (teams.length < 4) {
      return res.status(400).json({ error: 'Not enough teams in database' });
    }

    // Create sample games for Week 1
    const sampleGames = [
      {
        homeTeam: teams.find(t => t.abbreviation === 'DEN') || teams[0],
        awayTeam: teams.find(t => t.abbreviation === 'LV') || teams[1],
        gameTime: new Date('2024-09-08T20:20:00Z'), // Sunday Night Football
        week: 1
      },
      {
        homeTeam: teams.find(t => t.abbreviation === 'KC') || teams[2],
        awayTeam: teams.find(t => t.abbreviation === 'LAC') || teams[3],
        gameTime: new Date('2024-09-08T17:00:00Z'), // Sunday afternoon
        week: 1
      },
      {
        homeTeam: teams.find(t => t.abbreviation === 'BUF') || teams[4],
        awayTeam: teams.find(t => t.abbreviation === 'MIA') || teams[5],
        gameTime: new Date('2024-09-08T13:00:00Z'), // Sunday early
        week: 1
      },
      {
        homeTeam: teams.find(t => t.abbreviation === 'SF') || teams[6],
        awayTeam: teams.find(t => t.abbreviation === 'SEA') || teams[7],
        gameTime: new Date('2024-09-09T20:15:00Z'), // Monday Night Football
        week: 1
      }
    ];

    let insertedCount = 0;
    for (const game of sampleGames) {
      // Check if game already exists
      const existingGame = await db.query(
        'SELECT id FROM games WHERE season_id = $1 AND week = $2 AND home_team_id = $3 AND away_team_id = $4',
        [seasonId, game.week, game.homeTeam.id, game.awayTeam.id]
      );

      if (!existingGame.rows[0]) {
        await db.query(`
          INSERT INTO games (season_id, week, home_team_id, away_team_id, game_time, spread, over_under, picks_locked)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          seasonId,
          game.week,
          game.homeTeam.id,
          game.awayTeam.id,
          game.gameTime,
          -3.5, // Sample spread
          47.5,  // Sample over/under
          false  // Not locked yet
        ]);
        insertedCount++;
      }
    }

    res.json({
      message: `✅ Added ${insertedCount} sample games for Week 1`,
      games_added: insertedCount,
      total_teams: teams.length
    });

  } catch (error) {
    console.error('Error adding sample games:', error);
    res.status(500).json({
      error: error.message,
      message: '❌ Failed to add sample games'
    });
  }
});

// Get games for a specific week
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

app.listen(PORT, () => {
  console.log(`🏈 Minimal Broncos Server running on port ${PORT}`);
  console.log('✅ Server started successfully!');
});