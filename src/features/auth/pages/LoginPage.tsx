import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ROUTES } from '@config/routes';
import { useToast }    from '@shared/components/feedback/ToastProvider';
import { APP_NAME }    from '@shared/utils/constants';
import { supabase }    from '@config/supabase';
import { useNavigate, useLocation } from 'react-router-dom';

export default function LoginPage() {
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;

  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      
      if (error) throw error;
      
      // AuthProvider will automatically pick up the session change
      navigate(from, { replace: true });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    background: 'var(--color-surface-overlay)',
    border: '1px solid var(--color-border-default)',
    color: 'var(--color-text-primary)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 12px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  } as React.CSSProperties;

  return (
    <div className="space-y-7">
      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Sign in to {APP_NAME}
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Enter your credentials to access the platform
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            style={inputStyle}
            placeholder="you@company.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Password
            </label>
            <Link to={ROUTES.FORGOT_PASSWORD} className="text-xs" style={{ color: 'var(--color-text-accent)' }}>
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            style={inputStyle}
            placeholder="••••••••"
          />
        </div>

        <motion.button
          type="submit"
          disabled={submitting}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity duration-150"
          style={{
            background: 'linear-gradient(135deg, var(--color-marine-600), var(--color-marine-500))',
            color: 'white',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </motion.button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--color-border-subtle)' }} />
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>or</span>
        <div className="flex-1 h-px" style={{ background: 'var(--color-border-subtle)' }} />
      </div>

      {/* Sign up link */}
      <p className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Don&apos;t have an account?{' '}
        <Link to={ROUTES.SIGNUP} style={{ color: 'var(--color-text-accent)' }} className="font-medium">
          Create account
        </Link>
      </p>
    </div>
  );
}
