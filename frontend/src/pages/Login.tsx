import React from 'react';


const Login: React.FC = () => {
  const handleDiscordLogin = () => {
    window.location.href = "http://localhost:3001/auth/discord";
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <h1>Login to Team Finder</h1>
      <button 
        onClick={handleDiscordLogin}
        style={{
          backgroundColor: '#5865F2',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        Login with Discord
      </button>
    </div>
  );
};

export default Login;