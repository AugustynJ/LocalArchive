import React from 'react';

// Komunikat o wyniku akcji: { type: 'success' | 'error', text }
function Notice({ message }) {
  if (!message) return null;
  const success = message.type === 'success';
  return (
    <div className={success ? 'success-message' : 'error-banner'} role={success ? 'status' : 'alert'}>
      {success ? '✔️' : '⚠️'} {message.text}
    </div>
  );
}

export default Notice;
