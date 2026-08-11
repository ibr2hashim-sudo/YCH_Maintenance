import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const dbId = firebaseConfig.firestoreDatabaseId || '(default)';

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, dbId);

export default app;

