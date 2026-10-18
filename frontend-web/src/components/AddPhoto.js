import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { YEAR_MIN, YEAR_MAX } from '../constants';

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

function AddPhoto() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [year, setYear] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const checkAccess = useCallback(async () => {
    try {
      const response = await api.get('/user/info');
      const { role } = response.data;
      if (role !== 'admin' && role !== 'editor') {
        navigate('/photos');
      }
    } catch (err) {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

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

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) {
      setFile(null);
      setFileError('');
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setFileError('Plik jest za duży. Maksymalny rozmiar to 1 MB.');
      e.target.value = '';
      return;
    }
    setFileError('');
    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = [];

    if (!name.trim()) validationErrors.push('Nazwa zdjęcia jest wymagana.');
    if (!location.trim()) validationErrors.push('Lokalizacja jest wymagana.');
    if (year && !/^\d+$/.test(year)) validationErrors.push('Rok musi być liczbą całkowitą.');
    else if (year && (parseInt(year) < YEAR_MIN || parseInt(year) > YEAR_MAX)) validationErrors.push(`Rok musi być z zakresu ${YEAR_MIN}–${YEAR_MAX}.`);
    if (!file) validationErrors.push('Zdjęcie jest wymagane.');

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setSuccess('');
      return;
    }

    setErrors([]);
    try {
      const formData = new FormData();
      formData.append('title', name.trim());
      formData.append('location', location.trim());
      if (year) formData.append('year', year);
      formData.append('file', file);

      await api.post('/photos/add', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Zdjęcie zostało dodane pomyślnie.');
      setName('');
      setLocation('');
      setYear('');
      setFile(null);
    } catch (err) {
      if (err.response?.status === 403) {
        setErrors(['Brak uprawnień do dodawania zdjęć.']);
      } else if (err.response?.status === 413) {
        setErrors(['Plik jest za duży. Maksymalny rozmiar to 1 MB.']);
      } else if (err.response?.data?.error) {
        setErrors([err.response.data.error]);
      } else {
        setErrors(['Błąd podczas przesyłania zdjęcia.']);
      }
    }
  };

  return (
    <div className="page-container with-header fade-in">
      <div className="content-wrapper">
        <div className="form-container">
          <h1>📷 Dodaj zdjęcie</h1>

          {errors.length > 0 && (
            <div className="error-container">
              {errors.map((err, i) => (
                <div key={i} className="error-message">⚠️ {err}</div>
              ))}
            </div>
          )}
          {success && (
            <div style={{ 
              color: 'var(--success-color)', 
              fontWeight: 'bold', 
              textAlign: 'center', 
              marginBottom: '20px',
              padding: '10px',
              backgroundColor: 'rgba(39, 174, 96, 0.1)',
              borderRadius: '8px',
              border: '1px solid var(--success-color)'
            }}>
              ✔️ {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="add-title" className="field-label">Nazwa zdjęcia</label>
              <input
                id="add-title"
                className="input-field"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="add-location" className="field-label">Lokalizacja</label>
              <input
                id="add-location"
                className="input-field"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={255}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="add-year" className="field-label">Rok (opcjonalnie)</label>
              <input
                id="add-year"
                className="input-field"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min={YEAR_MIN}
                max={YEAR_MAX}
              />
            </div>

            <div className="form-group">
              <label htmlFor="add-file" className="field-label">
                📷 Zdjęcie (maks. 1 MB):
              </label>
              <input
                id="add-file"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-color)',
                  fontSize: '16px',
                  transition: 'all 0.3s ease'
                }}
                required
              />
              {fileError && <div className="error-message">⚠️ {fileError}</div>}
            </div>

            <div className="button-group">
              <button type="submit" className="btn btn-primary">
                💾 Dodaj zdjęcie
              </button>
            </div>
          </form>

          <div className="button-group" style={{marginTop: '20px'}}>
            <button onClick={() => navigate('/photos')} className="btn btn-secondary">
              ← Powrót do zdjęć
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddPhoto;
