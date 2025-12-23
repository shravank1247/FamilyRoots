import React from 'react';
import './Login.css';

const Login = () => {
  
  const handleGoogleLogin = () => {
    console.log("Redirecting to Google Auth...");
    // Trigger your existing Google Sign-In logic here
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
            alt="Google Logo" 
          />
          <span>Continue with Google</span>
        </button>

        <footer className="login-footer">
          <p>© 2024 HierarchicalRoots</p>
          <small>Secure Gmail Authentication</small>
        </footer>
      </div>
    </div>
  );
};

export default Login;