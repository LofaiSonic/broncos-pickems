// Simple test script to verify injury API integration
const axios = require('axios');

async function testInjuryAPI() {
  try {
    console.log('🏥 Testing Injury API Integration...\n');
    
    // Test 1: Check if we can fetch raw injury data for Denver Broncos
    console.log('1. Testing ESPN Core API for Denver Broncos (ESPN ID: 7)...');
    const espnResponse = await axios.get('https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/7/injuries');
    console.log(`   ✅ ESPN API returned ${espnResponse.data?.items?.length || 0} injury references`);
    
    if (espnResponse.data?.items?.length > 0) {
      console.log('2. Testing detailed injury data fetch...');
      const firstInjuryRef = espnResponse.data.items[0];
      const detailResponse = await axios.get(firstInjuryRef.$ref);
      console.log(`   ✅ Successfully fetched detailed data for injury ID: ${detailResponse.data.id}`);
      console.log(`   📋 Player: ${detailResponse.data.athlete?.$ref ? 'Has athlete reference' : 'No athlete reference'}`);
      console.log(`   📋 Status: ${detailResponse.data.status}`);
      console.log(`   📋 Short Comment: ${detailResponse.data.shortComment?.substring(0, 100) || 'None'}...`);
    }
    
    console.log('\n🎉 ESPN Core API integration is working correctly!');
    console.log('\n📝 Next steps:');
    console.log('   - Injury data should now display in the frontend');
    console.log('   - Visit http://localhost:3000/picks/-4 to see injury reports');
    console.log('   - Look for expandable injury cards below team names');
    
  } catch (error) {
    console.error('❌ Error testing injury API:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Check internet connection');
    console.log('   - Verify ESPN API is accessible');
    console.log('   - Check if rate limiting is in effect');
  }
}

// Run the test
testInjuryAPI();