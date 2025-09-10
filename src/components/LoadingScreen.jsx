import React from 'react';
import logoUrl from '../assets/logo-new-anota.svg';
import '../assets/index.css'; // Garante acesso às variáveis de tema

const LoadingScreen = () => (
  <div style={{
    height: '100vh',
    width: '100vw',
    background: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2rem',
    fontFamily: 'inherit'
  }}>
    <img src={logoUrl} alt="Anota Logo" style={{ width: 120, height: 120 }} />
    <div
      style={{
        width: 40,
        height: 40,
        border: '4px solid rgba(255,255,255,0.2)',
        borderTopColor: 'var(--accent-primary, #FF6D4D)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}
    />
    <style>
      {`@keyframes spin { to { transform: rotate(360deg); } }`}
    </style>
  </div>
);

export default LoadingScreen;