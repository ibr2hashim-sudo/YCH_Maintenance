import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { LayoutDashboard, Wrench, Settings2, LogOut, ClipboardList, User, ArrowRight, RefreshCw } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-100 flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-72 bg-white text-black flex flex-col shadow-md z-10 border-l border-slate-300">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold flex items-center gap-3 text-black">
            <div className="bg-blue-800 p-2 rounded-lg">
              <Settings2 size={24} className="text-white" />
            </div>
            إدارة الصيانة
          </h2>
        </div>
        
        <div className="p-6 flex-1 flex flex-col gap-8">
          <div className="flex items-center gap-4 bg-slate-100 p-4 rounded-xl border border-slate-300">
            <div className="bg-slate-200 p-3 rounded-full">
              <User size={24} className="text-blue-900" />
            </div>
            <div>
              <p className="text-sm text-slate-800 font-bold">مرحباً بك</p>
              <p className="font-bold text-lg text-black">{currentUser?.username}</p>
              <span className="text-xs font-bold bg-blue-100 text-blue-900 px-2.5 py-1 rounded-full inline-block mt-1 border border-blue-200">
                {getRoleName(currentUser?.role || '')}
              </span>
            </div>
          </div>

          <nav className="space-y-2">
            <NavLink 
              to="/" 
              end
              className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${isActive ? 'bg-blue-800 text-white shadow-md' : 'text-slate-900 hover:bg-slate-100 hover:text-black border border-transparent hover:border-slate-300'}`}
            >
              <LayoutDashboard size={20} />
              الرئيسية
            </NavLink>
            
            <NavLink 
              to="/assets" 
              className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${isActive ? 'bg-blue-800 text-white shadow-md' : 'text-slate-900 hover:bg-slate-100 hover:text-black border border-transparent hover:border-slate-300'}`}
            >
              <ClipboardList size={20} />
              العهد والأصول
            </NavLink>

            <NavLink 
              to="/maintenance" 
              className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${isActive ? 'bg-blue-800 text-white shadow-md' : 'text-slate-900 hover:bg-slate-100 hover:text-black border border-transparent hover:border-slate-300'}`}
            >
              <Wrench size={20} />
              طلبات الصيانة
            </NavLink>

            {(currentUser?.role === 'admin' || currentUser?.role === 'tech') && (
              <NavLink 
                to="/tracking" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${isActive ? 'bg-blue-800 text-white shadow-md' : 'text-slate-900 hover:bg-slate-100 hover:text-black border border-transparent hover:border-slate-300'}`}
              >
                <Settings2 size={20} />
                متابعة الصيانة الدورية
              </NavLink>
            )}
          </nav>
        </div>

        <div className="p-6 border-t border-slate-200 flex flex-col gap-3">
          {currentUser?.role === 'admin' && (
            <button 
              onClick={() => {
                if (window.confirm('هل أنت متأكد من مسح جميع البيانات (استعادة ضبط المصنع)؟ لا يمكن التراجع عن هذا الإجراء.')) {
                  localStorage.clear();
                  window.location.href = '/';
                }
              }}
              className="flex items-center justify-center gap-3 px-4 py-3 w-full text-amber-700 font-bold hover:bg-amber-50 rounded-xl transition-colors border border-amber-300 hover:border-amber-500 cursor-pointer"
            >
              <RefreshCw size={20} />
              Reset Data
            </button>
          )}
          <button 
            onClick={logout}
            className="flex items-center justify-center gap-3 px-4 py-3 w-full text-red-700 font-bold hover:bg-red-50 rounded-xl transition-colors border border-red-300 hover:border-red-500 cursor-pointer"
          >
            <LogOut size={20} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative bg-slate-100">
        <header className="px-8 py-6 flex justify-between items-center text-black z-10 border-b border-slate-300 bg-white shadow-sm mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">لوحة التحكم</h1>
            <p className="text-slate-900 mt-1 font-bold">نظام إدارة متكامل للعهد والمتابعة</p>
          </div>
          {!isHome && (
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-black px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border border-slate-400 shadow-sm"
            >
              <ArrowRight size={18} className="text-black" />
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