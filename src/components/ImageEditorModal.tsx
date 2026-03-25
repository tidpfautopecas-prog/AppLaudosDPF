// src/components/ImageEditorModal.tsx
import { useState, useRef } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageEditorModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onSave: (croppedImageUrl: string) => void;
}

// ✅ CORREÇÃO: Removido o parâmetro não utilizado 'fileName'
function getCroppedImg(image: HTMLImageElement, crop: Crop): Promise<string> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return Promise.reject('Não foi possível obter o contexto do canvas.');
  }

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = crop.width * pixelRatio;
  canvas.height = crop.height * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve) => {
    resolve(canvas.toDataURL('image/jpeg', 0.9));
  });
}

export default function ImageEditorModal({ isOpen, imageSrc, onClose, onSave }: ImageEditorModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 16 / 9, width, height),
      width,
      height
    );
    setCrop(initialCrop);
  }

  const handleSaveCrop = async () => {
    if (completedCrop && imgRef.current) {
      // ✅ CORREÇÃO: Chamada da função atualizada sem o 'fileName'
      const croppedImageUrl = await getCroppedImg(imgRef.current, completedCrop);
      onSave(croppedImageUrl);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-fade-in">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] border border-orange-500/20 flex flex-col">
        <div className="p-4 border-b border-orange-500/20 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Cortar Imagem</h3>
        </div>
        <div className="flex-1 p-4 bg-black flex items-center justify-center overflow-hidden">
          <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
            <img ref={imgRef} src={imageSrc} onLoad={onImageLoad} style={{ maxHeight: '70vh' }} />
          </ReactCrop>
        </div>
        <div className="p-4 border-t border-orange-500/20 flex space-x-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSaveCrop} className="btn-primary flex-1">Salvar Corte</button>
        </div>
      </div>
    </div>
  );
}