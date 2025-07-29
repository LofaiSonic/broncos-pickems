import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
// import InjuryReportCard from '../components/InjuryReportCard';
import GamePickModal from '../components/GamePickModal';

const PicksPage = () => {
  const { week } = useParams();
  const [games, setGames] = useState([]);
  const [userPicks, setUserPicks] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(week || 'pre1');
  const [seasonType, setSeasonType] = useState(1); // 1=Preseason, 2=Regular Season
  
  // Modal state - default to closed, opens when user clicks "Make Your Picks"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalGameIndex, setModalGameIndex] = useState(0);
  
  // Ref for week navigation scroll container
  const weekScrollRef = useRef(null);

  const fetchGamesAndPicks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/games/week/${currentWeek}/picks`);
      
      // Transform the API response to match our component structure
      const gamesData = response.data.map(game => {
        // Debug logging for injury data
        console.log(`Game ${game.id}: Home ${game.home_team_name} has ${game.home_team_injuries?.length || 0} injuries`);
        console.log(`Game ${game.id}: Away ${game.away_team_name} has ${game.away_team_injuries?.length || 0} injuries`);
        
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
          homeTeamRecord: game.home_team_record,
          awayTeamRecord: game.away_team_record,
          spread: game.spread,
          overUnder: game.over_under,
          tvChannel: game.tv_channel,
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
            confidencePoints: game.confidence_points || 1,
            isCorrect: game.is_correct,
            pointsEarned: game.points_earned
          };
        }
      });
      
      
      setGames(gamesData);
      setUserPicks(picksData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWeek]);

  useEffect(() => {
    fetchGamesAndPicks();
  }, [fetchGamesAndPicks]);

  // Scroll to selected week after component updates
  useEffect(() => {
    scrollToSelectedWeek(currentWeek);
  }, [currentWeek, seasonType]);

  // Prevent modal index from being invalid when games data changes
  useEffect(() => {
    if (games.length > 0 && modalGameIndex >= games.length) {
      // If modal index is beyond the new games array, clamp to last valid index
      setModalGameIndex(games.length - 1);
    }
  }, [games.length, modalGameIndex]);

  const handlePickChange = async (gameId, teamId) => {
    // Check if game is locked before attempting to submit
    const game = games.find(g => g.id === parseInt(gameId));
    if (game && isGameLocked(game)) {
      alert('This game has already started or ended. Picks are locked.');
      return;
    }

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
      
      // Show specific error message if available
      if (error.response?.status === 400 && error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        alert('Error submitting pick. Please try again.');
      }
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

  const formatDateHeader = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTimeOnly = (gameTime) => {
    return new Date(gameTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  // Group games by date
  const groupGamesByDate = (games) => {
    const grouped = {};
    games.forEach(game => {
      const dateKey = new Date(game.gameTime).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(game);
    });
    return grouped;
  };

  const getWeekDisplayName = (week, seasonType) => {
    if (seasonType === 1) { // Preseason
      switch (week) {
        case 'pre1': return 'Hall of Fame Weekend';
        case 'pre2': return 'Preseason Week 1';
        case 'pre3': return 'Preseason Week 2';
        case 'pre4': return 'Preseason Week 3';
        default: return `Preseason ${week}`;
      }
    } else {
      return `Week ${week}`;
    }
  };

  const getSeasonTypeDisplayName = (seasonType) => {
    switch (seasonType) {
      case 1: return 'Preseason';
      case 2: return 'Regular Season';
      case 3: return 'Postseason';
      default: return 'Season';
    }
  };

  const getAvailableWeeks = (seasonType) => {
    if (seasonType === 1) { // Preseason
      return [
        { value: 'pre1', label: 'HOF Weekend' },
        { value: 'pre2', label: 'Pre Wk 1' },
        { value: 'pre3', label: 'Pre Wk 2' },
        { value: 'pre4', label: 'Pre Wk 3' }
      ];
    } else { // Regular season
      return Array.from({ length: 18 }, (_, i) => ({
        value: (i + 1).toString(),
        label: `Week ${i + 1}`
      }));
    }
  };

  const isGameLocked = (game) => {
    // Game is locked if it's marked as locked OR if the game time has passed
    return game.picksLocked || new Date(game.gameTime) <= new Date();
  };

  // Function to scroll selected week into view
  const scrollToSelectedWeek = (weekValue) => {
    if (weekScrollRef.current) {
      const selectedButton = weekScrollRef.current.querySelector(`button[data-week="${weekValue}"]`);
      if (selectedButton) {
        selectedButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  };

  // Enhanced week change handler
  const handleWeekChange = (weekValue) => {
    setCurrentWeek(weekValue.toString());
    // Close modal when changing weeks to prevent confusion
    if (isModalOpen) {
      setIsModalOpen(false);
    }
    // Small delay to allow state update before scrolling
    setTimeout(() => scrollToSelectedWeek(weekValue.toString()), 100);
  };



  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-lg px-2 sm:px-4" style={{ maxWidth: '100%' }}>
      <div className="mb-lg">
        <h1 className="text-2xl font-bold mb-sm">
          {getWeekDisplayName(currentWeek, seasonType)} Picks
        </h1>
        <p className="text-gray-600">
          Select your picks for each game. {seasonType === 1 ? 'Preseason games are great for testing!' : 'Remember, picks lock when games start!'}
        </p>
      </div>

      {/* Season Type Toggle */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => {
            setSeasonType(1);
            setCurrentWeek('pre1'); // Start with Hall of Fame Weekend
            if (isModalOpen) setIsModalOpen(false); // Close modal when switching seasons
          }}
          className={`btn ${seasonType === 1 ? 'btn-primary' : 'btn-outline'}`}
        >
          🏈 Preseason
        </button>
        <button
          onClick={() => {
            setSeasonType(2);
            setCurrentWeek('1'); // Start with Week 1
            if (isModalOpen) setIsModalOpen(false); // Close modal when switching seasons
          }}
          className={`btn ${seasonType === 2 ? 'btn-primary' : 'btn-outline'}`}
        >
          📅 Regular Season
        </button>
      </div>

      {/* Week Navigation */}
      <div className="mb-lg mt-xl">
        <div 
          ref={weekScrollRef}
          className="flex gap-sm pb-2 mb-4 week-selector-scroll"
          style={{
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            paddingTop: '1rem',
            paddingBottom: '0.5rem'
          }}
        >
          {getAvailableWeeks(seasonType).map((week) => (
            <button
              key={week.value}
              data-week={week.value.toString()}
              onClick={() => handleWeekChange(week.value)}
              className={`btn btn-sm ${
                currentWeek === week.value.toString() 
                  ? 'btn-primary' 
                  : 'btn-outline'
              }`}
              style={{
                minWidth: '120px',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                padding: '12px 20px'
              }}
            >
              {week.label}
            </button>
          ))}
        </div>
        {/* Mobile scroll hint */}
        {seasonType === 2 && (
          <div 
            className="text-center text-sm text-gray-500"
            style={{
              display: window.innerWidth < 768 ? 'block' : 'none'
            }}
          >
            ← Swipe to see more weeks →
          </div>
        )}
      </div>

      {/* Season Type Info */}
      <div className={`text-center mb-6 p-3 rounded-lg ${
        seasonType === 1 
          ? 'bg-blue-50 border border-blue-200 text-blue-800' 
          : 'bg-green-50 border border-green-200 text-green-800'
      }`}>
        <div className="font-semibold">
          {getSeasonTypeDisplayName(seasonType)} - {getWeekDisplayName(currentWeek, seasonType)}
        </div>
        <div className="text-sm mt-1">
          {seasonType === 1 
            ? 'Preseason games are perfect for testing the system with real users before the regular season begins!'
            : 'Regular season games count towards your final standings and season rankings.'
          }
        </div>
      </div>

      {/* Make Picks Button */}
      {!isModalOpen && games.length > 0 && (
        <div className="text-center mb-8">
          <button
            onClick={() => {
              setModalGameIndex(0);
              setIsModalOpen(true);
            }}
            className="btn btn-primary btn-lg px-8 py-4 text-lg font-bold" style={{
              background: 'linear-gradient(135deg, #FB4D00 0%, #002244 100%)',
              border: '3px solid #FB4D00',
              borderRadius: '12px',
              color: 'white',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              boxShadow: '0 8px 16px rgba(251,77,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)',
              transform: 'translateY(0)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 24px rgba(251,77,0,0.4), inset 0 2px 4px rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 16px rgba(251,77,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)';
            }}
          >
            🏈 Make your picks!
          </button>
        </div>
      )}

      {/* Main Game Display - NFL.com Style */}
      {!isModalOpen && games.length > 0 && (
        <div className="space-y-8">
          {Object.entries(groupGamesByDate(games)).map(([dateKey, dateGames]) => (
            <div key={dateKey} className="bg-white rounded-2xl shadow-2xl border-2 border-orange-200 overflow-hidden" style={{
              background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
              boxShadow: '20px 20px 40px #d1d5db, -20px -20px 40px #ffffff'
            }}>
              {/* Date Header */}
              <div className="px-8 py-5 rounded-t-2xl" style={{
                background: 'linear-gradient(135deg, #FB4D00 0%, #002244 100%)',
                boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.2)'
              }}>
                <h3 className="text-xl font-bold text-center" style={{
                  color: '#FFFFFF',
                  textShadow: '3px 3px 6px rgba(0,0,0,0.9), 1px 1px 3px rgba(0,0,0,0.8)'
                }}>
                  {formatDateHeader(dateGames[0].gameTime)}
                </h3>
              </div>
              
              {/* Games Table */}
              <div className="overflow-x-auto w-full p-2 sm:p-4">
                <div className="flex justify-center min-w-full">
                  <table className="border-collapse rounded-xl" style={{
                  borderSpacing: 0,
                  border: '2px solid #FB4D00',
                  borderRadius: '12px',
                  background: 'linear-gradient(145deg, #ffffff, #fef7f0)',
                  boxShadow: 'inset 2px 2px 5px rgba(251,77,0,0.1), inset -2px -2px 5px rgba(0,34,68,0.1)'
                }}>
                  <thead>
                    <tr style={{
                      background: 'linear-gradient(145deg, #002244, #003366)',
                      boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.3)'
                    }}>
                      <th className="px-6 py-6 text-center text-sm font-bold uppercase tracking-wider" style={{
                        border: '2px solid #FB4D00',
                        borderRadius: '8px 0 0 0',
                        color: '#FFFFFF',
                        textShadow: '3px 3px 6px rgba(0,0,0,0.9), 1px 1px 3px rgba(0,0,0,0.8)',
                        width: '140px'
                      }}>Time</th>
                      <th className="px-8 py-6 text-left text-sm font-bold uppercase tracking-wider" style={{
                        border: '2px solid #FB4D00',
                        color: '#FFFFFF',
                        textShadow: '3px 3px 6px rgba(0,0,0,0.9), 1px 1px 3px rgba(0,0,0,0.8)',
                        width: '300px'
                      }}>Away Team</th>
                      <th className="px-4 py-6 text-center text-sm font-bold uppercase tracking-wider" style={{
                        border: '2px solid #FB4D00',
                        color: '#FFFFFF',
                        textShadow: '3px 3px 6px rgba(0,0,0,0.9), 1px 1px 3px rgba(0,0,0,0.8)',
                        width: '80px'
                      }}>@</th>
                      <th className="px-8 py-6 text-left text-sm font-bold uppercase tracking-wider" style={{
                        border: '2px solid #FB4D00',
                        color: '#FFFFFF',
                        textShadow: '3px 3px 6px rgba(0,0,0,0.9), 1px 1px 3px rgba(0,0,0,0.8)',
                        width: '300px'
                      }}>Home Team</th>
                      <th className="px-6 py-6 text-center text-sm font-bold uppercase tracking-wider" style={{
                        border: '2px solid #FB4D00',
                        borderRadius: '0 8px 0 0',
                        color: '#FFFFFF',
                        textShadow: '3px 3px 6px rgba(0,0,0,0.9), 1px 1px 3px rgba(0,0,0,0.8)',
                        width: '180px'
                      }}>Your Pick</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateGames.map((game, index) => {
                      const userPick = userPicks[game.id];
                      const locked = isGameLocked(game);
                      const isEvenRow = index % 2 === 0;
                      
                      return (
                        <tr key={game.id} className={`${locked ? 'opacity-75' : ''} transition-all duration-300`} style={{
                          background: isEvenRow 
                            ? 'linear-gradient(145deg, #ffffff, #fef9f5)' 
                            : 'linear-gradient(145deg, #fef9f5, #fed7cc)',
                          boxShadow: isEvenRow 
                            ? 'inset 1px 1px 3px rgba(251,77,0,0.05)' 
                            : 'inset 1px 1px 3px rgba(251,77,0,0.1)'
                        }} onMouseEnter={(e) => {
                          e.target.parentElement.style.background = 'linear-gradient(145deg, #fef2e7, #fb9d7a)';
                          e.target.parentElement.style.transform = 'scale(1.002)';
                        }} onMouseLeave={(e) => {
                          e.target.parentElement.style.background = isEvenRow 
                            ? 'linear-gradient(145deg, #ffffff, #fef9f5)' 
                            : 'linear-gradient(145deg, #fef9f5, #fed7cc)';
                          e.target.parentElement.style.transform = 'scale(1)';
                        }}>
                          {/* Time */}
                          <td className="px-6 py-7 text-center align-middle" style={{
                            border: '2px solid #FB4D00',
                            borderRadius: '8px',
                            margin: '4px',
                            width: '140px'
                          }}>
                            <div className="text-base font-bold">
                              {game.isFinal ? (
                                <span className="inline-block px-4 py-2 rounded-full text-sm font-bold border-2" style={{
                                  background: 'linear-gradient(145deg, #10b981, #059669)',
                                  color: 'white',
                                  borderColor: '#065f46',
                                  boxShadow: '2px 2px 6px rgba(16,185,129,0.3), inset 1px 1px 2px rgba(255,255,255,0.2)',
                                  textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                                }}>FINAL</span>
                              ) : (
                                <span className="font-bold" style={{ color: '#002244' }}>{formatTimeOnly(game.gameTime)}</span>
                              )}
                            </div>
                          </td>
                          
                          {/* Away Team */}
                          <td className="px-8 py-7 align-middle" style={{
                            border: '2px solid #FB4D00',
                            borderRadius: '8px',
                            margin: '4px',
                            width: '300px'
                          }}>
                            <div className="flex items-center justify-between">
                              <div className="text-lg font-bold" style={{ color: '#002244' }}>
                                {game.awayTeam.name}
                              </div>
                              {game.awayTeam.score !== null && (
                                <div className="text-2xl font-black ml-6 px-3 py-1 rounded-lg" style={{
                                  color: '#FB4D00',
                                  background: 'linear-gradient(145deg, #fef7f0, #fed7cc)',
                                  boxShadow: '2px 2px 6px rgba(251,77,0,0.2)',
                                  textShadow: '1px 1px 2px rgba(0,34,68,0.3)'
                                }}>
                                  {game.awayTeam.score}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* @ Symbol */}
                          <td className="px-4 py-7 text-center align-middle" style={{
                            border: '2px solid #FB4D00',
                            borderRadius: '8px',
                            margin: '4px',
                            width: '80px'
                          }}>
                            <span className="text-2xl font-black" style={{
                              color: '#FB4D00',
                              textShadow: '2px 2px 4px rgba(0,34,68,0.3)'
                            }}>@</span>
                          </td>
                          
                          {/* Home Team */}
                          <td className="px-8 py-7 align-middle" style={{
                            border: '2px solid #FB4D00',
                            borderRadius: '8px',
                            margin: '4px',
                            width: '300px'
                          }}>
                            <div className="flex items-center justify-between">
                              <div className="text-lg font-bold" style={{ color: '#002244' }}>
                                {game.homeTeam.name}
                              </div>
                              {game.homeTeam.score !== null && (
                                <div className="text-2xl font-black ml-6 px-3 py-1 rounded-lg" style={{
                                  color: '#FB4D00',
                                  background: 'linear-gradient(145deg, #fef7f0, #fed7cc)',
                                  boxShadow: '2px 2px 6px rgba(251,77,0,0.2)',
                                  textShadow: '1px 1px 2px rgba(0,34,68,0.3)'
                                }}>
                                  {game.homeTeam.score}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* Your Pick */}
                          <td 
                            className="px-6 py-7 text-center align-middle"
                            style={{
                              border: '2px solid #FB4D00',
                              borderRadius: '8px',
                              margin: '4px',
                              width: '180px',
                              cursor: locked ? 'not-allowed' : 'pointer',
                              opacity: locked ? 0.7 : 1,
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => {
                              if (!locked) {
                                const gameIndex = games.findIndex(g => g.id === game.id);
                                setModalGameIndex(gameIndex);
                                setIsModalOpen(true);
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (!locked) {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(251,77,0,0.3)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            {userPick ? (
                              <div className="flex items-center justify-center" title={locked ? "Game has started - picks are locked" : "Click to change your pick"}>
                                <span className={`inline-flex items-center px-4 py-3 rounded-xl text-base font-bold border-2 ${
                                  game.isFinal && userPick.isCorrect
                                    ? ''
                                    : game.isFinal && !userPick.isCorrect
                                    ? ''
                                    : ''
                                }`} style={{
                                  background: game.isFinal && userPick.isCorrect
                                    ? 'linear-gradient(145deg, #10b981, #059669)'
                                    : game.isFinal && !userPick.isCorrect
                                    ? 'linear-gradient(145deg, #ef4444, #dc2626)'
                                    : 'linear-gradient(145deg, #002244, #003366)',
                                  color: 'white',
                                  borderColor: '#FB4D00',
                                  boxShadow: '3px 3px 8px rgba(0,0,0,0.2), inset 1px 1px 3px rgba(255,255,255,0.2)',
                                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                                  pointerEvents: 'none'
                                }}>
                                  {userPick.pickedTeamId === game.homeTeam.id ? game.homeTeam.abbreviation : game.awayTeam.abbreviation}
                                  {game.isFinal && (
                                    <span className="ml-2 text-lg font-black">
                                      {userPick.isCorrect ? '✓' : '✗'}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ) : (
                              <div className="text-2xl font-bold" style={{ color: '#FB4D00', pointerEvents: 'none' }} title={locked ? "Game has started - picks are locked" : "Click to make your pick"}>—</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          ))}
          
          {/* Additional picks button removed - now at top */}
        </div>
      )}


      {/* Game Pick Modal */}
      <GamePickModal
        games={games}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentGameIndex={modalGameIndex}
        onGameIndexChange={setModalGameIndex}
        userPicks={userPicks}
        onPickChange={handlePickChange}
        formatGameTime={formatGameTime}
      />
    </div>
  );
};

export default PicksPage;