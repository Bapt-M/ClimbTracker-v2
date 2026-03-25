import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePremiumStatus } from '../hooks/usePremiumStatus';

const navColors = {
  explore:     { active: '#08D9D6', bg: 'rgba(8, 217, 214, 0.15)' },
  leaderboard: { active: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)' },
  profile:     { active: '#FF2E63', bg: 'rgba(255, 46, 99, 0.15)' },
  friends:     { active: '#9B59B6', bg: 'rgba(155, 89, 182, 0.15)' },
  analytics:   { active: '#2ECC71', bg: 'rgba(46, 204, 113, 0.15)' },
  premium:     { active: '#FFB830', bg: 'rgba(255, 184, 48, 0.15)' },
  admin:       { active: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
};

interface NavItemProps {
  to: string;
  color: { active: string; bg: string };
  icon: string;
  label: string;
  active: boolean;
}

function NavItem({ to, color, icon, label, active }: NavItemProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-4 py-2 rounded-2xl transition-all"
      style={{
        backgroundColor: active ? color.bg : 'transparent',
        color: active ? color.active : 'rgba(37, 42, 52, 0.5)',
      }}
    >
      <span className={`material-symbols-outlined text-[22px] ${active ? 'fill-1' : ''}`}>
        {icon}
      </span>
      <span className="text-[11px] font-extrabold uppercase tracking-tight">{label}</span>
    </Link>
  );
}

export const TopNav = () => {
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

  return (
    <div className="fixed top-0 z-50 w-full h-16 bg-cream border-b-2 border-climb-dark hidden md:flex items-center justify-between px-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
      {/* Logo */}
      <Link to="/routes" className="flex items-center gap-2 shrink-0">
        <span className="material-symbols-outlined text-climb-dark text-[22px] fill-1">
          mountain_flag
        </span>
        <span className="text-base font-extrabold tracking-tight text-climb-dark">
          ClimbTracker
        </span>
      </Link>

      {/* Nav items */}
      <div className="flex items-center gap-1">
        <NavItem to="/routes"       color={navColors.explore}     icon="explore"                 label="Explorer"   active={isActive('/routes')} />
        <NavItem to="/leaderboard"  color={navColors.leaderboard} icon="leaderboard"             label="Classement" active={isActive('/leaderboard')} />
        <NavItem to={profilePath}   color={navColors.profile}     icon="person"                  label="Moi"        active={isActive(profilePath)} />
        <NavItem to="/friends"      color={navColors.friends}     icon="group"                   label="Social"     active={isActive('/friends')} />
        {isAdmin ? (
          <NavItem to="/admin"   color={navColors.admin}     icon="admin_panel_settings" label="Admin"    active={isActive('/admin')} />
        ) : isPremium ? (
          <NavItem to="/"        color={navColors.analytics} icon="analytics"            label="Analyses" active={isActive('/')} />
        ) : (
          <NavItem to="/pricing" color={navColors.premium}   icon="workspace_premium"    label="Premium"  active={isActive('/pricing')} />
        )}
      </div>
    </div>
  );
};
