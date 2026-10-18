import React from 'react';
import { useNavigate } from 'react-router-dom';

// Zaślepka dla funkcji tymczasowo wyłączonych (np. reset hasła) – nie wywołuje żadnego API.
function UnderConstruction() {
  const navigate = useNavigate();

  return (
    <div className="page-container fade-in">
      <div className="content-wrapper">
        <div className="form-container">
          <h1 style={{ textAlign: 'center' }}>Strona w przebudowie</h1>
          <div className="button-group">
            <button onClick={() => navigate('/login')} className="btn btn-primary">
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UnderConstruction;
