import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onGoToSignup }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #F7F8FC 100%)',
        padding: '24px'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '36px',
          boxShadow: 'var(--shadow-modal)',
          borderRadius: '24px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '16px'
            }}
          >
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            Academic Portal
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            Project Guidance & Capstone Team Management
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--color-danger-light)',
              color: 'var(--color-danger)',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fa-regular fa-envelope" style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }}></i>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@college.edu or name@student.edu"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-lock" style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }}></i>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              padding: '13px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(67, 56, 202, 0.25)'
            }}
          >
            {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-arrow-right-to-bracket"></i>}
            <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
          </button>
        </form>

        {/* Quick Demo Logins Box */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', textAlign: 'center' }}>
            Quick 1-Click Demo Logins
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => fillCredentials('hod.cs@college.edu', 'HodPass@2026')}
              style={{
                padding: '8px 6px',
                borderRadius: '8px',
                border: '1px solid #E0E7FF',
                backgroundColor: '#EEF2FF',
                color: '#4338CA',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              HOD (Admin)
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('sarah.jenkins@college.edu', 'Password@123')}
              style={{
                padding: '8px 6px',
                borderRadius: '8px',
                border: '1px solid #EDE9FE',
                backgroundColor: '#F5F3FF',
                color: '#7C3AED',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Faculty Mentor
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('alex.chen@student.edu', 'Password@123')}
              style={{
                padding: '8px 6px',
                borderRadius: '8px',
                border: '1px solid #DCFCE7',
                backgroundColor: '#F0FDF4',
                color: '#16A34A',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Student
            </button>
          </div>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          New student or faculty?{' '}
          <button
            onClick={onGoToSignup}
            style={{ color: 'var(--color-primary)', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer' }}
          >
            Create an Account
          </button>
        </div>
      </div>
    </div>
  );
}
