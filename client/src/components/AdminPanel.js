import React, { useState } from 'react';
import axios from 'axios';
import AutoUpdatesPanel from './AutoUpdatesPanel';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('updates');
  const [processing, setProcessing] = useState(false);

  const handleCompleteGames = async () => {
    if (!window.confirm('This will simulate game completions with random scores. Continue?')) {
      return;
    }

    try {
      setProcessing(true);
      const response = await axios.post('/test/complete-games');
      alert(`✅ Completed ${response.data.gamesCompleted || 0} games and calculated pick results`);
    } catch (error) {
      console.error('Error completing games:', error);
      alert('Error completing games. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const handleClearPicks = async () => {
    if (!window.confirm('This will delete ALL picks and reset games. This cannot be undone. Continue?')) {
      return;
    }

    try {
      setProcessing(true);
      const response = await axios.post('/test/clear-picks');
      alert('✅ All picks cleared and games reset');
    } catch (error) {
      console.error('Error clearing picks:', error);
      alert('Error clearing picks. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateGameTimes = async () => {
    if (!window.confirm('This will update all game times to be in the future for testing. Continue?')) {
      return;
    }

    try {
      setProcessing(true);
      const response = await axios.post('/test/update-game-times');
      alert(`✅ Updated ${response.data.gamesUpdated || 0} game times to be in the future`);
    } catch (error) {
      console.error('Error updating game times:', error);
      alert('Error updating game times. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const tabs = [
    { key: 'updates', label: 'Auto Updates', icon: '🤖' },
    { key: 'games', label: 'Game Management', icon: '🏈' },
    { key: 'data', label: 'Data Management', icon: '📊' }
  ];

  return (
    <div className="mt-8">
      <div className="card">
        <div className="border-b border-gray-200 mb-6">
          <h2 className="text-xl font-bold mb-4">⚙️ Admin Panel</h2>
          
          {/* Tab Navigation */}
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
                  activeTab === tab.key
                    ? 'border-orange-500 text-orange-600 bg-orange-50'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'updates' && <AutoUpdatesPanel />}
          
          {activeTab === 'games' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Game Testing Controls</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2">Complete Games</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Simulate game completions with random scores for testing the leaderboard
                  </p>
                  <button
                    onClick={handleCompleteGames}
                    disabled={processing}
                    className={`btn btn-primary w-full ${processing ? 'opacity-50' : ''}`}
                  >
                    {processing ? 'Processing...' : '🎯 Complete All Games'}
                  </button>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2">Reset Game Times</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Update all game times to be in the future for continued testing
                  </p>
                  <button
                    onClick={handleUpdateGameTimes}
                    disabled={processing}
                    className={`btn btn-secondary w-full ${processing ? 'opacity-50' : ''}`}
                  >
                    {processing ? 'Processing...' : '🕐 Update Game Times'}
                  </button>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2">Clear All Data</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Delete all picks and reset games to unmarked state
                  </p>
                  <button
                    onClick={handleClearPicks}
                    disabled={processing}
                    className={`btn btn-outline w-full border-red-300 text-red-600 hover:bg-red-50 ${processing ? 'opacity-50' : ''}`}
                  >
                    {processing ? 'Processing...' : '🗑️ Clear All Picks'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'data' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Data Management</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2">Database Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Users:</span>
                      <span className="font-medium">Loading...</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Picks:</span>
                      <span className="font-medium">Loading...</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Games:</span>
                      <span className="font-medium">Loading...</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Games:</span>
                      <span className="font-medium">Loading...</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2">System Health</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Database Connected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">API Responsive</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Auto Updates Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;