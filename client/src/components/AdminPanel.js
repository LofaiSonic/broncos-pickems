import React, { useState } from 'react';
import axios from 'axios';

const AdminPanel = () => {
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState('1');
  const [message, setMessage] = useState('');

  const completeGamesForWeek = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      const response = await axios.post('/api/admin/complete-games', {
        week: parseInt(selectedWeek)
      });
      
      setMessage(`✅ ${response.data.message}. Games completed: ${response.data.gamesCompleted}, Picks processed: ${response.data.picksProcessed}`);
    } catch (error) {
      console.error('Error completing games:', error);
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mt-lg">
      <div className="mb-md">
        <h3 className="text-lg font-bold" style={{ color: 'var(--broncos-orange)' }}>
          🎮 Admin Panel - Game Simulation
        </h3>
        <p className="text-sm text-gray-600">
          Simulate game completion and calculate leaderboard points
        </p>
      </div>

      <div className="flex items-center gap-md mb-md">
        <label className="font-medium">Week to Complete:</label>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          {[...Array(18)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              Week {i + 1}
            </option>
          ))}
        </select>

        <button
          onClick={completeGamesForWeek}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Simulating...' : `Complete Week ${selectedWeek} Games`}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.includes('✅') 
            ? 'bg-green-50 text-green-800' 
            : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="mt-md text-xs text-gray-500">
        <p><strong>How it works:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Generates random realistic NFL scores (7-49 points)</li>
          <li>Marks selected week's games as final</li>
          <li>Calculates points: 1 point regular games, 2 points AFC West games</li>
          <li>Updates leaderboard automatically</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPanel;