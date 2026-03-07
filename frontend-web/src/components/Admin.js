import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState('');
  const navigate = useNavigate();

  const checkAccess = useCallback(async () => {
    try {
      const response = await api.get('/user/info');
      if (response.data.role !== 'admin') {
        navigate('/user');
      }
    } catch (err) {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  const runAdminTest = async () => {
    setTestResult(null);
    setTestError('');
    try {
      const response = await api.get('/admin/test');
      setTestResult(response.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setTestError('Brak dostępu - niewystarczające uprawnienia');
      } else if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setTestError('Błąd podczas wywołania endpointu');
      }
    }
  };

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  return (
    <div>
      <h1>Panel administratora</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/admin/audit')}>Ostatnio dodane</button>
        <button onClick={() => navigate('/admin/manage_users')}>Zarządzanie użytkownikami</button>
        <button onClick={() => navigate('/admin/manage_photos')}>Zarządzanie zdjęciami</button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Test dostępu do API</h2>
        <button onClick={runAdminTest}>Wyślij żądanie do /admin/test</button>
        {testResult && (
          <div style={{ marginTop: '10px', color: 'green' }}>
            <strong>Odpowiedź:</strong> {JSON.stringify(testResult)}
          </div>
        )}
        {testError && (
          <div style={{ marginTop: '10px', color: 'red' }}>
            <strong>Błąd:</strong> {testError}
          </div>
        )}
      </div>

      <div>
        <button onClick={() => navigate('/user')}>Powrót do panelu użytkownika</button>
      </div>
    </div>
  );
}

export default Admin;
