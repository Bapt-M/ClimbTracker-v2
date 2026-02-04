import { useState, useEffect } from 'react';
import { Route, routesAPI } from '../lib/api';
import { ImageUpload } from './ImageUpload';
import { ColorPickerOnImage } from './ColorPickerOnImage';
import { GymLayoutSelector } from './GymLayoutSelector';
import { RouteTypeSelector } from './RouteTypeSelector';
import { CustomSelect } from './CustomSelect';
import { uploadRoutePhoto } from '../lib/upload';
import { categorizeHexColor } from '../lib/utils/colorUtils';

interface EditRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: Route;
  onRouteUpdated: () => void;
}

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

const VALID_ROUTE_TYPES = [
  'reglette', 'devers', 'dalle', 'toit', 'vertical', 'arete', 'diedre',
  'technique', 'physique', 'resistance', 'bloc', 'continuous', 'dynamic',
  'static', 'coordination', 'balance',
];

const normalizeRouteTypes = (types: string[] | undefined): string[] => {
  if (!types) return [];
  return types
    .map(t => t.toLowerCase())
    .filter(t => VALID_ROUTE_TYPES.includes(t));
};

export const EditRouteModal = ({ isOpen, onClose, route, onRouteUpdated }: EditRouteModalProps) => {
  const [formData, setFormData] = useState({
    name: route.name,
    difficulty: route.difficulty,
    sector: route.sector,
    description: route.description || '',
    tips: route.tips || '',
    mainPhoto: route.mainPhoto,
    openingVideo: route.openingVideo || '',
    holdColorHex: route.holdColorHex,
    holdColorCategory: route.holdColorCategory,
    routeTypes: normalizeRouteTypes(route.routeTypes),
    openedAt: route.openedAt ? route.openedAt.split('T')[0] : new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: route.name,
        difficulty: route.difficulty,
        sector: route.sector,
        description: route.description || '',
        tips: route.tips || '',
        mainPhoto: route.mainPhoto,
        openingVideo: route.openingVideo || '',
        holdColorHex: route.holdColorHex,
        holdColorCategory: route.holdColorCategory,
        routeTypes: normalizeRouteTypes(route.routeTypes),
        openedAt: route.openedAt ? route.openedAt.split('T')[0] : new Date().toISOString().split('T')[0],
      });
      setError(null);
    }
  }, [isOpen, route]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (file: File) => {
    try {
      const url = await uploadRoutePhoto(file);
      setFormData({ ...formData, mainPhoto: url });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'upload de la photo');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await routesAPI.updateRoute(route.id, {
        ...formData,
        description: formData.description || undefined,
        tips: formData.tips || undefined,
        openingVideo: formData.openingVideo || undefined,
        routeTypes: formData.routeTypes.length > 0 ? formData.routeTypes : undefined,
        openedAt: formData.openedAt || undefined,
      });
      onRouteUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-climb-dark/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-cream rounded-3xl border-2 border-climb-dark shadow-neo-lg">
        {/* Header */}
        <div className="sticky top-0 bg-cream border-b-2 border-climb-dark/20 px-5 py-4 flex items-center justify-between rounded-t-3xl z-40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-hold-blue flex items-center justify-center border-2 border-climb-dark shadow-neo-sm">
              <span className="material-symbols-outlined text-white text-[20px]">edit</span>
            </div>
            <h2 className="text-lg font-extrabold text-climb-dark">
              Modifier la voie
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white border-2 border-climb-dark hover:bg-hold-pink hover:text-white transition-colors flex items-center justify-center"
            disabled={loading}
          >
            <span className="material-symbols-outlined text-[20px]">
              close
            </span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-hold-pink/10 border-2 border-hold-pink/30 text-hold-pink rounded-xl text-sm font-bold">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-extrabold text-climb-dark mb-2">
              Nom de la voie
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white border-2 border-climb-dark/20 rounded-xl text-climb-dark font-bold focus:outline-none focus:border-climb-dark transition-colors"
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-extrabold text-climb-dark mb-2">
              Grade de difficulte (couleur de cotation)
            </label>
            <CustomSelect
              options={DIFFICULTY_OPTIONS}
              value={formData.difficulty}
              onChange={(value) => setFormData({ ...formData, difficulty: value })}
              placeholder="Selectionner un grade"
            />
          </div>

          {/* Opening Date */}
          <div>
            <label className="block text-sm font-extrabold text-climb-dark mb-2">
              Date d'ouverture
            </label>
            <input
              type="date"
              name="openedAt"
              value={formData.openedAt}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white border-2 border-climb-dark/20 rounded-xl text-climb-dark font-bold focus:outline-none focus:border-climb-dark transition-colors"
            />
          </div>

          {/* Sector */}
          <GymLayoutSelector
            onSectorSelect={handleSectorSelect}
            selectedSector={formData.sector}
          />

          {/* Route Types */}
          <RouteTypeSelector
            selectedTypes={formData.routeTypes}
            onChange={handleRouteTypesChange}
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-extrabold text-climb-dark mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 bg-white border-2 border-climb-dark/20 rounded-xl text-climb-dark font-bold focus:outline-none focus:border-climb-dark transition-colors resize-none"
              placeholder="Description de la voie..."
            />
          </div>

          {/* Tips */}
          <div>
            <label className="block text-sm font-extrabold text-climb-dark mb-2">
              Conseils
            </label>
            <textarea
              name="tips"
              value={formData.tips}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 bg-white border-2 border-climb-dark/20 rounded-xl text-climb-dark font-bold focus:outline-none focus:border-climb-dark transition-colors resize-none"
              placeholder="Conseils pour reussir cette voie..."
            />
          </div>

          {/* Opening Video */}
          <div>
            <label className="block text-sm font-extrabold text-climb-dark mb-2">
              Video d'ouverture (URL)
            </label>
            <input
              type="url"
              name="openingVideo"
              value={formData.openingVideo}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white border-2 border-climb-dark/20 rounded-xl text-climb-dark font-bold focus:outline-none focus:border-climb-dark transition-colors"
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          {/* Photo Upload */}
          <ImageUpload
            onUpload={handlePhotoUpload}
            currentImage={formData.mainPhoto}
            label="Photo principale de la voie"
            maxSize={10}
          />

          {/* Color Picker */}
          {formData.mainPhoto && (
            <ColorPickerOnImage
              imageUrl={formData.mainPhoto}
              onColorSelect={handleColorSelect}
              selectedColor={formData.holdColorHex}
              colorCategory={formData.holdColorCategory}
            />
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-white text-climb-dark rounded-xl font-extrabold border-2 border-climb-dark hover:bg-cream transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-hold-green text-white rounded-xl font-extrabold border-2 border-climb-dark shadow-neo-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
