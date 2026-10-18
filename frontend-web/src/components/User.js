import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { SESSION_REQUIRED } from '../constants';
import { useNavigate } from 'react-router-dom';

function User() {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchUserInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/info');
      setUserInfo(response.data);
      setError('');
    } catch (err) {
      if (err.response?.status === SESSION_REQUIRED) {
        // Token expired or invalid - redirect to login
        navigate('/login');
      } else if (err.response?.status === 403) {
        setError('Konto zostało zablokowane');
      } else if (err.response?.status === 404) {
        setError('Użytkownik nie został znaleziony');
      } else {
        setError('Błąd podczas pobierania danych użytkownika');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const handleLogout = async () => {
    try {
      // Call logout API endpoint to clear server-side tokens
      await api.post('/logout');
      // Redirect to login after successful logout
      navigate('/login');
    } catch (err) {
      // If logout fails, still redirect to login but show error
      console.error('Logout error:', err);
      if (err.response?.status === SESSION_REQUIRED) {
        // Token already expired, just redirect
        navigate('/login');
      } else {
        // Show error but still redirect for security
        navigate('/login', { state: { logoutFailed: true } });
      }
    }
  };

  if (loading) {
    return (
      <div className="page-container with-header fade-in">
        <div className="content-wrapper">
          <div className="loading-container" role="status">
            <div>⏳ Ładowanie...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container with-header fade-in">
        <div className="content-wrapper">
          <div className="error-container">
            <div className="error-message">❌ {error}</div>
            <button onClick={() => navigate('/login')} className="btn btn-primary" style={{marginTop: '20px'}}>
              Powrót do logowania
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="page-container with-header fade-in">
        <div className="content-wrapper">
          <div className="error-container">
            <div>Brak danych użytkownika</div>
          </div>
        </div>
      </div>
    );
  }

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'admin': 'Administrator',
      'editor': 'Edytor',
      'viewer': 'Użytkownik'
    };
    return roleNames[role] || role;
  };

  return (
    <div className="page-container with-header fade-in">
      <div className="content-wrapper wide">
        <h1>Panel użytkownika</h1>
        
        <div className="user-info">
          <h2>Informacje o koncie</h2>
          <div className="user-info-item">
            <span className="user-info-label">Imię:</span>
            <span className="user-info-value">{userInfo.first_name}</span>
          </div>
          <div className="user-info-item">
            <span className="user-info-label">Nazwisko:</span>
            <span className="user-info-value">{userInfo.last_name}</span>
          </div>
          <div className="user-info-item">
            <span className="user-info-label">Email:</span>
            <span className="user-info-value">{userInfo.email}</span>
          </div>
          <div className="user-info-item">
            <span className="user-info-label">Rola:</span>
            <span className="user-info-value">{getRoleDisplayName(userInfo.role)}</span>
          </div>
          <div className="user-info-item">
            <span className="user-info-label">Status:</span>
            <span className={`status-badge ${userInfo.is_blocked ? 'status-blocked' : 'status-active'}`}>
              {userInfo.is_blocked ? 'Zablokowane' : 'Aktywne'}
            </span>
          </div>
        </div>
        
        <nav className="navigation-section" aria-label="Nawigacja">
          <h2>Nawigacja</h2>
          <div className="button-group">
            <button onClick={() => navigate('/photos')} className="btn btn-primary">
              📸 Przeglądaj zdjęcia
            </button>

            {(userInfo.role === 'admin' || userInfo.role === 'editor') && (
              <button onClick={() => navigate('/photos/add')} className="btn btn-primary">
                ➕ Dodaj zdjęcie
              </button>
            )}

            {userInfo.role === 'admin' && (
              <button onClick={() => navigate('/admin')} className="btn btn-primary">
                ⚙️ Panel administratora
              </button>
            )}
          </div>
        </nav>

        <div className="navigation-section">
          <h2>Konto</h2>
          <div className="button-group">
            <button onClick={() => navigate('/user/change_password')} className="btn btn-secondary">
              🔐 Zmień hasło
            </button>
            <button onClick={fetchUserInfo} className="btn btn-secondary">
              🔄 Odśwież dane
            </button>
            <button onClick={handleLogout} className="btn btn-secondary">
              🚪 Wyloguj się
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default User;