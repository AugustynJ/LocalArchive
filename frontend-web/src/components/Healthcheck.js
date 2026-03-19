import React, { useState, useEffect } from 'react';
import api from '../api';

function Healthcheck() {
  const [status, setStatus] = useState('Sprawdzanie...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/healthcheck');
      if (response.data.status === 'ok') {
        setStatus('✅ Aplikacja działa prawidłowo');
      } else {
        setStatus('⚠️ Aplikacja działa, ale status nieoczekiwany');
      }
    } catch (err) {
      setStatus('❌ Błąd połączenia z aplikacją');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    checkHealth();
  };

  return (
    <div className="page-container with-header fade-in">
      <div className="content-wrapper">
        <h1>Healthcheck</h1>
        <div className="user-info">
          <div className="user-info-item">
            <span className="user-info-label">Status aplikacji:</span>
            <span className="user-info-value">{status}</span>
          </div>
        </div>
        <div className="button-group">
          <button 
            onClick={handleRefresh} 
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? '🔄 Sprawdzanie...' : '🔄 Odśwież'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Healthcheck;