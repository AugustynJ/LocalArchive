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
    <div style={{ maxWidth: '420px', margin: '40px auto' }}>
      <h1>Zmiana hasła</h1>

      {errors.length > 0 && (
        <ul style={{ color: 'red', paddingLeft: '20px' }}>
          {errors.map((err, i) => <li key={i}>{err}</li>)}
        </ul>
      )}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label>
            Aktualne hasło:<br />
            <input
              type="password"
              name="current_password"
              value={form.current_password}
              onChange={handleChange}
              style={{ width: '100%', padding: '6px' }}
              autoComplete="current-password"
            />
          </label>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>
            Nowe hasło:<br />
            <input
              type="password"
              name="new_password"
              value={form.new_password}
              onChange={handleChange}
              style={{ width: '100%', padding: '6px' }}
              autoComplete="new-password"
            />
          </label>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>
            Powtórz nowe hasło:<br />
            <input
              type="password"
              name="repeat_password"
              value={form.repeat_password}
              onChange={handleChange}
              style={{ width: '100%', padding: '6px' }}
              autoComplete="new-password"
            />
          </label>
        </div>
        <p style={{ color: '#888', fontSize: '13px', marginBottom: '12px' }}>
          Hasło musi mieć 8–127 znaków, zawierać małą i wielką literę, cyfrę oraz znak specjalny.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Zapisywanie...' : 'Zmień hasło'}
          </button>
          <button type="button" onClick={() => navigate('/user')}>Anuluj</button>
        </div>
      </form>
    </div>
  );
}

export default PasswordChange;
