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

  onSnapshot(collection(db, 'users'), (snapshot) => {
    const users = snapshot.docs.map(doc => doc.data() as User);
    useAppStore.setState({ users });
  }, (err) => console.warn('Users snapshot error:', err));

  onSnapshot(collection(db, 'departments'), (snapshot) => {
    const departments = snapshot.docs.map(doc => doc.data() as Department);
    useAppStore.setState({ departments });
  }, (err) => console.warn('Departments snapshot error:', err));

  onSnapshot(collection(db, 'devices'), (snapshot) => {
    const devices = snapshot.docs.map(doc => doc.data() as Device);
    useAppStore.setState({ devices });
  }, (err) => console.warn('Devices snapshot error:', err));

  onSnapshot(collection(db, 'requests'), (snapshot) => {
    const requests = snapshot.docs.map(doc => doc.data() as MaintenanceRequest);
    useAppStore.setState({ requests });
  }, (err) => console.warn('Requests snapshot error:', err));

  onSnapshot(collection(db, 'trackings'), (snapshot) => {
    const trackings = snapshot.docs.map(doc => doc.data() as MaintenanceTracking);
    useAppStore.setState({ trackings });
  }, (err) => console.warn('Trackings snapshot error:', err));

  onSnapshot(doc(db, 'appSettings', 'config'), (snapshot) => {
    if (!snapshot.exists()) {
      defaultUsers.forEach(u => setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u)).catch(() => {}));
      defaultDepartments.forEach(d => setDoc(doc(db, 'departments', d.id), sanitizeForFirestore(d)).catch(() => {}));
      defaultDevices.forEach(dev => setDoc(doc(db, 'devices', dev.id), sanitizeForFirestore(dev)).catch(() => {}));
      defaultRequests.forEach(r => setDoc(doc(db, 'requests', r.id), sanitizeForFirestore(r)).catch(() => {}));
      defaultTrackings.forEach(t => setDoc(doc(db, 'trackings', t.id), sanitizeForFirestore(t)).catch(() => {}));
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
