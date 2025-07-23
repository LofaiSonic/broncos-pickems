/**
 * Script to fetch ALL 2025 NFL season event IDs from ESPN and map them to our games
 */

const axios = require('axios');
const db = require('../models/database');
require('dotenv').config();

async function fetchAllEspnEvents() {
  try {
    console.log('🏈 Fetching ALL 2025 NFL season events from ESPN...');
    
    const response = await axios.get('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard', {
      params: {
        limit: 1000,
        dates: '2025'
      },
      timeout: 30000,
      headers: {
        'User-Agent': 'NFLPickemsApp/1.0'
      }
    });

    if (!response.data || !response.data.events) {
      console.warn('No events found in ESPN response');
      return [];
    }

    console.log(`📋 Found ${response.data.events.length} ESPN events for 2025`);

    // Filter to only events from July 1, 2025 onwards (actual 2025 season)
    const cutoffDate = new Date('2025-07-01T00:00:00Z');
    const events = response.data.events.filter(event => {
      const gameDate = new Date(event.date);
      return gameDate >= cutoffDate;
    });

    console.log(`✅ Filtered to ${events.length} events from July 2025 onwards`);

    return events.map(event => ({
      espnEventId: event.id,
      espnGameId: event.competitions[0]?.id || event.id,
      gameTime: new Date(event.date),
      homeTeam: {
        espnId: event.competitions[0]?.competitors.find(c => c.homeAway === 'home')?.team?.id,
        name: event.competitions[0]?.competitors.find(c => c.homeAway === 'home')?.team?.displayName,
        abbreviation: event.competitions[0]?.competitors.find(c => c.homeAway === 'home')?.team?.abbreviation
      },
      awayTeam: {
        espnId: event.competitions[0]?.competitors.find(c => c.homeAway === 'away')?.team?.id,
        name: event.competitions[0]?.competitors.find(c => c.homeAway === 'away')?.team?.displayName,
        abbreviation: event.competitions[0]?.competitors.find(c => c.homeAway === 'away')?.team?.abbreviation
      },
      week: event.week?.number,
      seasonType: event.season?.type,
      venue: event.competitions[0]?.venue?.fullName || 'TBD'
    }));

  } catch (error) {
    console.error('Error fetching ESPN events:', error.message);
    return [];
  }
}

async function mapEventsToDatabase(espnEvents) {
  console.log(`🔗 Mapping ${espnEvents.length} ESPN events to database games...`);

  let mapped = 0;
  let failed = 0;

  for (const event of espnEvents) {
    try {
      // Find matching game in our database by date and teams
      const gameQuery = `
        SELECT g.id, g.week, g.season_type, g.game_time,
               ht.name as home_team_name, ht.abbreviation as home_team_abbr,
               at.name as away_team_name, at.abbreviation as away_team_abbr
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        WHERE DATE(g.game_time) = DATE($1)
      `;

      const gameResult = await db.query(gameQuery, [event.gameTime]);

      // Find best match by team names/abbreviations
      const matchingGame = gameResult.rows.find(game => {
        const homeMatch = 
          game.home_team_name.toLowerCase().includes(event.homeTeam.name?.toLowerCase() || '') ||
          event.homeTeam.name?.toLowerCase().includes(game.home_team_name.toLowerCase()) ||
          game.home_team_abbr.toLowerCase() === event.homeTeam.abbreviation?.toLowerCase();
        
        const awayMatch = 
          game.away_team_name.toLowerCase().includes(event.awayTeam.name?.toLowerCase() || '') ||
          event.awayTeam.name?.toLowerCase().includes(game.away_team_name.toLowerCase()) ||
          game.away_team_abbr.toLowerCase() === event.awayTeam.abbreviation?.toLowerCase();

        return homeMatch && awayMatch;
      });

      if (matchingGame) {
        await db.query(`
          UPDATE games 
          SET 
            espn_event_id = $1,
            espn_game_id = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [event.espnEventId, event.espnGameId, matchingGame.id]);

        console.log(`✅ Mapped: ${event.awayTeam.abbreviation} @ ${event.homeTeam.abbreviation} → ESPN Event ID: ${event.espnEventId}`);
        mapped++;
      } else {
        console.warn(`⚠️ No match found for: ${event.awayTeam.name} @ ${event.homeTeam.name} on ${event.gameTime.toDateString()}`);
        failed++;
      }

    } catch (error) {
      console.error(`❌ Error mapping event ${event.espnEventId}:`, error.message);
      failed++;
    }
  }

  console.log(`📊 Mapping complete: ${mapped} mapped, ${failed} failed`);
  return { mapped, failed };
}

async function main() {
  try {
    console.log('🚀 Starting ESPN event mapping process...');
    
    // Ensure ESPN event ID columns exist
    try {
      await db.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS espn_event_id VARCHAR(50)');
      await db.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS espn_game_id VARCHAR(50)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_games_espn_event_id ON games(espn_event_id)');
      console.log('✅ Database columns ensured');
    } catch (error) {
      console.log('⚠️ Column setup:', error.message);
    }

    // Fetch all ESPN events
    const espnEvents = await fetchAllEspnEvents();
    
    if (espnEvents.length === 0) {
      console.log('❌ No ESPN events found');
      return;
    }

    // Map to database
    const result = await mapEventsToDatabase(espnEvents);
    
    console.log(`🎯 Final Results:`);
    console.log(`   📋 ESPN Events Found: ${espnEvents.length}`);
    console.log(`   ✅ Games Mapped: ${result.mapped}`);
    console.log(`   ❌ Mapping Failed: ${result.failed}`);

  } catch (error) {
    console.error('❌ Script failed:', error.message);
  } finally {
    process.exit(0);
  }
}

main();