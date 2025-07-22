import React, { useState } from 'react';

const InjuryReportCard = ({ injuries, teamName, teamType }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!injuries || injuries.length === 0) {
    return (
      <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200 w-full">
        <div className="text-sm font-semibold text-green-800 mb-1">
          🏥 INJURY REPORT
        </div>
        <div className="text-xs text-green-700">
          No injuries reported
        </div>
      </div>
    );
  }


  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'out':
        return 'text-red-700 bg-red-100 border-red-300';
      case 'active':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'questionable':
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'doubtful':
        return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'probable':
        return 'text-blue-700 bg-blue-100 border-blue-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Create HTML content for the modal
  const createModalContent = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Injury Report - ${teamName}</title>
        <style>
          body {
            font-family: 'Inter', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
            color: #374151;
          }
          .header {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
          }
          .injury-item {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-left: 4px solid #dc2626;
          }
          .player-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            flex-wrap: wrap;
          }
          .player-name {
            font-size: 18px;
            font-weight: bold;
            color: #111827;
          }
          .position {
            background: #f3f4f6;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            color: #6b7280;
          }
          .status {
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .status-out { background: #fecaca; color: #dc2626; }
          .status-questionable { background: #fed7aa; color: #ea580c; }
          .status-active { background: #bbf7d0; color: #16a34a; }
          .comment {
            background: #f8fafc;
            padding: 12px;
            border-radius: 6px;
            margin: 12px 0;
            border-left: 3px solid #3b82f6;
          }
          .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            margin-top: 12px;
          }
          .detail-item {
            background: #f8fafc;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 13px;
          }
          .detail-label {
            font-weight: 600;
            color: #4b5563;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏥 ${teamName} Injury Report</h1>
          <p>${injuries.length} player${injuries.length !== 1 ? 's' : ''} listed</p>
        </div>
        ${injuries.map(injury => `
          <div class="injury-item">
            <div class="player-header">
              <div class="player-name">${injury.player_name}</div>
              <div class="position">${injury.position}</div>
              <div class="status status-${injury.status?.toLowerCase()}">${injury.status}</div>
              ${injury.return_date ? `<div style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 11px;">Return: ${formatDate(injury.return_date)}</div>` : ''}
            </div>
            
            ${injury.long_comment ? `<div class="comment">${injury.long_comment}</div>` : ''}
            
            <div class="detail-grid">
              ${injury.injury_type && injury.injury_type !== 'Unknown' ? `<div class="detail-item"><span class="detail-label">Type:</span> ${injury.injury_type}</div>` : ''}
              ${injury.injury_location && injury.injury_location !== 'Unknown' ? `<div class="detail-item"><span class="detail-label">Location:</span> ${injury.injury_location}</div>` : ''}
              ${injury.injury_detail && injury.injury_detail !== 'Not Specified' ? `<div class="detail-item"><span class="detail-label">Detail:</span> ${injury.injury_detail}</div>` : ''}
              ${injury.side && injury.side !== 'Not Specified' ? `<div class="detail-item"><span class="detail-label">Side:</span> ${injury.side}</div>` : ''}
              ${injury.fantasy_status ? `<div class="detail-item"><span class="detail-label">Fantasy:</span> ${injury.fantasy_status}</div>` : ''}
              ${injury.injury_date ? `<div class="detail-item"><span class="detail-label">Reported:</span> ${formatDate(injury.injury_date)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </body>
      </html>
    `;
  };

  return (
    <div className="mt-2" style={{width: '100%'}}>
      {/* Simple Status Display - Each on Own Line */}
      <div className="space-y-1" style={{width: '100%'}}>
        {injuries.map((injury, index) => (
          <div 
            key={injury.injury_id || index}
            className="text-xs"
            style={{width: '100%', wordWrap: 'break-word'}}
          >
            <span className="font-medium text-gray-900">
              {injury.player_name.split(' ').pop()}
            </span>
            <span className="text-gray-600 ml-1">
              ({injury.position})
            </span>
            <span className={`ml-1 px-1 py-0.5 rounded border font-medium ${getStatusColor(injury.status)}`}>
              {injury.status}
            </span>
          </div>
        ))}
      </div>
      
      {/* More Details Button */}
      {injuries.length > 0 && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2 underline block"
          style={{width: '100%', textAlign: 'left'}}
        >
          More details ({injuries.length})
        </button>
      )}

      {/* Modal Popup */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '90%',
            maxWidth: '800px',
            height: '80%',
            backgroundColor: 'white',
            borderRadius: '8px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                fontSize: '16px',
                zIndex: 1001
              }}
            >
              ×
            </button>
            
            {/* Iframe with injury details */}
            <iframe
              srcDoc={createModalContent()}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '8px'
              }}
              title={`${teamName} Injury Report`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InjuryReportCard;