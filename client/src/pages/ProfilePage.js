import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const ProfilePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pickResults, setPickResults] = useState([]);
  const [loadingPicks, setLoadingPicks] = useState(false);
  
  // AdminPanel state
  const [adminLoading, setAdminLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState('1');
  const [message, setMessage] = useState('');
  const [clearLoading, setClearLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    } else {
      // If no user, set loading to false so page still renders
      setLoading(false);
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/leaderboard/user/${user.id}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Set default empty stats so the page still renders
      setStats({
        totalPoints: 0,
        totalPicks: 0,
        correctPicks: 0,
        accuracyPercentage: 0,
        weeksParticipated: 0,
        weeklyBreakdown: [],
        favoriteTeams: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPickResults = async () => {
    try {
      setLoadingPicks(true);
      console.log('Fetching pick results for user:', user.id);
      const response = await axios.get(`/api/picks/results/${user.id}`);
      console.log('Pick results response:', response.data);
      setPickResults(response.data);
      setMessage(`📊 Found ${response.data.length} completed games with your picks`);
    } catch (error) {
      console.error('Error fetching pick results:', error);
      setPickResults([]);
      setMessage(`❌ Error fetching results: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoadingPicks(false);
    }
  };

  // AdminPanel function
  const completeGamesForWeek = async () => {
    try {
      setAdminLoading(true);
      setMessage('');
      
      const response = await axios.post('/api/admin/complete-games', {
        week: parseInt(selectedWeek)
      });
      
      setMessage(`✅ ${response.data.message}. Games completed: ${response.data.gamesCompleted}, Picks processed: ${response.data.picksProcessed}`);
    } catch (error) {
      console.error('Error completing games:', error);
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  const clearMyPicks = async (clearAll = false) => {
    try {
      setClearLoading(true);
      setMessage('');
      
      const payload = clearAll ? {} : { week: parseInt(selectedWeek) };
      const response = await axios.post(`/api/admin/clear-picks/${user.id}`, payload);
      
      setMessage(`🗑️ ${response.data.message}. Picks cleared: ${response.data.picksCleared}`);
      
      // Clear the displayed results
      setPickResults([]);
      
      // Refresh stats
      fetchUserStats();
      
    } catch (error) {
      console.error('Error clearing picks:', error);
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setClearLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  // Always render the page, even if there's no user or stats
  if (!user) {
    return (
      <div className="container mt-lg">
        <div style={{ backgroundColor: 'red', color: 'white', padding: '50px', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>
          🚨 NO USER FOUND - BUT PAGE IS RENDERING 🚨
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-lg">
      {/* ABSOLUTE SIMPLE TEST - SHOULD ALWAYS SHOW */}
      <div style={{ backgroundColor: 'red', color: 'white', padding: '50px', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>
        🚨 EMERGENCY TEST - IF YOU SEE THIS RED BOX, REACT IS WORKING 🚨
      </div>
      
      {/* Inline AdminPanel - No External Components */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '3px solid orange', 
        padding: '25px', 
        margin: '20px 0',
        borderRadius: '12px'
      }}>
        <h3 style={{ color: '#FA4616', fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
          🎮 Admin Panel - Game Simulation
        </h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          Simulate game completion and calculate leaderboard points
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <label style={{ fontWeight: '500' }}>Week to Complete:</label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            style={{ padding: '8px 12px', border: '2px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          >
            {[...Array(18)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                Week {i + 1}
              </option>
            ))}
          </select>

          <button
            onClick={completeGamesForWeek}
            disabled={adminLoading}
            style={{
              backgroundColor: adminLoading ? '#ccc' : '#FA4616',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px',
              cursor: adminLoading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            {adminLoading ? 'Simulating...' : `Complete Week ${selectedWeek} Games`}
          </button>
        </div>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: message.includes('✅') ? '#f0f9ff' : '#fef2f2',
            color: message.includes('✅') ? '#1e40af' : '#dc2626',
            marginBottom: '15px',
            border: `1px solid ${message.includes('✅') ? '#bfdbfe' : '#fecaca'}`
          }}>
            {message}
          </div>
        )}

        <div style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
          <p><strong>How it works:</strong></p>
          <ul style={{ listStyle: 'disc', paddingLeft: '20px', marginTop: '8px' }}>
            <li>Generates random realistic NFL scores (7-49 points)</li>
            <li>Marks selected week's games as final</li>
            <li>Calculates points: 1 point regular games, 2 points AFC West games</li>
            <li>Updates leaderboard automatically</li>
          </ul>
        </div>
      </div>

      {/* Profile Header */}
      <div className="card mb-lg">
        <div className="flex items-center gap-lg">
          {user?.avatar_url && (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{user?.username}</h1>
            <p className="text-gray-600">
              Joined {new Date(user?.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-lg mb-lg">
        <div className="card text-center">
          <div 
            className="text-2xl font-bold"
            style={{ color: 'var(--broncos-orange)' }}
          >
            {stats?.totalPoints || 0}
          </div>
          <p className="text-sm text-gray-600">Total Points</p>
        </div>
        <div className="card text-center">
          <div 
            className="text-2xl font-bold"
            style={{ color: 'var(--broncos-orange)' }}
          >
            {stats?.accuracyPercentage || 0}%
          </div>
          <p className="text-sm text-gray-600">Accuracy</p>
        </div>
        <div className="card text-center">
          <div 
            className="text-2xl font-bold"
            style={{ color: 'var(--broncos-orange)' }}
          >
            {stats?.correctPicks || 0}/{stats?.totalPicks || 0}
          </div>
          <p className="text-sm text-gray-600">Correct Picks</p>
        </div>
        <div className="card text-center">
          <div 
            className="text-2xl font-bold"
            style={{ color: 'var(--broncos-orange)' }}
          >
            {stats?.weeksParticipated || 0}
          </div>
          <p className="text-sm text-gray-600">Weeks Played</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* Weekly Breakdown */}
        <div className="card">
          <h2 className="text-xl font-bold mb-lg">Weekly Performance</h2>
          {stats?.weeklyBreakdown && stats.weeklyBreakdown.length > 0 ? (
            <div className="space-y-3">
              {stats.weeklyBreakdown.map(week => (
                <div key={week.week} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-semibold">Week {week.week}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-bold text-orange-600">
                      {week.points} pts
                    </span>
                    <span className="text-green-600">
                      {week.correct}/{week.picks}
                    </span>
                    <span className="text-gray-600">
                      ({week.accuracy}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-600 py-8">
              <div className="text-4xl mb-2">📊</div>
              <p>No picks made yet this season</p>
            </div>
          )}
        </div>

        {/* Favorite Teams */}
        <div className="card">
          <h2 className="text-xl font-bold mb-lg">Most Picked Teams</h2>
          {stats?.favoriteTeams && stats.favoriteTeams.length > 0 ? (
            <div className="space-y-3">
              {stats.favoriteTeams.map(team => (
                <div key={team.abbreviation} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-semibold">{team.abbreviation}</span>
                    <span className="text-gray-600 ml-2">{team.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-bold">
                      {team.pickCount} picks
                    </span>
                    <span className={`${team.accuracy >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                      {team.correctCount}/{team.pickCount} ({team.accuracy}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-600 py-8">
              <div className="text-4xl mb-2">🏈</div>
              <p>Make some picks to see your favorite teams</p>
            </div>
          )}
        </div>
      </div>

      {/* Inline AdminPanel */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '3px solid orange', 
        padding: '25px', 
        margin: '20px 0',
        borderRadius: '12px'
      }}>
        <h3 style={{ color: '#FA4616', fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
          🎮 Admin Panel - Game Simulation
        </h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          Simulate game completion and calculate leaderboard points
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <label style={{ fontWeight: '500' }}>Week to Complete:</label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            style={{ padding: '8px 12px', border: '2px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          >
            {[...Array(18)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                Week {i + 1}
              </option>
            ))}
          </select>

          <button
            onClick={completeGamesForWeek}
            disabled={adminLoading}
            style={{
              backgroundColor: adminLoading ? '#ccc' : '#FA4616',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px',
              cursor: adminLoading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            {adminLoading ? 'Simulating...' : `Complete Week ${selectedWeek} Games`}
          </button>
          
          <button
            onClick={fetchPickResults}
            disabled={loadingPicks}
            style={{
              backgroundColor: loadingPicks ? '#ccc' : '#001489',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px',
              cursor: loadingPicks ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            {loadingPicks ? 'Loading...' : 'Show My Results'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '15px' }}>
          <label style={{ fontWeight: '500', color: '#dc2626' }}>🗑️ Clear Data:</label>
          
          <button
            onClick={() => clearMyPicks(false)}
            disabled={clearLoading}
            style={{
              backgroundColor: clearLoading ? '#ccc' : '#dc2626',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: clearLoading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '13px'
            }}
          >
            {clearLoading ? 'Clearing...' : `Clear Week ${selectedWeek}`}
          </button>
          
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear ALL your picks and reset ALL games? This cannot be undone.')) {
                clearMyPicks(true);
              }
            }}
            disabled={clearLoading}
            style={{
              backgroundColor: clearLoading ? '#ccc' : '#991b1b',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: clearLoading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '13px'
            }}
          >
            {clearLoading ? 'Clearing...' : 'Clear ALL Season'}
          </button>
        </div>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: message.includes('✅') ? '#f0f9ff' : '#fef2f2',
            color: message.includes('✅') ? '#1e40af' : '#dc2626',
            marginBottom: '15px',
            border: `1px solid ${message.includes('✅') ? '#bfdbfe' : '#fecaca'}`
          }}>
            {message}
          </div>
        )}

        <div style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
          <p><strong>How it works:</strong></p>
          <ul style={{ listStyle: 'disc', paddingLeft: '20px', marginTop: '8px' }}>
            <li>Generates random realistic NFL scores (7-49 points)</li>
            <li>Marks selected week's games as final</li>
            <li>Calculates points: 1 point regular games, 2 points AFC West games</li>
            <li>Click "Show My Results" to see your correct/incorrect picks</li>
          </ul>
        </div>
      </div>

      {/* Pick Results Section */}
      {pickResults.length > 0 && (
        <div className="card mt-lg">
          <h2 className="text-xl font-bold mb-lg" style={{ color: 'var(--broncos-orange)' }}>
            📊 My Pick Results
          </h2>
          <div className="space-y-3">
            {pickResults.map(result => (
              <div 
                key={result.pickId} 
                className="p-4 rounded-lg border-2"
                style={{
                  backgroundColor: result.isCorrect ? '#f0f9ff' : '#fef2f2',
                  borderColor: result.isCorrect ? '#10b981' : '#ef4444'
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg">
                      {result.isCorrect ? '✅' : '❌'} Week {result.week}
                      {result.wasAfcWest && (
                        <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                          AFC WEST +2pts
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      <strong>Final:</strong> {result.finalScore}
                    </div>
                    <div className="text-sm mt-1">
                      <strong>My Pick:</strong> {result.pickedTeam.abbr} ({result.pickedTeam.name})
                    </div>
                  </div>
                  <div className="text-right">
                    <div 
                      className="text-2xl font-bold"
                      style={{ color: result.isCorrect ? '#10b981' : '#ef4444' }}
                    >
                      {result.pointsEarned} pts
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(result.gameTime).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievement Badges (placeholder for future) */}
      <div className="card mt-lg">
        <h2 className="text-xl font-bold mb-lg">Achievements</h2>
        <div className="text-center text-gray-600 py-8">
          <div className="text-4xl mb-2">🏆</div>
          <p>Achievements coming soon!</p>
          <p className="text-sm">Keep making picks to unlock badges and rewards</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;