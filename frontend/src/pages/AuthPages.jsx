import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import CoffeeRing from '../components/CoffeeRing';
import { Eye, EyeOff } from 'lucide-react';

const AuthPages = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login, signup } = useAuth();
  const toast     = useToast();
  const isLogin   = location.pathname === '/login';

  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // Password validation checks
  const hasMinLength = form.password.length >= 8;
  const hasUppercase = /[A-Z]/.test(form.password);
  const hasLowercase = /[a-z]/.test(form.password);
  const hasNumber = /[0-9]/.test(form.password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(form.password);

  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  const handleSubmit = async e => {
    e.preventDefault();
    
    if (!isLogin) {
      if (!isPasswordValid) {
        toast.error('Password does not meet all requirements.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast.error('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await signup(form.username, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const RequirementItem = ({ met, text }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      color: met ? '#4ade80' : 'var(--silver)',
      fontSize: '0.65rem',
      fontFamily: '"Share Tech Mono", monospace',
      transition: 'color 0.2s',
    }}>
      <span>{met ? '✓' : '○'}</span>
      <span>{text}</span>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--paper)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      <CoffeeRing style={{ top: '10%', right: '8%' }} />
      <CoffeeRing style={{ bottom: '15%', left: '5%', opacity: 0.6 }} />

      {/* Safelight */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle at bottom right, rgba(107,26,10,0.1), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: '480px', position: 'relative', zIndex: 1 }}
      >
        {/* Document header */}
        <div style={{
          backgroundColor: 'var(--redact)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            color: 'var(--paper)',
          }}>
            {isLogin ? 'SECURITY CLEARANCE — REENTRY' : 'NEW SUBJECT REGISTRATION'}
          </span>
          <span style={{
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: '0.6rem',
            color: 'var(--silver)',
          }}>
            FORM-{isLogin ? 'LC-01' : 'SR-01'}
          </span>
        </div>

        {/* Form body */}
        <div className="dossier-card" style={{ padding: '40px 36px' }}>

          <h1 style={{
            fontFamily: '"Special Elite", serif',
            fontSize: '1.8rem',
            color: 'var(--ink)',
            marginBottom: '8px',
          }}>
            {isLogin ? 'Access Dossier' : 'Open New File'}
          </h1>
          <p style={{
            fontFamily: '"Courier Prime", monospace',
            fontSize: '13px',
            color: 'var(--silver)',
            marginBottom: '36px',
            lineHeight: 1.7,
          }}>
            {isLogin
              ? 'Provide credentials to re-enter the archive.'
              : 'Complete this form to begin filing your subconscious.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {!isLogin && (
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.6rem',
                  letterSpacing: '0.15em',
                  color: 'var(--silver)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}>
                  SUBJECT IDENTIFIER
                </label>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className="doc-input"
                  placeholder="operative_handle"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label style={{
                display: 'block',
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.15em',
                color: 'var(--silver)',
                marginBottom: '6px',
                textTransform: 'uppercase',
              }}>
                CONTACT FREQUENCY
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="doc-input"
                placeholder="operative@division.gov"
                required
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.15em',
                color: 'var(--silver)',
                marginBottom: '6px',
                textTransform: 'uppercase',
              }}>
                ACCESS CODE
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  className="doc-input"
                  placeholder="••••••••••••"
                  required
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--silver)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {!isLogin && form.password && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '12px',
                  backgroundColor: 'rgba(61,53,40,0.05)',
                  border: '1px solid rgba(61,53,40,0.1)',
                  borderRadius: '4px'
                }}>
                  <div style={{ 
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: '0.6rem',
                    color: 'var(--ink)',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                  }}>
                    SECURITY REQUIREMENTS:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <RequirementItem met={hasMinLength} text="8+ CHARACTERS" />
                    <RequirementItem met={hasUppercase} text="UPPERCASE" />
                    <RequirementItem met={hasLowercase} text="LOWERCASE" />
                    <RequirementItem met={hasNumber} text="NUMBER" />
                    <RequirementItem met={hasSpecial} text="SPECIAL (!@#$)" />
                  </div>
                </div>
              )}
            </div>

            {!isLogin && (
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.6rem',
                  letterSpacing: '0.15em',
                  color: 'var(--silver)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}>
                  CONFIRM ACCESS CODE
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="doc-input"
                    placeholder="••••••••••••"
                    required={!isLogin}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--silver)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px dashed rgba(61,53,40,0.3)', paddingTop: '24px', marginTop: '8px' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn-stamp btn-stamp-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem' }}
              >
                {loading ? 'PROCESSING...' : isLogin ? '▶ ENTER ARCHIVE' : '▶ OPEN FILE'}
              </button>
            </div>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <span style={{ fontFamily: '"Courier Prime", monospace', fontSize: '12px', color: 'var(--silver)' }}>
              {isLogin ? 'No file exists? ' : 'Already filed? '}
              <Link
                to={isLogin ? '/signup' : '/login'}
                style={{ color: 'var(--ink)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
              >
                {isLogin ? 'Register a new subject' : 'Access existing dossier'}
              </Link>
            </span>
          </div>
        </div>

        {/* Footer ref */}
        <div style={{
          textAlign: 'right',
          marginTop: '12px',
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '0.55rem',
          color: 'var(--silver)',
          letterSpacing: '0.1em',
        }}>
          DREAMSIGNAL SECURE ACCESS PORTAL — DS-2025
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPages;
