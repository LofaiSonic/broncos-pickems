const cron = require('node-cron');
const axios = require('axios');
const db = require('../models/database');
const jobQueueService = require('./jobQueue');
const cacheService = require('./cache');

class AutomaticUpdateService {
  constructor() {
    this.isRunning = false;
    this.jobs = new Map();
    this.updateLog = [];
  }

  // Initialize all scheduled jobs
  init() {
    console.log('🤖 Initializing Automatic Update Service...');
    
    // Schedule injury updates twice daily (8 AM and 6 PM EST)
    this.scheduleJob('injury-updates', '0 8,18 * * *', () => this.updateInjuries());
    
    // Schedule betting odds updates twice daily (9 AM and 7 PM EST)
    this.scheduleJob('odds-updates', '0 9,19 * * *', () => this.updateBettingOdds());
    
    // Schedule team records update once daily (7 AM EST)
    this.scheduleJob('records-updates', '0 7 * * *', () => this.updateTeamRecords());
    
    // Schedule weather updates twice daily for upcoming games (10 AM and 8 PM EST)
    this.scheduleJob('weather-updates', '0 10,20 * * *', () => this.updateWeatherData());
    
    // Schedule game status updates every 30 minutes during game days
    this.scheduleJob('game-status', '*/30 * * * *', () => this.updateGameStatus());
    
    this.isRunning = true;
    console.log('✅ Automatic Update Service initialized with', this.jobs.size, 'scheduled jobs');
  }

  // Generic job scheduler
  scheduleJob(jobName, cronPattern, jobFunction) {
    const job = cron.schedule(cronPattern, async () => {
      try {
        console.log(`🔄 Running scheduled job: ${jobName}`);
        await jobFunction();
        await this.logUpdate(jobName, 'SUCCESS', null);
      } catch (error) {
        console.error(`❌ Job ${jobName} failed:`, error.message);
        await this.logUpdate(jobName, 'ERROR', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'America/New_York' // EST timezone
    });

    this.jobs.set(jobName, job);
    console.log(`📅 Scheduled job: ${jobName} - ${cronPattern}`);
  }

  // Update injury reports from ESPN API
  async updateInjuries() {
    console.log('🏥 Updating detailed injury reports using ESPN Core API...');
    
    try {
      // Database Team ID to ESPN Team ID mapping
      const teamIdMapping = {
        1: 22,  // Arizona Cardinals
        2: 1,   // Atlanta Falcons
        3: 2,   // Baltimore Ravens
        4: 1,   // Buffalo Bills 
        5: 29,  // Carolina Panthers
        6: 3,   // Chicago Bears
        7: 4,   // Cincinnati Bengals
        8: 5,   // Cleveland Browns
        9: 6,   // Dallas Cowboys
        10: 7,  // Denver Broncos
        11: 8,  // Detroit Lions
        12: 9,  // Green Bay Packers
        13: 34, // Houston Texans
        14: 11, // Indianapolis Colts
        15: 30, // Jacksonville Jaguars
        16: 12, // Kansas City Chiefs
        17: 13, // Las Vegas Raiders
        18: 24, // Los Angeles Chargers
        19: 25, // Los Angeles Rams
        20: 15, // Miami Dolphins
        21: 16, // Minnesota Vikings
        22: 17, // New England Patriots
        23: 18, // New Orleans Saints
        24: 19, // New York Giants
        25: 20, // New York Jets
        26: 21, // Philadelphia Eagles
        27: 23, // Pittsburgh Steelers
        28: 26, // San Francisco 49ers
        29: 14, // Seattle Seahawks
        30: 27, // Tampa Bay Buccaneers
        31: 10, // Tennessee Titans
        32: 28  // Washington Commanders
      };
      
      let totalUpdates = 0;
      
      for (const [dbTeamId, espnTeamId] of Object.entries(teamIdMapping)) {
        try {
          console.log(`Fetching injuries for team ${dbTeamId} (ESPN ID: ${espnTeamId})...`);
          
          // Use ESPN Core API for detailed injury data
          const response = await axios.get(`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/${espnTeamId}/injuries`);
          const injuryRefs = response.data?.items || [];
          
          // Clear existing injuries for this team  
          await db.query('DELETE FROM detailed_injuries WHERE team_id = $1', [dbTeamId]);
          
          // Process injury references (limit to 15 for performance)
          const limitedRefs = injuryRefs.slice(0, 15);
          
          for (const injuryRef of limitedRefs) {
            try {
              // Fetch detailed injury data
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
              
              // Insert detailed injury data
              await db.query(`
                INSERT INTO detailed_injuries (
                  injury_id, player_id, team_id, player_name, position, status,
                  short_comment, long_comment, injury_type, injury_location,
                  injury_detail, side, return_date, fantasy_status, injury_date, type_abbreviation
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                ON CONFLICT (injury_id) DO UPDATE SET
                  status = EXCLUDED.status,
                  short_comment = EXCLUDED.short_comment,
                  long_comment = EXCLUDED.long_comment,
                  return_date = EXCLUDED.return_date,
                  fantasy_status = EXCLUDED.fantasy_status,
                  updated_at = CURRENT_TIMESTAMP
              `, [
                injuryData.id,
                injuryData.athlete?.$ref?.split('/').slice(-1)[0] || null,
                dbTeamId,
                playerName,
                position,
                injuryData.status || 'Unknown',
                injuryData.shortComment || '',
                injuryData.longComment || '',
                injuryData.details?.type || 'Unknown',
                injuryData.details?.location || 'Unknown',
                injuryData.details?.detail || 'Not Specified',
                injuryData.details?.side || 'Not Specified',
                injuryData.details?.returnDate || null,
                injuryData.details?.fantasyStatus?.description || null,
                injuryData.date,
                injuryData.type?.abbreviation || 'O'
              ]);
              totalUpdates++;
              
              // Small delay between detailed API calls
              await new Promise(resolve => setTimeout(resolve, 50));
              
            } catch (detailError) {
              console.warn(`Error fetching injury detail: ${detailError.message}`);
            }
          }
          
          // Delay between team requests
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (teamError) {
          console.error(`Error updating injuries for team ${dbTeamId}:`, teamError.message);
        }
      }
      
      console.log(`✅ Updated ${totalUpdates} detailed injury reports`);
      return totalUpdates;
      
    } catch (error) {
      console.error('❌ Error in detailed injury updates:', error.message);
      throw error;
    }
  }

  // Update betting odds from The Odds API
  async updateBettingOdds() {
    console.log('📊 Updating betting odds...');
    
    try {
      const oddsApiKey = process.env.ODDS_API_KEY;
      if (!oddsApiKey) {
        console.warn('⚠️ No ODDS_API_KEY found, skipping odds update');
        return 0;
      }
      
      // Get upcoming games (not final)
      const gamesResult = await db.query(`
        SELECT id, home_team_name, away_team_name, game_time 
        FROM games 
        WHERE is_final = FALSE AND game_time > NOW()
        ORDER BY game_time
      `);
      
      if (gamesResult.rows.length === 0) {
        console.log('No upcoming games to update odds for');
        return 0;
      }
      
      // Fetch odds from The Odds API
      const response = await axios.get(`https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds`, {
        params: {
          apiKey: oddsApiKey,
          regions: 'us',
          markets: 'h2h,spreads,totals',
          oddsFormat: 'american'
        }
      });
      
      const oddsData = response.data;
      let updatedGames = 0;
      
      for (const game of gamesResult.rows) {
        // Find matching odds data
        const matchingOdds = oddsData.find(odds => 
          odds.home_team === game.home_team_name || 
          odds.away_team === game.away_team_name
        );
        
        if (matchingOdds && matchingOdds.bookmakers?.length > 0) {
          const bookmaker = matchingOdds.bookmakers[0]; // Use first bookmaker
          
          let spread = null;
          let overUnder = null;
          
          // Extract spread
          const spreadsMarket = bookmaker.markets?.find(m => m.key === 'spreads');
          if (spreadsMarket && spreadsMarket.outcomes?.length >= 2) {
            const homeSpread = spreadsMarket.outcomes.find(o => o.name === matchingOdds.home_team);
            spread = homeSpread ? homeSpread.point : null;
          }
          
          // Extract over/under
          const totalsMarket = bookmaker.markets?.find(m => m.key === 'totals');
          if (totalsMarket && totalsMarket.outcomes?.length > 0) {
            overUnder = totalsMarket.outcomes[0].point;
          }
          
          // Update database
          await db.query(`
            UPDATE games 
            SET spread = $1, over_under = $2, odds_updated_at = NOW()
            WHERE id = $3
          `, [spread, overUnder, game.id]);
          
          updatedGames++;
        }
      }
      
      console.log(`✅ Updated betting odds for ${updatedGames} games`);
      return updatedGames;
      
    } catch (error) {
      console.error('❌ Error updating betting odds:', error.message);
      throw error;
    }
  }

  // Update team records from our own database (based on completed games)
  async updateTeamRecords() {
    console.log('📈 Updating team records from completed games...');
    
    try {
      // Get all teams
      const teamsResult = await db.query('SELECT id FROM teams ORDER BY id');
      let updatedGames = 0;
      
      for (const team of teamsResult.rows) {
        const teamId = team.id;
        
        // Calculate wins, losses, and ties for this team from completed games
        const recordResult = await db.query(`
          SELECT 
            SUM(CASE 
              WHEN (home_team_id = $1 AND home_score > away_score) OR 
                   (away_team_id = $1 AND away_score > home_score) THEN 1 
              ELSE 0 
            END) as wins,
            SUM(CASE 
              WHEN (home_team_id = $1 AND home_score < away_score) OR 
                   (away_team_id = $1 AND away_score < home_score) THEN 1 
              ELSE 0 
            END) as losses,
            SUM(CASE 
              WHEN (home_team_id = $1 OR away_team_id = $1) AND home_score = away_score THEN 1 
              ELSE 0 
            END) as ties
          FROM games 
          WHERE (home_team_id = $1 OR away_team_id = $1) 
            AND is_final = TRUE 
            AND home_score IS NOT NULL 
            AND away_score IS NOT NULL
        `, [teamId]);
        
        const wins = recordResult.rows[0].wins || 0;
        const losses = recordResult.rows[0].losses || 0;
        const ties = recordResult.rows[0].ties || 0;
        
        const recordString = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
        
        // Update all future games with this team's current record
        const homeUpdateResult = await db.query(`
          UPDATE games 
          SET home_team_record = $1
          WHERE home_team_id = $2
        `, [recordString, teamId]);
        
        const awayUpdateResult = await db.query(`
          UPDATE games 
          SET away_team_record = $1
          WHERE away_team_id = $2
        `, [recordString, teamId]);
        
        updatedGames += homeUpdateResult.rowCount + awayUpdateResult.rowCount;
        console.log(`Team ${teamId} record: ${recordString}`);
      }
      
      console.log(`✅ Updated records for ${teamsResult.rows.length} teams across ${updatedGames} game entries`);
      return updatedGames;
      
    } catch (error) {
      console.error('❌ Error updating team records:', error.message);
      throw error;
    }
  }

  // Update weather data for outdoor games
  async updateWeatherData() {
    console.log('🌤️ Updating weather data...');
    
    try {
      const weatherApiKey = process.env.OPENWEATHER_API_KEY;
      if (!weatherApiKey) {
        console.warn('⚠️ No OPENWEATHER_API_KEY found, skipping weather update');
        return 0;
      }
      
      // Get upcoming outdoor games (next 7 days)
      const gamesResult = await db.query(`
        SELECT id, home_team_name, game_time
        FROM games 
        WHERE is_final = FALSE 
        AND game_time > NOW() 
        AND game_time < NOW() + INTERVAL '7 days'
        ORDER BY game_time
      `);
      
      // Outdoor stadiums mapping (simplified)
      const outdoorTeams = [
        'Denver Broncos', 'Buffalo Bills', 'Chicago Bears', 'Cleveland Browns',
        'Green Bay Packers', 'Kansas City Chiefs', 'Miami Dolphins', 'New England Patriots',
        'New York Giants', 'New York Jets', 'Philadelphia Eagles', 'Pittsburgh Steelers',
        'Tennessee Titans', 'Washington Commanders', 'Baltimore Ravens', 'Cincinnati Bengals',
        'Jacksonville Jaguars', 'Carolina Panthers', 'Tampa Bay Buccaneers'
      ];
      
      let updatedGames = 0;
      
      for (const game of gamesResult.rows) {
        if (outdoorTeams.includes(game.home_team_name)) {
          // Get city for weather lookup (simplified mapping)
          const cityMap = {
            'Denver Broncos': 'Denver,US',
            'Buffalo Bills': 'Buffalo,US',
            'Chicago Bears': 'Chicago,US',
            'Cleveland Browns': 'Cleveland,US',
            'Green Bay Packers': 'Green Bay,US',
            'Kansas City Chiefs': 'Kansas City,US'
            // Add more teams as needed
          };
          
          const city = cityMap[game.home_team_name];
          if (city) {
            try {
              const weatherResponse = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
                params: {
                  q: city,
                  appid: weatherApiKey,
                  units: 'imperial'
                }
              });
              
              const weather = weatherResponse.data;
              const temperature = Math.round(weather.main.temp);
              const conditions = weather.weather[0].main;
              const windSpeed = Math.round(weather.wind.speed);
              
              await db.query(`
                UPDATE games 
                SET weather_temp = $1, weather_conditions = $2, weather_wind = $3, weather_updated_at = NOW()
                WHERE id = $4
              `, [temperature, conditions, windSpeed, game.id]);
              
              updatedGames++;
              
            } catch (weatherError) {
              console.error(`Weather API error for ${game.home_team_name}:`, weatherError.message);
            }
            
            // Rate limit for weather API
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
      
      console.log(`✅ Updated weather for ${updatedGames} games`);
      return updatedGames;
      
    } catch (error) {
      console.error('❌ Error updating weather data:', error.message);
      throw error;
    }
  }

  // Update game status and scores
  async updateGameStatus() {
    console.log('🏈 Checking game status updates...');
    
    try {
      // Get games that are currently in progress or recently finished
      const gamesResult = await db.query(`
        SELECT id, home_team_id, away_team_id, game_time, is_final
        FROM games 
        WHERE game_time < NOW() + INTERVAL '4 hours'
        AND game_time > NOW() - INTERVAL '4 hours'
        AND (is_final = FALSE OR game_time > NOW() - INTERVAL '1 hour')
      `);
      
      let updatedGames = 0;
      
      for (const game of gamesResult.rows) {
        try {
          // Get game data from ESPN
          const response = await axios.get(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`);
          const events = response.data.events || [];
          
          // Find matching game
          const matchingGame = events.find(event => {
            const homeTeam = event.competitions[0].competitors.find(c => c.homeAway === 'home');
            const awayTeam = event.competitions[0].competitors.find(c => c.homeAway === 'away');
            return homeTeam.id == game.home_team_id && awayTeam.id == game.away_team_id;
          });
          
          if (matchingGame) {
            const competition = matchingGame.competitions[0];
            const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
            const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
            
            const homeScore = parseInt(homeTeam.score) || 0;
            const awayScore = parseInt(awayTeam.score) || 0;
            const isFinal = matchingGame.status.type.completed;
            
            await db.query(`
              UPDATE games 
              SET home_score = $1, away_score = $2, is_final = $3, scores_updated_at = NOW()
              WHERE id = $4
            `, [homeScore, awayScore, isFinal, game.id]);
            
            updatedGames++;
          }
          
        } catch (gameError) {
          console.error(`Error updating game ${game.id}:`, gameError.message);
        }
        
        // Rate limit for ESPN API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (updatedGames > 0) {
        console.log(`✅ Updated ${updatedGames} games`);
      }
      return updatedGames;
      
    } catch (error) {
      console.error('❌ Error updating game status:', error.message);
      throw error;
    }
  }

  // Log update activity
  async logUpdate(jobName, status, errorMessage) {
    try {
      await db.query(`
        INSERT INTO update_logs (job_name, status, error_message, executed_at)
        VALUES ($1, $2, $3, NOW())
      `, [jobName, status, errorMessage]);
      
      // Keep logs in memory for quick access
      this.updateLog.unshift({
        jobName,
        status,
        errorMessage,
        executedAt: new Date()
      });
      
      // Keep only last 100 log entries in memory
      if (this.updateLog.length > 100) {
        this.updateLog = this.updateLog.slice(0, 100);
      }
      
    } catch (error) {
      console.error('Error logging update:', error.message);
    }
  }

  // Get recent update logs
  async getRecentLogs(limit = 50) {
    try {
      const result = await db.query(`
        SELECT job_name, status, error_message, executed_at
        FROM update_logs
        ORDER BY executed_at DESC
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching logs:', error.message);
      return [];
    }
  }

  // Manual trigger for specific update types
  async triggerUpdate(updateType) {
    console.log(`🔄 Manually triggering ${updateType} update...`);
    
    try {
      switch (updateType) {
        case 'injuries':
          return await this.updateInjuries();
        case 'odds':
          return await this.updateBettingOdds();
        case 'records':
          return await this.updateTeamRecords();
        case 'weather':
          return await this.updateWeatherData();
        case 'games':
          return await this.updateGameStatus();
        default:
          throw new Error(`Unknown update type: ${updateType}`);
      }
    } catch (error) {
      await this.logUpdate(updateType, 'ERROR', error.message);
      throw error;
    }
  }

  // Stop all scheduled jobs
  stop() {
    console.log('🛑 Stopping Automatic Update Service...');
    
    for (const [jobName, job] of this.jobs) {
      job.destroy();
      console.log(`Stopped job: ${jobName}`);
    }
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('✅ Automatic Update Service stopped');
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.size,
      jobs: Array.from(this.jobs.keys()),
      recentLogs: this.updateLog.slice(0, 10)
    };
  }
}

module.exports = new AutomaticUpdateService();