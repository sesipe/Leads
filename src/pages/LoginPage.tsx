import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/providers/AuthProvider';
import { motion } from 'motion/react';

export default function LoginPage() {
  const { loginWithGoogle, user, isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) {
        navigate('/admin/dashboard');
      } else {
        setError("Acesso negado. Seu e-mail não possui permissões de administrador.");
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Iniciando login com Google...");
      await loginWithGoogle();
      console.log("Login disparado com sucesso.");
    } catch (err: any) {
      console.error("Erro no login:", err);
      let message = "Falha na autenticação. Verifique seu navegador ou conexão.";
      
      if (err.code === 'auth/popup-blocked') {
        message = "O seu navegador bloqueou a janela de login. Por favor, clique no ícone de 'Abrir em nova aba' no canto superior direito para fazer o login com segurança fora do iframe.";
      } else if (err.code === 'auth/popup-closed-by-user') {
        message = "A janela de login foi fechada. Para evitar restrições de segurança do navegador, abra o aplicativo em uma nova aba usando o ícone no topo direito deste editor.";
      } else if (err.code === 'auth/network-request-failed') {
        message = "Falha de conexão. Verifique sua internet.";
      } else if (err.message) {
        message = `Erro: ${err.message}`;
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-xl shadow-xl p-10 border border-slate-200 text-center"
      >
        <div className="w-16 h-16 bg-sesi-blue rounded-md flex items-center justify-center text-white font-bold text-3xl mx-auto mb-8 shadow-md">S</div>
        <h1 className="text-xl font-bold text-slate-800 mb-1 uppercase tracking-tight">Painel SESI PE</h1>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-10">
          Portal de Captação de Leads
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold uppercase rounded italic">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-3.5 rounded font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50 text-xs uppercase tracking-widest shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4 opacity-70" alt="Google" />
          {loading ? 'AUTENTICANDO...' : 'ENTRAR COM GOOGLE'}
        </button>

        <div className="mt-10 p-4 bg-slate-50 rounded border border-slate-200 text-slate-500 text-[10px] text-left leading-relaxed">
            <strong>ACESSO RESTRITO:</strong> Apenas administradores cadastrados na rede SESI Pernambuco possuem permissão para acessar este painel. Caso necessite de acesso, entre em contato com a TI.
        </div>
      </motion.div>
    </div>
  );
}
