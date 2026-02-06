import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function usePremiumStatus() {
  const { user, isAuthenticated } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsPremium(false);
      setIsLoading(false);
      return;
    }

    const checkPremiumStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/stripe/subscription`, {
          credentials: 'include',
        });
        const data = await response.json();
        setIsPremium(data.data?.isPremium === true);
      } catch (error) {
        console.error('Failed to check premium status:', error);
        setIsPremium(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPremiumStatus();
  }, [isAuthenticated, user?.id]);

  return { isPremium, isLoading };
}
