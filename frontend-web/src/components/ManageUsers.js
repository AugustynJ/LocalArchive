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

  if (loading) return <div>Ładowanie...</div>;

  const hasChanges = Object.keys(pendingRoles).length > 0;

  return (
    <div>
      <h1>Zarządzanie użytkownikami</h1>
      <p>Łącznie: <strong>{users.length}</strong></p>

      {users.length === 0 ? (
        <p>Brak użytkowników.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {['ID', 'Imię', 'Nazwisko', 'Email', 'Rola', 'Uprawnienia', 'Zablokowany', 'Ostatnie logowanie', 'Blokada'].map(h => (
                <th key={h} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', background: '#f5f5f5' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const currentPending = pendingRoles[u.id];
              const changed = currentPending !== undefined;
              return (
                <tr key={u.id} style={changed ? { background: '#fffbe6' } : {}}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{u.id}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{u.first_name}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{u.last_name}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{u.email}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{u.role}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    <select
                      value={currentPending !== undefined ? currentPending : u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{u.is_blocked ? 'Tak' : 'Nie'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {u.last_login_date ? new Date(u.last_login_date).toLocaleString('pl-PL') : '—'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    <button
                      onClick={() => u.is_blocked
                        ? handleUnblock(u.id, `${u.first_name} ${u.last_name}`)
                        : handleBlock(u.id, `${u.first_name} ${u.last_name}`)
                      }
                      onMouseEnter={() => setHoveredUserId(u.id)}
                      onMouseLeave={() => setHoveredUserId(null)}
                      style={{
                        background: u.is_blocked
                          ? (hoveredUserId === u.id ? '#27ae60' : '#aaa')
                          : '#c0392b',
                        color: '#fff', border: 'none', padding: '4px 10px',
                        borderRadius: '4px', cursor: 'pointer', width: '100px'
                      }}
                    >
                      {u.is_blocked
                        ? (hoveredUserId === u.id ? 'Odblokuj' : 'Zablokowany')
                        : 'Zablokuj'
                      }
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {saveMessage && (
        <p style={{ marginTop: '12px', color: saveMessage.type === 'success' ? 'green' : 'red' }}>
          {saveMessage.text}
        </p>
      )}

      <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
        <button onClick={() => navigate('/admin')}>Powrót do panelu</button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          style={{ background: hasChanges ? '#007bff' : '#aaa', color: '#fff', border: 'none', padding: '8px 16px', cursor: hasChanges ? 'pointer' : 'default', borderRadius: '4px' }}
        >
          {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
        </button>
      </div>
    </div>
  );
}

export default ManageUsers;
