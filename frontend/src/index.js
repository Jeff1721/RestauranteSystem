import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ─── Punto de entrada de la aplicación ───────────────────────────────────────
// Utiliza React 18 createRoot para modo concurrente (mejor rendimiento)
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
