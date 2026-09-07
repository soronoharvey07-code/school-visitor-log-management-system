import { API } from '../api';
import { SchoolEvent } from '../types';

export interface EventValidationResult {
  isValid: boolean;
  isActive: boolean;
  event: SchoolEvent | null;
  status: 'active' | 'inactive' | 'not_found';
  errorMessage?: string;
}

/**
 * Safely normalizes an event status value.
 * An event is strictly active only if status is explicitly 'active' (case-insensitive).
 */
export function normalizeEventStatus(status: unknown): 'active' | 'inactive' {
  if (!status) return 'inactive';
  const clean = String(status).trim().toLowerCase();
  return clean === 'active' ? 'active' : 'inactive';
}

/**
 * Extracts and cleans the event ID from any raw identifier, URL, or QR-code scan string.
 * Supports:
 * - Direct IDs: "1", 1
 * - Direct URLs: "https://example.com/register/1", "http://localhost:3000/register/1"
 * - Query URLs: "https://example.com/?event=1"
 * - Clean paths: "/register/1", "/register/1/"
 * - URLs with query params/hashes: "/register/1?source=qr#top"
 */
export function extractEventId(rawInput: string | number): string {
  if (rawInput === undefined || rawInput === null) return '';
  let str = String(rawInput).trim();

  // If input is a URL or path with /register/
  if (str.includes('/register/')) {
    const after = str.split('/register/')[1] || '';
    str = after.split('?')[0].split('#')[0].replace(/\/+$/, '').trim();
  } else if (str.includes('?event=')) {
    const after = str.split('?event=')[1] || '';
    str = after.split('&')[0].split('#')[0].trim();
  } else if (str.includes('&event=')) {
    const after = str.split('&event=')[1] || '';
    str = after.split('&')[0].split('#')[0].trim();
  } else {
    // Strip trailing slashes, queries, hashes
    str = str.split('?')[0].split('#')[0].replace(/\/+$/, '').trim();
  }

  return str;
}

/**
 * Shared event-status validation function for both direct links and QR-code access.
 * Enforces identical active/inactive verification across the application:
 * 
 * When event is inactive or not found:
 *   -> returns { isValid: boolean, isActive: false, status: 'inactive' | 'not_found' }
 *   -> Caller displays "Link is Unavailable" and blocks registration.
 * 
 * When event is active:
 *   -> returns { isValid: true, isActive: true, status: 'active', event: SchoolEvent }
 *   -> Caller displays the active registration form.
 */
export async function validateEventStatus(
  rawInput: string | number
): Promise<EventValidationResult> {
  const eventId = extractEventId(rawInput);

  if (!eventId) {
    return {
      isValid: false,
      isActive: false,
      event: null,
      status: 'not_found',
      errorMessage: 'No valid event identifier found.'
    };
  }

  // 1. Authoritative Backend Check (Primary Source of Truth)
  try {
    const serverEvent = await API.getPublicEvent(eventId);
    if (serverEvent && (serverEvent.id !== undefined || serverEvent.event_name)) {
      const normalizedStatus = normalizeEventStatus(serverEvent.status);
      const mappedEvent: SchoolEvent = {
        id: String(serverEvent.id),
        event_name: serverEvent.event_name || (serverEvent as any).name || 'School Event',
        date: serverEvent.date || '',
        location: serverEvent.location || '',
        description: serverEvent.description || '',
        registration_link: serverEvent.registration_link || `/register/${eventId}`,
        status: normalizedStatus
      };

      const isActive = normalizedStatus === 'active';
      return {
        isValid: true,
        isActive,
        event: mappedEvent,
        status: normalizedStatus,
        errorMessage: isActive
          ? undefined
          : 'This event registration link is currently inactive or no longer accepting submissions.'
      };
    }
  } catch (err: any) {
    console.warn(`[EventValidation] API check error for event ${eventId}:`, err?.message || err);
  }

  // 2. Client Local Storage Cache Fallback (for offline or local dev sync)
  try {
    const saved = localStorage.getItem('schoolEvents');
    if (saved) {
      const list = JSON.parse(saved);
      const found = Array.isArray(list)
        ? list.find((e: any) => String(e.id).trim() === eventId)
        : null;
      if (found) {
        const normalizedStatus = normalizeEventStatus(found.status);
        const mappedEvent: SchoolEvent = {
          id: String(found.id),
          event_name: found.event_name || found.name || 'School Event',
          date: found.date || '',
          location: found.location || '',
          description: found.description || '',
          registration_link: found.registration_link || found.link || `/register/${eventId}`,
          status: normalizedStatus
        };

        const isActive = normalizedStatus === 'active';
        return {
          isValid: true,
          isActive,
          event: mappedEvent,
          status: normalizedStatus,
          errorMessage: isActive
            ? undefined
            : 'This event registration link is currently inactive or no longer accepting submissions.'
        };
      }
    }
  } catch (e) {
    // ignore
  }

  // 3. Opener Window Local Storage Fallback (when opened in new tab from admin dashboard)
  try {
    if (typeof window !== 'undefined' && window.opener && window.opener.localStorage) {
      const saved = window.opener.localStorage.getItem('schoolEvents');
      if (saved) {
        const list = JSON.parse(saved);
        const found = Array.isArray(list)
          ? list.find((e: any) => String(e.id).trim() === eventId)
          : null;
        if (found) {
          const normalizedStatus = normalizeEventStatus(found.status);
          const mappedEvent: SchoolEvent = {
            id: String(found.id),
            event_name: found.event_name || found.name || 'School Event',
            date: found.date || '',
            location: found.location || '',
            description: found.description || '',
            registration_link: found.registration_link || found.link || `/register/${eventId}`,
            status: normalizedStatus
          };

          const isActive = normalizedStatus === 'active';
          return {
            isValid: true,
            isActive,
            event: mappedEvent,
            status: normalizedStatus,
            errorMessage: isActive
              ? undefined
              : 'This event registration link is currently inactive or no longer accepting submissions.'
          };
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // 4. If not found anywhere, strictly reject. NEVER fabricate a fake active event.
  return {
    isValid: false,
    isActive: false,
    event: null,
    status: 'not_found',
    errorMessage: 'This event registration link is currently inactive or no longer accepting submissions.'
  };
}
