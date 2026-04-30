import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { School, Course, CourseType } from '../../types';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  School as SchoolIcon, 
  Layers, 
  ChevronLeft, 
  Building2, 
  BookOpen, 
  ArrowRight,
  Save,
  Wand2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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

type Step = 'identity' | 'offer' | 'review';

export default function AdminSchools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Flow State
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [activeStep, setActiveStep] = useState<Step>('identity');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  // Form states
  const [schoolForm, setSchoolForm] = useState({ name: '', city: '', active: true, courseIds: [] as string[] });

  // Course Form Structured (Template Creation)
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
      const [schoolsSnap, coursesSnap] = await Promise.all([
        getDocs(collection(db, 'schools')),
        getDocs(collection(db, 'courses'))
      ]);
      setSchools(schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School)));
      setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const startConfiguration = (school?: School) => {
    if (school) {
      setSelectedSchoolId(school.id);
      setSchoolForm({
        name: school.name,
        city: school.city,
        active: school.active,
        courseIds: school.courseIds || []
      });
    } else {
      setSelectedSchoolId(null);
      setSchoolForm({ name: '', city: '', active: true, courseIds: [] });
    }
    setIsConfiguring(true);
    setActiveStep('identity');
  };

  const handleSaveSchool = async () => {
    setLoading(true);
    try {
      if (selectedSchoolId) {
        await updateDoc(doc(db, 'schools', selectedSchoolId), schoolForm);
      } else {
        await addDoc(collection(db, 'schools'), schoolForm);
      }
      await fetchData();
      setIsConfiguring(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let name = courseForm.type as string;
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

  const toggleSchoolActive = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'schools', id), { active: !current });
      setSchools(schools.map(s => s.id === id ? { ...s, active: !current } : s));
    } catch (err) { console.error(err); }
  };

  if (loading && !isConfiguring) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-sesi-blue border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando Rede SESI...</p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl animate-in fade-in duration-500 pb-20">
      
      {!isConfiguring ? (
        <>
          {/* Dashboard View - List of units */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight italic uppercase">Unidades Operacionais</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">Gerencie as escolas e suas ofertas educacionais</p>
            </div>
            <div className="flex gap-3">
                <button 
                  onClick={() => setShowTemplateManager(!showTemplateManager)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"
                >
                  <Layers size={14} /> Templates {showTemplateManager ? '▲' : '▼'}
                </button>
                <button 
                  onClick={() => startConfiguration()}
                  className="flex items-center gap-2 px-6 py-2 bg-sesi-red text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:brightness-110 shadow-lg shadow-sesi-red/20 transition-all"
                >
                  <Plus size={16} /> Nova Unidade
                </button>
            </div>
          </div>

          <AnimatePresence>
            {showTemplateManager && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid lg:grid-cols-2 gap-8 bg-slate-50/50 p-6 rounded-2xl border border-dashed border-slate-300 mb-10">
                  <div className="space-y-4">
                    <div className="border-l-4 border-sesi-red pl-3">
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-tighter">Criar Novo Template de Curso</h3>
                      <p className="text-[10px] text-slate-400">Defina níveis para usar em várias unidades</p>
                    </div>
                    
                    <form onSubmit={handleCreateTemplate} className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400">Tipo de Nível</label>
                          <select 
                            required 
                            value={courseForm.type} 
                            onChange={e => setCourseForm({...courseForm, type: e.target.value as CourseType})} 
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none focus:border-sesi-blue font-bold"
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
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none focus:border-sesi-blue font-bold"
                            >
                              <option value="">Selecione o Itinerário</option>
                              {TECHNICAL_ITINERARIES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-slate-400">Séries / Anos Incluídos</label>
                          <div className="flex flex-wrap gap-2">
                            {DEFAULT_GRADES[courseForm.type].map(grade => (
                              <label key={grade} className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                  type="checkbox" 
                                  checked={courseForm.selectedLevels.includes(grade)}
                                  onChange={(e) => {
                                    if (e.target.checked) setCourseForm(prev => ({ ...prev, selectedLevels: [...prev.selectedLevels, grade] }));
                                    else setCourseForm(prev => ({ ...prev, selectedLevels: prev.selectedLevels.filter(g => g !== grade) }));
                                  }}
                                  className="rounded border-slate-300 text-sesi-blue focus:ring-sesi-blue" 
                                />
                                <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">{grade}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <button 
                          className="w-full bg-slate-800 text-white py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={14} /> Registrar Template
                        </button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="border-l-4 border-slate-300 pl-3">
                        <h3 className="text-xs font-black uppercase text-slate-800 tracking-tighter">Templates Disponíveis</h3>
                        <p className="text-[10px] text-slate-400">Cursos registrados no sistema</p>
                      </div>
                      {courses.length === 0 && (
                        <button onClick={seedData} className="text-[9px] font-bold uppercase text-sesi-red hover:underline">Carregar Padrões</button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {courses.map(c => (
                        <div key={c.id} className="group p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center transition-all">
                          <div>
                            <div className="font-bold text-slate-800 uppercase tracking-tighter text-[10px]">{c.name}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {c.levels.map(l => (
                                <span key={l} className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">{l}</span>
                              ))}
                            </div>
                          </div>
                          <button onClick={() => deleteItem('courses', c.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {courses.length === 0 && <p className="text-[10px] text-slate-400 italic text-center p-8">Nenhum template cadastrado.</p>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {schools.map(school => (
              <motion.div 
                layout
                key={school.id} 
                className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-sesi-blue/30 transition-all overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                      <SchoolIcon className="text-slate-400 group-hover:text-sesi-blue" size={24} />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => toggleSchoolActive(school.id, school.active)}
                          className={cn(
                            "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border transition-all",
                            school.active ? "bg-green-50 text-green-600 border-green-100" : "bg-slate-100 text-slate-400 border-slate-200"
                          )}
                        >
                          {school.active ? 'Ativa' : 'Pausada'}
                        </button>
                        <button onClick={() => deleteItem('schools', school.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-1">{school.name}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">{school.city}</p>

                  <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="flex -space-x-2">
                          {(school.courseIds?.slice(0, 3) || []).map(cid => (
                            <div key={cid} title={courses.find(c => c.id === cid)?.name} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500">
                               {courses.find(c => c.id === cid)?.name?.charAt(0) || '?'}
                            </div>
                          ))}
                          {(school.courseIds?.length || 0) > 3 && (
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-800 text-[8px] font-bold text-white flex items-center justify-center">
                              +{(school.courseIds?.length || 0) - 3}
                            </div>
                          )}
                       </div>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">
                          {school.courseIds?.length || 0} níveis vinculados
                       </span>
                    </div>
                    <button 
                      onClick={() => startConfiguration(school)}
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-sesi-blue hover:gap-2 transition-all"
                    >
                      Configurar <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Empty State / Add New Dash */}
            <button 
              onClick={() => startConfiguration()}
              className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-sesi-blue hover:text-sesi-blue transition-all group lg:min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center mb-4 group-hover:border-sesi-blue group-hover:scale-110 transition-all">
                <Plus size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Nova Unidade</span>
            </button>
          </div>
        </>
      ) : (
        /* Configuration Wizard Mode */
        <div className="max-w-4xl mx-auto">
          {/* Header context */}
          <div className="flex items-center justify-between mb-10">
            <button 
              onClick={() => setIsConfiguring(false)}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-800 transition-colors text-[10px] font-bold uppercase tracking-widest"
            >
              <ChevronLeft size={16} /> Voltar ao Painel
            </button>
            <div className="text-right">
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Configurando Unidade</span>
               <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">{schoolForm.name || 'Nova Unidade'}</h2>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-between mb-12 relative px-4">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 -z-10 mx-auto max-w-[80%]" />
            
            {[
              { id: 'identity', label: 'Unidade', icon: Building2 },
              { id: 'offer', label: 'Oferta', icon: BookOpen },
              { id: 'review', label: 'Resumo', icon: CheckCircle }
            ].map((s, idx) => (
              <div key={s.id} className="flex flex-col items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all duration-500",
                  activeStep === s.id && "bg-sesi-blue border-sesi-blue text-white shadow-lg shadow-sesi-blue/30 scale-110",
                  idx < ['identity', 'offer', 'review'].indexOf(activeStep) && "bg-green-500 border-green-500 text-white",
                  idx > ['identity', 'offer', 'review'].indexOf(activeStep) && "bg-white border-slate-100 text-slate-300"
                )}>
                  <s.icon size={18} />
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  activeStep === s.id ? "text-sesi-blue" : "text-slate-400"
                )}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[450px]">
             <div className="p-8 md:p-12">
               <AnimatePresence mode="wait">
                 {activeStep === 'identity' && (
                   <motion.div 
                     key="identity"
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -20 }}
                     className="space-y-8"
                   >
                     <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Dados da Unidade</h3>
                        <p className="text-xs text-slate-500">Identificação básica da escola Pernambucana</p>
                     </div>

                     <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome da Escola</label>
                          <input 
                            value={schoolForm.name} 
                            onChange={e => setSchoolForm({...schoolForm, name: e.target.value})}
                            className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:bg-white focus:border-sesi-blue transition-all outline-none"
                            placeholder="Ex: SESI Ibura"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cidade</label>
                          <input 
                            value={schoolForm.city} 
                            onChange={e => setSchoolForm({...schoolForm, city: e.target.value})}
                            className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:bg-white focus:border-sesi-blue transition-all outline-none"
                            placeholder="Ex: Recife"
                          />
                        </div>
                     </div>

                     <div className="flex items-center gap-4 p-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
                        <div className={cn(
                          "w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300",
                          schoolForm.active ? "bg-green-500" : "bg-slate-300"
                        )} onClick={() => setSchoolForm({...schoolForm, active: !schoolForm.active})}>
                           <div className={cn(
                             "w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-sm",
                             schoolForm.active && "translate-x-6"
                           )} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black uppercase text-slate-800 tracking-tighter">Status da Unidade: {schoolForm.active ? 'Ativa' : 'Inativa'}</p>
                           <p className="text-[9px] text-slate-400 font-medium italic">Define se a escola aparecerá nos formulários de cadastro de novos alunos</p>
                        </div>
                     </div>

                     <div className="pt-10 flex justify-end">
                        <button 
                          disabled={!schoolForm.name || !schoolForm.city}
                          onClick={() => setActiveStep('offer')}
                          className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all disabled:opacity-30 disabled:cursor-not-allowed group shadow-lg shadow-slate-200"
                        >
                          Ir para Oferta Educacional <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                     </div>
                   </motion.div>
                 )}

                 {activeStep === 'offer' && (
                   <motion.div 
                     key="offer"
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -20 }}
                     className="space-y-8"
                   >
                     <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Níveis de ensino disponíveis</h3>
                        <p className="text-xs text-slate-500">Selecione quais templates de curso a unidade {schoolForm.name} oferece</p>
                     </div>

                     <div className="grid sm:grid-cols-2 gap-4">
                        {courses.length === 0 ? (
                           <div className="col-span-2 p-12 text-center rounded-2xl border-2 border-dashed border-slate-100 space-y-4">
                              <AlertCircle size={32} className="mx-auto text-amber-500" />
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Nenhum template de curso cadastrado.</p>
                              <button onClick={() => { setIsConfiguring(false); setShowTemplateManager(true); }} className="text-[10px] text-sesi-blue font-black uppercase tracking-widest bg-blue-50 px-6 py-2 rounded-lg border border-blue-100">Criar Templates Primeiro</button>
                           </div>
                        ) : (
                          courses.map(course => (
                            <div 
                              key={course.id}
                              onClick={() => toggleCourseSelection(course.id)}
                              className={cn(
                                "relative p-5 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.02]",
                                schoolForm.courseIds.includes(course.id)
                                  ? "bg-sesi-blue border-sesi-blue text-white shadow-xl shadow-sesi-blue/20"
                                  : "bg-white border-slate-100 text-slate-600 hover:border-slate-200 shadow-sm"
                              )}
                            >
                               <div className="flex justify-between items-start">
                                 <div>
                                   <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1", schoolForm.courseIds.includes(course.id) ? "text-blue-100" : "text-slate-400")}>
                                      {course.type}
                                   </p>
                                   <p className="text-sm font-black uppercase tracking-tighter leading-tight italic">{course.name}</p>
                                 </div>
                                 <div className={cn(
                                   "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                   schoolForm.courseIds.includes(course.id) ? "bg-white border-white text-sesi-blue" : "bg-white border-slate-200 text-transparent"
                                 )}>
                                   <CheckCircle size={14} className="fill-current" />
                                 </div>
                               </div>
                               <div className="mt-4 flex flex-wrap gap-1">
                                 {course.levels.map(l => (
                                   <span key={l} className={cn(
                                     "text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter",
                                     schoolForm.courseIds.includes(course.id) ? "bg-white/20 text-white" : "bg-slate-50 text-slate-400 border border-slate-100"
                                   )}>{l}</span>
                                 ))}
                               </div>
                            </div>
                          ))
                        )}
                     </div>

                     <div className="pt-10 flex justify-between">
                        <button 
                          onClick={() => setActiveStep('identity')}
                          className="flex items-center gap-2 px-6 py-3 text-slate-400 hover:text-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <ChevronLeft size={16} /> Voltar
                        </button>
                        <button 
                          disabled={schoolForm.courseIds.length === 0}
                          onClick={() => setActiveStep('review')}
                          className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all disabled:opacity-30 group shadow-lg"
                        >
                          Revisar Configuração <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                     </div>
                   </motion.div>
                 )}

                 {activeStep === 'review' && (
                    <motion.div 
                      key="review"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="space-y-10"
                    >
                      <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
                           <CheckCircle size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Resumo Final</h3>
                        <p className="text-xs text-slate-500">Tudo pronto para publicar a unidade {schoolForm.name}</p>
                      </div>

                      <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-200 shadow-inner space-y-6">
                        <div className="grid grid-cols-2 gap-8 border-b border-slate-200 pb-6">
                           <div>
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">IDENTIDADE</p>
                              <p className="text-lg font-black text-slate-800 uppercase italic leading-none">{schoolForm.name}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">{schoolForm.city}, Pernambuco</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">STATUS</p>
                              <div className="flex items-center gap-2">
                                 <div className={cn("w-3 h-3 rounded-full animate-pulse", schoolForm.active ? "bg-green-500" : "bg-slate-300")} />
                                 <p className="text-[11px] font-black uppercase text-slate-800">{schoolForm.active ? 'Unidade Online' : 'Unidade em Pausa'}</p>
                              </div>
                           </div>
                        </div>

                        <div>
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">PORTFÓLIO VINCULADO ({schoolForm.courseIds.length})</p>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                              {schoolForm.courseIds.map(cid => {
                                 const course = courses.find(c => c.id === cid);
                                 return (
                                   <div key={cid} className="flex justify-between items-center py-2 border-b border-slate-100 group">
                                      <p className="text-[10px] font-black text-slate-600 uppercase italic truncate pr-4">{course?.name}</p>
                                      <div className="flex gap-0.5">
                                         <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">{course?.levels.length} séries</span>
                                      </div>
                                   </div>
                                 )
                              })}
                           </div>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-between items-center">
                        <button 
                          onClick={() => setActiveStep('offer')}
                          className="flex items-center gap-2 px-6 py-3 text-slate-400 hover:text-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <ChevronLeft size={16} /> Ajustar Oferta
                        </button>
                        <button 
                          onClick={handleSaveSchool}
                          className="flex items-center gap-3 px-12 py-5 bg-sesi-red text-white rounded-2xl text-[14px] font-black uppercase tracking-widest hover:brightness-110 shadow-2xl shadow-sesi-red/40 transition-all active:scale-95 group"
                        >
                          <Save size={20} /> Salvar e Ativar Unidade
                        </button>
                      </div>
                    </motion.div>
                 )}
               </AnimatePresence>
             </div>
          </div>
          
          <div className="mt-12 flex items-center gap-3 justify-center text-slate-400 opacity-60">
             <Wand2 size={14} className="text-sesi-blue" />
             <p className="text-[10px] font-black uppercase tracking-widest italic animate-pulse">Assistente de Configuração Inteligente SESI Rede</p>
          </div>
        </div>
      )}
    </div>
  );
}
