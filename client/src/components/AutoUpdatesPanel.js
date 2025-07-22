import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AutoUpdatesPanel = () => {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [showTestResults, setShowTestResults] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchLogs();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await axios.get('/api/admin/updates/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Error fetching update status:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/updates/logs?limit=20');
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching update logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerUpdate = async (updateType) => {
    const startTime = Date.now();
    try {
      setTriggering(updateType);
      console.log(`🔄 Starting ${updateType} update...`);
      const response = await axios.post(`/api/admin/updates/trigger/${updateType}`);
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${updateType} update response:`, response.data);
      
      if (response.data.success) {
        // Add to test results for display
        const testResult = {
          updateType,
          status: 'SUCCESS',
          recordsUpdated: response.data.recordsUpdated,
          duration,
          message: response.data.message,
          timestamp: new Date(),
          fullResponse: response.data
        };
        
        setTestResults(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10 results
        setShowTestResults(true);
        
        const message = `
🎯 ${updateType.toUpperCase()} UPDATE COMPLETED!

✅ Status: Success
📊 Records Updated: ${response.data.recordsUpdated}
⏱️ Duration: ${duration}ms
💬 Message: ${response.data.message}

Check the Test Results section below for detailed information.`;
        
        alert(message);
        
        // Refresh status and logs
        await fetchStatus();
        await fetchLogs();
      }
    } catch (error) {
      console.error(`❌ Error triggering ${updateType}:`, error);
      
      // Add error to test results
      const testResult = {
        updateType,
        status: 'ERROR',
        recordsUpdated: 0,
        duration: Date.now() - startTime,
        message: error.response?.data?.error || error.message,
        timestamp: new Date(),
        fullResponse: error.response?.data || null,
        errorCode: error.response?.status
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);
      setShowTestResults(true);
      
      const errorDetails = `
❌ ${updateType.toUpperCase()} UPDATE FAILED!

🚨 Error: ${error.response?.data?.error || error.message}
📱 Status Code: ${error.response?.status || 'Unknown'}
🔍 Details: ${error.response?.data ? JSON.stringify(error.response.data, null, 2) : 'No additional details'}

Check the Test Results section below for detailed information.`;
      
      alert(errorDetails);
    } finally {
      setTriggering(null);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS': return 'text-green-600';
      case 'ERROR': return 'text-red-600';
      case 'WARNING': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const updateTypes = [
    { key: 'injuries', label: 'Injury Reports', description: 'Update player injury status from ESPN' },
    { key: 'odds', label: 'Betting Odds', description: 'Update game spreads and totals' },
    { key: 'records', label: 'Team Records', description: 'Update win/loss records from standings' },
    { key: 'weather', label: 'Weather Data', description: 'Update weather for outdoor games' },
    { key: 'games', label: 'Game Status', description: 'Update live scores and game status' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Automatic Updates System</h3>
        <button
          onClick={() => {
            fetchStatus();
            fetchLogs();
          }}
          className="btn btn-sm btn-outline"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className={`text-2xl font-bold ${status?.isRunning ? 'text-green-600' : 'text-red-600'}`}>
            {status?.isRunning ? '✅' : '❌'}
          </div>
          <p className="text-sm text-gray-600">Service Status</p>
          <p className="text-xs">{status?.isRunning ? 'Running' : 'Stopped'}</p>
        </div>
        
        <div className="card text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--broncos-orange)' }}>
            {status?.jobCount || 0}
          </div>
          <p className="text-sm text-gray-600">Active Jobs</p>
        </div>
        
        <div className="card text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--broncos-orange)' }}>
            {status?.recentLogs?.filter(log => log.status === 'SUCCESS').length || 0}
          </div>
          <p className="text-sm text-gray-600">Recent Success</p>
        </div>
        
        <div className="card text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--broncos-orange)' }}>
            {status?.recentLogs?.filter(log => log.status === 'ERROR').length || 0}
          </div>
          <p className="text-sm text-gray-600">Recent Errors</p>
        </div>
      </div>

      {/* Manual Triggers */}
      <div className="card">
        <h4 className="text-lg font-semibold mb-4">Manual Update Triggers</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {updateTypes.map(({ key, label, description }) => (
            <div key={key} className="p-4 border border-gray-200 rounded-lg">
              <h5 className="font-semibold mb-2">{label}</h5>
              <p className="text-sm text-gray-600 mb-3">{description}</p>
              <button
                onClick={() => triggerUpdate(key)}
                disabled={triggering === key}
                className={`btn btn-sm w-full ${triggering === key ? 'btn-outline opacity-50' : 'btn-primary'}`}
              >
                {triggering === key ? 'Updating...' : `Update ${label}`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Jobs */}
      <div className="card">
        <h4 className="text-lg font-semibold mb-4">Scheduled Jobs</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">Injury Updates</span>
              <p className="text-sm text-gray-600">Runs twice daily at 8 AM and 6 PM EST</p>
            </div>
            <span className="text-green-600 text-sm">Active</span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">Betting Odds Updates</span>
              <p className="text-sm text-gray-600">Runs twice daily at 9 AM and 7 PM EST</p>
            </div>
            <span className="text-green-600 text-sm">Active</span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">Team Records</span>
              <p className="text-sm text-gray-600">Runs daily at 7 AM EST</p>
            </div>
            <span className="text-green-600 text-sm">Active</span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">Weather Updates</span>
              <p className="text-sm text-gray-600">Runs twice daily at 10 AM and 8 PM EST</p>
            </div>
            <span className="text-green-600 text-sm">Active</span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">Game Status</span>
              <p className="text-sm text-gray-600">Runs every 30 minutes during game days</p>
            </div>
            <span className="text-green-600 text-sm">Active</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Logs */}
      <div className="card">
        <h4 className="text-lg font-semibold mb-4">Recent Update Activity</h4>
        {loading ? (
          <div className="text-center py-8">
            <div className="spinner"></div>
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3">Job</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Records</th>
                  <th className="text-left py-2 px-3">Time</th>
                  <th className="text-left py-2 px-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2 px-3 font-medium">{log.job_name}</td>
                    <td className={`py-2 px-3 font-semibold ${getStatusColor(log.status)}`}>
                      {log.status}
                    </td>
                    <td className="py-2 px-3">{log.records_updated || 0}</td>
                    <td className="py-2 px-3 text-gray-600">
                      {formatTimestamp(log.executed_at)}
                    </td>
                    <td className="py-2 px-3 text-xs text-red-600">
                      {log.error_message && (
                        <span title={log.error_message}>
                          {log.error_message.length > 50 
                            ? log.error_message.substring(0, 50) + '...' 
                            : log.error_message
                          }
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-600 py-8">
            <div className="text-4xl mb-2">📊</div>
            <p>No update logs found</p>
          </div>
        )}
      </div>

      {/* Test Results Section */}
      {showTestResults && testResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">🧪 Manual Test Results</h4>
            <button
              onClick={() => setTestResults([])}
              className="btn btn-sm btn-outline"
            >
              Clear Results
            </button>
          </div>
          
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  result.status === 'SUCCESS' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${result.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}`}>
                      {result.status === 'SUCCESS' ? '✅' : '❌'}
                    </span>
                    <span className="font-semibold text-lg">
                      {result.updateType.toUpperCase()} UPDATE
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className={`font-semibold ${result.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}`}>
                      {result.status}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Records Updated:</span>
                    <div className="font-semibold text-blue-600">
                      {result.recordsUpdated}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <div className="font-semibold text-purple-600">
                      {result.duration}ms
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Error Code:</span>
                    <div className="font-semibold text-orange-600">
                      {result.errorCode || 'N/A'}
                    </div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <span className="text-gray-600 text-sm">Message:</span>
                  <div className="font-medium text-gray-800 bg-white p-2 rounded border">
                    {result.message}
                  </div>
                </div>
                
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                    🔍 View Full API Response
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded font-mono text-xs overflow-x-auto">
                    <pre>{JSON.stringify(result.fullResponse, null, 2)}</pre>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoUpdatesPanel;