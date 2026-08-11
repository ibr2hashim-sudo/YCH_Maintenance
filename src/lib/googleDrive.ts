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
    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('auth/unauthorized-domain')) {
      throw new Error(
        `رابط موقعك الحالي غير مصرح له بتسجيل الدخول في Firebase. لحل المشكلة: افتح لوحة تحكم Firebase > Authentication > Settings > Authorized domains وأضف رابط موقعك في Netlify (بدون https://).`
      );
    }
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

export const PRIMARY_DB_FILE_NAME = 'maintenance_system_primary_db.json';

/**
 * Saves or overwrites the single canonical primary database file in Google Drive.
 * This allows using Google Drive as a primary cloud storage without creating duplicate timestamped files.
 */
export async function savePrimaryDatabaseToDrive(token: string, content: string): Promise<DriveFileItem> {
  const folderId = await getOrCreateBackupFolder(token);

  // Check if primary db file already exists
  const query = encodeURIComponent(`name='${PRIMARY_DB_FILE_NAME}' and '${folderId}' in parents and trashed=false`);
  const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,size,mimeType,description)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (listRes.ok) {
    const listData = await listRes.json();
    if (listData.files && listData.files.length > 0) {
      const existingFile = listData.files[0];
      // PATCH update content
      const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: content,
      });

      if (!patchRes.ok) {
        throw new Error('فشل تحديث قاعدة البيانات الرئيسية في Google Drive');
      }
      const updatedData = await patchRes.json();
      return {
        ...existingFile,
        ...updatedData,
      };
    }
  }

  // Otherwise create new primary file
  return await uploadToGoogleDrive(
    token,
    PRIMARY_DB_FILE_NAME,
    content,
    'application/json',
    'قاعدة البيانات الرئيسية الموحدة لنظام إدارة الصيانة والعهد'
  );
}

/**
 * Loads the single canonical primary database file from Google Drive if it exists.
 */
export async function loadPrimaryDatabaseFromDrive(token: string): Promise<{ content: string; file: DriveFileItem } | null> {
  const folderId = await getOrCreateBackupFolder(token);
  const query = encodeURIComponent(`name='${PRIMARY_DB_FILE_NAME}' and '${folderId}' in parents and trashed=false`);
  const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,size,mimeType,description)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!listRes.ok) {
    throw new Error('فشل البحث عن قاعدة البيانات الرئيسية في Google Drive');
  }

  const listData = await listRes.json();
  if (!listData.files || listData.files.length === 0) {
    return null;
  }

  const file = listData.files[0];
  const content = await downloadFromGoogleDrive(token, file.id);
  return { content, file };
}

