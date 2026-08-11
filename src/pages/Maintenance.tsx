import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { MaintenanceRequest, RequestStatus } from '../types';
import { 
  FileText, Plus, CheckCircle2, Wrench, AlertCircle, Clock, CheckCircle, 
  Printer, ClipboardList, Info, HelpCircle, X, ShieldAlert, ArrowRight, Save, Home, Download
} from 'lucide-react';

export default function Maintenance() {
  const navigate = useNavigate();
  const { 
    currentUser, departments, devices, requests, addMaintenanceRequest, updateMaintenanceRequest 
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // New Request Form State
  const [targetDeptId, setTargetDeptId] = useState(currentUser?.departmentId || '');
  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [complaintText, setComplaintText] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  // Maintenance Report Editing Form (For Tech / Admin)
  const [initialReport, setInitialReport] = useState('');
  const [requiredParts, setRequiredParts] = useState('');
  const [finalReport, setFinalReport] = useState('');
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Print view state
  const [printRequest, setPrintRequest] = useState<MaintenanceRequest | null>(null);

  // Filter requests based on role
  const filteredRequests = requests.filter((req) => {
    if (currentUser?.role === 'supervisor') {
      // Supervisor only sees their own department's requests
      return req.departmentId === currentUser.departmentId;
    }
    return true; // Techs and Admins see everything
  });

  // Get active requests
  const activeRequest = requests.find((r) => r.id === selectedRequestId);
  const activeDevice = activeRequest ? devices.find((d) => d.id === activeRequest.deviceId) : null;
  const activeDept = activeRequest ? departments.find((d) => d.id === activeRequest.departmentId) : null;

  // Set default device selection when supervisor department is locked
  const supervisorDevices = devices.filter((d) => d.departmentId === targetDeptId);

  // Quick info about selected device in form
  const selectedDeviceObj = devices.find((d) => d.id === targetDeviceId);

  // Handlers
  const handleCreateRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess('');

    if (!targetDeptId) {
      setRequestError('يرجى تحديد القسم الطبي المعني');
      return;
    }
    if (!targetDeviceId) {
      setRequestError('يرجى اختيار الجهاز المعطل لإرسال بلاغ الصيانة');
      return;
    }
    if (!complaintText.trim()) {
      setRequestError('يرجى كتابة شكوى أو وصف للعطل لمساعدة الفني');
      return;
    }

    addMaintenanceRequest({
      departmentId: targetDeptId,
      deviceId: targetDeviceId,
      date: new Date().toISOString().split('T')[0],
      complaint: complaintText.trim()
    });

    setRequestSuccess('تم إرسال بلاغ الصيانة بنجاح للفنيين باللون الأحمر المفتوح!');
    setComplaintText('');
    setTargetDeviceId('');
    setTimeout(() => {
      setRequestSuccess('');
      setActiveTab('list');
    }, 2000);
  };

  const handleClaimRequest = () => {
    if (!selectedRequestId) return;
    updateMaintenanceRequest(selectedRequestId, { status: 'in_progress' });
    showAlert('success', 'تم استلام الشكوى وبدء الصيانة بنجاح! تحول البلاغ للون الأصفر.');
  };

  const handleSaveProgress = () => {
    if (!selectedRequestId) return;
    updateMaintenanceRequest(selectedRequestId, {
      initialReport: initialReport.trim(),
      requiredParts: requiredParts.trim(),
      finalReport: finalReport.trim()
    });
    showAlert('success', 'تم حفظ تقرير الصيانة مبدئياً بنجاح.');
  };

  const handleCompleteRequest = () => {
    if (!selectedRequestId) return;
    updateMaintenanceRequest(selectedRequestId, {
      status: 'completed',
      initialReport: initialReport.trim(),
      requiredParts: requiredParts.trim(),
      finalReport: finalReport.trim()
    });
    showAlert('success', 'تم إصلاح العطل بالكامل بنجاح! تحول البلاغ للون الأخضر.');
  };

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 3500);
  };

  const loadRequestForTech = (req: MaintenanceRequest) => {
    setSelectedRequestId(req.id);
    setInitialReport(req.initialReport || '');
    setRequiredParts(req.requiredParts || '');
    setFinalReport(req.finalReport || '');
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch(status) {
      case 'pending':
        return <span className="bg-red-100 text-red-800 border border-red-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit">● مفتوح (بلاغ أحمر)</span>;
      case 'in_progress':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit">● قيد الصيانة (بلاغ أصفر)</span>;
      case 'completed':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit">✓ تم الصيانة (بلاغ أخضر)</span>;
    }
  };

  return (
    <div className="space-y-6 text-right font-sans relative" dir="rtl">
      {/* Toast Alert */}
      {alertMsg && (
        <div className={`fixed top-4 left-4 z-50 p-4 rounded-xl shadow-lg border text-sm flex items-center gap-3 animate-bounce ${
          alertMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <CheckCircle className="text-emerald-500" />
          <strong>{alertMsg.text}</strong>
        </div>
      )}

      {/* Page Header & Tabs */}
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
            <h2 className="text-2xl font-bold text-slate-800">إدارة طلبات صيانة الأجهزة</h2>
            <p className="text-slate-700 text-sm mt-1">
              {currentUser?.role === 'supervisor' ? 'متابعة وتقديم بلاغات الأعطال للقسم' : 'تلقي بلاغات الأعطال الفورية وصيانتها'}
            </p>
          </div>
        </div>

        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => { setActiveTab('list'); setSelectedRequestId(null); }}
            className={`px-5 py-2.5 font-bold text-sm transition-all rounded-xl cursor-pointer ${activeTab === 'list' && !selectedRequestId ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'text-slate-700 hover:bg-slate-50'}`}
          >
            جميع طلبات الصيانة ({filteredRequests.length})
          </button>
          
          <button
            onClick={() => { setActiveTab('new'); setSelectedRequestId(null); }}
            className={`px-5 py-2.5 font-bold text-sm transition-all rounded-xl cursor-pointer ${activeTab === 'new' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'text-slate-700 hover:bg-slate-50'}`}
          >
            تقديم بلاغ عطل جديد
          </button>
        </div>
      </div>

      {/* TAB 1: Requests Browse List */}
      {activeTab === 'list' && !selectedRequestId && (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <ClipboardList size={48} className="text-slate-300 mx-auto mb-4" />
              <h3 className="font-bold text-slate-700 mb-1">لا توجد بلاغات أعطال حالياً!</h3>
              <p className="text-slate-700 text-xs">الأقسام الطبية تعمل بصورة ممتازة والأجهزة الطبية سليمة.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {filteredRequests.map((req) => {
                const dev = devices.find((d) => d.id === req.deviceId);
                const dept = departments.find((d) => d.id === req.departmentId);
                
                return (
                  <div 
                    key={req.id}
                    onClick={() => loadRequestForTech(req)}
                    className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <strong className="text-slate-800 text-base">{dev?.name || 'جهاز مجهول'}</strong>
                        <span className="text-slate-400 text-xs">•</span>
                        <span className="text-slate-800 text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-md">
                          قسم: {dept?.name || 'مجهول'}
                        </span>
                        <span className="text-slate-400 text-xs">•</span>
                        <span className="text-slate-700 text-xs font-mono">{req.date}</span>
                      </div>
                      
                      <p className="text-slate-800 text-sm line-clamp-1 leading-relaxed pl-4">
                        الشكوى: {req.complaint}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {getStatusBadge(req.status)}
                      <button className="text-blue-800 hover:bg-blue-50 text-xs font-bold px-3 py-1.5 rounded-lg border border-transparent hover:border-blue-200 cursor-pointer">
                        عرض وتحديث البلاغ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Submit New Maintenance Request */}
      {activeTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <ShieldAlert className="text-red-500" />
              تعبئة استمارة بلاغ صيانة عاجل
            </h3>

            {requestError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-100 text-xs mb-4">
                {requestError}
              </div>
            )}
            {requestSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-xs mb-4">
                {requestSuccess}
              </div>
            )}

            <form onSubmit={handleCreateRequestSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">القسم المعني بالبلاغ *</label>
                  <select
                    value={targetDeptId}
                    onChange={(e) => { setTargetDeptId(e.target.value); setTargetDeviceId(''); }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                    disabled={currentUser?.role === 'supervisor'}
                    required
                  >
                    <option value="">-- اختر القسم الطبي --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">الجهاز المعطل بالقسم *</label>
                  <select
                    value={targetDeviceId}
                    onChange={(e) => setTargetDeviceId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                    required
                  >
                    <option value="">-- اختر الجهاز --</option>
                    {supervisorDevices.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} (ID: {d.customId})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Display selected device info */}
              {selectedDeviceObj && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-700">طراز / موديل الجهاز:</span>
                    <strong className="text-slate-800 block mt-0.5">{selectedDeviceObj.model}</strong>
                  </div>
                  <div>
                    <span className="text-slate-700">الرقم التسلسلي (Serial):</span>
                    <strong className="text-slate-800 block mt-0.5 font-mono">{selectedDeviceObj.serialNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-700">مستلم العهدة:</span>
                    <strong className="text-slate-800 block mt-0.5">{selectedDeviceObj.custodian}</strong>
                  </div>
                  <div>
                    <span className="text-slate-700">تاريخ اليوم (تلقائي):</span>
                    <strong className="text-slate-800 block mt-0.5 font-mono">{new Date().toISOString().split('T')[0]}</strong>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">وصف العطل بالتفصيل (الشكوى) *</label>
                <textarea
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  rows={4}
                  placeholder="يرجى كتابة تفاصيل ما يحدث مع الجهاز لإفادة الفني..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors cursor-pointer text-sm"
              >
                إرسال البلاغ الفوري للأعطال
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">تنويه هام للسلامة</h3>
            <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
              <p>
                - بمجرد إرسال البلاغ، سيتم إخطار جميع فنيي الصيانة المناوبين عبر إشارات تنبيه حمراء فورية.
              </p>
              <p>
                - يرجى فصل الجهاز المعطل وتدوين ملاحظة ورقية عليه تفيد بأنه قيد الصيانة لمنع استخدامه طبيًا.
              </p>
              <p>
                - يستطيع المشرف متابعة انتقال البلاغ من "مفتوح" إلى "قيد الصيانة" ثم "تم الإصلاح".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DRILL DOWN VIEW: Active Request Maintenance Logs */}
      {selectedRequestId && activeRequest && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <button
              onClick={() => setSelectedRequestId(null)}
              className="flex items-center gap-2 text-slate-700 hover:text-slate-800 font-bold text-sm cursor-pointer"
            >
              <ArrowRight size={18} />
              الرجوع لكافة البلاغات
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setPrintRequest(activeRequest)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-slate-200"
              >
                <Printer size={14} />
                إصدار تقرير صيانة مطبوع
              </button>
              {getStatusBadge(activeRequest.status)}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Device and Complaint specifications */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">بيانات العهدة المستهدفة</span>
                <h3 className="text-lg font-bold text-slate-800">{activeDevice?.name}</h3>
                <span className="text-xs font-semibold text-slate-700">ID المخصص: {activeDevice?.customId}</span>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3 text-xs text-slate-800">
                <div className="flex justify-between">
                  <span>القسم الطبي:</span>
                  <strong className="text-slate-800 font-bold">{activeDept?.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span>موديل الجهاز:</span>
                  <strong className="text-slate-800 font-bold">{activeDevice?.model}</strong>
                </div>
                <div className="flex justify-between">
                  <span>الرقم التسلسلي:</span>
                  <strong className="text-slate-800 font-bold font-mono">{activeDevice?.serialNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span>مستلم العهدة الحالي:</span>
                  <strong className="text-slate-800 font-bold">{activeDevice?.custodian}</strong>
                </div>
                <div className="flex justify-between">
                  <span>تاريخ الشكوى:</span>
                  <strong className="text-slate-800 font-bold font-mono">{activeRequest.date}</strong>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <h4 className="text-xs font-bold text-red-800 mb-1 flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  وصف الشكوى الطبية المدونة:
                </h4>
                <p className="text-xs text-red-700 leading-relaxed whitespace-pre-line font-medium">
                  {activeRequest.complaint}
                </p>
              </div>
            </div>

            {/* Technical Reports Panel (Techs & Admins can write / Supervisors can only read) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="text-blue-800" />
                تقرير تشخيص وصيانة الجهاز
              </h3>

              {currentUser?.role !== 'supervisor' ? (
                /* Technician Editing Inputs */
                <div className="space-y-4">
                  {activeRequest.status === 'pending' && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div>
                        <strong className="text-xs font-bold text-amber-800 block">هل بدأت فحص الجهاز وصيانته؟</strong>
                        <p className="text-xs text-amber-900 mt-1">اضغط لاستلام الشكوى وتحويلها لقيد الصيانة فوراً لإعلام مشرف القسم.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClaimRequest}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                      >
                        تم استلام الشكوى وبدء الفحص
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">أولاً: تقرير مبدأي للصيانة (التشخيص)</label>
                      <textarea
                        value={initialReport}
                        onChange={(e) => setInitialReport(e.target.value)}
                        rows={3}
                        placeholder="دون هنا تشخيصك الأولي للمشكلة والأعطال..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">ثانياً: طلب القطع اللازمة للإصلاح</label>
                      <textarea
                        value={requiredParts}
                        onChange={(e) => setRequiredParts(e.target.value)}
                        rows={3}
                        placeholder="اكتب هنا أسماء قطع الغيار المطلوبة للطلب..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                      ></textarea>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">ثالثاً: التقرير النهائي للإصلاح (الإجراء الفني)</label>
                    <textarea
                      value={finalReport}
                      onChange={(e) => setFinalReport(e.target.value)}
                      rows={3}
                      placeholder="دون تفاصيل عملك النهائي وكيف تم حل العطل..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    ></textarea>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSaveProgress}
                      className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow"
                    >
                      <Save size={14} />
                      حفظ التقدم (مبدئياً)
                    </button>

                    {activeRequest.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={handleCompleteRequest}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow"
                      >
                        <CheckCircle2 size={14} />
                        تم الإصلاح بالكامل (إغلاق الطلب)
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Supervisor Read-Only Layout */
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <h4 className="font-bold text-slate-700 text-xs mb-1.5">أولاً: تقرير الصيانة المبدئي والتشخيص</h4>
                    <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                      {activeRequest.initialReport || 'بانتظار مباشرة التشخيص الأولي للفحص من الفني...'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <h4 className="font-bold text-slate-700 text-xs mb-1.5">ثانياً: قطع الغيار ومستلزمات الصيانة المطلوبة</h4>
                    <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                      {activeRequest.requiredParts || 'لم يتم تدوين مستلزمات إضافية حالياً.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <h4 className="font-bold text-slate-700 text-xs mb-1.5">ثالثاً: التقرير النهائي للإصلاح والتشغيل الميداني</h4>
                    <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                      {activeRequest.finalReport || 'بانتظار إنجاز أعمال الصيانة النهائية من قبل الفني وإصدار التقرير.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRINT DIALOG OVERLAY (BEAUTIFUL PHYSICAL REPORT CARD) */}
      {printRequest && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl p-8 max-w-3xl w-full text-slate-800 relative shadow-2xl space-y-6">
            <button
              onClick={() => setPrintRequest(null)}
              className="absolute top-6 left-6 text-slate-400 hover:text-slate-800 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer print:hidden"
            >
              <X size={24} />
            </button>

            {/* Print Header */}
            <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6">
              <h2 className="text-xl font-bold font-sans">المستشفى العام - قسم الأجهزة الطبية والصيانة</h2>
              <h3 className="text-lg font-bold font-sans tracking-wide bg-slate-100 inline-block px-6 py-1.5 rounded-lg border border-slate-200">
                تقرير فني لصيانة جهاز طبي
              </h3>
              <p className="text-xs text-slate-700">مستخرج تلقائياً من نظام إدارة العهد والصيانة</p>
            </div>

            {/* Report Content Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs">
              <div className="border-b pb-2">
                <span className="text-slate-700 font-bold block mb-0.5">اسم الجهاز الطبي:</span>
                <strong className="text-slate-800 text-sm">
                  {devices.find((d) => d.id === printRequest.deviceId)?.name}
                </strong>
              </div>
              <div className="border-b pb-2">
                <span className="text-slate-700 font-bold block mb-0.5">الرقم المخصص الموحد (ID):</span>
                <strong className="text-slate-800 text-sm font-mono">
                  {devices.find((d) => d.id === printRequest.deviceId)?.customId}
                </strong>
              </div>
              <div className="border-b pb-2">
                <span className="text-slate-700 font-bold block mb-0.5">القسم الطبي الموطن:</span>
                <strong className="text-slate-800 text-sm">
                  {departments.find((d) => d.id === printRequest.departmentId)?.name}
                </strong>
              </div>
              <div className="border-b pb-2">
                <span className="text-slate-700 font-bold block mb-0.5">طراز وموديل الجهاز:</span>
                <strong className="text-slate-800 text-sm">
                  {devices.find((d) => d.id === printRequest.deviceId)?.model}
                </strong>
              </div>
              <div className="border-b pb-2">
                <span className="text-slate-700 font-bold block mb-0.5">الرقم التسلسلي (S/N):</span>
                <strong className="text-slate-800 text-sm font-mono">
                  {devices.find((d) => d.id === printRequest.deviceId)?.serialNumber}
                </strong>
              </div>
              <div className="border-b pb-2">
                <span className="text-slate-700 font-bold block mb-0.5">تاريخ تحرير البلاغ:</span>
                <strong className="text-slate-800 text-sm font-mono">{printRequest.date}</strong>
              </div>
            </div>

            {/* Detailed sections */}
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-red-50/50 rounded-lg border border-red-200">
                <span className="text-red-900 font-bold block mb-1">الشكوى الأساسية المدونة (مشرف القسم):</span>
                <p className="text-slate-700 leading-relaxed font-medium">{printRequest.complaint}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-900 font-bold block mb-1">التقرير الفني المبدئي والتشخيص:</span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {printRequest.initialReport || 'لم يتم تدوين فحص أولي.'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-900 font-bold block mb-1">قطع الغيار ومستلزمات الصيانة المطلوبة:</span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {printRequest.requiredParts || 'لا توجد قطع غيار مطلوبة.'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-900 font-bold block mb-1">التقرير النهائي الفني للإصلاح والتشغيل الميداني:</span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {printRequest.finalReport || 'الصيانة لا تزال مستمرة.'}
                </p>
              </div>
            </div>

            {/* Signatures section for filing */}
            <div className="pt-8 border-t border-dashed grid grid-cols-2 text-center text-xs">
              <div>
                <span className="text-slate-700 font-bold block mb-8">اسم وتوقيع فني الصيانة</span>
                <div className="border-b border-slate-400 w-32 mx-auto"></div>
              </div>
              <div>
                <span className="text-slate-700 font-bold block mb-8">اسم واعتماد رئيس القسم الفني</span>
                <div className="border-b border-slate-400 w-32 mx-auto"></div>
              </div>
            </div>

            {/* Print trigger controls */}
            <div className="pt-4 border-t flex justify-end gap-3 print:hidden">
              <button
                onClick={() => {
                  showAlert('success', 'يرجى اختيار (Save as PDF) أو (حفظ بتنسيق PDF) من نافذة الطباعة.');
                  setTimeout(() => window.print(), 500);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow"
              >
                <Download size={14} />
                حفظ كملف PDF
              </button>
              <button
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow"
              >
                <Printer size={14} />
                بدء طباعة المستند
              </button>
              <button
                onClick={() => setPrintRequest(null)}
                className="border border-slate-300 px-5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
