export type Role = 'admin' | 'tech' | 'supervisor';
export type DeviceStatus = 'شغال' | 'عاطل' | 'تالف';
export type RequestStatus = 'pending' | 'in_progress' | 'completed';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: Role;
  departmentId?: string; // Only for supervisors
}

export interface Department {
  id: string;
  name: string;
}

export interface Device {
  id: string;
  departmentId: string;
  name: string;
  customId: string; // ID مخصص لكل جهاز
  currentQty: number;
  bookQty: number;
  difference: number;
  model: string;
  serialNumber: string;
  company: string;
  accessories: string[];
  status: DeviceStatus;
  custodian: string; // مستلم العهدة
  notes: string;
  imageUrl?: string;
}

export interface MaintenanceRequest {
  id: string;
  departmentId: string;
  deviceId: string;
  date: string;
  complaint: string;
  status: RequestStatus; // pending(red), in_progress(yellow), completed(green)
  initialReport?: string;
  requiredParts?: string;
  finalReport?: string;
}

export interface MaintenanceTracking {
  id: string;
  deviceId: string;
  type: string; // تكييف، زيوت وفلاتر، بطاريات
  date: string;
  details: any; 
}
