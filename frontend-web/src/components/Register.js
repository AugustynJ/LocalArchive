import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setFirstNameError('');
    setLastNameError('');
    setEmailError('');
    setPasswordError('');
    
    // Frontend validation
    let hasErrors = false;
    
    if (firstName.length > 50) {
      setFirstNameError('Imię może mieć maksymalnie 50 znaków');
      hasErrors = true;
    }
    
    if (lastName.length > 50) {
      setLastNameError('Nazwisko może mieć maksymalnie 50 znaków');
      hasErrors = true;
    }
    
    if (email.length > 50) {
      setEmailError('Email może mieć maksymalnie 50 znaków');
      hasErrors = true;
    }
    
    if (password.length > 127) {
      setPasswordError('Hasło może mieć maksymalnie 127 znaków');
      hasErrors = true;
    }
    
    if (password !== repeatPassword) {
      setPasswordError('Hasła nie są identyczne');
      hasErrors = true;
    }
    
    if (hasErrors) return;
    
    try {
      await api.post('/register', { 
        first_name: firstName, 
        last_name: lastName, 
        email, 
        password 
      });
      navigate('/login');
    } catch (err) {
      if (err.response?.data?.errors) {
        // Handle validation errors from backend
        const errors = err.response.data.errors;
        errors.forEach(error => {
          if (error.includes('First name')) setFirstNameError(error);
          else if (error.includes('Last name')) setLastNameError(error);
          else if (error.includes('Email') || error.includes('email')) setEmailError(error);
          else if (error.includes('Password')) setPasswordError(error);
        });
      } else if (err.response?.data?.error) {
        if (err.response.data.error.includes('Email already exists')) {
          setEmailError('Email jest już zajęty');
        } else {
          alert(err.response.data.error);
        }
      } else {
        alert('Błąd rejestracji');
      }
    }
  };

  const handleEmailBlur = async () => {
    if (email) {
      // Validate email length
      if (email.length > 50) {
        setEmailError('Email może mieć maksymalnie 50 znaków');
        return;
      }
      
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        setEmailError('Nieprawidłowy format email');
        return;
      }
      
      try {
        const response = await api.post('/register/check_email', { email });
        if (response.data.exists) {
          setEmailError('Email jest już zajęty');
        } else {
          setEmailError('');
        }
      } catch (err) {
        if (err.response?.data?.error) {
          setEmailError(err.response.data.error);
        } else {
          setEmailError('Błąd podczas sprawdzania email');
        }
      }
    }
  };

  const handleRepeatPasswordBlur = () => {
    if (repeatPassword && password !== repeatPassword) {
      setPasswordError('Hasła nie są identyczne');
    } else {
      setPasswordError('');
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="page-container fade-in">
      <div className="content-wrapper">
        <div className="form-container">
          <h1>Rejestracja</h1>
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <input 
                className="input-field"
                type="text" 
                value={firstName}
                onChange={e => setFirstName(e.target.value)} 
                placeholder="Imię" 
                maxLength="50"
                required
              />
              {firstNameError && <div className="error-message">⚠️ {firstNameError}</div>}
            </div>
            
            <div className="form-group">
              <input 
                className="input-field"
                type="text" 
                value={lastName}
                onChange={e => setLastName(e.target.value)} 
                placeholder="Nazwisko" 
                maxLength="50"
                required
              />
              {lastNameError && <div className="error-message">⚠️ {lastNameError}</div>}
            </div>
            
            <div className="form-group">
              <input 
                className="input-field"
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)} 
                onBlur={handleEmailBlur}
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
            </div>
            
            <div className="form-group">
              <input 
                className="input-field"
                type="password" 
                value={repeatPassword}
                onChange={e => setRepeatPassword(e.target.value)} 
                onBlur={handleRepeatPasswordBlur}
                placeholder="Powtórz hasło" 
                maxLength="127"
                required
              />
              {passwordError && <div className="error-message">⚠️ {passwordError}</div>}
            </div>
            
            <div className="button-group">
              <button type="submit" className="btn btn-primary">
                Zarejestruj
              </button>
            </div>
          </form>
          
          <div className="button-group" style={{marginTop: '20px'}}>
            <button type="button" onClick={handleLogin} className="btn btn-secondary">
              Masz już konto? Zaloguj się
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
