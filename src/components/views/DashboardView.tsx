import React, { useState } from 'react';
import { Building2, User, CheckCircle2 } from 'lucide-react';
import { Visitor } from '../../types';
import { API } from '../../api';
import { VisitorAvatar } from '../VisitorAvatar';
import { formatManilaTimeShort, parseToMs, parseOptionalToMs } from '../../utils/dateUtils';
import { consolidateVisitors } from '../../utils/visitorManager';

interface DashboardViewProps {
  visitors?: Visitor[];
  setVisitors?: React.Dispatch<React.SetStateAction<Visitor[]>>;
}

export function DashboardView({ visitors = [], setVisitors }: DashboardViewProps) {
  const [successMessage, setSuccessMessage] = useState(false);
  const activeVisitors = visitors.filter(v => v.status === 'signed-in');

  const formatTime = (timestamp: number) => {
    return formatManilaTimeShort(timestamp);
  };

  const getVisits = (name: string) => {
    return visitors.filter(v => v.name.toLowerCase() === name.toLowerCase()).length;
  };

  const handleTimeOut = async (id: string) => {
    try {
      await API.timeOutVisitor(id);
    } catch (err) {
      console.warn('API timeout error:', err);
    }

    if (setVisitors) {
      setVisitors(prev => 
        prev.map(v => 
          v.id === id 
            ? { ...v, status: 'signed-out', signOutTime: Date.now() } 
            : v
        )
      );
    }

    setSuccessMessage(true);
    setTimeout(() => {
      setSuccessMessage(false);
    }, 3000);

    try {
      const freshData = await API.getVisitors();
      if (Array.isArray(freshData) && setVisitors) {
        const mapped = freshData.map((v: any) => {
          let st = (v.status || '').toLowerCase();
          if (st === 'inside') st = 'signed-in';
          if (st === 'outside') st = 'signed-out';
          if (!st) st = 'pre-registered';

          const rawHistory = Array.isArray(v.history) ? v.history : [];
          const history = rawHistory.map((h: any) => ({
            id: String(h.id || ''),
            signInTime: parseToMs(h.signInTime || h.time_in || h.created_at),
            signOutTime: parseOptionalToMs(h.signOutTime || h.time_out),
            purpose: h.purpose || v.purpose || 'Visit',
            visiting: h.visiting || v.visit_info || '',
            visitorType: h.visitorType || v.visitor_type || 'Guest',
            status: h.status || st
          }));

          return {
            id: String(v.id),
            idNumber: v.visitor_number || v.id_number || v.idNumber || String(v.id),
            name: v.full_name || v.name || '',
            visitorType: v.visitor_type || v.visitorType || 'Guest',
            visiting: v.visit_info || v.visiting || 'Event',
            idType: v.id_type || v.idType || 'School ID',
            contactNumber: v.contact_number || v.contactNumber || '',
            address: v.address || '',
            purpose: v.purpose || 'Event Attendance',
            photo: v.photo_url || v.photoDataUrl || v.photo || null,
            photo_url: v.photo_url || v.photoDataUrl || v.photo || null,
            photoDataUrl: v.photo_url || v.photoDataUrl || v.photo || null,
            status: st,
            signInTime: parseToMs(v.signInTime || v.time_in || v.created_at),
            signOutTime: parseOptionalToMs(v.signOutTime || v.time_out),
            history: history.length > 0 ? history : undefined
          };
        });
        setVisitors(prev => consolidateVisitors([...prev, ...mapped]));
      }
    } catch (e) {
      console.warn('Failed to refresh visitors after timeout:', e);
    }
  };

  return (
    <div className="bg-card-bg rounded-xl border border-app-border shadow-sm overflow-hidden flex flex-col min-h-[450px] sm:min-h-[500px]">
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-app-border flex justify-between items-center bg-th-bg">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <h2 className="text-base font-semibold text-main-fg">Dashboard</h2>
        </div>
        <span className="text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          {activeVisitors.length} inside
        </span>
      </div>
      
      {successMessage && (
        <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-lg flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>Visitor has been successfully checked out.</span>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {activeVisitors.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-fg py-16 sm:py-20 px-4 text-center">
            <Building2 size={44} className="mb-3 text-slate-400 dark:text-slate-500 opacity-60" />
            <p className="text-sm font-medium">No active visitors inside campus at this time</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards (Phones & Small Screens) */}
            <div className="md:hidden divide-y divide-app-border flex-1">
              {activeVisitors.map((visitor) => (
                <div key={visitor.id} className="p-4 flex flex-col gap-3 hover:bg-hover-bg/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <VisitorAvatar 
                        src={visitor.photo_url || visitor.photoDataUrl || visitor.photo} 
                        alt={visitor.name} 
                        className="w-12 h-12 shrink-0 rounded-full" 
                        iconSize={22} 
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-main-fg truncate">{visitor.name}</h4>
                        <p className="text-xs text-muted-fg truncate mt-0.5">
                          {visitor.purpose || 'Visit'} {visitor.visiting ? `• ${visitor.visiting}` : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] font-medium text-label-fg bg-app-bg px-2 py-0.5 rounded border border-app-border">
                            In: {formatTime(visitor.signInTime)}
                          </span>
                          <span className="text-[11px] font-medium text-muted-fg">
                            {getVisits(visitor.name)} {getVisits(visitor.name) === 1 ? 'visit' : 'visits'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button 
                      onClick={() => handleTimeOut(visitor.id)}
                      className="w-full min-h-[42px] py-2 px-4 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white active:bg-red-600 active:text-white rounded-lg transition-colors font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      Time-Out Visitor
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (Tablets & Desktops) */}
            <div className="hidden md:block flex-1 overflow-x-auto">
              <div className="grid grid-cols-6 gap-4 px-6 py-3 border-b border-app-border text-xs font-semibold text-muted-fg uppercase tracking-wider bg-th-bg">
                <div>PHOTO</div>
                <div>TIME-IN</div>
                <div>NAME</div>
                <div>PURPOSE</div>
                <div>VISITS</div>
                <div className="text-right">ACTION</div>
              </div>
              <div className="divide-y divide-app-border">
                {activeVisitors.map((visitor) => (
                  <div key={visitor.id} className="grid grid-cols-6 gap-4 px-6 py-4 items-center hover:bg-hover-bg transition-colors">
                    <div>
                      <VisitorAvatar src={visitor.photo_url || visitor.photoDataUrl || visitor.photo} alt={visitor.name} className="w-10 h-10" iconSize={20} />
                    </div>
                    <div className="text-sm font-medium text-label-fg">{formatTime(visitor.signInTime)}</div>
                    <div className="text-sm font-semibold text-main-fg truncate">{visitor.name}</div>
                    <div className="text-sm text-muted-fg truncate">{visitor.purpose}</div>
                    <div className="text-sm text-muted-fg font-medium">{getVisits(visitor.name)}</div>
                    <div className="text-right">
                      <button 
                        onClick={() => handleTimeOut(visitor.id)}
                        className="text-xs px-3.5 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-lg transition-colors font-semibold"
                      >
                        Time-Out
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
