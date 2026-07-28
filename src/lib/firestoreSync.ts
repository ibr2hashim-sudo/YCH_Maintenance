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
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj
      .map(item => (item === undefined ? null : sanitizeForFirestore(item)))
      .filter(item => item !== undefined);
  }
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
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

  // 1. Sync Users directly from Firestore
  onSnapshot(collection(db, 'users'), (snapshot) => {
    if (!snapshot.empty) {
      const remoteUsers = snapshot.docs.map(doc => doc.data() as User);
      useAppStore.setState({ users: remoteUsers });
    } else {
      defaultUsers.forEach(u => setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u)).catch(() => {}));
      useAppStore.setState({ users: defaultUsers });
    }
  }, (err) => console.warn('Users snapshot error:', err));

  // 2. Sync Departments directly from Firestore
  onSnapshot(collection(db, 'departments'), (snapshot) => {
    const remoteDepts = snapshot.docs.map(doc => doc.data() as Department);
    useAppStore.setState({ departments: remoteDepts });
  }, (err) => console.warn('Departments snapshot error:', err));

  // 3. Sync Devices directly from Firestore
  onSnapshot(collection(db, 'devices'), (snapshot) => {
    const remoteDevices = snapshot.docs.map(doc => doc.data() as Device);
    useAppStore.setState({ devices: remoteDevices });
  }, (err) => console.warn('Devices snapshot error:', err));

  // 4. Sync Maintenance Requests directly from Firestore
  onSnapshot(collection(db, 'requests'), (snapshot) => {
    const remoteRequests = snapshot.docs.map(doc => doc.data() as MaintenanceRequest);
    useAppStore.setState({ requests: remoteRequests });
  }, (err) => console.warn('Requests snapshot error:', err));

  // 5. Sync Tracking directly from Firestore
  onSnapshot(collection(db, 'trackings'), (snapshot) => {
    const remoteTrackings = snapshot.docs.map(doc => doc.data() as MaintenanceTracking);
    useAppStore.setState({ trackings: remoteTrackings });
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
      setDoc(doc(db, 'appSettings', 'config'), sanitizeForFirestore(defaultSettings)).catch(() => {});
      useAppStore.setState(defaultSettings);
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
