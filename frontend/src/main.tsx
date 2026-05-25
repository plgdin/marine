import React from 'react';
import ReactDOM from 'react-dom/client';
import { Providers } from './app/Providers';
import { AppRouter } from './app/Router';
import '@styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </React.StrictMode>,
);
