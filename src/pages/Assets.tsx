import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { Device, DeviceStatus } from '../types';
import { 
  Plus, Edit3, Trash2, ArrowRight, Download, Upload, Image as ImageIcon, 
  Camera, Package, Tag, FileText, CheckCircle2, AlertOctagon, X, User, Home
} from 'lucide-react';

export default function Assets() {
  const navigate = useNavigate();
  const { 
    currentUser, departments, devices, addDepartment, updateDepartment, deleteDepartment,
    addDevice, updateDevice, deleteDevice, accessoriesList, addAccessory, importDatabase
  } = useAppStore();

  // Navigation State
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Modal / Form States
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isEditDeptOpen, setIsEditDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [editDeptName, setEditDeptName] = useState('');

  const [isDeviceFormOpen, setIsDeviceFormOpen] = useState(false);
  const [isEditDevice, setIsEditDevice] = useState(false);

  // New Device Form fields
  const [devName, setDevName] = useState('');
  const [devCustomId, setDevCustomId] = useState('');
  const [devCurrentQty, setDevCurrentQty] = useState(1);
  const [devBookQty, setDevBookQty] = useState(1);
  const [devModel, setDevModel] = useState('');
  const [devSerial, setDevSerial] = useState('');
  const [devCompany, setDevCompany] = useState('');
  const [devCustodian, setDevCustodian] = useState('');
  const [devNotes, setDevNotes] = useState('');
  const [devStatus, setDevStatus] = useState<DeviceStatus>('شغال');
  const [devSelectedAccessories, setDevSelectedAccessories] = useState<string[]>([]);
  const [customAccessory, setCustomAccessory] = useState('');
  const [devImageUrl, setDevImageUrl] = useState('');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Refs & Alert States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvImportRef = useRef<HTMLInputElement>(null);
  const updateImageRef = useRef<HTMLInputElement>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Determine which departments to display based on user role
  const displayedDepartments = departments.filter((dept) => {
    if (currentUser?.role === 'supervisor') {
      return dept.id === currentUser.departmentId;
    }
    return true;
  });

  // Automatically drill supervisor into their department
  if (currentUser?.role === 'supervisor' && selectedDeptId === null) {
    setSelectedDeptId(currentUser.departmentId || null);
  }

  // Active Department & Devices
  const activeDept = departments.find((d) => d.id === selectedDeptId);
  const deptDevices = devices.filter((d) => d.departmentId === selectedDeptId);
  const activeDevice = devices.find((d) => d.id === selectedDeviceId);

  // Handlers
  const handleAddDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    addDepartment(newDeptName.trim());
    setNewDeptName('');
    setIsDeptModalOpen(false);
    showAlert('success', 'تمت إضافة القسم بنجاح!');
  };

  const handleEditDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeptName.trim() || !selectedDeptId) return;
    updateDepartment(selectedDeptId, editDeptName.trim());
    setIsEditDeptOpen(false);
    showAlert('success', 'تم تعديل اسم القسم بنجاح!');
  };

  const handleDeleteDept = () => {
    if (!selectedDeptId) return;
    const res = deleteDepartment(selectedDeptId);
    if (res.success) {
      setSelectedDeptId(null);
      showAlert('success', res.message);
    } else {
      showAlert('error', res.message);
    }
  };

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDevImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCustomAccessory = () => {
    if (!customAccessory.trim()) return;
    addAccessory(customAccessory.trim());
    setDevSelectedAccessories([...devSelectedAccessories, customAccessory.trim()]);
    setCustomAccessory('');
  };

  const toggleAccessory = (acc: string) => {
    if (devSelectedAccessories.includes(acc)) {
      setDevSelectedAccessories(devSelectedAccessories.filter((a) => a !== acc));
    } else {
      setDevSelectedAccessories([...devSelectedAccessories, acc]);
    }
  };

  // Device CRUD Handlers
  const openNewDeviceForm = () => {
    setIsEditDevice(false);
    setDevName('');
    setDevCustomId('');
    setDevCurrentQty(1);
    setDevBookQty(1);
    setDevModel('');
    setDevSerial('');
    setDevCompany('');
    setDevCustodian('');
    setDevNotes('');
    setDevStatus('شغال');
    setDevSelectedAccessories([]);
    setDevImageUrl('');
    setIsDeviceFormOpen(true);
  };

  const openEditDeviceForm = () => {
    if (!activeDevice) return;
    setIsEditDevice(true);
    setDevName(activeDevice.name);
    setDevCustomId(activeDevice.customId);
    setDevCurrentQty(activeDevice.currentQty);
    setDevBookQty(activeDevice.bookQty);
    setDevModel(activeDevice.model);
    setDevSerial(activeDevice.serialNumber);
    setDevCompany(activeDevice.company);
    setDevCustodian(activeDevice.custodian);
    setDevNotes(activeDevice.notes);
    setDevStatus(activeDevice.status);
    setDevSelectedAccessories(activeDevice.accessories || []);
    setDevImageUrl(activeDevice.imageUrl || '');
    setIsDeviceFormOpen(true);
  };

  const handleDeviceFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId || !devName.trim() || !devCustomId.trim()) {
      showAlert('error', 'يرجى تعبئة الحقول الأساسية: اسم الجهاز و ID الخاص به');
      return;
    }

    // Check if ID already exists (for other devices)
    const duplicateId = devices.some((dev) => dev.customId.trim() === devCustomId.trim() && (!isEditDevice || dev.id !== selectedDeviceId));
    if (duplicateId) {
      showAlert('error', 'رقم ID المخصص للجهاز مسجل مسبقاً لجهاز آخر! يرجى إدخال رقم فريد.');
      return;
    }

    const deviceData = {
      departmentId: selectedDeptId,
      name: devName.trim(),
      customId: devCustomId.trim(),
      currentQty: Number(devCurrentQty),
      bookQty: Number(devBookQty),
      model: devModel.trim(),
      serialNumber: devSerial.trim(),
      company: devCompany.trim(),
      accessories: devSelectedAccessories,
      status: devStatus,
      custodian: devCustodian.trim(),
      notes: devNotes.trim(),
      imageUrl: devImageUrl || undefined
    };

    if (isEditDevice && selectedDeviceId) {
      updateDevice(selectedDeviceId, deviceData);
      showAlert('success', 'تم تحديث بيانات الجهاز الطبية بنجاح!');
    } else {
      addDevice(deviceData);
      showAlert('success', 'تمت إضافة الجهاز الجديد للقسم!');
    }

    setIsDeviceFormOpen(false);
  };

  const handleDeleteDevice = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteDevice = () => {
    if (!selectedDeviceId) return;
    deleteDevice(selectedDeviceId);
    setSelectedDeviceId(null);
    setShowDeleteConfirm(false);
    showAlert('success', 'تم حذف الجهاز وسجلاته بنجاح!');
  };

  // CSV EXPORT (Arabic Compatible UTF-8 BOM)
  const handleExportCSV = () => {
    let csvContent = '\uFEFF'; // Excel Arabic Support BOM
    csvContent += 'القسم,اسم الجهاز,ID مخصص,الكمية الحالية,الكمية الدفترية,الفارق,الموديل,الرقم التسلسلي,الشركة المصنعة,الحالة,مستلم العهدة,التوابع والملحقات,ملاحظات\n';

    devices.forEach((dev) => {
      const dept = departments.find((d) => d.id === dev.departmentId);
      const row = [
        `"${dept?.name || ''}"`,
        `"${dev.name}"`,
        `"${dev.customId}"`,
        dev.currentQty,
        dev.bookQty,
        dev.difference,
        `"${dev.model}"`,
        `"${dev.serialNumber}"`,
        `"${dev.company}"`,
        `"${dev.status}"`,
        `"${dev.custodian}"`,
        `"${dev.accessories?.join(' / ') || ''}"`,
        `"${dev.notes?.replace(/\n/g, ' ') || ''}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `جرد_الأجهزة_والعهود_الطبية_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('success', 'تم تصدير ملف الجرد بنجاح!');
  };

  // CSV IMPORT
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split('\n');
        if (lines.length < 2) throw new Error('الملف فارغ أو غير متوافق');

        const importedDevices: Device[] = [];
        const uniqueDepts = new Set<string>();
        
        // Skip header
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Basic split (keeping quotes in mind if possible, or simple split)
          const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          if (columns.length < 10) continue;

          const clean = (val: string) => val ? val.replace(/^"|"$/g, '').trim() : '';

          const deptName = clean(columns[0]);
          const name = clean(columns[1]);
          const customId = clean(columns[2]);
          const currentQty = parseInt(clean(columns[3])) || 0;
          const bookQty = parseInt(clean(columns[4])) || 0;
          const model = clean(columns[6]);
          const serialNumber = clean(columns[7]);
          const company = clean(columns[8]);
          const status = (clean(columns[9]) as DeviceStatus) || 'شغال';
          const custodian = clean(columns[10]);
          const accessoriesRaw = clean(columns[11]);
          const notes = clean(columns[12]);

          if (deptName) uniqueDepts.add(deptName);

          importedDevices.push({
            id: `dev-imported-${i}-${Date.now()}`,
            departmentId: deptName, // temporary
            name,
            customId,
            currentQty,
            bookQty,
            difference: bookQty - currentQty,
            model,
            serialNumber,
            company,
            status,
            custodian,
            accessories: accessoriesRaw ? accessoriesRaw.split(' / ') : [],
            notes
          });
        }

        // Map department names to IDs (or create new departments)
        const updatedDepts = [...departments];
        uniqueDepts.forEach((deptName) => {
          if (!updatedDepts.some((d) => d.name === deptName)) {
            updatedDepts.push({ id: `d-imported-${deptName}-${Date.now()}`, name: deptName });
          }
        });

        // Resolve device department IDs
        const finalDevices = importedDevices.map((dev) => {
          const matchedDept = updatedDepts.find((d) => d.name === dev.departmentId);
          return {
            ...dev,
            departmentId: matchedDept ? matchedDept.id : 'd-1'
          };
        });

        importDatabase({
          departments: updatedDepts,
          devices: [...devices, ...finalDevices]
        });

        showAlert('success', `تم استيراد ${finalDevices.length} من الأجهزة والعهد بنجاح!`);
      } catch (err) {
        showAlert('error', 'فشل في قراءة ملف CSV. تأكد من توافق الأعمدة والترميز.');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Dynamic Alerts */}
      {alertMsg && (
        <div className={`fixed top-4 left-4 z-50 p-4 rounded-xl shadow-lg border text-sm flex items-center gap-3 animate-bounce ${
          alertMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {alertMsg.type === 'success' ? <CheckCircle2 className="text-emerald-500" /> : <AlertOctagon className="text-red-500" />}
          <strong>{alertMsg.text}</strong>
        </div>
      )}

      {/* Main Breadcrumb/Navigation Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200 ml-2"
            title="العودة للوحة الرئيسية"
          >
            <Home size={14} />
            الرئيسية
          </button>
          <span 
            className={`cursor-pointer text-slate-400 hover:text-slate-800 transition-colors font-bold ${selectedDeptId === null ? 'text-slate-800' : ''}`}
            onClick={() => { setSelectedDeptId(null); setSelectedDeviceId(null); }}
          >
            الأقسام والعهد
          </span>
          {selectedDeptId && (
            <>
              <ArrowRight size={16} className="text-slate-300" />
              <span 
                className={`cursor-pointer text-slate-400 hover:text-slate-800 transition-colors font-bold ${selectedDeviceId === null ? 'text-slate-800' : ''}`}
                onClick={() => setSelectedDeviceId(null)}
              >
                {activeDept?.name}
              </span>
            </>
          )}
          {selectedDeviceId && (
            <>
              <ArrowRight size={16} className="text-slate-300" />
              <span className="text-slate-800 font-bold">{activeDevice?.name}</span>
            </>
          )}
        </div>

        {/* Admin Import/Export Database Controls */}
        {currentUser?.role === 'admin' && selectedDeptId === null && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
            >
              <Download size={14} />
              تصدير الجرد (CSV)
            </button>
            
            <button
              onClick={() => csvImportRef.current?.click()}
              className="flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
            >
              <Upload size={14} />
              استيراد جرد خارجي
            </button>
            <input 
              type="file" 
              ref={csvImportRef} 
              onChange={handleImportCSV} 
              accept=".csv" 
              className="hidden" 
            />
          </div>
        )}
      </div>

      {/* VIEW 1: Department List */}
      {selectedDeptId === null && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayedDepartments.map((dept) => {
              const deptDevs = devices.filter((d) => d.departmentId === dept.id);
              const activeCount = deptDevs.filter((d) => d.status === 'شغال').length;
              const inactiveCount = deptDevs.filter((d) => d.status === 'عاطل').length;
              const damagedCount = deptDevs.filter((d) => d.status === 'تالف').length;

              return (
                <div 
                  key={dept.id}
                  onClick={() => setSelectedDeptId(dept.id)}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer relative group flex flex-col justify-between h-48"
                >
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {dept.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">العهد والأصول الطبية التابعة</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center mt-4 pt-4 border-t border-slate-100">
                    <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl border border-emerald-100">
                      <span className="text-xs font-bold block">شغال</span>
                      <strong className="text-lg">{activeCount}</strong>
                    </div>
                    <div className="bg-red-50 text-red-800 p-2 rounded-xl border border-red-100">
                      <span className="text-xs font-bold block">عاطل</span>
                      <strong className="text-lg">{inactiveCount}</strong>
                    </div>
                    <div className="bg-amber-50 text-amber-800 p-2 rounded-xl border border-amber-100">
                      <span className="text-xs font-bold block">تالف</span>
                      <strong className="text-lg">{damagedCount}</strong>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Department Box for Admins */}
            {currentUser?.role === 'admin' && (
              <div 
                onClick={() => setIsDeptModalOpen(true)}
                className="bg-dashed border-2 border-slate-300 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center p-6 h-48 cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20 group"
              >
                <div className="bg-slate-200 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 p-3 rounded-full transition-colors mb-3">
                  <Plus size={24} />
                </div>
                <strong className="text-slate-600 group-hover:text-blue-600 transition-colors">إضافة قسم جديد</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Department Devices Browse */}
      {selectedDeptId && !selectedDeviceId && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-1">تصفح أصول القسم</span>
              <h2 className="text-2xl font-bold text-slate-800">{activeDept?.name}</h2>
              <p className="text-slate-500 text-sm mt-1">يوجد {deptDevices.length} أجهزة طبية معرفة للعهدة.</p>
            </div>

            {/* Only admins & technicians can add devices */}
            {currentUser?.role !== 'supervisor' && (
              <button
                onClick={openNewDeviceForm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-lg"
              >
                <Plus size={18} />
                إضافة جهاز جديد بالعهد
              </button>
            )}
          </div>

          {/* List of devices */}
          {deptDevices.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
              <Package size={48} className="text-slate-300 mx-auto mb-4" />
              <h3 className="font-bold text-slate-700 mb-1">لا توجد أجهزة مسجلة في هذا القسم بعد!</h3>
              <p className="text-slate-500 text-sm">ابدأ بإدخال أول جهاز للمراقبة الطبية.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {deptDevices.map((dev) => (
                <div
                  key={dev.id}
                  onClick={() => setSelectedDeviceId(dev.id)}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="h-44 bg-slate-50 relative">
                    {dev.imageUrl ? (
                      <img 
                        src={dev.imageUrl} 
                        alt={dev.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-100">
                        <ImageIcon size={36} />
                        <span className="text-xs">لا توجد صورة للجهاز</span>
                      </div>
                    )}
                    <span className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${
                      dev.status === 'شغال' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      dev.status === 'عاطل' ? 'bg-red-50 text-red-800 border-red-200' :
                      'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {dev.status}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 line-clamp-1 mb-1">{dev.name}</h4>
                      <p className="text-slate-500 text-xs font-medium mb-3">موديل: {dev.model || 'غير محدد'}</p>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-600">
                      <span>الرقم المخصص (ID):</span>
                      <strong className="font-mono text-slate-800 font-bold">{dev.customId}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Department Edit/Delete Action Bars at Bottom */}
          {currentUser?.role === 'admin' && (
            <div className="pt-8 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => handleDeleteDept()}
                className="text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-200 text-sm font-bold flex items-center gap-2"
              >
                <Trash2 size={16} />
                مسح القسم بالكامل
              </button>

              <button
                onClick={() => { setEditDeptName(activeDept?.name || ''); setIsEditDeptOpen(true); }}
                className="text-slate-600 hover:bg-slate-100 px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200 text-sm font-bold flex items-center gap-2"
              >
                <Edit3 size={16} />
                تعديل اسم القسم
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: Device Detailed Information */}
      {selectedDeptId && selectedDeviceId && activeDevice && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header navigation bar */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setSelectedDeviceId(null)}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm cursor-pointer"
            >
              <ArrowRight size={18} />
              الرجوع لقائمة الأجهزة
            </button>
            <div className="flex items-center gap-4">
              {currentUser?.role !== 'supervisor' && (
                <button
                  onClick={openEditDeviceForm}
                  className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-1.5 rounded-full text-sm font-bold transition-all cursor-pointer"
                >
                  <Edit3 size={16} />
                  تعديل بيانات الجهاز
                </button>
              )}
              <span className={`text-sm font-bold px-4 py-1.5 rounded-full border ${
                activeDevice.status === 'شغال' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                activeDevice.status === 'عاطل' ? 'bg-red-50 text-red-800 border-red-200' :
                'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                حالة الجهاز: {activeDevice.status}
              </span>
            </div>
          </div>

          {/* Detailed Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Device Image Box */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-800 text-lg">صورة الجهاز</h3>
                  {currentUser?.role !== 'supervisor' && (
                    <>
                      <button
                        onClick={() => updateImageRef.current?.click()}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                        title="تحديث صورة الجهاز"
                      >
                        <Camera size={14} />
                        تحديث الصورة
                      </button>
                      <input 
                        type="file" 
                        ref={updateImageRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              updateDevice(activeDevice.id, { imageUrl: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        accept="image/*" 
                        className="hidden" 
                      />
                    </>
                  )}
                </div>
                {activeDevice.imageUrl ? (
                  <img 
                    src={activeDevice.imageUrl} 
                    alt={activeDevice.name} 
                    className="w-full h-64 object-cover rounded-xl shadow-inner border border-slate-100"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-64 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2">
                    <ImageIcon size={48} />
                    <span className="text-sm">لم يتم تحميل صورة لهذا الجهاز بعد</span>
                  </div>
                )}
              </div>

              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
                <div className="flex justify-between">
                  <span>الشركة المصنعة:</span>
                  <strong className="text-slate-800 font-bold">{activeDevice.company || 'غير محدد'}</strong>
                </div>
                <div className="flex justify-between">
                  <span>الرقم التسلسلي (Serial):</span>
                  <strong className="text-slate-800 font-bold font-mono">{activeDevice.serialNumber || 'غير محدد'}</strong>
                </div>
              </div>
            </div>

            {/* Core Inventory and Qty Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6 lg:col-span-2">
              <div>
                <span className="text-xs font-bold text-blue-600 block mb-1">الرقم التعريفي المخصص (ID): {activeDevice.customId}</span>
                <h2 className="text-2xl font-bold text-slate-800 font-sans">{activeDevice.name}</h2>
                <p className="text-slate-500 mt-1">موديل الجهاز وطرازه: {activeDevice.model}</p>
              </div>

              {/* Inventory details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="text-center p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                  <span className="text-xs text-slate-500 font-bold block mb-1">الكمية الحالية المتوفرة</span>
                  <strong className="text-2xl text-slate-800">{activeDevice.currentQty}</strong>
                </div>
                <div className="text-center p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                  <span className="text-xs text-slate-500 font-bold block mb-1">الكمية الدفترية بالجرد</span>
                  <strong className="text-2xl text-slate-800">{activeDevice.bookQty}</strong>
                </div>
                <div className="text-center p-3 rounded-xl border text-slate-800 bg-amber-50 border-amber-200">
                  <span className="text-xs text-amber-700 font-bold block mb-1">الفارق بالجرد</span>
                  <strong className="text-2xl text-amber-800">{activeDevice.difference}</strong>
                </div>
              </div>

              {/* Custodian & Notes */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <User size={20} className="text-blue-600" />
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">مستلم العهدة المسؤول:</span>
                    <strong className="text-sm text-slate-800 font-bold">{activeDevice.custodian || 'لم يتم تعيين مستلم'}</strong>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-700 mb-2">توابع وملحقات الجهاز (Accessories)</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeDevice.accessories && activeDevice.accessories.length > 0 ? (
                      activeDevice.accessories.map((acc, index) => (
                        <span key={index} className="bg-slate-100 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
                          {acc}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">لا توجد ملحقات إضافية مسجلة.</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-700 mb-2">ملاحظات إضافية وحالة الفحص</h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                    {activeDevice.notes || 'لا توجد ملاحظات مدونة لهذا الجهاز.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer for Editing & Deleting Devices */}
          {currentUser?.role !== 'supervisor' && (
            <div className="pt-8 border-t border-slate-200 flex justify-end items-center">
              <button
                onClick={handleDeleteDevice}
                className="text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-200 text-sm font-bold flex items-center gap-2"
              >
                <Trash2 size={16} />
                حذف الجهاز بالكامل
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Device Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md text-right relative">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertOctagon size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">حذف الجهاز نهائياً</h3>
            <p className="text-slate-600 text-sm text-center mb-6">
              هل أنت متأكد من رغبتك في حذف هذا الجهاز؟ سيتم حذف جميع السجلات وبلاغات الأعطال والمتابعة الدورية المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteDevice}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Add Department */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md text-right relative">
            <button 
              onClick={() => setIsDeptModalOpen(false)} 
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-4">إضافة قسم مستشفى جديد</h3>
            <form onSubmit={handleAddDeptSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">اسم القسم الطبي</label>
                <input 
                  type="text" 
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="مثال: قسم الباطنية" 
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

      {/* MODAL 2: Edit Department */}
      {isEditDeptOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md text-right relative">
            <button 
              onClick={() => setIsEditDeptOpen(false)} 
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-4">تعديل اسم القسم الطبي</h3>
            <form onSubmit={handleEditDeptSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">اسم القسم الجديد</label>
                <input 
                  type="text" 
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  placeholder="الاسم الجديد للقسم" 
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-right"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                تحديث الاسم
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add / Edit Device Form Overlay */}
      {isDeviceFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-40 p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl p-8 text-right relative my-8 animate-scaleIn">
            <button 
              onClick={() => setIsDeviceFormOpen(false)} 
              className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={24} />
            </button>

            <h3 className="text-2xl font-bold text-slate-800 mb-6 font-sans flex items-center gap-3">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
                <Package size={24} />
              </div>
              {isEditDevice ? 'تعديل بيانات الجهاز بالعهد' : 'إضافة جهاز طبي جديد للقسم'}
            </h3>

            <form onSubmit={handleDeviceFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Device Details Columns */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">اسم الجهاز الطبي *</label>
                  <input 
                    type="text"
                    value={devName}
                    onChange={(e) => setDevName(e.target.value)}
                    placeholder="مثال: جهاز مراقبة المريض Patient Monitor"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">رقم الـ ID المخصص للجهاز * (يدخل يدوياً ولا يتكرر)</label>
                  <input 
                    type="text"
                    value={devCustomId}
                    onChange={(e) => setDevCustomId(e.target.value)}
                    placeholder="مثال: ECG-109 أو MON-304"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono text-right font-bold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">الكمية الحالية المتوفرة *</label>
                    <input 
                      type="number"
                      value={devCurrentQty}
                      onChange={(e) => setDevCurrentQty(Number(e.target.value))}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">الكمية الدفترية بالجرد *</label>
                    <input 
                      type="number"
                      value={devBookQty}
                      onChange={(e) => setDevBookQty(Number(e.target.value))}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">طراز وموديل الجهاز *</label>
                    <input 
                      type="text"
                      value={devModel}
                      onChange={(e) => setDevModel(e.target.value)}
                      placeholder="مثال: Mac 2000"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">الرقم التسلسلي للجهاز *</label>
                    <input 
                      type="text"
                      value={devSerial}
                      onChange={(e) => setDevSerial(e.target.value)}
                      placeholder="Serial Number"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">اسم الشركة المصنعة *</label>
                  <input 
                    type="text"
                    value={devCompany}
                    onChange={(e) => setDevCompany(e.target.value)}
                    placeholder="مثال: GE Healthcare أو Dräger"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">مستلم العهدة المسؤول *</label>
                  <input 
                    type="text"
                    value={devCustodian}
                    onChange={(e) => setDevCustodian(e.target.value)}
                    placeholder="اسم المسؤول عن حيازة الجهاز"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    required
                  />
                </div>
              </div>

              {/* Accessories & Image Upload */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">حالة تشغيل الجهاز الطبية</label>
                  <select
                    value={devStatus}
                    onChange={(e) => setDevStatus(e.target.value as DeviceStatus)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                  >
                    <option value="شغال">شغال (يعمل بكفاءة)</option>
                    <option value="عاطل">عاطل (يحتاج صيانة)</option>
                    <option value="تالف">تالف (خارج الخدمة نهائياً)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">تحميل أو تصوير صورة الجهاز</label>
                  <div className="flex gap-4 items-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Camera size={16} />
                      تصوير / تحميل صورة
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*" 
                      className="hidden" 
                    />
                    {devImageUrl && (
                      <div className="relative w-16 h-16 rounded-xl border overflow-hidden shadow-inner">
                        <img src={devImageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setDevImageUrl('')}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">توابع وملحقات الجهاز (Accessories)</label>
                  <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto border p-2 rounded-xl bg-slate-50/50">
                    {Array.from(new Set([...accessoriesList, ...devSelectedAccessories])).map((acc) => {
                      const selected = devSelectedAccessories.includes(acc);
                      return (
                        <button
                          key={acc}
                          type="button"
                          onClick={() => toggleAccessory(acc)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                            selected 
                              ? 'bg-blue-600 border-blue-600 text-white font-bold' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {acc}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={customAccessory}
                      onChange={(e) => setCustomAccessory(e.target.value)}
                      placeholder="إضافة ملحق مخصص جديد..."
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomAccessory}
                      className="bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-700 cursor-pointer"
                    >
                      أضف
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">ملاحظات الفحص الطبية والمعايرة</label>
                  <textarea 
                    value={devNotes}
                    onChange={(e) => setDevNotes(e.target.value)}
                    rows={3}
                    placeholder="ملاحظات حول حالة الاستلام أو المعايرة السنوية للجهاز..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  ></textarea>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="submit"
                    className={`flex-1 text-white py-3 rounded-xl font-bold text-sm cursor-pointer transition-all shadow-md ${isEditDevice ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {isEditDevice ? 'حفظ التعديلات' : 'تأكيد وإضافة العهدة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeviceFormOpen(false)}
                    className="px-5 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
