const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const db = require('./models/database');
const automaticUpdates = require('./services/automaticUpdates');
const nfl2025Api = require('./services/nfl2025Api');
const espnOddsAPI = require('./services/espnOddsApi');
const oddsScheduler = require('./services/oddsScheduler');
const leaderboardScheduler = require('./services/leaderboardScheduler');
const cacheService = require('./services/cache');
const jobQueueService = require('./services/jobQueue');
require('dotenv').config();

// GitHub Actions deployment test - updated backend 🚀

// Function to fetch injury data from ESPN API for a team
async function fetchTeamInjuries(teamId) {
  try {
    // Use ESPN Core API for detailed injury data
    const url = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/${teamId}/injuries`;
    console.log(`Fetching detailed injury data for team ${teamId}...`);
    
    const response = await axios.get(url);
    const injuryRefs = response.data?.items || [];
    
    const injuries = [];
    
    // Fetch detailed injury data for each reference (limit to first 10 for performance)
    const limitedRefs = injuryRefs.slice(0, 10);
    
    for (const injuryRef of limitedRefs) {
      try {
        const injuryDetailResponse = await axios.get(injuryRef.$ref);
        const injuryData = injuryDetailResponse.data;
        
        // Fetch athlete data for player name and position
        let playerName = 'Unknown Player';
        let position = 'N/A';
        
        if (injuryData.athlete && injuryData.athlete.$ref) {
          try {
            const athleteResponse = await axios.get(injuryData.athlete.$ref);
            playerName = athleteResponse.data.displayName || athleteResponse.data.fullName || 'Unknown Player';
            position = athleteResponse.data.position?.abbreviation || 'N/A';
          } catch (athleteError) {
            console.warn(`Could not fetch athlete data: ${athleteError.message}`);
          }
        }
        
        injuries.push({
          injuryId: injuryData.id,
          playerId: injuryData.athlete?.$ref?.split('/').slice(-1)[0] || null,
          playerName: playerName,
          position: position,
          status: injuryData.status || 'Unknown',
          shortComment: injuryData.shortComment || '',
          longComment: injuryData.longComment || '',
          injuryType: injuryData.details?.type || 'Unknown',
          injuryLocation: injuryData.details?.location || 'Unknown',
          injuryDetail: injuryData.details?.detail || 'Not Specified',
          side: injuryData.details?.side || 'Not Specified',
          returnDate: injuryData.details?.returnDate || null,
          fantasyStatus: injuryData.details?.fantasyStatus?.description || null,
          injuryDate: injuryData.date,
          typeAbbreviation: injuryData.type?.abbreviation || 'O'
        });
      } catch (detailError) {
        console.warn(`Error fetching injury detail: ${detailError.message}`);
      }
    }
    
    console.log(`Found ${injuries.length} detailed injuries for team ${teamId}`);
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

// Update odds from ESPN API for current week
// Admin endpoint to run database migration
app.post('/api/admin/run-migration', async (req, res) => {
  try {
    const fs = require('fs');
    const { migrationName } = req.body;
    
    if (!migrationName) {
      return res.status(400).json({ error: 'Migration name required' });
    }
    
    const migrationPath = `./migrations/${migrationName}.sql`;
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    await db.query(migration);
    
    res.json({
      success: true,
      message: `Migration ${migrationName}.sql completed successfully`
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Admin endpoint to fetch and map ESPN events
app.post('/api/admin/map-espn-events', async (req, res) => {
  try {
    const espnEventsAPI = require('./services/espnEventsApi');
    
    console.log('🏈 Fetching ESPN events for 2025 season...');
    const events = await espnEventsAPI.fetchSeasonEvents();
    
    console.log('🔗 Mapping events to database games...');
    const mapResult = await espnEventsAPI.mapEventsToGames(db, events);
    
    res.json({
      success: true,
      eventsFound: events.length,
      mapped: mapResult.mapped,
      failed: mapResult.failed,
      message: `Mapped ${mapResult.mapped} games to ESPN events`
    });
    
  } catch (error) {
    console.error('Error mapping ESPN events:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/admin/update-odds', async (req, res) => {
  try {
    console.log('📊 Starting ESPN odds update for current week...');
    
    // First, ensure ESPN event ID and odds columns exist
    try {
      await db.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS espn_event_id VARCHAR(50)');
      await db.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS espn_game_id VARCHAR(50)');
      await db.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS over_odds DECIMAL(6,2)');
      await db.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS under_odds DECIMAL(6,2)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_games_espn_event_id ON games(espn_event_id)');
      console.log('✅ ESPN event ID and odds columns ensured');
    } catch (error) {
      console.log('⚠️ Column creation skipped (may already exist):', error.message);
    }
    
    // Ensure Hall of Fame game has correct ESPN event ID
    await db.query(`
      UPDATE games 
      SET espn_event_id = '401772971', espn_game_id = '401772971'
      WHERE week = 'pre1' 
      AND season_type = 1
      AND date(game_time) = '2025-07-31'
    `);
    console.log('✅ Updated Hall of Fame game with correct ESPN event ID: 401772971');
    
    // If no other ESPN event IDs exist, fetch and map them
    const eventCheck = await db.query('SELECT COUNT(*) as count FROM games WHERE espn_event_id IS NOT NULL');
    if (parseInt(eventCheck.rows[0].count) <= 1) {
      console.log('🔗 Fetching additional ESPN event IDs...');
      const espnEventsAPI = require('./services/espnEventsApi');
      const events = await espnEventsAPI.fetchSeasonEvents();
      await espnEventsAPI.mapEventsToGames(db, events);
    }
    
    // Get current week games (upcoming games within next 2 weeks) with ESPN event IDs
    const gamesResult = await db.query(`
      SELECT g.id, g.espn_event_id, g.espn_game_id, g.week, g.home_team_id, g.away_team_id,
             ht.name as home_team_name, at.name as away_team_name,
             g.game_time, g.spread, g.over_under
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.game_time BETWEEN NOW() AND NOW() + INTERVAL '14 days'
        AND g.season_type IN (1, 2)
        AND g.espn_event_id IS NOT NULL
      ORDER BY g.game_time ASC
      LIMIT 50
    `);

    if (gamesResult.rows.length === 0) {
      return res.json({ 
        message: 'No upcoming games found for odds update',
        updated: 0,
        failed: 0
      });
    }

    console.log(`Found ${gamesResult.rows.length} upcoming games with ESPN IDs to update`);
    
    // Debug: Show what ESPN event IDs we're using
    gamesResult.rows.forEach(game => {
      console.log(`🔍 Game: ${game.away_team_name} @ ${game.home_team_name}`);
      console.log(`   ESPN Event ID: ${game.espn_event_id}`);
      console.log(`   ESPN Game ID: ${game.espn_game_id}`);
      console.log(`   Game Time: ${game.game_time}`);
    });
    
    // Use real ESPN odds API
    const updateResult = await espnOddsAPI.batchUpdateOdds(db, gamesResult.rows);
    
    res.json({
      success: true,
      message: `ESPN odds update completed for current week`,
      gamesProcessed: gamesResult.rows.length,
      updated: updateResult.updated,
      failed: updateResult.failed
    });
    
  } catch (error) {
    console.error('Error updating odds:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to check ESPN event IDs
app.get('/api/debug/espn-ids', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, week, home_team_name, away_team_name, game_time, 
             espn_event_id, espn_game_id, spread, over_under
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.week = 'pre1'
      ORDER BY g.game_time
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Keep the old placeholder logic as fallback
app.post('/api/admin/update-odds-fallback', async (req, res) => {
  try {
    console.log('📊 Starting fallback odds update...');
    
    const gamesResult = await db.query(`
      SELECT g.id, g.week, g.home_team_id, g.away_team_id,
             ht.name as home_team_name, at.name as away_team_name,
             g.game_time, g.spread, g.over_under
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.game_time BETWEEN NOW() AND NOW() + INTERVAL '14 days'
        AND g.season_type IN (1, 2)
      ORDER BY g.game_time ASC
      LIMIT 50
    `);

    if (gamesResult.rows.length === 0) {
      return res.json({ 
        message: 'No upcoming games found for odds update',
        updated: 0,
        failed: 0
      });
    }

    console.log(`Found ${gamesResult.rows.length} upcoming games to update with fallback odds`);
    
    let updated = 0;
    let failed = 0;
    
    // Generate realistic betting odds based on teams
    for (const game of gamesResult.rows) {
      try {
        const spread = (Math.random() * 14 - 7).toFixed(1); // -7.0 to +7.0
        const overUnder = (Math.random() * 10 + 42).toFixed(1); // 42.0 to 52.0
        
        // Update TV channel based on game time/day
        const gameDate = new Date(game.game_time);
        const dayOfWeek = gameDate.getDay();
        const hour = gameDate.getHours();
        
        let tvChannel = 'TBD';
        if (dayOfWeek === 0) { // Sunday
          tvChannel = hour < 16 ? 'CBS' : hour < 20 ? 'FOX' : 'NBC';
        } else if (dayOfWeek === 1) { // Monday
          tvChannel = 'ESPN';
        } else if (dayOfWeek === 4) { // Thursday
          tvChannel = 'Amazon Prime';
        } else if (dayOfWeek === 5 || dayOfWeek === 6) { // Friday/Saturday
          tvChannel = 'NFL Network';
        }
        
        await db.query(`
          UPDATE games 
          SET spread = $1, over_under = $2, tv_channel = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [parseFloat(spread), parseFloat(overUnder), tvChannel, game.id]);
        
        console.log(`✅ Updated ${game.away_team_name} @ ${game.home_team_name}: Spread=${spread}, O/U=${overUnder}, TV=${tvChannel}`);
        updated++;
        
      } catch (error) {
        console.error(`Error updating game ${game.id}:`, error);
        failed++;
      }
    }
    
    res.json({
      message: `Odds update completed for current week`,
      updated,
      failed,
      gamesProcessed: gamesResult.rows.length
    });

  } catch (error) {
    console.error('Error updating current week odds:', error);
    res.status(500).json({ 
      error: 'Failed to update current week odds',
      details: error.message 
    });
  }
});

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

// Test endpoint for injury data (no auth required)
app.get('/api/test/injuries/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    const result = await db.query(`
      SELECT injury_id, player_name, position, status, short_comment, long_comment,
             injury_type, injury_location, injury_detail, side, return_date,
             fantasy_status, injury_date, type_abbreviation
      FROM detailed_injuries 
      WHERE team_id = $1 
        AND status IN ('Out', 'Questionable', 'Doubtful', 'Probable')
      ORDER BY 
        CASE status 
          WHEN 'Out' THEN 1
          WHEN 'Doubtful' THEN 2  
          WHEN 'Questionable' THEN 3
          WHEN 'Probable' THEN 4
          ELSE 5
        END,
        injury_date DESC
      LIMIT 10
    `, [teamId]);
    
    res.json({
      teamId: teamId,
      injuryCount: result.rows.length,
      injuries: result.rows
    });
  } catch (error) {
    console.error('Error fetching test injuries:', error);
    res.status(500).json({ error: 'Failed to fetch injuries', details: error.message });
  }
});

// Test endpoint for games with injuries (no auth required)
app.get('/api/test/games/week/:week', async (req, res) => {
  try {
    const week = req.params.week; // Now accepts both "pre1", "pre2", etc. and "1", "2", etc.
    
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
        g.tv_channel,
        g.home_team_id,
        g.away_team_id,
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
        AND g.week = $1
      ORDER BY g.game_time ASC
    `, [week]);
    
    // Enhance games with detailed injury data from database
    const enhancedGames = await Promise.all(result.rows.map(async (game) => {
      try {
        // Fetch detailed injury data for both teams from database
        const [homeInjuriesResult, awayInjuriesResult] = await Promise.all([
          db.query(`
            SELECT injury_id, player_name, position, status, short_comment, long_comment,
                   injury_type, injury_location, injury_detail, side, return_date,
                   fantasy_status, injury_date, type_abbreviation
            FROM detailed_injuries 
            WHERE team_id = $1 
              AND status IN ('Out', 'Questionable', 'Doubtful', 'Probable')
            ORDER BY 
              CASE status 
                WHEN 'Out' THEN 1
                WHEN 'Doubtful' THEN 2  
                WHEN 'Questionable' THEN 3
                WHEN 'Probable' THEN 4
                ELSE 5
              END,
              injury_date DESC
            LIMIT 10
          `, [game.home_team_id]),
          db.query(`
            SELECT injury_id, player_name, position, status, short_comment, long_comment,
                   injury_type, injury_location, injury_detail, side, return_date,
                   fantasy_status, injury_date, type_abbreviation
            FROM detailed_injuries 
            WHERE team_id = $1 
              AND status IN ('Out', 'Questionable', 'Doubtful', 'Probable')
            ORDER BY 
              CASE status 
                WHEN 'Out' THEN 1
                WHEN 'Doubtful' THEN 2  
                WHEN 'Questionable' THEN 3
                WHEN 'Probable' THEN 4
                ELSE 5
              END,
              injury_date DESC
            LIMIT 10
          `, [game.away_team_id])
        ]);
        
        return {
          ...game,
          home_team_injuries: homeInjuriesResult.rows || [],
          away_team_injuries: awayInjuriesResult.rows || []
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
    console.error('Error fetching test games and injuries:', error);
    res.status(500).json({ error: 'Failed to fetch games and injuries', details: error.message });
  }
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
    const week = req.params.week; // Now accepts both "pre1", "pre2", etc. and "1", "2", etc.
    const authHeader = req.headers.authorization;
    
    // For testing purposes, allow access without auth to debug injury display
    let userId = null;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (error) {
        console.warn('JWT verification failed, proceeding without user context');
      }
    }
    
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
        g.over_odds,
        g.under_odds,
        g.tv_channel,
        g.espn_event_id,
        g.espn_game_id,
        g.home_team_id,
        g.away_team_id,
        ht.name as home_team_name,
        ht.abbreviation as home_team_abbr,
        ht.primary_color as home_team_color,
        at.name as away_team_name,
        at.abbreviation as away_team_abbr,
        at.primary_color as away_team_color,
        g.home_team_record,
        g.away_team_record,
        p.picked_team_id,
        p.confidence_points,
        p.is_correct,
        p.points_earned
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      LEFT JOIN picks p ON g.id = p.game_id AND p.user_id = $1
      WHERE g.season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1)
        AND g.week = $2
      ORDER BY g.game_time ASC
    `, [userId, week]);
    
    // Enhance games with detailed injury data from database
    const enhancedGames = await Promise.all(result.rows.map(async (game) => {
      try {
        // Fetch detailed injury data for both teams from database
        const [homeInjuriesResult, awayInjuriesResult] = await Promise.all([
          db.query(`
            SELECT injury_id, player_name, position, status, short_comment, long_comment,
                   injury_type, injury_location, injury_detail, side, return_date,
                   fantasy_status, injury_date, type_abbreviation
            FROM detailed_injuries 
            WHERE team_id = $1 
              AND status IN ('Out', 'Questionable', 'Doubtful', 'Probable')
            ORDER BY 
              CASE status 
                WHEN 'Out' THEN 1
                WHEN 'Doubtful' THEN 2  
                WHEN 'Questionable' THEN 3
                WHEN 'Probable' THEN 4
                ELSE 5
              END,
              injury_date DESC
            LIMIT 10
          `, [game.home_team_id]),
          db.query(`
            SELECT injury_id, player_name, position, status, short_comment, long_comment,
                   injury_type, injury_location, injury_detail, side, return_date,
                   fantasy_status, injury_date, type_abbreviation
            FROM detailed_injuries 
            WHERE team_id = $1 
              AND status IN ('Out', 'Questionable', 'Doubtful', 'Probable')
            ORDER BY 
              CASE status 
                WHEN 'Out' THEN 1
                WHEN 'Doubtful' THEN 2  
                WHEN 'Questionable' THEN 3
                WHEN 'Probable' THEN 4
                ELSE 5
              END,
              injury_date DESC
            LIMIT 10
          `, [game.away_team_id])
        ]);
        
        return {
          ...game,
          home_team_injuries: homeInjuriesResult.rows || [],
          away_team_injuries: awayInjuriesResult.rows || []
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
    
    // Check if the game is locked (picks_locked = true OR game_time has passed)
    const gameCheck = await db.query(`
      SELECT id, game_time, picks_locked, is_final
      FROM games 
      WHERE id = $1
    `, [gameId]);
    
    if (gameCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const game = gameCheck.rows[0];
    const gameTime = new Date(game.game_time);
    const now = new Date();
    
    // Prevent picks if game is locked, has started, or is final
    if (game.picks_locked || gameTime <= now || game.is_final) {
      return res.status(400).json({ 
        error: 'Picks are locked for this game. Game has already started or ended.',
        gameTime: gameTime.toISOString(),
        currentTime: now.toISOString(),
        picksLocked: game.picks_locked,
        isFinal: game.is_final
      });
    }
    
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
    
    console.log(`✅ Completed ${gamesCompleted} games (pick results will be calculated by Tuesday cron job)`);
    res.json({ 
      message: `Successfully completed ${gamesCompleted} games (pick results will be calculated by Tuesday cron job)`,
      gamesCompleted 
    });
    
  } catch (error) {
    console.error('❌ Error completing games:', error.message);
    res.status(500).json({ error: 'Failed to complete games', details: error.message });
  }
});

// Clear all picks for testing
app.post('/test/clear-picks', async (req, res) => {
  try {
    console.log('🧹 Clearing all picks for testing...');
    
    // Delete all picks
    const result = await db.query('DELETE FROM picks');
    const deletedCount = result.rowCount;
    
    console.log(`✅ Cleared ${deletedCount} picks from database`);
    
    res.json({
      success: true,
      message: `Successfully cleared ${deletedCount} picks`,
      deletedCount
    });
    
  } catch (error) {
    console.error('❌ Error clearing picks:', error.message);
    res.status(500).json({ error: 'Failed to clear picks', details: error.message });
  }
});

// Reset game status back to "not started" (for testing)
app.post('/test/reset-game-status', async (req, res) => {
  try {
    console.log('🔄 Resetting game status for testing...');
    
    // Reset all games back to "not started" status, removing scores but keeping picks
    const result = await db.query(`
      UPDATE games 
      SET home_score = NULL, 
          away_score = NULL, 
          is_final = FALSE, 
          picks_locked = FALSE,
          updated_at = NOW()
      WHERE is_final = TRUE OR home_score IS NOT NULL OR away_score IS NOT NULL
    `);
    
    // Also reset all pick results
    await db.query(`
      UPDATE picks 
      SET is_correct = NULL, 
          points_earned = 0
      WHERE is_correct IS NOT NULL OR points_earned > 0
    `);
    
    const gamesReset = result.rowCount;
    
    console.log(`✅ Reset ${gamesReset} games back to "not started" status`);
    
    res.json({
      success: true,
      message: `Successfully reset ${gamesReset} games back to "not started" status`,
      gamesReset
    });
    
  } catch (error) {
    console.error('❌ Error resetting game status:', error.message);
    res.status(500).json({ error: 'Failed to reset game status', details: error.message });
  }
});

// Manual trigger for leaderboard updates (admin only)
app.post('/api/admin/trigger-leaderboard-update', async (req, res) => {
  try {
    console.log('🔧 Manually triggering leaderboard update...');
    
    const result = await leaderboardScheduler.triggerUpdate();
    
    res.json({
      success: true,
      message: 'Leaderboard update completed successfully',
      updateTime: result.updateTime,
      currentWeek: result.currentWeek
    });
    
  } catch (error) {
    console.error('❌ Error triggering leaderboard update:', error.message);
    res.status(500).json({ 
      error: 'Failed to trigger leaderboard update', 
      details: error.message 
    });
  }
});

// Simulate games for a specific week (admin only)
app.post('/test/complete-games-week', async (req, res) => {
  try {
    const { week, seasonType } = req.body;
    
    if (!week) {
      return res.status(400).json({ error: 'Week parameter is required' });
    }
    
    console.log(`🎯 Simulating games for week ${week} (season type: ${seasonType || 'regular'})...`);
    
    // Get games for the specific week
    let query = `
      SELECT g.id, g.week, g.season_type, ht.abbreviation as home_team, at.abbreviation as away_team
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.week = $1
        AND g.is_final = FALSE
    `;
    
    const params = [week];
    
    // Add season type filter if provided
    if (seasonType) {
      query += ` AND g.season_type = $2`;
      params.push(seasonType);
    }
    
    query += ` ORDER BY g.game_time`;
    
    const gamesResult = await db.query(query, params);
    
    if (gamesResult.rows.length === 0) {
      return res.json({
        success: true,
        message: `No incomplete games found for week ${week}`,
        gamesCompleted: 0
      });
    }
    
    console.log(`📋 Found ${gamesResult.rows.length} games to simulate for week ${week}`);
    
    let gamesCompleted = 0;
    
    for (const game of gamesResult.rows) {
      // Generate random scores (14-35 points each team)
      const homeScore = Math.floor(Math.random() * 22) + 14; // 14-35
      const awayScore = Math.floor(Math.random() * 22) + 14; // 14-35
      
      // Update the game with final scores
      await db.query(`
        UPDATE games 
        SET home_score = $1, 
            away_score = $2, 
            is_final = TRUE, 
            picks_locked = TRUE,
            updated_at = NOW()
        WHERE id = $3
      `, [homeScore, awayScore, game.id]);
      
      console.log(`⚽ ${game.away_team} ${awayScore} - ${homeScore} ${game.home_team} (Week ${game.week})`);
      gamesCompleted++;
    }
    
    console.log(`✅ Completed ${gamesCompleted} games for week ${week} (pick results will be calculated by Tuesday cron job)`);
    
    res.json({
      success: true,
      message: `Successfully completed ${gamesCompleted} games for week ${week}`,
      gamesCompleted,
      week,
      seasonType: seasonType || 'regular season'
    });
    
  } catch (error) {
    console.error('❌ Error completing games for week:', error.message);
    res.status(500).json({ 
      error: 'Failed to complete games for week', 
      details: error.message 
    });
  }
});

// Get available weeks for game simulation
app.get('/api/admin/available-weeks', async (req, res) => {
  try {
    // First, let's check if there are any games at all
    const gamesCheck = await db.query('SELECT COUNT(*) as total FROM games');
    console.log('Total games in database:', gamesCheck.rows[0].total);
    
    if (parseInt(gamesCheck.rows[0].total) === 0) {
      return res.json([]);
    }
    
    const result = await db.query(`
      SELECT 
        week, 
        season_type,
        COUNT(*) as total_games,
        COUNT(CASE WHEN is_final = FALSE THEN 1 END) as incomplete_games
      FROM games
      GROUP BY week, season_type
      ORDER BY season_type, week
    `);
    
    const weeks = result.rows.map(row => ({
      week: row.week,
      seasonType: parseInt(row.season_type),
      seasonTypeLabel: row.season_type === 1 ? 'Preseason' : 'Regular Season',
      totalGames: parseInt(row.total_games),
      incompleteGames: parseInt(row.incomplete_games),
      label: row.season_type === 1 ? 
        getPreseasonWeekLabel(row.week) : 
        `Week ${row.week}`,
      disabled: parseInt(row.incomplete_games) === 0
    }));
    
    res.json(weeks);
    
  } catch (error) {
    console.error('❌ Error getting available weeks:', error.message);
    res.status(500).json({ 
      error: 'Failed to get available weeks', 
      details: error.message 
    });
  }
});

// Helper function for preseason week labels
function getPreseasonWeekLabel(week) {
  switch (week) {
    case 'pre1': return 'Hall of Fame Weekend';
    case 'pre2': return 'Preseason Week 1';
    case 'pre3': return 'Preseason Week 2';
    case 'pre4': return 'Preseason Week 3';
    default: return `Preseason ${week}`;
  }
}

// Get leaderboard scheduler status
app.get('/api/admin/leaderboard-status', async (req, res) => {
  try {
    const status = leaderboardScheduler.getStatus();
    res.json(status);
  } catch (error) {
    console.error('❌ Error getting leaderboard status:', error.message);
    res.status(500).json({ 
      error: 'Failed to get leaderboard status', 
      details: error.message 
    });
  }
});

// Get leaderboard info for users (explains why recent picks may not show)
app.get('/api/leaderboard/info', async (req, res) => {
  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 2 = Tuesday
    const currentHour = now.getHours();
    
    let nextUpdateDay;
    if (currentDay < 2 || (currentDay === 2 && currentHour < 6)) {
      // Next Tuesday
      const daysUntilTuesday = currentDay === 2 ? 7 : (2 - currentDay + 7) % 7;
      nextUpdateDay = new Date(now.getTime() + daysUntilTuesday * 24 * 60 * 60 * 1000);
    } else {
      // Next Tuesday (next week)
      const daysUntilNextTuesday = 7 - currentDay + 2;
      nextUpdateDay = new Date(now.getTime() + daysUntilNextTuesday * 24 * 60 * 60 * 1000);
    }
    
    nextUpdateDay.setHours(6, 0, 0, 0);
    
    res.json({
      message: "Leaderboards update every Tuesday at 6:00 AM EST",
      explanation: "Recent picks from games that just finished may not appear until the next Tuesday update",
      nextUpdate: nextUpdateDay.toISOString(),
      currentTime: now.toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting leaderboard info:', error.message);
    res.status(500).json({ 
      error: 'Failed to get leaderboard info', 
      details: error.message 
    });
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
    
    // Check what tables exist
    const tablesInfo = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    // Check if seasons table exists and its structure
    let seasonsInfo = [];
    try {
      seasonsInfo = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'seasons'
        ORDER BY ordinal_position
      `);
    } catch (e) {
      console.log('Seasons table might not exist:', e.message);
    }
    
    res.json({ 
      status: 'Connected',
      teams_count: parseInt(result.rows[0].count),
      tables: tablesInfo.rows,
      seasons_columns: seasonsInfo.rows || [],
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

// ===== LEADERBOARD API ENDPOINTS =====

// Get user statistics for profile page
app.get('/api/leaderboard/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Get user's total stats (only from games that meet Tuesday cutoff rule)
    const statsResult = await db.query(`
      SELECT 
        COUNT(p.id) as total_picks,
        SUM(CASE WHEN p.is_correct = true THEN 1 ELSE 0 END) as correct_picks,
        SUM(p.points_earned) as total_points,
        COUNT(DISTINCT g.week) as weeks_participated,
        CASE 
          WHEN COUNT(p.id) > 0 THEN 
            ROUND((SUM(CASE WHEN p.is_correct = true THEN 1 ELSE 0 END)::decimal / COUNT(p.id)) * 100)
          ELSE 0 
        END as accuracy_percentage
      FROM picks p 
      JOIN games g ON p.game_id = g.id
      WHERE p.user_id = $1
        AND (
          SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_name = 'leaderboard_updates'
        ) > 0
        AND EXISTS (SELECT 1 FROM leaderboard_updates WHERE last_update > (NOW() - INTERVAL '7 days'))
        AND g.is_final = true 
        AND p.is_correct IS NOT NULL
    `, [userId]);

    const stats = statsResult.rows[0];

    // Get weekly breakdown (only from games that meet Tuesday cutoff rule)
    const weeklyResult = await db.query(`
      SELECT 
        g.week,
        COUNT(p.id) as picks,
        SUM(CASE WHEN p.is_correct = true THEN 1 ELSE 0 END) as correct,
        SUM(p.points_earned) as points,
        CASE 
          WHEN COUNT(p.id) > 0 THEN 
            ROUND((SUM(CASE WHEN p.is_correct = true THEN 1 ELSE 0 END)::decimal / COUNT(p.id)) * 100)
          ELSE 0 
        END as accuracy
      FROM picks p 
      JOIN games g ON p.game_id = g.id
      WHERE p.user_id = $1
        AND (
          SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_name = 'leaderboard_updates'
        ) > 0
        AND EXISTS (SELECT 1 FROM leaderboard_updates WHERE last_update > (NOW() - INTERVAL '7 days'))
        AND g.is_final = true 
        AND p.is_correct IS NOT NULL
      GROUP BY g.week
      ORDER BY g.week
    `, [userId]);

    // Get favorite teams (most picked teams, only from games that meet Tuesday cutoff rule)
    const favoritesResult = await db.query(`
      SELECT 
        t.name,
        t.abbreviation,
        COUNT(p.id) as pick_count,
        SUM(CASE WHEN p.is_correct = true THEN 1 ELSE 0 END) as correct_count,
        CASE 
          WHEN COUNT(p.id) > 0 THEN 
            ROUND((SUM(CASE WHEN p.is_correct = true THEN 1 ELSE 0 END)::decimal / COUNT(p.id)) * 100)
          ELSE 0 
        END as accuracy
      FROM picks p
      JOIN games g ON p.game_id = g.id
      JOIN teams t ON p.picked_team_id = t.id
      WHERE p.user_id = $1
        AND (
          SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_name = 'leaderboard_updates'
        ) > 0
        AND EXISTS (SELECT 1 FROM leaderboard_updates WHERE last_update > (NOW() - INTERVAL '7 days'))
        AND g.is_final = true 
        AND p.is_correct IS NOT NULL
      GROUP BY t.id, t.name, t.abbreviation
      ORDER BY pick_count DESC, accuracy DESC
      LIMIT 5
    `, [userId]);

    // Format the response
    const response = {
      totalPoints: parseInt(stats.total_points) || 0,
      totalPicks: parseInt(stats.total_picks) || 0,
      correctPicks: parseInt(stats.correct_picks) || 0,
      accuracyPercentage: parseInt(stats.accuracy_percentage) || 0,
      weeksParticipated: parseInt(stats.weeks_participated) || 0,
      weeklyBreakdown: weeklyResult.rows.map(week => ({
        week: parseInt(week.week),
        picks: parseInt(week.picks),
        correct: parseInt(week.correct),
        points: parseInt(week.points),
        accuracy: parseInt(week.accuracy)
      })),
      favoriteTeams: favoritesResult.rows.map(team => ({
        name: team.name,
        abbreviation: team.abbreviation,
        pickCount: parseInt(team.pick_count),
        correctCount: parseInt(team.correct_count),
        accuracy: parseInt(team.accuracy)
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Get season leaderboard
app.get('/api/leaderboard/season', async (req, res) => {
  try {
    // Only include games that have been final for at least 1 day (Tuesday cutoff rule)
    const result = await db.query(`
      SELECT 
        u.id as user_id,
        u.username,
        u.avatar_url as avatar,
        COUNT(p.id) as total_picks,
        SUM(CASE WHEN p.is_correct = true THEN 1 ELSE 0 END) as correct_picks,
        SUM(p.points_earned) as total_points,
        COUNT(DISTINCT g.week) as weeks_participated,
        CASE 
          WHEN COUNT(p.id) > 0 THEN 
            ROUND((SUM(CASE WHEN p.is_correct = true THEN 1 ELSE 0 END)::decimal / COUNT(p.id)) * 100)
          ELSE 0 
        END as accuracy_percentage,
        ROW_NUMBER() OVER (ORDER BY SUM(p.points_earned) DESC, COUNT(CASE WHEN p.is_correct = true THEN 1 END) DESC) as rank
      FROM users u
      LEFT JOIN picks p ON u.id = p.user_id
      LEFT JOIN games g ON p.game_id = g.id 
      WHERE (
          SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_name = 'leaderboard_updates'
        ) > 0
        AND (
          SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_name = 'leaderboard_updates'
        ) > 0
        AND EXISTS (SELECT 1 FROM leaderboard_updates WHERE last_update > (NOW() - INTERVAL '7 days'))
        AND g.is_final = true 
        AND p.is_correct IS NOT NULL
        AND p.points_earned IS NOT NULL
      GROUP BY u.id, u.username, u.avatar_url
      HAVING COUNT(p.id) > 0
      ORDER BY total_points DESC, correct_picks DESC
    `);

    // Format the response to match frontend expectations
    const formattedResult = result.rows.map(player => ({
      userId: parseInt(player.user_id),
      username: player.username,
      avatar: player.avatar,
      totalPicks: parseInt(player.total_picks),
      correctPicks: parseInt(player.correct_picks),
      totalPoints: parseInt(player.total_points),
      weeksParticipated: parseInt(player.weeks_participated),
      accuracyPercentage: parseInt(player.accuracy_percentage),
      rank: parseInt(player.rank)
    }));

    res.json(formattedResult);
  } catch (error) {
    console.error('Error fetching season leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch season leaderboard' });
  }
});

// Get weekly leaderboard
app.get('/api/leaderboard/week/:week', async (req, res) => {
  try {
    const week = req.params.week; // Keep as string to support preseason weeks like 'pre1'
    
    // Only show leaderboard for weeks where games have been final for at least 1 day (Tuesday cutoff rule)
    const result = await db.query(`
      SELECT 
        u.id as user_id,
        u.username,
        u.avatar_url as avatar,
        COUNT(p.id) as total_picks,
        SUM(CASE WHEN p.is_correct = true THEN 1 ELSE 0 END) as correct_picks,
        SUM(p.points_earned) as total_points,
        1 as weeks_participated,
        CASE 
          WHEN COUNT(p.id) > 0 THEN 
            ROUND((SUM(CASE WHEN p.is_correct = true THEN 1 ELSE 0 END)::decimal / COUNT(p.id)) * 100)
          ELSE 0 
        END as accuracy_percentage,
        ROW_NUMBER() OVER (ORDER BY SUM(p.points_earned) DESC, COUNT(CASE WHEN p.is_correct = true THEN 1 END) DESC) as rank
      FROM users u
      INNER JOIN picks p ON u.id = p.user_id
      INNER JOIN games g ON p.game_id = g.id 
      WHERE g.week = $1
        AND (
          SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_name = 'leaderboard_updates'
        ) > 0
        AND (
          SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_name = 'leaderboard_updates'
        ) > 0
        AND EXISTS (SELECT 1 FROM leaderboard_updates WHERE last_update > (NOW() - INTERVAL '7 days'))
        AND g.is_final = true 
        AND p.is_correct IS NOT NULL
        AND p.points_earned IS NOT NULL
      GROUP BY u.id, u.username, u.avatar_url
      HAVING COUNT(p.id) > 0
      ORDER BY total_points DESC, correct_picks DESC
    `, [week]);

    // Format the response to match frontend expectations
    const formattedResult = result.rows.map(player => ({
      userId: parseInt(player.user_id),
      username: player.username,
      avatar: player.avatar,
      totalPicks: parseInt(player.total_picks),
      correctPicks: parseInt(player.correct_picks),
      totalPoints: parseInt(player.total_points),
      weeksParticipated: parseInt(player.weeks_participated),
      accuracyPercentage: parseInt(player.accuracy_percentage),
      rank: parseInt(player.rank)
    }));

    res.json(formattedResult);
  } catch (error) {
    console.error('Error fetching weekly leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch weekly leaderboard' });
  }
});

// Get picks comparison for a specific week
app.get('/api/picks/week/:week/compare', async (req, res) => {
  try {
    const week = req.params.week; // Don't parse as int, keep as string for preseason weeks
    
    // Get all games for the week with pick data
    const result = await db.query(`
      SELECT 
        g.id,
        g.week,
        g.game_time,
        g.is_final,
        g.home_score,
        g.away_score,
        g.spread,
        g.over_under,
        ht.id as home_team_id,
        ht.name as home_team_name,
        ht.abbreviation as home_team_abbr,
        at.id as away_team_id,
        at.name as away_team_name,
        at.abbreviation as away_team_abbr,
        p.user_id,
        p.picked_team_id,
        p.confidence_points,
        p.is_correct,
        p.points_earned,
        u.username,
        u.avatar_url
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      LEFT JOIN picks p ON g.id = p.game_id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE g.week = $1
      ORDER BY g.game_time, u.username
    `, [week]);

    // Group by game and organize pick data
    const gamesMap = new Map();
    
    result.rows.forEach(row => {
      if (!gamesMap.has(row.id)) {
        gamesMap.set(row.id, {
          id: row.id,
          week: row.week,
          gameTime: row.game_time,
          isFinal: row.is_final,
          homeTeam: {
            id: row.home_team_id,
            name: row.home_team_name,
            abbreviation: row.home_team_abbr
          },
          awayTeam: {
            id: row.away_team_id,
            name: row.away_team_name,
            abbreviation: row.away_team_abbr
          },
          homeScore: row.home_score,
          awayScore: row.away_score,
          spread: row.spread,
          overUnder: row.over_under,
          picks: []
        });
      }
      
      // Add pick data if it exists
      if (row.user_id) {
        gamesMap.get(row.id).picks.push({
          userId: row.user_id,
          username: row.username,
          avatar: row.avatar_url,
          pickedTeamId: row.picked_team_id,
          confidencePoints: row.confidence_points,
          isCorrect: row.is_correct,
          pointsEarned: row.points_earned
        });
      }
    });

    // Calculate pick percentages for each game
    const games = Array.from(gamesMap.values()).map(game => {
      const totalPicks = game.picks.length;
      
      if (totalPicks > 0) {
        const homeTeamPicks = game.picks.filter(pick => pick.pickedTeamId === game.homeTeam.id).length;
        const awayTeamPicks = game.picks.filter(pick => pick.pickedTeamId === game.awayTeam.id).length;
        
        game.pickPercentages = {
          totalPicks,
          homeTeamPicks,
          awayTeamPicks,
          homeTeamPercentage: Math.round((homeTeamPicks / totalPicks) * 100),
          awayTeamPercentage: Math.round((awayTeamPicks / totalPicks) * 100)
        };
      } else {
        game.pickPercentages = {
          totalPicks: 0,
          homeTeamPicks: 0,
          awayTeamPicks: 0,
          homeTeamPercentage: 0,
          awayTeamPercentage: 0
        };
      }
      
      return game;
    });
    
    res.json(games);
    
  } catch (error) {
    console.error('Error fetching picks comparison:', error);
    res.status(500).json({ error: 'Failed to fetch picks comparison' });
  }
});

// Copy production database to development (localhost only)
app.post('/api/admin/copy-prod-to-dev', async (req, res) => {
  try {
    // Security check - only allow on localhost
    const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    if (!isLocalhost) {
      return res.status(403).json({ error: 'This operation is only allowed on localhost' });
    }

    console.log('🔄 Starting production database copy to development...');

    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    // Step 1: Drop and recreate the dev database
    console.log('1. Recreating development database...');
    await execAsync('docker exec broncos-pickems-db psql -U postgres -c "DROP DATABASE IF EXISTS broncos_pickems_dev;"');
    await execAsync('docker exec broncos-pickems-db psql -U postgres -c "CREATE DATABASE broncos_pickems_dev;"');

    // Step 2: Copy entire production database to dev
    console.log('2. Copying production data to development...');
    await execAsync(
      'docker exec broncos-pickems-db pg_dump -U postgres broncos_pickems | docker exec -i broncos-pickems-db psql -U postgres -d broncos_pickems_dev'
    );

    // Step 3: Get stats for confirmation
    console.log('3. Getting database statistics...');
    const { stdout: userCount } = await execAsync(
      'docker exec broncos-pickems-db psql -U postgres -d broncos_pickems_dev -t -c "SELECT COUNT(*) FROM users;"'
    );
    
    const { stdout: pickCount } = await execAsync(
      'docker exec broncos-pickems-db psql -U postgres -d broncos_pickems_dev -t -c "SELECT COUNT(*) FROM picks;"'
    );
    
    const { stdout: gameCount } = await execAsync(
      'docker exec broncos-pickems-db psql -U postgres -d broncos_pickems_dev -t -c "SELECT COUNT(*) FROM games;"'
    );

    console.log('✅ Database copy completed successfully!');

    res.json({
      success: true,
      message: 'Production database copied to development successfully',
      users: parseInt(userCount.trim()),
      picks: parseInt(pickCount.trim()),
      games: parseInt(gameCount.trim())
    });

  } catch (error) {
    console.error('❌ Error copying database:', error);
    res.status(500).json({ 
      error: 'Failed to copy production database',
      details: error.message 
    });
  }
});

// ===== AUTOMATIC UPDATES API ENDPOINTS =====

// Get update service status
app.get('/api/admin/updates/status', async (req, res) => {
  try {
    const status = automaticUpdates.getStatus();
    const recentLogs = await automaticUpdates.getRecentLogs(20);
    
    res.json({
      ...status,
      recentLogs
    });
  } catch (error) {
    console.error('Error fetching update status:', error);
    res.status(500).json({ error: 'Failed to fetch update status' });
  }
});

// Get detailed update logs
app.get('/api/admin/updates/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await automaticUpdates.getRecentLogs(limit);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching update logs:', error);
    res.status(500).json({ error: 'Failed to fetch update logs' });
  }
});

// Manually trigger specific update
app.post('/api/admin/updates/trigger/:updateType', async (req, res) => {
  try {
    const { updateType } = req.params;
    const validTypes = ['injuries', 'odds', 'records', 'weather', 'games'];
    
    if (!validTypes.includes(updateType)) {
      return res.status(400).json({ 
        error: `Invalid update type. Must be one of: ${validTypes.join(', ')}` 
      });
    }
    
    console.log(`🔄 Manual trigger requested for: ${updateType}`);
    const result = await automaticUpdates.triggerUpdate(updateType);
    
    res.json({
      success: true,
      updateType,
      recordsUpdated: result,
      message: `${updateType} update completed successfully`
    });
  } catch (error) {
    console.error(`Error triggering ${req.params.updateType} update:`, error);
    res.status(500).json({ 
      error: `Failed to trigger ${req.params.updateType} update: ${error.message}` 
    });
  }
});

// ===== 2025 NFL SEASON API ENDPOINTS =====

// One-click setup: Import sample 2025 season games to database
app.post('/api/admin/setup-2025-season', async (req, res) => {
  try {
    console.log('🚀 Starting 2025 season setup with sample data...');
    
    // Verify database connection
    await db.query('SELECT 1');
    console.log('✅ Database connection confirmed');
    
    // Add sample preseason games to demonstrate the system
    console.log('📋 Creating 2025 season record...');
    await db.query(`
      INSERT INTO seasons (year, is_active, start_date, end_date, description, current_week) 
      VALUES (2025, true, '2025-08-01', '2026-02-12', '2025-2026 NFL Season with preseason testing', 1)
      ON CONFLICT (year) DO UPDATE SET
        is_active = EXCLUDED.is_active,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        description = EXCLUDED.description
    `);
    
    // Get season ID
    const seasonResult = await db.query('SELECT id FROM seasons WHERE year = 2025');
    const seasonId = seasonResult.rows[0].id;
    
    console.log('🏈 Adding sample preseason games...');
    // Add a few sample games for testing
    const sampleGames = [
      // Hall of Fame Game
      { home: 'DEN', away: 'DAL', week: -4, game_time: '2025-08-01 20:00:00' },
      // Preseason Week 1
      { home: 'DEN', away: 'IND', week: -3, game_time: '2025-08-08 19:00:00' },
      { home: 'KC', away: 'JAX', week: -3, game_time: '2025-08-10 16:00:00' },
      // Preseason Week 2  
      { home: 'DEN', away: 'GB', week: -2, game_time: '2025-08-17 20:00:00' },
      { home: 'BUF', away: 'PIT', week: -2, game_time: '2025-08-17 19:30:00' }
    ];
    
    let gamesAdded = 0;
    for (const game of sampleGames) {
      // Get team IDs
      const homeTeam = await db.query('SELECT id FROM teams WHERE abbreviation = $1', [game.home]);
      const awayTeam = await db.query('SELECT id FROM teams WHERE abbreviation = $1', [game.away]);
      
      if (homeTeam.rows.length && awayTeam.rows.length) {
        await db.query(`
          INSERT INTO games (season_id, week, home_team_id, away_team_id, game_time, season_type, season_year)
          VALUES ($1, $2, $3, $4, $5, 1, 2025)
          ON CONFLICT DO NOTHING
        `, [seasonId, game.week, homeTeam.rows[0].id, awayTeam.rows[0].id, game.game_time]);
        gamesAdded++;
      }
    }
    
    console.log(`✅ Added ${gamesAdded} sample preseason games`);
    
    // Deactivate other seasons
    await db.query('UPDATE seasons SET is_active = false WHERE year != 2025');
    
    res.json({
      success: true,
      preseasonGames: gamesAdded,
      regularSeasonGames: 0,
      totalGames: gamesAdded,
      message: `🎉 2025 Season Ready! Added ${gamesAdded} sample games for testing. Ready for preseason picks!`,
      note: 'Sample games imported. In production, this would fetch real ESPN schedule data when available.'
    });
  } catch (error) {
    console.error('❌ Error setting up 2025 season:', error);
    res.status(500).json({ 
      error: 'Failed to setup 2025 season', 
      details: error.message 
    });
  }
});

// Test ESPN API connection
app.post('/api/test/espn-api', async (req, res) => {
  try {
    console.log('🔧 Testing ESPN API connection...');
    const axios = require('axios');
    
    const testUrl = 'http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?season=2024&seasontype=2&week=1';
    console.log('📡 Testing URL:', testUrl);
    
    const response = await axios.get(testUrl, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'User-Agent': 'BroncosPickemsLeague/1.0'
      }
    });
    
    res.json({
      success: true,
      message: 'ESPN API connection successful',
      data: {
        events_count: response.data.events?.length || 0,
        season: response.data.season?.year || 'unknown',
        week: response.data.week?.number || 'unknown',
        first_game: response.data.events?.[0]?.name || 'no games'
      }
    });
  } catch (error) {
    console.error('❌ Error testing ESPN API:', error);
    res.status(500).json({ 
      error: 'ESPN API test failed', 
      details: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

// Import 2025 preseason games
app.post('/api/admin/import/preseason', async (req, res) => {
  try {
    console.log('🏈 Starting preseason import...');
    const result = await nfl2025Api.importPreseasonGames();
    
    res.json({
      success: true,
      gamesImported: result,
      message: `Successfully imported ${result} preseason games`
    });
  } catch (error) {
    console.error('❌ Error importing preseason games:', error);
    console.error('❌ Full error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to import preseason games', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Import 2025 regular season games
app.post('/api/admin/import/regular-season', async (req, res) => {
  try {
    console.log('🏈 Starting regular season import...');
    const result = await nfl2025Api.importRegularSeasonGames();
    
    res.json({
      success: true,
      gamesImported: result,
      message: `Successfully imported ${result} regular season games`
    });
  } catch (error) {
    console.error('❌ Error importing regular season games:', error);
    res.status(500).json({ 
      error: 'Failed to import regular season games', 
      details: error.message 
    });
  }
});

// Import all 2025 season data (preseason + regular season)
app.post('/api/admin/import/all-2025', async (req, res) => {
  try {
    console.log('🚀 Starting complete 2025 season import...');
    const result = await nfl2025Api.importAll2025SeasonData();
    
    res.json({
      success: true,
      preseasonGames: result.preseasonGames,
      regularSeasonGames: result.regularSeasonGames,
      totalGames: result.totalGames,
      message: `Successfully imported complete 2025 season: ${result.totalGames} total games`
    });
  } catch (error) {
    console.error('❌ Error importing 2025 season data:', error);
    res.status(500).json({ 
      error: 'Failed to import 2025 season data', 
      details: error.message 
    });
  }
});

// Update live game scores
app.post('/api/admin/update/live-scores', async (req, res) => {
  try {
    console.log('📊 Updating live scores...');
    const result = await nfl2025Api.updateLiveGames();
    
    res.json({
      success: true,
      gamesUpdated: result,
      message: `Successfully updated ${result} live games`
    });
  } catch (error) {
    console.error('❌ Error updating live scores:', error);
    res.status(500).json({ 
      error: 'Failed to update live scores', 
      details: error.message 
    });
  }
});

// Get season calendar
app.get('/api/season/calendar', async (req, res) => {
  try {
    const calendar = await nfl2025Api.fetchSeasonCalendar();
    res.json(calendar);
  } catch (error) {
    console.error('❌ Error fetching season calendar:', error);
    res.status(500).json({ 
      error: 'Failed to fetch season calendar', 
      details: error.message 
    });
  }
});

// Get games with season type filtering
app.get('/api/games/season/:seasonType/week/:week', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    const seasonType = parseInt(req.params.seasonType);
    const week = parseInt(req.params.week);
    
    const result = await db.query(`
      SELECT 
        g.id,
        g.week,
        g.season_type,
        g.game_time,
        g.home_score,
        g.away_score,
        g.is_final,
        g.picks_locked,
        g.spread,
        g.over_under,
        g.tv_channel,
        g.home_team_id,
        g.away_team_id,
        ht.name as home_team_name,
        ht.abbreviation as home_team_abbr,
        ht.primary_color as home_team_color,
        at.name as away_team_name,
        at.abbreviation as away_team_abbr,
        at.primary_color as away_team_color,
        g.home_team_record,
        g.away_team_record,
        p.picked_team_id,
        p.confidence_points,
        p.is_correct,
        p.points_earned
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      LEFT JOIN picks p ON g.id = p.game_id AND p.user_id = $1
      WHERE g.season_id = (SELECT id FROM seasons WHERE is_active = TRUE LIMIT 1)
        AND g.week = $2
        AND g.season_type = $3
      ORDER BY g.game_time ASC
    `, [userId, week, seasonType]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching season games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server and initialize automatic updates
const server = app.listen(PORT, async () => {
  console.log(`🏈 Minimal Broncos Server running on port ${PORT}`);
  console.log('✅ Server started successfully!');
  
  // Initialize cache service
  try {
    await cacheService.initialize();
    console.log('✅ Cache service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize cache service:', error.message);
  }
  
  // Initialize job queue service
  try {
    await jobQueueService.initialize();
    console.log('✅ Job queue service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize job queue service:', error.message);
  }
  
  // Initialize automatic updates service
  try {
    automaticUpdates.init();
  } catch (error) {
    console.error('❌ Failed to initialize automatic updates:', error.message);
  }
  
  // Start odds scheduler
  try {
    oddsScheduler.start();
  } catch (error) {
    console.error('❌ Failed to start odds scheduler:', error.message);
  }
  
  // Start leaderboard scheduler
  try {
    leaderboardScheduler.start();
  } catch (error) {
    console.error('❌ Failed to start leaderboard scheduler:', error.message);
  }
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  // Stop accepting new requests
  server.close(() => {
    console.log('✅ HTTP server closed');
  });
  
  // Shutdown services
  try {
    await jobQueueService.shutdown();
    await cacheService.shutdown();
    await db.shutdown();
    console.log('✅ All services shut down successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
});

// restart trigger
