import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Lead, LeadStatus, School, Course } from '../../types';
import { Search, Filter, Download, MoreHorizontal, Mail, MessageCircle, Trash2, CheckCircle, ChevronDown, ChevronUp, Save, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../lib/utils';

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'Todos'>('Todos');
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
      const [leadsSnap, schoolsSnap, coursesSnap] = await Promise.all([
        getDocs(q),
        getDocs(collection(db, 'schools')),
        getDocs(collection(db, 'courses'))
      ]);

      setSchools(schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School)));
      setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));

      const fetchedLeads = leadsSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
      } as Lead));
      
      setLeads(fetchedLeads);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const getSchoolName = (id: string) => schools.find(s => s.id === id)?.name || id;
  const getCourseName = (id: string) => courses.find(c => c.id === id)?.name || id;

  const updateStatus = async (id: string, newStatus: LeadStatus) => {
    try {
      await updateDoc(doc(db, 'leads', id), { status: newStatus });
      setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteLead = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    try {
      await deleteDoc(doc(db, 'leads', id));
      setLeads(leads.filter(l => l.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateNotes = async (id: string) => {
    const notes = tempNotes[id];
    try {
      await updateDoc(doc(db, 'leads', id), { notes });
      setLeads(leads.map(l => l.id === id ? { ...l, notes } : l));
      alert('Anotações salvas!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar notas.');
    }
  };

  const handleSendManualEmail = async (lead: Lead) => {
    if (!confirm(`Enviar e-mail de confirmação manual para ${lead.name}?`)) return;
    
    setSendingEmailId(lead.id);
    try {
      const response = await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: lead.email,
          name: lead.name,
          schoolName: getSchoolName(lead.schoolId),
          gradeName: lead.grade,
          courseName: getCourseName(lead.courseId)
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('E-mail enviado com sucesso!');
      } else {
        alert('Erro ao enviar e-mail.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha na comunicação com o servidor de e-mail.');
    } finally {
      setSendingEmailId(null);
    }
  };

  const filteredLeads = leads.filter(l => {
    const schoolName = getSchoolName(l.schoolId);
    const courseName = getCourseName(l.courseId);
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          courseName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const headers = ['Nome', 'Categoria', 'E-mail', 'WhatsApp', 'Escola', 'Curso', 'Série', 'Data', 'Status'];
    const rows = filteredLeads.map(l => [
      l.name, l.category, l.email, l.whatsapp, getSchoolName(l.schoolId), getCourseName(l.courseId), l.grade, 
      format(l.createdAt, 'dd/MM/yyyy HH:mm'), l.status
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_sesi_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Leads</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manifestações de interesse registradas</p>
        </div>
        <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-sesi-blue text-white rounded text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-sm"
        >
          <Download size={14} /> Exportar Base
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Buscar por nome, e-mail, curso ou unidade..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded bg-slate-50 outline-none focus:border-sesi-blue transition-all text-xs font-bold"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="text-slate-400" size={16} />
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="flex-1 md:w-40 px-3 py-2 border border-slate-200 rounded outline-none focus:border-sesi-blue text-xs bg-slate-50 font-bold uppercase tracking-tighter"
          >
            <option value="Todos">Todos Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Contatado">Contatado</option>
            <option value="Matriculado">Matriculado</option>
            <option value="Desistente">Desistente</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 text-[10px] uppercase tracking-wider italic">Tabela de leads ativos</h3>
            <span className="bg-sesi-blue text-white text-[9px] px-2 py-0.5 rounded font-bold uppercase">{filteredLeads.length} Registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80 border-b border-slate-100 font-bold text-[9px] text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4">Unidade / Nível / Série</th>
                <th className="px-6 py-4">Data Registro</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">Buscando informações...</td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">Nenhum lead encontrado.</td></tr>
              ) : filteredLeads.map((lead) => (
                <React.Fragment key={lead.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id);
                            if (!tempNotes[lead.id]) setTempNotes(p => ({ ...p, [lead.id]: lead.notes || '' }));
                          }}
                          className="text-slate-300 hover:text-sesi-blue"
                        >
                          {expandedLeadId === lead.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <div>
                          <div className="font-bold text-slate-800">{lead.name}</div>
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{lead.category} • {lead.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-sesi-blue text-[11px] uppercase tracking-tighter">{getSchoolName(lead.schoolId)}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{getCourseName(lead.courseId)} <span className="text-slate-300 mx-1">•</span> {lead.grade}</div>
                    </td>
                    <td className="px-6 py-4 text-[10px] text-slate-400 font-bold italic">
                      {format(lead.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-tight shadow-sm border",
                          lead.status === 'Pendente' && "bg-amber-50 text-amber-700 border-amber-100",
                          lead.status === 'Contatado' && "bg-blue-50 text-blue-700 border-blue-100",
                          lead.status === 'Matriculado' && "bg-green-50 text-green-700 border-green-100",
                          lead.status === 'Desistente' && "bg-slate-100 text-slate-600 border-slate-200",
                      )}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                          href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-green-600 font-bold hover:scale-110 transition-transform"
                          title="Falar no WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </a>
                        <button 
                          disabled={sendingEmailId === lead.id}
                          onClick={() => handleSendManualEmail(lead)}
                          className={cn(
                            "text-sesi-blue font-bold hover:scale-110 transition-transform disabled:opacity-50",
                            sendingEmailId === lead.id && "animate-pulse"
                          )}
                          title="Enviar E-mail de Confirmação"
                        >
                          <Mail size={18} />
                        </button>
                        <select 
                          onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                          className="text-[9px] border-none bg-transparent focus:ring-0 text-slate-400 hover:text-sesi-blue font-bold uppercase tracking-tighter cursor-pointer"
                          title="Alterar Status Operacional"
                          value={lead.status}
                        >
                          <option value="Pendente">Aguardando</option>
                          <option value="Contatado">Contatado</option>
                          <option value="Matriculado">Efetivado</option>
                          <option value="Desistente">Desistência</option>
                        </select>
                        <button 
                          onClick={() => deleteLead(lead.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedLeadId === lead.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={5} className="px-10 py-6 border-b border-slate-100">
                        <div className="flex flex-col gap-3">
                           <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                 <MoreHorizontal size={14} /> Histórico e Observações do Atendimento
                              </h4>
                              <button 
                                onClick={() => handleUpdateNotes(lead.id)}
                                className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-black transition-all"
                              >
                                 <Save size={12} /> Salvar Notas
                              </button>
                           </div>
                           <textarea 
                             value={tempNotes[lead.id] || ''}
                             onChange={e => setTempNotes({ ...tempNotes, [lead.id]: e.target.value })}
                             placeholder="Ex: Entramos em contato via WhatsApp mas o responsável afirmou que ainda está decidindo..."
                             className="w-full p-4 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600 outline-none focus:border-sesi-blue transition-all min-h-[100px]"
                           />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
