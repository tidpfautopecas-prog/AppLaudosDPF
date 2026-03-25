// src/pages/laudos/components/ItemFormFields.tsx

import { useState, useEffect } from 'react';
import CameraModal from '../../../components/CameraModal';
import imageCompression from 'browser-image-compression';
import ImageEditorModal from '../../../components/ImageEditorModal';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { supabase } from '../../../utils/supabaseClient'; // ✅ IMPORTADO

interface ItemFormFieldsProps {
  formData: {
    numeroTicket: string;
    numeroItem: string;
    quantidade: number;
    motivo: string[]; // <-- ALTERADO
    origemDefeito: string;
    anotacoes: string;
    fotos: string[]; // ✅ Isto agora é string[] de "paths", não base64
    nomeCliente: string;
    disposicao: string;
    disposicaoPecas: string;
  };
  onFormDataChange: (data: any) => void;
  defeitosOptions: Array<{ codigo: string; descricao: string }>;
  origemDefeitoOptions: Array<{ value: string; label: string }>;
  disposicaoOptions: Array<{ value: string; label: string }>;
  disposicaoPecasOptions: Array<{ value: string; label: string }>;
  isPendingTicket?: boolean;
}

const MAX_PHOTOS = 10;
const STORAGE_BUCKET = 'fotos-laudos'; // ✅ Nome do seu Bucket

// ✅ Otimiza e retorna um ARQUIVO (File), não mais base64
async function handleImageOptimization(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
  };
  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error("Erro na otimização da imagem:", error);
    return file; // Retorna o arquivo original se a compressão falhar
  }
}

// ✅ Função para gerar URLs públicas a partir dos paths
function getPublicUrl(path: string): string {
    const { data } = supabase
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);
    return data.publicUrl;
}

export default function ItemFormFields({
  formData,
  onFormDataChange,
  defeitosOptions,
  origemDefeitoOptions,
  disposicaoOptions,
  disposicaoPecasOptions,
  isPendingTicket,
}: ItemFormFieldsProps) {
  const [motivoSearch, setMotivoSearch] = useState('');
  const [showMotivoDropdown, setShowMotivoDropdown] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<{ src: string, index: number } | null>(null);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  // ✅ Estado para as URLs de prévia
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // ✅ Atualiza as URLs de prévia quando formData.fotos (paths) mudar
  useEffect(() => {
    if (formData.fotos.length > 0) {
        const urls = formData.fotos.map(path => getPublicUrl(path));
        setPreviewUrls(urls);
    } else {
        setPreviewUrls([]);
    }
  }, [formData.fotos]);


  // ✅ Atualizado para fazer UPLOAD e salvar o PATH
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingImages(true);

    const filesToProcess = Array.from(files).slice(0, MAX_PHOTOS - formData.fotos.length);

    // --- INÍCIO DA OTIMIZAÇÃO: Upload em Paralelo ---

    // 1. Cria um array de "promessas" de processamento e upload
    const uploadPromises = filesToProcess.map(async (file) => {
      try {
        const optimizedFile = await handleImageOptimization(file);
        const filePath = `public/laudo-${Date.now()}-${optimizedFile.name}`;
        
        const { error } = await supabase
          .storage
          .from(STORAGE_BUCKET)
          .upload(filePath, optimizedFile);

        if (error) {
          console.error("Erro no upload (galeria):", error);
          return null; // Retorna nulo em caso de erro
        }
        
        return filePath; // Retorna o caminho em caso de sucesso
      } catch (err) {
        console.error("Erro ao processar imagem:", err);
        return null;
      }
    });

    // 2. Aguarda que todos os uploads terminem
    const results = await Promise.all(uploadPromises);

    // 3. Filtra apenas os uploads bem-sucedidos (que não são nulos)
    const newPhotoPaths = results.filter((path): path is string => path !== null);

    // --- FIM DA OTIMIZAÇÃO ---

    if (newPhotoPaths.length > 0) {
      onFormDataChange((prevData: any) => ({
        ...prevData,
        fotos: [...prevData.fotos, ...newPhotoPaths]
      }));
    }

    e.target.value = '';
    setIsProcessingImages(false);
  };

  // ✅ Atualizado para fazer UPLOAD e salvar o PATH
  const handleCaptureFromCamera = async (imageDataUrl: string) => {
    setIsProcessingImages(true);
    if (formData.fotos.length < MAX_PHOTOS) {
      const file = await imageCompression.getFilefromDataUrl(imageDataUrl, 'camera-photo.jpg');
      const optimizedFile = await handleImageOptimization(file);
      const filePath = `public/laudo-${Date.now()}-camera.jpg`;

      const { error } = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .upload(filePath, optimizedFile);

      if (error) {
        console.error("Erro no upload (câmera):", error);
      } else {
        onFormDataChange((prevData: any) => ({
          ...prevData,
          fotos: [...prevData.fotos, filePath],
        }));
      }
    }
    setIsCameraOpen(false);
    setIsProcessingImages(false);
  };

  // ✅ 'src' agora é uma public URL
  const openImageEditor = (src: string, index: number) => {
    setEditingImage({ src, index });
    setIsEditorOpen(true);
  };
  
  // ✅ Atualizado para fazer UPLOAD da imagem editada
  const handleSaveEditedImage = async (croppedImageUrl: string) => {
    if (editingImage !== null) {
        setIsProcessingImages(true);
        // 1. Converte o novo base64 para File
        const file = await imageCompression.getFilefromDataUrl(croppedImageUrl, 'edited-photo.jpg');
        
        // 2. Faz upload do novo arquivo
        const newFilePath = `public/laudo-${Date.now()}-edited.jpg`;
        const { error: uploadError } = await supabase
            .storage
            .from(STORAGE_BUCKET)
            .upload(newFilePath, file);

        if (uploadError) {
            console.error("Erro no upload (editado):", uploadError);
            setIsProcessingImages(false);
            return;
        }

        // 3. Pega o path antigo para deletar
        const oldPath = formData.fotos[editingImage.index];

        // 4. Atualiza o state com o novo path
        const updatedFotos = [...formData.fotos];
        updatedFotos[editingImage.index] = newFilePath;
        onFormDataChange({ ...formData, fotos: updatedFotos });

        // 5. Deleta o arquivo antigo do storage
        await supabase.storage.from(STORAGE_BUCKET).remove([oldPath]);
        
        setIsProcessingImages(false);
    }
    setIsEditorOpen(false);
    setEditingImage(null);
  };

  // <-- INÍCIO: Lógica de filtro e seleção atualizada -->
  const filteredDefeitos = defeitosOptions.filter(defeito => {
    const motivoString = `${defeito.codigo} - ${defeito.descricao}`;
    const isNotSelected = !formData.motivo.includes(motivoString);
    const matchesSearch = defeito.codigo.includes(motivoSearch) ||
    defeito.descricao.toLowerCase().includes(motivoSearch.toLowerCase())
    return isNotSelected && matchesSearch;
  });

  const handleMotivoSelect = (defeito: typeof defeitosOptions[0]) => {
    const newMotivo = `${defeito.codigo} - ${defeito.descricao}`;
    if (!formData.motivo.includes(newMotivo)) {
      onFormDataChange({ ...formData, motivo: [...formData.motivo, newMotivo] });
    }
    setMotivoSearch('');
    setShowMotivoDropdown(false);
  };

  const handleMotivoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMotivoSearch(e.target.value);
    // Não atualiza mais o formData.motivo diretamente
    setShowMotivoDropdown(true);
  };
  // <-- FIM: Lógica de filtro e seleção atualizada -->

  // ✅ Atualizado para DELETAR o arquivo do Storage
  const handleRemoveFoto = async (index: number) => {
    setIsProcessingImages(true);
    
    // 1. Pega o path para deletar
    const pathToRemove = formData.fotos[index];
    
    // 2. Deleta do Supabase Storage
    const { error } = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .remove([pathToRemove]);

    if (error) {
        console.error("Erro ao deletar arquivo:", error);
        // Mesmo se falhar, remove da lista para o usuário
    }

    // 3. Remove do state
    onFormDataChange({
      ...formData,
      fotos: formData.fotos.filter((_, i) => i !== index)
    });
    
    setIsProcessingImages(false);
  };

  // <-- INÍCIO: Nova função para remover motivo -->
  const handleRemoveMotivo = (indexToRemove: number) => {
    onFormDataChange({
      ...formData,
      motivo: formData.motivo.filter((_, index) => index !== indexToRemove)
    });
  };
  // <-- FIM: Nova função para remover motivo -->

  const handleTicketNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormDataChange({ ...formData, numeroTicket: e.target.value });
  };

  return (
    <>
      {isPendingTicket && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Número do Ticket *
            </label>
            <input
              type="text"
              value={formData.numeroTicket}
              onChange={handleTicketNumberChange}
              placeholder="Ex: #SR-12345"
              className="w-full px-3 py-2 bg-slate-700/50 border border-orange-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Cliente *
            </label>
            <input
              type="text"
              value={formData.nomeCliente}
              onChange={(e) => onFormDataChange({ ...formData, nomeCliente: e.target.value })}
              placeholder="Digite o nome do cliente"
              className="w-full px-3 py-2 bg-slate-700/50 border border-orange-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>
        </>
      )}

      {/* ... (O resto dos campos do formulário (N° do Item, Quantidade, etc) não muda) ... */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          N° do Item *
        </label>
        <input
          type="text"
          value={formData.numeroItem}
          onChange={(e) => onFormDataChange({ ...formData, numeroItem: e.target.value })}
          placeholder="Ex: 6440, 3266, 6450..."
          className="w-full px-3 py-2 bg-slate-700/50 border border-orange-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Quantidade *
        </label>
        <input
          type="number"
          value={formData.quantidade === 0 ? '' : formData.quantidade}
          onChange={(e) => onFormDataChange({ ...formData, quantidade: parseInt(e.target.value) || 0 })}
          className="w-full px-3 py-2 bg-slate-700/50 border border-orange-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          required
        />
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Motivo *
        </label>

        {/* */}
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.motivo.map((motivo, index) => (
            <div key={index} className="flex items-center gap-1.5 bg-orange-500/20 text-orange-300 text-sm px-2 py-1 rounded-full border border-orange-500/30">
              <span className="max-w-xs truncate">{motivo}</span>
              <button
                type="button"
                onClick={() => handleRemoveMotivo(index)}
                className="text-orange-300 hover:text-white"
              >
                <i className="ri-close-line text-xs"></i>
              </button>
            </div>
          ))}
        </div>
        {/* */}

        <div className="relative">
          <input
            type="text"
            value={motivoSearch}
            onChange={handleMotivoInputChange}
            onFocus={() => setShowMotivoDropdown(true)}
            placeholder="Digite o código ou descrição do defeito..."
            className="w-full px-3 py-2 pr-10 bg-slate-700/50 border border-orange-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <i className="ri-search-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
        </div>

        {showMotivoDropdown && (
          <div className="absolute z-20 w-full mt-1 bg-slate-700 border border-orange-500/20 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredDefeitos.length > 0 ? (
              filteredDefeitos.map((defeito) => (
                <div
                  key={defeito.codigo}
                  onClick={() => handleMotivoSelect(defeito)}
                  className="px-3 py-2 hover:bg-slate-600 cursor-pointer text-white border-b border-slate-600/50 last:border-b-0"
                >
                  <div className="flex items-center space-x-2">
                    <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-xs font-medium">
                      {defeito.codigo}
                    </span>
                    <span className="text-sm">{defeito.descricao}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-400 text-sm">
                Nenhum defeito encontrado
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Origem do Defeito *
        </label>
        <div className="relative">
          <select
            value={formData.origemDefeito}
            onChange={(e) => onFormDataChange({ ...formData, origemDefeito: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700/50 border border-orange-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none cursor-pointer"
            required
          >
            <option value="" className="bg-slate-700 text-gray-400">Selecione a origem do defeito...</option>
            {origemDefeitoOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-700 text-white">
                {option.label}
              </option>
            ))}
          </select>
          <i className="ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Disposição *
        </label>
        <div className="relative">
          <select
            value={formData.disposicao}
            onChange={(e) => onFormDataChange({ ...formData, disposicao: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700/50 border border-orange-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none cursor-pointer"
            required
          >
            <option value="" className="bg-slate-700 text-gray-400">Selecione a disposição...</option>
            {disposicaoOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-700 text-white">
                {option.label}
              </option>
            ))}
          </select>
          <i className="ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Disposição das Peças *
        </label>
        <div className="relative">
          <select
            value={formData.disposicaoPecas}
            onChange={(e) => onFormDataChange({ ...formData, disposicaoPecas: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700/50 border border-orange-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none cursor-pointer"
            required
          >
            <option value="" className="bg-slate-700 text-gray-400">Selecione a disposição das peças...</option>
            {disposicaoPecasOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-700 text-white">
                {option.label}
              </option>
            ))}
          </select>
          <i className="ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Anotações (opcional)
        </label>
        <textarea
          value={formData.anotacoes || ''}
          onChange={(e) => onFormDataChange({ ...formData, anotacoes: e.target.value })}
          placeholder="Adicione informações complementares sobre o item..."
          rows={4}
          maxLength={500}
          className="w-full px-3 py-2 bg-slate-700/50 border border-orange-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
        />
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-400">
            Informações adicionais sobre o defeito
          </span>
          <span className="text-xs text-gray-400">
            {(formData.anotacoes?.length ?? 0)}/500
          </span>
        </div>
      </div>
      {/* ... Fim dos campos do formulário ... */}


      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Fotos (até {MAX_PHOTOS}) *
        </label>
        
        {isProcessingImages ? (
            <div className="flex items-center justify-center space-x-2 p-4 bg-slate-700/50 border border-dashed border-orange-500/20 rounded-lg text-white">
                <LoadingSpinner size="sm" />
                <span>Processando imagens...</span>
            </div>
        ) : (
            <div className="flex space-x-3">
                <label
                    htmlFor="gallery-upload"
                    className={`flex-1 flex items-center justify-center px-3 py-2 bg-slate-700/50 border border-orange-500/20 rounded-lg text-white cursor-pointer hover:bg-slate-700
                    ${formData.fotos.length >= MAX_PHOTOS ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <i className="ri-gallery-line mr-2"></i>
                    <span>Adicionar Fotos</span>
                </label>
                <input
                    id="gallery-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleGalleryUpload}
                    multiple
                    disabled={formData.fotos.length >= MAX_PHOTOS || isProcessingImages}
                    className="hidden"
                />

                <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    disabled={formData.fotos.length >= MAX_PHOTOS || isProcessingImages}
                    className={`flex-1 flex items-center justify-center px-3 py-2 bg-slate-700/50 border border-orange-500/20 rounded-lg text-white cursor-pointer hover:bg-slate-700
                    ${formData.fotos.length >= MAX_PHOTOS ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <i className="ri-camera-line mr-2"></i>
                    <span>Câmera</span>
                </button>
            </div>
        )}

        <div className="mt-1 text-xs text-gray-400">
          Fotos enviadas: {formData.fotos.length}
        </div>

        {/* ✅ Atualizado para usar as 'previewUrls' no <img> */}
        {previewUrls.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {previewUrls.map((url, index) => (
              <div key={formData.fotos[index]} className="relative group">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-orange-500/20"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                  <button
                    type="button"
                    onClick={() => openImageEditor(url, index)}
                    className="bg-blue-600 p-2 rounded-full text-white hover:bg-blue-700"
                    title="Editar foto"
                    disabled={isProcessingImages}
                  >
                    <i className="ri-crop-line text-sm"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFoto(index)}
                    className="bg-red-600 p-2 rounded-full text-white hover:bg-red-700"
                    title="Remover foto"
                    disabled={isProcessingImages}
                  >
                    <i className="ri-close-line text-sm"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCaptureFromCamera}
      />

      <ImageEditorModal
        isOpen={isEditorOpen}
        imageSrc={editingImage?.src || null}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveEditedImage}
      />

      {showMotivoDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowMotivoDropdown(false)}
        />
      )}
    </>
  );
}