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

// App.jsx
const initializeAuth = async () => {
    try {
        const { data: { session: initSession } } = await supabase.auth.getSession();
        if (initSession) {
            // Use .select() without .single() to avoid the error
            const { data: profileData } = await supabase
                .from('profiles')
                .select('is_super_user')
                .eq('id', initSession.user.id);

            const isSuper = profileData && profileData.length > 0 ? profileData[0].is_super_user : false;
            setSession({ ...initSession, isSuperUser: isSuper });
        } else {
            setSession(null);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false); // ALWAYS runs, so you never get stuck
    }
};

// Temporary check to see if loading ever finishes
useEffect(() => {
  const timer = setTimeout(() => {
    if (loading) {
      console.warn("Loading timed out - forcing loading to false");
      setLoading(false);
    }
  }, 5000); // 5 seconds
  return () => clearTimeout(timer);
}, [loading]);

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