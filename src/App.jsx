// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './config/supabaseClient';

function App() {
  // 1. ALL HOOKS MUST BE AT THE VERY TOP
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: initSession } } = await supabase.auth.getSession();
        
        if (initSession) {
          // Use .select() WITHOUT .single() to prevent the "0 rows" crash
          const { data: profiles } = await supabase
            .from('profiles')
            .select('is_super_user')
            .eq('id', initSession.user.id);

          const isSuper = profiles && profiles.length > 0 ? profiles[0].is_super_user : false;
          
          setSession({ ...initSession, isSuperUser: isSuper });
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        // 2. FINALLY ensures loading is turned off even if the DB fails
        setLoading(false); 
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. THE "SAFETY GATE" COMES AFTER ALL HOOKS
  if (loading) {
    return (
      <div className="loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#2d6a4f' }}>
        Loading HierarchicalRoots...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={session ? <Dashboard session={session} /> : <Navigate to="/login" />} />
      {/* other routes */}
    </Routes>
  );
}


export default App;