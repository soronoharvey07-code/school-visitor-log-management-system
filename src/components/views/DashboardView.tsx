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
        setVisitors(consolidateVisitors(mapped));
      }
    } catch (e) {
      console.warn('Failed to refresh visitors after timeout:', e);
    }
  };

  return (
    <div className="bg-card-bg rounded-xl border border-app-border shadow-sm overflow-hidden flex flex-col min-h-[500px]">
      <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-th-bg">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-semibold text-main-fg">Dashboard</h2>
        </div>
        <span className="text-sm font-medium text-muted-fg">{activeVisitors.length} inside</span>
      </div>
      
      {successMessage && (
        <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-lg flex items-center gap-2">
          <CheckCircle2 size={16} />
          Visitor has been successfully checked out.
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <div className="grid grid-cols-6 gap-4 px-6 py-3 border-b border-app-border text-xs font-semibold text-muted-fg uppercase tracking-wider bg-th-bg">
          <div>PHOTO</div>
          <div>TIME-IN</div>
          <div>NAME</div>
          <div>PURPOSE</div>
          <div>VISITS</div>
          <div>ACTION</div>
        </div>
        {activeVisitors.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-fg py-20">
            <Building2 size={48} className="mb-4 text-slate-400 dark:text-slate-500 opacity-60" />
            <p className="text-sm font-medium">No active visitors at this time</p>
          </div>
        ) : (
          <div className="divide-y divide-app-border flex-1">
            {activeVisitors.map((visitor) => (
              <div key={visitor.id} className="grid grid-cols-6 gap-4 px-6 py-4 items-center hover:bg-hover-bg transition-colors">
                <div>
                  <VisitorAvatar src={visitor.photo_url || visitor.photoDataUrl || visitor.photo} alt={visitor.name} className="w-10 h-10" iconSize={20} />
                </div>
                <div className="text-sm font-medium text-label-fg">{formatTime(visitor.signInTime)}</div>
                <div className="text-sm font-semibold text-main-fg">{visitor.name}</div>
                <div className="text-sm text-muted-fg">{visitor.purpose}</div>
                <div className="text-sm text-muted-fg font-medium">{getVisits(visitor.name)}</div>
                <div>
                  <button 
                    onClick={() => handleTimeOut(visitor.id)}
                    className="text-xs px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-lg transition-colors font-medium"
                  >
                    Time-Out
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
