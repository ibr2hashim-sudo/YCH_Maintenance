import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

const CUSTOM_CONFIG_KEY = 'custom_firebase_config';

export function getCustomFirebaseConfig(): any | null {
  try {
    const saved = localStorage.getItem(CUSTOM_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading custom firebase config:', e);
  }
  return null;
}

export function setCustomFirebaseConfig(config: any): void {
  localStorage.setItem(CUSTOM_CONFIG_KEY, JSON.stringify(config));
  window.location.reload();
}

export function clearCustomFirebaseConfig(): void {
  localStorage.removeItem(CUSTOM_CONFIG_KEY);
  window.location.reload();
}

export function getActiveFirebaseConfig(): any {
  const custom = getCustomFirebaseConfig();
  return custom || defaultFirebaseConfig;
}

const activeConfig = getActiveFirebaseConfig();
const appName = getCustomFirebaseConfig() ? 'custom-netlify-app' : '[DEFAULT]';

const existingApps = getApps();
const existingApp = existingApps.find(a => a.name === appName);

const app = existingApp ? existingApp : initializeApp(activeConfig, appName === '[DEFAULT]' ? undefined : appName);

const dbId = (activeConfig as any).firestoreDatabaseId || '(default)';

export const db = getFirestore(app, dbId);

export default app;



