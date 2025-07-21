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

  useEffect(() => {
    fetchGamesAndPicks();
  }, [currentWeek]);

  const fetchGamesAndPicks = async () => {
    try {
      setLoading(true);
      const [gamesResponse, picksResponse] = await Promise.all([
        axios.get(`/api/games/week/${currentWeek}`),
        axios.get(`/api/games/week/${currentWeek}/picks`)
      ]);
      
      setGames(gamesResponse.data);
      setUserPicks(picksResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickChange = (gameId, teamId) => {
    setUserPicks(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        pickedTeamId: teamId
      }
    }));
  };

  const submitPicks = async () => {
    try {
      setSubmitting(true);
      
      const picks = Object.entries(userPicks)
        .filter(([_, pick]) => pick.pickedTeamId)
        .map(([gameId, pick]) => ({
          gameId: parseInt(gameId),
          pickedTeamId: pick.pickedTeamId,
          confidencePoints: 1
        }));

      await axios.post('/api/picks', { picks });
      
      // Refresh data to show updated picks
      await fetchGamesAndPicks();
      
      alert('Picks submitted successfully!');
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
    return game.picksLocked || new Date(game.gameTime) <= new Date();
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        {games.map(game => {
          const userPick = userPicks[game.id];
          const locked = isGameLocked(game);
          
          return (
            <div key={game.id} className={`card ${locked ? 'opacity-75' : ''}`}>
              {/* Game Time */}
              <div className="text-center text-sm text-gray-600 mb-md">
                {formatGameTime(game.gameTime)}
                {locked && (
                  <span className="ml-2 text-red-600 font-semibold">🔒 LOCKED</span>
                )}
              </div>

              {/* Teams */}
              <div className="grid grid-cols-2 gap-md">
                {/* Away Team */}
                <button
                  onClick={() => !locked && handlePickChange(game.id, game.awayTeam.id)}
                  disabled={locked}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    userPick?.pickedTeamId === game.awayTeam.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="text-lg font-semibold">
                    {game.awayTeam.abbreviation}
                  </div>
                  <div className="text-sm text-gray-600">
                    {game.awayTeam.name}
                  </div>
                  {game.awayTeam.score !== null && (
                    <div className="text-xl font-bold mt-2">
                      {game.awayTeam.score}
                    </div>
                  )}
                </button>

                {/* Home Team */}
                <button
                  onClick={() => !locked && handlePickChange(game.id, game.homeTeam.id)}
                  disabled={locked}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    userPick?.pickedTeamId === game.homeTeam.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="text-lg font-semibold">
                    {game.homeTeam.abbreviation}
                  </div>
                  <div className="text-sm text-gray-600">
                    {game.homeTeam.name}
                  </div>
                  {game.homeTeam.score !== null && (
                    <div className="text-xl font-bold mt-2">
                      {game.homeTeam.score}
                    </div>
                  )}
                </button>
              </div>

              {/* Game Details */}
              <div className="mt-md text-center text-sm text-gray-600">
                {game.spread && (
                  <span>Spread: {game.spread} | </span>
                )}
                {game.overUnder && (
                  <span>O/U: {game.overUnder}</span>
                )}
                {game.isFinal && (
                  <div className="text-green-600 font-semibold mt-2">FINAL</div>
                )}
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