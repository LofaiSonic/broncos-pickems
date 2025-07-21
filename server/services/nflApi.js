const axios = require('axios');
const db = require('../models/database');

class NFLApiService {
  constructor() {
    this.espnBaseUrl = 'http://site.api.espn.com/apis/site/v2/sports/football/nfl';
  }

  async fetchWeeklyGames(week = null, season = 2024) {
    try {
      const url = week 
        ? `${this.espnBaseUrl}/scoreboard?dates=${season}&seasontype=2&week=${week}`
        : `${this.espnBaseUrl}/scoreboard`;
      
      const response = await axios.get(url);
      const games = response.data.events;

      return games.map(game => ({
        espnId: game.id,
        week: game.week.number,
        season: season,
        homeTeam: {
          name: game.competitions[0].competitors[0].team.displayName,
          abbreviation: game.competitions[0].competitors[0].team.abbreviation,
          logo: game.competitions[0].competitors[0].team.logo,
          score: game.competitions[0].competitors[0].score
        },
        awayTeam: {
          name: game.competitions[0].competitors[1].team.displayName,
          abbreviation: game.competitions[0].competitors[1].team.abbreviation,
          logo: game.competitions[0].competitors[1].team.logo,
          score: game.competitions[0].competitors[1].score
        },
        gameTime: new Date(game.date),
        status: game.status.type.name,
        isCompleted: game.status.type.completed,
        odds: game.competitions[0].odds?.[0] || null
      }));
    } catch (error) {
      console.error('Error fetching NFL games:', error);
      throw error;
    }
  }

  async updateGamesInDatabase(games) {
    try {
      for (const game of games) {
        // Get team IDs
        const homeTeamResult = await db.query(
          'SELECT id FROM teams WHERE abbreviation = $1',
          [game.homeTeam.abbreviation]
        );
        const awayTeamResult = await db.query(
          'SELECT id FROM teams WHERE abbreviation = $1',
          [game.awayTeam.abbreviation]
        );

        if (!homeTeamResult.rows[0] || !awayTeamResult.rows[0]) {
          console.warn(`Teams not found for game: ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
          continue;
        }

        const homeTeamId = homeTeamResult.rows[0].id;
        const awayTeamId = awayTeamResult.rows[0].id;

        // Get current season ID
        const seasonResult = await db.query(
          'SELECT id FROM seasons WHERE year = $1 AND is_active = TRUE',
          [game.season]
        );

        if (!seasonResult.rows[0]) {
          console.warn(`Active season not found for year: ${game.season}`);
          continue;
        }

        const seasonId = seasonResult.rows[0].id;

        // Check if game exists
        const existingGame = await db.query(
          'SELECT id FROM games WHERE espn_game_id = $1',
          [game.espnId]
        );

        if (existingGame.rows[0]) {
          // Update existing game
          await db.query(`
            UPDATE games 
            SET home_score = $1, away_score = $2, is_final = $3, updated_at = CURRENT_TIMESTAMP
            WHERE espn_game_id = $4
          `, [
            game.homeTeam.score || null,
            game.awayTeam.score || null,
            game.isCompleted,
            game.espnId
          ]);
        } else {
          // Insert new game
          await db.query(`
            INSERT INTO games (season_id, week, home_team_id, away_team_id, game_time, 
                             home_score, away_score, is_final, espn_game_id, spread, over_under)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            seasonId,
            game.week,
            homeTeamId,
            awayTeamId,
            game.gameTime,
            game.homeTeam.score || null,
            game.awayTeam.score || null,
            game.isCompleted,
            game.espnId,
            game.odds?.details || null,
            game.odds?.overUnder || null
          ]);
        }
      }

      console.log(`Updated ${games.length} games in database`);
    } catch (error) {
      console.error('Error updating games in database:', error);
      throw error;
    }
  }

  async getCurrentWeek() {
    try {
      const response = await axios.get(`${this.espnBaseUrl}/scoreboard`);
      return response.data.week?.number || 1;
    } catch (error) {
      console.error('Error fetching current week:', error);
      return 1;
    }
  }

  async lockPicksForCompletedGames() {
    try {
      const now = new Date();
      await db.query(`
        UPDATE games 
        SET picks_locked = TRUE 
        WHERE game_time <= $1 AND picks_locked = FALSE
      `, [now]);
    } catch (error) {
      console.error('Error locking picks:', error);
    }
  }
}

module.exports = new NFLApiService();