const cron = require('node-cron');
const axios = require('axios');

class OddsScheduler {
  constructor() {
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Odds scheduler is already running');
      return;
    }

    console.log('🕐 Starting odds scheduler - updates at 9 AM and 6 PM daily');
    
    // Schedule for 9:00 AM and 6:00 PM every day
    // Format: minute hour day month dayOfWeek
    const morningSchedule = '0 9 * * *';  // 9:00 AM
    const eveningSchedule = '0 18 * * *'; // 6:00 PM
    
    // Morning update
    cron.schedule(morningSchedule, async () => {
      console.log('🌅 Running morning odds update...');
      await this.updateOdds('morning');
    });
    
    // Evening update
    cron.schedule(eveningSchedule, async () => {
      console.log('🌆 Running evening odds update...');
      await this.updateOdds('evening');
    });
    
    this.isRunning = true;
    console.log('✅ Odds scheduler started successfully');
  }

  async updateOdds(timeOfDay) {
    try {
      console.log(`📊 ${timeOfDay} odds update starting...`);
      
      // Call our internal API endpoint
      const response = await axios.post('http://localhost:5000/api/admin/update-odds', {}, {
        timeout: 60000 // 60 second timeout
      });
      
      const result = response.data;
      console.log(`✅ ${timeOfDay} odds update completed:`, {
        updated: result.updated,
        failed: result.failed,
        gamesProcessed: result.gamesProcessed
      });
      
      // Log to file or external service if needed
      this.logUpdate(timeOfDay, result);
      
    } catch (error) {
      console.error(`❌ ${timeOfDay} odds update failed:`, error.message);
      
      // In production, you might want to send alerts here
      this.logError(timeOfDay, error);
    }
  }

  logUpdate(timeOfDay, result) {
    // Log successful updates
    console.log(`📝 Logged ${timeOfDay} update: ${result.updated}/${result.gamesProcessed} games updated`);
  }

  logError(timeOfDay, error) {
    // Log errors for monitoring
    console.error(`📝 Logged ${timeOfDay} error:`, error.message);
  }

  stop() {
    // Note: node-cron doesn't provide a direct way to stop specific tasks
    // In a production environment, you'd store task references and destroy them
    console.log('🛑 Odds scheduler stopped');
    this.isRunning = false;
  }

  // Manual trigger for testing
  async triggerUpdate() {
    console.log('🔧 Manual odds update triggered...');
    await this.updateOdds('manual');
  }

  getStatus() {
    return {
      running: this.isRunning,
      nextUpdates: {
        morning: '9:00 AM daily',
        evening: '6:00 PM daily'
      }
    };
  }
}

module.exports = new OddsScheduler();