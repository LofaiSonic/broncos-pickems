import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const LeaderboardPage = () => {
  const { week } = useParams();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState(week ? 'week' : 'season');
  const [currentWeek, setCurrentWeek] = useState(week || '1');

  useEffect(() => {
    fetchLeaderboard();
  }, [viewType, currentWeek]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const endpoint = viewType === 'season' 
        ? '/api/leaderboard/season'
        : `/api/leaderboard/week/${currentWeek}`;
      
      const response = await axios.get(endpoint);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankDisplay = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container mt-lg">
      <div className="mb-lg">
        <h1 className="text-2xl font-bold mb-sm">
          {viewType === 'season' ? 'Season' : `Week ${currentWeek}`} Leaderboard
        </h1>
        <p className="text-gray-600">
          See who's dominating the Broncos Pickems League!
        </p>
      </div>

      {/* View Toggle */}
      <div className="flex justify-center gap-sm mb-lg">
        <button
          onClick={() => setViewType('season')}
          className={`btn ${viewType === 'season' ? 'btn-primary' : 'btn-outline'}`}
        >
          Season Leaders
        </button>
        <button
          onClick={() => setViewType('week')}
          className={`btn ${viewType === 'week' ? 'btn-primary' : 'btn-outline'}`}
        >
          Weekly Leaders
        </button>
      </div>

      {/* Week Selection (for weekly view) */}
      {viewType === 'week' && (
        <div className="flex flex-wrap justify-center gap-sm mb-lg">
          {[...Array(18)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentWeek((i + 1).toString())}
              className={`btn btn-sm ${
                currentWeek === (i + 1).toString() 
                  ? 'btn-primary' 
                  : 'btn-outline'
              }`}
            >
              Week {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 ? (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Rank</th>
                  <th className="text-left py-3 px-4">Player</th>
                  <th className="text-center py-3 px-4">Points</th>
                  <th className="text-center py-3 px-4">Picks</th>
                  <th className="text-center py-3 px-4">Correct</th>
                  <th className="text-center py-3 px-4">Accuracy</th>
                  {viewType === 'season' && (
                    <th className="text-center py-3 px-4">Weeks</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((player, index) => (
                  <tr 
                    key={player.userId}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      index < 3 ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <span className="text-lg font-semibold">
                        {getRankDisplay(player.rank)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-sm">
                        {player.avatar && (
                          <img
                            src={player.avatar}
                            alt={player.username}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <span className="font-medium">{player.username}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span 
                        className="text-lg font-bold"
                        style={{ color: 'var(--broncos-orange)' }}
                      >
                        {player.totalPoints}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {player.totalPicks}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-green-600 font-semibold">
                        {player.correctPicks}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {player.accuracyPercentage}%
                    </td>
                    {viewType === 'season' && (
                      <td className="py-4 px-4 text-center">
                        {player.weeksParticipated}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center">
          <div className="text-6xl mb-md">🏆</div>
          <h3 className="text-lg mb-sm">No Results Yet</h3>
          <p className="text-gray-600">
            {viewType === 'season' 
              ? 'The season leaderboard will appear once games are completed.'
              : `No picks have been made for Week ${currentWeek} yet.`
            }
          </p>
        </div>
      )}

      {/* Stats Summary */}
      {leaderboard.length > 0 && (
        <div className="mt-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            <div className="card text-center">
              <div 
                className="text-2xl font-bold"
                style={{ color: 'var(--broncos-orange)' }}
              >
                {leaderboard[0]?.totalPoints || 0}
              </div>
              <p className="text-sm text-gray-600">Highest Score</p>
            </div>
            <div className="card text-center">
              <div 
                className="text-2xl font-bold"
                style={{ color: 'var(--broncos-orange)' }}
              >
                {Math.max(...leaderboard.map(p => p.accuracyPercentage), 0)}%
              </div>
              <p className="text-sm text-gray-600">Best Accuracy</p>
            </div>
            <div className="card text-center">
              <div 
                className="text-2xl font-bold"
                style={{ color: 'var(--broncos-orange)' }}
              >
                {leaderboard.length}
              </div>
              <p className="text-sm text-gray-600">Active Players</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;