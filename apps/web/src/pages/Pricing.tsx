import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { BottomNav } from '../components/BottomNav';
import { trackEvent } from '../lib/analytics';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Plan {
  id: string;
  name: string;
  price: number;
  priceId?: string;
  features: string[];
}

interface SubscriptionStatus {
  isPremium: boolean;
  hasSubscription: boolean;
  currentPeriodEnd: string | null;
}

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: session } = useSession();
  const user = session?.user;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const canceled = searchParams.get('canceled') === 'true';

  useEffect(() => {
    trackEvent.viewPricing();
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load plans
      const plansRes = await fetch(`${API_URL}/api/stripe/plans`);
      const plansData = await plansRes.json();
      if (plansData.success) {
        setPlans(plansData.data.plans);
      }

      // Load subscription status if logged in
      if (user) {
        const subRes = await fetch(`${API_URL}/api/stripe/subscription`, {
          credentials: 'include',
        });
        const subData = await subRes.json();
        if (subData.success) {
          setSubscription(subData.data);
        }
      }
    } catch (error) {
      console.error('Failed to load pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/login?redirect=/pricing');
      return;
    }

    setCheckoutLoading(true);
    trackEvent.startCheckout('premium');

    try {
      const res = await fetch(`${API_URL}/api/stripe/checkout`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stripe/portal`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        alert(data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-hold-pink border-r-transparent"></div>
          <p className="mt-4 text-climb-dark/60 font-bold">Chargement...</p>
        </div>
      </div>
    );
  }

  const freePlan = plans.find(p => p.id === 'free');
  const premiumPlan = plans.find(p => p.id === 'premium');

  return (
    <div className="relative min-h-screen flex flex-col w-full max-w-md mx-auto overflow-hidden bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 pt-12 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-hold-yellow flex items-center justify-center border-2 border-climb-dark shadow-neo-sm rotate-3">
                <span className="material-symbols-outlined text-climb-dark text-[20px] -rotate-3">diamond</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-climb-dark">
                Premium
              </h1>
            </div>
            <p className="text-[11px] font-bold text-climb-dark/60 uppercase tracking-widest mt-1 ml-12">
              Debloquez tout le potentiel
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="px-6 pt-4 flex flex-col gap-6">
          {canceled && (
            <div className="p-4 bg-hold-yellow/20 border-2 border-hold-yellow rounded-xl text-climb-dark text-sm font-bold">
              Paiement annule. Vous pouvez reessayer quand vous voulez.
            </div>
          )}

          {subscription?.isPremium && (
            <div className="p-4 bg-hold-green/20 border-2 border-hold-green rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-hold-green fill-1">verified</span>
                <span className="font-extrabold text-climb-dark">Vous etes Premium!</span>
              </div>
              <p className="text-sm text-climb-dark/70">
                Votre abonnement est actif
                {subscription.currentPeriodEnd && (
                  <> jusqu'au {new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}</>
                )}
              </p>
              <button
                onClick={handleManageSubscription}
                className="mt-3 px-4 py-2 bg-white text-climb-dark rounded-xl font-bold text-sm border-2 border-climb-dark hover:bg-cream transition-all"
              >
                Gerer mon abonnement
              </button>
            </div>
          )}

          {/* Plans */}
          <div className="grid gap-4">
            {/* Free Plan */}
            {freePlan && (
              <div className="neo-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-extrabold text-climb-dark">{freePlan.name}</h3>
                  <span className="text-2xl font-extrabold text-climb-dark">0EUR</span>
                </div>
                <ul className="space-y-2">
                  {freePlan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-climb-dark/70">
                      <span className="material-symbols-outlined text-[16px] text-hold-green">check</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                {!user && (
                  <button
                    onClick={() => navigate('/register')}
                    className="w-full mt-4 px-4 py-3 bg-white text-climb-dark rounded-xl font-bold border-2 border-climb-dark hover:bg-cream transition-all"
                  >
                    Commencer gratuitement
                  </button>
                )}
              </div>
            )}

            {/* Premium Plan */}
            {premiumPlan && (
              <div className="neo-card p-6 bg-gradient-to-br from-hold-yellow/20 to-hold-orange/20 border-hold-yellow relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-extrabold text-climb-dark">{premiumPlan.name}</h3>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-climb-dark">{premiumPlan.price}EUR</span>
                    <span className="text-sm text-climb-dark/60">/mois</span>
                  </div>
                </div>
                <ul className="space-y-2">
                  {premiumPlan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-climb-dark/70">
                      <span className="material-symbols-outlined text-[16px] text-hold-green fill-1">check_circle</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                {!subscription?.isPremium && (
                  <button
                    onClick={handleSubscribe}
                    disabled={checkoutLoading}
                    className="w-full mt-4 px-4 py-3 bg-hold-yellow text-climb-dark rounded-xl font-extrabold border-2 border-climb-dark shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
                  >
                    {checkoutLoading ? 'Chargement...' : 'Passer Premium'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="mt-4">
            <h3 className="text-lg font-extrabold text-climb-dark mb-4">Questions frequentes</h3>
            <div className="space-y-3">
              <div className="neo-card p-4">
                <h4 className="font-bold text-climb-dark mb-1">Puis-je annuler a tout moment?</h4>
                <p className="text-sm text-climb-dark/70">
                  Oui, vous pouvez annuler votre abonnement a tout moment depuis votre espace de gestion.
                </p>
              </div>
              <div className="neo-card p-4">
                <h4 className="font-bold text-climb-dark mb-1">Comment fonctionne le paiement?</h4>
                <p className="text-sm text-climb-dark/70">
                  Le paiement est securise par Stripe. Vous serez debite mensuellement.
                </p>
              </div>
              <div className="neo-card p-4">
                <h4 className="font-bold text-climb-dark mb-1">Que se passe-t-il si j'annule?</h4>
                <p className="text-sm text-climb-dark/70">
                  Vous gardez l'acces Premium jusqu'a la fin de votre periode de facturation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
