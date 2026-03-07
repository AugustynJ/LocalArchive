import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div>
      <h1>Witaj na stronie głównej</h1>
      <Link to="/login">Przejdź do logowania</Link>
    </div>
  );
}

export default Home;