// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react'; 
import { supabase } from './config/supabaseClient';

import Dashboard from './pages/Dashboard';
import TreeEditor from './pages/TreeEditor';
import Login from './pages/Login';

// Optional: A small component to wrap the layout for protected pages
const AppLayout = ({ children }) => {
  return (
    <div className="app-shell">
      {/* The toolbar/header logic remains inside pages or as a global component here */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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

    // Inside your useEffect in App.jsx
    const { data: profile } = supabase
      .from('profiles')
      .select('is_super_user')
      .eq('id', session.user.id)
      .single();

    setSession({ ...session, isSuperUser: profile?.is_super_user || false });

    return () => subscription.unsubscribe();
  }, []);

  // Prevent "flash" of login page while checking for an existing session
  if (loading) {
    return (
      <div className="loading-screen" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: '#2d6a4f',
        fontWeight: 'bold'
      }}>
        Verifying Session...
      </div>
    );
  }

  return (
    <Routes>
      <Route 
  path="/tree-editor/:familyId" 
  element={session ? <TreeEditor session={session} /> : <Navigate to="/login" />} 
/>
      {/* Public Routes */}
      <Route 
        path="/" 
        element={session ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
      /> 
      <Route 
        path="/login" 
        element={session ? <Navigate to="/dashboard" /> : <Login />} 
      />

      {/* Protected Routes wrapped in Layout for consistent Fixed Toolbar behavior */}
      <Route 
        path="/dashboard" 
        element={
          session ? (
            <AppLayout>
              <Dashboard />
            </AppLayout>
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
      <Route 
        path="/tree-editor/:familyId" 
        element={
          session ? (
            <AppLayout>
              <TreeEditor />
            </AppLayout>
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
      
      <Route path="/profile" element={<div>Profile Page - Coming Soon</div>} />
    </Routes>
  );
}

export default App;