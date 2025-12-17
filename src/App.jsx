// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react'; // Removed 'React' from brackets, it's not needed there
import { supabase } from './config/supabaseClient';

import Dashboard from './pages/Dashboard';
import TreeEditor from './pages/TreeEditor';
import Login from './pages/Login';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true); // Added loading state

  useEffect(() => {
    // 1. Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for changes (Login/Logout/Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Prevent "flash" of login page while checking for an existing session
  if (loading) {
    return <div className="loading-screen">Verifying Session...</div>;
  }

  return (
    <Routes>
      {/* If logged in, "/" and "/login" should take you to Dashboard */}
      <Route 
        path="/" 
        element={session ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
      /> 
      <Route 
        path="/login" 
        element={session ? <Navigate to="/dashboard" /> : <Login />} 
      />

      {/* Protected Routes: If no session, kick back to login */}
      <Route 
        path="/dashboard" 
        element={session ? <Dashboard /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/tree-editor/:familyId" 
        element={session ? <TreeEditor /> : <Navigate to="/login" />} 
      />
      
      <Route path="/profile" element={<div>Profile Page - Coming Soon</div>} />
    </Routes>
  );
}

export default App;