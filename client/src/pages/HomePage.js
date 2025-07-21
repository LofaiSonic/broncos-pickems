import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const HomePage = () => {
  const { isAuthenticated, loginWithReddit } = useAuth();

  return (
    <div>
      {/* Hero Section */}
      <div 
        className="py-20 text-center text-white"
        style={{ backgroundColor: 'var(--broncos-blue)' }}
      >
        <div className="container">
          <h1 className="text-4xl font-bold mb-md">
            🏈 Denver Broncos Pickems League
          </h1>
          <p className="text-xl mb-lg text-gray-300 max-w-2xl mx-auto">
            Join the ultimate NFL predictions game for Broncos fans. 
            Make your weekly picks, climb the leaderboard, and prove your football knowledge!
          </p>
          {!isAuthenticated ? (
            <button onClick={loginWithReddit} className="btn btn-primary btn-lg">
              Get Started - Login with Reddit
            </button>
          ) : (
            <Link to="/picks" className="btn btn-primary btn-lg">
              Make Your Picks
            </Link>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-xl">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            <div className="card text-center">
              <div className="text-4xl mb-md">🎯</div>
              <h3 className="text-lg mb-sm">Make Picks</h3>
              <p className="text-gray-600">
                Pick winners for every NFL game each week. Get points for correct predictions.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-md">🏆</div>
              <h3 className="text-lg mb-sm">Compete</h3>
              <p className="text-gray-600">
                Climb the weekly and season leaderboards. Earn bonus points for upset victories.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-md">👥</div>
              <h3 className="text-lg mb-sm">Community</h3>
              <p className="text-gray-600">
                Connect with fellow Broncos fans and share your predictions on Reddit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Week Preview */}
      <div className="py-16" style={{ backgroundColor: 'var(--broncos-light-gray)' }}>
        <div className="container">
          <div className="text-center mb-xl">
            <h2 className="text-2xl font-bold mb-sm">This Week's Action</h2>
            <p className="text-gray-600">
              Check out the leaderboard and see how the competition is heating up!
            </p>
          </div>
          <div className="flex justify-center gap-md">
            <Link to="/leaderboard" className="btn btn-secondary">
              View Leaderboard
            </Link>
            {isAuthenticated && (
              <Link to="/picks" className="btn btn-primary">
                Make Picks
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-lg text-center">
            <div className="card">
              <div className="text-2xl font-bold" style={{ color: 'var(--broncos-orange)' }}>
                Week 1
              </div>
              <p className="text-sm text-gray-600">Current Week</p>
            </div>
            <div className="card">
              <div className="text-2xl font-bold" style={{ color: 'var(--broncos-orange)' }}>
                16
              </div>
              <p className="text-sm text-gray-600">Games This Week</p>
            </div>
            <div className="card">
              <div className="text-2xl font-bold" style={{ color: 'var(--broncos-orange)' }}>
                0
              </div>
              <p className="text-sm text-gray-600">Active Players</p>
            </div>
            <div className="card">
              <div className="text-2xl font-bold" style={{ color: 'var(--broncos-orange)' }}>
                2024
              </div>
              <p className="text-sm text-gray-600">Season</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;