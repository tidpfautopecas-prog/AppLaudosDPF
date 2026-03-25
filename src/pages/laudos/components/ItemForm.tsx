// src/pages/laudos/components/ItemForm.tsx

import { useState, useEffect } from 'react';
import ItemFormFields from './ItemFormFields';
import { LoadingButton } from '../../../components/LoadingSpinner';
// --- MELHORIA: Importa as novas interfaces de opções ---
import type { DefeitoOption, FormOption } from '../page';
// --- Fim da MelhorIA ---

const ITEM_FORM_BACKUP_KEY = 'itemFormBackup';
const ITEM_FORM_WAS_OPEN_KEY = 'itemFormWasOpen';

interface ItemFormProps {
  item?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isPendingTicket?: boolean;
  ticketNumero?: string;
  ticketNomeCliente?: string;
  isSaving?: boolean;
  // --- MELHORIA: Adiciona as opções do formulário às props ---
  defeitosOptions: DefeitoOption[];
  origemDefeitoOptions: FormOption[];
  disposicaoOptions: FormOption[];
  disposicaoPecasOptions: FormOption[];
  // --- Fim da MelhorIA ---
}

export default function ItemForm({
  item: editingItem,
  onSave,
  onCancel,
  isPendingTicket,
  ticketNumero,
  ticketNomeCliente,
  isSaving = false,
  // --- MELHORIA: Recebe as novas props ---
  defeitosOptions,
  origemDefeitoOptions,
  disposicaoOptions,
  disposicaoPecasOptions
  // --- Fim da MelhorIA ---
}: ItemFormProps) {
  const [formData, setFormData] = useState({
    numeroTicket: "",
    numeroItem: "",
    quantidade: 1,
    motivo: [], // <-- ALTERADO
    origemDefeito: "",
    anotacoes: "",
    fotos: [],
    nomeCliente: "",
    disposicao: "",
    disposicaoPecas: ""
  });

  const isCreatingFirstPendingItem = isPendingTicket && !editingItem;

  useEffect(() => {
    const initialData = {
      numeroTicket: ticketNumero || "",
      numeroItem: "",
      quantidade: 1,
      motivo: [], // <-- ALTERADO
      origemDefeito: "",
      anotacoes: "",
      fotos: [],
      nomeCliente: ticketNomeCliente || "",
      disposicao: "",
      disposicaoPecas: ""
    };

    if (editingItem) {
      setFormData({
        ...initialData,
        ...editingItem,
        numeroTicket: ticketNumero || editingItem.numeroTicket || "", 
        nomeCliente: editingItem.nomeCliente || ticketNomeCliente || "",
      });
      sessionStorage.removeItem(ITEM_FORM_BACKUP_KEY);
      sessionStorage.removeItem(ITEM_FORM_WAS_OPEN_KEY); 
    } else {
      const backup = sessionStorage.getItem(ITEM_FORM_BACKUP_KEY);
      const wasOpen = sessionStorage.getItem(ITEM_FORM_WAS_OPEN_KEY) === "true";
      
      if (wasOpen && backup) {
        try {
          setFormData({ ...initialData, ...JSON.parse(backup) });
        } catch {
          setFormData(initialData);
        }
      } else {
        setFormData(initialData);
      }
    }
  }, [editingItem, ticketNumero, ticketNomeCliente]);

  useEffect(() => {
    if (!editingItem) {
      sessionStorage.setItem(ITEM_FORM_BACKUP_KEY, JSON.stringify(formData));
      sessionStorage.setItem(ITEM_FORM_WAS_OPEN_KEY, "true");
    }
  }, [formData, editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    const { numeroTicket, nomeCliente, ...itemData } = formData;

    if (isCreatingFirstPendingItem) {
      if (!numeroTicket?.trim()) {
        alert("Por favor, preencha um Número de Ticket válido.");
        return;
      }
      if (!nomeCliente.trim()) {
        alert("Por favor, preencha o nome do cliente.");
        return;
      }
    }
    if (!itemData.numeroItem.trim() || itemData.motivo.length === 0 || !itemData.origemDefeito.trim() || !itemData.disposicao.trim() || !itemData.disposicaoPecas.trim()) { // <-- ALTERADO
      alert("Por favor, preencha todos os campos obrigatórios do item.");
      return;
    }
    if (itemData.quantidade <= 0) {
      alert("A quantidade deve ser maior que zero.");
      return;
    }
    if (itemData.fotos.length === 0) {
      alert("Por favor, adicione pelo menos uma foto do item.");
      return;
    }

    const finalItem = {
      ...itemData,
      nomeCliente: nomeCliente.trim(),
      anotacoes: (itemData.anotacoes || '').trim() || undefined,
    };

    const saveData = { item: finalItem, numeroTicket, nomeCliente };

    onSave(saveData); 
    sessionStorage.removeItem(ITEM_FORM_BACKUP_KEY);
    sessionStorage.removeItem(ITEM_FORM_WAS_OPEN_KEY);
  };
  
  const isFormValid = () => {
    const { numeroTicket, nomeCliente, ...itemData } = formData;
    const isItemDataValid =
      itemData.numeroItem.trim() !== "" &&
      itemData.motivo.length > 0 && // <-- ALTERADO
      itemData.origemDefeito.trim() !== "" &&
      itemData.disposicao.trim() !== "" &&
      itemData.disposicaoPecas.trim() !== "" &&
      itemData.quantidade > 0 &&
      itemData.fotos.length > 0;

    if (editingItem) {
        return isItemDataValid;
    }
    
    if (isCreatingFirstPendingItem) {
      const isTicketValid =
        (numeroTicket?.trim() || "") !== "" &&
        nomeCliente.trim() !== "";
      return isItemDataValid && isTicketValid;
    }

    return isItemDataValid;
  };

  const handleCancel = () => {
    sessionStorage.removeItem(ITEM_FORM_BACKUP_KEY);
    sessionStorage.removeItem(ITEM_FORM_WAS_OPEN_KEY);
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-orange-500/20 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-orange-500/20 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white">
            {editingItem ? 'Editar Item' : 'Adicionar Item'}
          </h3>
        </div>

        <form id="item-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* --- MELHORIA: Passa as props dinâmicas para o ItemFormFields --- */}
          <ItemFormFields
            formData={formData}
            onFormDataChange={setFormData}
            defeitosOptions={defeitosOptions}
            origemDefeitoOptions={origemDefeitoOptions}
            disposicaoOptions={disposicaoOptions}
            disposicaoPecasOptions={disposicaoPecasOptions}
            isPendingTicket={isCreatingFirstPendingItem}
          />
          {/* --- Fim da MelhorIA (Listas hardcoded removidas) --- */}
        </form>

        <div className="p-6 border-t border-orange-500/20 flex-shrink-0">
          <div className="flex space-x-3">
            <button type="button" onClick={handleCancel} className="btn-secondary flex-1" disabled={isSaving}>
              Cancelar
            </button>
            <LoadingButton
              type="submit" 
              form="item-form"
              disabled={!isFormValid() || isSaving}
              isLoading={isSaving}
              className="flex-1"
            >
              {editingItem ? 'Salvar' : 'Adicionar'}
            </LoadingButton>
          </div>
        </div>
      </div>
    </div>
  );
}