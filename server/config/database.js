const { Pool } = require('pg');

// Database configuration with optimized pooling for 10,000 users
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  
  // Connection Pool Settings
  max: 50,                      // Maximum number of clients in the pool (increased from default 10)
  min: 5,                       // Minimum number of clients in the pool
  idleTimeoutMillis: 30000,     // How long a client can sit idle before being removed (30 seconds)
  connectionTimeoutMillis: 5000, // How long to wait for a connection before timing out (5 seconds)
  
  // Query timeout
  statement_timeout: 30000,      // Global timeout for queries (30 seconds)
  query_timeout: 30000,          // Alternative query timeout
  
  // Keep-alive settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 60000, // Start keep-alive after 1 minute
  
  // SSL settings - disabled for Docker PostgreSQL
  ssl: false,
  
  // Application name for monitoring
  application_name: 'broncos_pickems',
};

// Create the pool
const pool = new Pool(poolConfig);

// Error handling for the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Pool statistics logging (useful for monitoring)
let queryCount = 0;
let errorCount = 0;

setInterval(() => {
  console.log(`📊 Database Pool Stats: Total=${pool.totalCount} | Idle=${pool.idleCount} | Waiting=${pool.waitingCount} | Queries=${queryCount} | Errors=${errorCount}`);
}, 60000); // Log every minute

// Enhanced query function with automatic retry and logging
const query = async (text, params, retries = 3) => {
  const start = Date.now();
  queryCount++;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.log('⚠️ Slow query detected:', {
          duration: `${duration}ms`,
          query: text.substring(0, 100) + '...',
          params: params?.slice(0, 3)
        });
      }
      
      return result;
    } catch (error) {
      errorCount++;
      
      // If it's a connection error and we have retries left, try again
      if (attempt < retries && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
        console.log(`🔄 Retrying query (attempt ${attempt}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000)); // Exponential backoff
        continue;
      }
      
      // Log the error with context
      console.error('❌ Query error:', {
        error: error.message,
        code: error.code,
        query: text.substring(0, 100) + '...',
        params: params?.slice(0, 3),
        attempt
      });
      
      throw error;
    }
  }
};

// Transaction helper with automatic rollback on error
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('🛑 Shutting down database pool...');
  await pool.end();
  console.log('✅ Database pool closed');
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = {
  query,
  transaction,
  pool,
  shutdown
};