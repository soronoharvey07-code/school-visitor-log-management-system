import React, { useState, useEffect } from 'react';
import { API } from '../../api';
import { Calendar, CalendarPlus, X, Copy, Edit2, Power, Trash2, Link as LinkIcon, ExternalLink, QrCode, Download, Check } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { formatManilaDate } from '../../utils/dateUtils';

interface SchoolEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
  link: string;
  status: 'active' | 'inactive';
}

export function EventView() {
  const [events, setEvents] = useState<SchoolEvent[]>(() => {
    const saved = localStorage.getItem('schoolEvents');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectedQrEvent, setSelectedQrEvent] = useState<SchoolEvent | null>(null);
  const [copiedQrLink, setCopiedQrLink] = useState(false);
  
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');


  const mapEvent = (e: any): SchoolEvent => ({
    id: String(e.id),
    name: e.event_name || e.name || 'School Event',
    date: e.date || '',
    location: e.location || '',
    description: e.description || '',
    link: e.registration_link || e.link || `/register/${e.id}`,
    status: e.status === 'inactive' ? 'inactive' : 'active'
  });

  const loadEvents = () => {
    API.getEvents().then(data => {
      if (Array.isArray(data)) {
        const mapped = data.map(mapEvent);
        setEvents(mapped);
        localStorage.setItem('schoolEvents', JSON.stringify(mapped));
      }
    }).catch(err => {
      console.warn('Error fetching events from API:', err);
    });
  };

  useEffect(() => {
    loadEvents();
    const handleDataCleared = () => {
      setEvents([]);
      localStorage.removeItem('schoolEvents');
    };
    window.addEventListener('data-cleared', handleDataCleared);
    return () => window.removeEventListener('data-cleared', handleDataCleared);
  }, []);

  useEffect(() => {
    localStorage.setItem('schoolEvents', JSON.stringify(events));
  }, [events]);

  const openCreateModal = () => {
    setEditingEventId(null);
    setEventName('');
    setEventDate('');
    setEventLocation('');
    setEventDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (event: SchoolEvent) => {
    setEditingEventId(event.id);
    setEventName((event as any).event_name || event.name);
    setEventDate(event.date);
    setEventLocation(event.location);
    setEventDescription(event.description);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!eventName || !eventDate) return;

    if (editingEventId) {
      await API.updateEvent(editingEventId, {
        event_name: eventName,
        date: eventDate,
        location: eventLocation,
        description: eventDescription
      });
    } else {
      await API.createEvent({
        event_name: eventName,
        date: eventDate,
        location: eventLocation,
        description: eventDescription,
        status: 'active'
      });
    }
    
    // Refresh events
    const data = await API.getEvents();
    if (Array.isArray(data)) {
      const mapped = data.map(mapEvent);
      setEvents(mapped);
      localStorage.setItem('schoolEvents', JSON.stringify(mapped));
    }
    
    setIsModalOpen(false);
  };

  const toggleStatus = async (id: string) => {
    const target = events.find(e => String(e.id) === String(id));
    if (!target) return;

    const nextStatus = target.status === 'active' ? 'inactive' : 'active';
    const updatedEvents = events.map(e => String(e.id) === String(id) ? { ...e, status: nextStatus as 'active' | 'inactive' } : e);
    setEvents(updatedEvents);
    localStorage.setItem('schoolEvents', JSON.stringify(updatedEvents));

    try {
      await API.updateEvent(id, { status: nextStatus });
    } catch (err) {
      console.warn('Unable to persist event status change to server:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this event? This action cannot be undone.')) {
      await API.deleteEvent(id);
      const remaining = events.filter(e => String(e.id) !== String(id));
      setEvents(remaining);
      localStorage.setItem('schoolEvents', JSON.stringify(remaining));
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return formatManilaDate(dateStr);
  };

  const getRegistrationUrl = (eventId: string | number) => {
    let origin = window.location.origin;
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv.VITE_PUBLIC_URL) {
      origin = metaEnv.VITE_PUBLIC_URL;
    } else if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      const publicHost = 'https://ais-dev-b4jcin66l4ag2smvijhkce-9285805548.asia-southeast1.run.app';
      if (publicHost) {
        origin = publicHost;
      }
    }
    origin = origin.replace(/\/+$/, '');
    return `${origin}/register/${eventId}`;
  };

  const handleDownloadQr = (event: SchoolEvent) => {
    const canvas = document.getElementById(`qr-canvas-${event.id}`) as HTMLCanvasElement;
    if (!canvas) return;

    const eventNameStr = (event as any).event_name || event.name || 'event';
    const fileName = `${eventNameStr.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_qr_code.png`;

    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="bg-card-bg rounded-xl border border-app-border shadow-sm overflow-hidden flex flex-col min-h-[500px] relative">
      <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-th-bg">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-semibold text-main-fg">Event</h2>
        </div>
        <span className="text-sm font-medium text-muted-fg">Manage Visitor Registration</span>
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <div className="mb-6">
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <CalendarPlus size={16} />
            Create Event
          </button>
        </div>
        
        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-fg">
            <CalendarPlus size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">No events created yet. Click "Create Event" to generate a registration link.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {events.map((event) => (
              <div key={event.id} className="bg-app-bg border border-app-border rounded-xl p-5 flex flex-col gap-3 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-main-fg">{(event as any).event_name || event.name}</h3>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${event.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20'}`}>
                      {event.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button 
                      onClick={() => {
                        setSelectedQrEvent(event);
                        setCopiedQrLink(false);
                      }} 
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 text-xs font-semibold rounded-lg transition-colors"
                      title="Generate and view Event QR Code"
                    >
                      <QrCode size={14} />
                      QR Code
                    </button>
                    <button 
                      onClick={() => {
                        const link = getRegistrationUrl(event.id);
                        navigator.clipboard.writeText(link);
                        alert('Link copied to clipboard!');
                      }} 
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-app-border text-label-fg text-xs font-medium rounded-lg hover:bg-hover-bg transition-colors"
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                    <button 
                      onClick={() => window.open(getRegistrationUrl(event.id), '_blank')} 
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-app-border text-label-fg text-xs font-medium rounded-lg hover:bg-hover-bg transition-colors"
                    >
                      <ExternalLink size={14} />
                      Open
                    </button>
                    <button 
                      onClick={() => openEditModal(event)} 
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-app-border text-label-fg text-xs font-medium rounded-lg hover:bg-hover-bg transition-colors"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button 
                      onClick={() => toggleStatus(event.id)} 
                      className={`flex items-center gap-1.5 px-3 py-1.5 border border-app-border text-xs font-medium rounded-lg hover:bg-hover-bg transition-colors ${event.status === 'active' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                    >
                      <Power size={14} />
                      {event.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => handleDelete(event.id)} 
                      className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                      title="Delete event"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="text-[13px] text-muted-fg font-medium">
                   {formatDate(event.date)} {event.location && `• ${event.location}`}
                </div>
                
                {event.description && (
                  <div className="text-[13px] text-label-fg leading-relaxed">
                    {event.description}
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-[13px] text-label-fg bg-card-bg px-3 py-2.5 rounded-lg border border-app-border mt-2 w-fit">
                  <LinkIcon size={14} className="text-muted-fg shrink-0" />
                  <span className="font-medium truncate">{getRegistrationUrl(event.id)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 p-4 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative bg-card-bg border border-app-border rounded-xl w-full max-w-[480px] shadow-2xl flex flex-col p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-main-fg">{editingEventId ? 'Edit Event' : 'Create New Event'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-icon-fg hover:text-heading-fg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-semibold text-label-fg mb-1.5">Event Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full bg-app-bg border border-app-border focus:border-[#3b82f6] rounded-lg px-3 py-2.5 text-sm text-main-fg outline-none transition-colors placeholder:text-muted-fg" 
                  placeholder="e.g. Science Fair 2026" 
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-label-fg mb-1.5">Event Date <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-app-bg border border-app-border focus:border-[#3b82f6] rounded-lg px-3 py-2.5 text-sm text-main-fg outline-none transition-colors dark:[color-scheme:dark]" 
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-label-fg mb-1.5">Event Location (Optional)</label>
                <input 
                  type="text" 
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full bg-app-bg border border-app-border focus:border-[#3b82f6] rounded-lg px-3 py-2.5 text-sm text-main-fg outline-none transition-colors placeholder:text-muted-fg" 
                  placeholder="e.g. Main Auditorium" 
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-label-fg mb-1.5">Event Description (Optional)</label>
                <textarea 
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full bg-app-bg border border-app-border focus:border-[#3b82f6] rounded-lg px-3 py-2.5 text-sm text-main-fg outline-none resize-y transition-colors placeholder:text-muted-fg" 
                  rows={3} 
                  placeholder="Describe the event..."
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="px-5 py-2 border border-app-border text-label-fg text-sm font-medium rounded-lg hover:bg-hover-bg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={!eventName || !eventDate}
                className="px-5 py-2 bg-[#3b82f6] text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {editingEventId ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Popup Modal */}
      {selectedQrEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/70 p-4 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setSelectedQrEvent(null)}></div>
          
          <div className="relative bg-card-bg border border-app-border rounded-2xl w-full max-w-[420px] shadow-2xl flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-th-bg">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-main-fg">Event QR Code</h3>
              </div>
              <button 
                onClick={() => setSelectedQrEvent(null)}
                className="text-icon-fg hover:text-heading-fg p-1.5 rounded-lg hover:bg-hover-bg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col items-center text-center">
              <div className="mb-4">
                <h4 className="text-lg font-bold text-main-fg mb-1">
                  {(selectedQrEvent as any).event_name || selectedQrEvent.name}
                </h4>
                <p className="text-xs font-medium text-muted-fg">
                  Scan to access active visitor registration form
                </p>
              </div>

              {/* QR Code Canvas Frame */}
              <div className="p-4 bg-white rounded-2xl border-2 border-blue-500/30 shadow-lg mb-5 flex items-center justify-center">
                <QRCodeCanvas
                  id={`qr-canvas-${selectedQrEvent.id}`}
                  value={getRegistrationUrl(selectedQrEvent.id)}
                  size={220}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              {/* Registration Link Field */}
              <div className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 flex items-center justify-between gap-2 mb-5">
                <span className="text-xs text-muted-fg truncate font-mono select-all text-left">
                  {getRegistrationUrl(selectedQrEvent.id)}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getRegistrationUrl(selectedQrEvent.id));
                    setCopiedQrLink(true);
                    setTimeout(() => setCopiedQrLink(false), 2000);
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-semibold shrink-0 flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20 transition-colors"
                >
                  {copiedQrLink ? <Check size={13} /> : <Copy size={13} />}
                  {copiedQrLink ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Download PNG Button */}
              <button
                onClick={() => handleDownloadQr(selectedQrEvent)}
                className="w-full py-2.5 px-4 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Download size={16} />
                Download / Save QR Code (PNG)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
