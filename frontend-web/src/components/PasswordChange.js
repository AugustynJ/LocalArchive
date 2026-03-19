import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function validatePasswordPolicy(password) {
  const errors = [];
  if (password.length < 8) errors.push('Hasło musi mieć co najmniej 8 znaków.');
  if (password.length > 127) errors.push('Hasło może mieć maksymalnie 127 znaków.');
  if (!/[a-z]/.test(password)) errors.push('Hasło musi zawierać co najmniej jedną małą literę.');
  if (!/[A-Z]/.test(password)) errors.push('Hasło musi zawierać co najmniej jedną wielką literę.');
  if (!/\d/.test(password)) errors.push('Hasło musi zawierać co najmniej jedną cyfrę.');
  if (!/[^a-zA-Z0-9]/.test(password)) errors.push('Hasło musi zawierać co najmniej jeden znak specjalny.');
  return errors;
}

function PasswordChange() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: '', new_password: '', repeat_password: '' });
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors([]);
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = [];

    if (!form.current_password) clientErrors.push('Aktualne hasło jest wymagane.');

    const policyErrors = validatePasswordPolicy(form.new_password);
    clientErrors.push(...policyErrors);

    if (form.new_password !== form.repeat_password) {
      clientErrors.push('Nowe hasło i jego powtórzenie muszą być identyczne.');
    }

    if (clientErrors.length > 0) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/user/update_password', {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccess('Hasło zostało zmienione pomyślnie.');
      setForm({ current_password: '', new_password: '', repeat_password: '' });
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        setErrors(data.errors);
      } else if (data?.error) {
        setErrors([data.error]);
      } else {
        setErrors(['Błąd podczas zmiany hasła.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container with-header fade-in">
      <div className="content-wrapper">
        <div className="form-container">
          <h1>Zmiana hasła</h1>

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
              <input
                className="input-field"
                type="password"
                name="current_password"
                value={form.current_password}
                onChange={handleChange}
                placeholder="Aktualne hasło"
                autoComplete="current-password"
                required
              />
            </div>
            
            <div className="form-group">
              <input
                className="input-field"
                type="password"
                name="new_password"
                value={form.new_password}
                onChange={handleChange}
                placeholder="Nowe hasło"
                autoComplete="new-password"
                required
              />
            </div>
            
            <div className="form-group">
              <input
                className="input-field"
                type="password"
                name="repeat_password"
                value={form.repeat_password}
                onChange={handleChange}
                placeholder="Powtórz nowe hasło"
                autoComplete="new-password"
                required
              />
            </div>
            
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '13px', 
              marginBottom: '20px',
              textAlign: 'center',
              padding: '10px',
              backgroundColor: 'var(--background-color)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              📝 Hasło musi mieć 8–127 znaków, zawierać małą i wielką literę, cyfrę oraz znak specjalny.
            </p>
            
            <div className="button-group">
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? '🔄 Zapisywanie...' : '🔐 Zmień hasło'}
              </button>
              <button type="button" onClick={() => navigate('/user')} className="btn btn-secondary">
                Anuluj
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PasswordChange;
