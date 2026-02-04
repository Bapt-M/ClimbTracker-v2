import { useState, useRef } from 'react';

interface ImageUploadProps {
  onUpload: (file: File) => Promise<void>;
  currentImage?: string;
  label?: string;
  maxSize?: number;
  className?: string;
}

export const ImageUpload = ({
  onUpload,
  currentImage,
  label = 'Upload Image',
  maxSize = 5,
  className = '',
}: ImageUploadProps) => {
  const [preview, setPreview] = useState<string | undefined>(currentImage);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize * 1024 * 1024) {
      setError(`La taille doit etre inferieure a ${maxSize}MB`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Le fichier doit etre une image');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      await onUpload(file);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'upload');
      setPreview(currentImage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`image-upload ${className}`}>
      <label className="block text-sm font-extrabold text-climb-dark mb-2">
        {label}
      </label>

      {preview && (
        <div className="mb-4">
          <img
            src={preview}
            alt="Preview"
            className="w-32 h-32 object-cover rounded-xl border-2 border-climb-dark"
          />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-4 py-2 bg-climb-dark text-white rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-climb-dark"
      >
        {uploading ? 'Upload en cours...' : 'Choisir un fichier'}
      </button>

      {error && (
        <p className="text-hold-pink text-sm mt-2 font-bold">{error}</p>
      )}
    </div>
  );
};
