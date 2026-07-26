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

export function compressImage(file: File, maxDimension = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
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

const defaultSettings = {
  oilFilterInterval: 5000,
  trackingCategories: ['تكييف', 'زيوت وفلاتر', 'بطاريات'],
  accessoriesList: ['ECG Cable', 'SPO2', 'bp Cuff', 'Bottle', '2 Bottle']
};

let initialized = false;

export function initFirestoreSync() {
  if (initialized) return;
  initialized = true;

  // 1. Sync Users
  onSnapshot(collection(db, 'users'), (snapshot) => {
    if (!snapshot.empty) {
      const users = snapshot.docs.map(doc => doc.data() as User);
      useAppStore.setState({ users });
    } else {
      const currentUsers = useAppStore.getState().users;
      if (currentUsers && currentUsers.length > 0) {
        currentUsers.forEach(u => setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u)).catch(() => {}));
      } else {
        defaultUsers.forEach(u => setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u)).catch(() => {}));
        useAppStore.setState({ users: defaultUsers });
      }
    }
  }, (err) => console.warn('Users snapshot error:', err));

  // 2. Sync Departments
  onSnapshot(collection(db, 'departments'), (snapshot) => {
    if (!snapshot.empty) {
      const departments = snapshot.docs.map(doc => doc.data() as Department);
      useAppStore.setState({ departments });
    } else {
      const localDepts = useAppStore.getState().departments;
      if (localDepts && localDepts.length > 0) {
        localDepts.forEach(d => setDoc(doc(db, 'departments', d.id), sanitizeForFirestore(d)).catch(() => {}));
      }
    }
  }, (err) => console.warn('Departments snapshot error:', err));

  // 3. Sync Devices
  onSnapshot(collection(db, 'devices'), (snapshot) => {
    if (!snapshot.empty) {
      const devices = snapshot.docs.map(doc => doc.data() as Device);
      useAppStore.setState({ devices });
    } else {
      const localDevices = useAppStore.getState().devices;
      if (localDevices && localDevices.length > 0) {
        localDevices.forEach(dev => setDoc(doc(db, 'devices', dev.id), sanitizeForFirestore(dev)).catch(() => {}));
      }
    }
  }, (err) => console.warn('Devices snapshot error:', err));

  // 4. Sync Maintenance Requests
  onSnapshot(collection(db, 'requests'), (snapshot) => {
    if (!snapshot.empty) {
      const requests = snapshot.docs.map(doc => doc.data() as MaintenanceRequest);
      useAppStore.setState({ requests });
    } else {
      const localRequests = useAppStore.getState().requests;
      if (localRequests && localRequests.length > 0) {
        localRequests.forEach(req => setDoc(doc(db, 'requests', req.id), sanitizeForFirestore(req)).catch(() => {}));
      }
    }
  }, (err) => console.warn('Requests snapshot error:', err));

  // 5. Sync Tracking
  onSnapshot(collection(db, 'trackings'), (snapshot) => {
    if (!snapshot.empty) {
      const trackings = snapshot.docs.map(doc => doc.data() as MaintenanceTracking);
      useAppStore.setState({ trackings });
    } else {
      const localTrackings = useAppStore.getState().trackings;
      if (localTrackings && localTrackings.length > 0) {
        localTrackings.forEach(tr => setDoc(doc(db, 'trackings', tr.id), sanitizeForFirestore(tr)).catch(() => {}));
      }
    }
  }, (err) => console.warn('Trackings snapshot error:', err));

  // 6. Sync App Settings
  onSnapshot(doc(db, 'appSettings', 'config'), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data) {
        useAppStore.setState({
          oilFilterInterval: data.oilFilterInterval ?? 5000,
          trackingCategories: data.trackingCategories ?? ['تكييف', 'زيوت وفلاتر', 'بطاريات'],
          accessoriesList: data.accessoriesList ?? ['ECG Cable', 'SPO2', 'bp Cuff', 'Bottle', '2 Bottle']
        });
      }
    } else {
      const currentStore = useAppStore.getState();
      setDoc(doc(db, 'appSettings', 'config'), sanitizeForFirestore({
        oilFilterInterval: currentStore.oilFilterInterval || 5000,
        trackingCategories: currentStore.trackingCategories || ['تكييف', 'زيوت وفلاتر', 'بطاريات'],
        accessoriesList: currentStore.accessoriesList || ['ECG Cable', 'SPO2', 'bp Cuff', 'Bottle', '2 Bottle']
      })).catch(() => {});
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
