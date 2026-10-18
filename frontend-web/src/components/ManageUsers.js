import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import ConfirmDialog from './ConfirmDialog';
import Notice from './Notice';

const ROLES = ['admin', 'editor', 'viewer'];

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [pendingRoles, setPendingRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);
  const [pending, setPending] = useState(null); // { id, name, block } – czeka na potwierdzenie
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
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

  const closeDialog = useCallback(() => setPending(null), []);
  const handleBlock = (id, name) => setPending({ id, name, block: true });
  const handleUnblock = (id, name) => setPending({ id, name, block: false });

  const confirmToggle = async () => {
    const { id, name, block } = pending;
    setPending(null);
    setActionMessage(null);
    try {
      await api.put(`/admin/users/${id}/${block ? 'block' : 'unblock'}`);
      setUsers(prev => prev.map(x => x.id === id ? { ...x, is_blocked: block } : x));
      setActionMessage({ type: 'success', text: `Użytkownik „${name}” został ${block ? 'zablokowany' : 'odblokowany'}.` });
    } catch (err) {
      setActionMessage({ type: 'error', text: `Błąd podczas ${block ? 'blokowania' : 'odblokowywania'} użytkownika. Spróbuj ponownie.` });
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
          <div className="loading-container" role="status">
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
        <Notice message={actionMessage} />
        <ConfirmDialog
          open={!!pending}
          title={pending?.block ? 'Zablokować użytkownika?' : 'Odblokować użytkownika?'}
          message={pending ? `Czy na pewno chcesz ${pending.block ? 'zablokować' : 'odblokować'} użytkownika „${pending.name}”?` : ''}
          confirmLabel={pending?.block ? 'Zablokuj' : 'Odblokuj'}
          danger={!!pending?.block}
          onConfirm={confirmToggle}
          onCancel={closeDialog}
        />
        
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
          <div className="table-wrapper">
            <table className="data-table">
              <caption className="sr-only">Użytkownicy</caption>
              <thead>
                <tr>
                  {['ID', 'Użytkownik', 'Rola', 'Ostatnie logowanie', 'Status'].map(h => (
                    <th key={h} scope="col">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const currentPending = pendingRoles[u.id];
                  const changed = currentPending !== undefined;
                  const name = `${u.first_name} ${u.last_name}`;
                  return (
                    <tr key={u.id} className={changed ? 'row-changed' : undefined}>
                      <td data-label="ID" className="cell-muted">{u.id}</td>
                      <td data-label="Użytkownik">
                        <div>
                          <div className="user-cell-name">{name}</div>
                          <div className="user-cell-email">{u.email}</div>
                        </div>
                      </td>
                      <td data-label="Rola">
                        <div>
                          <select
                            className="table-select"
                            aria-label={`Rola użytkownika ${name}`}
                            value={changed ? currentPending : u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          {changed && <div className="cell-hint">było: {u.role}</div>}
                        </div>
                      </td>
                      <td data-label="Ostatnie logowanie" className="cell-muted">
                        {u.last_login_date ? new Date(u.last_login_date).toLocaleString('pl-PL') : '—'}
                      </td>
                      <td data-label="Status">
                        <div className="status-cell">
                          <span className={`status-badge ${u.is_blocked ? 'status-blocked' : 'status-active'}`}>
                            {u.is_blocked ? 'Zablokowany' : 'Aktywny'}
                          </span>
                          <button
                            onClick={() => u.is_blocked ? handleUnblock(u.id, name) : handleBlock(u.id, name)}
                            aria-label={`${u.is_blocked ? 'Odblokuj' : 'Zablokuj'} użytkownika ${name}`}
                            className={`btn btn-small ${u.is_blocked ? 'btn-success' : 'btn-danger'}`}
                          >
                            {u.is_blocked ? '✔️ Odblokuj' : '🚫 Zablokuj'}
                          </button>
                        </div>
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
            className={hasChanges ? "btn btn-primary" : "btn btn-muted"}
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
