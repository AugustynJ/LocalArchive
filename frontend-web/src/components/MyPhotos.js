import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function MyPhotos() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', location: '', photo_year: '' });
  const [editErrors, setEditErrors] = useState([]);
  const [editSuccess, setEditSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const userRes = await api.get('/user/info');
      const { role } = userRes.data;
      if (role !== 'admin' && role !== 'editor') {
        navigate('/photos');
        return;
      }
      const photosRes = await api.get('/photos/my_photos');
      setPhotos(photosRes.data);
    } catch (err) {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEdit = (photo) => {
    setEditingPhoto(photo);
    setEditForm({
      title: photo.title,
      location: photo.location || '',
      photo_year: photo.photo_year ?? '',
    });
    setEditErrors([]);
    setEditSuccess('');
  };

  const closeEdit = () => {
    setEditingPhoto(null);
    setEditErrors([]);
    setEditSuccess('');
  };

  const handleDelete = async () => {
    if (!window.confirm(`Czy na pewno chcesz usunąć "${editingPhoto.title}"?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/photos/${editingPhoto.id}`);
      setPhotos(prev => prev.filter(p => p.id !== editingPhoto.id));
      closeEdit();
    } catch (err) {
      if (err.response?.data?.error) {
        setEditErrors([err.response.data.error]);
      } else {
        setEditErrors(['Błąd podczas usuwania zdjęcia.']);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = [];
    if (!editForm.title.trim()) errors.push('Nazwa jest wymagana.');
    if (!editForm.location.trim()) errors.push('Lokalizacja jest wymagana.');
    if (editForm.photo_year && !/^\d+$/.test(String(editForm.photo_year))) {
      errors.push('Rok musi być liczbą całkowitą.');
    }
    if (errors.length > 0) {
      setEditErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: editForm.title.trim(),
        location: editForm.location.trim(),
        photo_year: editForm.photo_year ? parseInt(editForm.photo_year) : null,
      };
      await api.put(`/photos/${editingPhoto.id}`, payload);
      setPhotos(prev => prev.map(p => p.id === editingPhoto.id ? { ...p, ...payload } : p));
      setEditSuccess('Zmiany zostały zapisane.');
      setEditErrors([]);
    } catch (err) {
      if (err.response?.data?.error) {
        setEditErrors([err.response.data.error]);
      } else {
        setEditErrors(['Błąd podczas zapisywania zmian.']);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Ładowanie...</div>;

  return (
    <div>
      <h1>Moje zdjęcia</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {photos.length === 0 && <p>Nie masz jeszcze żadnych zdjęć.</p>}
        {photos.map(photo => (
          <div key={photo.id} style={{ textAlign: 'center', width: '200px' }}>
            <img
              src={`/api/v1/media/${photo.filename}`}
              alt={photo.title}
              style={{ width: '200px', height: '200px', objectFit: 'cover' }}
            />
            <div><strong>{photo.title}</strong></div>
            {photo.is_blocked && (
              <div style={{ color: '#c0392b', fontWeight: 'bold', fontSize: '12px' }}>ZABLOKOWANE</div>
            )}
            <div style={{ color: '#666' }}>{photo.location}</div>
            <div style={{ color: '#666' }}>{photo.photo_year ?? '—'}</div>
            <button onClick={() => openEdit(photo)} style={{ marginTop: '6px' }}>
              Edytuj
            </button>
          </div>
        ))}
      </div>

      {editingPhoto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', padding: '24px', borderRadius: '8px',
            minWidth: '320px', maxWidth: '480px', width: '100%'
          }}>
            <h2>Edytuj zdjęcie</h2>

            {editErrors.length > 0 && (
              <ul style={{ color: 'red' }}>
                {editErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            )}
            {editSuccess && <p style={{ color: 'green' }}>{editSuccess}</p>}

            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label>
                  Nazwa:<br />
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    maxLength={255}
                    style={{ width: '100%' }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>
                  Lokalizacja:<br />
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                    maxLength={255}
                    style={{ width: '100%' }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>
                  Rok:<br />
                  <input
                    type="number"
                    value={editForm.photo_year}
                    onChange={e => setEditForm(f => ({ ...f, photo_year: e.target.value }))}
                    min={1}
                    max={9999}
                    style={{ width: '100%' }}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  style={{ color: '#fff', background: '#c0392b', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {deleting ? 'Usuwanie...' : 'Usuń'}
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={closeEdit} disabled={deleting || saving}>Anuluj</button>
                  <button type="submit" disabled={saving || deleting}>
                    {saving ? 'Zapisywanie...' : 'Zapisz'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <button onClick={() => navigate('/photos')}>Powrót do zdjęć</button>
      </div>
    </div>
  );
}

export default MyPhotos;
