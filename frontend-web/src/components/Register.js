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
    <>
      <form onSubmit={handleRegister}>
        <input 
          type="text" 
          value={firstName}
          onChange={e => setFirstName(e.target.value)} 
          placeholder="Imię" 
          maxLength="50"
          required
        />
        {firstNameError && <div style={{color: 'red'}}>{firstNameError}</div>}
        <input 
          type="text" 
          value={lastName}
          onChange={e => setLastName(e.target.value)} 
          placeholder="Nazwisko" 
          maxLength="50"
          required
        />
        {lastNameError && <div style={{color: 'red'}}>{lastNameError}</div>}
        <input 
          type="email" 
          value={email}
          onChange={e => setEmail(e.target.value)} 
          onBlur={handleEmailBlur}
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
        <input 
          type="password" 
          value={repeatPassword}
          onChange={e => setRepeatPassword(e.target.value)} 
          onBlur={handleRepeatPasswordBlur}
          placeholder="Powtórz hasło" 
          maxLength="127"
          required
        />
        {passwordError && <div style={{color: 'red'}}>{passwordError}</div>}
        <button type="submit">Zarejestruj</button>
      </form>
      <button type="button" onClick={handleLogin}>Masz już konto? Zaloguj się</button>
    </>
  );
}

export default Register;
