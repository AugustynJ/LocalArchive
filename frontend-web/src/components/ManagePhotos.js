import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import ConfirmDialog from './ConfirmDialog';
import Notice from './Notice';

function ManagePhotos() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);
  const [pending, setPending] = useState(null); // { id, name, block } – czeka na potwierdzenie
  const [hoveredPhotoId, setHoveredPhotoId] = useState(null);
  const navigate = useNavigate();

  const closeDialog = useCallback(() => setPending(null), []);
  const handleBlock = (id, name) => setPending({ id, name, block: true });
  const handleUnblock = (id, name) => setPending({ id, name, block: false });

  const confirmToggle = async () => {
    const { id, name, block } = pending;
    setPending(null);
    setActionMessage(null);
    try {
      await api.put(`/admin/photos/${id}/${block ? 'block' : 'unblock'}`);
      setPhotos(prev => prev.map(x => x.id === id ? { ...x, is_blocked: block } : x));
      setActionMessage({ type: 'success', text: `Zdjęcie „${name}” zostało ${block ? 'zablokowane' : 'odblokowane'}.` });
    } catch (err) {
      setActionMessage({ type: 'error', text: `Błąd podczas ${block ? 'blokowania' : 'odblokowywania'} zdjęcia. Spróbuj ponownie.` });
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
        <h1>📷 Zarządzanie zdjęciami</h1>
        <Notice message={actionMessage} />
        <ConfirmDialog
          open={!!pending}
          title={pending?.block ? 'Zablokować zdjęcie?' : 'Odblokować zdjęcie?'}
          message={pending ? `Czy na pewno chcesz ${pending.block ? 'zablokować' : 'odblokować'} zdjęcie „${pending.name}”?` : ''}
          confirmLabel={pending?.block ? 'Zablokuj' : 'Odblokuj'}
          danger={!!pending?.block}
          onConfirm={confirmToggle}
          onCancel={closeDialog}
        />
        
        <div style={{ 
          color: 'var(--text-secondary)', 
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: 'var(--background-color)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          📊 Łącznie: <strong style={{ color: 'var(--primary-color)' }}>{photos.length}</strong> zdjęć
        </div>

        {photos.length === 0 ? (
          <div className="error-container">
            <p>📷 Brak zdjęć.</p>
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
              <caption className="sr-only">Wszystkie zdjęcia</caption>
              <thead>
                <tr style={{ backgroundColor: 'var(--background-color)' }}>
                  {['ID', 'Tytuł', 'Lokalizacja', 'Rok', 'Właściciel', 'Zablokowane', 'Dodano', 'Blokada'].map(h => (
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
                    backgroundColor: photo.is_blocked 
                      ? 'rgba(231, 76, 60, 0.05)' 
                      : 'var(--surface-color)'
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
                    <td style={{ 
                      border: '1px solid var(--border-color)', 
                      padding: '8px'
                    }}>
                      <button
                        onClick={() => photo.is_blocked
                          ? handleUnblock(photo.id, photo.title)
                          : handleBlock(photo.id, photo.title)
                        }
                        onMouseEnter={() => setHoveredPhotoId(photo.id)}
                        onMouseLeave={() => setHoveredPhotoId(null)}
                        onFocus={() => setHoveredPhotoId(photo.id)}
                        onBlur={() => setHoveredPhotoId(null)}
                        aria-label={`${photo.is_blocked ? 'Odblokuj' : 'Zablokuj'} zdjęcie ${photo.title}`}
                        className="btn"
                        style={{
                          fontSize: '12px',
                          padding: '6px 12px',
                          minWidth: '100px',
                          backgroundColor: photo.is_blocked
                            ? (hoveredPhotoId === photo.id ? 'var(--button-success-bg)' : 'var(--button-secondary-bg)')
                            : 'var(--button-danger-bg)',
                          color: 'white',
                          border: 'none'
                        }}
                      >
                        {photo.is_blocked
                          ? (hoveredPhotoId === photo.id ? '✔️ Odblokuj' : '🚫 Zablokowane')
                          : '🚫 Zablokuj'
                        }
                      </button>
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

export default ManagePhotos;
