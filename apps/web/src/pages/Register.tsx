import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp } from '../lib/auth-client';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        setError(result.error.message || "Erreur lors de l'inscription");
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
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-hold-blue flex items-center justify-center border-2 border-climb-dark shadow-neo rotate-3">
              <span className="material-symbols-outlined text-white text-[28px] -rotate-3">
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
          <h2 className="text-2xl font-extrabold text-climb-dark mb-2">Inscription</h2>
          <p className="text-sm text-climb-dark/60 mb-6">Rejoignez la communauté !</p>

          {error && (
            <div className="bg-hold-pink/10 border-2 border-hold-pink/30 text-hold-pink px-4 py-3 rounded-xl mb-6 text-sm font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-[11px] font-extrabold text-climb-dark/60 uppercase tracking-wider mb-2">
                Nom
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-neo"
                placeholder="Votre nom"
                required
              />
            </div>

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
                minLength={8}
              />
              <p className="text-[10px] text-climb-dark/40 mt-1">Minimum 8 caractères</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[11px] font-extrabold text-climb-dark/60 uppercase tracking-wider mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Inscription...
                </span>
              ) : (
                "S'inscrire"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-climb-dark/10 text-center">
            <p className="text-sm text-climb-dark/60">
              Déjà un compte ?{' '}
              <Link to="/login" className="font-bold text-hold-blue hover:text-hold-blue/80">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
