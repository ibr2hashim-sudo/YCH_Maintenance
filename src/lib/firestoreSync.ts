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

export async function syncAllToCloud() {
  const state = useAppStore.getState();
  const promises: Promise<any>[] = [];
  
  if (state.users?.length) state.users.forEach(u => promises.push(setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u)).catch(() => {})));
  if (state.departments?.length) state.departments.forEach(d => promises.push(setDoc(doc(db, 'departments', d.id), sanitizeForFirestore(d)).catch(() => {})));
  if (state.devices?.length) state.devices.forEach(dev => promises.push(setDoc(doc(db, 'devices', dev.id), sanitizeForFirestore(dev)).catch(() => {})));
  if (state.requests?.length) state.requests.forEach(req => promises.push(setDoc(doc(db, 'requests', req.id), sanitizeForFirestore(req)).catch(() => {})));
  if (state.trackings?.length) state.trackings.forEach(tr => promises.push(setDoc(doc(db, 'trackings', tr.id), sanitizeForFirestore(tr)).catch(() => {})));
  
  promises.push(setDoc(doc(db, 'appSettings', 'config'), sanitizeForFirestore({
    oilFilterInterval: state.oilFilterInterval || 5000,
    trackingCategories: state.trackingCategories || ['تكييف', 'زيوت وفلاتر', 'بطاريات'],
    accessoriesList: state.accessoriesList || ['ECG Cable', 'SPO2', 'bp Cuff', 'Bottle', '2 Bottle']
  })).catch(() => {}));

  await Promise.all(promises);
}

export function initFirestoreSync() {
  if (initialized) return;
  initialized = true;

  const pushLocalMissingToRemote = (remoteItems: any[], localItems: any[], collectionName: string) => {
    if (!localItems || !Array.isArray(localItems)) return [];
    const missing = localItems.filter(local => !remoteItems.some(remote => remote.id === local.id));
    if (missing.length > 0) {
      missing.forEach(item => {
        setDoc(doc(db, collectionName, item.id), sanitizeForFirestore(item)).catch(err => {
          console.warn(`Failed to upload local item to ${collectionName}:`, err);
        });
      });
    }
    return missing;
  };

  // 1. Sync Users
  onSnapshot(collection(db, 'users'), (snapshot) => {
    const remoteUsers = snapshot.docs.map(doc => doc.data() as User);
    const localUsers = useAppStore.getState().users || [];
    
    if (remoteUsers.length > 0) {
      const missing = pushLocalMissingToRemote(remoteUsers, localUsers, 'users');
      useAppStore.setState({ users: [...remoteUsers, ...missing] });
    } else if (localUsers.length > 0) {
      localUsers.forEach(u => setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u)).catch(() => {}));
      useAppStore.setState({ users: localUsers });
    } else {
      defaultUsers.forEach(u => setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u)).catch(() => {}));
      useAppStore.setState({ users: defaultUsers });
    }
  }, (err) => console.warn('Users snapshot error:', err));

  // 2. Sync Departments
  onSnapshot(collection(db, 'departments'), (snapshot) => {
    const remoteDepts = snapshot.docs.map(doc => doc.data() as Department);
    const localDepts = useAppStore.getState().departments || [];
    const missing = pushLocalMissingToRemote(remoteDepts, localDepts, 'departments');
    useAppStore.setState({ departments: [...remoteDepts, ...missing] });
  }, (err) => console.warn('Departments snapshot error:', err));

  // 3. Sync Devices
  onSnapshot(collection(db, 'devices'), (snapshot) => {
    const remoteDevices = snapshot.docs.map(doc => doc.data() as Device);
    const localDevices = useAppStore.getState().devices || [];
    const missing = pushLocalMissingToRemote(remoteDevices, localDevices, 'devices');
    useAppStore.setState({ devices: [...remoteDevices, ...missing] });
  }, (err) => console.warn('Devices snapshot error:', err));

  // 4. Sync Maintenance Requests
  onSnapshot(collection(db, 'requests'), (snapshot) => {
    const remoteRequests = snapshot.docs.map(doc => doc.data() as MaintenanceRequest);
    const localRequests = useAppStore.getState().requests || [];
    const missing = pushLocalMissingToRemote(remoteRequests, localRequests, 'requests');
    useAppStore.setState({ requests: [...remoteRequests, ...missing] });
  }, (err) => console.warn('Requests snapshot error:', err));

  // 5. Sync Tracking
  onSnapshot(collection(db, 'trackings'), (snapshot) => {
    const remoteTrackings = snapshot.docs.map(doc => doc.data() as MaintenanceTracking);
    const localTrackings = useAppStore.getState().trackings || [];
    const missing = pushLocalMissingToRemote(remoteTrackings, localTrackings, 'trackings');
    useAppStore.setState({ trackings: [...remoteTrackings, ...missing] });
  }, (err) => console.warn('Trackings snapshot error:', err));

  // 6. Sync App Settings
  onSnapshot(doc(db, 'appSettings', 'config'), (snapshot) => {
    if (snapshot.exists() && snapshot.data()) {
      const data = snapshot.data()!;
      const currentStore = useAppStore.getState();
      const mergedCategories = Array.from(new Set([...(data.trackingCategories || []), ...(currentStore.trackingCategories || [])]));
      const mergedAccessories = Array.from(new Set([...(data.accessoriesList || []), ...(currentStore.accessoriesList || [])]));
      
      useAppStore.setState({
        oilFilterInterval: data.oilFilterInterval ?? currentStore.oilFilterInterval ?? 5000,
        trackingCategories: mergedCategories,
        accessoriesList: mergedAccessories
      });
    } else {
      const currentStore = useAppStore.getState();
      setDoc(doc(db, 'appSettings', 'config'), sanitizeForFirestore({
        oilFilterInterval: currentStore.oilFilterInterval || 5000,
        trackingCategories: currentStore.trackingCategories || ['تكييف', 'زيوت وفلاتر', 'بطاريات'],
        accessoriesList: currentStore.accessoriesList || ['ECG Cable', 'SPO2', 'bp Cuff', 'Bottle', '2 Bottle']
      })).catch(() => {});
    }
  }, (err) => console.warn('AppSettings snapshot error:', err));

  // 7. Ensure any locally rehydrated data from localStorage is pushed to Firestore after startup
  setTimeout(() => {
    syncAllToCloud();
  }, 2000);
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
