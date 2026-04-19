import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('marmofast: initializing app...');
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('marmofast: root element not found!');
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
