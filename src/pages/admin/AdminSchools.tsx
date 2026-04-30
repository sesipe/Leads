import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { School, Course, CourseType } from '../../types';
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  ChevronRight, 
  School as SchoolIcon, 
  ChevronLeft, 
  Building2, 
  BookOpen, 
  ArrowRight,
  Save,
  Wand2,
  AlertCircle,
  GraduationCap,
  Settings2,
  Check
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const COURSE_TYPES: CourseType[] = [
  'Ensino Fundamental – Anos Iniciais', 
  'Ensino Fundamental – Anos Finais', 
  'Ensino Médio'
];

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

type WizardStep = 'identity' | 'levels' | 'grades' | 'tech' | 'review';

export default function AdminSchools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Flow State
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [activeStep, setActiveStep] = useState<WizardStep>('identity');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  // Wizard Data State
  const [wizardData, setWizardData] = useState({
    name: '',
    city: '',
    active: true,
    selectedLevels: [] as CourseType[],
    gradesByLevel: {} as Record<CourseType, string[]>,
    techByGrade: {} as Record<string, string[]> // '1º Ano' -> ['Dev Sistemas', 'Eletro']
  });

  useEffect(() => {
    fetchData();
  }, []);

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
      
      // Map existing school courses back to wizard state for editing
      const schoolCourses = courses.filter(c => school.courseIds?.includes(c.id));
      const selectedLevels = Array.from(new Set(schoolCourses.map(c => c.type)));
      const gradesByLevel: Record<string, string[]> = {};
      const techByGrade: Record<string, string[]> = {};

      schoolCourses.forEach(c => {
        gradesByLevel[c.type] = Array.from(new Set([...(gradesByLevel[c.type] || []), ...c.levels]));
        if (c.itinerary) {
          c.levels.forEach(lvl => {
            techByGrade[lvl] = Array.from(new Set([...(techByGrade[lvl] || []), c.itinerary!]));
          });
        }
      });

      setWizardData({
        name: school.name,
        city: school.city,
        active: school.active,
        selectedLevels,
        gradesByLevel: gradesByLevel as Record<CourseType, string[]>,
        techByGrade
      });
    } else {
      setSelectedSchoolId(null);
      setWizardData({
        name: '', city: '', active: true,
        selectedLevels: [],
        gradesByLevel: {} as Record<CourseType, string[]>,
        techByGrade: {}
      });
    }
    setIsConfiguring(true);
    setActiveStep('identity');
  };

  const handleLevelToggle = (type: CourseType) => {
    setWizardData(prev => {
      const selected = prev.selectedLevels.includes(type) 
        ? prev.selectedLevels.filter(t => t !== type)
        : [...prev.selectedLevels, type];
      
      return { ...prev, selectedLevels: selected };
    });
  };

  const handleGradeToggle = (level: CourseType, grade: string) => {
    setWizardData(prev => {
      const current = prev.gradesByLevel[level] || [];
      const updated = current.includes(grade)
        ? current.filter(g => g !== grade)
        : [...current, grade];
      
      return {
        ...prev,
        gradesByLevel: { ...prev.gradesByLevel, [level]: updated }
      };
    });
  };

  const handleTechToggle = (grade: string, tech: string) => {
    setWizardData(prev => {
      const current = prev.techByGrade[grade] || [];
      const updated = current.includes(tech)
        ? current.filter(t => t !== tech)
        : [...current, tech];
      
      return {
        ...prev,
        techByGrade: { ...prev.techByGrade, [grade]: updated }
      };
    });
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      const finalCourseIds: string[] = [];

      // 1. Create/Find Regular Courses for each level
      for (const level of wizardData.selectedLevels) {
        const grades = wizardData.gradesByLevel[level] || [];
        if (grades.length === 0) continue;

        // Check if regular course exists
        const regularExisting = courses.find(c => 
          c.type === level && 
          !c.itinerary && 
          JSON.stringify(c.levels.sort()) === JSON.stringify(grades.sort())
        );

        if (regularExisting) {
          finalCourseIds.push(regularExisting.id);
        } else {
          const newDoc = await addDoc(collection(db, 'courses'), {
            name: level,
            type: level,
            levels: grades,
            itinerary: null
          });
          finalCourseIds.push(newDoc.id);
        }
      }

      // 2. Create/Find Technical Courses for High School
      if (wizardData.selectedLevels.includes('Ensino Médio')) {
        const msGrades = wizardData.gradesByLevel['Ensino Médio'] || [];
        
        // Group tech courses by itinerary
        const itins = Array.from(new Set(Object.values(wizardData.techByGrade).flat()));
        
        for (const itinerary of itins) {
          // Identify which grades have this itinerary
          const itLevels = msGrades.filter(g => wizardData.techByGrade[g]?.includes(itinerary));
          if (itLevels.length === 0) continue;

          const techExisting = courses.find(c => 
            c.type === 'Ensino Médio' && 
            c.itinerary === itinerary && 
            JSON.stringify(c.levels.sort()) === JSON.stringify(itLevels.sort())
          );

          if (techExisting) {
            finalCourseIds.push(techExisting.id);
          } else {
            const newDoc = await addDoc(collection(db, 'courses'), {
              name: `Técnico em ${itinerary}`,
              type: 'Ensino Médio',
              levels: itLevels,
              itinerary: itinerary
            });
            finalCourseIds.push(newDoc.id);
          }
        }
      }

      // 3. Save School
      const schoolPayload = {
        name: wizardData.name,
        city: wizardData.city,
        active: wizardData.active,
        courseIds: Array.from(new Set(finalCourseIds))
      };

      if (selectedSchoolId) {
        await updateDoc(doc(db, 'schools', selectedSchoolId), schoolPayload);
      } else {
        await addDoc(collection(db, 'schools'), schoolPayload);
      }

      await fetchData();
      setIsConfiguring(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSchool = async (id: string) => {
    if (!confirm('Excluir unidade? Isso removerá o acesso ao formulário.')) return;
    try {
      await deleteDoc(doc(db, 'schools', id));
      fetchData();
    } catch (err) { console.error(err); }
  };

  if (loading && !isConfiguring) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-sesi-blue border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse italic">Gerenciando Rede SESI...</p>
    </div>
  );

  const stepIndex = ['identity', 'levels', 'grades', 'tech', 'review'].indexOf(activeStep);
  const totalSteps = wizardData.selectedLevels.includes('Ensino Médio') ? 5 : 4;
  const displayStep = activeStep === 'tech' && !wizardData.selectedLevels.includes('Ensino Médio') ? null : stepIndex + 1;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {!isConfiguring ? (
        <>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Rede de Unidades</h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Configuração de Oferta Educacional</p>
            </div>
            <button 
              onClick={() => startConfiguration()}
              className="flex items-center gap-3 px-8 py-3 bg-sesi-red text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:brightness-110 shadow-2xl shadow-sesi-red/30 transition-all active:scale-95"
            >
                <Plus size={18} /> Nova Unidade
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
                      <SchoolIcon className="text-slate-400 group-hover:text-sesi-blue" size={24} />
                    </div>
                    <div className="flex gap-2">
                        <button className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                          school.active ? "bg-green-50 text-green-600 border-green-100" : "bg-slate-100 text-slate-400 border-slate-200"
                        )}>
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
                    <div className="text-[10px] font-black text-sesi-blue uppercase italic">
                       {school.courseIds?.length || 0} níveis ativos
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
        /* WIZARD MODE */
        <div className="max-w-4xl mx-auto py-4">
          <div className="flex items-center justify-between mb-12">
             <button 
                onClick={() => setIsConfiguring(false)}
                className="flex items-center gap-2 text-slate-300 hover:text-slate-600 transition-colors text-[10px] font-black uppercase tracking-widest"
             >
                <ChevronLeft size={16} /> Cancelar
             </button>
             <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block opacity-60">Step {displayStep} de {totalSteps}</span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">
                   Configurando: {wizardData.name || 'Nova Unidade'}
                </h2>
             </div>
          </div>

          <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden min-h-[550px]">
             <div className="p-8 md:p-14">
               <AnimatePresence mode="wait">
                 
                 {/* TELA 1: CRIAR NOVA UNIDADE */}
                 {activeStep === 'identity' && (
                   <motion.div 
                     key="identity"
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -20 }}
                     className="space-y-10"
                   >
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white border-2 border-sesi-red rounded-2xl flex items-center justify-center text-sesi-red">
                           <Building2 size={24} />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Informações da Unidade</h3>
                           <p className="text-sm text-slate-400 font-medium italic">Dados básicos de identificação</p>
                        </div>
                     </div>

                     <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">Nome da Unidade <Settings2 size={12} /></label>
                           <input 
                             value={wizardData.name} 
                             onChange={e => setWizardData({...wizardData, name: e.target.value})}
                             className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-base font-bold focus:bg-white focus:border-sesi-blue outline-none transition-all"
                             placeholder="Ex: SESI Cabo"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">Município <Building2 size={12} /></label>
                           <input 
                             value={wizardData.city} 
                             onChange={e => setWizardData({...wizardData, city: e.target.value})}
                             className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-base font-bold focus:bg-white focus:border-sesi-blue outline-none transition-all"
                             placeholder="Ex: Cabo de Santo Agostinho"
                           />
                        </div>
                     </div>

                     <div className="flex items-center gap-6 p-8 bg-slate-50/50 rounded-[30px] border border-dashed border-slate-200">
                        <button 
                          onClick={() => setWizardData({...wizardData, active: !wizardData.active})}
                          className={cn(
                            "w-14 h-8 rounded-full p-1 transition-all duration-300",
                            wizardData.active ? "bg-green-500" : "bg-slate-300"
                          )}
                        >
                           <div className={cn("w-6 h-6 bg-white rounded-full transition-transform duration-300", wizardData.active && "translate-x-6")} />
                        </button>
                        <div>
                           <p className="text-xs font-black uppercase text-slate-900 tracking-tighter">Status: {wizardData.active ? 'Ativa' : 'Inativa'}</p>
                           <p className="text-[10px] text-slate-400">Unidades inativas não recebem novos leads externos.</p>
                        </div>
                     </div>

                     <div className="pt-10 flex justify-end">
                        <button 
                          disabled={!wizardData.name || !wizardData.city}
                          onClick={() => setActiveStep('levels')}
                          className="flex items-center gap-3 px-12 py-5 bg-slate-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-20 flex"
                        >
                          Próximo <ArrowRight size={18} />
                        </button>
                     </div>
                   </motion.div>
                 )}

                 {/* TELA 2: SELECIONAR NÍVEIS DE ENSINO */}
                 {activeStep === 'levels' && (
                    <motion.div 
                      key="levels"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-10"
                    >
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Quais níveis de ensino esta unidade possui?</h3>
                        <p className="text-sm text-slate-400 font-medium italic">Selecione pelo menos um nível para continuar</p>
                      </div>

                      <div className="grid gap-4">
                        {COURSE_TYPES.map(type => (
                          <div 
                            key={type}
                            onClick={() => handleLevelToggle(type)}
                            className={cn(
                              "group relative p-8 rounded-[30px] border-2 cursor-pointer transition-all hover:scale-[1.01]",
                              wizardData.selectedLevels.includes(type) 
                                ? "bg-sesi-blue border-sesi-blue text-white shadow-xl shadow-sesi-blue/20" 
                                : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                            )}
                          >
                             <div className="flex justify-between items-center">
                               <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                                    wizardData.selectedLevels.includes(type) ? "bg-white/20" : "bg-slate-50"
                                  )}>
                                     <BookOpen size={24} />
                                  </div>
                                  <span className="text-lg font-black uppercase tracking-tighter italic">{type}</span>
                               </div>
                               <div className={cn(
                                 "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                                 wizardData.selectedLevels.includes(type) ? "bg-white border-white text-sesi-blue" : "border-slate-200"
                               )}>
                                  {wizardData.selectedLevels.includes(type) && <Check size={16} />}
                               </div>
                             </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-10 flex justify-between">
                         <button onClick={() => setActiveStep('identity')} className="text-[11px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900">Voltar</button>
                         <button 
                           disabled={wizardData.selectedLevels.length === 0}
                           onClick={() => setActiveStep('grades')}
                           className="flex items-center gap-3 px-12 py-5 bg-slate-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-20"
                         >
                           Próximo <ArrowRight size={18} />
                         </button>
                      </div>
                    </motion.div>
                 )}

                 {/* TELA 3: SELECIONAR SÉRIES POR NÍVEL */}
                 {activeStep === 'grades' && (
                    <motion.div 
                      key="grades"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-10"
                    >
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Quais séries estarão disponíveis?</h3>
                        <p className="text-sm text-slate-400 font-medium italic">Defina a oferta por nível para a unidade {wizardData.name}</p>
                      </div>

                      <div className="space-y-10">
                        {wizardData.selectedLevels.map(level => (
                          <div key={level} className="space-y-4">
                             <div className="flex items-center gap-2 text-slate-400">
                                <GraduationCap size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{level}</span>
                             </div>
                             <div className="flex flex-wrap gap-3">
                                {DEFAULT_GRADES[level].map(grade => (
                                  <button 
                                    key={grade}
                                    onClick={() => handleGradeToggle(level, grade)}
                                    className={cn(
                                      "px-6 py-4 rounded-2xl border-2 text-[11px] font-black uppercase transition-all",
                                      wizardData.gradesByLevel[level]?.includes(grade)
                                        ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                    )}
                                  >
                                    {grade}
                                  </button>
                                ))}
                             </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-10 flex justify-between">
                         <button onClick={() => setActiveStep('levels')} className="text-[11px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900">Voltar</button>
                         <button 
                           onClick={() => {
                             if (wizardData.selectedLevels.includes('Ensino Médio')) setActiveStep('tech');
                             else setActiveStep('review');
                           }}
                           className="flex items-center gap-3 px-12 py-5 bg-slate-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl"
                         >
                           Próximo <ArrowRight size={18} />
                         </button>
                      </div>
                    </motion.div>
                 )}

                 {/* TELA 4: CURSOS TÉCNICOS (APENAS ENSINO MÉDIO) */}
                 {activeStep === 'tech' && (
                    <motion.div 
                      key="tech"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-10"
                    >
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Cursos técnicos disponíveis</h3>
                        <p className="text-sm text-slate-400 font-medium italic">Vincule itinerários técnicos aos anos do Ensino Médio</p>
                      </div>

                      <div className="space-y-12">
                        {(wizardData.gradesByLevel['Ensino Médio'] || []).map(grade => (
                          <div key={grade} className="p-8 bg-slate-50/50 rounded-[30px] border border-slate-100 space-y-6">
                             <div className="border-l-4 border-sesi-red pl-4">
                                <h4 className="text-lg font-black uppercase tracking-tighter italic text-slate-800">{grade} • Ensino Médio</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Escolha os cursos para esta série</p>
                             </div>

                             <div className="grid sm:grid-cols-2 gap-3">
                                {TECHNICAL_ITINERARIES.map(tech => (
                                  <button 
                                    key={tech}
                                    onClick={() => handleTechToggle(grade, tech)}
                                    className={cn(
                                      "p-4 rounded-xl border-2 text-[10px] font-black uppercase transition-all text-left flex items-center justify-between group",
                                      wizardData.techByGrade[grade]?.includes(tech)
                                        ? "bg-sesi-red border-sesi-red text-white shadow-lg"
                                        : "bg-white border-slate-200 text-slate-400 hover:border-sesi-red/30"
                                    )}
                                  >
                                    {tech}
                                    {wizardData.techByGrade[grade]?.includes(tech) ? (
                                       <Check size={14} />
                                    ) : (
                                       <Plus size={14} className="opacity-0 group-hover:opacity-100" />
                                    )}
                                  </button>
                                ))}
                             </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-10 flex justify-between">
                         <button onClick={() => setActiveStep('grades')} className="text-[11px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900">Voltar</button>
                         <button 
                           onClick={() => setActiveStep('review')}
                           className="flex items-center gap-3 px-12 py-5 bg-slate-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl"
                         >
                           Finalizar Cadastro <CheckCircle size={18} />
                         </button>
                      </div>
                    </motion.div>
                 )}

                 {/* TELA FINAL: RESUMO E SALVAMENTO */}
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
                         <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Resumo Final</h3>
                         <p className="text-sm text-slate-400 font-medium italic">Verifique os dados da unidade {wizardData.name} antes de salvar.</p>
                      </div>

                      <div className="bg-slate-900 text-white rounded-[40px] p-10 space-y-10 shadow-2xl">
                         <div className="grid md:grid-cols-2 gap-10 border-b border-white/10 pb-10">
                            <div>
                               <p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.2em] mb-2">Unidade SESI</p>
                               <h4 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{wizardData.name}</h4>
                               <p className="text-xs font-bold text-slate-400 uppercase mt-1 italic">{wizardData.city}, Pernambuco</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.2em] mb-2">Status Inicial</p>
                               <div className="flex items-center gap-2">
                                  <div className={cn("w-3 h-3 rounded-full", wizardData.active ? "bg-green-500" : "bg-amber-500")} />
                                  <span className="text-sm font-black uppercase italic">{wizardData.active ? 'Ativada para Cadastro' : 'Apenas Interna'}</span>
                               </div>
                            </div>
                         </div>

                         <div>
                            <p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.2em] mb-6">Oferta Educacional</p>
                            <div className="grid gap-6">
                               {wizardData.selectedLevels.map(level => (
                                 <div key={level} className="flex flex-col border-l-2 border-white/10 pl-6">
                                    <p className="text-sm font-black uppercase italic leading-none">{level}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                       {(wizardData.gradesByLevel[level] || []).join(', ')}
                                    </p>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </div>

                      <div className="flex justify-between items-center pt-6">
                         <button 
                           onClick={() => setActiveStep(wizardData.selectedLevels.includes('Ensino Médio') ? 'tech' : 'grades')} 
                           className="text-[11px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900"
                         >
                            Alterar Oferta
                         </button>
                         <button 
                            onClick={handleFinalize}
                            className="px-14 py-6 bg-sesi-red text-white rounded-[24px] text-base font-black uppercase tracking-[0.2em] hover:brightness-110 shadow-2xl shadow-sesi-red/40 transition-all active:scale-95 flex items-center gap-4"
                         >
                            <Save size={24} /> Salvar Unidade
                         </button>
                      </div>
                    </motion.div>
                 )}

               </AnimatePresence>
             </div>
          </div>
          
          <div className="mt-12 flex flex-col items-center gap-3 text-slate-300 opacity-40">
             <Wand2 size={18} className="text-sesi-blue" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">Configuração Guiada SESI Rede v4.0</p>
          </div>
        </div>
      )}
    </div>
  );
}
