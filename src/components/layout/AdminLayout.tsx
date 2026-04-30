import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { LayoutDashboard, Users, School, Settings, LogOut, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { logout } from '../../lib/firebase';
import { cn } from '../../lib/utils';

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) return <div className="h-screen w-screen flex items-center justify-center">Carregando...</div>;
  if (!user || !isAdmin) return null;

  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/leads', icon: Users, label: 'Leads' },
    { to: '/admin/schools', icon: School, label: 'Escolas e Cursos' },
    { to: '/admin/settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-sesi-blue rounded flex items-center justify-center text-white font-bold text-lg">S</div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-tight">Admin Portal</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">SESI PE</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded text-[11px] font-bold uppercase tracking-wider transition-all",
                  isActive 
                    ? "bg-slate-100 text-sesi-blue border-l-4 border-sesi-blue pl-3" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 w-full px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-sesi-red hover:bg-red-50 rounded transition-all"
          >
            <LogOut size={16} />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-sesi-blue text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-sesi-blue font-bold">S</div>
            <h1 className="text-sm font-bold uppercase tracking-tight">Admin SESI PE</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-1 absolute top-16 left-0 right-0 z-50 shadow-xl">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded text-[11px] font-bold uppercase tracking-wider transition-colors",
                  isActive ? "bg-slate-50 text-sesi-blue" : "text-slate-600 hover:bg-slate-50"
                )
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 w-full px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-sesi-red hover:bg-red-50 rounded transition-colors text-left"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-auto bg-slate-50/50">
        <Outlet />
      </main>
    </div>
  );
}
