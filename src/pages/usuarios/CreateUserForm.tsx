// src/pages/usuarios/components/CreateUserForm.tsx

import { useState } from "react";
import { supabase } from "../../utils/supabaseClient"; // <--- CORREÇÃO: Path ajustado
import { useToastContext } from "../../contexts/ToastContext"; // <--- CORREÇÃO: Path ajustado

interface CreateUserFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export default function CreateUserForm({ onCreated, onCancel }: CreateUserFormProps) {
  const toast = useToastContext();
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    tipo: "usuario",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nome.trim() || !form.email.trim() || !form.senha.trim()) {
      toast.warning("Campos obrigatórios", "Preencha todos os campos antes de salvar.");
      return;
    }

    setLoading(true);
    try {
      // 1️⃣ Verifica se já existe e-mail cadastrado
      const { data: existing } = await supabase
        .from("perfis")
        .select("id")
        .eq("email", form.email.trim())
        .maybeSingle();

      if (existing) {
        toast.error("Erro ao criar usuário", "Este e-mail já está cadastrado.");
        setLoading(false);
        return;
      }

      // 2️⃣ Cria o usuário no Supabase Auth
      const { data: userAuth, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.senha.trim(),
      });

      if (authError) throw authError;

      // 3️⃣ Cria ou atualiza o perfil no banco (sem duplicar)
      const { error: perfilError } = await supabase
        .from("perfis")
        .upsert(
          {
            id: userAuth.user?.id,
            nome: form.nome.trim(),
            email: form.email.trim(),
            tipo: form.tipo,
            ativo: true,
          },
          { onConflict: "id" }
        );

      if (perfilError) throw perfilError;

      toast.success("Usuário criado com sucesso!");
      onCreated();
    } catch (err: any) {
      console.error("Erro ao criar usuário:", err);
      toast.error("Falha ao criar usuário", err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-xl border border-orange-500/20 w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Novo Usuário</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Nome</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2"
              placeholder="Digite o nome completo"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2"
              placeholder="email@empresa.com.br"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Senha</label>
            <input
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2"
              placeholder="Senha inicial"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Tipo de Usuário</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2"
            >
              <option value="usuario">Usuário</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Criando..." : "Criar Usuário"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}