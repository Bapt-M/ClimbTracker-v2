import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routesAPI } from '../lib/api';
import { signOut } from '../lib/auth-client';
import { ImageUpload } from '../components/ImageUpload';
import { ColorPickerOnImage } from '../components/ColorPickerOnImage';
import { RouteTypeSelector } from '../components/RouteTypeSelector';
import { GymLayoutSelector } from '../components/GymLayoutSelector';
import { CustomSelect } from '../components/CustomSelect';
import { uploadRoutePhoto } from '../lib/upload';
import { categorizeHexColor } from '../lib/utils/colorUtils';

const DIFFICULTY_OPTIONS = [
  { value: 'Vert', label: 'Vert', color: '#22c55e' },
  { value: 'Vert clair', label: 'Vert clair', color: '#86efac' },
  { value: 'Bleu clair', label: 'Bleu clair', color: '#7dd3fc' },
  { value: 'Bleu fonce', label: 'Bleu fonce', color: '#3b82f6' },
  { value: 'Violet', label: 'Violet', color: '#a855f7' },
  { value: 'Rose', label: 'Rose', color: '#ec4899' },
  { value: 'Rouge', label: 'Rouge', color: '#ef4444' },
  { value: 'Orange', label: 'Orange', color: '#f97316' },
  { value: 'Jaune', label: 'Jaune', color: '#eab308' },
  { value: 'Blanc', label: 'Blanc', color: '#f5f5f5' },
  { value: 'Gris', label: 'Gris', color: '#6b7280' },
  { value: 'Noir', label: 'Noir', color: '#1f2937' },
];

export default function CreateRoute() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    difficulty: 'Bleu clair',
    holdColorHex: '',
    holdColorCategory: '',
    sector: '',
    description: '',
    tips: '',
    mainPhoto: '',
    openingVideo: '',
    routeTypes: [],
    openedAt: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.mainPhoto) {
      setError('Le nom et la photo principale sont obligatoires');
      return;
    }

    if (!formData.holdColorHex) {
      setError('Veuillez selectionner la couleur des prises sur la photo');
      return;
    }

    if (!formData.holdColorCategory) {
      setError('Erreur de categorisation de la couleur');
      return;
    }

    if (!formData.sector) {
      setError('Veuillez selectionner le secteur sur le plan');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const route = await routesAPI.createRoute({
        ...formData,
        description: formData.description || undefined,
        tips: formData.tips || undefined,
        openingVideo: formData.openingVideo || undefined,
        routeTypes: formData.routeTypes.length > 0 ? formData.routeTypes : undefined,
        openedAt: formData.openedAt || undefined,
      });

      navigate(`/routes/${route.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create route');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      const url = await uploadRoutePhoto(file);
      setFormData({ ...formData, mainPhoto: url });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    }
  };

  const handleColorSelect = (hexColor: string) => {
    const category = categorizeHexColor(hexColor);
    setFormData({
      ...formData,
      holdColorHex: hexColor,
      holdColorCategory: category,
    });
  };

  const handleSectorSelect = (sector: string) => {
    setFormData({ ...formData, sector });
  };

  const handleRouteTypesChange = (types: string[]) => {
    setFormData({ ...formData, routeTypes: types });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen flex flex-col w-full max-w-md mx-auto overflow-hidden bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b-2 border-climb-dark/10">
        <div className="flex items-center justify-between px-5 pt-12 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-white border-2 border-climb-dark flex items-center justify-center hover:bg-cream transition-colors"
            >
              <span className="material-symbols-outlined text-climb-dark text-[20px]">
                arrow_back
              </span>
            </button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-climb-dark">
                Creer une voie
              </h1>
              <p className="text-[10px] font-bold text-climb-dark/50 uppercase tracking-wider">
                ClimbTracker
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-xl bg-hold-pink text-white border-2 border-climb-dark flex items-center justify-center hover:scale-105 transition-transform"
          >
            <span className="material-symbols-outlined text-[20px]">
              logout
            </span>
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-5 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-hold-pink/10 border-2 border-hold-pink/30 rounded-2xl text-hold-pink text-sm font-bold">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="rounded-2xl bg-white p-5 border-2 border-climb-dark shadow-neo">
            <label className="block text-sm font-extrabold text-climb-dark mb-2">
              Nom de la voie *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-climb-dark/20 bg-cream text-climb-dark font-bold placeholder:text-climb-dark/40 focus:outline-none focus:border-climb-dark transition-colors"
              placeholder="Ex: La Dalle du Debutant"
            />
          </div>

          {/* Difficulty */}
          <div className="rounded-2xl bg-white p-5 border-2 border-climb-dark shadow-neo">
            <label className="block text-sm font-extrabold text-climb-dark mb-2">
              Grade de difficulte (couleur de cotation) *
            </label>
            <p className="text-xs text-climb-dark/60 font-bold mb-3">
              Couleur attribuee par l'ouvreur pour indiquer le niveau
            </p>
            <CustomSelect
              options={DIFFICULTY_OPTIONS}
              value={formData.difficulty}
              onChange={(value) => setFormData({ ...formData, difficulty: value })}
              placeholder="Selectionner un grade"
            />
          </div>

          {/* Opening Date */}
          <div className="rounded-2xl bg-white p-5 border-2 border-climb-dark shadow-neo">
            <label className="block text-sm font-extrabold text-climb-dark mb-2">
              Date d'ouverture *
            </label>
            <p className="text-xs text-climb-dark/60 font-bold mb-2">
              Date a laquelle la voie a ete ouverte
            </p>
            <input
              type="date"
              name="openedAt"
              value={formData.openedAt}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-climb-dark/20 bg-cream text-climb-dark font-bold focus:outline-none focus:border-climb-dark transition-colors"
            />
          </div>

          {/* Description */}
          <div className="rounded-2xl bg-white p-5 border-2 border-climb-dark shadow-neo">
            <label className="block text-sm font-extrabold text-climb-dark mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border-2 border-climb-dark/20 bg-cream text-climb-dark font-bold placeholder:text-climb-dark/40 resize-none focus:outline-none focus:border-climb-dark transition-colors"
              placeholder="Decrivez la voie, les types de mouvements, la difficulte..."
            ></textarea>
          </div>

          {/* Tips */}
          <div className="rounded-2xl bg-white p-5 border-2 border-climb-dark shadow-neo">
            <label className="block text-sm font-extrabold text-climb-dark mb-2">
              Conseils
            </label>
            <textarea
              name="tips"
              value={formData.tips}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-climb-dark/20 bg-cream text-climb-dark font-bold placeholder:text-climb-dark/40 resize-none focus:outline-none focus:border-climb-dark transition-colors"
              placeholder="Conseils pour reussir la voie..."
            ></textarea>
          </div>

          {/* Photo Upload */}
          <div className="rounded-2xl bg-white p-5 border-2 border-climb-dark shadow-neo">
            <ImageUpload
              onUpload={handlePhotoUpload}
              currentImage={formData.mainPhoto}
              label="Photo principale de la voie *"
              maxSize={10}
            />
          </div>

          {/* Color Picker - Only shown after photo is uploaded */}
          {formData.mainPhoto && (
            <div className="rounded-2xl bg-white p-5 border-2 border-climb-dark shadow-neo">
              <ColorPickerOnImage
                imageUrl={formData.mainPhoto}
                onColorSelect={handleColorSelect}
                selectedColor={formData.holdColorHex}
                colorCategory={formData.holdColorCategory}
              />
            </div>
          )}

          {/* Gym Layout Selector */}
          <div className="rounded-2xl bg-white p-5 border-2 border-climb-dark shadow-neo">
            <GymLayoutSelector
              onSectorSelect={handleSectorSelect}
              selectedSector={formData.sector}
            />
          </div>

          {/* Route Types */}
          <div className="rounded-2xl bg-white p-5 border-2 border-climb-dark shadow-neo">
            <RouteTypeSelector
              selectedTypes={formData.routeTypes}
              onChange={handleRouteTypesChange}
            />
          </div>

          {/* Video URL */}
          <div className="rounded-2xl bg-white p-5 border-2 border-climb-dark shadow-neo">
            <label className="block text-sm font-extrabold text-climb-dark mb-2">
              Video d'ouverture (URL YouTube, optionnel)
            </label>
            <input
              type="url"
              name="openingVideo"
              value={formData.openingVideo}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border-2 border-climb-dark/20 bg-cream text-climb-dark font-bold placeholder:text-climb-dark/40 focus:outline-none focus:border-climb-dark transition-colors"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="flex-1 bg-white text-climb-dark font-extrabold py-4 px-6 rounded-xl border-2 border-climb-dark hover:bg-cream transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-hold-green text-white font-extrabold py-4 px-6 rounded-xl border-2 border-climb-dark shadow-neo hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creation...' : 'Creer la voie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
