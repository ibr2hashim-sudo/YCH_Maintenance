import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';
import { useAppStore } from '../store';
import { User, Department, Device, MaintenanceRequest, MaintenanceTracking } from '../types';

export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        result[key] = sanitizeForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result as T;
}

const defaultUsers: User[] = [
  { id: 'u-1', username: 'admin', role: 'admin' },
  { id: 'u-2', username: 'tech1', role: 'tech' },
  { id: 'u-3', username: 'sup1', role: 'supervisor', departmentId: 'd-1' },
  { id: 'u-4', username: 'sup2', role: 'supervisor', departmentId: 'd-2' },
];

const defaultDepartments: Department[] = [
  { id: 'd-1', name: 'قسم الطوارئ' },
  { id: 'd-2', name: 'قسم العناية المركزة' },
  { id: 'd-3', name: 'قسم الأشعة' },
];

const defaultDevices: Device[] = [
  {
    id: 'dev-1',
    departmentId: 'd-1',
    name: 'جهاز تخطيط القلب ECG',
    customId: 'ECG-109',
    currentQty: 4,
    bookQty: 5,
    difference: 1,
    model: 'Mac 2000',
    serialNumber: 'SN-9831723',
    company: 'GE Healthcare',
    accessories: ['ECG Cable', 'SPO2'],
    status: 'شغال',
    custodian: 'أحمد العتيبي',
    notes: 'جهاز تخطيط القلب يعمل بكفاءة ويحتاج لمعايرة دورية كل 6 أشهر.',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'dev-2',
    departmentId: 'd-2',
    name: 'جهاز تنفس صناعي Ventilator',
    customId: 'VENT-502',
    currentQty: 3,
    bookQty: 3,
    difference: 0,
    model: 'Evita V500',
    serialNumber: 'SN-4829302',
    company: 'Dräger',
    accessories: ['bp Cuff', 'Bottle'],
    status: 'عاطل',
    custodian: 'سعد الشهري',
    notes: 'متوقف مؤقتاً بانتظار استبدال صمام الهواء الرئيسي.',
    imageUrl: 'https://images.unsplash.com/photo-1584515901367-f1c27b54ab7c?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'dev-3',
    departmentId: 'd-1',
    name: 'جهاز مراقبة المريض Patient Monitor',
    customId: 'MON-304',
    currentQty: 8,
    bookQty: 8,
    difference: 0,
    model: 'BeneVision N17',
    serialNumber: 'SN-7732910',
    company: 'Mindray',
    accessories: ['ECG Cable', 'SPO2', 'bp Cuff'],
    status: 'شغال',
    custodian: 'خالد الحربي',
    notes: 'تم تحديث البرمجيات وتغيير البطاريات الاحتياطية حديثاً.',
    imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&auto=format&fit=crop&q=60'
  }
];

const defaultRequests: MaintenanceRequest[] = [
  {
    id: 'req-1',
    departmentId: 'd-2',
    deviceId: 'dev-2',
    date: '2026-07-18',
    complaint: 'جهاز التنفس يعطي إنذار مستمر في ضغط تدفق الهواء والصمام يبدو عالقاً.',
    status: 'pending',
  },
  {
    id: 'req-2',
    departmentId: 'd-1',
    deviceId: 'dev-3',
    date: '2026-07-15',
    complaint: 'شاشة اللمس لا تستجيب في بعض الأحيان عند الضغط على إعدادات المريض.',
    status: 'in_progress',
    initialReport: 'تم فحص الشاشة وتبين وجود رطوبة خفيفة تحت الإطار الخارجي.',
    requiredParts: 'شريط لاصق عازل + كابل شاشة مرن مرشح للاستبدال',
  }
];

const defaultTrackings: MaintenanceTracking[] = [
  {
    id: 't-1',
    deviceId: 'dev-1',
    type: 'تكييف',
    date: '2026-06-10',
    details: {
      action: 'تنظيف الفلاتر وفحص غاز الفريون بالكامل لغرفة الجهاز لضمان عدم تأثر الحساسات بالحرارة.'
    }
  },
  {
    id: 't-2',
    deviceId: 'dev-2',
    type: 'زيوت وفلاتر',
    date: '2026-05-14',
    details: {
      currentCounter: 1200,
      nextCounter: 6200,
    }
  },
  {
    id: 't-3',
    deviceId: 'dev-3',
    type: 'بطاريات',
    date: '2026-07-01',
    details: {
      deviceName: 'جهاز مراقبة المريض Patient Monitor',
      model: 'BeneVision N17',
      serialNumber: 'SN-7732910',
      replacementDate: '2026-07-01'
    }
  }
];

const defaultSettings = {
  oilFilterInterval: 5000,
  trackingCategories: ['تكييف', 'زيوت وفلاتر', 'بطاريات'],
  accessoriesList: ['ECG Cable', 'SPO2', 'bp Cuff', 'Bottle', '2 Bottle']
};

let initialized = false;

export function initFirestoreSync() {
  if (initialized) return;
  initialized = true;

  onSnapshot(collection(db, 'users'), (snapshot) => {
    if (snapshot.empty) {
      defaultUsers.forEach(u => setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u)).catch(() => {}));
    } else {
      const users = snapshot.docs.map(doc => doc.data() as User);
      useAppStore.setState({ users });
    }
  }, (err) => console.warn('Users snapshot error:', err));

  onSnapshot(collection(db, 'departments'), (snapshot) => {
    if (snapshot.empty) {
      defaultDepartments.forEach(d => setDoc(doc(db, 'departments', d.id), sanitizeForFirestore(d)).catch(() => {}));
    } else {
      const departments = snapshot.docs.map(doc => doc.data() as Department);
      useAppStore.setState({ departments });
    }
  }, (err) => console.warn('Departments snapshot error:', err));

  onSnapshot(collection(db, 'devices'), (snapshot) => {
    if (snapshot.empty) {
      defaultDevices.forEach(dev => setDoc(doc(db, 'devices', dev.id), sanitizeForFirestore(dev)).catch(() => {}));
    } else {
      const devices = snapshot.docs.map(doc => doc.data() as Device);
      useAppStore.setState({ devices });
    }
  }, (err) => console.warn('Devices snapshot error:', err));

  onSnapshot(collection(db, 'requests'), (snapshot) => {
    if (snapshot.empty) {
      defaultRequests.forEach(r => setDoc(doc(db, 'requests', r.id), sanitizeForFirestore(r)).catch(() => {}));
    } else {
      const requests = snapshot.docs.map(doc => doc.data() as MaintenanceRequest);
      useAppStore.setState({ requests });
    }
  }, (err) => console.warn('Requests snapshot error:', err));

  onSnapshot(collection(db, 'trackings'), (snapshot) => {
    if (snapshot.empty) {
      defaultTrackings.forEach(t => setDoc(doc(db, 'trackings', t.id), sanitizeForFirestore(t)).catch(() => {}));
    } else {
      const trackings = snapshot.docs.map(doc => doc.data() as MaintenanceTracking);
      useAppStore.setState({ trackings });
    }
  }, (err) => console.warn('Trackings snapshot error:', err));

  onSnapshot(doc(db, 'appSettings', 'config'), (snapshot) => {
    if (!snapshot.exists()) {
      setDoc(doc(db, 'appSettings', 'config'), sanitizeForFirestore(defaultSettings)).catch(() => {});
    } else {
      const data = snapshot.data();
      if (data) {
        useAppStore.setState({
          oilFilterInterval: data.oilFilterInterval ?? 5000,
          trackingCategories: data.trackingCategories ?? ['تكييف', 'زيوت وفلاتر', 'بطاريات'],
          accessoriesList: data.accessoriesList ?? ['ECG Cable', 'SPO2', 'bp Cuff', 'Bottle', '2 Bottle']
        });
      }
    }
  }, (err) => console.warn('AppSettings snapshot error:', err));
}

export async function resetFirestoreDatabase() {
  const collections = ['users', 'departments', 'devices', 'requests', 'trackings'];
  for (const colName of collections) {
    const snap = await getDocs(collection(db, colName));
    const batch = writeBatch(db);
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  try {
    await deleteDoc(doc(db, 'appSettings', 'config'));
  } catch (e) {
    console.error(e);
  }

  defaultUsers.forEach(u => setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u)));
  defaultDepartments.forEach(d => setDoc(doc(db, 'departments', d.id), sanitizeForFirestore(d)));
  defaultDevices.forEach(dev => setDoc(doc(db, 'devices', dev.id), sanitizeForFirestore(dev)));
  defaultRequests.forEach(r => setDoc(doc(db, 'requests', r.id), sanitizeForFirestore(r)));
  defaultTrackings.forEach(t => setDoc(doc(db, 'trackings', t.id), sanitizeForFirestore(t)));
  setDoc(doc(db, 'appSettings', 'config'), sanitizeForFirestore(defaultSettings));
}
