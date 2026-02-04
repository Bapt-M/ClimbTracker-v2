import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface KiviatChartProps {
  userId: string;
  className?: string;
}

interface KiviatDataPoint {
  routeType: string;
  successRate: number;
  averageGrade: number;
  totalAttempts: number;
  completedCount: number;
}

export const KiviatChart = ({ userId, className = '' }: KiviatChartProps) => {
  const [data, setData] = useState<KiviatDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKiviatData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/api/users/${userId}/kiviat-data`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch performance data');
        }

        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch performance data');
      } finally {
        setLoading(false);
      }
    };

    fetchKiviatData();
  }, [userId]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-climb-dark/60 font-bold">
          Chargement des performances...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-hold-pink/10 text-hold-pink rounded-xl font-bold ${className}`}>
        {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`p-8 text-center text-climb-dark/60 font-bold ${className}`}>
        Aucune donnee de performance disponible. Validez des voies pour voir vos statistiques !
      </div>
    );
  }

  return (
    <div className={`kiviat-chart ${className}`}>
      <h3 className="text-lg font-extrabold text-climb-dark mb-4">
        Performance par type de voie
      </h3>

      {/* Simple bar chart representation */}
      <div className="space-y-3">
        {data.map((point) => (
          <div key={point.routeType} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-climb-dark">{point.routeType}</span>
              <span className="text-climb-dark/60 font-bold">{point.successRate.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-climb-dark/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-hold-blue rounded-full transition-all duration-500"
                style={{ width: `${point.successRate}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Details table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-climb-dark/20">
              <th className="text-left py-2 px-3 font-extrabold text-climb-dark">
                Type
              </th>
              <th className="text-center py-2 px-3 font-extrabold text-climb-dark">
                Tentatives
              </th>
              <th className="text-center py-2 px-3 font-extrabold text-climb-dark">
                Reussites
              </th>
              <th className="text-center py-2 px-3 font-extrabold text-climb-dark">
                Taux
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((point, index) => (
              <tr
                key={index}
                className="border-b border-climb-dark/10 hover:bg-cream"
              >
                <td className="py-2 px-3 text-climb-dark font-bold">
                  {point.routeType}
                </td>
                <td className="py-2 px-3 text-center text-climb-dark/70 font-bold">
                  {point.totalAttempts}
                </td>
                <td className="py-2 px-3 text-center text-climb-dark/70 font-bold">
                  {point.completedCount}
                </td>
                <td className="py-2 px-3 text-center text-climb-dark/70 font-bold">
                  {point.successRate.toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
