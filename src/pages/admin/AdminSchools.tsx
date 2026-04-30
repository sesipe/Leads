import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { School, Course, CourseType } from '../../types';
import { Plus, Trash2, Edit2, CheckCircle, XCircle, ChevronRight, School as SchoolIcon, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';

const COURSE_TYPES: CourseType[] = ['Ensino Fundamental I', 'Ensino Fundamental II', 'Ensino Médio Regular', 'Ensino Médio Técnico'];

const DEFAULT_GRADES: Record<CourseType, string[]> = {
  'Ensino Fundamental I': ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'],
  'Ensino Fundamental II': ['6º Ano', '7º Ano', '8º Ano', '9º Ano'],
  'Ensino Médio Regular': ['1ª Série', '2ª Série', '3ª Série'],
  'Ensino Médio Técnico': ['1ª Série', '2ª Série', '3ª Série']
};

const TECHNICAL_ITINERARIES = [
  'Desenvolvimento de Sistemas',
  'Eletromecânica',
  'Eletrotécnica',
  'Segurança do Trabalho',
  'Jogos Digitais'
];

export default function AdminSchools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [schoolForm, setSchoolForm] = useState({ name: '', city: '', active: true, courseIds: [] as string[] });
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  // Course Form Structured
  const [courseForm, setCourseForm] = useState({
    type: 'Ensino Fundamental I' as CourseType,
    selectedLevels: [] as string[],
    itinerary: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Reset levels when type changes
    setCourseForm(prev => ({
      ...prev,
      selectedLevels: DEFAULT_GRADES[prev.type]
    }));
  }, [courseForm.type]);

  async function fetchData() {
    setLoading(true);
    try {
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      setSchools(schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School)));
      
      const coursesSnap = await getDocs(collection(db, 'courses'));
      setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const seedData = async () => {
    if (!confirm('Deseja carregar a estrutura padrão de cursos (Fundamental I, II e Médio)?')) return;
    try {
      const coursesData: Omit<Course, 'id'>[] = [
        { name: 'Ensino Fundamental I', type: 'Ensino Fundamental I', levels: ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'] },
        { name: 'Ensino Fundamental II', type: 'Ensino Fundamental II', levels: ['6º Ano', '7º Ano', '8º Ano', '9º Ano'] },
        { name: 'Ensino Médio Regular', type: 'Ensino Médio Regular', levels: ['1ª Série', '2ª Série', '3ª Série'] }
      ];

      for (const c of coursesData) {
        await addDoc(collection(db, 'courses'), c);
      }
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedSchoolId) {
        await updateDoc(doc(db, 'schools', selectedSchoolId), schoolForm);
      } else {
        await addDoc(collection(db, 'schools'), schoolForm);
      }
      setSchoolForm({ name: '', city: '', active: true, courseIds: [] });
      setSelectedSchoolId(null);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let name = courseForm.type;
      if (courseForm.type === 'Ensino Médio Técnico' && courseForm.itinerary) {
        name = `Técnico em ${courseForm.itinerary}`;
      }

      await addDoc(collection(db, 'courses'), {
        name,
        type: courseForm.type,
        levels: courseForm.selectedLevels,
        itinerary: courseForm.itinerary || null
      });
      
      setCourseForm({
        type: 'Ensino Fundamental I',
        selectedLevels: DEFAULT_GRADES['Ensino Fundamental I'],
        itinerary: ''
      });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const toggleSchoolActive = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'schools', id), { active: !current });
      setSchools(schools.map(s => s.id === id ? { ...s, active: !current } : s));
    } catch (err) { console.error(err); }
  };

  const toggleCourseSelection = (courseId: string) => {
    setSchoolForm(prev => {
      const ids = prev.courseIds || [];
      if (ids.includes(courseId)) {
        return { ...prev, courseIds: ids.filter(id => id !== courseId) };
      } else {
        return { ...prev, courseIds: [...ids, courseId] };
      }
    });
  };

  const deleteItem = async (type: 'schools' | 'courses', id: string) => {
    if (!confirm('Tem certeza? Isso pode afetar dados vinculados.')) return;
    try {
      await deleteDoc(doc(db, type, id));
      fetchData();
    } catch (err) { console.error(err); }
  };

  const editSchool = (school: School) => {
    setSelectedSchoolId(school.id);
    setSchoolForm({
      name: school.name,
      city: school.city,
      active: school.active,
      courseIds: school.courseIds || []
    });
  };

  if (loading) return <div className="p-8 text-center uppercase text-[10px] font-bold text-slate-400 animate-pulse">Carregando Infraestrutura...</div>;

  return (
    <div className="space-y-10 max-w-7xl pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Unidades & Cursos</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuração da rede SESI Pernambuco</p>
        </div>
        <div>
            {courses.length === 0 && (
                <button 
                    onClick={seedData}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-sm"
                >
                    <Plus size={14} /> Carregar Cursos Iniciais
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
                <p className="text-[10px] text-slate-400">Escolas e seus cursos disponíveis</p>
            </div>
          </div>

          <form onSubmit={handleAddSchool} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
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

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 block border-b border-slate-50 pb-1">Vincular Cursos Disponíveis nesta Unidade</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {courses.length === 0 ? (
                  <p className="text-[9px] text-slate-400 italic">Crie cursos primeiro no formulário ao lado.</p>
                ) : (
                  courses.map(course => (
                    <div 
                      key={course.id} 
                      onClick={() => toggleCourseSelection(course.id)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded border cursor-pointer transition-all",
                        schoolForm.courseIds.includes(course.id) 
                          ? "bg-blue-50 border-sesi-blue text-sesi-blue shadow-sm" 
                          : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-3 h-3 rounded-full border flex items-center justify-center",
                        schoolForm.courseIds.includes(course.id) ? "bg-sesi-blue border-sesi-blue" : "bg-white border-slate-300"
                      )}>
                        {schoolForm.courseIds.includes(course.id) && <CheckCircle size={8} className="text-white" />}
                      </div>
                      <span className="text-[10px] font-medium leading-none truncate">{course.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2">
                <button 
                  type="submit"
                  className="flex-1 bg-sesi-blue text-white py-2.5 rounded text-[10px] font-bold uppercase tracking-widest hover:brightness-110 shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {selectedSchoolId ? <Edit2 size={14} /> : <Plus size={14} />} 
                  {selectedSchoolId ? 'Atualizar Unidade' : 'Adicionar Unidade'}
                </button>
                {selectedSchoolId && (
                  <button 
                    type="button"
                    onClick={() => {
                        setSelectedSchoolId(null);
                        setSchoolForm({ name: '', city: '', active: true, courseIds: [] });
                    }}
                    className="px-4 bg-slate-100 text-slate-400 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    X
                  </button>
                )}
            </div>
          </form>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
                {schools.map(s => (
                  <div key={s.id} className="group p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800 text-sm">{s.name}</h3>
                          <button onClick={() => toggleSchoolActive(s.id, s.active)} className="flex-shrink-0">
                            {s.active ? (
                              <span className="text-green-600 font-bold uppercase text-[8px] tracking-wide border border-green-100 bg-green-50 px-1.5 py-0.5 rounded">Ativa</span>
                            ) : (
                              <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wide border border-slate-200 bg-slate-100 px-1.5 py-0.5 rounded">Inativa</span>
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-tighter italic">{s.city}, Pernambuco</p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => editSchool(s)} className="p-1.5 text-slate-400 hover:text-sesi-blue hover:bg-white rounded transition-all">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteItem('schools', s.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {s.courseIds && s.courseIds.length > 0 ? (
                        s.courseIds.map(cid => {
                          const course = courses.find(c => c.id === cid);
                          if (!course) return null;
                          return (
                            <span key={cid} className="text-[9px] bg-slate-100/50 text-slate-500 px-2 py-0.5 rounded font-medium border border-slate-100">
                              {course.name}
                            </span>
                          )
                        })
                      ) : (
                        <span className="text-[9px] text-slate-300 italic">Nenhum curso vinculado</span>
                      )}
                    </div>
                  </div>
                ))}
                {schools.length === 0 && <div className="p-10 text-center text-slate-300 text-xs italic">Nenhuma unidade cadastrada.</div>}
            </div>
          </div>
        </section>

        {/* Courses Management */}
        <section className="space-y-6">
          <div className="flex justify-between items-end border-b border-slate-100 pb-2">
            <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tighter italic">Definição de Cursos</h2>
                <p className="text-[10px] text-slate-400">Template estruturado de cursos</p>
            </div>
          </div>

          <form onSubmit={handleAddCourse} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Tipo de Nível</label>
              <select 
                required 
                value={courseForm.type} 
                onChange={e => setCourseForm({...courseForm, type: e.target.value as CourseType})} 
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs bg-slate-50 outline-none focus:border-sesi-blue"
              >
                {COURSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {courseForm.type === 'Ensino Médio Técnico' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Itinerário Técnico</label>
                <select 
                  required 
                  value={courseForm.itinerary} 
                  onChange={e => setCourseForm({...courseForm, itinerary: e.target.value})} 
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs bg-slate-50 outline-none focus:border-sesi-blue"
                >
                  <option value="">Selecione o Itinerário</option>
                  {TECHNICAL_ITINERARIES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400">Séries Disponíveis</label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_GRADES[courseForm.type].map(grade => (
                  <label key={grade} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={courseForm.selectedLevels.includes(grade)}
                      onChange={(e) => {
                        if (e.target.checked) setCourseForm(prev => ({ ...prev, selectedLevels: [...prev.selectedLevels, grade] }));
                        else setCourseForm(prev => ({ ...prev, selectedLevels: prev.selectedLevels.filter(g => g !== grade) }));
                      }}
                      className="rounded border-slate-300 text-sesi-blue focus:ring-sesi-blue" 
                    />
                    <span className="text-[10px] font-medium text-slate-600">{grade}</span>
                  </label>
                ))}
              </div>
            </div>

            <button className="w-full bg-sesi-red text-white py-2.5 rounded text-[10px] font-bold uppercase tracking-widest hover:brightness-110 shadow-sm transition-all flex items-center justify-center gap-2">
              <Layers size={14} /> Criar Nível Estruturado
            </button>
          </form>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
                {courses.map(c => (
                  <div key={c.id} className="group p-5 hover:bg-slate-50 transition-colors relative">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-slate-800 uppercase tracking-tight text-[11px]">{c.name}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{c.type}</div>
                      </div>
                      <button onClick={() => deleteItem('courses', c.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {c.levels.map(l => (
                        <span key={l} className="text-[8px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-400 uppercase tracking-tighter shadow-sm">{l}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {courses.length === 0 && <div className="p-10 text-center text-slate-300 text-xs italic">Nenhum nível cadastrado.</div>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
