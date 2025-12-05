'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          localStorage.setItem('token', data.token);
          router.push('/dashboard');
        }
      } else {
        const err = await response.json();
        setError(err.error || 'Login fehlgeschlagen');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ 
        backgroundColor: '#295B4D', 
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{ 
          backgroundColor: '#F9F5F2',
          borderRadius: '1rem',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '28rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Logo width={200} height={80} />
          </div>
          <h1 
            style={{ 
              color: '#295B4D', 
              fontSize: '1.875rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem' 
            }}
          >
            Willkommen zurück
          </h1>
          <p style={{ color: '#295B4D', fontSize: '0.875rem', opacity: 0.8 }}>
            Melde dich an, um fortzufahren
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '2px solid #f87171',
                color: '#991b1b',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem'
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label 
              htmlFor="email" 
              style={{ 
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                color: '#295B4D'
              }}
            >
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ 
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #EAA48F',
                borderRadius: '0.5rem',
                color: '#295B4D',
                backgroundColor: '#ffffff',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="deine@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label 
              htmlFor="password" 
              style={{ 
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                color: '#295B4D'
              }}
            >
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ 
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #EAA48F',
                borderRadius: '0.5rem',
                color: '#295B4D',
                backgroundColor: '#ffffff',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#d89a87' : '#EAA48F',
              color: 'white',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '1rem',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'background-color 0.2s ease',
              boxShadow: loading ? 'none' : '0 2px 4px rgba(234, 164, 143, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#d89a87';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#EAA48F';
            }}
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <Link 
              href="/register" 
              style={{ 
                fontSize: '0.875rem',
                color: '#295B4D',
                textDecoration: 'none',
                fontWeight: '500',
                opacity: 0.9,
                transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              Noch kein Konto? Registrieren
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
