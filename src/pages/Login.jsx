import React from 'react';
import { createClient } from '@supabase/supabase-js';
import './Login.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const Login = () => {
  
  const handleGoogleLogin = async () => {
    try {
      // This ensures that if you are on myroot.online, it returns you there.
      const currentOrigin = window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: currentOrigin, 
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error during Google login:", error.message);
      alert("Authentication Error: " + error.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-section">
          <h1 className="app-name">HierarchicalRoots</h1>
          <div className="divider-line"></div>
        </div>
        
        <div className="content-section">
          <h2>Welcome Back</h2>
          <p>Sign in to access and manage your family tree securely.</p>
        </div>

        <button className="google-btn" onClick={handleGoogleLogin}>
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google logo" 
          />
          <span>Continue with Google</span>
        </button>

        <footer className="login-footer">
          <p>© 2025 HierarchicalRoots</p>
          <small>Secure Gmail Authentication</small>
        </footer>
      </div>
    </div>
  );
};

export default Login;