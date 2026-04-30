import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { School as SchoolType, Course as CourseType, ResponsibleCategory } from '../types';
import { motion } from 'motion/react';
import { CheckCircle2, GraduationCap, MapPin, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Pai' as ResponsibleCategory,
    email: '',
    whatsapp: '',
    consent: false
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const schoolsSnap = await getDocs(collection(db, 'schools'));
        setSchools(schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolType)).filter(s => s.active));
        
        const coursesSnap = await getDocs(collection(db, 'courses'));
        setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseType)));
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consent) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'leads'), {
        ...formData,
        schoolId: selectedSchool,
        courseId: selectedCourse,
        grade: selectedGrade,
        createdAt: new Date(),
        status: 'Pendente'
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Houve um erro ao enviar seu cadastro. Por favor, tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-sans bg-gray-50">Carregando formulário...</div>;

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-gray-900">
      {/* Header */}
      <nav className="bg-sesi-blue text-white px-6 py-4 flex justify-between items-center shadow-md sticky top-0 z-50">
        <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center font-bold text-sesi-blue text-xl">S</div>
            <div>
                <h1 className="text-lg font-bold leading-tight">SESI Pernambuco</h1>
                <p className="text-[10px] opacity-80 uppercase tracking-widest">Portal de Captação de Leads</p>
            </div>
        </div>
        <a href="/login" className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition-colors uppercase">Admin</a>
      </nav>

      <section className="py-12 md:py-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-100 text-sesi-blue text-[10px] font-bold mb-6 uppercase tracking-widest italic">
                    <GraduationCap size={14} />
                    Lista de Interesse 2026
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-slate-900 mb-8">
                    Educação de Excelência <br/>para o <span className="text-sesi-blue italic">Novo Futuro.</span>
                </h1>
                <p className="text-base text-slate-500 mb-10 leading-relaxed max-w-lg">
                    Demonstre seu interesse e garanta que nossa equipe entre em contato assim que o período de matrícula for iniciado nas escolas SESI Pernambuco.
                </p>
                
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                        <CheckCircle2 className="text-sesi-blue flex-shrink-0" size={18} />
                        <span>Ensino diferenciado focado em inovação</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                        <CheckCircle2 className="text-sesi-blue flex-shrink-0" size={18} />
                        <span>Infraestrutura de ponta e robótica</span>
                    </div>
                </div>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white rounded-xl shadow-xl p-8 lg:p-10 border border-slate-200"
            >
                {success ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Interesse Registrado!</h2>
                        <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">
                            Obrigado pelo seu interesse. Entraremos em contato assim que o período de matrícula iniciar.
                        </p>
                        <button 
                            onClick={() => {
                                setSuccess(false);
                                setFormData({ name: '', category: 'Pai', email: '', whatsapp: '', consent: false });
                                setSelectedSchool('');
                                setSelectedCourse('');
                                setSelectedGrade('');
                            }}
                            className="bg-sesi-blue text-white px-8 py-3 rounded font-bold hover:brightness-110 transition-all shadow-sm uppercase text-xs tracking-widest"
                        >
                            Realizar outro cadastro
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-bold text-sesi-blue italic">Formulário de Cadastro</h2>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Inscrição rápida e segura</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-400">Nome do Responsável</label>
                                <input 
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-3 py-2 text-sm rounded border border-slate-200 bg-slate-50 outline-none focus:border-sesi-blue transition-all"
                                    placeholder="Ex: João Silva"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-400">Eu sou:</label>
                                <select 
                                    required
                                    value={formData.category}
                                    onChange={e => setFormData({...formData, category: e.target.value as ResponsibleCategory})}
                                    className="w-full px-3 py-2 text-sm rounded border border-slate-200 bg-slate-50 outline-none focus:border-sesi-blue transition-all"
                                >
                                    <option value="Pai">Pai</option>
                                    <option value="Mãe">Mãe</option>
                                    <option value="Responsável Legal">Responsável Legal</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-400">E-mail</label>
                                <input 
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-3 py-2 text-sm rounded border border-slate-200 bg-slate-50 outline-none focus:border-sesi-blue transition-all"
                                    placeholder="joao@email.com"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-400">WhatsApp</label>
                                <input 
                                    required
                                    value={formData.whatsapp}
                                    onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                                    className="w-full px-3 py-2 text-sm rounded border border-slate-200 bg-slate-50 outline-none focus:border-sesi-blue transition-all"
                                    placeholder="(81) 99999-9999"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-400">Escola SESI de Interesse</label>
                                <select 
                                    required
                                    value={selectedSchool}
                                    onChange={e => setSelectedSchool(e.target.value)}
                                    className="w-full px-3 py-2 text-sm rounded border border-slate-200 bg-slate-50 outline-none focus:border-sesi-blue transition-all"
                                >
                                    <option value="">Selecione a unidade</option>
                                    {schools.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} - {s.city}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Curso</label>
                                    <select 
                                        required
                                        value={selectedCourse}
                                        onChange={e => {
                                            setSelectedCourse(e.target.value);
                                            setSelectedGrade('');
                                        }}
                                        className="w-full px-3 py-2 text-sm rounded border border-slate-200 bg-slate-50 outline-none focus:border-sesi-blue transition-all"
                                    >
                                        <option value="">Selecione o nível</option>
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Série</label>
                                    <select 
                                        required
                                        disabled={!selectedCourse}
                                        value={selectedGrade}
                                        onChange={e => setSelectedGrade(e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded border border-slate-200 bg-slate-50 outline-none focus:border-sesi-blue transition-all disabled:opacity-50"
                                    >
                                        <option value="">Série desejada</option>
                                        {courses.find(c => c.id === selectedCourse)?.levels.map(l => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 items-start py-2">
                            <input 
                                required
                                type="checkbox" 
                                id="consent"
                                checked={formData.consent}
                                onChange={e => setFormData({...formData, consent: e.target.checked})}
                                className="mt-1 h-4 w-4 border-slate-300 text-sesi-blue focus:ring-sesi-blue"
                            />
                            <label htmlFor="consent" className="text-[9px] text-slate-500 leading-tight">
                                Estou ciente de que este cadastro é apenas para lista de espera e autorizo o SESI-PE a entrar em contato via WhatsApp/E-mail conforme a LGPD.
                            </label>
                        </div>

                        <button 
                            disabled={submitting}
                            className="w-full bg-sesi-red text-white py-3 rounded font-bold shadow-sm hover:brightness-110 transition-all disabled:opacity-50 text-[11px] uppercase tracking-widest"
                        >
                            {submitting ? 'PROCESSANDO...' : 'REGISTRAR INTERESSE'}
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold italic">S</div>
                    <span className="text-white font-bold">SESI PE</span>
                </div>
                <p className="text-sm">© 2026 SESI Pernambuco. Todos os direitos reservados.</p>
          </div>
      </footer>
    </div>
  );
}
