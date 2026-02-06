import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { BottomNav } from '../components/BottomNav';
import { AdminGymLayout } from '../components/admin/AdminGymLayout';
import { AdminRoutes } from '../components/admin/AdminRoutes';
import { AdminUsers } from '../components/admin/AdminUsers';

type AdminTab = 'gym-layout' | 'routes' | 'users';

export default function Admin() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const [activeTab, setActiveTab] = useState<AdminTab>('gym-layout');

  // Check if user is admin
  useEffect(() => {
    if (!isPending && (!session?.user || (session.user as any).role !== 'ADMIN')) {
      navigate('/routes');
    }
  }, [session, isPending, navigate]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-hold-pink border-r-transparent"></div>
          <p className="mt-4 text-climb-dark/60 font-bold">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return null;
  }

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'gym-layout', label: 'Plan Salle', icon: 'map' },
    { id: 'routes', label: 'Voies', icon: 'route' },
    { id: 'users', label: 'Utilisateurs', icon: 'group' },
  ];

  return (
    <div className="relative min-h-screen flex flex-col w-full max-w-md mx-auto overflow-hidden bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 pt-12 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-hold-orange flex items-center justify-center border-2 border-climb-dark shadow-neo-sm -rotate-3">
                <span className="material-symbols-outlined text-white text-[20px] rotate-3">admin_panel_settings</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-climb-dark">
                Administration
              </h1>
            </div>
            <div className="flex items-center gap-1.5 mt-1 ml-12">
              <span className="w-2 h-2 rounded-full bg-hold-orange animate-pulse"></span>
              <p className="text-[11px] font-bold text-climb-dark/60 uppercase tracking-widest">
                Panneau admin
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-4">
          <div className="flex gap-2 bg-white rounded-2xl p-1.5 border-2 border-climb-dark shadow-neo-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-hold-orange text-white shadow-sm'
                    : 'text-climb-dark/60 hover:text-climb-dark hover:bg-cream'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="px-4">
          {activeTab === 'gym-layout' && <AdminGymLayout />}
          {activeTab === 'routes' && <AdminRoutes />}
          {activeTab === 'users' && <AdminUsers />}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
