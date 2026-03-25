// src/pages/usuarios/page.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { useToastContext } from '../../contexts/ToastContext';
import LoadingSpinner, { LoadingButton } from '../../components/LoadingSpinner';
// ====================================================
// CORREÇÃO: Importar apenas o supabase normal
// ====================================================
import { supabase } from '../../utils/supabaseClient';
import PageHeader from '../../components/PageHeader';

interface UserData {
  id: string;
  nome: string;
  email: string;
  tipo: 'admin' | 'usuario';
  ativo: boolean;
  dataCriacao: string;
}

export default function Usuarios() {
  // ✅ CORREÇÃO TS6133: A variável 'user' foi removida pois não era utilizada neste componente.
  const { isAuthenticated, isAdmin } = useUser();
  const navigate = useNavigate();
  const toast = useToastContext();

  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    tipo: 'usuario' as 'admin' | 'usuario',
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('*') 
        .order('nome', { ascending: true }); 

      if (error) {
        toast.error('Erro ao buscar usuários', error.message);
      } else {
        const mappedUsers = data.map(u => ({
            ...u,
            dataCriacao: (u as any).data_criacao || (u as any).created_at || new Date().toISOString()
        })) as UserData[];
        setUsers(mappedUsers);
      }
    } catch (err: any) {
        console.error("Erro ao buscar usuários:", err);
        toast.error('Erro ao buscar usuários', 'Erro desconhecido.');
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
    else if (!isAdmin) navigate('/');
    else {
      fetchUsers();
    }
  }, [isAuthenticated, isAdmin, navigate, toast]);

  const resetForm = () => {
    setFormData({ nome: '', email: '', senha: '', tipo: 'usuario' });
    setEditingUser(null);
    setIsModalOpen(false);
  };

  // --- MELHORIA: handleSave simplificado para usar o Trigger ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingUser) {
        // Lógica de ATUALIZAÇÃO do perfil (perfis)
        const { error } = await supabase
          .from('perfis')
          .update({
            nome: formData.nome,
            email: formData.email,
            tipo: formData.tipo,
          })
          .eq('id', editingUser.id);
          
        if (error) throw error;
        
        // (Opcional) Atualizar senha (auth)
        if (formData.senha.trim()) {
            // ====================================================
            // ❌ CORREÇÃO DE SEGURANÇA: Lógica de admin removida
            // Esta operação deve ser movida para uma Supabase Edge Function
            // ====================================================
            
            // 1. Chame a sua nova Edge Function
            const { error: passError } = await supabase.functions.invoke('update-user-password', {
                body: { 
                  userId: editingUser.id, 
                  newPassword: formData.senha.trim() 
                },
            });

            // 2. Se a função falhar, mostre o erro
            if (passError) throw passError;

            // 3. A lógica antiga abaixo foi removida por ser insegura:
            /*
            if (!supabaseAdmin) {
                 throw new Error("Cliente de Admin não configurado. Verifique VITE_SUPABASE_SERVICE_KEY.");
            }
            const { error: passError } = await supabaseAdmin.auth.admin.updateUserById(
                editingUser.id,
                { password: formData.senha.trim() }
            );
            if (passError) throw passError;
            */
        }

        toast.success('Usuário atualizado!');
        await fetchUsers(); 
      } else {
        // Lógica de CRIAÇÃO (usa signUp normal, trigger insere em perfis)
        if (!formData.nome || !formData.email || !formData.senha) {
          toast.warning('Campos obrigatórios', 'Preencha todos os campos.');
          setIsSaving(false);
          return;
        }

        // 1. Chame o signUp. O Trigger cuidará da criação do perfil.
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.senha.trim(),
          options: {
            // Envia os dados extras para o Trigger (via metadata)
            data: {
              nome: formData.nome.trim(),
              tipo: formData.tipo
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('ID do usuário não retornado.');

        toast.success('Usuário criado com sucesso!');
        await fetchUsers();
      }

      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      let errorMessage = error.message || 'Falha desconhecida';
      if (error.message.includes('Function not found')) {
          errorMessage = "A função 'update-user-password' não foi encontrada. É necessário criá-la no Supabase.";
      }
      toast.error('Erro ao salvar', errorMessage);
    }

    setIsSaving(false);
  };
  // --- Fim da Melhoria ---

  // --- MELHORIA: handleDelete simplificado para usar a RPC Atômica ---
  const handleDelete = async (userToDelete: UserData) => {
    if (userToDelete.tipo === 'admin') {
      toast.warning('Ação não permitida', 'Não é possível excluir administradores');
      return;
    }
    if (
      window.confirm(
        `Tem certeza que deseja excluir o usuário "${userToDelete.nome}"?\n\nEsta ação IRÁ REMOVER PERMANENTEMENTE O PERFIL E A CONTA DE LOGIN (AUTH).`
      )
    ) {
      try {
        // 1. Chama a RPC (Esta chamada é segura, pois RPCs são executadas no servidor)
        const { error } = await supabase.rpc('delete_auth_user_by_id', {
            user_id: userToDelete.id,
        });

        if (error) {
             throw new Error(error.message || "Erro ao deletar usuário via RPC.");
        }

        toast.success('Usuário excluído', `${userToDelete.nome} foi removido.`);
        setUsers(users.filter((u) => u.id !== userToDelete.id));

      } catch (err: any) {
        console.error("❌ Erro ao excluir usuário:", err);
        toast.error('Erro ao excluir', err.message || 'Falha desconhecida. O usuário pode não ter sido totalmente removido.');
        await fetchUsers(); // Recarrega em caso de erro
      }
    }
  };
  // --- Fim da Melhoria ---

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 dark:text-gray-400 mt-4">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <PageHeader 
        title="Gerenciar Usuários"
        subtitle="Administração do Sistema"
        iconClass="ri-shield-user-line"
      />

      <div className="container-responsive py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 space-y-4 sm:space-y-0">
          <div className="animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Usuários do Sistema</h2>
            <p className="text-gray-600 dark:text-gray-400">Gerencie usuários e suas permissões</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary hover-glow hover-lift">
            <i className="ri-user-add-line"></i>
            <span>Novo Usuário</span>
          </button>
        </div>

        <div className="table-container animate-scale-in">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-y-gray-200 dark:divide-slate-700">
                {users.map((userData) => (
                  <tr key={userData.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            userData.tipo === 'admin' ? 'bg-orange-500' : 'bg-blue-500'
                          }`}
                        >
                          <i
                            className={`${
                              userData.tipo === 'admin'
                                ? 'ri-shield-user-line'
                                : 'ri-user-line'
                            } text-white text-sm`}
                          ></i>
                        </div>
                        <span className="font-medium">{userData.nome}</span>
                      </div>
                    </td>
                    <td className="table-cell text-gray-600 dark:text-gray-400">{userData.email}</td>
                    <td className="table-cell">
                      <span
                        className={`badge ${
                          userData.tipo === 'admin' ? 'badge-primary' : 'badge-info'
                        }`}
                      >
                        {userData.tipo === 'admin' ? 'Administrador' : 'Usuário'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span
                        className={`badge ${
                          userData.ativo ? 'badge-success' : 'badge-error'
                        }`}
                      >
                        {userData.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingUser(userData);
                            setFormData({
                              nome: userData.nome,
                              email: userData.email || '',
                              senha: '',
                              tipo: userData.tipo,
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editar usuário"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        {userData.tipo !== 'admin' && (
                          <>
                            <button
                              onClick={async () => {
                                const { error } = await supabase
                                  .from('perfis')
                                  .update({ ativo: !userData.ativo })
                                  .eq('id', userData.id);
                                  
                                if (error) {
                                  toast.error('Erro na operação');
                                } else {
                                  toast.success(
                                    `Usuário ${userData.ativo ? 'desativado' : 'ativado'}`
                                  );
                                  await fetchUsers(); 
                                }
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                userData.ativo
                                  ? 'text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                                  : 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                              }`}
                              title={userData.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                            >
                              <i className={userData.ativo ? 'ri-pause-line' : 'ri-play-line'}></i>
                            </button>
                            <button
                              onClick={() => handleDelete(userData)}
                              className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Excluir usuário"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale-in">
            <div className="modal-header">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button onClick={resetForm} className="btn-ghost p-2">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="form-group">
                  <label className="label label-required">Nome Completo</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, nome: e.target.value }))
                    }
                    placeholder="Digite o nome completo"
                    className="input-field"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label label-required">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="Digite o email"
                    className="input-field"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">
                    Senha {editingUser && '(deixe em branco para manter a atual)'}
                  </label>
                  <input
                    type="password"
                    value={formData.senha}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, senha: e.target.value }))
                    }
                    placeholder={
                      editingUser
                        ? 'Nova senha (opcional)'
                        : 'Digite a senha'
                    }
                    className="input-field"
                    required={!editingUser}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Tipo de Usuário</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        tipo: e.target.value as 'admin' | 'usuario',
                      }))
                    }
                    className="input-field"
                  >
                    <option value="usuario">Usuário Comum</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={resetForm} className="btn-secondary flex-1">
                Cancelar
              </button>
              <LoadingButton onClick={handleSave} isLoading={isSaving} className="flex-1">
                <i className="ri-save-line"></i>
                <span>{editingUser ? 'Atualizar' : 'Criar Usuário'}</span>
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}