// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './config/supabaseClient';

function App() {
  // 1. ALL HOOKS AT THE TOP
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: initSession } } = await supabase.auth.getSession();
        if (initSession) {
          // Use .select() instead of .single() to prevent Postgres error
          const { data: profiles } = await supabase
            .from('profiles')
            .select('is_super_user')
            .eq('id', initSession.user.id);

          const isSuper = profiles && profiles.length > 0 ? profiles[0].is_super_user : false;
          setSession({ ...initSession, isSuperUser: isSuper });
        }
      } catch (e) {
        console.error("Auth init failed", e);
      } finally {
        setLoading(false); // Gate opens no matter what
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. NOW YOU CAN HAVE THE RETURN FOR LOADING
  if (loading) {
    return <div className="loading-screen">Loading HierarchicalRoots...</div>;
  }

  // 3. MAIN ROUTING RETURN
  return (
    <Routes>
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={session ? <Dashboard session={session} /> : <Navigate to="/login" />} />
      {/* ... other routes ... */}
    </Routes>
  );
}