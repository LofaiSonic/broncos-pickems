const Bull = require('bull');
const axios = require('axios');
const db = require('../models/database');

class JobQueueService {
  constructor() {
    this.queues = {};
    this.isInitialized = false;
  }

  async initialize() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    try {
      // Create different queues for different job types
      this.queues = {
        espnApi: new Bull('espn-api-jobs', redisUrl),
        injuries: new Bull('injury-update-jobs', redisUrl),
        odds: new Bull('odds-update-jobs', redisUrl),
        records: new Bull('record-update-jobs', redisUrl),
        weather: new Bull('weather-update-jobs', redisUrl),
        leaderboard: new Bull('leaderboard-jobs', redisUrl)
      };

      // Set up job processors
      this.setupProcessors();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('✅ Job queues initialized');
    } catch (error) {
      console.error('❌ Failed to initialize job queues:', error.message);
      throw error;
    }
  }

  setupProcessors() {
    // ESPN API generic processor
    this.queues.espnApi.process(async (job) => {
      const { url, method = 'GET', data } = job.data;
      console.log(`📡 Processing ESPN API job: ${url}`);
      
      try {
        const response = await axios({
          method,
          url,
          data,
          timeout: 30000 // 30 second timeout
        });
        
        return response.data;
      } catch (error) {
        console.error(`❌ ESPN API job failed: ${error.message}`);
        throw error;
      }
    });

    // Injury updates processor
    this.queues.injuries.process(async (job) => {
      const { teamId, teamName } = job.data;
      console.log(`🏥 Processing injury update for ${teamName}`);
      
      try {
        // Fetch injury data from ESPN
        const url = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/${teamId}/injuries`;
        const response = await axios.get(url, { timeout: 15000 });
        const injuryRefs = response.data?.items || [];
        
        const injuries = [];
        
        // Process each injury (limit to prevent overload)
        const limitedRefs = injuryRefs.slice(0, 10);
        for (const injuryRef of limitedRefs) {
          const injuryResponse = await axios.get(injuryRef.$ref, { timeout: 10000 });
          injuries.push(injuryResponse.data);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return { teamId, teamName, injuries, count: injuries.length };
      } catch (error) {
        console.error(`❌ Injury update failed for ${teamName}: ${error.message}`);
        throw error;
      }
    });

    // Odds updates processor
    this.queues.odds.process(async (job) => {
      const { week } = job.data;
      console.log(`📊 Processing odds update for week ${week}`);
      
      try {
        // Implementation would go here
        // For now, return mock success
        return { week, updated: true };
      } catch (error) {
        console.error(`❌ Odds update failed for week ${week}: ${error.message}`);
        throw error;
      }
    });

    // Record updates processor
    this.queues.records.process(async (job) => {
      const { teamId } = job.data;
      console.log(`📈 Processing record update for team ${teamId}`);
      
      try {
        // Calculate team record from database
        const result = await db.query(`
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
        
        const { wins, losses, ties } = result.rows[0];
        const record = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
        
        // Update all games with this team's record
        await db.query(`
          UPDATE games SET home_team_record = $1 WHERE home_team_id = $2
        `, [record, teamId]);
        
        await db.query(`
          UPDATE games SET away_team_record = $1 WHERE away_team_id = $2
        `, [record, teamId]);
        
        return { teamId, record };
      } catch (error) {
        console.error(`❌ Record update failed for team ${teamId}: ${error.message}`);
        throw error;
      }
    });

    // Leaderboard calculation processor
    this.queues.leaderboard.process(async (job) => {
      const { week } = job.data;
      console.log(`🏆 Processing leaderboard calculation for week ${week}`);
      
      try {
        // Get all completed games for the week
        const gamesResult = await db.query(`
          SELECT id, home_team_id, away_team_id, home_score, away_score
          FROM games
          WHERE week = $1 AND is_final = TRUE
        `, [week]);
        
        if (gamesResult.rows.length === 0) {
          return { week, message: 'No completed games for this week' };
        }
        
        // Calculate correct picks for each user
        const updateResult = await db.query(`
          UPDATE picks p
          SET 
            is_correct = CASE
              WHEN p.picked_team_id = g.home_team_id AND g.home_score > g.away_score THEN true
              WHEN p.picked_team_id = g.away_team_id AND g.away_score > g.home_score THEN true
              WHEN g.home_score = g.away_score THEN NULL
              ELSE false
            END,
            points_earned = CASE
              WHEN p.picked_team_id = g.home_team_id AND g.home_score > g.away_score THEN p.confidence_points
              WHEN p.picked_team_id = g.away_team_id AND g.away_score > g.home_score THEN p.confidence_points
              ELSE 0
            END
          FROM games g
          WHERE p.game_id = g.id 
            AND g.week = $1 
            AND g.is_final = TRUE
          RETURNING p.id
        `, [week]);
        
        return { 
          week, 
          picksUpdated: updateResult.rowCount,
          message: `Updated ${updateResult.rowCount} picks for week ${week}`
        };
      } catch (error) {
        console.error(`❌ Leaderboard calculation failed for week ${week}: ${error.message}`);
        throw error;
      }
    });
  }

  setupEventListeners() {
    // Log completed jobs
    Object.entries(this.queues).forEach(([name, queue]) => {
      queue.on('completed', (job, result) => {
        console.log(`✅ Job ${job.id} in ${name} queue completed`);
      });

      queue.on('failed', (job, err) => {
        console.error(`❌ Job ${job.id} in ${name} queue failed:`, err.message);
      });

      queue.on('stalled', (job) => {
        console.warn(`⚠️ Job ${job.id} in ${name} queue stalled`);
      });
    });
  }

  // Add job to queue
  async addJob(queueName, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Job queue service not initialized');
    }

    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      removeOnFail: false
    };

    const job = await queue.add(data, { ...defaultOptions, ...options });
    console.log(`📋 Added job ${job.id} to ${queueName} queue`);
    return job;
  }

  // Bulk add jobs
  async addBulkJobs(queueName, jobsData, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Job queue service not initialized');
    }

    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const jobs = jobsData.map(data => ({
      data,
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false,
        ...options
      }
    }));

    const addedJobs = await queue.addBulk(jobs);
    console.log(`📋 Added ${addedJobs.length} jobs to ${queueName} queue`);
    return addedJobs;
  }

  // Get queue statistics
  async getQueueStats(queueName) {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      queue: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  }

  // Get all queues statistics
  async getAllQueuesStats() {
    const stats = {};
    for (const queueName of Object.keys(this.queues)) {
      stats[queueName] = await this.getQueueStats(queueName);
    }
    return stats;
  }

  // Clean old jobs
  async cleanQueues(grace = 3600 * 1000) { // 1 hour default
    for (const [name, queue] of Object.entries(this.queues)) {
      await queue.clean(grace, 'completed');
      await queue.clean(grace * 24, 'failed'); // Keep failed jobs longer for debugging
      console.log(`🧹 Cleaned old jobs from ${name} queue`);
    }
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🛑 Shutting down job queues...');
    for (const queue of Object.values(this.queues)) {
      await queue.close();
    }
    console.log('✅ Job queues closed');
  }
}

// Create singleton instance
const jobQueueService = new JobQueueService();

module.exports = jobQueueService;