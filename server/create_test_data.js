const { Pool } = require('pg');

// Connect to dev database
const pool = new Pool({
  connectionString: 'postgresql://postgres:password123@localhost:5432/broncos_pickems_dev'
});

async function createTestData() {
  try {
    console.log('Creating test users...');
    
    // Create test users
    const users = [
      { reddit_id: 'test_user_1', username: 'TestUser1', avatar_url: 'https://example.com/avatar1.jpg' },
      { reddit_id: 'test_user_2', username: 'TestUser2', avatar_url: 'https://example.com/avatar2.jpg' },
      { reddit_id: 'test_user_3', username: 'TestUser3', avatar_url: 'https://example.com/avatar3.jpg' },
      { reddit_id: 'test_user_4', username: 'TestUser4', avatar_url: 'https://example.com/avatar4.jpg' },
      { reddit_id: 'test_user_5', username: 'TestUser5', avatar_url: 'https://example.com/avatar5.jpg' }
    ];
    
    for (const user of users) {
      await pool.query(`
        INSERT INTO users (reddit_id, username, avatar_url, created_at) 
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (reddit_id) DO NOTHING
      `, [user.reddit_id, user.username, user.avatar_url]);
    }
    
    console.log('Test users created!');
    
    // Get some preseason games
    const gamesResult = await pool.query(`
      SELECT id, home_team_id, away_team_id, week 
      FROM games 
      WHERE week IN ('pre1', 'pre2') 
      ORDER BY game_time 
      LIMIT 6
    `);
    
    console.log(`Found ${gamesResult.rows.length} preseason games`);
    
    if (gamesResult.rows.length === 0) {
      console.log('No preseason games found. Let me check what games exist...');
      const allGames = await pool.query(`
        SELECT DISTINCT week 
        FROM games 
        ORDER BY week
      `);
      console.log('Available weeks:', allGames.rows.map(r => r.week));
      return;
    }
    
    // Get user IDs
    const usersResult = await pool.query('SELECT id, username FROM users WHERE reddit_id LIKE $1', ['test_user_%']);
    console.log(`Found ${usersResult.rows.length} test users`);
    
    // Create picks for each game
    console.log('Creating test picks...');
    let pickCount = 0;
    
    for (const game of gamesResult.rows) {
      for (const user of usersResult.rows) {
        // Randomly pick home or away team (60% home, 40% away for testing)
        const pickHomeTeam = Math.random() > 0.4;
        const pickedTeamId = pickHomeTeam ? game.home_team_id : game.away_team_id;
        
        try {
          await pool.query(`
            INSERT INTO picks (user_id, game_id, picked_team_id, confidence_points, created_at)
            VALUES ($1, $2, $3, 1, NOW())
            ON CONFLICT (user_id, game_id) DO NOTHING
          `, [user.id, game.id, pickedTeamId]);
          pickCount++;
        } catch (err) {
          console.log(`Error creating pick for user ${user.username}, game ${game.id}:`, err.message);
        }
      }
    }
    
    console.log(`Created ${pickCount} test picks!`);
    
    // Show summary
    const summary = await pool.query(`
      SELECT 
        COUNT(DISTINCT user_id) as users,
        COUNT(DISTINCT game_id) as games,
        COUNT(*) as total_picks
      FROM picks
    `);
    
    console.log('Test data summary:', summary.rows[0]);
    
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await pool.end();
  }
}

createTestData();