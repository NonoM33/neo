import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password);
      navigate('/');
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{
        background: 'var(--neo-bg-body)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated background gradient */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle at 30% 50%, rgba(124, 58, 237, 0.08) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(59, 130, 246, 0.06) 0%, transparent 50%)',
        animation: 'float 8s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      <div
        className="glass-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="text-center mb-4">
          <div
            className="animate-float"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '70px',
              height: '70px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--neo-accent), var(--neo-primary))',
              marginBottom: '1rem',
            }}
          >
            <i className="bi bi-house-gear-fill" style={{ fontSize: '2rem', color: '#fff' }}></i>
          </div>
          <h1 className="h3 mt-2 mb-1" style={{ color: 'var(--neo-text-primary)' }}>Neo CRM</h1>
          <p style={{ color: 'var(--neo-text-secondary)' }}>Connectez-vous pour continuer</p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              className="form-control"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="form-label">
              Mot de passe
            </label>
            <input
              type="password"
              className="form-control"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, var(--neo-accent), var(--neo-primary))',
              border: 'none',
              padding: '10px',
              fontWeight: 600,
            }}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Connexion...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-2"></i>
                Se connecter
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
