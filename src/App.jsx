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
    // Inside App.jsx - useEffect
const initializeAuth = async () => {
  try {
    const { data: { session: initialSession } } = await supabase.auth.getSession();
    
    if (initialSession) {
      // Use .select() without .single() to prevent the "0 rows" error
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('is_super_user')
        .eq('id', initialSession.user.id);

      // If no profile found, profiles will be an empty array [] rather than an error
      const isSuper = (profiles && profiles.length > 0) ? profiles[0].is_super_user : false;

      setSession({ 
        ...initialSession, 
        isSuperUser: isSuper 
      });
    } else {
      setSession(null);
    }
  } catch (err) {
    console.error("Auth init error:", err);
    setSession(null);
  } finally {
    setLoading(false); // This ensures the loading screen disappears even if there is an error
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