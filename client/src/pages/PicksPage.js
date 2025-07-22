import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const PicksPage = () => {
  const { week } = useParams();
  const [games, setGames] = useState([]);
  const [userPicks, setUserPicks] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(week || '1');
  const [gameResults, setGameResults] = useState({}); // Store game results for coloring

  useEffect(() => {
    fetchGamesAndPicks();
  }, [currentWeek]);

  const fetchGamesAndPicks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/games/week/${currentWeek}/picks`);
      
      // Transform the API response to match our component structure
      const gamesData = response.data.map(game => {
        console.log('Raw game data:', game); // Debug log
        return {
          id: game.id,
          week: game.week,
          gameTime: game.game_time,
          isFinal: game.is_final,
          homeTeam: {
            id: game.home_team_id,
            name: game.home_team_name,
            abbreviation: game.home_team_abbr,
            score: game.home_score
          },
          awayTeam: {
            id: game.away_team_id,
            name: game.away_team_name,
            abbreviation: game.away_team_abbr,
            score: game.away_score
          },
          spread: game.spread,
          overUnder: game.over_under,
          picksLocked: game.picks_locked,
          homeTeamInjuries: game.home_team_injuries || [],
          awayTeamInjuries: game.away_team_injuries || []
        };
      });
      
      // Extract user picks from the response
      const picksData = {};
      response.data.forEach(game => {
        if (game.picked_team_id) {
          picksData[game.id] = {
            pickedTeamId: game.picked_team_id,
            confidencePoints: game.confidence_points || 1
          };
        }
      });
      
      console.log('Games data:', gamesData);
      console.log('Picks data:', picksData);
      console.log('Raw API response:', response.data);
      
      setGames(gamesData);
      setUserPicks(picksData);
      
      // Build game results for coloring completed games
      const resultsData = {};
      response.data.forEach(game => {
        if (game.is_final && game.picked_team_id) {
          const homeWon = game.home_score > game.away_score;
          const awayWon = game.away_score > game.home_score;
          const tie = game.home_score === game.away_score;
          
          let isCorrect = false;
          if (!tie) {
            if (homeWon && game.picked_team_id === game.home_team_id) {
              isCorrect = true;
            } else if (awayWon && game.picked_team_id === game.away_team_id) {
              isCorrect = true;
            }
          }
          
          resultsData[game.id] = {
            isCorrect,
            finalScore: `${game.away_team_abbr} ${game.away_score} - ${game.home_score} ${game.home_team_abbr}`,
            isCompleted: true
          };
        }
      });
      
      setGameResults(resultsData);
      
      // Debug log after state update
      setTimeout(() => {
        console.log('userPicks state after update:', picksData);
        console.log('gameResults:', resultsData);
      }, 100);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickChange = async (gameId, teamId) => {
    // Update local state immediately for UI feedback
    setUserPicks(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        pickedTeamId: teamId,
        confidencePoints: 1
      }
    }));

    // Submit the pick to the server immediately
    try {
      await axios.post('/api/picks', {
        gameId: parseInt(gameId),
        pickedTeamId: teamId,
        confidencePoints: 1
      });
      console.log(`Pick submitted: Game ${gameId}, Team ${teamId}`);
    } catch (error) {
      console.error('Error submitting pick:', error);
      // Revert the local state if the API call failed
      setUserPicks(prev => ({
        ...prev,
        [gameId]: {
          ...prev[gameId],
          pickedTeamId: null
        }
      }));
      alert('Error submitting pick. Please try again.');
    }
  };

  const submitPick = async (gameId, teamId) => {
    try {
      await axios.post('/api/picks', {
        gameId: parseInt(gameId),
        pickedTeamId: teamId,
        confidencePoints: 1
      });
      console.log('Pick submitted successfully');
    } catch (error) {
      console.error('Error submitting pick:', error);
      alert('Error submitting pick. Please try again.');
    }
  };

  const submitPicks = async () => {
    try {
      setSubmitting(true);
      
      const picks = Object.entries(userPicks)
        .filter(([_, pick]) => pick.pickedTeamId);

      for (const [gameId, pick] of picks) {
        await submitPick(gameId, pick.pickedTeamId);
      }
      
      alert('All picks submitted successfully!');
    } catch (error) {
      console.error('Error submitting picks:', error);
      alert('Error submitting picks. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatGameTime = (gameTime) => {
    return new Date(gameTime).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const isGameLocked = (game) => {
    // Disable locking for testing - always return false
    return false;
    // Original logic: return game.picksLocked || new Date(game.gameTime) <= new Date();
  };


  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container mt-lg" style={{ maxWidth: '1400px' }}>
      <div className="mb-lg">
        <h1 className="text-2xl font-bold mb-sm">Week {currentWeek} Picks</h1>
        <p className="text-gray-600">
          Select your picks for each game. Remember, picks lock when games start!
        </p>
      </div>

      {/* Week Navigation */}
      <div className="flex justify-center gap-sm mb-lg">
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
            {i + 1}
          </button>
        ))}
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
        {games.map(game => {
          const userPick = userPicks[game.id];
          const locked = isGameLocked(game);
          const result = gameResults[game.id];
          
          return (
            <div key={game.id} className={`card ${locked ? 'opacity-75' : ''}`}>
              {locked && (
                <div className="text-center text-sm text-red-600 font-semibold mb-md">
                  🔒 LOCKED
                </div>
              )}
              
              {result?.isCompleted && (
                <div className="text-center text-sm font-semibold mb-md" style={{
                  color: result.isCorrect ? '#22c55e' : '#ef4444'
                }}>
                  {result.isCorrect ? '✅ CORRECT' : '❌ INCORRECT'} • {result.finalScore}
                </div>
              )}

              {/* Teams */}
              <div className="grid grid-cols-2 gap-sm">
                {/* Away Team */}
                <div>
                  <button
                    onClick={() => {
                      console.log('Away team clicked:', game.id, game.awayTeam.id);
                      console.log('Current userPick:', userPick);
                      if (!locked) handlePickChange(game.id, game.awayTeam.id);
                    }}
                    disabled={locked}
                    className={`w-full p-8 rounded-lg border-2 text-center transition-all ${
                      userPick?.pickedTeamId === game.awayTeam.id
                        ? 'font-bold'
                        : 'hover:border-gray-400'
                    } ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{
                      backgroundColor: (() => {
                        if (result?.isCompleted && userPick?.pickedTeamId === game.awayTeam.id) {
                          return result.isCorrect ? '#f0fdf4' : '#fef2f2'; // Green or red background
                        }
                        return userPick?.pickedTeamId === game.awayTeam.id ? '#FFF7ED' : 'white';
                      })(),
                      borderColor: (() => {
                        if (result?.isCompleted && userPick?.pickedTeamId === game.awayTeam.id) {
                          return result.isCorrect ? '#22c55e' : '#ef4444'; // Green or red border
                        }
                        return userPick?.pickedTeamId === game.awayTeam.id ? '#FA4616' : '#D1D5DB';
                      })(),
                      borderWidth: result?.isCompleted && userPick?.pickedTeamId === game.awayTeam.id ? '3px' : '2px',
                      minHeight: '160px',
                      height: '100%',
                      width: '300px'
                    }}
                  >
                    <div className="text-sm text-gray-500 font-medium mb-2">@ AWAY</div>
                    <div className="text-xl font-bold">
                      {game.awayTeam.abbreviation}
                    </div>
                    <div className="text-base text-gray-600">
                      {game.awayTeam.name}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">(0-0)</div>
                    {game.awayTeam.score !== null && (
                      <div className="text-xl font-bold mt-2">
                        {game.awayTeam.score}
                      </div>
                    )}
                  </button>
                  
                  {/* Away Team Injuries */}
                  <div className="mt-4 p-4 bg-red-50 rounded-md w-full">
                    <div className="text-sm font-semibold text-red-800 mb-2">🏥 INJURIES</div>
                    <div className="text-xs text-red-700">
                      {(() => {
                        console.log('Away team injuries:', game.awayTeamInjuries);
                        if (!game.awayTeamInjuries || game.awayTeamInjuries.length === 0) {
                          return 'No injuries reported';
                        }
                        
                        try {
                          return game.awayTeamInjuries.slice(0, 2).map(injury => {
                            if (!injury || !injury.playerName || !injury.status) {
                              return 'Injury data incomplete';
                            }
                            return `${injury.playerName} (${injury.position || 'N/A'}) - ${injury.status}`;
                          }).join(', ');
                        } catch (error) {
                          console.error('Error processing away team injuries:', error);
                          return 'Error loading injury data';
                        }
                      })()}
                    </div>
                  </div>
                </div>

                {/* Home Team */}
                <div>
                  <button
                    onClick={() => {
                      console.log('Home team clicked:', game.id, game.homeTeam.id);
                      console.log('Current userPick:', userPick);
                      if (!locked) handlePickChange(game.id, game.homeTeam.id);
                    }}
                    disabled={locked}
                    className={`w-full p-8 rounded-lg border-2 text-center transition-all ${
                      userPick?.pickedTeamId === game.homeTeam.id
                        ? 'font-bold'
                        : 'hover:border-gray-400'
                    } ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{
                      backgroundColor: (() => {
                        if (result?.isCompleted && userPick?.pickedTeamId === game.homeTeam.id) {
                          return result.isCorrect ? '#f0fdf4' : '#fef2f2'; // Green or red background
                        }
                        return userPick?.pickedTeamId === game.homeTeam.id ? '#FFF7ED' : 'white';
                      })(),
                      borderColor: (() => {
                        if (result?.isCompleted && userPick?.pickedTeamId === game.homeTeam.id) {
                          return result.isCorrect ? '#22c55e' : '#ef4444'; // Green or red border
                        }
                        return userPick?.pickedTeamId === game.homeTeam.id ? '#FA4616' : '#D1D5DB';
                      })(),
                      borderWidth: result?.isCompleted && userPick?.pickedTeamId === game.homeTeam.id ? '3px' : '2px',
                      minHeight: '160px',
                      height: '100%',
                      width: '300px'
                    }}
                  >
                    <div className="text-sm text-gray-500 font-medium mb-2">🏠 HOME</div>
                    <div className="text-xl font-bold">
                      {game.homeTeam.abbreviation}
                    </div>
                    <div className="text-base text-gray-600">
                      {game.homeTeam.name}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">(0-0)</div>
                    {game.homeTeam.score !== null && (
                      <div className="text-xl font-bold mt-2">
                        {game.homeTeam.score}
                      </div>
                    )}
                  </button>
                  
                  {/* Home Team Injuries */}
                  <div className="mt-4 p-4 bg-red-50 rounded-md w-full">
                    <div className="text-sm font-semibold text-red-800 mb-2">🏥 INJURIES</div>
                    <div className="text-xs text-red-700">
                      {(() => {
                        console.log('Home team injuries:', game.homeTeamInjuries);
                        if (!game.homeTeamInjuries || game.homeTeamInjuries.length === 0) {
                          return 'No injuries reported';
                        }
                        
                        try {
                          return game.homeTeamInjuries.slice(0, 2).map(injury => {
                            if (!injury || !injury.playerName || !injury.status) {
                              return 'Injury data incomplete';
                            }
                            return `${injury.playerName} (${injury.position || 'N/A'}) - ${injury.status}`;
                          }).join(', ');
                        } catch (error) {
                          console.error('Error processing home team injuries:', error);
                          return 'Error loading injury data';
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Details & Betting Info */}
              <div className="clear-both mt-xl space-y-2" style={{ marginTop: '4rem' }}>
                {/* Betting Odds */}
                {(game.spread || game.overUnder) && (
                  <div className="bg-blue-50 p-6 rounded-md text-center">
                    <div className="text-sm font-semibold text-blue-800 mb-3">📊 BETTING ODDS</div>
                    <div className="space-y-1 text-sm">
                      {game.spread && (
                        <div className="font-medium">
                          <span className="text-blue-700">
                            {game.spread > 0 
                              ? `${game.awayTeam.abbreviation} +${game.spread}` 
                              : `${game.homeTeam.abbreviation} ${game.spread}`}
                          </span>
                          <span className="text-gray-600 text-xs ml-1">
                            ({game.spread < 0 ? `${game.homeTeam.abbreviation} favored` : `${game.awayTeam.abbreviation} favored`})
                          </span>
                        </div>
                      )}
                      {game.overUnder && (
                        <div className="font-medium">
                          Over/Under: <span className="text-blue-700">{game.overUnder}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Game Status */}
                <div className="text-center text-sm">
                  {game.isFinal ? (
                    <div className="text-green-600 font-semibold bg-green-100 px-3 py-1 rounded-full inline-block">
                      ✅ FINAL
                    </div>
                  ) : (
                    <div className="text-blue-600 font-medium">
                      🕐 {formatGameTime(game.gameTime)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      <div className="text-center mt-xl">
        <button
          onClick={submitPicks}
          disabled={submitting || games.every(game => isGameLocked(game))}
          className="btn btn-primary btn-lg"
        >
          {submitting ? 'Submitting...' : 'Submit Picks'}
        </button>
        <p className="text-sm text-gray-600 mt-sm">
          You can change your picks until the games start
        </p>
      </div>
    </div>
  );
};

export default PicksPage;