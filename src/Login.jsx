// src/Login.jsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase"; // Importing auth from your firebase file

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // State to handle error messages
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Attempt to sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in as:", userCredential.user.email);
      
      // 2. Clear inputs
      setEmail('');
      setPassword('');

      // 3. Notify App.jsx (or Redirect) that login succeeded
      // If you are using React Router, use: navigate('/dashboard')
      if (onLoginSuccess) {
        onLoginSuccess(userCredential.user);
      } else {
        // Fallback if no prop is passed (common in simple apps)
        window.location.reload(); 
      }

    } catch (err) {
      console.error("Login Error:", err.message);
      // Show a friendly error message
      setError("Invalid Email or Password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '1rem' 
    }}>
      
      {/* The Glass Card */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        
        {/* Header / Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '60px', height: '60px', 
            background: 'var(--primary)', 
            borderRadius: '16px', 
            margin: '0 auto 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px var(--primary-glow)'
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '32px', color: 'white' }}>grid_view</span>
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-muted)' }}>Enter your credentials to access the console.</p>
        </div>

        {/* Error Message Alert */}
        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.2)', 
            border: '1px solid var(--danger)', 
            color: '#fca5a5', 
            padding: '10px', 
            borderRadius: '8px', 
            marginBottom: '1rem',
            fontSize: '0.9rem',
            textAlign: 'center'
          }}>
            <span className="material-symbols-rounded" style={{ verticalAlign: 'middle', fontSize: '16px', marginRight: '5px' }}>error</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="admin@campus.edu" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ marginBottom: 0 }}>Password</label>
              <a href="#" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>Forgot?</a>
            </div>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <span className="material-symbols-rounded">arrow_forward</span>}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: '#475569' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '12px', verticalAlign: 'middle' }}>lock</span> 
          &nbsp; Secure Connection. Authorized Personnel Only.
        </p>
      </div>
    </div>
  );
};

export default Login;