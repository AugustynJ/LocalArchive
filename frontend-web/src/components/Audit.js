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

  if (loading) return <div>Ładowanie...</div>;

  return (
    <div>
      <h1>Ostatnio dodane zdjęcia</h1>
      {since && (
        <p style={{ color: '#666' }}>
          Zdjęcia dodane od ostatniego logowania:{' '}
          <strong>{new Date(since).toLocaleString('pl-PL')}</strong>
        </p>
      )}
      {!since && <p style={{ color: '#666' }}>Brak daty poprzedniego logowania — wyświetlono wszystkie zdjęcia.</p>}

      {photos.length === 0 ? (
        <p>Brak nowych zdjęć od ostatniego logowania.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {['ID', 'Tytuł', 'Lokalizacja', 'Rok', 'Właściciel', 'Zablokowane', 'Dodano'].map(h => (
                <th key={h} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', background: '#f5f5f5' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {photos.map(photo => (
              <tr key={photo.id}>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{photo.id}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{photo.title}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{photo.location || '—'}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{photo.photo_year ?? '—'}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{photo.owner_id}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{photo.is_blocked ? 'Tak' : 'Nie'}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{new Date(photo.created_at).toLocaleString('pl-PL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: '20px' }}>
        <button onClick={() => navigate('/admin')}>Powrót do panelu</button>
      </div>
    </div>
  );
}

export default Audit;
