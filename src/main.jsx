// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // CRITICAL: Import BrowserRouter
import App from './App.jsx';

import './assets/Modal.css'; 

import './assets/styles.css'; 
import './assets/dashboard.css'; 
import './assets/tree.css';


// CRITICAL: The application is wrapped in BrowserRouter here to provide the hook context.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);