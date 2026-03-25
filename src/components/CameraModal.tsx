// src/components/CameraModal.tsx

import { useState, useRef, useEffect } from 'react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Inicia a câmera quando o modal abre
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    // Garante que a câmera seja desligada quando o componente for desmontado
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setError(null);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } // Prioriza a câmera traseira
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Erro ao acessar a câmera:", err);
        let errorMessage = "Não foi possível acessar a câmera. Verifique as permissões do navegador.";
        if ((err as Error).name === "NotAllowedError") {
          errorMessage = "A permissão para acessar a câmera foi negada. Por favor, habilite o acesso nas configurações do seu navegador.";
        }
        setError(errorMessage);
      }
    } else {
      setError("Seu navegador não suporta acesso à câmera. Tente usar a opção 'Adicionar Fotos' da galeria.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Define as dimensões do canvas para serem as mesmas do vídeo
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Desenha o frame atual do vídeo no canvas
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        // Converte o canvas para uma imagem no formato JPEG com 90% de qualidade
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(imageDataUrl);
        onClose(); // Fecha o modal após a captura
      }
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg h-full max-h-[80vh] border border-orange-500/20 flex flex-col relative animate-scale-in">
        <div className="p-4 border-b border-orange-500/20 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Câmera</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <i className="ri-close-line text-2xl"></i>
            </button>
        </div>
        <div className="flex-1 bg-black flex items-center justify-center overflow-hidden rounded-b-lg">
            {error ? (
                <div className="text-center text-red-400 p-4">
                    <i className="ri-error-warning-line text-4xl mb-2"></i>
                    <p>{error}</p>
                </div>
            ) : (
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain"></video>
            )}
        </div>
        {!error && (
            <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center bg-gradient-to-t from-black/50 to-transparent">
                <button onClick={handleCapture} className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-slate-500 hover:border-orange-500 transition-colors" title="Capturar Foto">
                    <div className="w-12 h-12 bg-white rounded-full"></div>
                </button>
            </div>
        )}
        <canvas ref={canvasRef} className="hidden"></canvas>
      </div>
    </div>
  );
}