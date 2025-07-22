import React, { useState, useEffect } from 'react';
import InjuryReportCard from './InjuryReportCard';

const InjuryTestPage = () => {
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/test/games/week/-4');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTestData(data);
        console.log('Test data loaded:', data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching test data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTestData();
  }, []);

  if (loading) return <div className="p-8">Loading test data...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!testData || testData.length === 0) return <div className="p-8">No test data available</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🏥 Injury System Test Page</h1>
      
      <div className="mb-4 p-4 bg-blue-50 rounded">
        <h2 className="text-lg font-semibold text-blue-800">Test Results:</h2>
        <p className="text-blue-700">Found {testData.length} games with injury data</p>
      </div>

      {testData.map((game, index) => (
        <div key={game.id} className="mb-8 p-6 border border-gray-200 rounded-lg">
          <h3 className="text-xl font-bold mb-4">
            Game {index + 1}: {game.away_team_name} @ {game.home_team_name}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Away Team */}
            <div>
              <h4 className="text-lg font-semibold mb-2">
                🏃 Away: {game.away_team_name} ({game.away_team_abbr})
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                Injury count: {game.away_team_injuries?.length || 0}
              </p>
              <InjuryReportCard 
                injuries={game.away_team_injuries} 
                teamName={game.away_team_name}
                teamType="away"
              />
            </div>

            {/* Home Team */}
            <div>
              <h4 className="text-lg font-semibold mb-2">
                🏠 Home: {game.home_team_name} ({game.home_team_abbr})
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                Injury count: {game.home_team_injuries?.length || 0}
              </p>
              <InjuryReportCard 
                injuries={game.home_team_injuries} 
                teamName={game.home_team_name}
                teamType="home"
              />
            </div>
          </div>

          {/* Debug info */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-500">Debug: Raw Injury Data</summary>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify({
                home_injuries: game.home_team_injuries,
                away_injuries: game.away_team_injuries
              }, null, 2)}
            </pre>
          </details>
        </div>
      ))}
    </div>
  );
};

export default InjuryTestPage;