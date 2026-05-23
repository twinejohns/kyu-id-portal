"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react';

type View = 'login' | 'forgot';

export default function LoginPage() {
  const router = useRouter();

  // ── Login state ────────────────────────────────────────────────────────────
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [emailError, setEmailError] = useState('');

  // ── Forgot-password state ──────────────────────────────────────────────────
  const [view, setView]             = useState<View>('login');
  const [fpEmail, setFpEmail]       = useState('');
  const [fpLoading, setFpLoading]   = useState(false);
  const [fpError, setFpError]       = useState('');
  const [fpSuccess, setFpSuccess]   = useState('');

  // ── Helpers ────────────────────────────────────────────────────────────────
  const validateKyuEmail = (val: string) => {
    if (val && !val.endsWith('@kyu.ac.ug')) {
      setEmailError('Only @kyu.ac.ug email addresses are accepted.');
    } else {
      setEmailError('');
    }
  };

  // ── Login handler ──────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith('@kyu.ac.ug')) {
      setEmailError('Only @kyu.ac.ug email addresses are accepted.');
      return;
    }
    setLoading(true);
    setError('');

    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (data.success) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setError(data.error || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  // ── Forgot-password handler ────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError('');
    setFpSuccess('');

    if (!fpEmail.endsWith('@kyu.ac.ug')) {
      setFpError('Only @kyu.ac.ug email addresses are accepted.');
      return;
    }

    setFpLoading(true);
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFpSuccess(data.message || 'Reset instructions sent. Check your email.');
      } else {
        setFpError(data.error || 'Failed to process request. Try again.');
      }
    } catch {
      setFpError('Network error. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  // ── Shared blob / background decorators ───────────────────────────────────
  const blobs = (
    <>
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" style={{ top: 'auto', bottom: '-200px' }} />
    </>
  );

  // ── Logo block (shared) ────────────────────────────────────────────────────
  const logo = (
    <div className="flex flex-col items-center mb-8">
      <div className="relative mb-4 group">
        {/* Animated gradient ring */}
        <div
          className="absolute -inset-1 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"
          style={{
            background: 'linear-gradient(135deg, #f9b012, #8dc63f, #1e5fb8, #f9b012)',
            backgroundSize: '300% 300%',
            animation: 'gradientShift 4s ease infinite',
          }}
        />
        <img
          src="/logo.jpg"
          alt="Kyambogo University Logo"
          className="relative w-20 h-20 object-contain p-1.5 bg-white rounded-2xl shadow-md border border-gray-100"
        />
      </div>
      <h1 className="text-2xl font-extrabold text-[var(--primary-color)]">
        {view === 'login' ? 'Staff Portal Login' : 'Forgot Password'}
      </h1>
      <p className="text-gray-500 text-sm mt-1">
        {view === 'login'
          ? 'HR, Printer, Media and Admin Access'
          : 'Enter your KyU email to receive reset instructions'}
      </p>
    </div>
  );

  // ── LOGIN VIEW ─────────────────────────────────────────────────────────────
  if (view === 'login') {
    return (
      <main className="landing-container bg-gray-50 min-h-screen">
        <style>{`
          @keyframes gradientShift {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>

        <div className="premium-card max-w-md w-full mx-auto animate-fade-in">
          {logo}

          {/* Server-side / network error */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email field */}
            <div className="form-group mb-0">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                className={`input-field ${emailError ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''}`}
                value={email}
                onChange={e => { setEmail(e.target.value); validateKyuEmail(e.target.value); }}
                onBlur={e => validateKyuEmail(e.target.value)}
                placeholder="admin@kyu.ac.ug"
              />
              {emailError && (
                <p className="text-red-500 text-xs mt-1 font-medium">{emailError}</p>
              )}
            </div>

            {/* Password field with toggle */}
            <div className="form-group mb-0">
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  className="input-field pr-11"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={loading}
              style={{
                backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                backgroundColor: '#1e5fb8',
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Secure Login'}
            </button>
          </form>

          {/* Forgot password link */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => { setView('forgot'); setFpEmail(''); setFpError(''); setFpSuccess(''); }}
              className="text-sm text-[var(--primary-color)] hover:underline font-medium transition-colors"
            >
              Forgot Password?
            </button>
          </div>
        </div>

        {blobs}
      </main>
    );
  }

  // ── FORGOT PASSWORD VIEW ───────────────────────────────────────────────────
  return (
    <main className="landing-container bg-gray-50 min-h-screen">
      <style>{`
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div className="premium-card max-w-md w-full mx-auto animate-fade-in">
        {logo}

        {/* Success message */}
        {fpSuccess && (
          <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-lg text-sm mb-4 border border-emerald-100 flex items-start gap-2">
            <Mail size={16} className="mt-0.5 shrink-0" />
            <span>{fpSuccess}</span>
          </div>
        )}

        {/* Error message */}
        {fpError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
            {fpError}
          </div>
        )}

        {!fpSuccess && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="form-group mb-0">
              <label className="form-label">KyU Email Address</label>
              <input
                type="email"
                required
                className="input-field"
                value={fpEmail}
                onChange={e => setFpEmail(e.target.value)}
                placeholder="yourname@kyu.ac.ug"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={fpLoading}
              style={{
                backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                backgroundColor: '#1e5fb8',
              }}
            >
              {fpLoading
                ? <><Loader2 className="animate-spin" size={18} /> Sending…</>
                : 'Send Reset Instructions'}
            </button>
          </form>
        )}

        {/* Back to login */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setView('login')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[var(--primary-color)] font-medium transition-colors"
          >
            <ArrowLeft size={14} /> Back to Login
          </button>
        </div>
      </div>

      {blobs}
    </main>
  );
}
