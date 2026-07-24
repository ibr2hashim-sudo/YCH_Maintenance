import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { sanitizeForFirestore } from './lib/firestoreSync';
import { User, Department, Device, MaintenanceRequest, MaintenanceTracking } from './types';

interface AppState {
  currentUser: User | null;
  users: User[];
  departments: Department[];
  devices: Device[];
  requests: MaintenanceRequest[];
  trackings: MaintenanceTracking[];
  oilFilterInterval: number; // in counter units or days
  trackingCategories: string[];
  accessoriesList: string[];
  
  // Auth Actions
  login: (username: string) => boolean;
  logout: () => void;
  
  // User Actions
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Department Actions
  addDepartment: (name: string) => void;
  updateDepartment: (id: string, name: string) => void;
  deleteDepartment: (id: string) => { success: boolean; message: string };

  // Device Actions
  addDevice: (device: Omit<Device, 'id' | 'difference'>) => void;
  updateDevice: (id: string, device: Partial<Device>) => void;
  deleteDevice: (id: string) => void;

  // Maintenance Request Actions
  addMaintenanceRequest: (request: Omit<MaintenanceRequest, 'id' | 'status'>) => void;
  updateMaintenanceRequest: (id: string, request: Partial<MaintenanceRequest>) => void;
  deleteMaintenanceRequest: (id: string) => void;

  // Tracking Actions
  addTracking: (tracking: Omit<MaintenanceTracking, 'id'>) => void;
  deleteTracking: (id: string) => void;
  addTrackingCategory: (category: string) => void;
  setOilFilterInterval: (interval: number) => void;
  addAccessory: (accessory: string) => void;

  // Import / Export
  importDatabase: (data: { departments?: Department[]; devices?: Device[]; requests?: MaintenanceRequest[]; trackings?: MaintenanceTracking[]; users?: User[] }) => void;
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: defaultUsers,
      departments: defaultDepartments,
      devices: defaultDevices,
      requests: defaultRequests,
      trackings: defaultTrackings,
      oilFilterInterval: 5000,
      trackingCategories: ['تكييف', 'زيوت وفلاتر', 'بطاريات'],
      accessoriesList: ['ECG Cable', 'SPO2', 'bp Cuff', 'Bottle', '2 Bottle'],

      login: (username) => {
        const found = get().users.find((u) => u.username.toLowerCase() === username.toLowerCase());
        if (found) {
          set({ currentUser: found });
          return true;
        }
        return false;
      },
      
      logout: () => set({ currentUser: null }),

      // User Actions
      addUser: (user) => {
        const newUser = { ...user, id: `u-${Date.now()}` };
        setDoc(doc(db, 'users', newUser.id), sanitizeForFirestore(newUser));
        set((state) => ({ users: [...state.users, newUser] }));
      },
      
      updateUser: (id, updatedUser) => {
        const current = get().users.find((u) => u.id === id);
        if (current) {
          const merged = { ...current, ...updatedUser };
          setDoc(doc(db, 'users', id), sanitizeForFirestore(merged));
        }
        set((state) => ({
          users: state.users.map((u) => u.id === id ? { ...u, ...updatedUser } : u),
          currentUser: state.currentUser?.id === id ? { ...state.currentUser, ...updatedUser } : state.currentUser
        }));
      },

      deleteUser: (id) => {
        deleteDoc(doc(db, 'users', id));
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
          currentUser: state.currentUser?.id === id ? null : state.currentUser
        }));
      },

      // Department Actions
      addDepartment: (name) => {
        const newDept = { id: `d-${Date.now()}`, name };
        setDoc(doc(db, 'departments', newDept.id), sanitizeForFirestore(newDept));
        set((state) => ({ departments: [...state.departments, newDept] }));
      },

      updateDepartment: (id, name) => {
        setDoc(doc(db, 'departments', id), { id, name });
        set((state) => ({
          departments: state.departments.map((d) => d.id === id ? { ...d, name } : d)
        }));
      },

      deleteDepartment: (id) => {
        const hasDevices = get().devices.some((dev) => dev.departmentId === id);
        if (hasDevices) {
          return { success: false, message: 'لا يمكنك مسح القسم بسبب وجود اصول وأجهزة تابعة له' };
        }
        deleteDoc(doc(db, 'departments', id));
        set((state) => ({
          departments: state.departments.filter((d) => d.id !== id)
        }));
        return { success: true, message: 'تم حذف القسم بنجاح' };
      },

      // Device Actions
      addDevice: (device) => {
        const diff = device.bookQty - device.currentQty;
        const newDevice: Device = {
          ...device,
          id: `dev-${Date.now()}`,
          difference: diff
        };
        setDoc(doc(db, 'devices', newDevice.id), sanitizeForFirestore(newDevice));
        set((state) => ({ devices: [...state.devices, newDevice] }));
      },

      updateDevice: (id, updatedFields) => {
        const current = get().devices.find((dev) => dev.id === id);
        if (current) {
          const merged = { ...current, ...updatedFields };
          merged.difference = merged.bookQty - merged.currentQty;
          setDoc(doc(db, 'devices', id), sanitizeForFirestore(merged));
        }
        set((state) => ({
          devices: state.devices.map((dev) => {
            if (dev.id === id) {
              const merged = { ...dev, ...updatedFields };
              merged.difference = merged.bookQty - merged.currentQty;
              return merged;
            }
            return dev;
          })
        }));
      },

      deleteDevice: (id) => {
        deleteDoc(doc(db, 'devices', id));
        get().requests.filter(r => r.deviceId === id).forEach(r => deleteDoc(doc(db, 'requests', r.id)));
        get().trackings.filter(t => t.deviceId === id).forEach(t => deleteDoc(doc(db, 'trackings', t.id)));

        set((state) => ({
          devices: state.devices.filter((dev) => dev.id !== id),
          requests: state.requests.filter((req) => req.deviceId !== id),
          trackings: state.trackings.filter((track) => track.deviceId !== id)
        }));
      },

      // Maintenance Request Actions
      addMaintenanceRequest: (req) => {
        const newReq: MaintenanceRequest = {
          ...req,
          id: `req-${Date.now()}`,
          status: 'pending'
        };
        setDoc(doc(db, 'requests', newReq.id), sanitizeForFirestore(newReq));
        set((state) => ({ requests: [newReq, ...state.requests] }));
      },

      updateMaintenanceRequest: (id, fields) => {
        const current = get().requests.find((r) => r.id === id);
        if (current) {
          const merged = { ...current, ...fields };
          setDoc(doc(db, 'requests', id), sanitizeForFirestore(merged));
        }
        set((state) => ({
          requests: state.requests.map((r) => r.id === id ? { ...r, ...fields } : r)
        }));
      },

      deleteMaintenanceRequest: (id) => {
        deleteDoc(doc(db, 'requests', id));
        set((state) => ({ requests: state.requests.filter((r) => r.id !== id) }));
      },

      // Tracking Actions
      addTracking: (track) => {
        const newTrack: MaintenanceTracking = {
          ...track,
          id: `t-${Date.now()}`
        };
        setDoc(doc(db, 'trackings', newTrack.id), sanitizeForFirestore(newTrack));
        set((state) => ({ trackings: [newTrack, ...state.trackings] }));
      },

      deleteTracking: (id) => {
        deleteDoc(doc(db, 'trackings', id));
        set((state) => ({ trackings: state.trackings.filter((t) => t.id !== id) }));
      },

      addTrackingCategory: (category) => {
        const current = get().trackingCategories;
        if (current.includes(category)) return;
        const newCategories = [...current, category];
        setDoc(doc(db, 'appSettings', 'config'), {
          oilFilterInterval: get().oilFilterInterval,
          trackingCategories: newCategories,
          accessoriesList: get().accessoriesList
        });
        set({ trackingCategories: newCategories });
      },

      setOilFilterInterval: (interval) => {
        setDoc(doc(db, 'appSettings', 'config'), {
          oilFilterInterval: interval,
          trackingCategories: get().trackingCategories,
          accessoriesList: get().accessoriesList
        });
        set({ oilFilterInterval: interval });
      },

      addAccessory: (accessory) => {
        const current = get().accessoriesList;
        if (current.includes(accessory)) return;
        const newList = [...current, accessory];
        setDoc(doc(db, 'appSettings', 'config'), {
          oilFilterInterval: get().oilFilterInterval,
          trackingCategories: get().trackingCategories,
          accessoriesList: newList
        });
        set({ accessoriesList: newList });
      },

      // Import database action
      importDatabase: (data) => {
        if (data.departments) {
          data.departments.forEach(d => setDoc(doc(db, 'departments', d.id), sanitizeForFirestore(d)));
        }
        if (data.devices) {
          data.devices.forEach(dev => setDoc(doc(db, 'devices', dev.id), sanitizeForFirestore(dev)));
        }
        if (data.requests) {
          data.requests.forEach(r => setDoc(doc(db, 'requests', r.id), sanitizeForFirestore(r)));
        }
        if (data.trackings) {
          data.trackings.forEach(t => setDoc(doc(db, 'trackings', t.id), sanitizeForFirestore(t)));
        }
        if (data.users) {
          data.users.forEach(u => setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u)));
        }
        set((state) => ({
          departments: data.departments || state.departments,
          devices: data.devices || state.devices,
          requests: data.requests || state.requests,
          trackings: data.trackings || state.trackings,
          users: data.users || state.users,
        }));
      }
    }),
    {
      name: 'maintenance-storage-v2',
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
