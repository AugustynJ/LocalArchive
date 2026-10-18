import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { SESSION_REQUIRED } from '../constants';
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
      } else if (err.response?.status === SESSION_REQUIRED) {
        navigate('/login');
      } else {
        setTestError('Błąd podczas wywołania endpointu');
      }
    }
  };

  if (loading) {
    return (
      <div className="page-container with-header fade-in">
        <div className="content-wrapper">
          <div className="loading-container" role="status">
            <div>🔄 Ładowanie...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container with-header fade-in">
      <div className="content-wrapper wide">
        <h1>⚙️ Panel administratora</h1>

        <nav className="navigation-section" aria-label="Zarządzanie">
          <h2>Zarządzanie</h2>
          <div className="button-group">
            <button onClick={() => navigate('/admin/audit')} className="btn btn-primary">
              📊 Ostatnio dodane
            </button>
            <button onClick={() => navigate('/admin/manage_users')} className="btn btn-primary">
              👥 Zarządzanie użytkownikami
            </button>
            <button onClick={() => navigate('/admin/manage_photos')} className="btn btn-primary">
              📷 Zarządzanie zdjęciami
            </button>
          </div>
        </nav>

        <div className="navigation-section">
          <h2>Test dostępu do API</h2>
          <div className="button-group">
            <button onClick={runAdminTest} className="btn btn-secondary">
              🧪 Wyślij żądanie do /admin/test
            </button>
          </div>
          
          {testResult && (
            <div style={{ 
              marginTop: '15px', 
              color: 'var(--success-color)',
              padding: '10px',
              backgroundColor: 'rgba(39, 174, 96, 0.1)',
              borderRadius: '8px',
              border: '1px solid var(--success-color)'
            }}>
              <strong>✔️ Odpowiedź:</strong> {JSON.stringify(testResult)}
            </div>
          )}
          {testError && (
            <div className="error-message" style={{ marginTop: '15px' }}>
              ⚠️ <strong>Błąd:</strong> {testError}
            </div>
          )}
        </div>

        <div className="navigation-section">
          <div className="button-group">
            <button onClick={() => navigate('/user')} className="btn btn-secondary">
              🚪 Powrót do panelu użytkownika
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Admin;
