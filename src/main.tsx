// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { AppDataProvider } from './context/AppDataContext'; // <-- 1. IMPORTAR

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 2. ENVOLVER EL COMPONENTE APP */}
    <AppDataProvider>
      <App />
    </AppDataProvider>
  </React.StrictMode>,
);