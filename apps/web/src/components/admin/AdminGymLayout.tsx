import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface GymLayout {
  id: string;
  name: string;
  svgContent: string;
  sectorMappings: Record<string, { label: string; pathId: string }> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const AdminGymLayout = () => {
  const [layouts, setLayouts] = useState<GymLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLayout, setEditingLayout] = useState<GymLayout | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    svgContent: '',
    isActive: false,
  });
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLayouts();
  }, []);

  const loadLayouts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/gym-layout`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setLayouts(data.data?.layouts || []);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingLayout(null);
    setFormData({ name: '', svgContent: '', isActive: false });
  };

  const handleEdit = (layout: GymLayout) => {
    setEditingLayout(layout);
    setIsCreating(false);
    setFormData({
      name: layout.name,
      svgContent: layout.svgContent,
      isActive: layout.isActive,
    });
  };

  const handleCancel = () => {
    setEditingLayout(null);
    setIsCreating(false);
    setFormData({ name: '', svgContent: '', isActive: false });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.svgContent) {
      setError('Nom et contenu SVG requis');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingLayout
        ? `${API_URL}/api/gym-layout/${editingLayout.id}`
        : `${API_URL}/api/gym-layout`;

      const response = await fetch(url, {
        method: editingLayout ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde');
      }

      await loadLayouts();
      handleCancel();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce plan ?')) return;

    try {
      const response = await fetch(`${API_URL}/api/gym-layout/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      await loadLayouts();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/gym-layout/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'activation');
      }

      await loadLayouts();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'activation');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFormData((prev) => ({ ...prev, svgContent: content }));
    };
    reader.readAsText(file);
  };

  // Update preview when SVG content changes
  useEffect(() => {
    if (previewRef.current && formData.svgContent) {
      previewRef.current.innerHTML = formData.svgContent;
      const svg = previewRef.current.querySelector('svg');
      if (svg) {
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }
    }
  }, [formData.svgContent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hold-orange"></div>
      </div>
    );
  }

  // Form view
  if (isCreating || editingLayout) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-climb-dark">
            {editingLayout ? 'Modifier le plan' : 'Nouveau plan'}
          </h2>
          <button
            onClick={handleCancel}
            className="text-climb-dark/60 hover:text-climb-dark font-bold text-sm"
          >
            Annuler
          </button>
        </div>

        {error && (
          <div className="bg-hold-pink/10 border-2 border-hold-pink/30 text-hold-pink px-4 py-3 rounded-xl text-sm font-bold">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-extrabold text-climb-dark/60 uppercase tracking-wider mb-2">
              Nom du plan
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="input-neo"
              placeholder="Ex: Plan principal"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-climb-dark/60 uppercase tracking-wider mb-2">
              Fichier SVG
            </label>
            <input
              type="file"
              accept=".svg"
              onChange={handleFileUpload}
              className="block w-full text-sm text-climb-dark/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-2 file:border-climb-dark file:text-sm file:font-bold file:bg-cream file:text-climb-dark hover:file:bg-hold-orange hover:file:text-white file:transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-climb-dark/60 uppercase tracking-wider mb-2">
              Ou coller le code SVG
            </label>
            <textarea
              value={formData.svgContent}
              onChange={(e) => setFormData((prev) => ({ ...prev, svgContent: e.target.value }))}
              className="input-neo min-h-[150px] font-mono text-xs"
              placeholder="<svg>...</svg>"
            />
          </div>

          {formData.svgContent && (
            <div>
              <label className="block text-[11px] font-extrabold text-climb-dark/60 uppercase tracking-wider mb-2">
                Apercu
              </label>
              <div
                ref={previewRef}
                className="bg-white rounded-xl border-2 border-climb-dark/20 p-4 h-48 overflow-hidden"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="w-5 h-5 rounded border-2 border-climb-dark"
            />
            <label htmlFor="isActive" className="text-sm font-bold text-climb-dark">
              Definir comme plan actif
            </label>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full btn-neo-primary py-3 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-climb-dark">Plans de salle</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-hold-orange text-white rounded-xl font-bold text-sm border-2 border-climb-dark shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Ajouter
        </button>
      </div>

      {error && (
        <div className="bg-hold-pink/10 border-2 border-hold-pink/30 text-hold-pink px-4 py-3 rounded-xl text-sm font-bold">
          {error}
        </div>
      )}

      {layouts.length === 0 ? (
        <div className="neo-card p-8 text-center">
          <span className="material-symbols-outlined text-[48px] text-climb-dark/20 mb-4">map</span>
          <p className="text-climb-dark/60 font-bold">Aucun plan de salle</p>
          <p className="text-sm text-climb-dark/40 mt-1">Ajoutez un fichier SVG pour commencer</p>
        </div>
      ) : (
        <div className="space-y-3">
          {layouts.map((layout) => (
            <div
              key={layout.id}
              className={`neo-card p-4 ${layout.isActive ? 'ring-2 ring-hold-green' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-climb-dark">{layout.name}</h3>
                    {layout.isActive && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-hold-green text-white">
                        ACTIF
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-climb-dark/50 mt-1">
                    Modifie le {new Date(layout.updatedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!layout.isActive && (
                    <button
                      onClick={() => handleSetActive(layout.id)}
                      className="p-2 text-hold-green hover:bg-hold-green/10 rounded-lg transition-colors"
                      title="Definir comme actif"
                    >
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(layout)}
                    className="p-2 text-hold-blue hover:bg-hold-blue/10 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(layout.id)}
                    className="p-2 text-hold-pink hover:bg-hold-pink/10 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
