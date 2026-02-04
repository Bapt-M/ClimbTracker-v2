import { useState, useEffect } from 'react';
import { commentsAPI, Comment } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

interface CommentListProps {
  routeId: string;
  refreshTrigger?: number;
}

export const CommentList = ({ routeId, refreshTrigger = 0 }: CommentListProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [routeId, refreshTrigger]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await commentsAPI.getRouteComments(routeId);
      setComments(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Etes-vous sur de vouloir supprimer ce commentaire ?')) return;

    try {
      setDeletingId(commentId);
      await commentsAPI.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "A l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-climb-dark border-r-transparent"></div>
        <p className="mt-2 text-sm text-climb-dark/50">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white border-2 border-climb-dark/20 rounded-xl text-climb-dark text-sm">
        {error}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="material-symbols-outlined text-4xl text-climb-dark/40">
          forum
        </span>
        <p className="mt-2 text-sm text-climb-dark/50">
          Aucun commentaire pour le moment
        </p>
        <p className="text-xs text-climb-dark/40 mt-1">
          Soyez le premier a partager vos conseils !
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => {
        const canDelete = user && (user.id === comment.userId || user.role === 'ADMIN');

        return (
          <div
            key={comment.id}
            className="flex items-start gap-3 p-4 bg-white border-2 border-climb-dark/20 rounded-xl"
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-hold-blue flex items-center justify-center border-2 border-climb-dark">
                <span className="text-white font-bold text-sm">
                  {comment.user?.name.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-climb-dark">
                    {comment.user?.name || 'Unknown'}
                  </span>
                  <span className="text-xs text-climb-dark/50 font-bold">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>

                {canDelete && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="text-climb-dark/50 hover:text-hold-pink transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>

              {/* Comment text */}
              <p className="text-sm text-climb-dark/70 whitespace-pre-wrap break-words leading-relaxed font-medium">
                {comment.content}
              </p>

              {/* Media if present */}
              {comment.mediaUrl && comment.mediaType === 'IMAGE' && (
                <div className="mt-3">
                  <img
                    src={comment.mediaUrl}
                    alt="Comment media"
                    className="max-w-full h-auto rounded-xl max-h-64 object-cover border-2 border-climb-dark/20"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
