import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import app from './firebase';

const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Drive scopes
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.appdata');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive');

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;
// Cache the access token in memory as required by guidelines
let cachedAccessToken: string | null = null;
let currentGoogleUser: User | null = null;

export interface DriveFileItem {
  id: string;
  name: string;
  createdTime?: string;
  size?: string;
  mimeType?: string;
  description?: string;
}

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      currentGoogleUser = user;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      currentGoogleUser = null;
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('لم يتم العثور على صلاحية الوصول (Access Token) من حساب Google');
    }

    cachedAccessToken = credential.accessToken;
    currentGoogleUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getGoogleUser = (): User | null => {
  return currentGoogleUser;
};

export const googleSignOut = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  currentGoogleUser = null;
};

// ==========================================
// Google Drive API Helpers
// ==========================================

const DRIVE_FOLDER_NAME = 'Maintenance_System_Backups';

/**
 * Searches for our backup folder in Google Drive or creates it if it doesn't exist.
 */
export async function getOrCreateBackupFolder(token: string): Promise<string> {
  const query = encodeURIComponent(`name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!listRes.ok) {
    throw new Error(`خطأ في استعلام Google Drive (${listRes.status})`);
  }

  const listData = await listRes.json();
  if (listData.files && listData.files.length > 0) {
    return listData.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'مجلد النسخ الاحتياطية وتقارير الجرد لنظام إدارة الصيانة',
    }),
  });

  if (!createRes.ok) {
    throw new Error('فشل إنشاء مجلد النسخ الاحتياطية في Google Drive');
  }

  const createData = await createRes.json();
  return createData.id;
}

/**
 * Lists all backup and export files stored in our Google Drive folder.
 */
export async function listDriveBackups(token: string): Promise<DriveFileItem[]> {
  const folderId = await getOrCreateBackupFolder(token);
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,createdTime,size,mimeType,description)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`تعذر استرجاع قائمة الملفات من Google Drive (${res.status})`);
  }

  const data = await res.json();
  return (data.files || []) as DriveFileItem[];
}

/**
 * Uploads a string content (JSON backup or CSV report) to Google Drive inside the backup folder.
 */
export async function uploadToGoogleDrive(
  token: string,
  fileName: string,
  content: string,
  mimeType: string = 'application/json',
  description?: string
): Promise<DriveFileItem> {
  const folderId = await getOrCreateBackupFolder(token);

  const metadata = {
    name: fileName,
    parents: [folderId],
    description: description || 'نسخة احتياطية من نظام إدارة الصيانة',
    mimeType: mimeType,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const requestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    content +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size,mimeType,description', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: requestBody,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Drive Upload Error:', errorText);
    throw new Error('فشل رفع الملف إلى Google Drive');
  }

  return await res.json();
}

/**
 * Downloads a file's string content from Google Drive.
 */
export async function downloadFromGoogleDrive(token: string, fileId: string): Promise<string> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('فشل تحميل محتوى الملف من Google Drive');
  }

  return await res.text();
}

/**
 * Deletes a file from Google Drive.
 */
export async function deleteFromGoogleDrive(token: string, fileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('فشل حذف الملف من Google Drive');
  }
}
