import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { LayoutDashboard, Wrench, Settings2, LogOut, ClipboardList, User, ArrowRight } from 'lucide-react';

export default function Layout() {
  const { currentUser, logout } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';

  const getRoleName = (role: string) => {
    switch(role) {
      case 'admin': return 'مدير النظام';
      case 'tech': return 'فني صيانة';
      case 'supervisor': return 'مشرف قسم';
      default: return 'مستخدم';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Settings2 size={24} className="text-white" />
            </div>
            إدارة الصيانة
          </h2>
        </div>
        
        <div className="p-6 flex-1 flex flex-col gap-8">
          <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="bg-slate-700 p-3 rounded-full">
              <User size={24} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">مرحباً بك</p>
              <p className="font-bold text-lg">{currentUser?.username}</p>
              <span className="text-xs font-medium bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full inline-block mt-1">
                {getRoleName(currentUser?.role || '')}
              </span>
            </div>
          </div>

          <nav className="space-y-2">
            <NavLink 
              to="/" 
              end
              className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <LayoutDashboard size={20} />
              الرئيسية
            </NavLink>
            
            <NavLink 
              to="/assets" 
              className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <ClipboardList size={20} />
              العهد والأصول
            </NavLink>

            <NavLink 
              to="/maintenance" 
              className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <Wrench size={20} />
              طلبات الصيانة
            </NavLink>

            {(currentUser?.role === 'admin' || currentUser?.role === 'tech') && (
              <NavLink 
                to="/tracking" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                <Settings2 size={20} />
                متابعة الصيانة الدورية
              </NavLink>
            )}
          </nav>
        </div>

        <div className="p-6 border-t border-slate-800">
          <button 
            onClick={logout}
            className="flex items-center justify-center gap-3 px-4 py-3 w-full text-red-400 font-medium hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut size={20} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Header background pattern for aesthetics */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-blue-600 -z-10 rounded-b-3xl"></div>
        
        <header className="px-8 py-6 flex justify-between items-center text-white z-0">
          <div>
            <h1 className="text-2xl font-bold">لوحة التحكم</h1>
            <p className="text-blue-200 mt-1">نظام إدارة متكامل للعهد والمتابعة</p>
          </div>
          {!isHome && (
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border border-white/10 shadow-sm"
            >
              <ArrowRight size={18} />
              العودة للرئيسية
            </button>
          )}
        </header>
        
        <div className="flex-1 overflow-auto px-8 pb-8 z-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
