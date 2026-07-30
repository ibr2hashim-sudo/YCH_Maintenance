import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFile } from 'fs/promises';

async function test() {
  const config = JSON.parse(await readFile('./firebase-applet-config.json', 'utf-8'));
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);
  const snap = await getDocs(collection(db, 'devices'));
  console.log(`Found ${snap.docs.length} devices in Firestore.`);
}
test().catch(console.error);
