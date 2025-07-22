import React from 'react';

const ProfilePageTest = () => {
  return (
    <div style={{ 
      backgroundColor: 'red', 
      color: 'white', 
      padding: '50px', 
      fontSize: '24px', 
      fontWeight: 'bold', 
      textAlign: 'center' 
    }}>
      🚨 TEST PROFILE PAGE - THIS SHOULD ALWAYS SHOW 🚨
      
      <div style={{ 
        backgroundColor: 'orange', 
        color: 'black', 
        padding: '20px', 
        margin: '20px',
        borderRadius: '10px'
      }}>
        <h2>🎮 Simple AdminPanel Test</h2>
        <button 
          onClick={() => alert('AdminPanel button clicked!')}
          style={{
            backgroundColor: '#FA4616',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Click Me - Test AdminPanel
        </button>
      </div>
    </div>
  );
};

export default ProfilePageTest;