import React, { useState } from 'react';
import axios from 'axios';

const SimpleAdminPanel = () => {
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
    <div style={{ 
      backgroundColor: 'white', 
      border: '2px solid orange', 
      padding: '20px', 
      margin: '20px',
      borderRadius: '8px'
    }}>
      <h3 style={{ color: 'orange', fontSize: '18px', fontWeight: 'bold' }}>
        🎮 Admin Panel - Game Simulation
      </h3>
      <p style={{ color: 'gray', fontSize: '14px', marginBottom: '15px' }}>
        Simulate game completion and calculate leaderboard points
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
        <label style={{ fontWeight: '500' }}>Week to Complete:</label>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          style={{ padding: '8px', border: '1px solid gray', borderRadius: '4px' }}
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
          style={{
            backgroundColor: loading ? '#ccc' : '#FA4616',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '500'
          }}
        >
          {loading ? 'Simulating...' : `Complete Week ${selectedWeek} Games`}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '10px',
          borderRadius: '4px',
          fontSize: '14px',
          backgroundColor: message.includes('✅') ? '#f0f9ff' : '#fef2f2',
          color: message.includes('✅') ? '#1e40af' : '#dc2626',
          marginBottom: '15px'
        }}>
          {message}
        </div>
      )}

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p><strong>How it works:</strong></p>
        <ul style={{ listStyle: 'disc', paddingLeft: '20px' }}>
          <li>Generates random realistic NFL scores (7-49 points)</li>
          <li>Marks selected week's games as final</li>
          <li>Calculates points: 1 point regular games, 2 points AFC West games</li>
          <li>Updates leaderboard automatically</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleAdminPanel;