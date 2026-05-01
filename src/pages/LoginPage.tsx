import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/providers/AuthProvider';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ShieldUser } from 'lucide-react';

export default function LoginPage() {
  const { loginWithGoogle, loginWithEmail, user, isAdmin, isOperator, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin || isOperator) {
        navigate('/admin/dashboard');
      } else {
        setError("Acesso negado. Seu e-mail não possui permissões administrativas.");
      }
    }
  }, [user, isAdmin, isOperator, authLoading, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      console.error("Erro no login:", err);
      let message = "Credenciais inválidas ou erro de conexão.";
      if (err.code === 'auth/invalid-credential') message = "E-mail ou senha incorretos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Erro no login:", err);
      let message = "Falha na autenticação via Google.";
      if (err.code === 'auth/popup-blocked') {
        message = "O seu navegador bloqueou a janela de login. Por favor, abra o aplicativo em uma nova aba.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="bg-sesi-blue p-12 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          </div>
          <motion.div
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="w-16 h-16 bg-white/20 rounded-3xl backdrop-blur-xl flex items-center justify-center mx-auto mb-6 shadow-lg"
          >
            <ShieldUser size={32} className="text-white" />
          </motion.div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic leading-none mb-2">Painel Administrativo</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Rede SESI Pernambuco</p>
        </div>

        <div className="p-10">
          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">E-mail Institucional</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-sesi-blue outline-none transition-all font-bold text-sm"
                  placeholder="seu@e-mail.com.br"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-14 pr-14 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-sesi-blue outline-none transition-all font-bold text-sm"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-sesi-blue transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-red-100 text-center italic">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-sesi-red text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-sesi-red/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'AUTENTICANDO...' : 'ENTRAR NO SISTEMA'}
            </button>

            <div className="pt-4 flex flex-col items-center gap-4">
               <div className="w-full flex items-center gap-4">
                  <div className="h-[1px] bg-slate-100 flex-1"></div>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Ou acesse com</span>
                  <div className="h-[1px] bg-slate-100 flex-1"></div>
               </div>

               <button 
                type="button"
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all font-bold text-slate-600 text-xs"
              >
                <img src="https://www.svgrepo.com/show/355037/google.svg" className="w-5 h-5" alt="Google" />
                Conta Corporativa Google
              </button>
            </div>
          </form>
        </div>

        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
           <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">SESI Pernambuco • Acesso Restrito</p>
        </div>
      </motion.div>
    </div>
  );
}
