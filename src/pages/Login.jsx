// src/pages/Login.jsx

import React, { useEffect,useState } from 'react';
import { signInWithGoogle, checkAuth } from '../services/auth'; 
import { useNavigate } from 'react-router-dom';
import './Login.css'; // We will create this next

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h1 className="brand-logo">HierarchicalRoots</h1>
        <p className="welcome-text">{isLogin ? 'Welcome Back!' : 'Create your Tree'}</p>
        
        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
          <div className="input-field">
            <label>Email Address</label>
            <input type="email" placeholder="name@example.com" required />
          </div>

          <div className="input-field">
            <label>Password</label>
            <input type="password" placeholder="••••••••" required />
          </div>

          {!isLogin && (
            <div className="input-field">
              <label>Confirm Password</label>
              <input type="password" placeholder="••••••••" required />
            </div>
          )}

          <button type="submit" className="submit-btn">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="toggle-auth">
          <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register Now' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;