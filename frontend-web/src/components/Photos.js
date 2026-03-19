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

  return (
    <div className="page-container with-header fade-in">
      <div className="content-wrapper wide">
        <h1>📷 Zdjęcia</h1>

        <div className="navigation-section">
          {canEdit && (
            <div className="button-group">
              <button onClick={() => navigate('/photos/add')} className="btn btn-primary">
                ➕ Dodaj zdjęcie
              </button>
              <button onClick={() => navigate('/my_photos')} className="btn btn-secondary">
                💼 Moje zdjęcia
              </button>
            </div>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '20px', 
          flexWrap: 'wrap', 
          alignItems: 'flex-end',
          padding: '20px',
          backgroundColor: 'var(--surface-color)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
            <label style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '14px', 
              marginBottom: '8px', 
              display: 'block' 
            }}>
              🔍 Nazwa
            </label>
            <input
              className="input-field"
              type="text"
              value={nameFilter}
              onChange={handleFilterChange(setNameFilter)}
              placeholder="Szukaj po nazwie..."
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: 0, minWidth: '100px' }}>
            <label style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '14px', 
              marginBottom: '8px', 
              display: 'block' 
            }}>
              📅 Rok od
            </label>
            <input
              className="input-field"
              type="number"
              value={yearFrom}
              onChange={handleFilterChange(setYearFrom)}
              placeholder="np. 2000"
              min={1}
              max={9999}
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: 0, minWidth: '100px' }}>
            <label style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '14px', 
              marginBottom: '8px', 
              display: 'block' 
            }}>
              📅 Rok do
            </label>
            <input
              className="input-field"
              type="number"
              value={yearTo}
              onChange={handleFilterChange(setYearTo)}
              placeholder="np. 2024"
              min={1}
              max={9999}
            />
          </div>
          
          <button 
            onClick={() => { setNameFilter(''); setYearFrom(''); setYearTo(''); setPage(1); }}
            className="btn btn-secondary"
            style={{ marginBottom: '20px' }}
          >
            🗑️ Wyczyść filtry
          </button>
        </div>

        <p style={{ 
          color: 'var(--text-secondary)', 
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: 'var(--background-color)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          📊 Wyniki: <strong style={{ color: 'var(--primary-color)' }}>{filtered.length}</strong>
          {filtered.length !== photos.length && ` / ${photos.length}`}
        </p>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
          gap: '20px',
          marginBottom: '30px'
        }}>
          {paginated.length === 0 && (
            <div className="error-container">
              <p>🔍 Brak zdjęć spełniających kryteria.</p>
            </div>
          )}
          {paginated.map(photo => (
            <div
              key={photo.id}
              onClick={() => navigate(`/photo/${photo.id}`)}
              style={{ 
                cursor: 'pointer', 
                textAlign: 'center',
                padding: '15px',
                backgroundColor: 'var(--surface-color)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px var(--shadow-color)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 8px 20px var(--shadow-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px var(--shadow-color)';
              }}
            >
              <img
                src={`/api/v1/media/${photo.filename}`}
                alt={photo.title}
                style={{ 
                  width: '100%', 
                  height: '180px', 
                  objectFit: 'cover',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}
              />
              <div style={{ 
                fontWeight: 'bold', 
                color: 'var(--text-color)',
                marginBottom: '5px',
                fontSize: '16px'
              }}>
                {photo.title}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                📍 {photo.location}
                {photo.photo_year && (
                  <>
                    <br />📅 {photo.photo_year}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div style={{ 
            marginBottom: '30px', 
            display: 'flex', 
            gap: '8px', 
            alignItems: 'center',
            justifyContent: 'center',
            padding: '15px',
            backgroundColor: 'var(--surface-color)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            <button 
              onClick={() => setPage(1)} 
              disabled={safePage === 1}
              className="btn btn-secondary"
              style={{ minWidth: '40px' }}
            >
              «
            </button>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={safePage === 1}
              className="btn btn-secondary"
              style={{ minWidth: '40px' }}
            >
              ‹
            </button>
            <span style={{ 
              color: 'var(--text-color)', 
              padding: '0 15px',
              fontSize: '14px'
            }}>
              Strona <strong style={{ color: 'var(--primary-color)' }}>{safePage}</strong> / 
              <strong style={{ color: 'var(--primary-color)' }}>{totalPages}</strong>
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={safePage === totalPages}
              className="btn btn-secondary"
              style={{ minWidth: '40px' }}
            >
              ›
            </button>
            <button 
              onClick={() => setPage(totalPages)} 
              disabled={safePage === totalPages}
              className="btn btn-secondary"
              style={{ minWidth: '40px' }}
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Photos;

