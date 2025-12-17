// src/App.jsx

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import TreeEditor from './pages/TreeEditor';
import Login from './pages/Login';

// This component only defines the routes.
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} /> 
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/tree-editor/:familyId" element={<TreeEditor />} />
      <Route path="/profile" element={<div>Profile Page - Coming Soon</div>} />
    </Routes>
  );
}

export default App;