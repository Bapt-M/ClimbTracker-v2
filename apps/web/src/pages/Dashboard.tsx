import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BottomNav } from '../components/BottomNav';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen flex flex-col w-full max-w-md mx-auto overflow-hidden bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-climb-dark/10">
        <div className="flex items-center justify-between px-5 pt-12 pb-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-climb-dark">
              Analytics
            </h1>
            <p className="text-[10px] font-medium text-climb-dark/50 uppercase tracking-wider">
              ClimbTracker v2
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="relative p-2 rounded-full hover:bg-cream transition-colors border-2 border-climb-dark/20"
            >
              <span className="material-symbols-outlined text-climb-dark text-[22px]">
                logout
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24 px-5 py-6">
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight text-climb-dark mb-2">
            Bienvenue,
            <br />
            <span className="text-climb-dark/50">{user?.name?.split(' ')[0] || 'Grimpeur'} !</span>
          </h2>
        </div>

        {/* User Info Card */}
        <div className="neo-card p-5 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-hold-pink flex items-center justify-center border-2 border-climb-dark">
              <span className="text-white font-bold text-2xl">
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-climb-dark">
                {user?.name}
              </h3>
              <p className="text-sm text-climb-dark/50">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-climb-dark/10">
            <span className="material-symbols-outlined text-hold-green text-[14px] fill-1">
              verified_user
            </span>
            <p className="text-xs font-medium text-climb-dark/50">
              Connecté en tant que {user?.role || 'CLIMBER'}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="stats-card bg-hold-green/10">
            <span className="text-[10px] text-climb-dark/50 uppercase font-bold tracking-wider mb-1">
              Validations
            </span>
            <span className="text-2xl font-extrabold text-climb-dark">
              --
            </span>
          </div>

          <div className="stats-card bg-hold-blue/10">
            <span className="text-[10px] text-climb-dark/50 uppercase font-bold tracking-wider mb-1">
              Voies
            </span>
            <span className="text-2xl font-extrabold text-climb-dark">
              --
            </span>
          </div>

          <div className="stats-card bg-hold-yellow/10">
            <span className="text-[10px] text-climb-dark/50 uppercase font-bold tracking-wider mb-1">
              Flash
            </span>
            <span className="text-2xl font-extrabold text-climb-dark">
              --
            </span>
          </div>
        </div>

        {/* About Card */}
        <div className="neo-card p-5">
          <h3 className="text-lg font-bold text-climb-dark mb-3">
            ClimbTracker v2
          </h3>
          <p className="text-sm text-climb-dark/60 leading-relaxed font-light mb-4">
            Nouvelle version avec architecture moderne. Migration en cours...
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-hold-green text-sm fill-1">
                check_circle
              </span>
              <span className="text-xs text-climb-dark/60">
                Authentification Better Auth
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-hold-green text-sm fill-1">
                check_circle
              </span>
              <span className="text-xs text-climb-dark/60">
                API Hono + Drizzle ORM
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-hold-green text-sm fill-1">
                check_circle
              </span>
              <span className="text-xs text-climb-dark/60">
                Supabase PostgreSQL
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-hold-orange text-sm">
                pending
              </span>
              <span className="text-xs text-climb-dark/60">
                Migration des données en cours
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Dashboard;
