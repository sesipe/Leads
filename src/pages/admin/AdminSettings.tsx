import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AppSettings } from '../../types';
import { Save, Info } from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    confirmationEmailTemplate: 'Olá, recebemos seu interesse para o SESI Pernambuco. O cadastro na lista de espera não garante a vaga, mas entraremos em contato assim que o período de matrícula iniciar.',
    confirmationWhatsappTemplate: 'Olá! Recebemos sua manifestação de interesse para o SESI-PE. Aguarde nosso contato para o início das matrículas.'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const docSnap = await getDoc(doc(db, 'settings', 'app'));
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
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

  if (loading) return <div>Carregando configurações...</div>;

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Preferências</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuração de mensagens e sistema</p>
        </div>
      </div>

      <div className="bg-sesi-blue/5 p-6 rounded-xl border border-sesi-blue/10 flex gap-4">
        <div className="bg-sesi-blue/10 p-2 rounded text-sesi-blue h-fit">
            <Info size={18} />
        </div>
        <div className="text-[11px] text-slate-600 leading-relaxed italic">
            <p className="font-bold mb-1 uppercase tracking-widest">Dica de Personalização</p>
            As mensagens abaixo são o texto base utilizado pela equipe de atendimento ao entrar em contato manual ou via sistema automatizado. Elas orientam o texto da confirmação pública conforme a LGPD.
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 text-[10px] uppercase tracking-wider italic">Template: Confirmação E-mail</h3>
          </div>
          <div className="p-6 space-y-4">
            <textarea 
              value={settings.confirmationEmailTemplate}
              onChange={e => setSettings({...settings, confirmationEmailTemplate: e.target.value})}
              rows={6}
              className="w-full px-4 py-3 rounded border border-slate-200 outline-none focus:border-sesi-blue transition-all font-sans text-xs bg-slate-50 leading-relaxed"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 text-[10px] uppercase tracking-wider italic">Template: Confirmação WhatsApp</h3>
          </div>
          <div className="p-6 space-y-4">
            <textarea 
              value={settings.confirmationWhatsappTemplate}
              onChange={e => setSettings({...settings, confirmationWhatsappTemplate: e.target.value})}
              rows={6}
              className="w-full px-4 py-3 rounded border border-slate-200 outline-none focus:border-sesi-blue transition-all font-mono text-xs bg-slate-50 leading-relaxed"
            />
          </div>
        </div>

        <div className="lg:col-span-2 flex justify-end">
          <button 
            disabled={saving}
            className="flex items-center gap-2 bg-sesi-blue text-white px-8 py-3 rounded font-bold hover:brightness-110 transition-all disabled:opacity-50 text-[11px] uppercase tracking-widest shadow-sm"
          >
            <Save size={16} />
            {saving ? 'PROCESSANDO...' : 'SALVAR CONFIGURAÇÕES'}
          </button>
        </div>
      </form>
    </div>
  );
}
