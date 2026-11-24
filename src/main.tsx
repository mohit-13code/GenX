import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { ErrorBoundary } from './components/Common';
import 'katex/dist/katex.min.css';
import '@fontsource-variable/inter';
import '@fontsource/jetbrains-mono/latin-400.css';
import './styles.css';
import './laboratory.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
