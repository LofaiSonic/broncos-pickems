import React, { useState, useEffect, useCallback } from 'react';

const GamePickModal = ({ 
  games, 
  isOpen, 
  onClose, 
  currentGameIndex, 
  onGameIndexChange, 
  userPicks, 
  onPickChange, 
  formatGameTime 
}) => {
  // const [selectedTeam, setSelectedTeam] = useState(null);
  const [showMainClose, setShowMainClose] = useState(true);
  
  const currentGame = games?.[currentGameIndex] || games?.[0];
  const currentPick = userPicks?.[currentGame?.id];
  
  // Reset selected team when game changes
  // useEffect(() => {
  //   if (currentPick) {
  //     setSelectedTeam(currentPick.pickedTeamId || null);
  //   } else {
  //     setSelectedTeam(null);
  //   }
  // }, [currentGameIndex, currentPick]);
  
  // Force iframe refresh only when game changes, not when team is selected
  const [iframeKey, setIframeKey] = useState(0);
  useEffect(() => {
    setIframeKey(prev => prev + 1);
  }, [currentGameIndex]);
  
  const handleTeamSelect = useCallback((teamId, isDoubleClick = false) => {
    // setSelectedTeam(teamId);
    onPickChange(currentGame.id, teamId);
    
    // Update iframe content without regenerating
    const iframe = document.querySelector('iframe[title*="Game Pick"]');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'updateTeamSelection',
        selectedTeamId: teamId,
        hasSelection: !!teamId
      }, '*');
    }
    
    // If double-click, automatically go to next game or close modal if last game
    if (isDoubleClick) {
      if (currentGameIndex < games.length - 1) {
        setTimeout(() => goToNext(), 300); // Small delay to show selection
      } else {
        // This is the last game, close the modal after showing selection
        setTimeout(() => onClose(), 300);
      }
    }
  }, [currentGame?.id, onPickChange, currentGameIndex, games?.length, onClose]);
  
  const goToPrevious = useCallback(() => {
    if (currentGameIndex > 0) {
      onGameIndexChange(currentGameIndex - 1);
    }
  }, [currentGameIndex, onGameIndexChange]);
  
  const goToNext = useCallback(() => {
    if (currentGameIndex < games.length - 1) {
      onGameIndexChange(currentGameIndex + 1);
    }
  }, [currentGameIndex, games?.length, onGameIndexChange]);
  
  const handleSubmitPicks = useCallback(() => {
    // Just close the modal - no confirmation needed
    onClose();
  }, [onClose]);
  
  // const getTeamButtonStyling = (teamId) => {
  //   const isSelected = selectedTeam === teamId;
  //   const isCompleted = currentGame.isFinal && currentPick;
  //   
  //   let className = "team-button ";
  //   let styles = {};
  //   
  //   if (isCompleted && isSelected) {
  //     if (currentPick.isCorrect) {
  //       className += "correct";
  //       styles.backgroundColor = '#F0FDF4';
  //       styles.borderColor = '#22C55E';
  //       styles.color = '#15803D';
  //     } else {
  //       className += "incorrect";
  //       styles.backgroundColor = '#FEF2F2';
  //       styles.borderColor = '#EF4444';
  //       styles.color = '#DC2626';
  //     }
  //   } else if (isSelected) {
  //     className += "selected";
  //     styles.backgroundColor = '#FFF7ED';
  //     styles.borderColor = '#FA4616';
  //     styles.color = '#EA580C';
  //   } else {
  //     className += "unselected";
  //     styles.backgroundColor = '#FFFFFF';
  //     styles.borderColor = '#D1D5DB';
  //     styles.color = '#374151';
  //   }
  //   
  //   return { className, styles };
  // };
  
  // Create the modal content as HTML string for iframe
  const createModalHTML = () => {
    // Use static default styling - dynamic updates handled by JavaScript
    const getDefaultStyling = (teamId) => {
      const isSelected = currentPick?.pickedTeamId === teamId;
      if (isSelected) {
        return {
          styles: {
            backgroundColor: '#FFF7ED',
            borderColor: '#FA4616',
            color: '#EA580C'
          }
        };
      } else {
        return {
          styles: {
            backgroundColor: '#FFFFFF',
            borderColor: '#D1D5DB',
            color: '#374151'
          }
        };
      }
    };
    
    const homeTeamStyling = getDefaultStyling(currentGame.homeTeam.id);
    const awayTeamStyling = getDefaultStyling(currentGame.awayTeam.id);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Game ${currentGameIndex + 1} Pick</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 20px;
            overflow-y: auto;
          }
          
          .game-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
            max-width: 500px;
            width: 100%;
            overflow: hidden;
          }
          
          .game-header {
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            color: white;
            padding: 24px;
            text-align: center;
          }
          
          .game-counter {
            font-size: 14px;
            opacity: 0.8;
            margin-bottom: 8px;
          }
          
          .game-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          .game-time {
            font-size: 14px;
            opacity: 0.9;
          }
          
          .teams-container {
            padding: 32px;
            padding-bottom: 100px;
          }
          
          .teams-grid {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 24px;
            align-items: center;
            margin-bottom: 20px;
          }
          
          .vs-divider {
            text-align: center;
            margin: 24px 0;
            position: relative;
          }
          
          .vs-text {
            background: white;
            padding: 0 16px;
            font-size: 18px;
            font-weight: bold;
            color: #6B7280;
            z-index: 1;
            position: relative;
          }
          
          .vs-line {
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, #E5E7EB 20%, #E5E7EB 80%, transparent 100%);
          }
          
          .team-button {
            width: 100%;
            padding: 24px;
            border: 3px solid;
            border-radius: 16px;
            background: white;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
            font-size: 16px;
            font-weight: 600;
            display: block;
            margin: 16px 0;
            text-decoration: none;
          }
          
          .team-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          }
          
          .team-button:active {
            transform: translateY(0);
          }
          
          .team-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          
          .team-location {
            font-size: 12px;
            opacity: 0.7;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          
          .team-abbr {
            font-size: 24px;
            font-weight: 900;
          }
          
          .team-record {
            font-size: 12px;
            margin-top: 8px;
            opacity: 0.6;
          }
          
          .navigation {
            background: #F9FAFB;
            padding: 20px 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #E5E7EB;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 10;
          }
          
          .nav-button {
            background: #4F46E5;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .nav-button:hover {
            background: #4338CA;
            transform: translateY(-1px);
          }
          
          .nav-button:disabled {
            background: #D1D5DB;
            cursor: not-allowed;
            transform: none;
          }
          
          .progress-indicator {
            font-size: 14px;
            color: #6B7280;
            font-weight: 500;
          }
          
          .injuries-summary {
            margin-top: 12px;
            padding: 8px 12px;
            background: #FEF3F2;
            border: 1px solid #FECACA;
            border-radius: 8px;
            font-size: 11px;
            color: #DC2626;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: underline;
          }
          
          .injuries-summary:hover {
            background: #FEE2E2;
            transform: translateY(-1px);
          }
          
          .no-injuries {
            background: #F0FDF4;
            border-color: #BBF7D0;
            color: #166534;
            cursor: default;
            text-decoration: none;
          }
          
          .no-injuries:hover {
            background: #F0FDF4;
            transform: none;
          }
          
          .odds-section {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 16px;
            margin: 20px 0;
            text-align: center;
          }
          
          .odds-title {
            font-size: 16px;
            font-weight: bold;
            color: #1E293B;
            margin: 0 0 12px 0;
          }
          
          .odds-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
          }
          
          .odds-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
          }
          
          .odds-label {
            font-size: 14px;
            color: #64748B;
            font-weight: 500;
          }
          
          .odds-value {
            font-size: 14px;
            color: #1E293B;
            font-weight: bold;
          }
          
          .injury-popup {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }
          
          .injury-popup-content {
            background: white;
            border-radius: 16px;
            max-width: 600px;
            width: 100%;
            max-height: 80vh;
            overflow: hidden;
            position: relative;
            display: flex;
            flex-direction: column;
          }
          
          .injury-popup-header {
            background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
            color: white;
            padding: 20px;
            border-radius: 16px 16px 0 0;
            text-align: center;
            position: relative;
            flex-shrink: 0;
          }
          
          .injury-popup-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
          }
          
          .close-injury-popup {
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(255, 255, 255, 0.9);
            color: #DC2626;
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            z-index: 1;
          }
          
          .close-injury-popup:hover {
            background: white;
            transform: scale(1.1);
          }
          
          @media (max-width: 480px) {
            body {
              padding: 10px;
            }
            
            .game-container {
              border-radius: 16px;
            }
            
            .game-header {
              padding: 20px;
            }
            
            .teams-container {
              padding: 24px;
            }
            
            .team-button {
              padding: 20px;
            }
            
            .team-name {
              font-size: 18px;
            }
            
            .team-abbr {
              font-size: 20px;
            }
            
            .navigation {
              padding: 16px 24px;
            }
            
            .nav-button {
              padding: 10px 20px;
              font-size: 14px;
            }
          }
        </style>
      </head>
      <body>
        <div class="game-container">
          <div class="game-header">
            <div class="game-counter">Game ${currentGameIndex + 1} of ${games.length}</div>
            <div class="game-title">${currentGame.awayTeam.name} @ ${currentGame.homeTeam.name}</div>
            <div class="game-time">${formatGameTime(currentGame.gameTime)}</div>
          </div>
          
          <div class="teams-container">
            <div class="teams-grid">
              <!-- Away Team -->
              <a href="#" 
                 onclick="event.preventDefault(); parent.postMessage({type: 'teamSelect', teamId: ${currentGame.awayTeam.id}, isDoubleClick: false}, '*'); return false;"
                 ondblclick="event.preventDefault(); parent.postMessage({type: 'teamSelect', teamId: ${currentGame.awayTeam.id}, isDoubleClick: true}, '*'); return false;"
                 class="team-button"
                 style="border-color: ${awayTeamStyling.styles.borderColor}; background-color: ${awayTeamStyling.styles.backgroundColor}; color: ${awayTeamStyling.styles.color};">
                <div class="team-location">@ Away</div>
                <div class="team-name">${currentGame.awayTeam.name}</div>
                <div class="team-abbr">${currentGame.awayTeam.abbreviation}</div>
                <div class="team-record">(${currentGame.awayTeamRecord || '0-0'})</div>
                ${currentGame.awayTeamInjuries?.length > 0 ? 
                  `<div class="injuries-summary" onclick="event.preventDefault(); event.stopPropagation(); showInjuryDetails('away', '${currentGame.awayTeam.name.replace(/'/g, "\\'")}'); return false;">${currentGame.awayTeamInjuries.length} injuries reported</div>` :
                  `<div class="injuries-summary no-injuries">No injuries reported</div>`
                }
              </a>
              
              <div class="vs-divider">
                <div class="vs-line"></div>
                <span class="vs-text">VS</span>
              </div>
              
              <!-- Home Team -->
              <a href="#" 
                 onclick="event.preventDefault(); parent.postMessage({type: 'teamSelect', teamId: ${currentGame.homeTeam.id}, isDoubleClick: false}, '*'); return false;"
                 ondblclick="event.preventDefault(); parent.postMessage({type: 'teamSelect', teamId: ${currentGame.homeTeam.id}, isDoubleClick: true}, '*'); return false;"
                 class="team-button"
                 style="border-color: ${homeTeamStyling.styles.borderColor}; background-color: ${homeTeamStyling.styles.backgroundColor}; color: ${homeTeamStyling.styles.color};">
                <div class="team-location">🏠 Home</div>
                <div class="team-name">${currentGame.homeTeam.name}</div>
                <div class="team-abbr">${currentGame.homeTeam.abbreviation}</div>
                <div class="team-record">(${currentGame.homeTeamRecord || '0-0'})</div>
                ${currentGame.homeTeamInjuries?.length > 0 ? 
                  `<div class="injuries-summary" onclick="event.preventDefault(); event.stopPropagation(); showInjuryDetails('home', '${currentGame.homeTeam.name.replace(/'/g, "\\'")}'); return false;">${currentGame.homeTeamInjuries.length} injuries reported</div>` :
                  `<div class="injuries-summary no-injuries">No injuries reported</div>`
                }
              </a>
            </div>
            
            <!-- Betting Odds Section -->
            ${(currentGame.spread || currentGame.overUnder) ? `
              <div class="odds-section">
                <h4 class="odds-title">📊 ESPN Betting Odds</h4>
                <div class="odds-grid">
                  ${currentGame.spread ? `
                    <div class="odds-item">
                      <span class="odds-label">Spread:</span>
                      <span class="odds-value">${currentGame.spread > 0 ? `${currentGame.awayTeam.abbreviation} +${currentGame.spread}` : `${currentGame.homeTeam.abbreviation} ${currentGame.spread}`}</span>
                    </div>
                  ` : ''}
                  ${currentGame.overUnder ? `
                    <div class="odds-item">
                      <span class="odds-label">Over/Under:</span>
                      <span class="odds-value">${currentGame.overUnder} pts</span>
                    </div>
                  ` : ''}
                  ${currentGame.overOdds || currentGame.underOdds ? `
                    <div class="odds-item">
                      <span class="odds-label">O/U Odds:</span>
                      <span class="odds-value">
                        ${currentGame.overOdds ? `O ${currentGame.overOdds > 0 ? '+' : ''}${currentGame.overOdds}` : ''} 
                        ${currentGame.underOdds ? `U ${currentGame.underOdds > 0 ? '+' : ''}${currentGame.underOdds}` : ''}
                      </span>
                    </div>
                  ` : ''}
                  ${currentGame.tvChannel ? `
                    <div class="odds-item">
                      <span class="odds-label">TV:</span>
                      <span class="odds-value">${currentGame.tvChannel}</span>
                    </div>
                  ` : ''}
                  ${currentGame.espnEventId ? `
                    <div class="odds-item">
                      <span class="odds-label">Source:</span>
                      <span class="odds-value">ESPN Live</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>
          
          <div class="navigation">
            <button 
              class="nav-button" 
              onclick="parent.postMessage({type: 'navigate', direction: 'prev'}, '*')"
              ${currentGameIndex === 0 ? 'disabled' : ''}>
              ← Previous
            </button>
            
            <div class="progress-indicator">
              ${currentGameIndex + 1} / ${games.length}
            </div>
            
            <button 
              class="nav-button"
              onclick="parent.postMessage(${currentGameIndex === games.length - 1 ? '{type: \'submitPicks\'}' : '{type: \'navigate\', direction: \'next\'}'}, '*')"
              ${currentPick?.pickedTeamId ? '' : 'disabled'}>
              ${currentGameIndex === games.length - 1 ? 'Submit Picks' : 'Next →'}
            </button>
          </div>
        </div>
        
        <!-- Injury Details Popup -->
        <div id="injuryPopup" class="injury-popup">
          <div class="injury-popup-content">
            <div class="injury-popup-header">
              <button class="close-injury-popup" onclick="closeInjuryPopup()">
                ✕
              </button>
              <h2 id="injuryTitle" style="margin: 0; font-size: 24px;">Injury Report</h2>
              <p id="injuryCount" style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;"></p>
            </div>
            <div class="injury-popup-body" id="injuryContent">
              <!-- Injury details will be inserted here -->
            </div>
          </div>
        </div>
        
        <script>
          window.injuryData = {
            away: ${JSON.stringify(currentGame.awayTeamInjuries || [])},
            home: ${JSON.stringify(currentGame.homeTeamInjuries || [])}
          };
          
          // Track current selection - get from current pick
          window.currentSelection = ${currentPick?.pickedTeamId || 'null'};
          
          // Listen for selection updates from parent
          window.addEventListener('message', function(event) {
            if (event.data.type === 'updateTeamSelection') {
              updateTeamSelection(event.data.selectedTeamId, event.data.hasSelection);
            }
          });
          
          function updateTeamSelection(selectedTeamId, hasSelection) {
            window.currentSelection = selectedTeamId;
            
            // Update team button styling
            const homeButton = document.querySelector('a[onclick*="${currentGame.homeTeam.id}"]');
            const awayButton = document.querySelector('a[onclick*="${currentGame.awayTeam.id}"]');
            
            if (homeButton) {
              updateButtonStyling(homeButton, ${currentGame.homeTeam.id}, selectedTeamId);
            }
            if (awayButton) {
              updateButtonStyling(awayButton, ${currentGame.awayTeam.id}, selectedTeamId);
            }
            
            // Update next/submit button
            const navButton = document.querySelector('.navigation button:last-child');
            if (navButton) {
              if (hasSelection) {
                navButton.removeAttribute('disabled');
              } else {
                navButton.setAttribute('disabled', 'disabled');
              }
            }
          }
          
          function updateButtonStyling(button, teamId, selectedTeamId) {
            const isSelected = selectedTeamId === teamId;
            
            if (isSelected) {
              button.style.backgroundColor = '#FFF7ED';
              button.style.borderColor = '#FA4616';
              button.style.color = '#EA580C';
            } else {
              button.style.backgroundColor = '#FFFFFF';
              button.style.borderColor = '#D1D5DB';
              button.style.color = '#374151';
            }
          }
          
          function getStatusColor(status) {
            switch ((status || '').toLowerCase()) {
              case 'out': return '#DC2626';
              case 'active': return '#16A34A';
              case 'questionable': return '#EA580C';
              case 'doubtful': return '#FB923C';
              case 'probable': return '#3B82F6';
              default: return '#6B7280';
            }
          }
          
          function showInjuryDetails(team, teamName) {
            const injuries = window.injuryData[team];
            if (!injuries || injuries.length === 0) return;
            
            document.getElementById('injuryTitle').textContent = '🏥 ' + teamName + ' Injury Report';
            document.getElementById('injuryCount').textContent = injuries.length + ' player' + (injuries.length !== 1 ? 's' : '') + ' listed';
            
            let injuryHTML = '';
            injuries.forEach(function(injury) {
              const statusColor = getStatusColor(injury.status);
              injuryHTML += '<div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid ' + statusColor + ';">';
              injuryHTML += '<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">';
              injuryHTML += '<div style="font-size: 16px; font-weight: bold; color: #111827;">' + injury.player_name + '</div>';
              injuryHTML += '<div style="background: #F3F4F6; padding: 4px 8px; border-radius: 4px; font-size: 11px; color: #6B7280;">' + injury.position + '</div>';
              injuryHTML += '<div style="background: ' + statusColor + '22; color: ' + statusColor + '; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase;">' + injury.status + '</div>';
              injuryHTML += '</div>';
              
              if (injury.long_comment) {
                injuryHTML += '<div style="background: #F8FAFC; padding: 10px; border-radius: 6px; margin: 8px 0; font-size: 13px; color: #374151; border-left: 3px solid #3B82F6;">' + injury.long_comment + '</div>';
              }
              
              injuryHTML += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin-top: 8px;">';
              if (injury.injury_type && injury.injury_type !== 'Unknown') {
                injuryHTML += '<div style="background: #F8FAFC; padding: 6px 10px; border-radius: 4px; font-size: 12px;"><span style="font-weight: 600; color: #4B5563;">Type:</span> ' + injury.injury_type + '</div>';
              }
              if (injury.injury_location && injury.injury_location !== 'Unknown') {
                injuryHTML += '<div style="background: #F8FAFC; padding: 6px 10px; border-radius: 4px; font-size: 12px;"><span style="font-weight: 600; color: #4B5563;">Location:</span> ' + injury.injury_location + '</div>';
              }
              if (injury.injury_detail && injury.injury_detail !== 'Not Specified') {
                injuryHTML += '<div style="background: #F8FAFC; padding: 6px 10px; border-radius: 4px; font-size: 12px;"><span style="font-weight: 600; color: #4B5563;">Detail:</span> ' + injury.injury_detail + '</div>';
              }
              injuryHTML += '</div>';
              injuryHTML += '</div>';
            });
            
            document.getElementById('injuryContent').innerHTML = injuryHTML;
            document.getElementById('injuryPopup').style.display = 'flex';
            
            // Hide the main close button when injury popup is open
            parent.postMessage({type: 'toggleMainClose', visible: false}, '*');
          }
          
          function closeInjuryPopup() {
            document.getElementById('injuryPopup').style.display = 'none';
            // Show the main close button again
            parent.postMessage({type: 'toggleMainClose', visible: true}, '*');
          }
        </script>
      </body>
      </html>
    `;
  };
  
  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'teamSelect') {
        handleTeamSelect(event.data.teamId, event.data.isDoubleClick);
      } else if (event.data.type === 'navigate') {
        if (event.data.direction === 'prev') {
          goToPrevious();
        } else if (event.data.direction === 'next') {
          goToNext();
        }
      } else if (event.data.type === 'submitPicks') {
        handleSubmitPicks();
      } else if (event.data.type === 'toggleMainClose') {
        setShowMainClose(event.data.visible);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentGameIndex, games?.length, goToNext, goToPrevious, handleSubmitPicks, handleTeamSelect]);
  
  if (!isOpen || !games || games.length === 0) return null;
  
  return (
    <div 
      className="modal-backdrop" 
      onClick={(e) => {
        // Only close if clicking directly on backdrop, not the modal content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px'
    }}>
      <div className="modal-content" style={{
        width: '100%',
        maxWidth: '600px',
        height: '80vh',
        maxHeight: '700px',
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Close Button - Only show when not viewing injuries */}
        {showMainClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '2px solid #374151',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '20px',
              zIndex: 1002,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#374151';
              e.target.style.color = 'white';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.95)';
              e.target.style.color = 'black';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ✕
          </button>
        )}
        
        {/* Iframe with game content */}
        <iframe
          key={iframeKey}
          srcDoc={createModalHTML()}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '20px'
          }}
          title={`Game Pick ${currentGameIndex + 1}`}
        />
      </div>
    </div>
  );
};

export default GamePickModal;