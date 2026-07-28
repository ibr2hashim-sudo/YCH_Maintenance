import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Settings, AlertTriangle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAppStore(state => state.login);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = login(username.trim(), password);
    if (!success) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة!');
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-right font-medium"
              placeholder="أدخل كلمة المرور"
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
      </div>
    </div>
  );
}
