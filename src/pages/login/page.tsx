import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { useToastContext } from '../../contexts/ToastContext';
import { LoadingButton } from '../../components/LoadingSpinner';
import DarkModeToggle from '../../components/DarkModeToggle';
import { sanitizeText } from '../../utils/security';
import { supabase } from '../../utils/supabaseClient';

export default function Login() {
  const { login } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastContext();
  const [formData, setFormData] = useState({ email: '', senha: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; senha?: string }>({});

  const handleInputChange = (field: 'email' | 'senha', value: string) => {
    setFormData(prev => ({ ...prev, [field]: sanitizeText(value) }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const newErrors: { email?: string; senha?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) newErrors.email = "Email é obrigatório";
    else if (!emailRegex.test(formData.email)) newErrors.email = "Email inválido";
    if (!formData.senha.trim()) newErrors.senha = "Senha é obrigatória";
    else if (formData.senha.length < 6) newErrors.senha = "Senha deve ter pelo menos 6 caracteres";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.senha,
      });

      if (loginError) {
        toast.error('Erro no login', 'Email ou senha incorretos.');
        setIsLoading(false);
        return;
      }

      if (loginData.user) {
        const { data: perfilData, error: perfilError } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', loginData.user.id)
          .single();

        if (perfilError) {
          toast.error('Falha ao buscar perfil', 'Erro ao carregar os dados.');
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        if (perfilData && perfilData.ativo) {
          login(perfilData);
          toast.success('Login realizado!', `Bem-vindo, ${perfilData.nome}`);
          const from = location.state?.from || '/';
          navigate(from, { replace: true });
        } else {
          await supabase.auth.signOut();
          toast.error('Erro no login', 'Utilizador inativo.');
        }
      }
    } catch (error: any) {
      toast.error('Erro inesperado', 'Erro no login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-black flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-4 p-2 shadow-lg">
            <img 
              alt="DPF AUTO PEÇAS LTDA Logo" 
              className="w-full h-full object-contain" 
              src="https://i.postimg.cc/bJ3kwSbw/DPF.png" 
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Sistema de Laudos</h1>
          <p className="text-gray-300">DPF AUTO PEÇAS LTDA</p>
        </div>
        <div className="card bg-slate-800/90 backdrop-blur-sm border-blue-900/20">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-group">
                <label className="label text-white">Email</label>
                <input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className="input-field bg-slate-700 text-white border-blue-900/30" required />
              </div>
              <div className="form-group">
                <label className="label text-white">Senha</label>
                <input type="password" value={formData.senha} onChange={(e) => handleInputChange('senha', e.target.value)} className="input-field bg-slate-700 text-white border-blue-900/30" required />
              </div>
              <LoadingButton type="submit" isLoading={isLoading} className="w-full bg-blue-800 hover:bg-blue-700 text-white py-3 rounded-lg font-bold">
                Entrar
              </LoadingButton>
            </form>
          </div>
        </div>
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">© 2026 DPF AUTO PEÇAS LTDA</p>
        </div>
      </div>
    </div>
  );
}