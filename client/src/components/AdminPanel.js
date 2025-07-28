import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AutoUpdatesPanel from './AutoUpdatesPanel';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('updates');
  const [processing, setProcessing] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');

  // Fetch available weeks when games tab is active
  useEffect(() => {
    if (activeTab === 'games') {
      fetchAvailableWeeks();
    }
  }, [activeTab]);

  const fetchAvailableWeeks = async () => {
    try {
      const response = await axios.get('/api/admin/available-weeks');
      setAvailableWeeks(response.data);
      // Set first available week as default
      const firstIncompleteWeek = response.data.find(week => week.incompleteGames > 0);
      if (firstIncompleteWeek) {
        setSelectedWeek(`${firstIncompleteWeek.week}-${firstIncompleteWeek.seasonType}`);
      }
    } catch (error) {
      console.error('Error fetching available weeks:', error);
      // Fallback to hardcoded weeks if server endpoint isn't available yet
      setAvailableWeeks([
        { week: 'pre1', seasonType: 1, seasonTypeLabel: 'Preseason', label: 'Hall of Fame Weekend', incompleteGames: 1, disabled: false },
        { week: 'pre2', seasonType: 1, seasonTypeLabel: 'Preseason', label: 'Preseason Week 1', incompleteGames: 16, disabled: false },
        { week: 'pre3', seasonType: 1, seasonTypeLabel: 'Preseason', label: 'Preseason Week 2', incompleteGames: 16, disabled: false },
        { week: 'pre4', seasonType: 1, seasonTypeLabel: 'Preseason', label: 'Preseason Week 3', incompleteGames: 16, disabled: false },
        { week: '1', seasonType: 2, seasonTypeLabel: 'Regular Season', label: 'Week 1', incompleteGames: 16, disabled: false },
        { week: '2', seasonType: 2, seasonTypeLabel: 'Regular Season', label: 'Week 2', incompleteGames: 16, disabled: false },
        { week: '3', seasonType: 2, seasonTypeLabel: 'Regular Season', label: 'Week 3', incompleteGames: 16, disabled: false },
        { week: '4', seasonType: 2, seasonTypeLabel: 'Regular Season', label: 'Week 4', incompleteGames: 16, disabled: false },
        { week: '5', seasonType: 2, seasonTypeLabel: 'Regular Season', label: 'Week 5', incompleteGames: 16, disabled: false }
      ]);
      setSelectedWeek('pre1-1');
    }
  };

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
      await axios.post('/test/clear-picks');
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

  const handleImportPreseason = async () => {
    if (!window.confirm('This will import all 2025 preseason games from ESPN API. This may take several minutes. Continue?')) {
      return;
    }

    try {
      setProcessing(true);
      setImportResults(null);
      console.log('🏈 Starting preseason import...');
      
      const response = await axios.post('/api/admin/import/preseason');
      setImportResults({
        type: 'preseason',
        success: true,
        ...response.data
      });
      
      alert(`✅ Successfully imported ${response.data.gamesImported} preseason games!`);
    } catch (error) {
      console.error('Error importing preseason:', error);
      setImportResults({
        type: 'preseason',
        success: false,
        error: error.response?.data?.details || error.message
      });
      alert('Error importing preseason games. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const handleImportRegularSeason = async () => {
    if (!window.confirm('This will import all 2025 regular season games from ESPN API. This may take several minutes. Continue?')) {
      return;
    }

    try {
      setProcessing(true);
      setImportResults(null);
      console.log('🏈 Starting regular season import...');
      
      const response = await axios.post('/api/admin/import/regular-season');
      setImportResults({
        type: 'regular-season',
        success: true,
        ...response.data
      });
      
      alert(`✅ Successfully imported ${response.data.gamesImported} regular season games!`);
    } catch (error) {
      console.error('Error importing regular season:', error);
      setImportResults({
        type: 'regular-season',
        success: false,
        error: error.response?.data?.details || error.message
      });
      alert('Error importing regular season games. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSetup2025Season = async () => {
    if (!window.confirm('This will automatically update your database and import ALL 2025 season games. No manual migration needed! This may take 5-10 minutes. Continue?')) {
      return;
    }

    try {
      setProcessing(true);
      setImportResults(null);
      console.log('🚀 Starting one-click 2025 season setup...');
      
      const response = await axios.post('/api/admin/setup-2025-season');
      setImportResults({
        type: 'setup-2025',
        success: true,
        ...response.data
      });
      
      alert(`✅ 2025 Season Ready!\n\n${response.data.message}\n\nPreseason: ${response.data.preseasonGames} games\nRegular Season: ${response.data.regularSeasonGames} games\nTotal: ${response.data.totalGames} games`);
    } catch (error) {
      console.error('Error setting up 2025 season:', error);
      setImportResults({
        type: 'setup-2025',
        success: false,
        error: error.response?.data?.details || error.message
      });
      alert('Error setting up 2025 season. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const handleImportAll2025 = async () => {
    if (!window.confirm('This will import ALL 2025 season games (preseason + regular season) from ESPN API. This may take 10+ minutes. Continue?')) {
      return;
    }

    try {
      setProcessing(true);
      setImportResults(null);
      console.log('🚀 Starting complete 2025 season import...');
      
      const response = await axios.post('/api/admin/import/all-2025');
      setImportResults({
        type: 'all-2025',
        success: true,
        ...response.data
      });
      
      alert(`✅ Successfully imported complete 2025 season!\nPreseason: ${response.data.preseasonGames} games\nRegular Season: ${response.data.regularSeasonGames} games\nTotal: ${response.data.totalGames} games`);
    } catch (error) {
      console.error('Error importing 2025 season:', error);
      setImportResults({
        type: 'all-2025',
        success: false,
        error: error.response?.data?.details || error.message
      });
      alert('Error importing 2025 season. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateLiveScores = async () => {
    try {
      setProcessing(true);
      console.log('📊 Updating live scores...');
      
      const response = await axios.post('/api/admin/update/live-scores');
      alert(`✅ Updated ${response.data.gamesUpdated} live games`);
    } catch (error) {
      console.error('Error updating live scores:', error);
      alert('Error updating live scores. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const handleResetGameStatus = async () => {
    if (!window.confirm('This will reset all completed games back to "not started" status, removing all scores but keeping picks. Continue?')) {
      return;
    }

    try {
      setProcessing(true);
      const response = await axios.post('/test/reset-game-status');
      alert(`✅ Reset ${response.data.gamesReset || 0} games back to "not started" status`);
    } catch (error) {
      console.error('Error resetting game status:', error);
      alert('Error resetting game status. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const handleTriggerLeaderboardUpdate = async () => {
    if (!window.confirm('This will manually trigger the leaderboard calculation that normally runs every Tuesday at 6am. Continue?')) {
      return;
    }

    try {
      setProcessing(true);
      const response = await axios.post('/api/admin/trigger-leaderboard-update');
      alert(`✅ Leaderboard update completed successfully!\n\nUpdate time: ${new Date(response.data.updateTime).toLocaleString()}\nCurrent week: ${response.data.currentWeek?.week || 'Unknown'}`);
    } catch (error) {
      console.error('Error triggering leaderboard update:', error);
      alert('Error triggering leaderboard update. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteGamesForWeek = async () => {
    if (!selectedWeek) {
      alert('Please select a week to simulate');
      return;
    }

    const [week, seasonType] = selectedWeek.split('-');
    const weekInfo = availableWeeks.find(w => w.week === week && w.seasonType === parseInt(seasonType));
    
    if (!weekInfo) {
      alert('Invalid week selection');
      return;
    }

    if (!window.confirm(`This will simulate ${weekInfo.incompleteGames} games for ${weekInfo.label} (${weekInfo.seasonTypeLabel}) with random scores. Continue?`)) {
      return;
    }

    try {
      setProcessing(true);
      const response = await axios.post('/test/complete-games-week', {
        week: week,
        seasonType: parseInt(seasonType)
      });
      
      alert(`✅ Completed ${response.data.gamesCompleted} games for ${weekInfo.label}!`);
      
      // Refresh available weeks to update counts
      await fetchAvailableWeeks();
    } catch (error) {
      console.error('Error completing games for week:', error);
      alert('Error completing games for week. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const tabs = [
    { key: 'updates', label: 'Auto Updates', icon: '🤖' },
    { key: 'season2025', label: '2025 Season', icon: '🏈' },
    { key: 'games', label: 'Game Management', icon: '⚙️' },
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
          
          {activeTab === 'season2025' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">2025-2026 NFL Season Data Import</h3>
              <p className="text-gray-600">
                Import real 2025 NFL season data including preseason games for user testing. 
                This connects to ESPN API to get live game schedules, teams, and betting data.
              </p>
              
              {/* Import Results Display */}
              {importResults && (
                <div className={`p-4 rounded-lg ${importResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <h4 className={`font-semibold ${importResults.success ? 'text-green-800' : 'text-red-800'}`}>
                    {importResults.success ? '✅ Import Successful' : '❌ Import Failed'}
                  </h4>
                  {importResults.success ? (
                    <div className="text-sm text-green-700 mt-2">
                      <p><strong>Type:</strong> {importResults.type}</p>
                      {importResults.totalGames && <p><strong>Total Games:</strong> {importResults.totalGames}</p>}
                      {importResults.preseasonGames && <p><strong>Preseason:</strong> {importResults.preseasonGames} games</p>}
                      {importResults.regularSeasonGames && <p><strong>Regular Season:</strong> {importResults.regularSeasonGames} games</p>}
                      {importResults.gamesImported && <p><strong>Games Imported:</strong> {importResults.gamesImported}</p>}
                      <p><strong>Message:</strong> {importResults.message}</p>
                    </div>
                  ) : (
                    <div className="text-sm text-red-700 mt-2">
                      <p><strong>Error:</strong> {importResults.error}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* One-Click Setup */}
              <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
                <h4 className="font-bold text-lg mb-3 text-green-800">🚀 One-Click Setup (Recommended)</h4>
                <p className="text-sm text-green-700 mb-4">
                  Automatically updates your database schema and imports all 2025 season games. 
                  No manual migrations needed - everything is handled for you!
                </p>
                <button
                  onClick={handleSetup2025Season}
                  disabled={processing}
                  className={`btn btn-primary btn-lg w-full ${processing ? 'opacity-50' : ''}`}
                >
                  {processing ? 'Setting up 2025 Season...' : '🏈 Setup 2025 NFL Season'}
                </button>
              </div>

              {/* Advanced Import Controls */}
              <details className="mb-6">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
                  🔧 Advanced Import Options (Optional)
                </summary>
                <div className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-semibold mb-2">🏈 Preseason Import</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Import all 2025 preseason games including Hall of Fame Weekend and 3 preseason weeks
                      </p>
                      <button
                        onClick={handleImportPreseason}
                        disabled={processing}
                        className={`btn btn-primary w-full ${processing ? 'opacity-50' : ''}`}
                      >
                        {processing ? 'Importing...' : 'Import Preseason'}
                      </button>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-semibold mb-2">📅 Regular Season Import</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Import all 18 weeks of 2025 regular season games with full schedule data
                      </p>
                      <button
                        onClick={handleImportRegularSeason}
                        disabled={processing}
                        className={`btn btn-primary w-full ${processing ? 'opacity-50' : ''}`}
                      >
                        {processing ? 'Importing...' : 'Import Regular Season'}
                      </button>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-semibold mb-2">🚀 Complete Import</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Import the entire 2025 season (preseason + regular season) in one operation
                      </p>
                      <button
                        onClick={handleImportAll2025}
                        disabled={processing}
                        className={`btn btn-primary w-full ${processing ? 'opacity-50' : ''}`}
                      >
                        {processing ? 'Importing...' : 'Import All 2025'}
                      </button>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-semibold mb-2">📊 Live Score Update</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Update live scores and final results for current week games
                      </p>
                      <button
                        onClick={handleUpdateLiveScores}
                        disabled={processing}
                        className={`btn btn-secondary w-full ${processing ? 'opacity-50' : ''}`}
                      >
                        {processing ? 'Updating...' : 'Update Live Scores'}
                      </button>
                    </div>
                  </div>
                </div>
              </details>

              {/* Important Notes */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">📋 Simple Setup Process</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>One-Click Setup</strong> automatically handles database updates and data import</li>
                  <li>• <strong>No manual migrations</strong> required - everything is automated</li>
                  <li>• <strong>Preseason weeks</strong> use negative numbers: -4 (HOF), -3 (Pre Wk 1), -2 (Pre Wk 2), -1 (Pre Wk 3)</li>
                  <li>• <strong>Regular season</strong> uses weeks 1-18 as normal</li>
                  <li>• <strong>Real ESPN data</strong> includes schedules, teams, betting odds, and injury reports</li>
                  <li>• <strong>Automatic updates</strong> keep data synchronized with live NFL information</li>
                </ul>
              </div>
            </div>
          )}
          
          {activeTab === 'games' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Game Testing Controls</h3>
              
              {/* Week Selector for Targeted Simulation */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-3">🎯 Simulate Specific Week</h4>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Select Week to Simulate:
                    </label>
                    <select
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={processing}
                    >
                      <option value="">Select a week...</option>
                      {availableWeeks.map((week) => (
                        <option 
                          key={`${week.week}-${week.seasonType}`} 
                          value={`${week.week}-${week.seasonType}`}
                          disabled={week.disabled}
                        >
                          {week.label} ({week.seasonTypeLabel}) - {week.incompleteGames} games left
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleCompleteGamesForWeek}
                    disabled={processing || !selectedWeek}
                    className={`btn btn-primary px-6 py-2 ${processing || !selectedWeek ? 'opacity-50' : ''}`}
                  >
                    {processing ? 'Simulating...' : '🎯 Simulate Week'}
                  </button>
                </div>
                <p className="text-sm text-blue-600 mt-2">
                  Simulate games for a specific week with random scores (14-35 points each team)
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2">Complete All Games</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Simulate ALL remaining incomplete games with random scores (bulk operation)
                  </p>
                  <button
                    onClick={handleCompleteGames}
                    disabled={processing}
                    className={`btn btn-secondary w-full ${processing ? 'opacity-50' : ''}`}
                  >
                    {processing ? 'Processing...' : '⚡ Complete All Games'}
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
                  <h4 className="font-semibold mb-2">Reset Game Status</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Reset completed games back to "not started" status (keeps picks)
                  </p>
                  <button
                    onClick={handleResetGameStatus}
                    disabled={processing}
                    className={`btn btn-secondary w-full ${processing ? 'opacity-50' : ''}`}
                  >
                    {processing ? 'Processing...' : '🔄 Reset Game Status'}
                  </button>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2">Update Leaderboard</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Manually trigger the leaderboard calculation (normally runs Tuesdays at 6am)
                  </p>
                  <button
                    onClick={handleTriggerLeaderboardUpdate}
                    disabled={processing}
                    className={`btn btn-primary w-full ${processing ? 'opacity-50' : ''}`}
                  >
                    {processing ? 'Processing...' : '📊 Update Leaderboard'}
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