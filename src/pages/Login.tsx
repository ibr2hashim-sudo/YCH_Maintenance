import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Settings, AlertTriangle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const login = useAppStore(state => state.login);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = login(username.trim());
    if (!success) {
      setError('اسم المستخدم غير صحيح! الرجاء المحاولة مرة أخرى أو استخدام حساب تجريبي.');
    }
  };

  const selectDemo = (user: string) => {
    setUsername(user);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-4 rounded-full text-white mb-4 shadow-lg animate-pulse">
            <Settings size={36} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 text-center font-sans">نظام إدارة العهد والصيانة</h1>
          <p className="text-slate-700 mt-2">تسجيل الدخول للمتابعة</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 text-sm flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-right font-medium"
              placeholder="أدخل اسم المستخدم"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 cursor-pointer"
          >
            دخول للنظام
          </button>
        </form>
        
        <div className="mt-8 p-5 bg-blue-50/50 rounded-xl text-sm text-blue-900 border border-blue-100">
          <p className="font-bold mb-3 flex items-center gap-2 text-blue-800">
            💡 اضغط لتسجيل الدخول السريع:
          </p>
          <ul className="space-y-2">
            <button
              onClick={() => selectDemo('admin')}
              className="w-full flex items-center justify-between bg-white hover:bg-blue-50 px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 transition-all text-right cursor-pointer"
            >
              <strong className="font-mono text-blue-800">admin</strong> 
              <span className="text-slate-800 text-xs bg-slate-100 px-2 py-1 rounded">المدير (صلاحيات كاملة)</span>
            </button>
            <button
              onClick={() => selectDemo('tech1')}
              className="w-full flex items-center justify-between bg-white hover:bg-blue-50 px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 transition-all text-right cursor-pointer"
            >
              <strong className="font-mono text-blue-800">tech1</strong> 
              <span className="text-slate-800 text-xs bg-slate-100 px-2 py-1 rounded">فني صيانة</span>
            </button>
            <button
              onClick={() => selectDemo('sup1')}
              className="w-full flex items-center justify-between bg-white hover:bg-blue-50 px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 transition-all text-right cursor-pointer"
            >
              <strong className="font-mono text-blue-800">sup1</strong> 
              <span className="text-slate-800 text-xs bg-slate-100 px-2 py-1 rounded">مشرف قسم الطوارئ</span>
            </button>
            <button
              onClick={() => selectDemo('sup2')}
              className="w-full flex items-center justify-between bg-white hover:bg-blue-50 px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 transition-all text-right cursor-pointer"
            >
              <strong className="font-mono text-blue-800">sup2</strong> 
              <span className="text-slate-800 text-xs bg-slate-100 px-2 py-1 rounded">مشرف العناية المركزة</span>
            </button>
          </ul>
        </div>
      </div>
    </div>
  );
}
