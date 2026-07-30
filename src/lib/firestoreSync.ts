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

export function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'function' || typeof obj === 'symbol') return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) {
    return obj
      .map(item => (item === undefined ? null : sanitizeForFirestore(item)))
      .filter(item => item !== undefined);
  }
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined && typeof val !== 'function') {
      result[key] = sanitizeForFirestore(val);
    }
  }
  return result;
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
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          canvas.width = 0;
          canvas.height = 0;
          resolve(dataUrl);
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

  // Helper to get sanitized doc id
  const getDocId = (id: string) => String(id).replace(/\//g, '_');

  // 1. Sync Users directly from Firestore
  onSnapshot(collection(db, 'users'), (snapshot) => {
    if (!snapshot.empty) {
      const remoteUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      useAppStore.setState({ users: remoteUsers });
    } else {
      const localUsers = useAppStore.getState().users;
      if (localUsers && localUsers.length > 0) {
        localUsers.forEach(u => setDoc(doc(db, 'users', getDocId(u.id)), sanitizeForFirestore(u)).catch(() => {}));
      } else {
        defaultUsers.forEach(u => setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u)).catch(() => {}));
        useAppStore.setState({ users: defaultUsers });
      }
    }
  }, (err) => console.warn('Users snapshot error:', err));

  // 2. Sync Departments directly from Firestore
  onSnapshot(collection(db, 'departments'), (snapshot) => {
    if (!snapshot.empty) {
      const remoteDepts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department));
      useAppStore.setState({ departments: remoteDepts });
    } else {
      const localDepts = useAppStore.getState().departments;
      if (localDepts && localDepts.length > 0) {
        localDepts.forEach(d => setDoc(doc(db, 'departments', getDocId(d.id)), sanitizeForFirestore(d)).catch(() => {}));
      }
    }
  }, (err) => console.warn('Departments snapshot error:', err));

  // 3. Sync Devices directly from Firestore
  onSnapshot(collection(db, 'devices'), (snapshot) => {
    if (!snapshot.empty) {
      const remoteDevices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Device));
      useAppStore.setState({ devices: remoteDevices });
    } else {
      const localDevices = useAppStore.getState().devices;
      if (localDevices && localDevices.length > 0) {
        localDevices.forEach(dev => setDoc(doc(db, 'devices', getDocId(dev.id)), sanitizeForFirestore(dev)).catch(() => {}));
      }
    }
  }, (err) => console.warn('Devices snapshot error:', err));

  // 4. Sync Maintenance Requests directly from Firestore
  onSnapshot(collection(db, 'requests'), (snapshot) => {
    if (!snapshot.empty) {
      const remoteRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRequest));
      useAppStore.setState({ requests: remoteRequests });
    } else {
      const localRequests = useAppStore.getState().requests;
      if (localRequests && localRequests.length > 0) {
        localRequests.forEach(r => setDoc(doc(db, 'requests', getDocId(r.id)), sanitizeForFirestore(r)).catch(() => {}));
      }
    }
  }, (err) => console.warn('Requests snapshot error:', err));

  // 5. Sync Tracking directly from Firestore
  onSnapshot(collection(db, 'trackings'), (snapshot) => {
    if (!snapshot.empty) {
      const remoteTrackings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceTracking));
      useAppStore.setState({ trackings: remoteTrackings });
    } else {
      const localTrackings = useAppStore.getState().trackings;
      if (localTrackings && localTrackings.length > 0) {
        localTrackings.forEach(t => setDoc(doc(db, 'trackings', getDocId(t.id)), sanitizeForFirestore(t)).catch(() => {}));
      }
    }
  }, (err) => console.warn('Trackings snapshot error:', err));

  // 6. Sync App Settings directly from Firestore
  onSnapshot(doc(db, 'appSettings', 'config'), (snapshot) => {
    if (snapshot.exists() && snapshot.data()) {
      const data = snapshot.data()!;
      useAppStore.setState({
        oilFilterInterval: data.oilFilterInterval ?? 5000,
        trackingCategories: data.trackingCategories ?? ['تكييف', 'زيوت وفلاتر', 'بطاريات'],
        accessoriesList: data.accessoriesList ?? ['ECG Cable', 'SPO2', 'bp Cuff', 'Bottle', '2 Bottle']
      });
    } else {
      const currentState = useAppStore.getState();
      const settingsToSave = {
        oilFilterInterval: currentState.oilFilterInterval || defaultSettings.oilFilterInterval,
        trackingCategories: currentState.trackingCategories?.length ? currentState.trackingCategories : defaultSettings.trackingCategories,
        accessoriesList: currentState.accessoriesList?.length ? currentState.accessoriesList : defaultSettings.accessoriesList
      };
      setDoc(doc(db, 'appSettings', 'config'), sanitizeForFirestore(settingsToSave)).catch(() => {});
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
