import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

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

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [tokenValid, setTokenValid] = useState(null); // null = checking, true/false
  const [form, setForm] = useState({ new_password: '', repeat_password: '' });
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validate token on mount
  useEffect(() => {
    axios
      .get(`${API_BASE}/api/v1/forgot_password/${token}`, { withCredentials: true })
      .then(() => setTokenValid(true))
      .catch(() => setTokenValid(false));
  }, [token]);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = [];

    const policyErrors = validatePasswordPolicy(form.new_password);
    clientErrors.push(...policyErrors);

    if (form.new_password !== form.repeat_password) {
      clientErrors.push('Hasła nie są identyczne.');
    }

    if (clientErrors.length > 0) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE}/api/v1/forgot_password/${token}`,
        { new_password: form.new_password, repeat_password: form.repeat_password },
        { withCredentials: true }
      );
      setSuccess('Hasło zostało zmienione. Możesz się teraz zalogować.');
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        setErrors(data.errors);
      } else if (data?.error) {
        setErrors([data.error]);
      } else {
        setErrors(['Błąd podczas zmiany hasła. Spróbuj ponownie.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // — Loading state while validating token
  if (tokenValid === null) {
    return <div style={{ margin: '60px auto', maxWidth: '420px' }}>Sprawdzanie linku…</div>;
  }

  // — Invalid / expired token
  if (tokenValid === false) {
    return (
      <div style={{ maxWidth: '420px', margin: '60px auto' }}>
        <h1>Resetowanie hasła</h1>
        <p style={{ color: 'red', fontWeight: 'bold' }}>
          Link jest nieprawidłowy lub wygasł.
        </p>
        <button onClick={() => navigate('/forgot_password')}>
          Wygeneruj nowy link
        </button>
      </div>
    );
  }

  // — Success state after password reset
  if (success) {
    return (
      <div style={{ maxWidth: '420px', margin: '60px auto' }}>
        <h1>Resetowanie hasła</h1>
        <p style={{ color: 'green', fontWeight: 'bold' }}>{success}</p>
        <button onClick={() => navigate('/login')}>Przejdź do logowania</button>
      </div>
    );
  }

  // — Reset form
  return (
    <div style={{ maxWidth: '420px', margin: '60px auto' }}>
      <h1>Ustaw nowe hasło</h1>

      {errors.length > 0 && (
        <ul style={{ color: 'red', paddingLeft: '20px' }}>
          {errors.map((err, i) => <li key={i}>{err}</li>)}
        </ul>
      )}

      <form onSubmit={handleSubmit}>
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
              disabled={submitting}
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
              disabled={submitting}
            />
          </label>
        </div>
        <p style={{ color: '#888', fontSize: '13px', marginBottom: '12px' }}>
          Hasło musi mieć 8–127 znaków, zawierać małą i wielką literę, cyfrę
          oraz znak specjalny.
        </p>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Zapisywanie...' : 'Zapisz hasło'}
        </button>
      </form>
    </div>
  );
}

export default ResetPassword;
