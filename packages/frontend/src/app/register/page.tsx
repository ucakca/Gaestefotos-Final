'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { authApi } from '@/lib/auth';
import Logo from '@/components/Logo';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    if (formData.password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setLoading(true);

    try {
      await authApi.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#295B4D' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl shadow-xl p-8 w-full max-w-md"
        style={{ backgroundColor: '#F9F5F2' }}
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo width={180} height={72} />
          </div>
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: '#295B4D' }}
          >
            Neues Konto erstellen
          </h1>
          <p className="text-sm" style={{ color: '#295B4D' }}>
            Registriere dich für Gästefotos
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border-2 border-red-400 text-red-800 px-4 py-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <div>
              <label 
                htmlFor="name" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#295B4D' }}
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all"
                style={{ 
                  borderColor: '#EAA48F',
                  color: '#295B4D',
                  backgroundColor: '#ffffff'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#EAA48F';
                  e.target.style.boxShadow = '0 0 0 2px rgba(234, 164, 143, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#EAA48F';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Max Mustermann"
              />
            </div>
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#295B4D' }}
              >
                E-Mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all"
                style={{ 
                  borderColor: '#EAA48F',
                  color: '#295B4D',
                  backgroundColor: '#ffffff'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#EAA48F';
                  e.target.style.boxShadow = '0 0 0 2px rgba(234, 164, 143, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#EAA48F';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="deine@email.com"
              />
            </div>
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#295B4D' }}
              >
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all"
                style={{ 
                  borderColor: '#EAA48F',
                  color: '#295B4D',
                  backgroundColor: '#ffffff'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#EAA48F';
                  e.target.style.boxShadow = '0 0 0 2px rgba(234, 164, 143, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#EAA48F';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block text-sm font-medium mb-2"
                style={{ color: '#295B4D' }}
              >
                Passwort bestätigen
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all"
                style={{ 
                  borderColor: '#EAA48F',
                  color: '#295B4D',
                  backgroundColor: '#ffffff'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#EAA48F';
                  e.target.style.boxShadow = '0 0 0 2px rgba(234, 164, 143, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#EAA48F';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="••••••••"
              />
            </div>
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="w-full text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#EAA48F' }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#d89a87';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#EAA48F';
            }}
          >
            {loading ? 'Registrieren...' : 'Registrieren'}
          </motion.button>

          <div className="text-center">
            <a 
              href="/login" 
              className="text-sm hover:underline"
              style={{ color: '#295B4D' }}
            >
              Bereits ein Konto? Anmelden
            </a>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

