/**
 * ESPN Events API Service
 * Fetches all NFL games for the 2025-2026 season to get ESPN event IDs
 */

const axios = require('axios');

class ESPNEventsAPI {
  constructor() {
    this.baseURL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
  }

  /**
   * Fetch all NFL games for the 2025-2026 season (from July 1, 2025 onwards)
   * @returns {Array} Array of game events with ESPN IDs
   */
  async fetchSeasonEvents() {
    try {
      console.log('🏈 Fetching 2025-2026 NFL season events from ESPN (July 1+ only)...');
      
      const response = await axios.get(this.baseURL, {
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

      // Filter events to only include games from July 1, 2025 onwards
      const cutoffDate = new Date('2025-07-01T00:00:00Z');
      const events = response.data.events
        .map(event => this.parseEvent(event))
        .filter(event => {
          if (!event) return false;
          const gameDate = new Date(event.gameTime);
          const isAfterCutoff = gameDate >= cutoffDate;
          
          if (!isAfterCutoff) {
            console.log(`⏭️ Skipping game before July 1, 2025: ${event.awayTeam.name} @ ${event.homeTeam.name} on ${gameDate.toDateString()}`);
          }
          
          return isAfterCutoff;
        });
        
      console.log(`✅ Found ${events.length} NFL events for 2025 season (after July 1 filter)`);
      
      return events;

    } catch (error) {
      console.error('Error fetching ESPN events:', error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}, Data:`, error.response.data);
      }
      return [];
    }
  }

  /**
   * Parse an ESPN event into our standardized format
   * @param {Object} event - Raw ESPN event object
   * @returns {Object} Parsed event data
   */
  parseEvent(event) {
    try {
      const competition = event.competitions?.[0];
      if (!competition || !competition.competitors || competition.competitors.length !== 2) {
        console.warn(`Skipping invalid event: ${event.id}`);
        return null;
      }

      // Find home and away teams
      const homeTeam = competition.competitors.find(team => team.homeAway === 'home');
      const awayTeam = competition.competitors.find(team => team.homeAway === 'away');

      if (!homeTeam || !awayTeam) {
        console.warn(`Skipping event with missing home/away teams: ${event.id}`);
        return null;
      }

      // Determine season type and week
      const seasonType = this.getSeasonType(event.season?.type);
      const week = this.getWeek(event.week?.number, seasonType);

      return {
        espnEventId: event.id,
        espnGameId: competition.id,
        gameTime: new Date(event.date),
        homeTeam: {
          espnId: homeTeam.id,
          name: homeTeam.team.displayName,
          abbreviation: homeTeam.team.abbreviation,
          location: homeTeam.team.location
        },
        awayTeam: {
          espnId: awayTeam.id,
          name: awayTeam.team.displayName,
          abbreviation: awayTeam.team.abbreviation,
          location: awayTeam.team.location
        },
        week: week,
        seasonType: seasonType,
        status: competition.status?.type?.name || 'scheduled',
        venue: competition.venue?.fullName || 'TBD'
      };

    } catch (error) {
      console.error(`Error parsing event ${event.id}:`, error);
      return null;
    }
  }

  /**
   * Convert ESPN season type to our format
   * @param {number} espnSeasonType - ESPN season type
   * @returns {number} Our season type (1=Preseason, 2=Regular, 3=Postseason)
   */
  getSeasonType(espnSeasonType) {
    switch (espnSeasonType) {
      case 1: return 1; // Preseason
      case 2: return 2; // Regular Season
      case 3: return 3; // Postseason
      default: return 2; // Default to regular season
    }
  }

  /**
   * Convert ESPN week number to our format
   * @param {number} weekNumber - ESPN week number
   * @param {number} seasonType - Season type
   * @returns {string} Our week format
   */
  getWeek(weekNumber, seasonType) {
    if (seasonType === 1) { // Preseason
      switch (weekNumber) {
        case 0: return 'pre1'; // Hall of Fame
        case 1: return 'pre2';
        case 2: return 'pre3';
        case 3: return 'pre4';
        default: return `pre${weekNumber + 1}`;
      }
    } else {
      return weekNumber?.toString() || '1';
    }
  }

  /**
   * Update our database games with ESPN event IDs
   * @param {Object} db - Database connection
   * @param {Array} events - Array of ESPN events
   */
  async mapEventsToGames(db, events) {
    console.log(`🔗 Mapping ${events.length} ESPN events to database games...`);
    
    let mapped = 0;
    let failed = 0;

    for (const event of events.filter(e => e !== null)) {
      try {
        // Find matching game in our database
        const gameQuery = `
          SELECT id, home_team_name, away_team_name, game_time, week 
          FROM games 
          WHERE week = $1 
          AND season_type = $2
          AND DATE(game_time) = DATE($3)
        `;

        const gameResult = await db.query(gameQuery, [
          event.week,
          event.seasonType,
          event.gameTime
        ]);

        // Try to match by team names and date
        const matchingGame = gameResult.rows.find(game => {
          const homeMatch = this.teamNamesMatch(game.home_team_name, event.homeTeam.name);
          const awayMatch = this.teamNamesMatch(game.away_team_name, event.awayTeam.name);
          return homeMatch && awayMatch;
        });

        if (matchingGame) {
          // Update game with ESPN IDs
          await db.query(`
            UPDATE games 
            SET 
              espn_event_id = $1,
              espn_game_id = $2,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [event.espnEventId, event.espnGameId, matchingGame.id]);

          console.log(`✅ Mapped game ${matchingGame.id}: ${event.awayTeam.abbreviation} @ ${event.homeTeam.abbreviation} (ESPN: ${event.espnEventId})`);
          mapped++;
        } else {
          console.warn(`⚠️ No matching game found for: ${event.awayTeam.name} @ ${event.homeTeam.name} on ${event.gameTime.toDateString()}`);
          failed++;
        }

      } catch (error) {
        console.error(`Error mapping event ${event.espnEventId}:`, error);
        failed++;
      }
    }

    console.log(`📊 Event mapping complete: ${mapped} mapped, ${failed} failed`);
    return { mapped, failed };
  }

  /**
   * Check if team names match (handles different formats)
   * @param {string} dbName - Team name from our database
   * @param {string} espnName - Team name from ESPN
   * @returns {boolean} Whether names match
   */
  teamNamesMatch(dbName, espnName) {
    if (!dbName || !espnName) return false;

    const normalize = (name) => name.toLowerCase().replace(/[^a-z]/g, '');
    return normalize(dbName) === normalize(espnName) ||
           dbName.toLowerCase().includes(espnName.toLowerCase()) ||
           espnName.toLowerCase().includes(dbName.toLowerCase());
  }
}

module.exports = new ESPNEventsAPI();