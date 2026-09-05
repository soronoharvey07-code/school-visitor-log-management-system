export type VisitorStatus = 'signed-in' | 'signed-out' | 'pre-registered';

export interface VisitEntry {
  id: string;
  signInTime: number;
  signOutTime?: number;
  purpose: string;
  visiting: string;
  visitorType?: string;
  status: VisitorStatus;
}

export interface Visitor {
  id: string;
  name: string;
  purpose: string; // Latest purpose
  visiting: string; // Latest visiting
  visitorType?: string; // Latest visitorType
  idType?: string;
  idNumber?: string;
  contactNumber?: string;
  address?: string;
  notes?: string;
  photoDataUrl?: string | null;
  photo?: string | null;
  photo_url?: string | null;
  signInTime: number; // Latest signInTime
  signOutTime?: number; // Latest signOutTime
  status: VisitorStatus; // Latest status
  eventId?: string;
  history?: VisitEntry[]; // All visits
}

export interface User {
  id: string;
  fullName: string;
  username: string;
  password?: string;
  role: string;
  status: 'Active' | 'Inactive';
  lastLogin?: number;
  lastLogout?: number;
}

export interface AutoLogoutSettings {
  enabled: boolean;
  durationValue: number;
  durationUnit: 'minutes' | 'hours';
  warningDurationValue: number;
  warningDurationUnit: 'seconds' | 'minutes';
}

