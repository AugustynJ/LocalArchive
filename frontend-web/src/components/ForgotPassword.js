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
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/v1/forgot_password`,
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
    <div style={{ maxWidth: '420px', margin: '60px auto' }}>
      <h1>Resetowanie hasła</h1>

      {!sent ? (
        <>
          <p style={{ color: '#555', marginBottom: '16px' }}>
            Podaj adres e-mail powiązany z Twoim kontem. Wyślemy Ci link umożliwiający
            ustawienie nowego hasła.
          </p>

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label>
                Adres e-mail:<br />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  style={{ width: '100%', padding: '6px' }}
                  autoComplete="email"
                  disabled={submitting}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Wysyłanie...' : 'Wyślij link'}
              </button>
              <button type="button" onClick={() => navigate('/login')}>
                Powrót do logowania
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>
          <p style={{ color: '#555' }}>
            Sprawdź swoją skrzynkę odbiorczą i kliknij link w wiadomości.
            Link jest ważny przez 15 minut.
          </p>
          <button onClick={() => navigate('/login')}>Powrót do logowania</button>
        </>
      )}
    </div>
  );
}

export default ForgotPassword;
