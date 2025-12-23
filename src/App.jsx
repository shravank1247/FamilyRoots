import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './config/supabaseClient';

import Dashboard from './pages/Dashboard';
import TreeEditor from './pages/TreeEditor';
import Login from './pages/Login';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We create an internal async function so we can use 'await' safely
    const initializeAuth = async () => {
  try {
    const { data: { session: initialSession } } = await supabase.auth.getSession();
    
      if (initialSession) {
        // 1. Remove .single() to avoid the crash if the row is missing
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_super_user')
          .eq('id', initialSession.user.id);

        // 2. Check if we actually got a result (it returns an array when .single() is removed)
        const isSuper = profile && profile.length > 0 ? profile[0].is_super_user : false;

        setSession({ 
          ...initialSession, 
          isSuperUser: isSuper 
        });
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
    } finally {
      setLoading(false);
    }
  };

    initializeAuth();

    // 4. Listen for Login/Logout changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_user')
          .eq('id', newSession.user.id)
          .single();

        setSession({ ...newSession, isSuperUser: profile?.is_super_user || false });
      } else {
        setSession(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen" style={{ 
        display: 'flex', justifyContent: 'center', alignItems: 'center', 
        height: '100vh', color: '#2d6a4f', fontWeight: 'bold' 
      }}>
        Loading HierarchicalRoots...
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={session ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
      /> 
      <Route 
        path="/login" 
        element={session ? <Navigate to="/dashboard" /> : <Login />} 
      />
      <Route 
        path="/dashboard" 
        element={session ? <Dashboard session={session} /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/tree-editor/:familyId" 
        element={session ? <TreeEditor session={session} /> : <Navigate to="/login" />} 
      />
      <Route path="/profile" element={<div>Profile Page - Coming Soon</div>} />
    </Routes>
  );
}

export default App;