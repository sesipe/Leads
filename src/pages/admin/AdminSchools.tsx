import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { School, Course } from '../../types';
import { Plus, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AdminSchools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [schoolForm, setSchoolForm] = useState({ name: '', city: '', active: true });
  const [courseForm, setCourseForm] = useState({ name: '', levels: '' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const schoolsSnap = await getDocs(collection(db, 'schools'));
    setSchools(schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School)));
    
    const coursesSnap = await getDocs(collection(db, 'courses'));
    setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
    setLoading(false);
  }

  const seedData = async () => {
    if (!confirm('Deseja carregar dados de exemplo?')) return;
    try {
      const schoolsData = [
        { name: 'SESI Ibura', city: 'Recife', active: true },
        { name: 'SESI Paulista', city: 'Paulista', active: true },
        { name: 'SESI Caruaru', city: 'Caruaru', active: true }
      ];
      for (const s of schoolsData) await addDoc(collection(db, 'schools'), s);

      const coursesData = [
        { name: 'Ensino Fundamental – Anos Iniciais', levels: ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'] },
        { name: 'Ensino Fundamental – Anos Finais', levels: ['6º Ano', '7º Ano', '8º Ano', '9º Ano'] },
        { name: 'Ensino Médio', levels: ['1ª Série', '2ª Série', '3ª Série'] }
      ];
      for (const c of coursesData) await addDoc(collection(db, 'courses'), c);
      
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'schools'), schoolForm);
      setSchoolForm({ name: '', city: '', active: true });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const levels = courseForm.levels.split(',').map(l => l.trim()).filter(l => l !== '');
      await addDoc(collection(db, 'courses'), { name: courseForm.name, levels });
      setCourseForm({ name: '', levels: '' });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const toggleSchoolActive = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'schools', id), { active: !current });
      setSchools(schools.map(s => s.id === id ? { ...s, active: !current } : s));
    } catch (err) { console.error(err); }
  };

  const deleteItem = async (type: 'schools' | 'courses', id: string) => {
    if (!confirm('Tem certeza? Isso pode afetar os leads existentes.')) return;
    try {
      await deleteDoc(doc(db, type, id));
      fetchData();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Unidades & Cursos</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuração da rede SESI Pernambuco</p>
        </div>
        <div>
            {schools.length === 0 && (
                <button 
                    onClick={seedData}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-sm"
                >
                    <Plus size={14} /> Carregar Dados Iniciais
                </button>
            )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Schools Management */}
        <section className="space-y-6">
          <div className="flex justify-between items-end border-b border-slate-100 pb-2">
            <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tighter italic">Unidades Operacionais</h2>
                <p className="text-[10px] text-slate-400">Escolas que aparecerão na landing page</p>
            </div>
          </div>

          <form onSubmit={handleAddSchool} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Escola</label>
                <input required value={schoolForm.name} onChange={e => setSchoolForm({...schoolForm, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-xs bg-slate-50 outline-none focus:border-sesi-blue" placeholder="Ex: SESI Ibura" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Cidade</label>
                <input required value={schoolForm.city} onChange={e => setSchoolForm({...schoolForm, city: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-xs bg-slate-50 outline-none focus:border-sesi-blue" placeholder="Recife" />
              </div>
            </div>
            <button className="w-full bg-sesi-blue text-white py-2.5 rounded text-[10px] font-bold uppercase tracking-widest hover:brightness-110 shadow-sm transition-all flex items-center justify-center gap-2">
              <Plus size={14} /> Adicionar Unidade
            </button>
          </form>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-5 py-3">Unidade / Local</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Controles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 italic">
                {schools.map(s => (
                  <tr key={s.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800">{s.name}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-tighter">{s.city}, Pernambuco</div>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => toggleSchoolActive(s.id, s.active)}>
                        {s.active ? (
                          <span className="flex items-center gap-1.5 text-green-600 font-bold uppercase text-[9px] tracking-wide border border-green-100 bg-green-50 px-2 py-0.5 rounded">
                            Ativa
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[9px] tracking-wide border border-slate-200 bg-slate-100 px-2 py-0.5 rounded">
                            Inativa
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => deleteItem('schools', s.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Courses Management */}
        <section className="space-y-6">
          <div className="flex justify-between items-end border-b border-slate-100 pb-2">
            <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tighter italic">Níveis Educacionais</h2>
                <p className="text-[10px] text-slate-400">Configuração de cursos e séries</p>
            </div>
          </div>

          <form onSubmit={handleAddCourse} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Nível / Curso</label>
              <input required value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-xs bg-slate-50 outline-none focus:border-sesi-blue" placeholder="Ex: Ensino Médio" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Séries (separadas por vírgula)</label>
              <textarea required value={courseForm.levels} onChange={e => setCourseForm({...courseForm, levels: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-xs bg-slate-50 outline-none focus:border-sesi-blue" placeholder="1º Ano, 2º Ano, 3º Ano" rows={2} />
            </div>
            <button className="w-full bg-sesi-blue text-white py-2.5 rounded text-[10px] font-bold uppercase tracking-widest hover:brightness-110 shadow-sm transition-all flex items-center justify-center gap-2">
              <Plus size={14} /> Adicionar Nível
            </button>
          </form>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-5 py-3">Curso / Séries</th>
                  <th className="px-5 py-3 text-right">Controles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map(c => (
                  <tr key={c.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800 uppercase tracking-tight text-[11px] mb-2">{c.name}</div>
                      <div className="flex flex-wrap gap-1">
                        {c.levels.map(l => (
                          <span key={l} className="text-[9px] bg-white border border-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-400 uppercase tracking-tighter">{l}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => deleteItem('courses', c.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
