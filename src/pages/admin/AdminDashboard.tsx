import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Lead, School } from '../../types';
import { Users, School as SchoolIcon, GraduationCap, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../lib/utils';

export default function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const qLeads = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
        const [leadsSnap, schoolsSnap] = await Promise.all([
          getDocs(qLeads),
          getDocs(collection(db, 'schools'))
        ]);

        setSchools(schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as School)));

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
    fetchData();
  }, []);

  if (loading) return <div className="h-full flex items-center justify-center p-20 uppercase text-[10px] font-bold text-slate-400 animate-pulse">Calculando métricas de rede...</div>;

  const totalLeads = leads.length;
  
  // Aggregate by school
  const schoolStats = leads.reduce((acc: any, lead) => {
    const schoolName = schools.find(s => s.id === lead.schoolId)?.name || lead.schoolId;
    acc[schoolName] = (acc[schoolName] || 0) + 1;
    return acc;
  }, {});

  const schoolChartData = Object.entries(schoolStats).map(([name, count]) => ({ name, count }));

  // Aggregate by day for the last 7 days
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), i);
    return format(d, 'yyyy-MM-dd');
  }).reverse();

  const dailyStats = last7Days.map(date => {
    const count = leads.filter(l => format(l.createdAt, 'yyyy-MM-dd') === date).length;
    return {
      date: format(new Date(date), 'dd/MM', { locale: ptBR }),
      count
    };
  });

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Visão Geral</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Status em tempo real das unidades SESI PE</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
            <TrendingUp size={14} className="text-green-500" />
            Sincronizado: {format(new Date(), "HH:mm")}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Captação Total" value={totalLeads} icon={Users} color="blue" />
        <StatCard title="Novas 24h" value={dailyStats[dailyStats.length - 1]?.count || 0} icon={TrendingUp} color="green" />
        <StatCard title="Unidades Ativas" value={schools.filter(s => s.active).length} icon={SchoolIcon} color="purple" />
        <StatCard title="Engajamento" value="78%" icon={GraduationCap} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 text-[10px] uppercase tracking-wider italic">Fluxo de Interessados (7 dias)</h3>
              <div className="bg-blue-100 text-sesi-blue text-[9px] px-2 py-0.5 rounded font-bold uppercase">Relatório Semanal</div>
          </div>
          <div className="p-8 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                />
                <Line type="monotone" dataKey="count" stroke="#004b93" strokeWidth={2} dot={{ r: 3, fill: '#004b93' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 text-[10px] uppercase tracking-wider italic">Demanda por Unidade</h3>
              <div className="bg-orange-100 text-orange-700 text-[9px] px-2 py-0.5 rounded font-bold uppercase">Ranking SESI</div>
          </div>
          <div className="p-8 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={schoolChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none' }} />
                <Bar dataKey="count" fill="#da291c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'border-[#004b93] bg-[#004b93]/5 text-[#004b93]',
    green: 'border-green-500 bg-green-50 text-green-700',
    purple: 'border-indigo-500 bg-indigo-50 text-indigo-700',
    orange: 'border-orange-400 bg-orange-50 text-orange-700',
  };

  return (
    <div className={cn("bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full border-l-4", colors[color])}>
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{title}</p>
        <Icon size={18} className="opacity-40" />
      </div>
      <div>
        <p className="text-3xl font-light text-slate-800 tracking-tight">{value}</p>
        <p className="text-[10px] opacity-60 mt-2 font-bold uppercase tracking-tighter">Métrica consolidada</p>
      </div>
    </div>
  );
}
