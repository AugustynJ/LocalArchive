import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const ROLES = ['admin', 'editor', 'viewer'];

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [pendingRoles, setPendingRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [hoveredUserId, setHoveredUserId] = useState(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const userRes = await api.get('/user/info');
      if (userRes.data.role !== 'admin') {
        navigate('/user');
        return;
      }
      const res = await api.get('/admin/manage_users');
      setUsers(res.data);
    } catch (err) {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRoleChange = (userId, newRole) => {
    const originalRole = users.find(u => u.id === userId)?.role;
    setPendingRoles(prev => {
      const updated = { ...prev };
      if (newRole === originalRole) {
        delete updated[userId];
      } else {
        updated[userId] = newRole;
      }
      return updated;
    });
  };

  const handleBlock = async (userId, userName) => {
    if (!window.confirm(`Czy na pewno chcesz zablokować użytkownika "${userName}"?`)) return;
    try {
      await api.put(`/admin/users/${userId}/block`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: true } : u));
    } catch (err) {
      alert('Błąd podczas blokowania użytkownika.');
    }
  };

  const handleUnblock = async (userId, userName) => {
    if (!window.confirm(`Czy na pewno chcesz odblokować użytkownika "${userName}"?`)) return;
    try {
      await api.put(`/admin/users/${userId}/unblock`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: false } : u));
    } catch (err) {
      alert('Błąd podczas odblokowywania użytkownika.');
    }
  };

  const handleSave = async () => {
    const changes = Object.entries(pendingRoles).map(([id, role]) => ({ id: parseInt(id), role }));
    if (changes.length === 0) return;

    setSaving(true);
    setSaveMessage(null);
    try {
      await api.put('/admin/manage_users', { changes });
      setUsers(prev => prev.map(u => pendingRoles[u.id] ? { ...u, role: pendingRoles[u.id] } : u));
      setPendingRoles({});
      setSaveMessage({ type: 'success', text: `Zapisano zmiany dla ${changes.length} użytkownik(ów).` });
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Błąd podczas zapisywania zmian.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container with-header fade-in">
        <div className="content-wrapper">
          <div className="loading-container">
            <div>🔄 Ładowanie...</div>
          </div>
        </div>
      </div>
    );
  }

  const hasChanges = Object.keys(pendingRoles).length > 0;

  return (
    <div className="page-container with-header fade-in">
      <div className="content-wrapper wide">
        <h1>👥 Zarządzanie użytkownikami</h1>
        
        <div style={{ 
          color: 'var(--text-secondary)', 
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: 'var(--background-color)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          📊 Łącznie: <strong style={{ color: 'var(--primary-color)' }}>{users.length}</strong> użytkowników
        </div>

        {users.length === 0 ? (
          <div className="error-container">
            <p>👥 Brak użytkowników.</p>
          </div>
        ) : (
          <div style={{
            overflowX: 'auto',
            backgroundColor: 'var(--surface-color)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            marginBottom: '20px',
            width: '90%',
            margin: '0 auto 20px auto'
          }}>
            <table style={{ 
              borderCollapse: 'collapse', 
              width: '100%',
              backgroundColor: 'var(--surface-color)'
            }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--background-color)' }}>
                  {['ID', 'Imię', 'Nazwisko', 'Email', 'Rola', 'Uprawnienia', 'Zablokowany', 'Ostatnie logowanie', 'Blokada'].map(h => (
                    <th key={h} style={{ 
                      border: '1px solid var(--border-color)', 
                      padding: '12px 8px', 
                      textAlign: 'left', 
                      color: 'var(--text-color)',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const currentPending = pendingRoles[u.id];
                  const changed = currentPending !== undefined;
                  return (
                    <tr key={u.id} style={{
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: changed 
                        ? 'rgba(241, 196, 15, 0.1)' 
                        : 'var(--surface-color)'
                    }}>
                      <td style={{ 
                        border: '1px solid var(--border-color)', 
                        padding: '8px',
                        color: 'var(--text-secondary)',
                        fontSize: '14px'
                      }}>
                        {u.id}
                      </td>
                      <td style={{ 
                        border: '1px solid var(--border-color)', 
                        padding: '8px',
                        color: 'var(--text-color)',
                        fontWeight: '500'
                      }}>
                        {u.first_name}
                      </td>
                      <td style={{ 
                        border: '1px solid var(--border-color)', 
                        padding: '8px',
                        color: 'var(--text-color)',
                        fontWeight: '500'
                      }}>
                        {u.last_name}
                      </td>
                      <td style={{ 
                        border: '1px solid var(--border-color)', 
                        padding: '8px',
                        color: 'var(--text-secondary)',
                        fontSize: '14px'
                      }}>
                        {u.email}
                      </td>
                      <td style={{ 
                        border: '1px solid var(--border-color)', 
                        padding: '8px'
                      }}>
                        <span className="status-badge status-active">
                          {u.role}
                        </span>
                      </td>
                      <td style={{ 
                        border: '1px solid var(--border-color)', 
                        padding: '8px'
                      }}>
                        <select
                          value={currentPending !== undefined ? currentPending : u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          style={{
                            padding: '6px 8px',
                            border: '2px solid var(--border-color)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--input-bg)',
                            color: 'var(--text-color)',
                            fontSize: '14px',
                            width: '100%',
                            transition: 'border-color 0.3s ease'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = 'var(--primary-color)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'var(--border-color)';
                          }}
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ 
                        border: '1px solid var(--border-color)', 
                        padding: '8px'
                      }}>
                        <span className={u.is_blocked ? 'status-blocked' : 'status-active'}>
                          {u.is_blocked ? 'Tak' : 'Nie'}
                        </span>
                      </td>
                      <td style={{ 
                        border: '1px solid var(--border-color)', 
                        padding: '8px',
                        color: 'var(--text-secondary)',
                        fontSize: '13px'
                      }}>
                        {u.last_login_date ? new Date(u.last_login_date).toLocaleString('pl-PL') : '—'}
                      </td>
                      <td style={{ 
                        border: '1px solid var(--border-color)', 
                        padding: '8px'
                      }}>
                        <button
                          onClick={() => u.is_blocked
                            ? handleUnblock(u.id, `${u.first_name} ${u.last_name}`)
                            : handleBlock(u.id, `${u.first_name} ${u.last_name}`)
                          }
                          onMouseEnter={() => setHoveredUserId(u.id)}
                          onMouseLeave={() => setHoveredUserId(null)}
                          className="btn"
                          style={{
                            fontSize: '12px',
                            padding: '6px 12px',
                            minWidth: '100px',
                            backgroundColor: u.is_blocked
                              ? (hoveredUserId === u.id ? 'var(--success-color)' : 'var(--text-secondary)')
                              : 'var(--error-color)',
                            color: 'white',
                            border: 'none'
                          }}
                        >
                          {u.is_blocked
                            ? (hoveredUserId === u.id ? '✔️ Odblokuj' : '🚫 Zablokowany')
                            : '🚫 Zablokuj'
                          }
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {saveMessage && (
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            borderRadius: '8px',
            border: `1px solid ${saveMessage.type === 'success' ? 'var(--success-color)' : 'var(--error-color)'}`,
            backgroundColor: saveMessage.type === 'success' 
              ? 'rgba(39, 174, 96, 0.1)' 
              : 'rgba(231, 76, 60, 0.1)',
            color: saveMessage.type === 'success' ? 'var(--success-color)' : 'var(--error-color)',
            fontWeight: '500',
            textAlign: 'center'
          }}>
            {saveMessage.type === 'success' ? '✔️' : '⚠️'} {saveMessage.text}
          </div>
        )}

        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center',
          padding: '20px',
          backgroundColor: 'var(--surface-color)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={hasChanges ? "btn btn-primary" : "btn"}
            style={{
              backgroundColor: hasChanges ? undefined : 'var(--text-secondary)',
              cursor: hasChanges ? 'pointer' : 'default',
              opacity: hasChanges ? 1 : 0.6
            }}
          >
            {saving ? '🔄 Zapisywanie...' : '💾 Zapisz zmiany'}
            {hasChanges && (
              <span style={{
                marginLeft: '8px',
                padding: '2px 6px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '10px',
                fontSize: '12px'
              }}>
                ({Object.keys(pendingRoles).length})
              </span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

export default ManageUsers;
