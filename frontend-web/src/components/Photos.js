import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const PAGE_SIZE = 10;

function Photos() {
  const [role, setRole] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const [userRes, photosRes] = await Promise.all([
        api.get('/user/info'),
        api.get('/photos'),
      ]);
      setRole(userRes.data.role);
      setPhotos(photosRes.data.filter(p => !p.is_blocked));
    } catch (err) {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const canEdit = role === 'admin' || role === 'editor';

  const filtered = photos.filter(p => {
    if (nameFilter && !p.title.toLowerCase().includes(nameFilter.toLowerCase())) return false;
    if (yearFrom !== '' && (p.photo_year === null || p.photo_year < parseInt(yearFrom))) return false;
    if (yearTo !== '' && (p.photo_year === null || p.photo_year > parseInt(yearTo))) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  if (loading) return <div>Ładowanie...</div>;

  return (
    <div>
      <h1>Zdjęcia</h1>

      <div style={{ marginBottom: '20px' }}>
        {canEdit && (
          <button onClick={() => navigate('/photos/add')} style={{ marginRight: '10px' }}>
            Dodaj zdjęcie
          </button>
        )}
        {canEdit && (
          <button onClick={() => navigate('/my_photos')}>
            Moje zdjęcia
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Nazwa
          <input
            type="text"
            value={nameFilter}
            onChange={handleFilterChange(setNameFilter)}
            placeholder="Szukaj po nazwie..."
            style={{ padding: '6px', width: '200px' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Rok od
          <input
            type="number"
            value={yearFrom}
            onChange={handleFilterChange(setYearFrom)}
            placeholder="np. 2000"
            min={1}
            max={9999}
            style={{ padding: '6px', width: '100px' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Rok do
          <input
            type="number"
            value={yearTo}
            onChange={handleFilterChange(setYearTo)}
            placeholder="np. 2024"
            min={1}
            max={9999}
            style={{ padding: '6px', width: '100px' }}
          />
        </label>
        <button onClick={() => { setNameFilter(''); setYearFrom(''); setYearTo(''); setPage(1); }}>
          Wyczyść filtry
        </button>
      </div>

      <p style={{ color: '#666', marginBottom: '12px' }}>
        Wyniki: <strong>{filtered.length}</strong>
        {filtered.length !== photos.length && ` / ${photos.length}`}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {paginated.length === 0 && <p>Brak zdjęć spełniających kryteria.</p>}
        {paginated.map(photo => (
          <div
            key={photo.id}
            onClick={() => navigate(`/photo/${photo.id}`)}
            style={{ cursor: 'pointer', textAlign: 'center', width: '200px' }}
          >
            <img
              src={`/api/v1/media/${photo.filename}`}
              alt={photo.title}
              style={{ width: '200px', height: '200px', objectFit: 'cover' }}
            />
            <div><strong>{photo.title}</strong></div>
            <div style={{ color: '#666' }}>{photo.location}{photo.photo_year ? `, ${photo.photo_year}` : ''}</div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setPage(1)} disabled={safePage === 1}>«</button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
          <span>Strona <strong>{safePage}</strong> / <strong>{totalPages}</strong></span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
          <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</button>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <button onClick={() => navigate('/user')}>Powrót</button>
      </div>
    </div>
  );
}

export default Photos;

