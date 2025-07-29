const axios = require('axios');
const db = require('../models/database');

class NFL2025ApiService {
  constructor() {
    this.baseUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
    this.currentSeason = 2025; // Using real 2025 season data
    
    // Season type mappings based on ESPN API
    this.seasonTypes = {
      PRESEASON: 1,
      REGULAR: 2,
      POSTSEASON: 3,
      OFF_SEASON: 4
    };
    
    // ESPN team ID to our database team ID mapping (based on actual DB team order)
    this.teamIdMapping = {
      // AFC East
      1: 4,   // Buffalo Bills -> Buffalo Bills (id 4)
      15: 20, // Miami Dolphins -> Miami Dolphins (id 20)
      17: 22, // New England Patriots -> New England Patriots (id 22)
      20: 25, // New York Jets -> New York Jets (id 25)
      
      // AFC North
      2: 3,   // Baltimore Ravens -> Baltimore Ravens (id 3)
      4: 7,   // Cincinnati Bengals -> Cincinnati Bengals (id 7)
      5: 8,   // Cleveland Browns -> Cleveland Browns (id 8)
      23: 27, // Pittsburgh Steelers -> Pittsburgh Steelers (id 27)
      
      // AFC South
      34: 13, // Houston Texans -> Houston Texans (id 13)
      11: 14, // Indianapolis Colts -> Indianapolis Colts (id 14)
      30: 15, // Jacksonville Jaguars -> Jacksonville Jaguars (id 15)
      10: 31, // Tennessee Titans -> Tennessee Titans (id 31)
      
      // AFC West
      7: 10,  // Denver Broncos -> Denver Broncos (id 10)
      12: 16, // Kansas City Chiefs -> Kansas City Chiefs (id 16)
      13: 17, // Las Vegas Raiders -> Las Vegas Raiders (id 17)
      24: 18, // Los Angeles Chargers -> Los Angeles Chargers (id 18)
      
      // NFC East
      6: 9,   // Dallas Cowboys -> Dallas Cowboys (id 9)
      19: 24, // New York Giants -> New York Giants (id 24)
      21: 26, // Philadelphia Eagles -> Philadelphia Eagles (id 26)
      28: 32, // Washington Commanders -> Washington Commanders (id 32)
      
      // NFC North
      3: 6,   // Chicago Bears -> Chicago Bears (id 6)
      8: 11,  // Detroit Lions -> Detroit Lions (id 11)
      9: 12,  // Green Bay Packers -> Green Bay Packers (id 12)
      16: 21, // Minnesota Vikings -> Minnesota Vikings (id 21)
      
      // NFC South
      1: 2,   // Atlanta Falcons -> Atlanta Falcons (id 2)
      29: 5,  // Carolina Panthers -> Carolina Panthers (id 5)
      18: 23, // New Orleans Saints -> New Orleans Saints (id 23)
      27: 30, // Tampa Bay Buccaneers -> Tampa Bay Buccaneers (id 30)
      
      // NFC West
      22: 1,  // Arizona Cardinals -> Arizona Cardinals (id 1)
      25: 19, // Los Angeles Rams -> Los Angeles Rams (id 19)
      26: 28, // San Francisco 49ers -> San Francisco 49ers (id 28)
      14: 29  // Seattle Seahawks -> Seattle Seahawks (id 29)
    };
  }

  /**
   * Fetch 2025 NFL season calendar structure
   */
  async fetchSeasonCalendar() {
    try {
      console.log('🗓️ Fetching 2025 NFL season calendar...');
      const url = `${this.baseUrl}/scoreboard?season=${this.currentSeason}`;
      const response = await axios.get(url);
      
      if (response.data && response.data.leagues && response.data.leagues[0]) {
        const calendar = response.data.leagues[0].calendar;
        console.log(`✅ Retrieved calendar with ${calendar.length} season phases`);
        return calendar;
      }
      
      throw new Error('Invalid calendar response format');
    } catch (error) {
      console.error('❌ Error fetching season calendar:', error.message);
      throw error;
    }
  }

  /**
   * Fetch games for a specific week and season type
   */
  async fetchWeekGames(week, seasonType = this.seasonTypes.REGULAR) {
    try {
      console.log(`🏈 Fetching games for season type ${seasonType}, week ${week}...`);
      
      const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=${seasonType}&week=${week}&dates=${this.currentSeason}`;
      const response = await axios.get(url);
      
      if (response.data && response.data.events) {
        const games = response.data.events;
        console.log(`✅ Retrieved ${games.length} games for week ${week}`);
        return games;
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Error fetching week ${week} games:`, error.message);
      throw error;
    }
  }

  /**
   * Import preseason games into database
   */
  async importPreseasonGames() {
    try {
      console.log('🏈 Starting preseason games import...');
      let totalImported = 0;

      // Import Hall of Fame Weekend (week 1 in ESPN API)
      const hofGames = await this.fetchWeekGames(1, this.seasonTypes.PRESEASON);
      totalImported += await this.saveGamesToDatabase(hofGames, -4, this.seasonTypes.PRESEASON);

      // Import Preseason Weeks 1-3 (weeks 2-4 in ESPN API)
      for (let espnWeek = 2; espnWeek <= 4; espnWeek++) {
        const ourWeek = espnWeek - 5; // Convert to our negative week system (-3, -2, -1)
        const games = await this.fetchWeekGames(espnWeek, this.seasonTypes.PRESEASON);
        totalImported += await this.saveGamesToDatabase(games, ourWeek, this.seasonTypes.PRESEASON);
      }

      console.log(`✅ Preseason import complete: ${totalImported} games imported`);
      return totalImported;
    } catch (error) {
      console.error('❌ Error importing preseason games:', error.message);
      throw error;
    }
  }

  /**
   * Import regular season games into database
   */
  async importRegularSeasonGames() {
    try {
      console.log('🏈 Starting regular season games import...');
      let totalImported = 0;

      // Import all 18 weeks of regular season
      for (let week = 1; week <= 18; week++) {
        const games = await this.fetchWeekGames(week, this.seasonTypes.REGULAR);
        totalImported += await this.saveGamesToDatabase(games, week, this.seasonTypes.REGULAR);
      }

      console.log(`✅ Regular season import complete: ${totalImported} games imported`);
      return totalImported;
    } catch (error) {
      console.error('❌ Error importing regular season games:', error.message);
      throw error;
    }
  }

  /**
   * Save games to database
   */
  async saveGamesToDatabase(games, week, seasonType) {
    try {
      let savedCount = 0;
      const season = await this.getCurrentSeason();

      for (const game of games) {
        try {
          const gameData = this.extractGameData(game, week, seasonType, season.id);
          
          // Check if game already exists by ESPN ID
          const existingGame = await db.query(
            'SELECT id FROM games WHERE espn_game_id = $1',
            [gameData.espnGameId]
          );

          if (existingGame.rows.length === 0) {
            // Insert new game
            await db.query(`
              INSERT INTO games (
                season_id, week, season_type, season_year, espn_game_id,
                home_team_id, away_team_id, game_time, 
                home_score, away_score, is_final,
                spread, over_under
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
              gameData.seasonId, gameData.week, gameData.seasonType, gameData.seasonYear,
              gameData.espnGameId, gameData.homeTeamId, gameData.awayTeamId,
              gameData.gameTime, gameData.homeScore, gameData.awayScore,
              gameData.isFinal, gameData.spread, gameData.overUnder
            ]);
            
            savedCount++;
            console.log(`✅ Saved game: ${gameData.awayTeam} @ ${gameData.homeTeam}`);
          } else {
            // Update existing game
            await db.query(`
              UPDATE games SET 
                home_score = $1, away_score = $2, is_final = $3,
                spread = $4, over_under = $5, game_time = $6
              WHERE espn_game_id = $7
            `, [
              gameData.homeScore, gameData.awayScore, gameData.isFinal,
              gameData.spread, gameData.overUnder, gameData.gameTime,
              gameData.espnGameId
            ]);
            
            console.log(`🔄 Updated game: ${gameData.awayTeam} @ ${gameData.homeTeam}`);
          }
        } catch (gameError) {
          console.error(`❌ Error saving individual game:`, gameError.message);
          console.error('Game data:', game);
        }
      }

      return savedCount;
    } catch (error) {
      console.error('❌ Error saving games to database:', error.message);
      throw error;
    }
  }

  /**
   * Extract and format game data from ESPN API response
   */
  extractGameData(espnGame, week, seasonType, seasonId) {
    try {
      const competition = espnGame.competitions[0];
      const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
      const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
      
      // Map ESPN team IDs to our database IDs
      const homeTeamId = this.teamIdMapping[parseInt(homeTeam.team.id)];
      const awayTeamId = this.teamIdMapping[parseInt(awayTeam.team.id)];
      
      if (!homeTeamId || !awayTeamId) {
        throw new Error(`Team mapping not found for ESPN IDs: ${homeTeam.team.id}, ${awayTeam.team.id}`);
      }

      // Extract scores
      const homeScore = competition.status.type.completed ? parseInt(homeTeam.score) : null;
      const awayScore = competition.status.type.completed ? parseInt(awayTeam.score) : null;
      const isFinal = competition.status.type.completed;

      // Extract betting data
      let spread = null;
      let overUnder = null;
      
      if (competition.odds && competition.odds.length > 0) {
        const odds = competition.odds[0];
        spread = odds.spread || null;
        overUnder = odds.overUnder || null;
      }

      return {
        seasonId,
        week,
        seasonType,
        seasonYear: this.currentSeason,
        espnGameId: espnGame.id,
        homeTeamId,
        awayTeamId,
        homeTeam: homeTeam.team.abbreviation,
        awayTeam: awayTeam.team.abbreviation,
        gameTime: new Date(espnGame.date),
        homeScore,
        awayScore,
        isFinal,
        spread,
        overUnder
      };
    } catch (error) {
      console.error('❌ Error extracting game data:', error.message);
      console.error('ESPN game:', espnGame);
      throw error;
    }
  }

  /**
   * Ensure database schema supports 2025 season data
   */
  async ensureSchemaReady() {
    try {
      console.log('🔧 Ensuring database schema is ready for 2025 season...');
      
      // First, ensure seasons table has proper structure
      await db.query(`
        ALTER TABLE seasons 
        ADD COLUMN IF NOT EXISTS start_date DATE,
        ADD COLUMN IF NOT EXISTS end_date DATE,
        ADD COLUMN IF NOT EXISTS description TEXT
      `);
      
      // Add columns to games table if they don't exist
      await db.query(`
        ALTER TABLE games 
        ADD COLUMN IF NOT EXISTS season_type INTEGER DEFAULT 2,
        ADD COLUMN IF NOT EXISTS season_year INTEGER DEFAULT 2025,
        ADD COLUMN IF NOT EXISTS espn_game_id VARCHAR(50)
      `);
      
      // Skip unique constraint for now to avoid conflicts
      console.log('⚠️  Skipping unique constraint creation (may already exist)');
      
      // Ensure 2025 season exists
      await db.query(`
        INSERT INTO seasons (year, is_active, start_date, end_date, description) 
        VALUES (2025, true, '2025-07-31', '2026-02-12', '2025-2026 NFL Season including preseason and postseason')
        ON CONFLICT (year) DO UPDATE SET
          is_active = EXCLUDED.is_active,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          description = EXCLUDED.description
      `);
      
      // Deactivate other seasons
      await db.query('UPDATE seasons SET is_active = false WHERE year != 2025');
      
      console.log('✅ Database schema ready for 2025 season');
    } catch (error) {
      console.error('❌ Error preparing database schema:', error.message);
      throw error;
    }
  }

  /**
   * Get current active season from database
   */
  async getCurrentSeason() {
    try {
      const result = await db.query('SELECT * FROM seasons WHERE is_active = true LIMIT 1');
      if (result.rows.length === 0) {
        throw new Error('No active season found in database');
      }
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting current season:', error.message);
      throw error;
    }
  }

  /**
   * One-click import: Automatically set up database and import all 2025 season data
   */
  async setupAndImportAll2025Season() {
    try {
      console.log('🚀 Starting automatic 2025 season setup and import...');
      
      // Step 1: Ensure database schema is ready
      await this.ensureSchemaReady();
      
      // Step 2: Import all season data
      const preseasonCount = await this.importPreseasonGames();
      const regularSeasonCount = await this.importRegularSeasonGames();
      
      const totalGames = preseasonCount + regularSeasonCount;
      console.log(`✅ Complete 2025 season setup finished: ${totalGames} total games`);
      
      return {
        preseasonGames: preseasonCount,
        regularSeasonGames: regularSeasonCount,
        totalGames,
        message: 'Database schema updated and all 2025 season games imported successfully!'
      };
    } catch (error) {
      console.error('❌ Error setting up 2025 season:', error.message);
      throw error;
    }
  }

  /**
   * Import all 2025 season data (preseason + regular season)
   */
  async importAll2025SeasonData() {
    try {
      console.log('🚀 Starting complete 2025 season import...');
      
      // Ensure schema is ready first
      await this.ensureSchemaReady();
      
      const preseasonCount = await this.importPreseasonGames();
      const regularSeasonCount = await this.importRegularSeasonGames();
      
      const totalGames = preseasonCount + regularSeasonCount;
      console.log(`✅ Complete 2025 season import finished: ${totalGames} total games`);
      
      return {
        preseasonGames: preseasonCount,
        regularSeasonGames: regularSeasonCount,
        totalGames
      };
    } catch (error) {
      console.error('❌ Error importing 2025 season data:', error.message);
      throw error;
    }
  }

  /**
   * Update live game scores and status
   */
  async updateLiveGames() {
    try {
      console.log('📊 Updating live game scores...');
      
      // Get current week and season type (this would need enhancement to detect current period)
      const currentWeek = 1; // This should be dynamically determined
      const currentSeasonType = this.seasonTypes.PRESEASON; // This should be dynamically determined
      
      const games = await this.fetchWeekGames(currentWeek, currentSeasonType);
      let updatedCount = 0;
      
      for (const game of games) {
        const competition = game.competitions[0];
        const isCompleted = competition.status.type.completed;
        
        if (isCompleted) {
          const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
          const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
          
          const result = await db.query(`
            UPDATE games SET 
              home_score = $1, 
              away_score = $2, 
              is_final = true
            WHERE espn_game_id = $3 AND is_final = false
          `, [
            parseInt(homeTeam.score),
            parseInt(awayTeam.score),
            game.id
          ]);
          
          if (result.rowCount > 0) {
            updatedCount++;
            console.log(`✅ Updated completed game: ${game.shortName}`);
          }
        }
      }
      
      console.log(`📊 Live scores update complete: ${updatedCount} games updated`);
      return updatedCount;
    } catch (error) {
      console.error('❌ Error updating live games:', error.message);
      throw error;
    }
  }
}

module.exports = new NFL2025ApiService();