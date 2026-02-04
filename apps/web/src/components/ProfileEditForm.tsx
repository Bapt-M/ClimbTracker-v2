import { useState } from 'react';
import { usersAPI } from '../lib/api';
import { ImageUpload } from './ImageUpload';
import { uploadProfilePhoto } from '../lib/upload';

interface ProfileEditFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    firstName?: string;
    lastName?: string;
    age?: number;
    height?: number;
    wingspan?: number;
    bio?: string;
    profilePhoto?: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export const ProfileEditForm = ({
  user,
  onSuccess,
  onCancel,
}: ProfileEditFormProps) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    age: user.age || undefined,
    height: user.height || undefined,
    wingspan: user.wingspan || undefined,
    bio: user.bio || '',
    profilePhoto: user.profilePhoto || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProfilePhotoUpload = async (file: File) => {
    try {
      const url = await uploadProfilePhoto(file);
      setFormData({ ...formData, profilePhoto: url });
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile photo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await usersAPI.updateUser(user.id, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="profile-edit-form space-y-6">
      <h2 className="text-2xl font-extrabold text-climb-dark mb-6">
        Modifier le profil
      </h2>

      {error && (
        <div className="p-4 bg-hold-pink/10 border-2 border-hold-pink/30 text-hold-pink rounded-xl text-sm font-bold">
          {error}
        </div>
      )}

      {/* Profile Photo */}
      <ImageUpload
        onUpload={handleProfilePhotoUpload}
        currentImage={formData.profilePhoto}
        label="Photo de profil"
        maxSize={5}
      />

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-extrabold text-climb-dark mb-2">
            Nom d'affichage *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-4 py-2 border-2 border-climb-dark/20 rounded-xl bg-white text-climb-dark font-bold focus:outline-none focus:border-climb-dark"
          />
        </div>

        <div>
          <label className="block text-sm font-extrabold text-climb-dark mb-2">
            Email (lecture seule)
          </label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full px-4 py-2 border-2 border-climb-dark/20 rounded-xl bg-cream text-climb-dark/60 font-bold"
          />
        </div>

        <div>
          <label className="block text-sm font-extrabold text-climb-dark mb-2">
            Prenom
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) =>
              setFormData({ ...formData, firstName: e.target.value })
            }
            className="w-full px-4 py-2 border-2 border-climb-dark/20 rounded-xl bg-white text-climb-dark font-bold focus:outline-none focus:border-climb-dark"
          />
        </div>

        <div>
          <label className="block text-sm font-extrabold text-climb-dark mb-2">
            Nom
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) =>
              setFormData({ ...formData, lastName: e.target.value })
            }
            className="w-full px-4 py-2 border-2 border-climb-dark/20 rounded-xl bg-white text-climb-dark font-bold focus:outline-none focus:border-climb-dark"
          />
        </div>
      </div>

      {/* Physical Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-extrabold text-climb-dark mb-2">
            Age
          </label>
          <input
            type="number"
            min="1"
            max="120"
            value={formData.age || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                age: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            className="w-full px-4 py-2 border-2 border-climb-dark/20 rounded-xl bg-white text-climb-dark font-bold focus:outline-none focus:border-climb-dark"
          />
        </div>

        <div>
          <label className="block text-sm font-extrabold text-climb-dark mb-2">
            Taille (cm)
          </label>
          <input
            type="number"
            min="1"
            max="300"
            value={formData.height || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                height: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            className="w-full px-4 py-2 border-2 border-climb-dark/20 rounded-xl bg-white text-climb-dark font-bold focus:outline-none focus:border-climb-dark"
          />
        </div>

        <div>
          <label className="block text-sm font-extrabold text-climb-dark mb-2">
            Envergure (cm)
          </label>
          <input
            type="number"
            min="1"
            max="300"
            value={formData.wingspan || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                wingspan: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            className="w-full px-4 py-2 border-2 border-climb-dark/20 rounded-xl bg-white text-climb-dark font-bold focus:outline-none focus:border-climb-dark"
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-extrabold text-climb-dark mb-2">
          Bio
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 border-2 border-climb-dark/20 rounded-xl bg-white text-climb-dark font-bold focus:outline-none focus:border-climb-dark resize-none"
          placeholder="Parlez de vous..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-hold-green text-white rounded-xl font-extrabold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-climb-dark shadow-neo-sm"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-white text-climb-dark rounded-xl font-extrabold hover:bg-cream transition-all border-2 border-climb-dark"
        >
          Annuler
        </button>
      </div>
    </form>
  );
};
