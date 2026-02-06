import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePremiumStatus } from '../hooks/usePremiumStatus';

// Colors for each nav item
const navColors = {
  explore: { active: '#08D9D6', bg: 'rgba(8, 217, 214, 0.15)' },
  leaderboard: { active: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)' },
  profile: { active: '#FF2E63', bg: 'rgba(255, 46, 99, 0.15)' },
  friends: { active: '#9B59B6', bg: 'rgba(155, 89, 182, 0.15)' },
  analytics: { active: '#2ECC71', bg: 'rgba(46, 204, 113, 0.15)' },
  premium: { active: '#FFB830', bg: 'rgba(255, 184, 48, 0.15)' },
  admin: { active: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
};

export const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();

  const isActive = (path: string) => {
    if (path === '/routes') {
      return location.pathname === '/routes';
    }
    if (path.startsWith('/users/')) {
      return location.pathname.startsWith('/users/');
    }
    if (path === '/leaderboard') {
      return location.pathname === '/leaderboard';
    }
    if (path === '/friends') {
      return location.pathname === '/friends';
    }
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname === path;
  };

  const isAdmin = (user as any)?.role === 'ADMIN';

  const profilePath = user ? `/users/${user.id}` : '/';
  const isProfileActive = isActive(profilePath);

  return (
    <div className="fixed bottom-0 z-50 w-full max-w-md bg-white border-t-4 border-climb-dark pb-8 pt-4 shadow-[0_-8px_20px_rgba(0,0,0,0.05)]">
      <div className="grid grid-cols-5 h-12 px-2">
        {/* Explore */}
        <Link
          to="/routes"
          className="flex flex-col items-center justify-center gap-1 transition-all"
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isActive('/routes') ? 'scale-110' : ''}`}
            style={{
              backgroundColor: isActive('/routes') ? navColors.explore.bg : 'transparent',
              color: isActive('/routes') ? navColors.explore.active : 'rgba(37, 42, 52, 0.4)',
            }}
          >
            <span className={`material-symbols-outlined text-[24px] ${isActive('/routes') ? 'fill-1' : ''}`}>
              explore
            </span>
          </div>
          <span
            className="text-[9px] font-extrabold uppercase tracking-tighter"
            style={{ color: isActive('/routes') ? navColors.explore.active : 'rgba(37, 42, 52, 0.4)' }}
          >
            Explorer
          </span>
        </Link>

        {/* Leaderboard */}
        <Link
          to="/leaderboard"
          className="flex flex-col items-center justify-center gap-1 transition-all"
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isActive('/leaderboard') ? 'scale-110' : ''}`}
            style={{
              backgroundColor: isActive('/leaderboard') ? navColors.leaderboard.bg : 'transparent',
              color: isActive('/leaderboard') ? navColors.leaderboard.active : 'rgba(37, 42, 52, 0.4)',
            }}
          >
            <span className={`material-symbols-outlined text-[24px] ${isActive('/leaderboard') ? 'fill-1' : ''}`}>
              leaderboard
            </span>
          </div>
          <span
            className="text-[9px] font-extrabold uppercase tracking-tighter"
            style={{ color: isActive('/leaderboard') ? navColors.leaderboard.active : 'rgba(37, 42, 52, 0.4)' }}
          >
            Classement
          </span>
        </Link>

        {/* Profile - Central elevated button */}
        <Link
          to={profilePath}
          className="flex flex-col items-center justify-center gap-1 relative"
        >
          <div
            className={`absolute -top-6 w-14 h-14 rounded-full border-4 border-white shadow-lg flex items-center justify-center transition-all ${isProfileActive ? 'scale-110' : ''}`}
            style={{
              backgroundColor: isProfileActive ? navColors.profile.active : 'rgba(37, 42, 52, 0.1)',
              color: isProfileActive ? 'white' : 'rgba(37, 42, 52, 0.6)',
            }}
          >
            <span className="material-symbols-outlined text-[26px] fill-1">
              person
            </span>
          </div>
          <span
            className="text-[9px] font-extrabold uppercase tracking-tighter mt-8"
            style={{ color: isProfileActive ? navColors.profile.active : 'rgba(37, 42, 52, 0.4)' }}
          >
            Moi
          </span>
        </Link>

        {/* Social / Friends */}
        <Link
          to="/friends"
          className="flex flex-col items-center justify-center gap-1 transition-all"
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isActive('/friends') ? 'scale-110' : ''}`}
            style={{
              backgroundColor: isActive('/friends') ? navColors.friends.bg : 'transparent',
              color: isActive('/friends') ? navColors.friends.active : 'rgba(37, 42, 52, 0.4)',
            }}
          >
            <span className={`material-symbols-outlined text-[24px] ${isActive('/friends') ? 'fill-1' : ''}`}>
              group
            </span>
          </div>
          <span
            className="text-[9px] font-extrabold uppercase tracking-tighter"
            style={{ color: isActive('/friends') ? navColors.friends.active : 'rgba(37, 42, 52, 0.4)' }}
          >
            Social
          </span>
        </Link>

        {/* Admin / Premium / Pricing */}
        {isAdmin ? (
          <Link
            to="/admin"
            className="flex flex-col items-center justify-center gap-1 transition-all"
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isActive('/admin') ? 'scale-110' : ''}`}
              style={{
                backgroundColor: isActive('/admin') ? navColors.admin.bg : 'transparent',
                color: isActive('/admin') ? navColors.admin.active : 'rgba(37, 42, 52, 0.4)',
              }}
            >
              <span className={`material-symbols-outlined text-[24px] ${isActive('/admin') ? 'fill-1' : ''}`}>
                admin_panel_settings
              </span>
            </div>
            <span
              className="text-[9px] font-extrabold uppercase tracking-tighter"
              style={{ color: isActive('/admin') ? navColors.admin.active : 'rgba(37, 42, 52, 0.4)' }}
            >
              Admin
            </span>
          </Link>
        ) : isPremium ? (
          <Link
            to="/"
            className="flex flex-col items-center justify-center gap-1 transition-all"
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isActive('/') ? 'scale-110' : ''}`}
              style={{
                backgroundColor: isActive('/') ? navColors.analytics.bg : 'transparent',
                color: isActive('/') ? navColors.analytics.active : 'rgba(37, 42, 52, 0.4)',
              }}
            >
              <span className={`material-symbols-outlined text-[24px] ${isActive('/') ? 'fill-1' : ''}`}>
                analytics
              </span>
            </div>
            <span
              className="text-[9px] font-extrabold uppercase tracking-tighter"
              style={{ color: isActive('/') ? navColors.analytics.active : 'rgba(37, 42, 52, 0.4)' }}
            >
              Analyses
            </span>
          </Link>
        ) : (
          <Link
            to="/pricing"
            className="flex flex-col items-center justify-center gap-1 transition-all"
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isActive('/pricing') ? 'scale-110' : ''}`}
              style={{
                backgroundColor: isActive('/pricing') ? navColors.premium.bg : 'transparent',
                color: isActive('/pricing') ? navColors.premium.active : 'rgba(37, 42, 52, 0.4)',
              }}
            >
              <span className={`material-symbols-outlined text-[24px] ${isActive('/pricing') ? 'fill-1' : ''}`}>
                workspace_premium
              </span>
            </div>
            <span
              className="text-[9px] font-extrabold uppercase tracking-tighter"
              style={{ color: isActive('/pricing') ? navColors.premium.active : 'rgba(37, 42, 52, 0.4)' }}
            >
              Premium
            </span>
          </Link>
        )}
      </div>
    </div>
  );
};
