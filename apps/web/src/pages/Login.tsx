import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn } from '../lib/auth-client';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || 'Erreur de connexion');
      } else {
        navigate('/routes');
      }
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-hold-pink flex items-center justify-center border-2 border-climb-dark shadow-neo -rotate-3">
              <span className="material-symbols-outlined text-white text-[28px] rotate-3">
                terrain
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-climb-dark">ClimbTracker</h1>
              <p className="text-[11px] font-bold text-climb-dark/60 uppercase tracking-widest">v2.0</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="neo-card p-8">
          <h2 className="text-2xl font-extrabold text-climb-dark mb-2">Connexion</h2>
          <p className="text-sm text-climb-dark/60 mb-6">Ravis de vous revoir !</p>

          {error && (
            <div className="bg-hold-pink/10 border-2 border-hold-pink/30 text-hold-pink px-4 py-3 rounded-xl mb-6 text-sm font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-[11px] font-extrabold text-climb-dark/60 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-neo"
                placeholder="votre@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] font-extrabold text-climb-dark/60 uppercase tracking-wider mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-neo"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-neo-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-climb-dark/10 text-center">
            <p className="text-sm text-climb-dark/60">
              Pas encore de compte ?{' '}
              <Link to="/register" className="font-bold text-hold-pink hover:text-hold-pink/80">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
