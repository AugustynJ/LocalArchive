import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
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
      if (err.response?.status === 401) {
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
      if (err.response?.status === 401) {
        // Token already expired, just redirect
        navigate('/login');
      } else {
        // Show error but still redirect for security
        alert('Błąd podczas wylogowywania, ale zostaniesz przekierowany');
        navigate('/login');
      }
    }
  };

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  if (error) {
    return (
      <div>
        <div style={{color: 'red'}}>{error}</div>
        <button onClick={() => navigate('/login')}>Powrót do logowania</button>
      </div>
    );
  }

  if (!userInfo) {
    return <div>Brak danych użytkownika</div>;
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
    <div>
      <h1>Panel użytkownika</h1>
      <div style={{ marginBottom: '20px' }}>
        <h2>Informacje o koncie</h2>
        <p><strong>Imię:</strong> {userInfo.first_name}</p>
        <p><strong>Nazwisko:</strong> {userInfo.last_name}</p>
        <p><strong>Email:</strong> {userInfo.email}</p>
        <p><strong>Rola:</strong> {getRoleDisplayName(userInfo.role)}</p>
        <p><strong>Status:</strong> {userInfo.is_blocked ? 'Zablokowane' : 'Aktywne'}</p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Nawigacja</h2>
        <button onClick={() => navigate('/photos')}>
          Przeglądaj zdjęcia
        </button>

        {(userInfo.role === 'admin' || userInfo.role === 'editor') && (
          <button onClick={() => navigate('/photos/add')} style={{ marginLeft: '10px' }}>
            Dodaj zdjęcie
          </button>
        )}

        {userInfo.role === 'admin' && (
          <button onClick={() => navigate('/admin')} style={{ marginLeft: '10px' }}>
            Panel administratora
          </button>
        )}
      </div>

      <div>
        <button onClick={handleLogout}>Wyloguj się</button>
        <button onClick={() => navigate('/user/change_password')} style={{ marginLeft: '10px' }}>
          Zmień hasło
        </button>
        <button onClick={fetchUserInfo} style={{ marginLeft: '10px' }}>
          Odśwież dane
        </button>
      </div>
    </div>
  );
}

export default User;