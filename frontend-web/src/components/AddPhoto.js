import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

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
    return <div>Ładowanie...</div>;
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
    <div>
      <h1>Dodaj zdjęcie</h1>

      {errors.length > 0 && (
        <ul style={{ color: 'red' }}>
          {errors.map((err, i) => <li key={i}>{err}</li>)}
        </ul>
      )}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label>
            Nazwa zdjęcia:<br />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </label>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>
            Lokalizacja:<br />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={255}
            />
          </label>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>
            Rok:<br />
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min={1}
              max={9999}
            />
          </label>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>
            Zdjęcie (maks. 1 MB):<br />
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </label>
          {fileError && <div style={{ color: 'red' }}>{fileError}</div>}
        </div>

        <button type="submit">Dodaj zdjęcie</button>
      </form>

      <div style={{ marginTop: '20px' }}>
        <button onClick={() => navigate('/photos')}>Powrót do zdjęć</button>
      </div>
    </div>
  );
}

export default AddPhoto;
