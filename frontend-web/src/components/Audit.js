import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function Audit() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [since, setSince] = useState(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const userRes = await api.get('/user/info');
      if (userRes.data.role !== 'admin') {
        navigate('/user');
        return;
      }
      setSince(userRes.data.last_last_login);
      const res = await api.get('/admin/audit');
      setPhotos(res.data);
    } catch (err) {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        <h1>📊 Ostatnio dodane zdjęcia</h1>
        
        {since && (
          <div style={{ 
            color: 'var(--text-secondary)', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: 'var(--background-color)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            📅 Zdjęcia dodane od ostatniego logowania:{' '}
            <strong style={{ color: 'var(--primary-color)' }}>
              {new Date(since).toLocaleString('pl-PL')}
            </strong>
          </div>
        )}
        {!since && (
          <div style={{ 
            color: 'var(--text-secondary)', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: 'var(--background-color)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            ℹ️ Brak daty poprzedniego logowania — wyświetlono wszystkie zdjęcia.
          </div>
        )}

        {photos.length === 0 ? (
          <div className="error-container">
            <p>📷 Brak nowych zdjęć od ostatniego logowania.</p>
          </div>
        ) : (
          <div style={{
            overflowX: 'auto',
            backgroundColor: 'var(--surface-color)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            marginBottom: '20px'
          }}>
            <table style={{ 
              borderCollapse: 'collapse', 
              width: '100%',
              backgroundColor: 'var(--surface-color)'
            }}>
              <caption className="sr-only">Zdjęcia dodane od ostatniego logowania</caption>
              <thead>
                <tr style={{ backgroundColor: 'var(--background-color)' }}>
                  {['ID', 'Tytuł', 'Lokalizacja', 'Rok', 'Właściciel', 'Zablokowane', 'Dodano'].map(h => (
                    <th key={h} scope="col" style={{ 
                      border: '1px solid var(--border-color)', 
                      padding: '12px 8px', 
                      textAlign: 'left', 
                      color: 'var(--text-color)',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {photos.map(photo => (
                  <tr key={photo.id} style={{
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: 'var(--surface-color)'
                  }}>
                    <td style={{ 
                      border: '1px solid var(--border-color)', 
                      padding: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '14px'
                    }}>
                      {photo.id}
                    </td>
                    <td style={{ 
                      border: '1px solid var(--border-color)', 
                      padding: '8px',
                      color: 'var(--text-color)',
                      fontWeight: '500'
                    }}>
                      {photo.title}
                    </td>
                    <td style={{ 
                      border: '1px solid var(--border-color)', 
                      padding: '8px',
                      color: 'var(--text-secondary)'
                    }}>
                      {photo.location || '—'}
                    </td>
                    <td style={{ 
                      border: '1px solid var(--border-color)', 
                      padding: '8px',
                      color: 'var(--text-secondary)'
                    }}>
                      {photo.photo_year ?? '—'}
                    </td>
                    <td style={{ 
                      border: '1px solid var(--border-color)', 
                      padding: '8px',
                      color: 'var(--text-secondary)'
                    }}>
                      {photo.owner_id}
                    </td>
                    <td style={{ 
                      border: '1px solid var(--border-color)', 
                      padding: '8px'
                    }}>
                      <span className={photo.is_blocked ? 'status-blocked' : 'status-active'}>
                        {photo.is_blocked ? 'Tak' : 'Nie'}
                      </span>
                    </td>
                    <td style={{ 
                      border: '1px solid var(--border-color)', 
                      padding: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '13px'
                    }}>
                      {new Date(photo.created_at).toLocaleString('pl-PL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Audit;
