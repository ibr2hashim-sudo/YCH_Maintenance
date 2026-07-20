import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { MaintenanceTracking } from '../types';
import { 
  Plus, Calendar, Eye, Wrench, Settings2, ShieldAlert, ArrowRight, X, Clock,
  CheckCircle, PlusCircle, Bookmark, Compass, Landmark, Briefcase, FileText
} from 'lucide-react';

export default function Tracking() {
  const navigate = useNavigate();
  const { 
    currentUser, departments, devices, trackings, trackingCategories, 
    addTracking, addTrackingCategory, oilFilterInterval, setOilFilterInterval, deleteTracking
  } = useAppStore();

  // Selected drilldown states
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Form states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // New Log Entry fields
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Category-specific fields
  const [acAction, setAcAction] = useState('');
  const [oilCurrentCounter, setOilCurrentCounter] = useState(0);
  const [customLogDetails, setCustomLogDetails] = useState('');
  
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeDevice = devices.find((d) => d.id === selectedDeviceId);
  const activeDept = departments.find((d) => d.id === selectedDeptId);

  // Filter trackings for the active device and active category
  const activeDeviceLogs = trackings.filter(
    (t) => t.deviceId === selectedDeviceId && t.type === selectedCategory
  );

  // Handlers
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    addTrackingCategory(newCategoryName.trim());
    setNewCategoryName('');
    setIsCategoryModalOpen(false);
    showAlert('success', 'تمت إضافة فئة صيانة دورية جديدة!');
  };

  const handleCreateLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceId || !selectedCategory) return;

    let details: any = {};

    if (selectedCategory === 'تكييف') {
      if (!acAction.trim()) {
        showAlert('error', 'يرجى كتابة ما تم عمله صيانة للتكييف');
        return;
      }
      details = { action: acAction.trim() };
    } else if (selectedCategory === 'زيوت وفلاتر') {
      if (oilCurrentCounter <= 0) {
        showAlert('error', 'يرجى إدخال قراءة عداد صالحة');
        return;
      }
      details = {
        currentCounter: Number(oilCurrentCounter),
        nextCounter: Number(oilCurrentCounter) + Number(oilFilterInterval)
      };
    } else if (selectedCategory === 'بطاريات') {
      details = {
        deviceName: activeDevice?.name || '',
        model: activeDevice?.model || '',
        serialNumber: activeDevice?.serialNumber || '',
        replacementDate: logDate
      };
    } else {
      // Custom tracking category
      if (!customLogDetails.trim()) {
        showAlert('error', 'يرجى كتابة تفاصيل الصيانة والملاحظات');
        return;
      }
      details = { remarks: customLogDetails.trim() };
    }

    addTracking({
      deviceId: selectedDeviceId,
      type: selectedCategory,
      date: logDate,
      details
    });

    showAlert('success', 'تم تسجيل الصيانة الدورية بنجاح في جدول تاريخ الجهاز!');
    
    // Clear inputs
    setAcAction('');
    setOilCurrentCounter(0);
    setCustomLogDetails('');
  };

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 3500);
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Toast alert */}
      {alertMsg && (
        <div className={`fixed top-4 left-4 z-50 p-4 rounded-xl shadow-lg border text-sm flex items-center gap-3 animate-bounce ${
          alertMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <CheckCircle className="text-emerald-500" />
          <strong>{alertMsg.text}</strong>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer border border-slate-200 flex items-center justify-center shadow-sm"
            title="العودة للوحة الرئيسية"
          >
            <ArrowRight size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">متابعة الصيانة الدورية للأجهزة</h2>
            <p className="text-slate-700 text-sm mt-1">تتبع مجدول للتكييف، الزيوت والفلاتر، البطاريات، والصيانة المخصصة.</p>
          </div>
        </div>

        {currentUser?.role === 'admin' && selectedCategory === 'زيوت وفلاتر' && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center gap-4 text-xs">
            <Settings2 className="text-blue-800" size={20} />
            <div>
              <label className="block text-slate-800 font-bold mb-1">المدير: ضبط فاصلي عداد الزيت (الافتراضي)</label>
              <div className="flex gap-2">
                <input 
                  type="number"
                  value={oilFilterInterval}
                  onChange={(e) => setOilFilterInterval(Number(e.target.value))}
                  className="w-24 px-2 py-1.5 border border-slate-300 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 bg-white text-center font-bold"
                />
                <span className="text-slate-700 self-center">وحدة</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Breadcrumbs Navigation for Categories drilldown */}
      {(selectedCategory || selectedDeptId || selectedDeviceId) && (
        <div className="bg-white px-6 py-4 rounded-xl border border-slate-200 flex items-center gap-3 text-sm font-bold">
          <span 
            onClick={() => { setSelectedCategory(null); setSelectedDeptId(null); setSelectedDeviceId(null); }}
            className="cursor-pointer text-slate-400 hover:text-slate-800 transition-colors"
          >
            فئات الصيانة
          </span>
          {selectedCategory && (
            <>
              <span className="text-slate-300">/</span>
              <span 
                onClick={() => { setSelectedDeptId(null); setSelectedDeviceId(null); }}
                className={`cursor-pointer text-slate-400 hover:text-slate-800 transition-colors ${!selectedDeptId ? 'text-slate-800' : ''}`}
              >
                الصيانة: {selectedCategory}
              </span>
            </>
          )}
          {selectedDeptId && (
            <>
              <span className="text-slate-300">/</span>
              <span 
                onClick={() => setSelectedDeviceId(null)}
                className={`cursor-pointer text-slate-400 hover:text-slate-800 transition-colors ${!selectedDeviceId ? 'text-slate-800' : ''}`}
              >
                قسم: {activeDept?.name}
              </span>
            </>
          )}
          {selectedDeviceId && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800">جهاز: {activeDevice?.name}</span>
            </>
          )}
        </div>
      )}

      {/* VIEW 1: Categories Selection Page */}
      {!selectedCategory && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {trackingCategories.map((cat) => {
              // Count all logs under this type
              const logCount = trackings.filter((t) => t.type === cat).length;
              return (
                <div 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-44 group"
                >
                  <div className="flex justify-between items-start">
                    <div className="bg-blue-50 text-blue-800 group-hover:bg-blue-600 group-hover:text-white p-3 rounded-xl transition-all">
                      <Wrench size={22} />
                    </div>
                    <span className="text-slate-400 text-xs font-bold font-mono bg-slate-100 px-2 py-1 rounded">
                      {logCount} سجلات
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-800 transition-all">{cat}</h3>
                    <p className="text-xs text-slate-700">متابعة سجلات ومعايرة صيانة الـ {cat}.</p>
                  </div>
                </div>
              );
            })}

            {/* Add Routine Maintenance Category Button */}
            <div 
              onClick={() => setIsCategoryModalOpen(true)}
              className="bg-dashed border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 rounded-2xl p-6 h-44 flex flex-col items-center justify-center cursor-pointer transition-all group"
            >
              <PlusCircle size={32} className="text-slate-400 group-hover:text-blue-500 transition-colors mb-2" />
              <strong className="text-slate-800 group-hover:text-blue-800 transition-colors text-sm">إضافة نوع صيانة جديدة</strong>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Department Selection under chosen Category */}
      {selectedCategory && !selectedDeptId && (
        <div className="space-y-4 animate-fadeIn">
          <h3 className="text-lg font-bold text-slate-800">اختر القسم لمتابعة أجهزته</h3>
          
          {(() => {
            const trackedDepts = departments.filter((dept) => {
              const deptDevs = devices.filter((d) => d.departmentId === dept.id);
              return deptDevs.some(dev => trackings.some(t => t.deviceId === dev.id && t.type === selectedCategory));
            });
            const untrackedDepts = departments.filter(d => !trackedDepts.includes(d));

            return (
              <>
                {trackedDepts.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl text-center border">
                    <span className="text-sm text-slate-700">لا توجد أقسام مدرجة في هذه الفئة حتى الآن.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {trackedDepts.map((dept) => {
                      const deptDevs = devices.filter((d) => d.departmentId === dept.id);
                      const trackedCount = deptDevs.filter(dev => trackings.some(t => t.deviceId === dev.id && t.type === selectedCategory)).length;
                      return (
                        <div 
                          key={dept.id}
                          onClick={() => setSelectedDeptId(dept.id)}
                          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 transition-all cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <h4 className="font-bold text-slate-800 text-base">{dept.name}</h4>
                            <span className="text-slate-400 text-xs mt-1 block">يضم {trackedCount} جهاز مدرج بالمتابعة</span>
                          </div>
                          <ArrowRight size={18} className="text-slate-400" />
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentUser?.role === 'admin' && untrackedDepts.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <h4 className="text-base font-bold text-slate-800 mb-4">إدراج قسم للمتابعة (خاص بالمدير)</h4>
                    <select 
                      className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white cursor-pointer"
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedDeptId(e.target.value);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>-- اختر القسم للإدراج --</option>
                      {untrackedDepts.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* VIEW 3: Device Selection under Department */}
      {selectedCategory && selectedDeptId && !selectedDeviceId && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">الأجهزة المدرجة بالمتابعة لقسم ({activeDept?.name})</h3>
            <button 
              onClick={() => setSelectedDeptId(null)} 
              className="text-xs text-blue-800 hover:underline cursor-pointer"
            >
              الرجوع لاختيار قسم آخر
            </button>
          </div>

          {(() => {
            const deptDevices = devices.filter((d) => d.departmentId === selectedDeptId);
            const trackedDevices = deptDevices.filter((dev) => 
              trackings.some((t) => t.deviceId === dev.id && t.type === selectedCategory)
            );
            const untrackedDevices = deptDevices.filter((dev) => 
              !trackings.some((t) => t.deviceId === dev.id && t.type === selectedCategory)
            );

            return (
              <>
                {trackedDevices.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl text-center border">
                    <span className="text-sm text-slate-700">لا توجد أجهزة مدرجة في هذه الفئة للقسم المحدد.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {trackedDevices.map((dev) => {
                      const logsCount = trackings.filter((t) => t.deviceId === dev.id && t.type === selectedCategory).length;
                      return (
                        <div 
                          key={dev.id}
                          onClick={() => setSelectedDeviceId(dev.id)}
                          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 transition-all cursor-pointer flex flex-col justify-between h-36"
                        >
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{dev.name}</h4>
                            <span className="text-slate-400 text-xs font-mono mt-1 block">ID: {dev.customId}</span>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs mt-4 pt-3 border-t border-slate-50">
                            <span className="text-slate-700">مجموع الفحوصات:</span>
                            <strong className="bg-blue-50 text-blue-900 px-2.5 py-1 rounded-full font-bold">
                              {logsCount} فحوصات دورية
                            </strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentUser?.role === 'admin' && untrackedDevices.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <h4 className="text-base font-bold text-slate-800 mb-4">إدراج جهاز جديد للمتابعة (خاص بالمدير)</h4>
                    <div className="flex gap-4 items-end">
                      <div className="flex-1 max-w-md">
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">اختر جهازاً من القسم لإدراجه في فئة ({selectedCategory}):</label>
                        <select 
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white cursor-pointer"
                          onChange={(e) => {
                            if (e.target.value) {
                              setSelectedDeviceId(e.target.value);
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>-- اختر الجهاز للإدراج وبدء التسجيل --</option>
                          {untrackedDevices.map((d) => (
                            <option key={d.id} value={d.id}>{d.name} (ID: {d.customId})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* VIEW 4: Device Detailed Tracking History & Logger Form */}
      {selectedCategory && selectedDeptId && selectedDeviceId && activeDevice && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* New Log Logger Form */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PlusCircle className="text-blue-800" size={20} />
              تسجيل عملية صيانة دورية
            </h3>

            <form onSubmit={handleCreateLogSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">تاريخ إجراء الصيانة الدورية *</label>
                <input 
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  required
                />
              </div>

              {/* Dynamic Inputs based on Category */}
              {selectedCategory === 'تكييف' && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">ما تم عمله صيانة للتكييف بالتفصيل *</label>
                  <textarea
                    value={acAction}
                    onChange={(e) => setAcAction(e.target.value)}
                    rows={4}
                    placeholder="مثال: تم تنظيف الفلاتر الخارجية، غسل لفائف المكثف، وفحص ضغط غاز التبريد."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    required
                  ></textarea>
                </div>
              )}

              {selectedCategory === 'زيوت وفلاتر' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">قراءة العداد الحالي لجهاز الجري / التشغيل *</label>
                    <input 
                      type="number"
                      value={oilCurrentCounter}
                      onChange={(e) => setOilCurrentCounter(Number(e.target.value))}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold font-mono"
                      min="1"
                      required
                    />
                  </div>

                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
                    <span className="block mb-1">العداد التقريبي المجدول للمرة القادمة:</span>
                    <strong className="text-sm font-bold font-mono">
                      {Number(oilCurrentCounter) + Number(oilFilterInterval)} وحدة
                    </strong>
                    <span className="block text-[10px] text-amber-900 mt-1">
                      (تم الاحتساب بناءً على فترة الجدولة المحددة من الإدارة: {oilFilterInterval} وحدة)
                    </span>
                  </div>
                </div>
              )}

              {selectedCategory === 'بطاريات' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border text-xs">
                  <span className="font-bold text-slate-800 block mb-1">سيتم ربط صيانة البطارية بالبيانات التالية:</span>
                  <div>
                    <span className="text-slate-400">اسم الجهاز:</span>
                    <strong className="text-slate-800 block">{activeDevice.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">الموديل:</span>
                    <strong className="text-slate-800 block">{activeDevice.model}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">الرقم التسلسلي (Serial):</span>
                    <strong className="text-slate-800 block font-mono">{activeDevice.serialNumber}</strong>
                  </div>
                </div>
              )}

              {/* Custom categories */}
              {selectedCategory !== 'تكييف' && selectedCategory !== 'زيوت وفلاتر' && selectedCategory !== 'بطاريات' && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">ملاحظات وتقرير صيانة الـ {selectedCategory} بالتفصيل *</label>
                  <textarea
                    value={customLogDetails}
                    onChange={(e) => setCustomLogDetails(e.target.value)}
                    rows={4}
                    placeholder="اكتب هنا كافة تفاصيل المعاينة والإجراءات الفنية التي اتخذتها..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    required
                  ></textarea>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md text-sm cursor-pointer transition-colors"
              >
                حفظ وإدراج بجدول التاريخ
              </button>
            </form>
          </div>

          {/* Historical Logs List */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Bookmark className="text-slate-700" size={20} />
                سجل صيانة الجهاز السابقة ({selectedCategory})
              </h3>
              
              <button 
                onClick={() => setSelectedDeviceId(null)}
                className="text-xs text-blue-800 hover:underline cursor-pointer"
              >
                تغيير الجهاز
              </button>
            </div>

            {activeDeviceLogs.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-700 text-xs">
                لا توجد سجلات صيانة دورية مدونة لهذا الجهاز مسبقاً في فئة ({selectedCategory}).
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {activeDeviceLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative group">
                    {/* Delete entry option for Admins */}
                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => setLogToDelete(log.id)}
                        className="absolute top-4 left-4 text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="حذف السجل"
                      >
                        <X size={14} />
                      </button>
                    )}

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar size={14} />
                      <span className="font-mono">{log.date}</span>
                    </div>

                    {/* AC Details */}
                    {log.type === 'تكييف' && (
                      <div className="text-xs font-semibold text-slate-700 whitespace-pre-line leading-relaxed">
                        ما تم عمله: {log.details?.action}
                      </div>
                    )}

                    {/* Oil Details */}
                    {log.type === 'زيوت وفلاتر' && (
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border">
                          <span className="text-slate-400 block mb-0.5">قراءة العداد عند الصيانة:</span>
                          <strong className="text-slate-800 font-bold font-mono">{log.details?.currentCounter} وحدة</strong>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border">
                          <span className="text-slate-400 block mb-0.5">العداد القادم المستحق:</span>
                          <strong className="text-emerald-700 font-bold font-mono">{log.details?.nextCounter} وحدة</strong>
                        </div>
                      </div>
                    )}

                    {/* Battery Details */}
                    {log.type === 'بطاريات' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-800 bg-white p-3 rounded-lg border">
                        <div>
                          <span>اسم الجهاز: </span>
                          <strong className="text-slate-800 font-bold">{log.details?.deviceName}</strong>
                        </div>
                        <div>
                          <span>طراز / موديل: </span>
                          <strong className="text-slate-800 font-bold">{log.details?.model}</strong>
                        </div>
                        <div>
                          <span>الرقم التسلسلي (S/N): </span>
                          <strong className="text-slate-800 font-bold font-mono">{log.details?.serialNumber}</strong>
                        </div>
                        <div>
                          <span>تاريخ التغيير الفعلي للبطارية: </span>
                          <strong className="text-blue-900 font-bold font-mono">{log.details?.replacementDate}</strong>
                        </div>
                      </div>
                    )}

                    {/* Custom log details */}
                    {log.type !== 'تكييف' && log.type !== 'زيوت وفلاتر' && log.type !== 'بطاريات' && (
                      <div className="text-xs font-semibold text-slate-700 whitespace-pre-line leading-relaxed">
                        ملاحظات الفحص والتقرير: {log.details?.remarks}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Add Custom Tracking Category */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md text-right relative">
            <button 
              onClick={() => setIsCategoryModalOpen(false)} 
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-800 cursor-pointer"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-4">إضافة نوع صيانة دورية مخصص</h3>
            <form onSubmit={handleAddCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">اسم فئة الصيانة الجديدة</label>
                <input 
                  type="text" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="مثال: معايرة سنوية، تنظيف وتطهير" 
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-right"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                تأكيد وإضافة
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Log Delete Confirm Modal */}
      {logToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md text-right relative">
            <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">حذف سجل الصيانة</h3>
            <p className="text-slate-800 text-sm text-center mb-6">
              هل أنت متأكد من رغبتك في حذف هذا السجل الفردي من الأرشيف الدوري؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  deleteTracking(logToDelete);
                  showAlert('success', 'تم حذف سجل الصيانة بنجاح.');
                  setLogToDelete(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setLogToDelete(null)}
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
