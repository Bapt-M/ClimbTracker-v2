import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface RouteCompletionCountProps {
  routeId: string;
  className?: string;
}

export const RouteCompletionCount = ({
  routeId,
  className = '',
}: RouteCompletionCountProps) => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompletionCount = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/api/routes/${routeId}/completion-count`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch completion count');
        }

        const data = await response.json();
        setCount(data.count);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch completion count');
      } finally {
        setLoading(false);
      }
    };

    fetchCompletionCount();
  }, [routeId]);

  if (loading) {
    return (
      <div className={`text-sm text-climb-dark/60 font-bold ${className}`}>
        Chargement...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-sm text-hold-pink font-bold ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <span className="material-symbols-outlined text-hold-green text-[20px] fill-1">
          check_circle
        </span>
        <span className="text-sm font-extrabold text-climb-dark">
          {count}
        </span>
      </div>
      <span className="text-sm text-climb-dark/70 font-bold">
        {count === 0 ? 'personne n\'a reussi cette voie' : count === 1 ? 'personne a reussi cette voie' : 'personnes ont reussi cette voie'}
      </span>
    </div>
  );
};
