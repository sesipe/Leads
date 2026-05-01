import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AppSettings } from '../../types';
import { Save, Info, Mail, MessageSquare, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AdminSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    confirmationEmailTemplate: 'Olá, recebemos seu interesse para o SESI Pernambuco. O cadastro na lista de espera não garante a vaga, mas entraremos em contato assim que o período de matrícula iniciar.',
    confirmationWhatsappTemplate: 'Olá! Recebemos sua manifestação de interesse para o SESI-PE. Aguarde nosso contato para o início das matrículas.',
    emailConfig: {
      host: '',
      port: 587,
      user: '',
      pass: '',
      fromName: 'SESI Pernambuco',
      fromEmail: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'email'>('templates');

  useEffect(() => {
    async function fetchSettings() {
      const docSnap = await getDoc(doc(db, 'settings', 'app'));
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        setSettings({
          ...data,
          emailConfig: data.emailConfig || {
            host: '',
            port: 587,
            user: '',
            pass: '',
            fromName: 'SESI Pernambuco',
            fromEmail: ''
          }
        });
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'app'), settings);
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const setMicrosoftPresets = () => {
    setSettings(prev => ({
      ...prev,
      emailConfig: {
        ...prev.emailConfig!,
        host: 'smtp.office365.com',
        port: 587,
      }
    }));
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-sesi-blue border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic animate-pulse">Carregando Preferências...</p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Configurações</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Comunicação e Serviços</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('templates')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'templates' ? "bg-white text-sesi-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <MessageSquare size={14} /> Templates
          </button>
          <button 
            onClick={() => setActiveTab('email')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'email' ? "bg-white text-sesi-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Mail size={14} /> E-mail de Serviço
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-2xl transition-all">
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-slate-400" />
                    <h3 className="font-black text-slate-700 text-[11px] uppercase tracking-[0.2em] italic">Confirmação E-mail</h3>
                  </div>
              </div>
              <div className="p-10 space-y-4">
                <textarea 
                  value={settings.confirmationEmailTemplate}
                  onChange={e => setSettings({...settings, confirmationEmailTemplate: e.target.value})}
                  rows={8}
                  className="w-full px-8 py-6 rounded-[30px] border border-slate-100 outline-none focus:border-sesi-blue transition-all font-sans text-sm bg-slate-50/50 leading-relaxed text-slate-600"
                  placeholder="Texto que o lead receberá por e-mail..."
                />
                <div className="flex flex-wrap gap-2">
                   {['{name}', '{schoolName}', '{gradeName}', '{courseName}'].map(tag => (
                     <span key={tag} className="px-2 py-1 bg-slate-100 rounded text-[9px] font-mono text-slate-500">{tag}</span>
                   ))}
                </div>
                <p className="text-[10px] text-slate-400 font-medium italic">* Use as tags acima para personalizar com os dados do lead.</p>
              </div>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-2xl transition-all">
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={18} className="text-slate-400" />
                    <h3 className="font-black text-slate-700 text-[11px] uppercase tracking-[0.2em] italic">Confirmação WhatsApp</h3>
                  </div>
              </div>
              <div className="p-10 space-y-4">
                <textarea 
                  value={settings.confirmationWhatsappTemplate}
                  onChange={e => setSettings({...settings, confirmationWhatsappTemplate: e.target.value})}
                  rows={8}
                  className="w-full px-8 py-6 rounded-[30px] border border-slate-100 outline-none focus:border-sesi-blue transition-all font-sans text-sm bg-slate-50/50 leading-relaxed text-slate-600"
                  placeholder="Texto Sugerido para abordagem via WhatsApp..."
                />
                 <p className="text-[10px] text-slate-400 font-medium italic italic">* Texto de referência para a equipe comercial.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="max-w-3xl mx-auto space-y-8">
             <div className="bg-sesi-blue text-white rounded-[40px] p-10 flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-sesi-blue/20">
                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md">
                   <ShieldCheck size={40} />
                </div>
                <div className="flex-1 text-center md:text-left">
                   <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Configuração de SMTP</h3>
                   <p className="text-sm opacity-80 mt-2 leading-relaxed">Conecte um e-mail institucional para que o sistema possa realizar envios automáticos de confirmação de interesse.</p>
                </div>
                <button 
                  type="button"
                  onClick={setMicrosoftPresets}
                  className="px-6 py-3 bg-white text-sesi-blue rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                >
                   <Zap size={14} /> Usar Perfil Microsoft
                </button>
             </div>

             <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Servidor SMTP</label>
                   <input 
                     value={settings.emailConfig?.host}
                     onChange={e => setSettings({...settings, emailConfig: { ...settings.emailConfig!, host: e.target.value }})}
                     className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-sesi-blue outline-none transition-all font-bold text-sm"
                     placeholder="smtp.office365.com"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Porta</label>
                   <input 
                     type="number"
                     value={settings.emailConfig?.port}
                     onChange={e => setSettings({...settings, emailConfig: { ...settings.emailConfig!, port: parseInt(e.target.value) }})}
                     className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-sesi-blue outline-none transition-all font-bold text-sm"
                     placeholder="587"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">E-mail / Usuário</label>
                   <input 
                     value={settings.emailConfig?.user}
                     onChange={e => setSettings({...settings, emailConfig: { ...settings.emailConfig!, user: e.target.value }})}
                     className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-sesi-blue outline-none transition-all font-bold text-sm"
                     placeholder="email-servico@sesipe.org.br"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Senha de App</label>
                   <input 
                     type="password"
                     value={settings.emailConfig?.pass}
                     onChange={e => setSettings({...settings, emailConfig: { ...settings.emailConfig!, pass: e.target.value }})}
                     className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-sesi-blue outline-none transition-all font-bold text-sm"
                     placeholder="••••••••••••"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome Remetente</label>
                   <input 
                     value={settings.emailConfig?.fromName}
                     onChange={e => setSettings({...settings, emailConfig: { ...settings.emailConfig!, fromName: e.target.value }})}
                     className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-sesi-blue outline-none transition-all font-bold text-sm"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">E-mail de Envio</label>
                   <input 
                     value={settings.emailConfig?.fromEmail}
                     onChange={e => setSettings({...settings, emailConfig: { ...settings.emailConfig!, fromEmail: e.target.value }})}
                     className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-sesi-blue outline-none transition-all font-bold text-sm"
                     placeholder="noreply@sesipe.org.br"
                   />
                </div>

                <div className="md:col-span-2 flex items-start gap-4 p-6 bg-amber-50 rounded-3xl border border-amber-100">
                   <Info className="text-amber-500 shrink-0" size={20} />
                   <p className="text-[11px] text-amber-700 leading-relaxed italic">
                      Para contas Microsoft/Office365, é obrigatório o uso de uma <strong>Senha de App</strong> se a conta possuir MFA (Autenticação de dois fatores) ativa. O host padrão é smtp.office365.com na porta 587.
                   </p>
                </div>
             </div>
          </div>
        )}

        <div className="fixed bottom-10 right-10 z-50">
          <button 
            disabled={saving}
            className="flex items-center gap-4 bg-sesi-red text-white px-10 py-5 rounded-[24px] font-black hover:brightness-110 transition-all disabled:opacity-50 text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-sesi-red/40 active:scale-95 group"
          >
            <div className="p-2 bg-white/20 rounded-xl group-hover:rotate-12 transition-transform">
               <Save size={20} />
            </div>
            {saving ? 'PROCESSANDO...' : 'SALVAR PREFERÊNCIAS'}
          </button>
        </div>
      </form>
    </div>
  );
}
