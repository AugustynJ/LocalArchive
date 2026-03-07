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

  if (loading) return <div>Ładowanie...</div>;

  if (error) return (
    <div>
      <div style={{ color: 'red' }}>{error}</div>
      <button onClick={() => navigate('/photos')}>Powrót do zdjęć</button>
    </div>
  );

  return (
    <div>
      <h1>{photo.title}</h1>
      <img
        src={`/api/v1/media/${photo.filename}`}
        alt={photo.title}
        style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
      />
      <p><strong>Lokalizacja:</strong> {photo.location}</p>
      <p><strong>Rok:</strong> {photo.photo_year ?? '—'}</p>
      <p><strong>Dodano:</strong> {new Date(photo.created_at).toLocaleString('pl-PL')}</p>
      <button onClick={() => navigate('/photos')}>Powrót do zdjęć</button>
    </div>
  );
}

export default PhotoDetail;
