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
    <>
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          value={email}
          onChange={e => setEmail(e.target.value)} 
          placeholder="Email" 
          maxLength="50"
          required
        />
        {emailError && <div style={{color: 'red'}}>{emailError}</div>}
        <input 
          type="password" 
          value={password}
          onChange={e => setPassword(e.target.value)} 
          placeholder="Hasło" 
          maxLength="127"
          required
        />
        {passwordError && <div style={{color: 'red'}}>{passwordError}</div>}
        <button type="submit">Zaloguj</button>
      </form>
      <button type="button" onClick={handleRegister}>Rejestracja</button>
      <br />
      <button type="button" onClick={() => navigate('/forgot_password')} style={{ marginTop: '8px', background: 'none', border: 'none', color: '#2980b9', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
        Nie pamiętasz hasła?
      </button>
    </>
  );
}

export default Login;