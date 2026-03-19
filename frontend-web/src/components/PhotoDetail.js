import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';

function PhotoDetail() {
  const { id } = useParams();
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchPhoto = useCallback(async () => {
    try {
      const response = await api.get(`/photos/${id}`);
      setPhoto(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else if (err.response?.status === 404) {
        setError('Zdjęcie nie zostało znalezione.');
      } else {
        setError('Błąd podczas pobierania zdjęcia.');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchPhoto();
  }, [fetchPhoto]);

  if (loading) {
    return (
      <div className="page-container with-header fade-in">
        <div className="content-wrapper">
          <div className="loading-container">
            <div>🔄 Ładowanie...</div>
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
            <div className="error-message">⚠️ {error}</div>
            <div className="button-group" style={{marginTop: '20px'}}>
              <button onClick={() => navigate('/photos')} className="btn btn-primary">
                ← Powrót do zdjęć
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container with-header fade-in">
      <div className="content-wrapper wide">
        <h1>📷 {photo.title}</h1>
        
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: 'var(--background-color)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}>
          <img
            src={`/api/v1/media/${photo.filename}`}
            alt={photo.title}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '600px', 
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 4px 12px var(--shadow-color)'
            }}
          />
        </div>
        
        <div className="user-info">
          <div className="user-info-item">
            <span className="user-info-label">📍 Lokalizacja:</span>
            <span className="user-info-value">{photo.location}</span>
          </div>
          <div className="user-info-item">
            <span className="user-info-label">📅 Rok:</span>
            <span className="user-info-value">{photo.photo_year ?? '—'}</span>
          </div>
          <div className="user-info-item">
            <span className="user-info-label">🕰️ Dodano:</span>
            <span className="user-info-value">{new Date(photo.created_at).toLocaleString('pl-PL')}</span>
          </div>
        </div>
        
        <div className="button-group">
          <button onClick={() => navigate('/photos')} className="btn btn-secondary">
            ← Powrót do zdjęć
          </button>
        </div>
      </div>
    </div>
  );
}

export default PhotoDetail;
