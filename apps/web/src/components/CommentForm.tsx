import { useState } from 'react';
import { commentsAPI } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

interface CommentFormProps {
  routeId: string;
  onCommentCreated: () => void;
}

export const CommentForm = ({ routeId, onCommentCreated }: CommentFormProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Le commentaire ne peut pas etre vide');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await commentsAPI.createComment(routeId, content.trim());
      setContent('');
      onCommentCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create comment');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-4 bg-white border-2 border-climb-dark/20 rounded-xl text-center">
        <p className="text-sm text-climb-dark/50 font-bold">
          Connectez-vous pour laisser un commentaire
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="p-3 bg-hold-pink/10 border-2 border-hold-pink/30 rounded-xl text-hold-pink text-sm font-bold">
          {error}
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-hold-blue flex items-center justify-center border-2 border-climb-dark">
            <span className="text-white font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Partagez vos conseils, votre experience..."
            rows={3}
            maxLength={2000}
            className="w-full px-4 py-3 rounded-xl border-2 border-climb-dark/20 bg-white text-climb-dark placeholder:text-climb-dark/40 resize-none focus:outline-none focus:border-climb-dark transition-colors font-medium"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-climb-dark/50 font-bold">
              {content.length} / 2000
            </span>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="px-4 py-2 bg-climb-dark text-white rounded-xl font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm active:scale-95 border-2 border-climb-dark"
            >
              {loading ? 'Envoi...' : 'Publier'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
