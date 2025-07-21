import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const ProfilePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/leaderboard/user/${user.id}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
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