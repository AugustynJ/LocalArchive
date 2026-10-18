import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './ThemeContext';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Healthcheck from './components/Healthcheck';
import User from './components/User';
import Photos from './components/Photos';
import Admin from './components/Admin';
import AddPhoto from './components/AddPhoto';
import MyPhotos from './components/MyPhotos';
import PhotoDetail from './components/PhotoDetail';
import Audit from './components/Audit';
import ManagePhotos from './components/ManagePhotos';
import ManageUsers from './components/ManageUsers';
import PasswordChange from './components/PasswordChange';
// Reset hasła tymczasowo wyłączony – ForgotPassword/ResetPassword wracają po skonfigurowaniu SMTP
import UnderConstruction from './components/UnderConstruction';
import './components.css';
import './themes/light.css';
import './themes/dark.css';

function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button 
      className="theme-switcher" 
      onClick={toggleTheme}
      title={theme === 'light' ? 'Włącz tryb ciemny' : 'Włącz tryb jasny'}
      aria-label={theme === 'light' ? 'Włącz tryb ciemny' : 'Włącz tryb jasny'}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const showBackButton = !['/home', '/login'].includes(location.pathname);
  
  return (
    <header className="header">
      {showBackButton && (
        <button 
          className="back-button" 
          onClick={() => {
            // Z galerii zawsze do panelu użytkownika – historia mogłaby prowadzić do ostatnio oglądanego zdjęcia
            if (location.pathname === '/photos') navigate('/user');
            else window.history.back();
          }}
        >
          ← Powrót
        </button>
      )}
      {!showBackButton && <div></div>}
      <ThemeSwitcher />
    </header>
  );
}

// Tytuł karty przeglądarki dla każdej podstrony (strona zdjęcia nadpisuje go tytułem zdjęcia)
const PAGE_TITLES = {
  '/home': 'Strona główna',
  '/login': 'Logowanie',
  '/register': 'Rejestracja',
  '/healthcheck': 'Healthcheck',
  '/user': 'Panel użytkownika',
  '/user/change_password': 'Zmiana hasła',
  '/photos': 'Zdjęcia',
  '/photos/add': 'Dodaj zdjęcie',
  '/my_photos': 'Moje zdjęcia',
  '/admin': 'Panel administratora',
  '/admin/audit': 'Ostatnio dodane zdjęcia',
  '/admin/manage_photos': 'Zarządzanie zdjęciami',
  '/admin/manage_users': 'Zarządzanie użytkownikami',
  '/forgot_password': 'Strona w przebudowie',
};

function pageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/photo/')) return 'Zdjęcie';
  if (pathname.startsWith('/reset_password/')) return 'Strona w przebudowie';
  return 'OKNO';
}

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    document.title = pageTitle(location.pathname);
  }, [location.pathname]);

  return (
    <div className="app-container">
      <a href="#main-content" className="skip-link">Przejdź do treści</a>
      <Header />
      <main id="main-content" tabIndex="-1">
      <Routes>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/healthcheck" element={<Healthcheck />} />
        <Route path="/user" element={<User />} />
        <Route path="/photos" element={<Photos />} />
        <Route path="/photos/add" element={<AddPhoto />} />
        <Route path="/my_photos" element={<MyPhotos />} />
        <Route path="/photo/:id" element={<PhotoDetail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/audit" element={<Audit />} />
        <Route path="/admin/manage_photos" element={<ManagePhotos />} />
        <Route path="/admin/manage_users" element={<ManageUsers />} />
        <Route path="/user/change_password" element={<PasswordChange />} />
        <Route path="/forgot_password" element={<UnderConstruction />} />
        <Route path="/reset_password/:token" element={<UnderConstruction />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;