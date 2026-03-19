import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import './components.css';

function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button 
      className="theme-switcher" 
      onClick={toggleTheme}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

function Header() {
  const location = useLocation();
  const showBackButton = !['/home', '/login'].includes(location.pathname);
  
  return (
    <div className="header">
      {showBackButton && (
        <button 
          className="back-button" 
          onClick={() => window.history.back()}
        >
          ← Powrót
        </button>
      )}
      {!showBackButton && <div></div>}
      <ThemeSwitcher />
    </div>
  );
}

function AppContent() {
  return (
    <div className="app-container">
      <Header />
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
        <Route path="/forgot_password" element={<ForgotPassword />} />
        <Route path="/reset_password/:token" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
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