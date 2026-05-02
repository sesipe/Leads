import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, doc, setDoc, deleteDoc, where, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, School, UserRole } from '../../types';
import { UserPlus, Shield, Building2, Trash2, Mail, User as UserIcon, Save } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../components/providers/AuthProvider';

export default function AdminUsers() {
  const { profile, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState<Partial<UserProfile>>({
    role: 'operator'
  });

  const [isSeeding, setIsSeeding] = useState(false);
  const [seedStep, setSeedStep] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  async function fetchData() {
    setLoading(true);
    try {
      const [usersSnap, schoolsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'schools'))
      ]);
      setUsers(usersSnap.docs.map(doc => ({ ...doc.data() } as UserProfile)));
      setSchools(schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSeedAll = async () => {
    if (!confirm('Deseja auto-gerar as contas administrativas para todas as 12 unidades escolares do SESI-PE?')) return;
    
    setIsSeeding(true);
    setLoading(true);

    const schoolsToSeed = [
      { name: 'SESI Vasco da Gama', codFilial: 504, user: 'vascodagama' },
      { name: 'SESI Ibura', codFilial: 505, user: 'ibura' },
      { name: 'SESI Camaragibe', codFilial: 506, user: 'camaragibe' },
      { name: 'SESI Paulista', codFilial: 507, user: 'paulista' },
      { name: 'SESI Cabo de Santo Agostinho', codFilial: 510, user: 'cabo' },
      { name: 'SESI Escada', codFilial: 511, user: 'escada' },
      { name: 'SESI Goiana', codFilial: 513, user: 'goiana' },
      { name: 'SESI Caruaru', codFilial: 515, user: 'caruaru' },
      { name: 'SESI Petrolina', codFilial: 517, user: 'petrolina' },
      { name: 'SESI Araripina', codFilial: 518, user: 'araripina' },
      { name: 'SESI Moreno', codFilial: 524, user: 'moreno' },
      { name: 'SESI Belo Jardim', codFilial: 501, user: 'belojardim' },
    ];

    try {
       // Loop through schools and create them + their users
       for (const sh of schoolsToSeed) {
         setSeedStep(`Semeando ${sh.name}...`);
         
         // 1. Create the school record directly from frontend
         const schoolId = sh.user;
         const schoolRef = doc(db, 'schools', schoolId);
         await setDoc(schoolRef, {
           id: schoolId,
           name: `SESI ${sh.name}`,
           codFilial: sh.codFilial,
           active: true,
           updatedAt: new Date()
         }, { merge: true });

         // 2. We still need the server to create the Auth account (browser can't create other users)
         const response = await fetch('/api/admin/create-user', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             email: `${sh.user}@sistemafiepe.org.br`,
             password: `${sh.user}@1234`,
             name: sh.name,
             role: 'operator',
             schoolId: schoolId
           })
         });

         if (!response.ok) {
           const errData = await response.json();
           console.error(`Erro ao criar usuário para ${sh.name}:`, errData);
           // We continue because maybe the user already exists
         }
       }
       
       alert('Contas escolares geradas com sucesso! Você já pode ver os novos operadores na lista.');
       fetchData(); 
    } catch (err: any) {
      console.error(err);
      alert('Ocorreu um erro durante a geração das contas: ' + err.message);
    } finally {
      setIsSeeding(false);
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password || (newUser.role === 'operator' && !newUser.schoolId)) {
      alert('Preencha todos os campos obrigatórios, incluindo a senha.');
      return;
    }

    setLoading(true);
    const apiUrl = '/api/admin/create-user';
    console.log(`[Equipe] Chamando API: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      console.log(`[Equipe] Status da Resposta: ${response.status}`);

      if (response.status === 405) {
        throw new Error("O servidor não permitiu esta operação (405). Certifique-se de estar usando o link de 'Development App' do AI Studio.");
      }

      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.error("Servidor retornou resposta não-JSON:", text);
        throw new Error("O servidor retornou uma resposta inválida (formato inesperado).");
      }
      
      if (response.ok && result.success) {
        const userToSave: UserProfile = {
          uid: result.uid,
          email: newUser.email!,
          role: newUser.role as UserRole,
          name: newUser.name!,
          schoolId: newUser.schoolId
        };
        setUsers([...users, userToSave]);
        setIsAdding(false);
        setNewUser({ role: 'operator' });
        alert('Usuário cadastrado com sucesso!');
      } else {
        const errorMsg = result.error || 'Erro desconhecido ao criar usuário.';
        console.error("Erro do servidor:", errorMsg);
        alert('Erro: ' + errorMsg);
      }
    } catch (err: any) {
      console.error("Erro na requisição:", err);
      alert('Falha na comunicação: ' + (err.message || 'Verifique sua conexão ou se o servidor está ativo.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Excluir este acesso administrativo?')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(users.filter(u => u.uid !== uid));
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAdmin) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <p className="text-slate-400 font-bold uppercase tracking-widest italic">Acesso Restrito ao Administrador Central</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Gestão de Equipe</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Controle de acessos por unidade escolar</p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleSeedAll}
            disabled={loading || isSeeding}
            className="flex items-center gap-2 bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
          >
            {isSeeding ? 'Processando...' : 'Auto-Gerar Contas Escolares'}
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-sesi-blue text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-sesi-blue/20"
          >
            <UserPlus size={16} /> Novo Operador
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome Completo</label>
                <input 
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-6 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-sesi-blue outline-none transition-all font-bold text-xs"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">E-mail Institucional</label>
                <input 
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-6 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-sesi-blue outline-none transition-all font-bold text-xs"
                  placeholder="joao.silva@sesipe.org.br"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Senha de Acesso</label>
                <input 
                  type="password"
                  value={newUser.password || ''}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-6 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-sesi-blue outline-none transition-all font-bold text-xs"
                  placeholder="Defina uma senha"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Papel</label>
                <select 
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value as UserRole, schoolId: e.target.value === 'admin' ? undefined : newUser.schoolId})}
                  className="w-full px-6 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-sesi-blue outline-none transition-all font-bold text-xs appearance-none"
                >
                  <option value="operator">Operador (Escola)</option>
                  <option value="admin">Administrador Central</option>
                </select>
              </div>
              {newUser.role === 'operator' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Unidade Assignada</label>
                  <select 
                    value={newUser.schoolId}
                    onChange={e => setNewUser({...newUser, schoolId: e.target.value})}
                    className="w-full px-6 py-3 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-sesi-blue outline-none transition-all font-bold text-xs appearance-none"
                  >
                    <option value="">Selecione uma escola...</option>
                    {schools.map(school => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                </div>
              )}
           </div>
           <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddUser}
                className="px-8 py-3 bg-sesi-red text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2"
              >
                <Save size={14} /> Confirmar Cadastro
              </button>
           </div>
        </div>
      )}

      <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left truncate">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Colaborador</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Nível de Acesso</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Unidade / Escopo</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-sesi-blue/10 group-hover:text-sesi-blue transition-all">
                      <UserIcon size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-1">
                        <Mail size={10} /> {u.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                   <div className={cn(
                     "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                     u.role === 'admin' ? "bg-purple-50 text-purple-600 border border-purple-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                   )}>
                      <Shield size={12} /> {u.role === 'admin' ? 'Central' : 'Operador'}
                   </div>
                </td>
                <td className="px-8 py-6">
                   {u.role === 'admin' ? (
                     <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Toda a Rede SESI-PE</div>
                   ) : (
                     <div className="flex items-center gap-2 text-sesi-blue font-black text-[11px] uppercase tracking-tighter">
                        <Building2 size={14} />
                        {schools.find(s => s.id === u.schoolId)?.name || 'Unidade não encontrada'}
                     </div>
                   )}
                </td>
                <td className="px-8 py-6 text-right">
                  <button 
                    onClick={() => handleDeleteUser(u.uid)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
