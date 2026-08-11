import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  initGoogleAuth,
  googleSignIn,
  googleSignOut,
  listDriveBackups,
  uploadToGoogleDrive,
  downloadFromGoogleDrive,
  deleteFromGoogleDrive,
  savePrimaryDatabaseToDrive,
  loadPrimaryDatabaseFromDrive,
  PRIMARY_DB_FILE_NAME,
  DriveFileItem,
} from '../lib/googleDrive';
import { useAppStore } from '../store';
import { 
  Cloud, 
  Upload, 
  Download, 
  Trash2, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  FileJson, 
  FileSpreadsheet, 
  Database,
  LogOut,
  Loader2
} from 'lucide-react';
import { saveAs } from 'file-saver';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GoogleDriveModal({ isOpen, onClose }: GoogleDriveModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { importDatabase, departments, devices, requests, trackings, users, oilFilterInterval, trackingCategories, accessoriesList } = useAppStore();

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 9000);
  };

  const loadFiles = async (currentToken: string) => {
    setLoadingFiles(true);
    try {
      const list = await listDriveBackups(currentToken);
      setFiles(list);
    } catch (err: any) {
      console.error('Error loading Drive backups:', err);
      showAlert('error', err.message || 'تعذر جلب قائمة النسخ الاحتياطية من Google Drive');
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setLoadingAuth(true);
    const unsubscribe = initGoogleAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        setLoadingAuth(false);
        loadFiles(currentToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setLoadingAuth(false);
        setFiles([]);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  const handleSignIn = async () => {
    setLoadingAuth(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        showAlert('success', 'تم الاتصال بحساب Google Drive بنجاح!');
        await loadFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      const msg = err?.message || 'حدث خطأ غير معروف';
      showAlert('error', msg.includes('رابط موقعك') ? msg : `فشل تسجيل الدخول: ${msg}`);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      setUser(null);
      setToken(null);
      setFiles([]);
      showAlert('success', 'تم تسجيل الخروج من Google Drive.');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Backup JSON database to Google Drive
  const handleBackupJSON = async () => {
    if (!token) {
      showAlert('error', 'يرجى تسجيل الدخول بحساب Google أولاً.');
      return;
    }

    setActionLoading('backup-json');
    try {
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        departments,
        devices,
        requests,
        trackings,
        users,
        settings: {
          oilFilterInterval,
          trackingCategories,
          accessoriesList,
        },
      };

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `نسخة_احتياطية_صيانة_${dateStr}_${Date.now()}.json`;
      const content = JSON.stringify(backupData, null, 2);

      await uploadToGoogleDrive(
        token,
        fileName,
        content,
        'application/json',
        `نسخة احتياطية لنظام إدارة الصيانة والعهد (${devices.length} جهاز، ${departments.length} قسم)`
      );

      showAlert('success', 'تم رفع النسخة الاحتياطية (JSON) إلى Google Drive بنجاح!');
      await loadFiles(token);
    } catch (err: any) {
      console.error('Backup JSON error:', err);
      showAlert('error', 'فشل إنشاء النسخة الاحتياطية: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Backup CSV Inventory to Google Drive
  const handleBackupCSV = async () => {
    if (!token) {
      showAlert('error', 'يرجى تسجيل الدخول بحساب Google أولاً.');
      return;
    }

    setActionLoading('backup-csv');
    try {
      let csvContent = '\uFEFF'; // UTF-8 BOM
      csvContent += 'القسم,القسم الداخلي,اسم الجهاز,ID مخصص,الكمية الحالية,الكمية الدفترية,الفارق,الموديل,الرقم التسلسلي,الشركة المصنعة,الحالة,مستلم العهدة,التوابع والملحقات,ملاحظات\n';

      devices.forEach((dev) => {
        const dept = departments.find((d) => d.id === dev.departmentId);
        const parentDept = dept?.parentId ? departments.find((d) => d.id === dept.parentId) : null;
        const mainDeptName = parentDept ? parentDept.name : (dept?.name || '');
        const subDeptName = parentDept ? (dept?.name || '') : (dept?.name || '');

        const row = [
          `"${mainDeptName}"`,
          `"${subDeptName}"`,
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
          `"${dev.notes?.replace(/\n/g, ' ') || ''}"`,
        ];
        csvContent += row.join(',') + '\n';
      });

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `تقرير_جرد_الأصول_${dateStr}_${Date.now()}.csv`;

      await uploadToGoogleDrive(
        token,
        fileName,
        csvContent,
        'text/csv',
        `تقرير جرد الأصول والعهد (${devices.length} جهاز)`
      );

      showAlert('success', 'تم حفظ تقرير الجرد (CSV) في Google Drive بنجاح!');
      await loadFiles(token);
    } catch (err: any) {
      console.error('Backup CSV error:', err);
      showAlert('error', 'فشل حفظ تقرير الجرد: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Save/Overwrite Canonical Primary Database in Google Drive (Google Drive as Primary Cloud)
  const handleSavePrimaryDatabase = async () => {
    if (!token) {
      showAlert('error', 'يرجى تسجيل الدخول بحساب Google أولاً.');
      return;
    }

    setActionLoading('save-primary-db');
    try {
      const primaryData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        departments,
        devices,
        requests,
        trackings,
        users,
        settings: {
          oilFilterInterval,
          trackingCategories,
          accessoriesList,
        },
      };

      const content = JSON.stringify(primaryData, null, 2);
      await savePrimaryDatabaseToDrive(token, content);
      showAlert('success', 'تم حفظ وتحديث قاعدة البيانات الرئيسية الموحدة في Google Drive بنجاح!');
      await loadFiles(token);
    } catch (err: any) {
      console.error('Save primary db error:', err);
      showAlert('error', 'فشل حفظ قاعدة البيانات الرئيسية: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Load Canonical Primary Database from Google Drive (Google Drive as Primary Cloud)
  const handleLoadPrimaryDatabase = async () => {
    if (!token) {
      showAlert('error', 'يرجى تسجيل الدخول بحساب Google أولاً.');
      return;
    }

    const confirmed = window.confirm(
      'هل تريد تحميل قاعدة البيانات الرئيسية الموحدة من Google Drive ومزامنة النظام الآن؟\n\nتنبيه: سيتم استبدال البيانات الحالية بالبيانات الموجودة في ملف قاعدة البيانات الرئيسية في السحابة.'
    );
    if (!confirmed) return;

    setActionLoading('load-primary-db');
    try {
      const result = await loadPrimaryDatabaseFromDrive(token);
      if (!result) {
        showAlert('error', 'لم يتم العثور على ملف قاعدة بيانات رئيسية في Google Drive. يرجى الضغط على "حفظ كقاعدة بيانات رئيسية" أولاً.');
        return;
      }

      const data = JSON.parse(result.content);
      await importDatabase({
        departments: data.departments,
        devices: data.devices,
        requests: data.requests,
        trackings: data.trackings,
        users: data.users,
      });

      showAlert('success', 'تم مزامنة وتحميل قاعدة البيانات الرئيسية من Google Drive بنجاح!');
    } catch (err: any) {
      console.error('Load primary db error:', err);
      showAlert('error', 'فشل تحميل قاعدة البيانات الرئيسية: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Restore JSON Backup from Google Drive
  const handleRestoreFile = async (file: DriveFileItem) => {
    if (!token) return;

    // MANDATORY explicit user confirmation before destructive/mutating operation
    const confirmed = window.confirm(
      `هل أنت متأكد من استعادة النسخة الاحتياطية "${file.name}" من Google Drive؟\n\nتنبيه مهم: سيتم استبدال البيانات الحالية بالبيانات الموجودة في هذه النسخة. لا يمكن التراجع عن هذا الإجراء.`
    );
    if (!confirmed) return;

    setActionLoading(file.id);
    try {
      const textContent = await downloadFromGoogleDrive(token, file.id);

      if (file.mimeType === 'text/csv' || file.name.endsWith('.csv')) {
        showAlert('error', 'لا يمكن استعادة قاعدة البيانات من ملف CSV. يرجى اختيار ملف نسخة احتياطية بصيغة JSON.');
        return;
      }

      const data = JSON.parse(textContent);
      await importDatabase({
        departments: data.departments,
        devices: data.devices,
        requests: data.requests,
        trackings: data.trackings,
        users: data.users,
      });

      showAlert('success', 'تم استعادة البيانات من Google Drive ومزامنتها بنجاح!');
    } catch (err: any) {
      console.error('Restore error:', err);
      showAlert('error', 'فشل استعادة البيانات من الملف: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Download File to local PC
  const handleDownloadFile = async (file: DriveFileItem) => {
    if (!token) return;

    setActionLoading(file.id);
    try {
      const textContent = await downloadFromGoogleDrive(token, file.id);
      const blob = new Blob([textContent], {
        type: file.mimeType || 'application/json;charset=utf-8;',
      });
      saveAs(blob, file.name);
      showAlert('success', 'تم تنزيل الملف إلى جهازك بنجاح.');
    } catch (err: any) {
      console.error('Download error:', err);
      showAlert('error', 'فشل تنزيل الملف: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete File from Google Drive
  const handleDeleteFile = async (file: DriveFileItem) => {
    if (!token) return;

    // MANDATORY explicit user confirmation before deleting
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الملف "${file.name}" نهائياً من حسابك في Google Drive؟\n\nلا يمكن التراجع عن هذا الإجراء.`
    );
    if (!confirmed) return;

    setActionLoading(file.id);
    try {
      await deleteFromGoogleDrive(token, file.id);
      showAlert('success', 'تم حذف الملف من Google Drive بنجاح.');
      await loadFiles(token);
    } catch (err: any) {
      console.error('Delete error:', err);
      showAlert('error', 'فشل حذف الملف: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatFileSize = (bytesStr?: string) => {
    if (!bytesStr) return 'غير محدد';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return bytesStr;
    if (bytes < 1024) return bytes + ' بايت';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'غير محدد';
    try {
      return new Date(dateStr).toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200" dir="rtl">
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-900 via-blue-800 to-blue-700 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-3 rounded-2xl border border-white/20">
              <Cloud size={26} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">النسخ الاحتياطي السحابي - Google Drive</h2>
              <p className="text-xs text-blue-100 mt-1">
                حفظ واستعادة جرد الأصول وقاعدة البيانات بأمان مباشرة عبر حسابك في Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Alerts */}
        {alert && (
          <div
            className={`mx-6 mt-4 p-4 rounded-2xl border flex items-center gap-3 font-bold text-sm ${
              alert.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-red-50 border-red-300 text-red-800'
            }`}
          >
            {alert.type === 'success' ? (
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={20} className="text-red-600 shrink-0" />
            )}
            <span>{alert.message}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loadingAuth ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 size={36} className="animate-spin text-blue-800" />
              <p className="text-sm font-bold">جاري التحقق من حالة الاتصال بحساب Google...</p>
            </div>
          ) : !user || !token ? (
            /* Sign in UI */
            <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 rounded-3xl border border-slate-200 p-8 space-y-6">
              <div className="bg-blue-100 p-5 rounded-full text-blue-800">
                <Cloud size={48} />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-lg font-bold text-slate-800">اتصل بحسابك في Google Drive</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  قم بتسجيل الدخول بحساب Google الخاص بك لتتمكن من رفع واستعادة النسخ الاحتياطية وتقارير جرد الأصول الطبية بأمان وسهولة.
                </p>
              </div>

              {/* Official GSI Material Button */}
              <button
                onClick={handleSignIn}
                className="gsi-material-button bg-white hover:bg-slate-50 text-slate-800 font-bold px-6 py-3 rounded-2xl shadow-md hover:shadow-lg transition-all border border-slate-300 flex items-center gap-3 cursor-pointer"
              >
                <div className="gsi-material-button-icon shrink-0">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-6 h-6"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="text-sm font-bold">Sign in with Google (تسجيل الدخول مع Google)</span>
              </button>
            </div>
          ) : (
            /* Connected user UI */
            <div className="space-y-6">
              {/* User Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || user.email || ''}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full border-2 border-blue-600 object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-800 text-white flex items-center justify-center font-bold text-lg">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-base">
                        {user.displayName || 'مستخدم Google'}
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                        متصل
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-700 px-4 py-2 rounded-xl text-xs font-bold border border-red-200 transition-colors cursor-pointer shadow-sm"
                >
                  <LogOut size={14} />
                  تسجيل الخروج من Google
                </button>
              </div>

              {/* Primary Cloud Database Section (Alternative to Firebase) */}
              <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-3xl p-6 shadow-lg border border-blue-700/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-3 rounded-2xl border border-white/20">
                      <Cloud size={24} className="text-blue-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">Google Drive كـ سحابة أساسية (بديل عن Firebase)</h3>
                        <span className="bg-blue-500/30 border border-blue-400/40 text-blue-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                          مُستحسن
                        </span>
                      </div>
                      <p className="text-xs text-blue-100 mt-1">
                        يمكنك استخدام ملف قاعدة بيانات رئيسي موحد في Google Drive ومزامنته بين جميع أجهزتك دون الحاجة لـ Firebase.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleSavePrimaryDatabase}
                    disabled={!!actionLoading}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400/50 text-white font-bold py-3 px-4 rounded-2xl text-xs transition-all cursor-pointer shadow-md border border-blue-400/30"
                  >
                    {actionLoading === 'save-primary-db' ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        جاري الحفظ في Google Drive...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        حفظ كقاعدة البيانات الرئيسية (Primary DB)
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleLoadPrimaryDatabase}
                    disabled={!!actionLoading}
                    className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 disabled:bg-white/5 text-white font-bold py-3 px-4 rounded-2xl text-xs transition-all cursor-pointer border border-white/20"
                  >
                    {actionLoading === 'load-primary-db' ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        جاري التحميل والمزامنة...
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        تحميل ومزامنة قاعدة البيانات من Drive
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-blue-900 font-bold mb-1">
                      <Database size={18} />
                      <h3>نسخة احتياطية لقاعدة البيانات (JSON)</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      حفظ نسخة كاملة من جميع الأقسام، الأجهزة، طلبات الصيانة ومتابعات الصيانة الدورية إلى مجلدك في Google Drive.
                    </p>
                  </div>
                  <button
                    onClick={handleBackupJSON}
                    disabled={!!actionLoading}
                    className="mt-4 flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-900 disabled:bg-blue-400 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                  >
                    {actionLoading === 'backup-json' ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        جاري الرفع...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        إنشاء نسخة احتياطية الآن
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-900 font-bold mb-1">
                      <FileSpreadsheet size={18} />
                      <h3>تقرير جرد الأصول الشامل (CSV)</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      تصدير جدول جرد جميع الأجهزة مع الكميات، الفوارق والملحقات كملف CSV متوافق مع Excel ورفعه إلى Google Drive.
                    </p>
                  </div>
                  <button
                    onClick={handleBackupCSV}
                    disabled={!!actionLoading}
                    className="mt-4 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                  >
                    {actionLoading === 'backup-csv' ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        جاري الرفع...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        حفظ تقرير الجرد في Drive
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Files List Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <Cloud size={18} className="text-blue-800" />
                    النسخ والتقارير المخزنة في Google Drive
                  </h3>
                  <button
                    onClick={() => token && loadFiles(token)}
                    disabled={loadingFiles}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={14} className={loadingFiles ? 'animate-spin' : ''} />
                    تحديث القائمة
                  </button>
                </div>

                {loadingFiles ? (
                  <div className="py-12 flex items-center justify-center text-slate-500 gap-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <Loader2 size={24} className="animate-spin text-blue-800" />
                    <span className="text-sm font-bold">جاري تحميل الملفات من Google Drive...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6">
                    <p className="text-sm font-bold text-slate-600">لا توجد ملفات نسخ احتياطي أو تقارير في مجلد Google Drive بعد.</p>
                    <p className="text-xs text-slate-400 mt-1">اضغط على زر "إنشاء نسخة احتياطية الآن" لحفظ أول نسخة في السحابة.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                    {files.map((file) => {
                      const isJson = file.mimeType === 'application/json' || file.name.endsWith('.json');
                      const isCsv = file.mimeType === 'text/csv' || file.name.endsWith('.csv');

                      return (
                        <div
                          key={file.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2.5 rounded-xl border shrink-0 ${
                                isJson
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {isJson ? <FileJson size={22} /> : <FileSpreadsheet size={22} />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{file.name}</p>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                                <span>{formatDate(file.createdTime)}</span>
                                <span>•</span>
                                <span>{formatFileSize(file.size)}</span>
                                {file.description && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-600 truncate max-w-xs">{file.description}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isJson && (
                              <button
                                onClick={() => handleRestoreFile(file)}
                                disabled={!!actionLoading}
                                className="flex items-center gap-1.5 bg-blue-800 hover:bg-blue-900 disabled:bg-slate-300 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                                title="استعادة هذه النسخة إلى النظام"
                              >
                                {actionLoading === file.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <RefreshCw size={14} />
                                )}
                                استعادة البيانات
                              </button>
                            )}

                            <button
                              onClick={() => handleDownloadFile(file)}
                              disabled={!!actionLoading}
                              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
                              title="تنزيل الملف إلى جهازك"
                            >
                              <Download size={14} />
                              تنزيل
                            </button>

                            <button
                              onClick={() => handleDeleteFile(file)}
                              disabled={!!actionLoading}
                              className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-xl text-xs font-bold border border-red-200 transition-colors cursor-pointer"
                              title="حذف الملف من Google Drive"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-bold">
          <span>يتم تخزين النسخ الاحتياطية بأمان في مجلد مخصص داخل حسابك في Google Drive</span>
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-2 rounded-xl font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
