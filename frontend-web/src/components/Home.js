import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="page-container fade-in">
      <div className="content-wrapper">
        <div className="home-container">
          <h1 className="home-title">Witaj na stronie głównej</h1>
          <Link to="/login" className="home-link">
            Przejdź do logowania
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;