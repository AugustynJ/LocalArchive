import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

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
          alert('Email i hasło są wymagane');
        } else if (err.response.data?.message?.includes('Invalid email format')) {
          setEmailError('Nieprawidłowy format email');
        } else {
          alert(err.response.data?.message || 'Błędne dane');
        }
      } else if (err.response?.status === 401) {
        alert('Nieprawidłowe dane logowania');
      } else if (err.response?.status === 403) {
        alert('Konto zostało zablokowane');
      } else {
        alert('Błąd logowania');
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
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <input 
                className="input-field"
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)} 
                placeholder="Email" 
                maxLength="50"
                required
              />
              {emailError && <div className="error-message">⚠️ {emailError}</div>}
            </div>
            
            <div className="form-group">
              <input 
                className="input-field"
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)} 
                placeholder="Hasło" 
                maxLength="127"
                required
              />
              {passwordError && <div className="error-message">⚠️ {passwordError}</div>}
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