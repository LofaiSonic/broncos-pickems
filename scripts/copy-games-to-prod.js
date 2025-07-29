#!/usr/bin/env node

const fs = require('fs');
const axios = require('axios');

/**
 * Copy games from dev database to production via CSV export/import
 */

async function copyGamesToProduction() {
  try {
    console.log('📋 Reading exported games CSV...');
    
    // Read the CSV file
    const csvData = fs.readFileSync('./games_export.csv', 'utf8');
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',');
    const games = [];
    
    // Parse CSV data
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const game = {};
      
      headers.forEach((header, index) => {
        let value = values[index];
        
        // Handle null values and data types
        if (value === '' || value === 'null') {
          game[header] = null;
        } else if (header === 'season_id' || header === 'season_type' || header === 'season_year' || 
                   header === 'home_team_id' || header === 'away_team_id' || 
                   header === 'home_score' || header === 'away_score') {
          game[header] = value ? parseInt(value) : null;
        } else if (header === 'spread' || header === 'over_under') {
          game[header] = value ? parseFloat(value) : null;
        } else if (header === 'is_final') {
          game[header] = value === 't' || value === 'true';
        } else {
          game[header] = value;
        }
      });
      
      games.push(game);
    }
    
    console.log(`📊 Parsed ${games.length} games from CSV`);
    
    // Send to production API
    console.log('🚀 Uploading games to production...');
    
    const response = await axios.post('https://broncos-pickems.bryro.dev/api/admin/import-games-csv', {
      games: games
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 second timeout
    });
    
    console.log('✅ Success:', response.data.message);
    
    // Verify Hall of Fame game
    console.log('🔍 Verifying Hall of Fame game...');
    const verifyResponse = await axios.get('https://broncos-pickems.bryro.dev/api/games/week/pre1/picks');
    const hofGame = verifyResponse.data.games?.[0];
    
    if (hofGame) {
      console.log(`✅ Hall of Fame game: ${hofGame.awayTeam.name} @ ${hofGame.homeTeam.name}`);
    } else {
      console.log('⚠️ Could not verify Hall of Fame game');
    }
    
  } catch (error) {
    console.error('❌ Error copying games to production:', error.response?.data || error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  copyGamesToProduction();
}

module.exports = { copyGamesToProduction };