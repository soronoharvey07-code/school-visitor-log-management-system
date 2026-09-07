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
  automaticLogoutEnabled?: boolean;
  durationValue: number;
  durationUnit: 'minutes' | 'hours';
  warningDurationValue: number;
  warningDurationUnit: 'seconds' | 'minutes';
  isConfigured?: boolean;
}

export const DEFAULT_AUTO_LOGOUT_SETTINGS: AutoLogoutSettings = {
  enabled: false,
  automaticLogoutEnabled: false,
  durationValue: 30,
  durationUnit: 'minutes',
  warningDurationValue: 30,
  warningDurationUnit: 'seconds',
  isConfigured: false
};

export function getStoredAutoLogoutSettings(): AutoLogoutSettings {
  try {
    // 1. Check client environment variables if provided in production build
    const envEnabledRaw = (import.meta as any).env?.VITE_AUTOMATIC_LOGOUT_ENABLED ?? (import.meta as any).env?.VITE_AUTO_LOGOUT_ENABLED;
    let envEnabled: boolean | undefined = undefined;
    if (envEnabledRaw !== undefined && envEnabledRaw !== '') {
      const clean = String(envEnabledRaw).trim().toLowerCase();
      if (clean === 'true' || clean === '1' || clean === 'on') envEnabled = true;
      else if (clean === 'false' || clean === '0' || clean === 'off') envEnabled = false;
    }

    const raw = localStorage.getItem('auto_logout_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        const isEnabled = parsed.automaticLogoutEnabled !== undefined
          ? Boolean(parsed.automaticLogoutEnabled)
          : Boolean(parsed.enabled);

        return {
          enabled: envEnabled !== undefined && !parsed.isConfigured ? envEnabled : isEnabled,
          automaticLogoutEnabled: envEnabled !== undefined && !parsed.isConfigured ? envEnabled : isEnabled,
          durationValue: Number(parsed.durationValue) > 0 ? Number(parsed.durationValue) : 30,
          durationUnit: parsed.durationUnit === 'hours' ? 'hours' : 'minutes',
          warningDurationValue: Number(parsed.warningDurationValue) > 0 ? Number(parsed.warningDurationValue) : 30,
          warningDurationUnit: parsed.warningDurationUnit === 'minutes' ? 'minutes' : 'seconds',
          isConfigured: Boolean(parsed.isConfigured)
        };
      }
    }

    // Direct key in localStorage
    const directVal = localStorage.getItem('automaticLogoutEnabled');
    if (directVal !== null) {
      const isEnabled = directVal === 'true' || directVal === '1';
      return {
        ...DEFAULT_AUTO_LOGOUT_SETTINGS,
        enabled: isEnabled,
        automaticLogoutEnabled: isEnabled,
        isConfigured: true
      };
    }

    if (envEnabled !== undefined) {
      return {
        ...DEFAULT_AUTO_LOGOUT_SETTINGS,
        enabled: envEnabled,
        automaticLogoutEnabled: envEnabled,
        isConfigured: true
      };
    }
  } catch (err) {
    console.warn('Error reading stored auto-logout settings:', err);
  }
  return { ...DEFAULT_AUTO_LOGOUT_SETTINGS };
}

export interface SchoolEvent {
  id: string;
  event_name?: string;
  name?: string;
  date: string;
  location: string;
  description: string;
  registration_link?: string;
  link?: string;
  status: 'active' | 'inactive';
}


