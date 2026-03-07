import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function ManagePhotos() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPhotoId, setHoveredPhotoId] = useState(null);
  const navigate = useNavigate();

  const handleBlock = async (photoId, photoTitle) => {
    if (!window.confirm(`Czy na pewno chcesz zablokować zdjęcie "${photoTitle}"?`)) return;
    try {
      await api.put(`/admin/photos/${photoId}/block`);
      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, is_blocked: true } : p));
    } catch (err) {
      alert('Błąd podczas blokowania zdjęcia.');
    }
  };

  const handleUnblock = async (photoId, photoTitle) => {
    if (!window.confirm(`Czy na pewno chcesz odblokować zdjęcie "${photoTitle}"?`)) return;
    try {
      await api.put(`/admin/photos/${photoId}/unblock`);
      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, is_blocked: false } : p));
    } catch (err) {
      alert('Błąd podczas odblokowywania zdjęcia.');
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const userRes = await api.get('/user/info');
      if (userRes.data.role !== 'admin') {
        navigate('/user');
        return;
      }
      const res = await api.get('/admin/manage_photos');
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
      <h1>Zarządzanie zdjęciami</h1>
      <p>Łącznie: <strong>{photos.length}</strong></p>

      {photos.length === 0 ? (
        <p>Brak zdjęć.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {['ID', 'Tytuł', 'Lokalizacja', 'Rok', 'Właściciel', 'Zablokowane', 'Dodano', 'Blokada'].map(h => (
                <th key={h} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', background: '#f5f5f5' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {photos.map(photo => (
              <tr key={photo.id} style={photo.is_blocked ? { background: '#fff0f0' } : {}}>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{photo.id}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{photo.title}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{photo.location || '—'}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{photo.photo_year ?? '—'}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{photo.owner_id}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{photo.is_blocked ? 'Tak' : 'Nie'}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{new Date(photo.created_at).toLocaleString('pl-PL')}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                  <button
                    onClick={() => photo.is_blocked
                      ? handleUnblock(photo.id, photo.title)
                      : handleBlock(photo.id, photo.title)
                    }
                    onMouseEnter={() => setHoveredPhotoId(photo.id)}
                    onMouseLeave={() => setHoveredPhotoId(null)}
                    style={{
                      background: photo.is_blocked
                        ? (hoveredPhotoId === photo.id ? '#27ae60' : '#aaa')
                        : '#c0392b',
                      color: '#fff', border: 'none', padding: '4px 10px',
                      borderRadius: '4px', cursor: 'pointer', width: '100px'
                    }}
                  >
                    {photo.is_blocked
                      ? (hoveredPhotoId === photo.id ? 'Odblokuj' : 'Zablokowane')
                      : 'Zablokuj'
                    }
                  </button>
                </td>
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

export default ManagePhotos;
