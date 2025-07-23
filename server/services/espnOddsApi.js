/**
 * ESPN Odds API Integration Service
 * Fetches betting odds and broadcast information from ESPN Core API
 */

const axios = require('axios');

class ESPNOddsAPI {
  constructor() {
    this.baseURL = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';
  }

  /**
   * Fetch odds for a specific event/game
   * @param {string} eventId - ESPN event ID
   * @returns {Object} Odds data including spreads, totals, and moneylines
   */
  async getEventOdds(eventId) {
    try {
      const url = `${this.baseURL}/events/${eventId}/competitions/${eventId}/odds`;
      console.log(`🎲 Fetching odds from: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'NFLPickemsApp/1.0'
        }
      });

      if (!response.data || !response.data.items) {
        console.warn(`No odds data found for event ${eventId}`);
        return null;
      }

      // Parse odds data
      const odds = this.parseOddsData(response.data);
      return odds;

    } catch (error) {
      console.error(`Error fetching odds for event ${eventId}:`, error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}, Data:`, error.response.data);
      }
      return null;
    }
  }

  /**
   * Parse ESPN odds response into standardized format
   * @param {Object} oddsData - Raw ESPN odds response
   * @returns {Object} Parsed odds data
   */
  parseOddsData(oddsData) {
    try {
      const items = oddsData.items || [];
      
      // Find the primary sportsbook odds (usually first available)
      const primaryOdds = items[0];
      
      if (!primaryOdds) {
        console.warn('No odds items found in response');
        return null;
      }

      console.log('🎲 Raw ESPN odds data:', JSON.stringify(primaryOdds, null, 2));

      const result = {
        provider: primaryOdds.provider?.name || 'Unknown',
        spread: null,
        total: null,
        overOdds: null,
        underOdds: null,
        details: null,
        lastUpdated: new Date().toISOString()
      };

      // Parse the main fields that ESPN provides directly
      if (primaryOdds.spread !== undefined) {
        result.spread = parseFloat(primaryOdds.spread);
      }

      if (primaryOdds.overUnder !== undefined) {
        result.total = parseFloat(primaryOdds.overUnder);
      }

      if (primaryOdds.overOdds !== undefined) {
        result.overOdds = parseFloat(primaryOdds.overOdds);
      }

      if (primaryOdds.underOdds !== undefined) {
        result.underOdds = parseFloat(primaryOdds.underOdds);
      }

      if (primaryOdds.details) {
        result.details = primaryOdds.details;
      }

      console.log('✅ Parsed odds result:', result);
      return result;

    } catch (error) {
      console.error('Error parsing odds data:', error);
      return null;
    }
  }

  /**
   * Fetch broadcast information for an event (if available)
   * Note: ESPN doesn't always provide broadcast info in odds endpoint
   * @param {string} eventId - ESPN event ID
   * @returns {Object} Broadcast information
   */
  async getBroadcastInfo(eventId) {
    try {
      // Try to get broadcast info from main event endpoint
      const url = `${this.baseURL}/events/${eventId}`;
      console.log(`Fetching broadcast info from: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'NFLPickemsApp/1.0'
        }
      });

      const event = response.data;
      
      // Look for broadcast information in competitions
      if (event.competitions && event.competitions.length > 0) {
        const competition = event.competitions[0];
        
        // Check for broadcast info
        if (competition.broadcasts && competition.broadcasts.length > 0) {
          const broadcast = competition.broadcasts[0];
          return {
            network: broadcast.market || broadcast.names?.[0] || 'TBD',
            type: broadcast.type?.shortName || 'TV'
          };
        }
      }

      return { network: 'TBD', type: 'TV' };

    } catch (error) {
      console.error(`Error fetching broadcast info for event ${eventId}:`, error.message);
      return { network: 'TBD', type: 'TV' };
    }
  }

  /**
   * Update game odds in database
   * @param {Object} db - Database connection
   * @param {string} gameId - Internal game ID
   * @param {string} espnEventId - ESPN event ID
   */
  async updateGameOdds(db, gameId, espnEventId) {
    try {
      console.log(`Updating odds for game ${gameId} (ESPN Event ID: ${espnEventId})`);
      
      // Fetch odds and broadcast info
      const [odds, broadcast] = await Promise.all([
        this.getEventOdds(espnEventId),
        this.getBroadcastInfo(espnEventId)
      ]);

      if (odds) {
        await db.query(`
          UPDATE games 
          SET 
            spread = $1,
            over_under = $2,
            over_odds = $3,
            under_odds = $4,
            tv_channel = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $6
        `, [
          odds.spread,
          odds.total,
          odds.overOdds,
          odds.underOdds,
          broadcast.network,
          gameId
        ]);

        console.log(`✅ Updated game ${gameId}: Spread=${odds.spread}, O/U=${odds.total}, TV=${broadcast.network}`);
        return true;
      } else {
        console.warn(`⚠️ No odds data available for game ${gameId}`);
        return false;
      }

    } catch (error) {
      console.error(`Error updating game ${gameId} odds:`, error);
      return false;
    }
  }

  /**
   * Batch update odds for multiple games
   * @param {Object} db - Database connection
   * @param {Array} games - Array of {id, espn_event_id} objects
   */
  async batchUpdateOdds(db, games) {
    console.log(`🎲 Starting batch odds update for ${games.length} games...`);
    
    let updated = 0;
    let failed = 0;
    
    for (const game of games) {
      if (!game.espn_event_id) {
        console.warn(`Skipping game ${game.id} - no ESPN Event ID`);
        failed++;
        continue;
      }

      const success = await this.updateGameOdds(db, game.id, game.espn_event_id);
      if (success) {
        updated++;
      } else {
        failed++;
      }

      // Rate limiting - wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`📊 Batch odds update complete: ${updated} updated, ${failed} failed`);
    return { updated, failed };
  }
}

module.exports = new ESPNOddsAPI();