const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const db = require('./models/database');
require('dotenv').config();

// Function to fetch injury data from ESPN API for a team
async function fetchTeamInjuries(teamId) {
  try {
    const url = `http://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`;
    console.log(`Fetching roster data for team ${teamId}...`);
    
    const response = await axios.get(url);
    const athletes = response.data?.athletes || [];
    
    const injuries = [];
    
    // Process each position group
    for (const positionGroup of athletes) {
      for (const player of positionGroup.items || []) {
        if (player.injuries && player.injuries.length > 0) {
          for (const injury of player.injuries) {
            injuries.push({
              playerId: player.id,
              playerName: player.displayName,
              position: player.position?.abbreviation || 'N/A',
              status: injury.status,
              injuryDate: injury.date
            });
          }
        }
      }
    }
    
    console.log(`Found ${injuries.length} injuries for team ${teamId}`);
    return injuries;
  } catch (error) {
    console.error(`Error fetching injuries for team ${teamId}:`, error.message);
    return [];
  }
}

// Function to get cached or fetch fresh injury data
const injuryCache = new Map();
const INJURY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function getTeamInjuries(teamId) {
  const cacheKey = `team_${teamId}`;
  const cached = injuryCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < INJURY_CACHE_TTL) {
    return cached.data;
  }
  
  const injuries = await fetchTeamInjuries(teamId);
  injuryCache.set(cacheKey, {
    data: injuries,
    timestamp: Date.now()
  });
  
  return injuries;
}

// Mapping from our database team IDs to ESPN team IDs
const teamIdMapping = {
  1: 22,   // Arizona Cardinals
  2: 1,    // Atlanta Falcons
  3: 33,   // Baltimore Ravens
  4: 2,    // Buffalo Bills
  5: 29,   // Carolina Panthers
  6: 3,    // Chicago Bears
  7: 4,    // Cincinnati Bengals
  8: 5,    // Cleveland Browns
  9: 6,    // Dallas Cowboys
  10: 7,   // Denver Broncos
  11: 8,   // Detroit Lions
  12: 9,   // Green Bay Packers
  13: 34,  // Houston Texans
  14: 11,  // Indianapolis Colts
  15: 30,  // Jacksonville Jaguars
  16: 12,  // Kansas City Chiefs
  17: 13,  // Las Vegas Raiders
  18: 24,  // Los Angeles Chargers
  19: 14,  // Los Angeles Rams
  20: 15,  // Miami Dolphins
  21: 16,  // Minnesota Vikings
  22: 17,  // New England Patriots
  23: 18,  // New Orleans Saints
  24: 19,  // New York Giants
  25: 20,  // New York Jets
  26: 21,  // Philadelphia Eagles
  27: 23,  // Pittsburgh Steelers
  28: 25,  // San Francisco 49ers
  29: 26,  // Seattle Seahawks
  30: 27,  // Tampa Bay Buccaneers
  31: 10,  // Tennessee Titans
  32: 28   // Washington Commanders
};

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

// Get games for current week
app.get('/api/games', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        g.id,
        g.week,
        g.game_time,
        g.home_score,
        g.away_score,
        g.is_final,
        ht.name as home_team_name,
        ht.abbreviation as home_team_abbr,
        ht.primary_color as home_team_color,
        at.name as away_team_name,
        at.abbreviation as away_team_abbr,
        at.primary_color as away_team_color
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1)
      ORDER BY g.game_time ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Get games and user picks for a specific week
app.get('/api/games/week/:week/picks', async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    const result = await db.query(`
      SELECT 
        g.id,
        g.week,
        g.game_time,
        g.home_score,
        g.away_score,
        g.is_final,
        g.picks_locked,
        g.spread,
        g.over_under,
        g.home_team_id,
        g.away_team_id,
        ht.name as home_team_name,
        ht.abbreviation as home_team_abbr,
        ht.primary_color as home_team_color,
        at.name as away_team_name,
        at.abbreviation as away_team_abbr,
        at.primary_color as away_team_color,
        p.picked_team_id,
        p.confidence_points
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      LEFT JOIN picks p ON g.id = p.game_id AND p.user_id = $1
      WHERE g.season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1)
        AND g.week = $2
      ORDER BY g.game_time ASC
    `, [userId, week]);
    
    // Enhance games with real injury data from ESPN API
    const enhancedGames = await Promise.all(result.rows.map(async (game) => {
      try {
        // Get ESPN team IDs for both teams
        const homeTeamEspnId = teamIdMapping[game.home_team_id];
        const awayTeamEspnId = teamIdMapping[game.away_team_id];
        
        // Fetch injury data for both teams
        const [homeInjuries, awayInjuries] = await Promise.all([
          homeTeamEspnId ? getTeamInjuries(homeTeamEspnId) : Promise.resolve([]),
          awayTeamEspnId ? getTeamInjuries(awayTeamEspnId) : Promise.resolve([])
        ]);
        
        return {
          ...game,
          home_team_injuries: homeInjuries,
          away_team_injuries: awayInjuries
        };
      } catch (error) {
        console.error(`Error fetching injuries for game ${game.id}:`, error);
        // Return game without injury data if fetch fails
        return {
          ...game,
          home_team_injuries: [],
          away_team_injuries: []
        };
      }
    }));
    
    res.json(enhancedGames);
  } catch (error) {
    console.error('Error fetching games and picks:', error);
    res.status(500).json({ error: 'Failed to fetch games and picks' });
  }
});

// Submit a pick for a game
app.post('/api/picks', async (req, res) => {
  try {
    const { gameId, pickedTeamId, confidencePoints } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    await db.query(`
      INSERT INTO picks (user_id, game_id, picked_team_id, confidence_points)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, game_id) 
      DO UPDATE SET 
        picked_team_id = EXCLUDED.picked_team_id,
        confidence_points = EXCLUDED.confidence_points,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, gameId, pickedTeamId, confidencePoints || 1]);
    
    res.json({ message: 'Pick submitted successfully' });
  } catch (error) {
    console.error('Error submitting pick:', error);
    res.status(500).json({ error: 'Failed to submit pick' });
  }
});

// Get user profile with pick stats
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(userResult.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Simulate game completion with scores (for testing picks)
app.post('/test/complete-games', async (req, res) => {
  try {
    console.log('🎯 Simulating game completions for testing...');
    
    // Get all incomplete games
    const gamesResult = await db.query(`
      SELECT id, home_team_id, away_team_id 
      FROM games 
      WHERE is_final = FALSE
      ORDER BY id
    `);
    
    let gamesCompleted = 0;
    
    for (const game of gamesResult.rows) {
      // Generate random scores (14-35 points each team)
      const homeScore = Math.floor(Math.random() * 22) + 14; // 14-35
      const awayScore = Math.floor(Math.random() * 22) + 14; // 14-35
      
      // Update game with scores and mark as final
      await db.query(`
        UPDATE games 
        SET home_score = $1, away_score = $2, is_final = TRUE
        WHERE id = $3
      `, [homeScore, awayScore, game.id]);
      
      gamesCompleted++;
    }
    
    // Now calculate pick results
    await db.query(`
      UPDATE picks 
      SET 
        is_correct = CASE 
          WHEN picked_team_id = g.home_team_id AND g.home_score > g.away_score THEN TRUE
          WHEN picked_team_id = g.away_team_id AND g.away_score > g.home_score THEN TRUE
          ELSE FALSE
        END,
        points_earned = CASE 
          WHEN picked_team_id = g.home_team_id AND g.home_score > g.away_score THEN confidence_points
          WHEN picked_team_id = g.away_team_id AND g.away_score > g.home_score THEN confidence_points
          ELSE 0
        END
      FROM games g
      WHERE picks.game_id = g.id AND g.is_final = TRUE
    `);
    
    console.log(`✅ Completed ${gamesCompleted} games and calculated pick results`);
    res.json({ 
      message: `Successfully completed ${gamesCompleted} games and calculated picks`,
      gamesCompleted 
    });
    
  } catch (error) {
    console.error('❌ Error completing games:', error.message);
    res.status(500).json({ error: 'Failed to complete games', details: error.message });
  }
});

// Get user's pick results and stats
app.get('/api/picks/results', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    // Get pick results with game details
    const result = await db.query(`
      SELECT 
        g.id,
        g.week,
        g.home_score,
        g.away_score,
        g.is_final,
        ht.name as home_team_name,
        ht.abbreviation as home_team_abbr,
        at.name as away_team_name,
        at.abbreviation as away_team_abbr,
        p.picked_team_id,
        p.confidence_points,
        p.is_correct,
        p.points_earned,
        pt.name as picked_team_name,
        pt.abbreviation as picked_team_abbr
      FROM picks p
      JOIN games g ON p.game_id = g.id
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      JOIN teams pt ON p.picked_team_id = pt.id
      WHERE p.user_id = $1
      ORDER BY g.game_time ASC
    `, [userId]);
    
    // Calculate stats
    const totalPicks = result.rows.length;
    const correctPicks = result.rows.filter(row => row.is_correct === true).length;
    const totalPoints = result.rows.reduce((sum, row) => sum + (row.points_earned || 0), 0);
    const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100) : 0;
    
    res.json({
      picks: result.rows,
      stats: {
        totalPicks,
        correctPicks,
        totalPoints,
        accuracy
      }
    });
    
  } catch (error) {
    console.error('Error fetching pick results:', error);
    res.status(500).json({ error: 'Failed to fetch pick results' });
  }
});

// Update game times to be in the future (for testing picks)
app.post('/test/update-game-times', async (req, res) => {
  try {
    console.log('📅 Updating game times to be in the future for testing...');
    
    // Get all games
    const gamesResult = await db.query('SELECT id FROM games ORDER BY id');
    
    let gamesUpdated = 0;
    const now = new Date();
    
    for (let i = 0; i < gamesResult.rows.length; i++) {
      const game = gamesResult.rows[i];
      // Set games to be in the next few hours
      const futureTime = new Date(now.getTime() + (i + 1) * 2 * 60 * 60 * 1000); // 2 hours apart
      
      await db.query(`
        UPDATE games 
        SET game_time = $1, picks_locked = FALSE, is_final = FALSE
        WHERE id = $2
      `, [futureTime, game.id]);
      
      gamesUpdated++;
    }
    
    console.log(`✅ Updated ${gamesUpdated} game times to be in the future`);
    res.json({ 
      message: `Successfully updated ${gamesUpdated} games to be in the future`,
      gamesUpdated 
    });
    
  } catch (error) {
    console.error('❌ Error updating game times:', error.message);
    res.status(500).json({ error: 'Failed to update game times', details: error.message });
  }
});

// Fetch real historical games from ESPN API
app.post('/api/fetch-historical/:year/:week', async (req, res) => {
  try {
    const { year, week } = req.params;
    console.log(`🏈 Fetching historical NFL games for ${year} Week ${week} from ESPN API...`);
    
    // ESPN API endpoint for historical data
    const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${year}&week=${week}&seasontype=2`;
    console.log('ESPN URL:', espnUrl);
    
    const response = await axios.get(espnUrl);
    
    if (!response.data.events || response.data.events.length === 0) {
      return res.status(400).json({ error: `No games found for ${year} Week ${week}` });
    }
    
    // Get current season
    const seasonResult = await db.query('SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1');
    if (!seasonResult.rows[0]) {
      return res.status(400).json({ error: 'No active season found' });
    }
    
    const seasonId = seasonResult.rows[0].id;
    
    // Clear existing games for this week to avoid duplicates
    await db.query('DELETE FROM games WHERE season_id = $1 AND week = $2', [seasonId, parseInt(week)]);
    console.log(`Cleared existing games for Week ${week}`);
    
    let gamesAdded = 0;
    
    for (const event of response.data.events) {
      const game = event.competitions[0];
      const homeTeam = game.competitors.find(c => c.homeAway === 'home');
      const awayTeam = game.competitors.find(c => c.homeAway === 'away');
      
      // Map ESPN team abbreviations to our database
      const homeAbbr = homeTeam.team.abbreviation;
      const awayAbbr = awayTeam.team.abbreviation;
      
      // Get team IDs from our database
      const homeTeamResult = await db.query('SELECT id FROM teams WHERE abbreviation = $1', [homeAbbr]);
      const awayTeamResult = await db.query('SELECT id FROM teams WHERE abbreviation = $1', [awayAbbr]);
      
      if (homeTeamResult.rows[0] && awayTeamResult.rows[0]) {
        const gameTime = new Date(event.date);
        const isCompleted = game.status.type.completed;
        const homeScore = isCompleted && homeTeam.score ? parseInt(homeTeam.score) : null;
        const awayScore = isCompleted && awayTeam.score ? parseInt(awayTeam.score) : null;
        
        // Extract betting odds and injury data from ESPN
        let spread = null;
        let overUnder = null;
        let injuries = [];
        
        // Get odds from ESPN data
        if (game.odds && game.odds.length > 0) {
          const odds = game.odds[0];
          spread = odds.details || null;
          overUnder = odds.overUnder || null;
        }
        
        // Get injury data from ESPN
        if (game.situation && game.situation.lastPlay) {
          // ESPN sometimes includes injury info in game situation
        }
        
        // Insert game into database with odds
        await db.query(`
          INSERT INTO games (
            season_id, week, home_team_id, away_team_id, 
            game_time, home_score, away_score, is_final, picks_locked,
            spread, over_under
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          seasonId, parseInt(week), homeTeamResult.rows[0].id, awayTeamResult.rows[0].id,
          gameTime, homeScore, awayScore, isCompleted, isCompleted, spread, overUnder
        ]);
        
        gamesAdded++;
        console.log(`Added: ${awayAbbr} @ ${homeAbbr} - ${awayScore || 'TBD'} - ${homeScore || 'TBD'} ${isCompleted ? '(FINAL)' : ''}`);
      }
    }
    
    console.log(`✅ Added ${gamesAdded} historical games from ${year} Week ${week}`);
    res.json({ 
      message: `Successfully loaded ${gamesAdded} games from ${year} Week ${week}`,
      gamesAdded,
      year: parseInt(year),
      week: parseInt(week)
    });
    
  } catch (error) {
    console.error('❌ Error fetching historical games:', error.message);
    res.status(500).json({ error: 'Failed to fetch historical games', details: error.message });
  }
});

// Fetch current betting odds from The Odds API
app.post('/api/fetch-odds', async (req, res) => {
  try {
    console.log('📊 Fetching current NFL betting odds...');
    
    const oddsApiKey = process.env.ODDS_API_KEY;
    if (!oddsApiKey) {
      return res.status(400).json({ error: 'Odds API key not configured' });
    }
    
    // The Odds API endpoint for NFL
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${oddsApiKey}&regions=us&markets=spreads,totals&oddsFormat=american`;
    
    const response = await axios.get(oddsUrl);
    const oddsData = response.data;
    
    let oddsUpdated = 0;
    
    for (const game of oddsData) {
      // Match games by team names
      const homeTeam = game.home_team;
      const awayTeam = game.away_team;
      
      // Find the game in our database
      const gameResult = await db.query(`
        SELECT g.id FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        WHERE ht.name ILIKE $1 AND at.name ILIKE $2
        AND g.is_final = FALSE
        ORDER BY g.game_time DESC
        LIMIT 1
      `, [`%${homeTeam}%`, `%${awayTeam}%`]);
      
      if (gameResult.rows[0] && game.bookmakers && game.bookmakers.length > 0) {
        const bookmaker = game.bookmakers[0]; // Use first bookmaker
        let spread = null;
        let overUnder = null;
        
        // Extract spread and total
        for (const market of bookmaker.markets) {
          if (market.key === 'spreads' && market.outcomes) {
            const homeOutcome = market.outcomes.find(o => o.name === homeTeam);
            if (homeOutcome) {
              spread = homeOutcome.point;
            }
          }
          if (market.key === 'totals' && market.outcomes) {
            overUnder = market.outcomes[0].point;
          }
        }
        
        // Update game with odds
        await db.query(`
          UPDATE games 
          SET spread = $1, over_under = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [spread, overUnder, gameResult.rows[0].id]);
        
        oddsUpdated++;
        console.log(`Updated odds: ${awayTeam} @ ${homeTeam} - Spread: ${spread}, O/U: ${overUnder}`);
      }
    }
    
    res.json({
      message: `Updated betting odds for ${oddsUpdated} games`,
      oddsUpdated,
      remainingRequests: response.headers['x-requests-remaining'] || 'unknown'
    });
    
  } catch (error) {
    console.error('❌ Error fetching odds:', error.message);
    res.status(500).json({ error: 'Failed to fetch betting odds', details: error.message });
  }
});

// Fetch injury reports from ESPN
app.post('/api/fetch-injuries', async (req, res) => {
  try {
    console.log('🏥 Fetching NFL injury reports...');
    
    // ESPN doesn't have a dedicated injury API, but we can get injury info from team pages
    // For now, let's create a simple injury tracking system
    res.json({
      message: 'Injury data feature coming soon - will integrate with ESPN team injury reports',
      note: 'In production, this would fetch from ESPN team pages or NFL injury reports API'
    });
    
  } catch (error) {
    console.error('❌ Error fetching injuries:', error.message);
    res.status(500).json({ error: 'Failed to fetch injury data', details: error.message });
  }
});

// Add sample betting odds to existing games (for testing)
app.post('/test/add-sample-odds', async (req, res) => {
  try {
    console.log('📊 Adding sample betting odds to existing games...');
    
    const games = await db.query('SELECT id FROM games ORDER BY id');
    let oddsAdded = 0;
    
    for (const game of games.rows) {
      // Generate realistic betting odds
      const spread = (Math.random() * 14 - 7).toFixed(1); // -7.0 to +7.0
      const overUnder = (Math.random() * 10 + 40).toFixed(1); // 40.0 to 50.0
      
      await db.query(`
        UPDATE games 
        SET spread = $1, over_under = $2
        WHERE id = $3
      `, [parseFloat(spread), parseFloat(overUnder), game.id]);
      
      oddsAdded++;
    }
    
    console.log(`✅ Added sample betting odds to ${oddsAdded} games`);
    res.json({ 
      message: `Added sample betting odds to ${oddsAdded} games`,
      oddsAdded 
    });
    
  } catch (error) {
    console.error('❌ Error adding sample odds:', error.message);
    res.status(500).json({ error: 'Failed to add sample odds', details: error.message });
  }
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

// Fetch historical games from ESPN API
app.post('/api/fetch-historical-games', async (req, res) => {
  try {
    console.log('🏈 Fetching historical NFL games from ESPN API...');
    
    // Get current season
    const seasonResult = await db.query('SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1');
    if (!seasonResult.rows[0]) {
      return res.status(400).json({ error: 'No active season found' });
    }
    
    const seasonId = seasonResult.rows[0].id;
    
    // Fetch Week 1 games from ESPN API (2024 season)
    const espnUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=20240908&week=1';
    console.log('🌐 Calling ESPN API:', espnUrl);
    const response = await axios.get(espnUrl);
    console.log('📊 ESPN Response:', response.data.events?.length || 0, 'events found');
    
    if (!response.data.events) {
      return res.status(400).json({ error: 'No games found in ESPN API response' });
    }
    
    let gamesAdded = 0;
    
    for (const event of response.data.events) {
      const game = event.competitions[0];
      const homeTeam = game.competitors.find(c => c.homeAway === 'home');
      const awayTeam = game.competitors.find(c => c.homeAway === 'away');
      
      // Map ESPN team abbreviations to our database
      const homeAbbr = homeTeam.team.abbreviation;
      const awayAbbr = awayTeam.team.abbreviation;
      
      // Get team IDs from our database
      const homeTeamResult = await db.query('SELECT id FROM teams WHERE abbreviation = $1', [homeAbbr]);
      const awayTeamResult = await db.query('SELECT id FROM teams WHERE abbreviation = $1', [awayAbbr]);
      
      if (homeTeamResult.rows[0] && awayTeamResult.rows[0]) {
        const gameTime = new Date(event.date);
        const isCompleted = game.status.type.completed;
        const homeScore = isCompleted ? parseInt(homeTeam.score) : null;
        const awayScore = isCompleted ? parseInt(awayTeam.score) : null;
        
        // Insert game into database
        await db.query(`
          INSERT INTO games (
            season_id, week, home_team_id, away_team_id, 
            game_time, home_score, away_score, is_completed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT DO NOTHING
        `, [
          seasonId, 1, homeTeamResult.rows[0].id, awayTeamResult.rows[0].id,
          gameTime, homeScore, awayScore, isCompleted
        ]);
        
        gamesAdded++;
      }
    }
    
    console.log(`✅ Added ${gamesAdded} games from ESPN API`);
    res.json({ 
      message: `Successfully added ${gamesAdded} historical games`,
      gamesAdded 
    });
    
  } catch (error) {
    console.error('❌ Error fetching historical games:', error.message);
    res.status(500).json({ error: 'Failed to fetch historical games', details: error.message });
  }
});

// Add realistic NFL games for testing picks
app.post('/test/add-realistic-games', async (req, res) => {
  try {
    const seasonResult = await db.query('SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1');
    if (!seasonResult.rows[0]) {
      return res.status(400).json({ error: 'No active season found' });
    }
    
    const seasonId = seasonResult.rows[0].id;
    
    // Realistic Week 18 games with interesting matchups
    const realisticGames = [
      { home: 'DEN', away: 'KC', time: '2025-01-05 13:00:00' },   // Broncos vs Chiefs
      { home: 'BUF', away: 'NE', time: '2025-01-05 13:00:00' },   // Bills vs Patriots  
      { home: 'DAL', away: 'WAS', time: '2025-01-05 16:25:00' },  // Cowboys vs Commanders
      { home: 'PHI', away: 'NYG', time: '2025-01-05 16:25:00' },  // Eagles vs Giants
      { home: 'GB', away: 'CHI', time: '2025-01-05 20:20:00' },   // Packers vs Bears
      { home: 'LAR', away: 'SEA', time: '2025-01-05 20:20:00' },  // Rams vs Seahawks
    ];
    
    let gamesAdded = 0;
    
    for (const gameData of realisticGames) {
      // Get team IDs
      const homeTeam = await db.query('SELECT id FROM teams WHERE abbreviation = $1', [gameData.home]);
      const awayTeam = await db.query('SELECT id FROM teams WHERE abbreviation = $1', [gameData.away]);
      
      if (homeTeam.rows[0] && awayTeam.rows[0]) {
        await db.query(`
          INSERT INTO games (
            season_id, week, home_team_id, away_team_id, 
            game_time, is_final
          ) VALUES ($1, 18, $2, $3, $4, false)
          ON CONFLICT DO NOTHING
        `, [
          seasonId, 
          homeTeam.rows[0].id, 
          awayTeam.rows[0].id,
          new Date(gameData.time)
        ]);
        gamesAdded++;
      }
    }
    
    console.log(`🏈 Added ${gamesAdded} realistic games for testing picks`);
    res.json({ 
      message: `Successfully added ${gamesAdded} realistic games for Week 18`,
      gamesAdded,
      games: realisticGames
    });
    
  } catch (error) {
    console.error('Error adding realistic games:', error);
    res.status(500).json({ error: 'Failed to add realistic games', details: error.message });
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

// Reddit OAuth routes
app.get('/api/auth/reddit', (req, res) => {
  console.log('🔐 Reddit OAuth requested');
  const state = Math.random().toString(36).substring(7);
  const scopes = 'identity';
  const redditAuthUrl = `https://www.reddit.com/api/v1/authorize?` +
    `client_id=${process.env.REDDIT_CLIENT_ID}&` +
    `response_type=code&` +
    `state=${state}&` +
    `redirect_uri=${encodeURIComponent(process.env.REDDIT_REDIRECT_URI)}&` +
    `duration=permanent&` +
    `scope=${scopes}`;
  
  console.log('🔗 Redirecting to:', redditAuthUrl);
  res.redirect(redditAuthUrl);
});

app.get('/api/auth/reddit/callback', async (req, res) => {
  try {
    console.log('📥 Reddit callback received');
    const { code, state, error } = req.query;
    
    if (error) {
      console.error('❌ Reddit OAuth error:', error);
      return res.redirect(`${process.env.CLIENT_URL}?error=${error}`);
    }
    
    if (!code) {
      console.error('❌ No authorization code received');
      return res.redirect(`${process.env.CLIENT_URL}?error=no_code`);
    }

    console.log('✅ Authorization code received, exchanging for token...');

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
    console.log('✅ Access token received');

    // Get user profile
    const profileResponse = await axios.get('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'User-Agent': process.env.REDDIT_USER_AGENT
      }
    });

    const profile = profileResponse.data;
    console.log('✅ User profile received:', profile.name);

    // Check if user exists in database
    let result = await db.query(
      'SELECT * FROM users WHERE reddit_id = $1',
      [profile.id]
    );

    let user = result.rows[0];

    if (!user) {
      // Create new user
      console.log('👤 Creating new user:', profile.name);
      result = await db.query(
        'INSERT INTO users (reddit_id, username, avatar_url) VALUES ($1, $2, $3) RETURNING *',
        [profile.id, profile.name, profile.icon_img]
      );
      user = result.rows[0];
    } else {
      // Update existing user
      console.log('👤 Updating existing user:', profile.name);
      result = await db.query(
        'UPDATE users SET username = $1, avatar_url = $2, updated_at = CURRENT_TIMESTAMP WHERE reddit_id = $3 RETURNING *',
        [profile.name, profile.icon_img, profile.id]
      );
      user = result.rows[0];
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, redditId: user.reddit_id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('🎟️ JWT token generated for user:', user.username);

    // Redirect to frontend with token
    const redirectUrl = `${process.env.CLIENT_URL}/auth/success?token=${token}`;
    console.log('🔄 Redirecting to frontend:', redirectUrl);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Reddit OAuth callback error:', error.response?.data || error.message);
    res.redirect(`${process.env.CLIENT_URL}?error=oauth_failed&details=${encodeURIComponent(error.message)}`);
  }
});

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

// Get current user info
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

// ========================================
// LEADERBOARD ENDPOINTS
// ========================================

// Get season leaderboard
app.get('/api/leaderboard/season', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const result = await db.query(`
      SELECT 
        u.id as user_id,
        u.username,
        u.avatar_url,
        COALESCE(SUM(p.points_earned), 0) as total_points,
        COUNT(p.id) as total_picks,
        COUNT(CASE WHEN p.is_correct = true THEN 1 END) as correct_picks,
        ROUND(
          CASE 
            WHEN COUNT(p.id) > 0 
            THEN (COUNT(CASE WHEN p.is_correct = true THEN 1 END)::DECIMAL / COUNT(p.id)) * 100 
            ELSE 0 
          END, 1
        ) as accuracy_percentage,
        COUNT(DISTINCT g.week) as weeks_participated
      FROM users u
      LEFT JOIN picks p ON u.id = p.user_id
      LEFT JOIN games g ON p.game_id = g.id AND g.is_final = true
      WHERE g.season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1) OR g.id IS NULL
      GROUP BY u.id, u.username, u.avatar_url
      HAVING COUNT(p.id) > 0
      ORDER BY total_points DESC, accuracy_percentage DESC
    `);

    const leaderboard = result.rows.map((player, index) => ({
      rank: index + 1,
      userId: player.user_id,
      username: player.username,
      avatar: player.avatar_url,
      totalPoints: parseInt(player.total_points),
      totalPicks: parseInt(player.total_picks),
      correctPicks: parseInt(player.correct_picks),
      accuracyPercentage: parseFloat(player.accuracy_percentage),
      weeksParticipated: parseInt(player.weeks_participated)
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching season leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch season leaderboard' });
  }
});

// Get weekly leaderboard
app.get('/api/leaderboard/week/:week', async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const result = await db.query(`
      SELECT 
        u.id as user_id,
        u.username,
        u.avatar_url,
        COALESCE(SUM(p.points_earned), 0) as total_points,
        COUNT(p.id) as total_picks,
        COUNT(CASE WHEN p.is_correct = true THEN 1 END) as correct_picks,
        ROUND(
          CASE 
            WHEN COUNT(p.id) > 0 
            THEN (COUNT(CASE WHEN p.is_correct = true THEN 1 END)::DECIMAL / COUNT(p.id)) * 100 
            ELSE 0 
          END, 1
        ) as accuracy_percentage
      FROM users u
      LEFT JOIN picks p ON u.id = p.user_id
      LEFT JOIN games g ON p.game_id = g.id AND g.week = $1 AND g.is_final = true
      WHERE g.season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1) OR g.id IS NULL
      GROUP BY u.id, u.username, u.avatar_url
      HAVING COUNT(p.id) > 0
      ORDER BY total_points DESC, accuracy_percentage DESC
    `, [week]);

    const leaderboard = result.rows.map((player, index) => ({
      rank: index + 1,
      userId: player.user_id,
      username: player.username,
      avatar: player.avatar_url,
      totalPoints: parseInt(player.total_points),
      totalPicks: parseInt(player.total_picks),
      correctPicks: parseInt(player.correct_picks),
      accuracyPercentage: parseFloat(player.accuracy_percentage)
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching weekly leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch weekly leaderboard' });
  }
});

// Get individual user stats for profile page
app.get('/api/leaderboard/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    // Get user's overall stats
    const userStatsResult = await db.query(`
      SELECT 
        u.id as user_id,
        u.username,
        u.avatar_url,
        COALESCE(SUM(p.points_earned), 0) as total_points,
        COUNT(p.id) as total_picks,
        COUNT(CASE WHEN p.is_correct = true THEN 1 END) as correct_picks,
        ROUND(
          CASE 
            WHEN COUNT(p.id) > 0 
            THEN (COUNT(CASE WHEN p.is_correct = true THEN 1 END)::DECIMAL / COUNT(p.id)) * 100 
            ELSE 0 
          END, 1
        ) as accuracy_percentage,
        COUNT(DISTINCT g.week) as weeks_participated
      FROM users u
      LEFT JOIN picks p ON u.id = p.user_id
      LEFT JOIN games g ON p.game_id = g.id AND g.is_final = true
      WHERE u.id = $1 AND (g.season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1) OR g.id IS NULL)
      GROUP BY u.id, u.username, u.avatar_url
    `, [userId]);

    if (userStatsResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userStats = userStatsResult.rows[0];

    // Get weekly breakdown
    const weeklyResult = await db.query(`
      SELECT 
        g.week,
        COUNT(p.id) as picks,
        COUNT(CASE WHEN p.is_correct = true THEN 1 END) as correct,
        COALESCE(SUM(p.points_earned), 0) as points,
        ROUND(
          CASE 
            WHEN COUNT(p.id) > 0 
            THEN (COUNT(CASE WHEN p.is_correct = true THEN 1 END)::DECIMAL / COUNT(p.id)) * 100 
            ELSE 0 
          END, 1
        ) as accuracy
      FROM games g
      LEFT JOIN picks p ON g.id = p.game_id AND p.user_id = $1
      WHERE g.is_final = true AND g.season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1)
      GROUP BY g.week
      HAVING COUNT(p.id) > 0
      ORDER BY g.week
    `, [userId]);

    // Get favorite teams (most picked)
    const favoriteTeamsResult = await db.query(`
      SELECT 
        t.name,
        t.abbreviation,
        COUNT(p.id) as pick_count,
        COUNT(CASE WHEN p.is_correct = true THEN 1 END) as correct_count,
        ROUND(
          CASE 
            WHEN COUNT(p.id) > 0 
            THEN (COUNT(CASE WHEN p.is_correct = true THEN 1 END)::DECIMAL / COUNT(p.id)) * 100 
            ELSE 0 
          END, 1
        ) as accuracy
      FROM picks p
      JOIN teams t ON p.picked_team_id = t.id
      JOIN games g ON p.game_id = g.id AND g.is_final = true
      WHERE p.user_id = $1 AND g.season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1)
      GROUP BY t.id, t.name, t.abbreviation
      ORDER BY pick_count DESC, accuracy DESC
      LIMIT 5
    `, [userId]);

    const response = {
      totalPoints: parseInt(userStats.total_points),
      totalPicks: parseInt(userStats.total_picks),
      correctPicks: parseInt(userStats.correct_picks),
      accuracyPercentage: parseFloat(userStats.accuracy_percentage),
      weeksParticipated: parseInt(userStats.weeks_participated),
      weeklyBreakdown: weeklyResult.rows.map(week => ({
        week: week.week,
        picks: parseInt(week.picks),
        correct: parseInt(week.correct),
        points: parseInt(week.points),
        accuracy: parseFloat(week.accuracy)
      })),
      favoriteTeams: favoriteTeamsResult.rows.map(team => ({
        name: team.name,
        abbreviation: team.abbreviation,
        pickCount: parseInt(team.pick_count),
        correctCount: parseInt(team.correct_count),
        accuracy: parseFloat(team.accuracy)
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Get user's pick results showing which picks were correct/incorrect
app.get('/api/picks/results/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const result = await db.query(`
      SELECT 
        p.id as pick_id,
        p.is_correct,
        p.points_earned,
        g.id as game_id,
        g.week,
        g.game_time,
        g.home_score,
        g.away_score,
        g.is_final,
        ht.name as home_team_name,
        ht.abbreviation as home_team_abbr,
        at.name as away_team_name,
        at.abbreviation as away_team_abbr,
        pt.name as picked_team_name,
        pt.abbreviation as picked_team_abbr,
        p.picked_team_id,
        g.home_team_id,
        g.away_team_id,
        ht.division as home_division,
        at.division as away_division
      FROM picks p
      JOIN games g ON p.game_id = g.id
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      JOIN teams pt ON p.picked_team_id = pt.id
      WHERE p.user_id = $1 AND g.is_final = true
      AND g.season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1)
      ORDER BY g.week DESC, g.game_time DESC
      LIMIT 50
    `, [userId]);

    const pickResults = result.rows.map(pick => ({
      pickId: pick.pick_id,
      gameId: pick.game_id,
      week: pick.week,
      gameTime: pick.game_time,
      homeTeam: {
        name: pick.home_team_name,
        abbr: pick.home_team_abbr,
        score: pick.home_score
      },
      awayTeam: {
        name: pick.away_team_name,
        abbr: pick.away_team_abbr,
        score: pick.away_score
      },
      pickedTeam: {
        name: pick.picked_team_name,
        abbr: pick.picked_team_abbr,
        id: pick.picked_team_id
      },
      isCorrect: pick.is_correct,
      pointsEarned: pick.points_earned,
      wasAfcWest: (() => {
        const afcWestTeams = ['DEN', 'KC', 'LV', 'LAC'];
        return (afcWestTeams.includes(pick.home_team_abbr) || afcWestTeams.includes(pick.away_team_abbr));
      })(),
      finalScore: `${pick.away_team_abbr} ${pick.away_score} - ${pick.home_score} ${pick.home_team_abbr}`,
      winner: pick.home_score > pick.away_score ? 'home' : 'away'
    }));

    res.json(pickResults);
  } catch (error) {
    console.error('Error fetching pick results:', error);
    res.status(500).json({ error: 'Failed to fetch pick results' });
  }
});

// Admin endpoint to clear user's picks and reset game data
app.post('/api/admin/clear-picks/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { week } = req.body;
    
    console.log(`🗑️ Clearing picks for user ${userId}...`);
    
    if (week) {
      // Clear picks for specific week
      const picksResult = await db.query(`
        DELETE FROM picks p
        USING games g
        WHERE p.game_id = g.id 
        AND p.user_id = $1 
        AND g.week = $2
        AND g.season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1)
      `, [userId, parseInt(week)]);
      
      // Reset games for that week
      await db.query(`
        UPDATE games 
        SET home_score = NULL, away_score = NULL, is_final = false 
        WHERE week = $1 
        AND season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1)
      `, [parseInt(week)]);
      
      console.log(`  Cleared ${picksResult.rowCount} picks for Week ${week}`);
      
      res.json({
        message: `Cleared Week ${week} data`,
        picksCleared: picksResult.rowCount,
        gamesReset: true
      });
    } else {
      // Clear all picks for user
      const picksResult = await db.query(`
        DELETE FROM picks p
        USING games g
        WHERE p.game_id = g.id 
        AND p.user_id = $1
        AND g.season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1)
      `, [userId]);
      
      // Reset all games
      await db.query(`
        UPDATE games 
        SET home_score = NULL, away_score = NULL, is_final = false 
        WHERE season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1)
      `);
      
      console.log(`  Cleared all ${picksResult.rowCount} picks for user ${userId}`);
      
      res.json({
        message: 'Cleared all season data',
        picksCleared: picksResult.rowCount,
        gamesReset: true
      });
    }
  } catch (error) {
    console.error('Error clearing picks:', error);
    res.status(500).json({ error: 'Failed to clear picks' });
  }
});

// Admin endpoint to simulate game completion
app.post('/api/admin/complete-games', async (req, res) => {
  try {
    const { week } = req.body;
    const targetWeek = week || 1;
    
    console.log(`🎮 Simulating completion of Week ${targetWeek} games...`);
    
    // Get all games for the specified week that aren't final yet
    const gamesResult = await db.query(`
      SELECT g.id, g.home_team_id, g.away_team_id, ht.abbreviation as home_abbr, at.abbreviation as away_abbr
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.week = $1 AND g.is_final = false
      AND g.season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1)
    `, [targetWeek]);
    
    const games = gamesResult.rows;
    let gamesCompleted = 0;
    
    for (const game of games) {
      // Generate random realistic NFL scores (7-49 points)
      const homeScore = Math.floor(Math.random() * 42) + 7;  // 7-49
      const awayScore = Math.floor(Math.random() * 42) + 7;  // 7-49
      
      // Update game with final scores
      await db.query(`
        UPDATE games 
        SET home_score = $1, away_score = $2, is_final = true 
        WHERE id = $3
      `, [homeScore, awayScore, game.id]);
      
      console.log(`  ${game.away_abbr} ${awayScore} - ${homeScore} ${game.home_abbr}`);
      gamesCompleted++;
    }
    
    // Now calculate points for all picks on completed games
    console.log(`🔄 Calculating points for all picks on completed games...`);
    
    // Get all picks for completed games in this week
    const picksResult = await db.query(`
      SELECT 
        p.id as pick_id,
        p.user_id,
        p.game_id,
        p.picked_team_id,
        g.home_team_id,
        g.away_team_id,
        g.home_score,
        g.away_score,
        ht.division as home_division,
        at.division as away_division,
        ht.abbreviation as home_team_abbr,
        at.abbreviation as away_team_abbr,
        ht.conference as home_conference,
        at.conference as away_conference
      FROM picks p
      JOIN games g ON p.game_id = g.id
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.week = $1 AND g.is_final = true
      AND g.season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1)
    `, [targetWeek]);
    
    let picksProcessed = 0;
    
    for (const pick of picksResult.rows) {
      // Determine winning team
      const homeWon = pick.home_score > pick.away_score;
      const awayWon = pick.away_score > pick.home_score;
      const tie = pick.home_score === pick.away_score;
      
      let isCorrect = false;
      if (!tie) {
        if (homeWon && pick.picked_team_id === pick.home_team_id) {
          isCorrect = true;
        } else if (awayWon && pick.picked_team_id === pick.away_team_id) {
          isCorrect = true;
        }
      }
      
      // Calculate points (AFC West bonus)
      let pointsEarned = 0;
      if (isCorrect) {
        // AFC West teams: Broncos (DEN), Chiefs (KC), Raiders (LV), Chargers (LAC)
        // Give 2 points for ANY game involving AFC West teams (not just division games)
        const afcWestTeams = ['DEN', 'KC', 'LV', 'LAC'];
        const isAfcWestGame = (
          afcWestTeams.includes(pick.home_team_abbr) || 
          afcWestTeams.includes(pick.away_team_abbr)
        );
        
        console.log(`  Game: ${pick.away_team_abbr} @ ${pick.home_team_abbr} - AFC West: ${isAfcWestGame}`);
        pointsEarned = isAfcWestGame ? 2 : 1;
      }
      
      // Update pick with results
      await db.query(`
        UPDATE picks 
        SET is_correct = $1, points_earned = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [isCorrect, pointsEarned, pick.pick_id]);
      
      picksProcessed++;
    }
    
    console.log(`✅ Completed ${gamesCompleted} games and processed ${picksProcessed} picks`);
    
    res.json({
      message: `Successfully completed Week ${targetWeek} games`,
      gamesCompleted,
      picksProcessed,
      week: targetWeek
    });
    
  } catch (error) {
    console.error('Error completing games:', error);
    res.status(500).json({ error: 'Failed to complete games', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🏈 Minimal Broncos Server running on port ${PORT}`);
  console.log('✅ Server started successfully!');
});