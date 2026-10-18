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

const API_BASE = process.env.REACT_APP_API_URL || '';

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
    return (
      <div className="page-container fade-in">
        <div className="content-wrapper">
          <div className="loading-container" role="status">
            <div>🔄 Sprawdzanie linku…</div>
          </div>
        </div>
      </div>
    );
  }

  // — Invalid / expired token
  if (tokenValid === false) {
    return (
      <div className="page-container fade-in">
        <div className="content-wrapper">
          <div className="error-container">
            <h1>Resetowanie hasła</h1>
            <div className="error-message">
              ⚠️ Link jest nieprawidłowy lub wygasł.
            </div>
            <div className="button-group" style={{marginTop: '20px'}}>
              <button onClick={() => navigate('/forgot_password')} className="btn btn-primary">
                Wygeneruj nowy link
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // — Success state after password reset
  if (success) {
    return (
      <div className="page-container fade-in">
        <div className="content-wrapper">
          <h1>Resetowanie hasła</h1>
          <div style={{ 
            color: 'var(--success-color)', 
            fontWeight: 'bold', 
            textAlign: 'center', 
            marginBottom: '20px',
            padding: '20px',
            backgroundColor: 'rgba(39, 174, 96, 0.1)',
            borderRadius: '8px',
            border: '1px solid var(--success-color)'
          }}>
            ✔️ {success}
          </div>
          <div className="button-group">
            <button onClick={() => navigate('/login')} className="btn btn-primary">
              🚪 Przejdź do logowania
            </button>
          </div>
        </div>
      </div>
    );
  }

  // — Reset form
  return (
    <div className="page-container fade-in">
      <div className="content-wrapper">
        <div className="form-container">
          <h1>Ustaw nowe hasło</h1>

          {errors.length > 0 && (
            <div className="error-container">
              {errors.map((err, i) => (
                <div key={i} className="error-message">⚠️ {err}</div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                className="input-field"
                type="password"
                name="new_password"
                value={form.new_password}
                onChange={handleChange}
                placeholder="Nowe hasło"
                autoComplete="new-password"
                disabled={submitting}
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
                disabled={submitting}
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
              📝 Hasło musi mieć 8–127 znaków, zawierać małą i wielką literę, cyfrę
              oraz znak specjalny.
            </p>
            
            <div className="button-group">
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? '🔄 Zapisywanie...' : '🔐 Zapisz hasło'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
