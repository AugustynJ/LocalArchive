import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Podaj adres e-mail.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL || ''}/api/v1/forgot_password`,
        { email: email.trim() },
        { withCredentials: true }
      );
      setMessage(res.data.message || 'Link do resetowania hasła został wysłany.');
      setSent(true);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error || 'Błąd podczas wysyłania. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container fade-in">
      <div className="content-wrapper">
        <div className="form-container">
          <h1>Resetowanie hasła</h1>

          {!sent ? (
            <>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', textAlign: 'center' }}>
                Podaj adres e-mail powiązany z Twoim kontem. Wyślemy Ci link umożliwiający
                ustawienie nowego hasła.
              </p>

              {error && <div className="error-message">⚠️ {error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <input
                    className="input-field"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="Adres e-mail"
                    autoComplete="email"
                    disabled={submitting}
                    required
                  />
                </div>
                
                <div className="button-group">
                  <button type="submit" disabled={submitting} className="btn btn-primary">
                    {submitting ? '📬 Wysyłanie...' : '📬 Wyślij link'}
                  </button>
                  <button type="button" onClick={() => navigate('/login')} className="btn btn-secondary">
                    Powrót do logowania
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div style={{ color: 'var(--success-color)', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px' }}>
                ✔️ {message}
              </div>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '20px' }}>
                Sprawdź swoją skrzynkę odbiorczą i kliknij link w wiadomości.
                Link jest ważny przez 15 minut.
              </p>
              <div className="button-group">
                <button onClick={() => navigate('/login')} className="btn btn-primary">
                  Powrót do logowania
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
