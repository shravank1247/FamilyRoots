// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './config/supabaseClient';

// 1. FIX: Ensure all page components are imported correctly
import Dashboard from './pages/Dashboard';
import TreeEditor from './pages/TreeEditor';
import Login from './pages/Login'; // <--- THIS WAS LIKELY MISSING

function App() {
  // 2. RULES OF HOOKS: All hooks must be at the very top
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: initSession } } = await supabase.auth.getSession();
        
        if (initSession) {
          // Use .select() WITHOUT .single() to avoid PGRST116 "0 rows" crash
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
        // 3. FINALLY: Ensures loading turns off even if the database fails
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

  // 4. FIX ERROR #321: This loading check MUST stay below the useEffect hook
  if (loading) {
    return (
      <div className="loading-screen" style={{ 
        display: 'flex', justifyContent: 'center', alignItems: 'center', 
        height: '100vh', background: '#f8fbf9', color: '#2d6a4f', fontWeight: 'bold' 
      }}>
        Loading HierarchicalRoots...
      </div>
    );
  }

  return (
    <Routes>
      {/* Root handling */}
      <Route 
        path="/" 
        element={session ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
      /> 
      
      {/* Public Route */}
      <Route 
        path="/login" 
        element={!session ? <Login /> : <Navigate to="/dashboard" />} 
      />

      {/* Protected Routes */}
      <Route 
        path="/dashboard" 
        element={session ? <Dashboard session={session} /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/tree-editor/:familyId" 
        element={session ? <TreeEditorRenderer session={session} /> : <Navigate to="/login" />} 
      />
      
      <Route path="/profile" element={<div>Profile Page - Coming Soon</div>} />
    </Routes>
  );
}

export default App;