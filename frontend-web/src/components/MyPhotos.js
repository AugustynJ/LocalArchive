import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { YEAR_MIN, YEAR_MAX } from '../constants';
import ConfirmDialog from './ConfirmDialog';
import Notice from './Notice';

function MyPhotos() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', location: '', photo_year: '' });
  const [editErrors, setEditErrors] = useState([]);
  const [pageMessage, setPageMessage] = useState(null); // komunikat na liście po zapisie/usunięciu
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    setPageMessage(null);
  };

  const closeEdit = () => {
    setEditingPhoto(null);
    setEditErrors([]);
  };

  // Po zapisie/usunięciu: zamknij okno edycji i pokaż komunikat nad listą zdjęć
  const finishWithMessage = (text) => {
    closeEdit();
    setPageMessage({ type: 'success', text });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeConfirm = useCallback(() => setConfirmDelete(false), []);

  // Esc zamyka okno edycji (gdy nie jest otwarte potwierdzenie usunięcia – ono obsługuje Esc samo)
  useEffect(() => {
    if (!editingPhoto || confirmDelete) return;
    const onKey = (e) => { if (e.key === 'Escape') { setEditingPhoto(null); setEditErrors([]); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editingPhoto, confirmDelete]);

  const handleDelete = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    try {
      await api.delete(`/photos/${editingPhoto.id}`);
      setPhotos(prev => prev.filter(p => p.id !== editingPhoto.id));
      finishWithMessage(`Zdjęcie „${editingPhoto.title}” zostało usunięte.`);
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
    } else if (editForm.photo_year && (parseInt(editForm.photo_year) < YEAR_MIN || parseInt(editForm.photo_year) > YEAR_MAX)) {
      errors.push(`Rok musi być z zakresu ${YEAR_MIN}–${YEAR_MAX}.`);
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
      finishWithMessage(`Zmiany w zdjęciu „${payload.title}” zostały zapisane.`);
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
        <h1>📸 Moje zdjęcia</h1>
        <Notice message={pageMessage} />

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
          gap: '20px',
          marginBottom: '30px'
        }}>
          {photos.length === 0 && (
            <div className="error-container">
              <p>📷 Nie masz jeszcze żadnych zdjęć.</p>
            </div>
          )}
          {photos.map(photo => (
            <div key={photo.id} style={{ 
              textAlign: 'center',
              padding: '15px',
              backgroundColor: 'var(--surface-color)',
              borderRadius: '12px',
              border: photo.is_blocked ? '2px solid var(--error-color)' : '1px solid var(--border-color)',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px var(--shadow-color)'
            }}>
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
              {photo.is_blocked && (
                <div className="status-badge status-blocked" style={{ marginBottom: '8px' }}>
                  ZABLOKOWANE
                </div>
              )}
              <div style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '14px',
                marginBottom: '10px'
              }}>
                📍 {photo.location}
                {photo.photo_year && (
                  <>
                    <br />📅 {photo.photo_year}
                  </>
                )}
              </div>
              <button 
                onClick={() => openEdit(photo)} 
                className="btn btn-secondary"
                style={{ fontSize: '14px', padding: '8px 16px' }}
              >
                ✏️ Edytuj
              </button>
            </div>
          ))}
        </div>

      </div>

      <ConfirmDialog
        open={confirmDelete && !!editingPhoto}
        title="Usunąć zdjęcie?"
        message={editingPhoto ? `Czy na pewno chcesz usunąć zdjęcie „${editingPhoto.title}”? Tej operacji nie można cofnąć.` : ''}
        confirmLabel="Usuń"
        danger
        onConfirm={handleDelete}
        onCancel={closeConfirm}
      />

      {editingPhoto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-photo-title"
            style={{
            background: 'var(--surface-color)',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 40px var(--shadow-color)',
            border: '1px solid var(--border-color)'
          }}>
            <h2 id="edit-photo-title" style={{ 
              color: 'var(--text-color)', 
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              ✏️ Edytuj zdjęcie
            </h2>

            {editErrors.length > 0 && (
              <div className="error-container" style={{ marginBottom: '20px' }}>
                {editErrors.map((err, i) => (
                  <div key={i} className="error-message">⚠️ {err}</div>
                ))}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label htmlFor="edit-title" className="field-label">Nazwa</label>
                <input
                  id="edit-title"
                  className="input-field"
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  maxLength={255}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-location" className="field-label">Lokalizacja</label>
                <input
                  id="edit-location"
                  className="input-field"
                  type="text"
                  value={editForm.location}
                  onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                  maxLength={255}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-year" className="field-label">Rok (opcjonalnie)</label>
                <input
                  id="edit-year"
                  className="input-field"
                  type="number"
                  value={editForm.photo_year}
                  onChange={e => setEditForm(f => ({ ...f, photo_year: e.target.value }))}
                  min={YEAR_MIN}
                  max={YEAR_MAX}
                />
              </div>
              
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginTop: '20px' 
              }}>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleting || saving}
                  className="btn"
                  style={{ 
                    backgroundColor: 'var(--button-danger-bg)',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  {deleting ? '🔄 Usuwanie...' : '🗑️ Usuń'}
                </button>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    onClick={closeEdit} 
                    disabled={deleting || saving}
                    className="btn btn-secondary"
                  >
                    Anuluj
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving || deleting}
                    className="btn btn-primary"
                  >
                    {saving ? '🔄 Zapisywanie...' : '💾 Zapisz'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyPhotos;
