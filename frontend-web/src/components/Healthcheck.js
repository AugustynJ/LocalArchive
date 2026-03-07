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
    <div>
      <h2>Healthcheck</h2>
      <p>{status}</p>
      <button onClick={handleRefresh} disabled={isLoading}>
        {isLoading ? 'Sprawdzanie...' : 'Odśwież'}
      </button>
    </div>
  );
}

export default Healthcheck;