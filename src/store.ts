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
  addDepartment: (name: string, parentId?: string) => void;
  updateDepartment: (id: string, name: string, parentId?: string) => void;
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
  { id: 'u-3', username: 'sup1', role: 'supervisor' },
  { id: 'u-4', username: 'sup2', role: 'supervisor' },
];

const defaultDepartments: Department[] = [];
const defaultDevices: Device[] = [];
const defaultRequests: MaintenanceRequest[] = [];
const defaultTrackings: MaintenanceTracking[] = [];

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
      addDepartment: (name, parentId) => {
        const isDuplicate = get().departments.some((d) => d.name.trim().toLowerCase() === name.trim().toLowerCase());
        if (isDuplicate) {
          console.warn('Department name already exists! Duplicate prevented.');
          return;
        }
        const newDept: Department = { id: `d-${Date.now()}`, name: name.trim(), ...(parentId ? { parentId } : {}) };
        setDoc(doc(db, 'departments', newDept.id), sanitizeForFirestore(newDept));
        set((state) => ({ departments: [...state.departments, newDept] }));
      },

      updateDepartment: (id, name, parentId) => {
        const isDuplicate = get().departments.some((d) => d.id !== id && d.name.trim().toLowerCase() === name.trim().toLowerCase());
        if (isDuplicate) {
          console.warn('Department name already exists! Duplicate prevented.');
          return;
        }
        const current = get().departments.find((d) => d.id === id);
        const merged: Department = { ...(current || { id, name: name.trim() }), name: name.trim(), ...(parentId ? { parentId } : {}) };
        if (!parentId && merged.parentId) delete merged.parentId;
        setDoc(doc(db, 'departments', id), sanitizeForFirestore(merged));
        set((state) => ({
          departments: state.departments.map((d) => d.id === id ? merged : d)
        }));
      },

      deleteDepartment: (id) => {
        const hasDevices = get().devices.some((dev) => dev.departmentId === id);
        const hasChildren = get().departments.some((d) => d.parentId === id);
        if (hasDevices || hasChildren) {
          return { success: false, message: 'لا يمكنك مسح القسم بسبب وجود أصول، أجهزة، أو عيادات فرعية تابعة له' };
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
