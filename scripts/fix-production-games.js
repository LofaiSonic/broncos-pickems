#!/usr/bin/env node

const axios = require('axios');

/**
 * Script to fix production games with correct 2025 NFL schedule
 * This will clear incorrect games and reimport from ESPN API
 */

async function fixProductionGames() {
  try {
    console.log('🏈 Starting production games fix...');

    // Step 1: Clear all existing games
    console.log('🗑️ Clearing existing games...');
    const clearResponse = await axios.post('https://broncos-pickems.bryro.dev/api/admin/clear-games');
    console.log('✅ Cleared games:', clearResponse.data.message);

    // Step 2: Import 2025 preseason games
    console.log('🏈 Importing 2025 preseason games...');
    const preseasonResponse = await axios.post('https://broncos-pickems.bryro.dev/api/admin/import-preseason');
    console.log('✅ Preseason import:', preseasonResponse.data.message);

    // Step 3: Import 2025 regular season games  
    console.log('🏈 Importing 2025 regular season games...');
    const regularResponse = await axios.post('https://broncos-pickems.bryro.dev/api/admin/import-regular-season');
    console.log('✅ Regular season import:', regularResponse.data.message);

    console.log('🎉 Production games fix complete!');
    
    // Step 4: Verify Hall of Fame game
    console.log('🔍 Verifying Hall of Fame game...');
    const hofResponse = await axios.get('https://broncos-pickems.bryro.dev/api/games/week/pre1/picks');
    const hofGame = hofResponse.data.games[0];
    if (hofGame) {
      console.log(`✅ Hall of Fame game: ${hofGame.awayTeam.name} @ ${hofGame.homeTeam.name}`);
    }

  } catch (error) {
    console.error('❌ Error fixing production games:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  fixProductionGames();
}

module.exports = { fixProductionGames };