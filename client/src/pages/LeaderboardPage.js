import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const LeaderboardPage = () => {
  const { week } = useParams();
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState(week ? 'week' : 'season');
  const [currentWeek, setCurrentWeek] = useState(week || '1');
  const [showPicksComparison, setShowPicksComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [expandedGame, setExpandedGame] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    fetchLeaderboard();
    // Reset picks comparison when changing weeks or view types
    setShowPicksComparison(false);
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

  const fetchPicksComparison = async () => {
    try {
      setComparisonLoading(true);
      const response = await axios.get(`/api/picks/week/${currentWeek}/compare`);
      setComparisonData(response.data);
      setShowPicksComparison(true);
    } catch (error) {
      console.error('Error fetching picks comparison:', error);
    } finally {
      setComparisonLoading(false);
    }
  };

  const processGamePicksData = (game) => {
    const homePicks = game.picks.filter(pick => pick.pickedTeamId === game.homeTeam.id);
    const awayPicks = game.picks.filter(pick => pick.pickedTeamId === game.awayTeam.id);
    const totalPicks = game.picks.length;
    
    const homePercentage = totalPicks > 0 ? Math.round((homePicks.length / totalPicks) * 100) : 0;
    const awayPercentage = totalPicks > 0 ? Math.round((awayPicks.length / totalPicks) * 100) : 0;
    
    // Find user's personal pick
    const userPick = user ? game.picks.find(pick => pick.userId === user.id) : null;
    
    return {
      totalPicks,
      homePickCount: homePicks.length,
      awayPickCount: awayPicks.length,
      homePercentage,
      awayPercentage,
      homePicks: homePicks,
      awayPicks: awayPicks,
      userPick: userPick,
      userPickedHome: userPick?.pickedTeamId === game.homeTeam.id,
      userPickedAway: userPick?.pickedTeamId === game.awayTeam.id
    };
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
    <div className="container mt-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {viewType === 'season' ? 'Season' : `Week ${currentWeek}`} Leaderboard
        </h1>
        <p className="text-gray-600">
          See who's dominating the Broncos Pickems League!
        </p>
      </div>

      {/* View Toggle */}
      <div className="flex justify-center gap-2 mb-6">
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
        <div className="flex flex-wrap justify-center gap-2 mb-6">
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

      {/* Picks Comparison Toggle (for weekly view) */}
      {viewType === 'week' && (
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setShowPicksComparison(false)}
            className={`btn ${!showPicksComparison ? 'btn-primary' : 'btn-outline'}`}
          >
            📊 Leaders
          </button>
          <button
            onClick={fetchPicksComparison}
            disabled={comparisonLoading}
            className={`btn ${showPicksComparison ? 'btn-primary' : 'btn-outline'}`}
          >
            {comparisonLoading ? '⏳ Loading...' : '🔍 Compare Picks'}
          </button>
        </div>
      )}

      {/* Search Filter (for picks comparison) */}
      {showPicksComparison && viewType === 'week' && (
        <div className="mb-6">
          <div className="max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search users..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      )}

      {/* Picks Comparison Display */}
      {showPicksComparison && viewType === 'week' && comparisonData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center mb-4">
            Week {currentWeek} Picks Comparison
          </h3>
          
          {/* User's Weekly Summary */}
          {user && (
            <div className="card bg-gradient-to-r from-blue-50 to-orange-50 border-2 border-orange-200">
              <h4 className="text-lg font-semibold mb-3 text-center">
                👤 Your Week {currentWeek} Performance
              </h4>
              {(() => {
                const userGames = comparisonData.filter(game => 
                  game.picks.some(pick => pick.userId === user.id)
                );
                const totalPicks = userGames.length;
                const correctPicks = userGames.filter(game => {
                  const userPick = game.picks.find(pick => pick.userId === user.id);
                  return userPick?.isCorrect;
                }).length;
                const totalPoints = userGames.reduce((sum, game) => {
                  const userPick = game.picks.find(pick => pick.userId === user.id);
                  return sum + (userPick?.pointsEarned || 0);
                }, 0);
                const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100) : 0;
                
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-orange-600">{totalPoints}</div>
                      <div className="text-sm text-gray-600">Points</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{correctPicks}</div>
                      <div className="text-sm text-gray-600">Correct</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{totalPicks}</div>
                      <div className="text-sm text-gray-600">Total</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{accuracy}%</div>
                      <div className="text-sm text-gray-600">Accuracy</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          
          {comparisonData.map(game => {
            const picksData = processGamePicksData(game);
            const filteredHomePicks = searchFilter 
              ? picksData.homePicks.filter(pick => 
                  pick.username.toLowerCase().includes(searchFilter.toLowerCase())
                )
              : picksData.homePicks;
            const filteredAwayPicks = searchFilter 
              ? picksData.awayPicks.filter(pick => 
                  pick.username.toLowerCase().includes(searchFilter.toLowerCase())
                )
              : picksData.awayPicks;
            
            const hasFilteredResults = !searchFilter || (filteredHomePicks.length > 0 || filteredAwayPicks.length > 0);
            
            if (!hasFilteredResults) return null;
            
            return (
              <div key={game.id} className="card">
                {/* Game Header */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <div className="flex justify-between items-center">
                    <div className="text-lg font-semibold">
                      {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(game.gameTime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  {game.isFinal && (
                    <div className="text-center mt-2">
                      <span className="text-green-600 font-semibold">
                        FINAL: {game.awayTeam.abbreviation} {game.awayScore} - {game.homeScore} {game.homeTeam.abbreviation}
                      </span>
                    </div>
                  )}
                </div>

                {/* Team Splits */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Away Team */}
                  <div className={`text-center p-4 rounded-lg ${picksData.userPickedAway ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'}`}>
                    <div className="font-semibold text-lg">{game.awayTeam.abbreviation}</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {searchFilter ? filteredAwayPicks.length : picksData.awayPickCount}
                    </div>
                    <div className="text-sm text-gray-600">
                      {searchFilter ? 'Filtered' : `${picksData.awayPercentage}%`}
                    </div>
                    {picksData.userPickedAway && (
                      <div className="text-xs font-bold text-blue-700 mt-1">
                        👤 YOU PICKED
                      </div>
                    )}
                  </div>
                  
                  {/* Home Team */}
                  <div className={`text-center p-4 rounded-lg ${picksData.userPickedHome ? 'bg-orange-100 border-2 border-orange-500' : 'bg-gray-50'}`}>
                    <div className="font-semibold text-lg">{game.homeTeam.abbreviation}</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {searchFilter ? filteredHomePicks.length : picksData.homePickCount}
                    </div>
                    <div className="text-sm text-gray-600">
                      {searchFilter ? 'Filtered' : `${picksData.homePercentage}%`}
                    </div>
                    {picksData.userPickedHome && (
                      <div className="text-xs font-bold text-orange-700 mt-1">
                        👤 YOU PICKED
                      </div>
                    )}
                  </div>
                </div>

                {/* Expandable Details */}
                <div>
                  <button
                    onClick={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
                    className="w-full btn btn-outline btn-sm"
                  >
                    {expandedGame === game.id ? '▲ Hide Details' : '▼ Show User Picks'}
                  </button>
                  
                  {expandedGame === game.id && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Away Team Picks */}
                      <div>
                        <h5 className="font-semibold mb-2 text-blue-600">
                          {game.awayTeam.abbreviation} Picks ({searchFilter ? filteredAwayPicks.length : picksData.awayPickCount})
                        </h5>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {(searchFilter ? filteredAwayPicks : picksData.awayPicks).map(pick => (
                            <div key={pick.userId} className="flex items-center justify-between text-sm p-2 bg-blue-50 rounded">
                              <div>
                                <span>{pick.username}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {game.isFinal && (
                                  <span className={pick.isCorrect ? 'text-green-600' : 'text-red-600'}>
                                    {pick.isCorrect ? '✓' : '✗'}
                                  </span>
                                )}
                                <span className="text-gray-600">{pick.pointsEarned || 0}pts</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Home Team Picks */}
                      <div>
                        <h5 className="font-semibold mb-2 text-orange-600">
                          {game.homeTeam.abbreviation} Picks ({searchFilter ? filteredHomePicks.length : picksData.homePickCount})
                        </h5>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {(searchFilter ? filteredHomePicks : picksData.homePicks).map(pick => (
                            <div key={pick.userId} className="flex items-center justify-between text-sm p-2 bg-orange-50 rounded">
                              <div>
                                <span>{pick.username}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {game.isFinal && (
                                  <span className={pick.isCorrect ? 'text-green-600' : 'text-red-600'}>
                                    {pick.isCorrect ? '✓' : '✗'}
                                  </span>
                                )}
                                <span className="text-gray-600">{pick.pointsEarned || 0}pts</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Regular Leaderboard */}
      {!showPicksComparison && leaderboard.length > 0 ? (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4" style={{ width: '80px' }}>Rank</th>
                  <th className="text-left py-3 px-4" style={{ width: 'auto' }}>Player</th>
                  <th className="text-center py-3 px-4" style={{ width: '100px' }}>Points</th>
                  <th className="text-center py-3 px-4" style={{ width: '80px' }}>Picks</th>
                  <th className="text-center py-3 px-4" style={{ width: '100px' }}>Correct</th>
                  <th className="text-center py-3 px-4" style={{ width: '100px' }}>Accuracy</th>
                  {viewType === 'season' && (
                    <th className="text-center py-3 px-4" style={{ width: '80px' }}>Weeks</th>
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
                    <td className="py-4 px-4 text-center">
                      <span className="text-lg font-semibold">
                        {getRankDisplay(player.rank)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium">
                        {player.username}
                      </span>
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
      ) : !showPicksComparison && (
        <div className="card text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-lg mb-2">No Results Yet</h3>
          <p className="text-gray-600">
            {viewType === 'season' 
              ? 'The season leaderboard will appear once games are completed.'
              : `No picks have been made for Week ${currentWeek} yet.`
            }
          </p>
        </div>
      )}

      {/* Stats Summary */}
      {!showPicksComparison && leaderboard.length > 0 && (
        <div className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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