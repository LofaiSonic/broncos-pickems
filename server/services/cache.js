const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.cacheEnabled = process.env.REDIS_URL || process.env.NODE_ENV === 'production';
  }

  async initialize() {
    if (!this.cacheEnabled) {
      console.log('⚠️ Cache disabled - running without Redis');
      return;
    }

    try {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            // Only reconnect when the error contains "READONLY"
            return true;
          }
          return false;
        }
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected');
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
        this.isConnected = false;
      });

      await this.redis.connect();
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error.message);
      this.cacheEnabled = false;
    }
  }

  // Get value from cache
  async get(key) {
    if (!this.isConnected) return null;
    
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error.message);
      return null;
    }
  }

  // Set value in cache with TTL (in seconds)
  async set(key, value, ttl = 300) {
    if (!this.isConnected) return false;
    
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error.message);
      return false;
    }
  }

  // Delete value from cache
  async del(key) {
    if (!this.isConnected) return false;
    
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error.message);
      return false;
    }
  }

  // Clear all cache entries matching a pattern
  async clearPattern(pattern) {
    if (!this.isConnected) return false;
    
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache clear pattern error:', error.message);
      return false;
    }
  }

  // Cache key generators
  static keys = {
    userSession: (userId) => `session:${userId}`,
    weekGames: (week) => `games:week:${week}`,
    userPicks: (userId, week) => `picks:${userId}:${week}`,
    leaderboard: (week) => `leaderboard:${week}`,
    leaderboardOverall: () => 'leaderboard:overall',
    teamRecords: () => 'team:records',
    gameInjuries: (gameId) => `injuries:game:${gameId}`,
    userStats: (userId) => `stats:user:${userId}`,
    odds: (week) => `odds:week:${week}`
  };

  // Cache TTLs (in seconds)
  static ttl = {
    userSession: 86400,      // 24 hours
    weekGames: 3600,         // 1 hour
    userPicks: 300,          // 5 minutes
    leaderboard: 300,        // 5 minutes
    teamRecords: 1800,       // 30 minutes
    gameInjuries: 1800,      // 30 minutes
    userStats: 600,          // 10 minutes
    odds: 900                // 15 minutes
  };

  // Cached wrapper for database queries
  async cached(key, ttl, fetchFunction) {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from database
    const data = await fetchFunction();
    
    // Store in cache
    await this.set(key, data, ttl);
    
    return data;
  }

  // Invalidate related cache entries
  async invalidate(type, id) {
    switch (type) {
      case 'picks':
        // Clear user picks and leaderboard caches
        await this.clearPattern(`picks:${id}:*`);
        await this.clearPattern('leaderboard:*');
        break;
      
      case 'game':
        // Clear game and related caches
        await this.clearPattern(`games:week:*`);
        await this.clearPattern(`injuries:game:${id}`);
        break;
      
      case 'user':
        // Clear user-related caches
        await this.del(`session:${id}`);
        await this.del(`stats:user:${id}`);
        await this.clearPattern(`picks:${id}:*`);
        break;
      
      case 'leaderboard':
        // Clear all leaderboard caches
        await this.clearPattern('leaderboard:*');
        break;
    }
  }

  // Graceful shutdown
  async shutdown() {
    if (this.redis) {
      await this.redis.quit();
      console.log('✅ Redis connection closed');
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;