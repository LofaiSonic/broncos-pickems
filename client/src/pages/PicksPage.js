import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import InjuryReportCard from '../components/InjuryReportCard';

const PicksPage = () => {
  const { week } = useParams();
  const [games, setGames] = useState([]);
  const [userPicks, setUserPicks] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(week || 'pre1');
  const [seasonType, setSeasonType] = useState(1); // 1=Preseason, 2=Regular Season

  useEffect(() => {
    fetchGamesAndPicks();
  }, [currentWeek, seasonType]);

  const fetchGamesAndPicks = async () => {
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
    // Disable locking for testing - always return false
    return false;
    // Original logic: return game.picksLocked || new Date(game.gameTime) <= new Date();
  };

  const getTeamButtonStyling = (game, teamId, userPick) => {
    const isSelected = userPick?.pickedTeamId === teamId;
    const isGameCompleted = game.isFinal && userPick;
    
    // Base styles
    let className = `w-full p-8 rounded-lg border-2 text-center transition-all `;
    let styles = {
      minHeight: '160px',
      height: '100%'
    };
    
    if (isGameCompleted && isSelected) {
      // Game is completed and this team was picked
      if (userPick.isCorrect) {
        // Correct pick - green styling
        className += 'border-green-500 bg-green-100 font-bold';
        styles.backgroundColor = '#F0FDF4';
        styles.borderColor = '#22C55E';
      } else {
        // Incorrect pick - red styling
        className += 'border-red-500 bg-red-100 font-bold';
        styles.backgroundColor = '#FEF2F2';
        styles.borderColor = '#EF4444';
      }
    } else if (isSelected) {
      // Selected but game not completed - orange styling
      className += 'border-orange-500 bg-orange-50 font-bold';
      styles.backgroundColor = '#FFF7ED';
      styles.borderColor = '#FA4616';
    } else {
      // Not selected - default styling
      className += 'border-gray-300 hover:border-gray-400';
      styles.backgroundColor = 'white';
      styles.borderColor = '#D1D5DB';
    }
    
    const locked = isGameLocked(game);
    if (locked) {
      className += ' cursor-not-allowed';
    } else {
      className += ' cursor-pointer';
    }
    
    return { className, styles };
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
          }}
          className={`btn ${seasonType === 1 ? 'btn-primary' : 'btn-outline'}`}
        >
          🏈 Preseason
        </button>
        <button
          onClick={() => {
            setSeasonType(2);
            setCurrentWeek('1'); // Start with Week 1
          }}
          className={`btn ${seasonType === 2 ? 'btn-primary' : 'btn-outline'}`}
        >
          📅 Regular Season
        </button>
      </div>

      {/* Week Navigation */}
      <div className="flex flex-wrap justify-center gap-sm mb-lg">
        {getAvailableWeeks(seasonType).map((week) => (
          <button
            key={week.value}
            onClick={() => setCurrentWeek(week.value.toString())}
            className={`btn btn-sm ${
              currentWeek === week.value.toString() 
                ? 'btn-primary' 
                : 'btn-outline'
            }`}
          >
            {week.label}
          </button>
        ))}
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

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
        {games.map(game => {
          const userPick = userPicks[game.id];
          const locked = isGameLocked(game);
          
          return (
            <div key={game.id} className={`card ${locked ? 'opacity-75' : ''}`} style={{minWidth: '300px', width: '100%'}}>
              {locked && (
                <div className="text-center text-sm text-red-600 font-semibold mb-md">
                  🔒 LOCKED
                </div>
              )}

              {/* Teams with Date in Middle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm items-start">
                {/* Home Team (Left) */}
                <div>
                  {(() => {
                    const { className, styles } = getTeamButtonStyling(game, game.homeTeam.id, userPick);
                    return (
                      <button
                        onClick={() => {
                          if (!locked) handlePickChange(game.id, game.homeTeam.id);
                        }}
                        disabled={locked}
                        className={className}
                        style={styles}
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
                    );
                  })()}
                  
                  {/* Home Team Injuries */}
                  <InjuryReportCard 
                    injuries={game.homeTeamInjuries} 
                    teamName={game.homeTeam.name}
                    teamType="home"
                  />
                </div>

                {/* Game Date/Time (Center) */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: 'fit-content'}}>
                  <div className="text-2xl font-bold text-gray-500" style={{marginBottom: '16px'}}>
                    VS
                  </div>
                  
                  <div style={{marginBottom: '16px'}}>
                    {game.isFinal ? (
                      <div className="text-green-600 font-bold text-sm bg-green-100 px-2 py-1 rounded">
                        ✅ FINAL
                      </div>
                    ) : (
                      <div className="text-xs text-gray-700 font-medium leading-tight">
                        {formatGameTime(game.gameTime)}
                      </div>
                    )}
                  </div>
                  
                  {/* Betting Odds */}
                  {(game.spread || game.overUnder) && (
                    <div style={{textAlign: 'center'}}>
                      <div className="text-xs font-semibold text-blue-800" style={{marginBottom: '8px'}}>📊 ODDS</div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                        {game.spread && (
                          <div className="font-medium text-blue-700 text-xs">
                            {game.spread > 0 
                              ? `${game.awayTeam.abbreviation} +${game.spread}` 
                              : `${game.homeTeam.abbreviation} ${game.spread}`}
                          </div>
                        )}
                        {game.overUnder && (
                          <div className="font-medium text-blue-700 text-xs">
                            O/U: {game.overUnder}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Away Team (Right) */}
                <div>
                  {(() => {
                    const { className, styles } = getTeamButtonStyling(game, game.awayTeam.id, userPick);
                    return (
                      <button
                        onClick={() => {
                          if (!locked) handlePickChange(game.id, game.awayTeam.id);
                        }}
                        disabled={locked}
                        className={className}
                        style={styles}
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
                    );
                  })()}
                  
                  {/* Away Team Injuries */}
                  <InjuryReportCard 
                    injuries={game.awayTeamInjuries} 
                    teamName={game.awayTeam.name}
                    teamType="away"
                  />
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