import React, { useState, useEffect } from 'react';
import api from '../api';
import { SESSION_REQUIRED } from '../constants';
import { useNavigate, useLocation } from 'react-router-dom';
import PasswordInput from './PasswordInput';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [registered] = useState(Boolean(location.state?.registered));
  const [formError, setFormError] = useState(
    location.state?.logoutFailed ? 'Wystąpił błąd podczas wylogowywania. Sesja wygaśnie automatycznie.' : ''
  );

  useEffect(() => {
    // Komunikat ma się pokazać tylko raz – czyścimy stan, żeby nie wracał po odświeżeniu
    if (location.state?.registered || location.state?.logoutFailed) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  useEffect(() => {
    api.get('/user/info')
      .then(() => navigate('/user'))
      .catch(() => {}); // not logged in — stay on login page
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    setFormError('');
    
    // Frontend validation
    let hasErrors = false;
    
    if (email.length > 50) {
      setEmailError('Email może mieć maksymalnie 50 znaków');
      hasErrors = true;
    }
    
    if (password.length > 127) {
      setPasswordError('Hasło może mieć maksymalnie 127 znaków');
      hasErrors = true;
    }
    
    // Email format validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailPattern.test(email)) {
      setEmailError('Nieprawidłowy format email');
      hasErrors = true;
    }
    
    if (hasErrors) return;
    
    try {
      await api.post('/login', { email, password });
      navigate('/user');
    } catch (err) {
      if (err.response?.status === 400) {
        if (err.response.data?.message?.includes('Email and password')) {
          setFormError('Email i hasło są wymagane');
        } else if (err.response.data?.message?.includes('Invalid email format')) {
          setEmailError('Nieprawidłowy format email');
        } else {
          setFormError(err.response.data?.message || 'Błędne dane');
        }
      } else if (err.response?.status === SESSION_REQUIRED) {
        setFormError('Nieprawidłowe dane logowania');
      } else if (err.response?.status === 403) {
        setFormError('Konto zostało zablokowane');
      } else {
        // 429 = limit prób logowania (nginx), brak odpowiedzi = błąd sieci
        setFormError(err.response?.status === 429
          ? 'Zbyt wiele prób logowania. Spróbuj ponownie za minutę.'
          : !err.response ? 'Brak połączenia z serwerem. Spróbuj ponownie.' : 'Błąd logowania');
      }
    }
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <div className="page-container fade-in">
      <div className="content-wrapper">
        <div className="form-container">
          <h1>Logowanie</h1>
          {registered && !formError && (
            <div className="success-message" role="status">✔️ Twoje konto zostało poprawnie utworzone</div>
          )}
          {formError && <div className="error-banner" role="alert">⚠️ {formError}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="login-email" className="field-label">Email</label>
              <input
                id="login-email"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'login-email-error' : undefined} 
                className="input-field"
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)} 
                maxLength="50"
                required
              />
              {emailError && <div id="login-email-error" className="error-message">⚠️ {emailError}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="login-password" className="field-label">Hasło</label>
              <PasswordInput
                id="login-password"
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'login-password-error' : undefined} 
                value={password}
                onChange={e => setPassword(e.target.value)} 
                maxLength="127"
                required
              />
              {passwordError && <div id="login-password-error" className="error-message">⚠️ {passwordError}</div>}
            </div>
            
            <div className="button-group">
              <button type="submit" className="btn btn-primary">
                Zaloguj się
              </button>
            </div>
          </form>
          
          <div className="button-group" style={{ marginTop: '20px' }}>
            <button type="button" onClick={handleRegister} className="btn btn-secondary">
              Rejestracja
            </button>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button 
              type="button" 
              onClick={() => navigate('/forgot_password')} 
              className="btn-link"
            >
              Nie pamiętasz hasła?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;