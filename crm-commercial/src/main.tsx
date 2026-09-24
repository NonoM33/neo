import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import App from './App';
import './styles/theme-dark.css';
// Chargé en dernier : le DS (scopé `.neo-ds`) doit gagner les ties de spécificité
// face aux surcharges `[data-theme="dark"] .card/.table/...`.
import './styles/neo-ds.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Widget de feedback terrain (bouton flottant) servi par le backend.
const feedbackApiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const feedbackScript = document.createElement('script');
feedbackScript.src = `${feedbackApiBase}/feedback-widget.js`;
feedbackScript.setAttribute('data-app', 'crm');
feedbackScript.setAttribute('data-api', feedbackApiBase);
document.body.appendChild(feedbackScript);
