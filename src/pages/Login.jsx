// src/pages/Login.jsx

import React, { useEffect } from 'react';
import { signInWithGoogle, checkAuth } from '../services/auth'; 
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();
    
    // Check if the user is already logged in
    useEffect(() => {
        // We use checkAuth here to handle the immediate redirect after a successful Google callback.
        checkAuth().then(user => {
            if (user) {
                navigate('/dashboard');
            }
        });
    }, [navigate]);

    // NOTE: Styling is assumed to come from the global CSS you may load externally.
    return (
        <div className="container">
            <header>
                <h1>FamilyRoots</h1>
                <h2>Welcome Back!</h2>
            </header>
            
            <main className="auth-section">
                <p>Sign in to access your family tree.</p>
                <button 
                    id="google-login-btn" 
                    className="google-btn" 
                    onClick={signInWithGoogle}
                >
                    {/* Placeholder for Google Logo - Ensure this URL or path is accessible */}
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google logo" style={{height: '20px', width: '20px', marginRight: '10px'}} />
                    Sign In with Google
                </button>
            </main>
        </div>
    );
};

export default Login;