const cron = require('node-cron');
const db = require('../models/database');

class LeaderboardScheduler {
  constructor() {
    this.isRunning = false;
    this.lastUpdateTime = null;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Leaderboard scheduler is already running');
      return;
    }

    console.log('📊 Starting leaderboard scheduler - updates every Tuesday at 6:00 AM EST');
    
    // Schedule for 6:00 AM every Tuesday
    // Format: minute hour day month dayOfWeek (0 = Sunday, 2 = Tuesday)
    const tuesdaySchedule = '0 6 * * 2';  // 6:00 AM on Tuesdays
    
    cron.schedule(tuesdaySchedule, async () => {
      console.log('📊 Running weekly leaderboard update...');
      await this.updateLeaderboards();
    }, {
      scheduled: true,
      timezone: 'America/New_York' // EST timezone
    });
    
    this.isRunning = true;
    console.log('✅ Leaderboard scheduler started successfully');
  }

  async updateLeaderboards() {
    try {
      console.log('🔄 Starting leaderboard calculations...');
      
      // FIRST: Calculate pick results for all completed games
      await this.calculatePickResults();
      
      // Mark that leaderboards have been processed
      await this.markLeaderboardsUpdated();
      
      // Get the current week to determine cutoff
      const currentDate = new Date();
      const currentWeek = await this.getCurrentWeek();
      
      // Update season leaderboard (includes all completed weeks up to last Tuesday)
      await this.updateSeasonLeaderboard();
      
      // Update weekly leaderboards for all completed weeks
      await this.updateWeeklyLeaderboards();
      
      this.lastUpdateTime = new Date();
      console.log('✅ Leaderboard update completed successfully');
      
      return {
        success: true,
        message: 'Leaderboards updated successfully',
        updateTime: this.lastUpdateTime,
        currentWeek: currentWeek
      };
    } catch (error) {
      console.error('❌ Error updating leaderboards:', error.message);
      throw error;
    }
  }

  async calculatePickResults() {
    try {
      console.log('📊 Calculating pick results for all completed games...');
      
      // Calculate pick results for ALL completed games (not just recent ones)
      const result = await db.query(`
        UPDATE picks 
        SET 
          is_correct = CASE 
            WHEN picked_team_id = g.home_team_id AND g.home_score > g.away_score THEN TRUE
            WHEN picked_team_id = g.away_team_id AND g.away_score > g.home_score THEN TRUE
            ELSE FALSE
          END,
          points_earned = CASE 
            WHEN picked_team_id = g.home_team_id AND g.home_score > g.away_score THEN 1
            WHEN picked_team_id = g.away_team_id AND g.away_score > g.home_score THEN 1
            ELSE 0
          END
        FROM games g
        WHERE picks.game_id = g.id 
          AND g.is_final = TRUE
          AND g.home_score IS NOT NULL 
          AND g.away_score IS NOT NULL
      `);
      
      console.log(`📊 Updated pick results for ${result.rowCount} picks from completed games`);
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error calculating pick results:', error.message);
      throw error;
    }
  }

  async markLeaderboardsUpdated() {
    try {
      // Create or update a simple flag table to track when leaderboards were last processed
      await db.query(`
        CREATE TABLE IF NOT EXISTS leaderboard_updates (
          id SERIAL PRIMARY KEY,
          last_update TIMESTAMP DEFAULT NOW(),
          processed_games INTEGER DEFAULT 0
        )
      `);
      
      // Clear old records and insert new one
      await db.query('DELETE FROM leaderboard_updates');
      await db.query('INSERT INTO leaderboard_updates (last_update) VALUES (NOW())');
      
      console.log('📊 Marked leaderboards as updated');
    } catch (error) {
      console.error('❌ Error marking leaderboards as updated:', error.message);
    }
  }

  async getCurrentWeek() {
    try {
      // Get the current week based on games that have started
      const result = await db.query(`
        SELECT week, season_type
        FROM games 
        WHERE game_time <= NOW()
        ORDER BY id DESC
        LIMIT 1
      `);
      
      return result.rows[0] || { week: '1', season_type: 2 };
    } catch (error) {
      console.error('Error getting current week:', error.message);
      return { week: '1', season_type: 2 };
    }
  }

  async updateSeasonLeaderboard() {
    try {
      console.log('📈 Updating season leaderboard...');
      
      // Calculate season standings including only games that have been final for at least a day
      // This ensures we don't count the current week until Tuesday
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
          ROW_NUMBER() OVER (ORDER BY SUM(p.points_earned) DESC, 
                                    COUNT(CASE WHEN p.is_correct = true THEN 1 END) DESC) as rank
        FROM users u
        LEFT JOIN picks p ON u.id = p.user_id
        LEFT JOIN games g ON p.game_id = g.id
        WHERE g.is_final = true 
          AND g.updated_at < (CURRENT_TIMESTAMP - INTERVAL '1 day')
        GROUP BY u.id, u.username, u.avatar_url
        HAVING COUNT(p.id) > 0
        ORDER BY total_points DESC, correct_picks DESC
      `);
      
      console.log(`📊 Season leaderboard calculated for ${result.rows.length} players`);
      return result.rows;
    } catch (error) {
      console.error('Error updating season leaderboard:', error.message);
      throw error;
    }
  }

  async updateWeeklyLeaderboards() {
    try {
      console.log('📅 Updating weekly leaderboards...');
      
      // Get all weeks that have finished games (at least 1 day old)
      const weeksResult = await db.query(`
        SELECT DISTINCT week, season_type
        FROM games 
        WHERE is_final = true 
          AND updated_at < (CURRENT_TIMESTAMP - INTERVAL '1 day')
        ORDER BY season_type, 
                 CASE 
                   WHEN season_type = 1 THEN 
                     CASE week
                       WHEN 'pre1' THEN 1
                       WHEN 'pre2' THEN 2  
                       WHEN 'pre3' THEN 3
                       WHEN 'pre4' THEN 4
                       ELSE 0
                     END
                   ELSE CAST(week AS INTEGER)
                 END
      `);
      
      let updatedWeeks = 0;
      for (const weekData of weeksResult.rows) {
        await this.updateSingleWeekLeaderboard(weekData.week, weekData.season_type);
        updatedWeeks++;
      }
      
      console.log(`📅 Updated ${updatedWeeks} weekly leaderboards`);
      return updatedWeeks;
    } catch (error) {
      console.error('Error updating weekly leaderboards:', error.message);
      throw error;
    }
  }

  async updateSingleWeekLeaderboard(week, seasonType) {
    try {
      const result = await db.query(`
        SELECT 
          u.id as user_id,
          u.username,
          u.avatar_url as avatar,
          COUNT(p.id) as total_picks,
          SUM(CASE WHEN p.is_correct = true THEN 1 ELSE 0 END) as correct_picks,
          SUM(p.points_earned) as total_points,
          CASE 
            WHEN COUNT(p.id) > 0 THEN 
              ROUND((SUM(CASE WHEN p.is_correct = true THEN 1 ELSE 0 END)::decimal / COUNT(p.id)) * 100)
            ELSE 0 
          END as accuracy_percentage,
          ROW_NUMBER() OVER (ORDER BY SUM(p.points_earned) DESC, 
                                    COUNT(CASE WHEN p.is_correct = true THEN 1 END) DESC) as rank
        FROM users u
        LEFT JOIN picks p ON u.id = p.user_id
        LEFT JOIN games g ON p.game_id = g.id
        WHERE g.week = $1 AND g.season_type = $2
          AND g.is_final = true
        GROUP BY u.id, u.username, u.avatar_url
        HAVING COUNT(p.id) > 0
        ORDER BY total_points DESC, correct_picks DESC
      `, [week, seasonType]);
      
      console.log(`  📊 Week ${week} (Season Type ${seasonType}): ${result.rows.length} players`);
      return result.rows;
    } catch (error) {
      console.error(`Error updating week ${week} leaderboard:`, error.message);
      throw error;
    }
  }

  stop() {
    // Note: node-cron doesn't provide a direct way to stop specific tasks
    // In a production environment, you'd store task references and destroy them
    console.log('🛑 Leaderboard scheduler stopped');
    this.isRunning = false;
  }

  // Manual trigger for testing/admin use
  async triggerUpdate() {
    console.log('🔧 Manually triggering leaderboard update...');
    return await this.updateLeaderboards();
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastUpdateTime: this.lastUpdateTime,
      nextUpdate: this.isRunning ? 'Next Tuesday at 6:00 AM EST' : 'Not scheduled'
    };
  }

  // Helper function to determine if a week should be included in leaderboards
  // Returns true if the week's games have been completed for at least until the next Tuesday
  isWeekEligibleForLeaderboard(weekNumber, seasonType) {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 2 = Tuesday
    const currentHour = now.getHours();
    
    // If it's Tuesday and before 6am, we haven't had the update yet
    if (currentDay === 2 && currentHour < 6) {
      // Don't include the previous week yet
      return false;
    }
    
    // If it's not Tuesday yet this week, only include weeks from before this week
    if (currentDay < 2) {
      // We're still in the same week, don't include current or recent weeks
      return false;
    }
    
    // For now, we'll be conservative and only include weeks where all games have been final for at least 2 days
    // This is a simplified approach - in production you'd want more sophisticated logic
    return true;
  }

  // Get the WHERE clause for filtering games that should be included in leaderboards
  getLeaderboardGameFilter() {
    return `
      AND g.is_final = true 
      AND g.updated_at < (CURRENT_TIMESTAMP - INTERVAL '1 day')
    `;
  }
}

module.exports = new LeaderboardScheduler();