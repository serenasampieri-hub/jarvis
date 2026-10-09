import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Registrazione del Service Worker PWA per supporto offline e caching
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => {
        console.warn('[PWA] Registrazione Service Worker non riuscita:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
