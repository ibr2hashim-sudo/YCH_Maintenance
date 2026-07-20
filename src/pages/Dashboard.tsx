import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { Users, Landmark, Wrench, ShieldAlert, UserPlus, Trash2, Key, HelpCircle, Briefcase, ArrowLeft } from 'lucide-react';
import { Role } from '../types';

export default function Dashboard() {
  const { currentUser, departments, devices, requests, users, addUser, deleteUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');
  const navigate = useNavigate();

  // New User Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('supervisor');
  const [deptId, setDeptId] = useState('');
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');
  const [userToDelete, setUserToDelete] = useState<{id: string, username: string} | null>(null);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');

    if (!username.trim()) {
      setUserError('اسم المستخدم مطلوب');
      return;
    }

    if (users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
      setUserError('اسم المستخدم موجود بالفعل!');
      return;
    }

    if (role === 'supervisor' && !deptId) {
      setUserError('يجب اختيار قسم لمشرف القسم');
      return;
    }

    addUser({
      username: username.trim(),
      password: password.trim() || '123456',
      role,
      departmentId: role === 'supervisor' ? deptId : undefined
    });

    setUserSuccess('تمت إضافة المستخدم بنجاح!');
    setUsername('');
    setPassword('');
    setRole('supervisor');
    setDeptId('');
  };

  const getRoleBadge = (role: Role) => {
    switch(role) {
      case 'admin':
        return <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded text-xs font-bold">مدير نظام</span>;
      case 'tech':
        return <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-1 rounded text-xs font-bold">فني صيانة</span>;
      case 'supervisor':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded text-xs font-bold">مشرف قسم</span>;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-l from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-sans">أهلاً بك، {currentUser?.username} 👋</h2>
          <p className="text-slate-300 mt-1">
            صلاحياتك الحالية: {currentUser?.role === 'admin' ? 'مدير النظام' : currentUser?.role === 'tech' ? 'فني صيانة' : 'مشرف قسم'}
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
          التوقيت الحالي للملقم: 2026-07-19
        </div>
      </div>

      {/* Admin Tabs */}
      {currentUser?.role === 'admin' && (
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${activeTab === 'stats' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Landmark size={18} />
            إحصائيات النظام
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${activeTab === 'users' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Users size={18} />
            إدارة المستخدمين والصلحيات ({users.length})
          </button>
        </div>
      )}

      {activeTab === 'stats' ? (
        <>
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="bg-blue-100 p-4 rounded-xl text-blue-600">
                <Landmark size={24} />
              </div>
              <div>
                <span className="text-slate-500 text-xs font-bold block mb-1">إجمالي الأقسام</span>
                <span className="text-3xl font-bold text-slate-800">{departments.length}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="bg-emerald-100 p-4 rounded-xl text-emerald-600">
                <Briefcase size={24} />
              </div>
              <div>
                <span className="text-slate-500 text-xs font-bold block mb-1">الأجهزة والعهد المسجلة</span>
                <span className="text-3xl font-bold text-slate-800">{devices.length}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="bg-red-100 p-4 rounded-xl text-red-600">
                <ShieldAlert size={24} />
              </div>
              <div>
                <span className="text-slate-500 text-xs font-bold block mb-1">بلاغات صيانة نشطة</span>
                <span className="text-3xl font-bold text-red-500">
                  {requests.filter(r => r.status === 'pending').length}
                </span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="bg-amber-100 p-4 rounded-xl text-amber-600">
                <Wrench size={24} />
              </div>
              <div>
                <span className="text-slate-500 text-xs font-bold block mb-1">قيد الصيانة</span>
                <span className="text-3xl font-bold text-amber-500">
                  {requests.filter(r => r.status === 'in_progress').length}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Guide and Instructions -> Main Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:col-span-2">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <HelpCircle className="text-blue-600" size={20} />
                البنود الرئيسية للنظام (اضغط للدخول)
              </h3>
              
              <div className="space-y-4">
                <div 
                  onClick={() => navigate('/assets')}
                  className="p-4 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 rounded-xl border border-slate-100 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                      1. إدارة العهد والأصول 📦
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed pr-6">
                      تصفح الأقسام الطبية، مجموع الأجهزة، إضافة أجهزة ومرفقات جديدة وتحديد حالتها.
                    </p>
                  </div>
                  <ArrowLeft className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>

                <div 
                  onClick={() => navigate('/maintenance')}
                  className="p-4 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 rounded-xl border border-slate-100 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                      2. طلبات الصيانة وبلاغات الأعطال 🔧
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed pr-6">
                      إرسال شكاوى فورية، استلام بلاغات الأعطال، كتابة تقارير الصيانة، وإصدار تقرير مطبوع.
                    </p>
                  </div>
                  <ArrowLeft className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>

                {currentUser?.role !== 'supervisor' && (
                  <div 
                    onClick={() => navigate('/tracking')}
                    className="p-4 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 rounded-xl border border-slate-100 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                        3. متابعة الصيانة الدورية 📅
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed pr-6">
                        متابعة دورية مجدولة للفلاتر والزيوت، التكييف، والبطاريات للأجهزة وتدوين سجلاتها.
                      </p>
                    </div>
                    <ArrowLeft className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar quick contacts or helpful notes */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">أقسام المستشفى النشطة</h3>
                <div className="space-y-2">
                  {departments.map((dept) => {
                    const count = devices.filter(d => d.departmentId === dept.id).length;
                    return (
                      <div key={dept.id} className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                        <span className="font-medium text-slate-700 text-sm">{dept.name}</span>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-bold">
                          {count} أجهزة
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-2xl">
                <h4 className="font-bold text-xs text-slate-500 mb-1">إشعار سريع:</h4>
                <p className="text-xs text-slate-600">
                  تأكد دائماً من معايرة الأجهزة الحساسة وتحديث بيانات العهد الدفترية لضمان تقارير جرد دقيقة.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Users Management Tab (Only Admin) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add User Panel */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus className="text-blue-600" size={20} />
              إضافة مستخدم جديد
            </h3>

            {userError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-100 text-xs mb-4">
                {userError}
              </div>
            )}
            {userSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-xs mb-4">
                {userSuccess}
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">اسم المستخدم (للتسجيل)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                  placeholder="مثال: custom_sup"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                  placeholder="اتركها فارغة لتعيين 123456"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">الصلاحيات والوظيفة</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-white"
                >
                  <option value="admin">مدير نظام (أدمن)</option>
                  <option value="tech">فني صيانة</option>
                  <option value="supervisor">مشرف قسم</option>
                </select>
              </div>

              {role === 'supervisor' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">القسم المسؤول عنه</label>
                  <select
                    value={deptId}
                    onChange={(e) => setDeptId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-white"
                    required
                  >
                    <option value="">-- اختر القسم --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md text-sm cursor-pointer mt-2"
              >
                إضافة المستخدم
              </button>
            </form>
          </div>

          {/* User List Panel */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="text-slate-600" size={20} />
              مستخدمي النظام النشطين
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold">
                    <th className="pb-3 font-medium">اسم المستخدم</th>
                    <th className="pb-3 font-medium">الوظيفة والصلحية</th>
                    <th className="pb-3 font-medium">القسم المسؤول عنه</th>
                    <th className="pb-3 font-medium text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {users.map((user) => {
                    const dept = departments.find((d) => d.id === user.departmentId);
                    const isSelf = currentUser?.id === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 font-bold text-slate-800 flex items-center gap-2">
                          <div className="bg-slate-100 p-1.5 rounded-full text-slate-500">
                            <Users size={14} />
                          </div>
                          {user.username} {isSelf && <span className="text-xs text-blue-500 font-normal">(أنت حالياً)</span>}
                        </td>
                        <td className="py-3.5">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="py-3.5 text-slate-600 font-medium">
                          {user.role === 'supervisor' ? (dept?.name || 'غير محدد') : 'كل الأقسام'}
                        </td>
                        <td className="py-3.5 text-left">
                          {!isSelf && (
                            <button
                              onClick={() => setUserToDelete({ id: user.id, username: user.username })}
                              className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                              title="حذف الحساب"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Delete Confirm Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md text-right relative">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">حذف حساب المستخدم</h3>
            <p className="text-slate-600 text-sm text-center mb-6">
              هل أنت متأكد من رغبتك في حذف حساب ({userToDelete.username}) نهائياً؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  deleteUser(userToDelete.id);
                  setUserToDelete(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setUserToDelete(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
