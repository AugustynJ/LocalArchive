import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import PasswordInput from './PasswordInput';

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
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setFirstNameError('');
    setLastNameError('');
    setEmailError('');
    setPasswordError('');
    setFormError('');
    
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
      navigate('/login', { state: { registered: true } });
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
          setFormError(err.response.data.error);
        }
      } else {
        setFormError(err.response?.status === 429
          ? 'Zbyt wiele prób. Spróbuj ponownie za minutę.'
          : !err.response ? 'Brak połączenia z serwerem. Spróbuj ponownie.' : 'Błąd rejestracji');
      }
    }
  };

  const handleEmailBlur = () => {
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
      
      // Zajętość adresu sprawdza dopiero rejestracja (brak publicznego endpointu do sprawdzania kont)
      setEmailError('');
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
          {formError && <div className="error-banner" role="alert">⚠️ {formError}</div>}
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="reg-first-name" className="field-label">Imię</label>
              <input
                id="reg-first-name"
                aria-invalid={!!firstNameError}
                aria-describedby={firstNameError ? 'reg-first-name-error' : undefined} 
                className="input-field"
                type="text" 
                value={firstName}
                onChange={e => setFirstName(e.target.value)} 
                maxLength="50"
                required
              />
              {firstNameError && <div id="reg-first-name-error" className="error-message">⚠️ {firstNameError}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="reg-last-name" className="field-label">Nazwisko</label>
              <input
                id="reg-last-name"
                aria-invalid={!!lastNameError}
                aria-describedby={lastNameError ? 'reg-last-name-error' : undefined} 
                className="input-field"
                type="text" 
                value={lastName}
                onChange={e => setLastName(e.target.value)} 
                maxLength="50"
                required
              />
              {lastNameError && <div id="reg-last-name-error" className="error-message">⚠️ {lastNameError}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="reg-email" className="field-label">Email</label>
              <input
                id="reg-email"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'reg-email-error' : undefined} 
                className="input-field"
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)} 
                onBlur={handleEmailBlur}
                maxLength="50"
                required
              />
              {emailError && <div id="reg-email-error" className="error-message">⚠️ {emailError}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="reg-password" className="field-label">Hasło</label>
              <PasswordInput id="reg-password" 
                value={password}
                onChange={e => setPassword(e.target.value)} 
                maxLength="127"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="reg-password2" className="field-label">Powtórz hasło</label>
              <PasswordInput
                id="reg-password2"
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'reg-password2-error' : undefined} 
                value={repeatPassword}
                onChange={e => setRepeatPassword(e.target.value)} 
                onBlur={handleRepeatPasswordBlur}
                maxLength="127"
                required
              />
              {passwordError && <div id="reg-password2-error" className="error-message">⚠️ {passwordError}</div>}
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
