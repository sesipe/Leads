import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
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
  AlertCircle,
  GraduationCap,
  PlusCircle,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const COURSE_TYPES: CourseType[] = ['Ensino Fundamental – Anos Iniciais', 'Ensino Fundamental – Anos Finais', 'Ensino Médio'];

const DEFAULT_GRADES: Record<CourseType, string[]> = {
  'Ensino Fundamental – Anos Iniciais': ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'],
  'Ensino Fundamental – Anos Finais': ['6º Ano', '7º Ano', '8º Ano', '9º Ano'],
  'Ensino Médio': ['1º Ano', '2º Ano', '3º Ano']
};

const TECHNICAL_ITINERARIES = [
  'Desenvolvimento de Sistemas',
  'Eletromecânica',
  'Eletrotécnica',
  'Segurança do Trabalho',
  'Jogos Digitais'
];

type Step = 'identity' | 'structure' | 'review';

export default function AdminSchools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Flow State
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [activeStep, setActiveStep] = useState<Step>('identity');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  // Form states
  const [schoolForm, setSchoolForm] = useState({ name: '', city: '', active: true, courseIds: [] as string[] });

  // Course Builder Form (Internal state during wizard)
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [courseBuilder, setCourseBuilder] = useState({
    type: 'Ensino Fundamental – Anos Iniciais' as CourseType,
    selectedLevels: [] as string[],
    itinerary: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Sync default grades when type changes in builder
    setCourseBuilder(prev => ({
      ...prev,
      selectedLevels: DEFAULT_GRADES[prev.type]
    }));
  }, [courseBuilder.type]);

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
  }

  // Logic to find or create a course matching the current builder configuration
  const findOrCreateCourseInOffer = async () => {
    try {
      let displayName = courseBuilder.type as string;
      if (courseBuilder.type === 'Ensino Médio') {
        const typePrefix = courseBuilder.itinerary ? 'Técnico em' : 'Ensino Médio';
        const suffix = courseBuilder.itinerary ? courseBuilder.itinerary : 'Regular';
        displayName = `${typePrefix} ${suffix}`;
      }

      // Check if this specific configuration already exists in our registry
      const existing = courses.find(c => 
        c.type === courseBuilder.type && 
        c.itinerary === (courseBuilder.itinerary || null) &&
        JSON.stringify(c.levels.sort()) === JSON.stringify(courseBuilder.selectedLevels.sort())
      );

      let courseId = '';
      if (existing) {
        courseId = existing.id;
      } else {
        const newDoc = await addDoc(collection(db, 'courses'), {
          name: displayName,
          type: courseBuilder.type,
          levels: courseBuilder.selectedLevels,
          itinerary: courseBuilder.itinerary || null
        });
        courseId = newDoc.id;
        // Update local courses state
        const freshCoursesSnap = await getDocs(collection(db, 'courses'));
        setCourses(freshCoursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
      }

      // Link to school
      setSchoolForm(prev => {
        if (prev.courseIds.includes(courseId)) return prev;
        return { ...prev, courseIds: [...prev.courseIds, courseId] };
      });
      setIsAddingCourse(false);
    } catch (err) {
      console.error(err);
    }
  };

  const removeCourseFromSchool = (id: string) => {
    setSchoolForm(prev => ({
      ...prev,
      courseIds: prev.courseIds.filter(cid => cid !== id)
    }));
  };

  const toggleSchoolActive = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'schools', id), { active: !current });
      setSchools(schools.map(s => s.id === id ? { ...s, active: !current } : s));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSchool = async (id: string) => {
    if (!confirm('Excluir unidade? Leads associados podem perder o vínculo.')) return;
    try {
      await deleteDoc(doc(db, 'schools', id));
      fetchData();
    } catch (err) { console.error(err); }
  };

  if (loading && !isConfiguring) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-sesi-blue border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse italic">Acessando Rede de Unidades...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {!isConfiguring ? (
        <>
          {/* Main List Management */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Administração de Unidades</h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">SESI Pernambuco • Configuração de Matrícula</p>
            </div>
            <button 
              onClick={() => startConfiguration()}
              className="flex items-center gap-3 px-8 py-3 bg-sesi-red text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:brightness-110 shadow-2xl shadow-sesi-red/30 transition-all active:scale-95"
            >
                <Building2 size={18} /> Criar Nova Unidade
            </button>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {schools.map(school => (
              <motion.div 
                layout
                key={school.id} 
                className="group bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all overflow-hidden"
              >
                <div className="p-7">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                      <SchoolIcon className="text-slate-400 group-hover:text-sesi-blue transition-colors" size={24} />
                    </div>
                    <div className="flex gap-2">
                        <button 
                          onClick={() => toggleSchoolActive(school.id, school.active)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                            school.active ? "bg-green-50 text-green-600 border-green-100" : "bg-slate-100 text-slate-400 border-slate-200"
                          )}
                        >
                          {school.active ? 'Ativa' : 'Pausa'}
                        </button>
                        <button onClick={() => deleteSchool(school.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={18} />
                        </button>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{school.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{school.city}, PE</p>

                  <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none mb-1">Oferta Ativa</span>
                       <span className="text-sm font-black text-sesi-blue uppercase tracking-tighter">
                          {school.courseIds?.length || 0} Nível(is)
                       </span>
                    </div>
                    <button 
                      onClick={() => startConfiguration(school)}
                      className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm"
                    >
                      Configurar
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        /* GUIDED CONFIGURATION WIZARD */
        <div className="max-w-4xl mx-auto py-4">
          {/* Top Bar Context */}
          <div className="flex items-center justify-between mb-12">
             <button 
                onClick={() => setIsConfiguring(false)}
                className="flex items-center gap-2 text-slate-300 hover:text-slate-600 transition-colors text-[10px] font-black uppercase tracking-widest"
             >
                <ChevronLeft size={16} /> Voltar ao Painel
             </button>
             <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block opacity-60">Configuração de Unidade</span>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic drop-shadow-sm">
                   {schoolForm.name || 'Nova Unidade'}
                </h2>
             </div>
          </div>

          {/* Stepper Progress */}
          <div className="px-10 mb-16 relative">
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-100 -translate-y-1/2 -z-10" />
            <div className="flex justify-between">
                {[
                  { id: 'identity', label: 'Unidade', icon: Building2 },
                  { id: 'structure', label: 'Ofertas', icon: GraduationCap },
                  { id: 'review', label: 'Resumo', icon: CheckCircle }
                ].map((s, idx) => {
                  const isActive = activeStep === s.id;
                  const isDone = ['identity', 'structure', 'review'].indexOf(activeStep) > idx;
                  return (
                    <div key={s.id} className="flex flex-col items-center gap-3">
                       <div className={cn(
                         "w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-300",
                         isActive ? "bg-sesi-red border-sesi-red text-white scale-110 shadow-xl shadow-sesi-red/30" : 
                         isDone ? "bg-green-500 border-green-500 text-white" : "bg-white border-slate-100 text-slate-300"
                       )}>
                          {isDone ? <CheckCircle size={20} /> : <s.icon size={20} />}
                       </div>
                       <span className={cn(
                         "text-[9px] font-black uppercase tracking-widest",
                         isActive ? "text-slate-900" : "text-slate-300"
                       )}>{s.label}</span>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Step Content Card */}
          <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden min-h-[500px]">
            <div className="p-8 md:p-14">
               <AnimatePresence mode="wait">
                 
                 {/* STEP 1: IDENTITY */}
                 {activeStep === 'identity' && (
                   <motion.div 
                     key="identity"
                     initial={{ opacity: 0, scale: 0.98 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.98 }}
                     className="space-y-10"
                   >
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">1. Identificação da Unidade</h3>
                        <p className="text-sm text-slate-400 font-medium italic">Como esta escola será apresentada aos responsáveis?</p>
                     </div>

                     <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome Oficial da Escola</label>
                           <input 
                             value={schoolForm.name} 
                             onChange={e => setSchoolForm({...schoolForm, name: e.target.value})}
                             className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-base font-bold focus:bg-white focus:border-sesi-blue outline-none transition-all shadow-inner"
                             placeholder="Ex: SESI Paulista"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Município de Atuação</label>
                           <input 
                             value={schoolForm.city} 
                             onChange={e => setSchoolForm({...schoolForm, city: e.target.value})}
                             className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-base font-bold focus:bg-white focus:border-sesi-blue outline-none transition-all shadow-inner"
                             placeholder="Ex: Paulista"
                           />
                        </div>
                     </div>

                     <div className="p-8 bg-slate-50/50 rounded-[30px] border border-dashed border-slate-200 flex items-center justify-between">
                        <div className="max-w-[70%]">
                           <p className="text-sm font-black text-slate-800 uppercase italic">Disponibilidade Inicial</p>
                           <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Se ativada, a unidade aparecerá imediatamente no formulário de reserva para novos alunos.</p>
                        </div>
                        <button 
                          onClick={() => setSchoolForm({...schoolForm, active: !schoolForm.active})}
                          className={cn(
                            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                            schoolForm.active ? "bg-sesi-blue text-white border-sesi-blue shadow-lg shadow-sesi-blue/20" : "bg-white text-slate-400 border-slate-200"
                          )}
                        >
                          {schoolForm.active ? 'Ativa' : 'Pausada'}
                        </button>
                     </div>

                     <div className="pt-10 flex justify-end">
                        <button 
                          disabled={!schoolForm.name || !schoolForm.city}
                          onClick={() => setActiveStep('structure')}
                          className="flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-20 shadow-xl group"
                        >
                          Próxima Etapa: Estrutura <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                     </div>
                   </motion.div>
                 )}

                 {/* STEP 2: STRUCTURE (THE BUILDER) */}
                 {activeStep === 'structure' && (
                    <motion.div 
                      key="structure"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">2. Ofertas Disponíveis</h3>
                           <p className="text-sm text-slate-400 font-medium italic">Configure os níveis de ensino e cursos técnicos oferecidos nesta escola.</p>
                        </div>
                        {!isAddingCourse && (
                           <button 
                             onClick={() => setIsAddingCourse(true)}
                             className="flex items-center gap-2 text-sesi-blue font-black uppercase text-[10px] tracking-widest bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all border border-blue-100"
                           >
                             <PlusCircle size={16} /> Adicionar Nível/Curso
                           </button>
                        )}
                      </div>

                      {isAddingCourse ? (
                         /* INLINE BUILDER */
                         <div className="bg-slate-50 rounded-[30px] p-8 border border-slate-200 animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center mb-10 border-b border-slate-200 pb-4">
                               <h4 className="text-xs font-black uppercase text-slate-800 tracking-widest flex items-center gap-2">
                                  <GraduationCap size={18} className="text-sesi-red" /> Novo Nível para {schoolForm.name}
                               </h4>
                               <button onClick={() => setIsAddingCourse(false)} className="text-slate-300 hover:text-slate-600">
                                  <X size={20} />
                               </button>
                            </div>

                            <div className="space-y-8">
                               {/* Part A: Escolha o Nível */}
                               <div className="space-y-3">
                                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                     <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span> Escolha o Nível de Ensino
                                  </label>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                     {COURSE_TYPES.map(type => (
                                       <button 
                                          key={type}
                                          type="button"
                                          onClick={() => setCourseBuilder({...courseBuilder, type, itinerary: '', selectedLevels: DEFAULT_GRADES[type]})}
                                          className={cn(
                                            "px-4 py-4 rounded-2xl border-2 text-[10px] font-black uppercase transition-all text-center leading-tight",
                                            courseBuilder.type === type ? "bg-sesi-blue border-sesi-blue text-white shadow-lg" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                          )}
                                       >
                                          {type}
                                       </button>
                                     ))}
                                  </div>
                               </div>

                               {/* Part B: Escolha o Itinerário (Somente Ensino Médio) */}
                               {courseBuilder.type === 'Ensino Médio' && (
                                 <div className="space-y-3 pt-4 border-t border-slate-200 border-dashed animate-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                       <span className="w-5 h-5 rounded-full bg-sesi-red text-white flex items-center justify-center text-[10px]">2</span> Categoria do Ensino Médio
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                       <button 
                                          type="button"
                                          onClick={() => setCourseBuilder({...courseBuilder, itinerary: ''})}
                                          className={cn(
                                            "px-4 py-3 rounded-2xl border-2 text-[10px] font-black uppercase transition-all text-left",
                                            !courseBuilder.itinerary ? "bg-sesi-red border-sesi-red text-white shadow-lg" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                          )}
                                       >
                                          Regular (Base Nacional Comum)
                                       </button>
                                       <div className="relative group">
                                          <select 
                                            value={courseBuilder.itinerary}
                                            onChange={(e) => setCourseBuilder({...courseBuilder, itinerary: e.target.value})}
                                            className={cn(
                                              "w-full px-4 py-3 rounded-2xl border-2 text-[10px] font-black uppercase appearance-none outline-none transition-all",
                                              courseBuilder.itinerary ? "bg-sesi-red border-sesi-red text-white shadow-lg" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 focus:border-sesi-red"
                                            )}
                                          >
                                            <option value="" className="text-slate-800">Selecione um Itinerário Técnico...</option>
                                            {TECHNICAL_ITINERARIES.map(it => (
                                              <option key={it} value={it} className="text-slate-800">Técnico em {it}</option>
                                            ))}
                                          </select>
                                          {!courseBuilder.itinerary && <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">▼</div>}
                                       </div>
                                    </div>
                                 </div>
                               )}

                               {/* Part C: Escolha as Séries */}
                               <div className="space-y-3 pt-4 border-t border-slate-200 border-dashed">
                                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                     <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                                        {courseBuilder.type === 'Ensino Médio' ? '3' : '2'}
                                     </span> 
                                     Séries Disponíveis para este {courseBuilder.itinerary ? 'Itinerário' : 'Nível'}
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                     {DEFAULT_GRADES[courseBuilder.type].map(grade => (
                                       <button 
                                          key={grade}
                                          type="button"
                                          onClick={() => {
                                             if (courseBuilder.selectedLevels.includes(grade)) {
                                                setCourseBuilder(prev => ({ ...prev, selectedLevels: prev.selectedLevels.filter(g => g !== grade) }));
                                             } else {
                                                setCourseBuilder(prev => ({ ...prev, selectedLevels: [...prev.selectedLevels, grade] }));
                                             }
                                          }}
                                          className={cn(
                                            "px-4 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all",
                                            courseBuilder.selectedLevels.includes(grade) ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                          )}
                                       >
                                          {grade}
                                       </button>
                                     ))}
                                  </div>
                                  <p className="text-[9px] text-slate-400 italic">Você pode criar ofertas individuais (ex: apenas 1º ano) para itinerários diferentes.</p>
                               </div>

                               <div className="pt-6">
                                  <button 
                                    type="button"
                                    disabled={courseBuilder.selectedLevels.length === 0}
                                    onClick={findOrCreateCourseInOffer}
                                    className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-20"
                                  >
                                     <PlusCircle size={18} /> Adicionar esta Oferta à Unidade
                                  </button>
                               </div>
                            </div>
                         </div>
                      ) : (
                         /* LIST OF ADDED OFFERS */
                         <div className="space-y-4">
                            {schoolForm.courseIds.length === 0 ? (
                               <div className="p-20 text-center rounded-[30px] border-2 border-dashed border-slate-100">
                                  < GraduationCap size={48} className="mx-auto text-slate-100 mb-6" />
                                  <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest max-w-xs mx-auto">Nenhum nível educacional configurado para esta unidade ainda.</p>
                                  <button onClick={() => setIsAddingCourse(true)} className="mt-8 text-sesi-blue font-black uppercase text-[10px] tracking-widest border-b border-sesi-blue pb-1 hover:brightness-125 transition-all">Começar Configuração</button>
                               </div>
                            ) : (
                               <div className="grid gap-4">
                                  {schoolForm.courseIds.map(cid => {
                                     const course = courses.find(c => c.id === cid);
                                     if (!course) return null;
                                     return (
                                       <div key={cid} className="group p-6 bg-white border border-slate-100 rounded-[24px] shadow-sm hover:shadow-md transition-all flex justify-between items-center">
                                          <div>
                                             <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[8px] font-black uppercase text-slate-300 tracking-[0.1em]">{course.type}</span>
                                                {course.itinerary && <span className="bg-sesi-red/10 text-sesi-red text-[7px] font-black uppercase px-2 py-0.5 rounded-full">Itinerário Técnico</span>}
                                             </div>
                                             <h5 className="text-base font-black text-slate-800 uppercase tracking-tighter italic">{course.name}</h5>
                                             <div className="flex flex-wrap gap-1 mt-3">
                                                {course.levels.map(l => (
                                                  <span key={l} className="text-[8px] bg-slate-50 text-slate-400 px-2 py-1 rounded font-black border border-slate-100">{l}</span>
                                                ))}
                                             </div>
                                          </div>
                                          <button 
                                            onClick={() => removeCourseFromSchool(cid)}
                                            className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                                          >
                                             <Trash2 size={20} />
                                          </button>
                                       </div>
                                     )
                                  })}
                               </div>
                            )}

                            <div className="pt-20 flex justify-between">
                               <button 
                                 onClick={() => setActiveStep('identity')}
                                 className="flex items-center gap-2 px-8 py-3 text-slate-300 hover:text-slate-600 transition-colors text-[10px] font-black uppercase tracking-widest"
                               >
                                  <ChevronLeft size={16} /> Ajustar Unidade
                               </button>
                               <button 
                                 disabled={schoolForm.courseIds.length === 0}
                                 onClick={() => setActiveStep('review')}
                                 className="flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-black shadow-xl group disabled:opacity-20 transition-all"
                               >
                                 Próximo: Revisar Resumo <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                               </button>
                            </div>
                         </div>
                      )}
                    </motion.div>
                 )}

                 {/* STEP 3: REVIEW */}
                 {activeStep === 'review' && (
                    <motion.div 
                      key="review"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="space-y-10"
                    >
                      <div className="text-center">
                         <div className="w-20 h-20 bg-green-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30">
                            <CheckCircle size={32} />
                         </div>
                         <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Resumo Estrutural</h3>
                         <p className="text-sm text-slate-400 font-medium italic">Confirme se as configurações da unidade {schoolForm.name} estão corretas.</p>
                      </div>

                      <div className="bg-slate-900 text-white rounded-[40px] p-10 space-y-10 shadow-2xl">
                         <div className="grid md:grid-cols-2 gap-10 border-b border-white/10 pb-10">
                            <div>
                               <p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.2em] mb-3">Identidade da Unidade</p>
                               <h4 className="text-2xl font-black uppercase italic tracking-tighter">{schoolForm.name}</h4>
                               <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em] mt-1 italic">{schoolForm.city}, PE</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.2em] mb-3">Status de Matrícula</p>
                               <div className="flex items-center gap-3">
                                  <div className={cn("w-3 h-3 rounded-full animate-pulse", schoolForm.active ? "bg-green-500" : "bg-amber-500")} />
                                  <span className="text-sm font-black uppercase italic">{schoolForm.active ? 'Ativa na Rede' : 'Apenas Administrativa'}</span>
                               </div>
                            </div>
                         </div>

                         <div>
                            <p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.2em] mb-6">Grade Educacional Vinculada ({schoolForm.courseIds.length} Níveis)</p>
                            <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6">
                               {schoolForm.courseIds.map(cid => {
                                  const course = courses.find(c => c.id === cid);
                                  return (
                                    <div key={cid} className="flex flex-col border-l-2 border-white/10 pl-6 space-y-1">
                                       <p className="text-[12px] font-black uppercase italic leading-none">{course?.name}</p>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{course?.levels.length} Séries Ativas</p>
                                    </div>
                                  )
                                })}
                            </div>
                         </div>
                      </div>

                      <div className="flex justify-between items-center pt-6">
                         <button 
                            onClick={() => setActiveStep('structure')}
                            className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                         >
                            Alterar Estrutura
                         </button>
                         <button 
                            onClick={handleSaveSchool}
                            className="px-14 py-6 bg-sesi-red text-white rounded-[24px] text-base font-black uppercase tracking-[0.2em] hover:brightness-110 shadow-2xl shadow-sesi-red/40 transition-all active:scale-95 flex items-center gap-4"
                         >
                            <Save size={24} /> Finalizar e Ativar
                         </button>
                      </div>
                    </motion.div>
                 )}

               </AnimatePresence>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center gap-3 text-slate-300 opacity-40">
             <Wand2 size={18} className="text-sesi-blue" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">Gerenciamento Integrado de Estruturas SESI Rede</p>
          </div>
        </div>
      )}
    </div>
  );
}
