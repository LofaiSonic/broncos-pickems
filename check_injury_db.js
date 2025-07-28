require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');

async function checkInjuryDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    console.log('🔌 Attempting database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configured' : 'Not configured');
    
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check if injury tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('detailed_injuries', 'update_logs', 'team_injuries')
      ORDER BY table_name
    `);
    
    console.log('\n📋 Injury-related tables found:');
    tablesResult.rows.forEach(row => console.log('  -', row.table_name));
    
    // Check if detailed_injuries table exists and has data
    if (tablesResult.rows.some(row => row.table_name === 'detailed_injuries')) {
      const injuryCountResult = await client.query(`
        SELECT COUNT(*) as total_injuries,
               COUNT(CASE WHEN status IN ('Out', 'Questionable', 'Doubtful', 'Probable') THEN 1 END) as active_injuries,
               MAX(updated_at) as last_updated
        FROM detailed_injuries
      `);
      
      const injuryData = injuryCountResult.rows[0];
      console.log('\n🏥 Detailed Injuries Table Status:');
      console.log('  - Total injury records:', injuryData.total_injuries);
      console.log('  - Active injuries:', injuryData.active_injuries);
      console.log('  - Last updated:', injuryData.last_updated || 'Never');
    }
    
    // Check update logs for injury updates
    if (tablesResult.rows.some(row => row.table_name === 'update_logs')) {
      const logsResult = await client.query(`
        SELECT job_name, status, records_updated, executed_at, error_message
        FROM update_logs 
        WHERE job_name = 'injury-updates'
        ORDER BY executed_at DESC
        LIMIT 5
      `);
      
      console.log('\n📝 Recent Injury Update Logs:');
      if (logsResult.rows.length === 0) {
        console.log('  - No injury update logs found');
      } else {
        logsResult.rows.forEach(log => {
          console.log(`  - ${log.executed_at}: ${log.status} - ${log.records_updated || 0} records updated`);
          if (log.error_message) {
            console.log(`    Error: ${log.error_message}`);
          }
        });
      }
    }
    
    // Check sample injury data
    if (tablesResult.rows.some(row => row.table_name === 'detailed_injuries')) {
      const sampleResult = await client.query(`
        SELECT player_name, position, status, short_comment, injury_type, updated_at
        FROM detailed_injuries
        WHERE status IN ('Out', 'Questionable', 'Doubtful', 'Probable')
        ORDER BY updated_at DESC
        LIMIT 5
      `);
      
      console.log('\n👤 Sample Active Injuries:');
      if (sampleResult.rows.length === 0) {
        console.log('  - No active injuries found');
      } else {
        sampleResult.rows.forEach(injury => {
          console.log(`  - ${injury.player_name} (${injury.position}): ${injury.status} - ${injury.short_comment || 'No details'}`);
        });
      }
    }
    
    // Check current games with injury data
    const gamesWithInjuriesResult = await client.query(`
      SELECT g.id, g.week, ht.name as home_team, at.name as away_team,
             COUNT(hi.id) as home_injuries, COUNT(ai.id) as away_injuries
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      LEFT JOIN detailed_injuries hi ON g.home_team_id = hi.team_id 
        AND hi.status IN ('Out', 'Questionable', 'Doubtful', 'Probable')
      LEFT JOIN detailed_injuries ai ON g.away_team_id = ai.team_id 
        AND ai.status IN ('Out', 'Questionable', 'Doubtful', 'Probable')
      WHERE g.week >= 1 AND g.week <= 4
      GROUP BY g.id, g.week, ht.name, at.name
      ORDER BY g.week, g.id
      LIMIT 5
    `);
    
    console.log('\n🏈 Sample Games with Injury Counts:');
    if (gamesWithInjuriesResult.rows.length === 0) {
      console.log('  - No games found');
    } else {
      gamesWithInjuriesResult.rows.forEach(game => {
        console.log(`  - Week ${game.week}: ${game.away_team} @ ${game.home_team} - Injuries: ${game.away_injuries}/${game.home_injuries}`);
      });
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Database operation failed:', error.message);
    await pool.end();
  }
}

checkInjuryDatabase();