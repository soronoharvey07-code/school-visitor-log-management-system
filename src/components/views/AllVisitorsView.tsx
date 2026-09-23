import React, { useState } from 'react';
import { Users, User, Search, Filter } from 'lucide-react';
import { Visitor } from '../../types';
import { VisitorDetailsModal } from '../VisitorDetailsModal';
import { VisitorAvatar } from '../VisitorAvatar';
import { API } from '../../api';
import { formatManilaTimeShort } from '../../utils/dateUtils';

interface AllVisitorsViewProps {
  visitors?: Visitor[];
  setVisitors?: React.Dispatch<React.SetStateAction<Visitor[]>>;
}

export function AllVisitorsView({ visitors = [], setVisitors }: AllVisitorsViewProps) {
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const formatTime = (timestamp?: number) => {
    return formatManilaTimeShort(timestamp);
  };

  const handleDeleteVisitor = async (id: string) => {
    try {
      await API.deleteVisitor(id);
    } catch (e) {
      console.warn('API delete error:', e);
    }
    try {
      const delRaw = localStorage.getItem('svlms_deleted_visitor_ids');
      const delList: string[] = delRaw ? JSON.parse(delRaw) : [];
      if (!delList.includes(String(id))) {
        delList.push(String(id));
        localStorage.setItem('svlms_deleted_visitor_ids', JSON.stringify(delList));
      }
    } catch (e) {}
    if (setVisitors) {
      setVisitors(prev => {
        const remaining = prev.filter(v => v.id !== id && v.idNumber !== id);
        try {
          localStorage.setItem('school-visitor-log', JSON.stringify(remaining));
        } catch (e) {}
        return remaining;
      });
    }
  };

  const handleTimeOutVisitor = async (id: string) => {
    const now = Date.now();
    try {
      await API.timeOutVisitor(id);
    } catch (e) {
      console.warn('API timeout error:', e);
    }
    if (setVisitors) {
      setVisitors(prev => 
        prev.map(v => {
          if (v.id !== id) return v;
          const updatedHistory = (v.history && v.history.length > 0 ? v.history : [{
            id: v.id,
            signInTime: v.signInTime,
            signOutTime: v.signOutTime,
            purpose: v.purpose,
            visiting: v.visiting,
            visitorType: v.visitorType,
            status: v.status
          }]).map((h, idx, arr) => idx === arr.length - 1 ? { ...h, signOutTime: now, status: 'signed-out' as const } : h);

          return {
            ...v,
            status: 'signed-out',
            signOutTime: now,
            history: updatedHistory
          };
        })
      );
    }
  };

  const handleSignInVisitor = async (id: string) => {
    const now = Date.now();
    try {
      await API.timeInVisitor(id);
    } catch (e) {
      console.warn('API timein error:', e);
    }
    if (setVisitors) {
      setVisitors(prev => 
        prev.map(v => {
          if (v.id !== id) return v;
          const existingHistory = v.history || [{
            id: v.id,
            signInTime: v.signInTime,
            signOutTime: v.signOutTime,
            purpose: v.purpose,
            visiting: v.visiting,
            visitorType: v.visitorType,
            status: v.status
          }];

          // If visitor was pre-registered or signed-out, update or append entry
          let updatedHistory = [...existingHistory];
          if (v.status === 'pre-registered' && updatedHistory.length > 0) {
            updatedHistory[updatedHistory.length - 1] = {
              ...updatedHistory[updatedHistory.length - 1],
              signInTime: now,
              status: 'signed-in'
            };
          } else {
            updatedHistory.push({
              id: String(now),
              signInTime: now,
              purpose: v.purpose,
              visiting: v.visiting,
              visitorType: v.visitorType,
              status: 'signed-in'
            });
          }

          return {
            ...v,
            status: 'signed-in',
            signInTime: now,
            signOutTime: undefined,
            history: updatedHistory
          };
        })
      );
    }
  };

  const handleEditVisitor = async (updatedVisitor: Visitor) => {
    if (setVisitors) {
      setVisitors(prev => prev.map(v => v.id === updatedVisitor.id ? updatedVisitor : v));
      setSelectedVisitor(updatedVisitor);
    }
    try {
      const formData = new FormData();
      if (updatedVisitor.name) formData.append('full_name', updatedVisitor.name);
      if (updatedVisitor.visitorType) formData.append('visitor_type', updatedVisitor.visitorType);
      if (updatedVisitor.visiting) formData.append('visit_info', updatedVisitor.visiting);
      if (updatedVisitor.idType) formData.append('id_type', updatedVisitor.idType);
      if (updatedVisitor.idNumber) formData.append('id_number', updatedVisitor.idNumber);
      if (updatedVisitor.contactNumber) formData.append('contact_number', updatedVisitor.contactNumber);
      if (updatedVisitor.address) formData.append('address', updatedVisitor.address);
      if (updatedVisitor.purpose) formData.append('purpose', updatedVisitor.purpose);
      if (updatedVisitor.notes) formData.append('notes', updatedVisitor.notes);
      if (updatedVisitor.photoDataUrl) formData.append('photoDataUrl', updatedVisitor.photoDataUrl);
      await API.updateVisitor(updatedVisitor.id, formData).catch(() => {});
    } catch {
      // ignore
    }
  };

  const filteredVisitors = visitors.filter(visitor => {
    const matchesSearch = 
      (visitor.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (visitor.idNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (visitor.contactNumber || '').includes(searchQuery) ||
      (visitor.purpose || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (visitor.visitorType || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'signed-in' && visitor.status === 'signed-in') ||
      (statusFilter === 'signed-out' && visitor.status === 'signed-out') ||
      (statusFilter === 'pre-registered' && visitor.status === 'pre-registered');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {selectedVisitor && (
        <VisitorDetailsModal 
          visitor={selectedVisitor} 
          allVisitors={visitors} 
          onClose={() => setSelectedVisitor(null)}
          onDelete={handleDeleteVisitor}
          onTimeOut={handleTimeOutVisitor}
          onSignIn={handleSignInVisitor}
          onEdit={handleEditVisitor}
        />
      )}

      <div className="bg-card-bg rounded-xl border border-app-border shadow-sm overflow-hidden min-h-[450px] sm:min-h-[500px] flex flex-col">
        {/* Header with Title & Stats */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-th-bg">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <h2 className="text-base font-semibold text-main-fg">Visitors</h2>
            <span className="ml-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {visitors.length} {visitors.length === 1 ? 'visitor' : 'visitors'}
            </span>
          </div>

          {/* Quick Search & Status Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search visitors..."
                className="w-full bg-app-bg border border-app-border rounded-lg py-2 sm:py-1.5 pl-9 pr-3 text-sm sm:text-xs text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto bg-app-bg border border-app-border rounded-lg py-2 sm:py-1.5 pl-3 pr-8 text-sm sm:text-xs text-label-fg focus:outline-none focus:border-blue-500 appearance-none cursor-pointer font-medium"
              >
                <option value="all">All Status</option>
                <option value="signed-in">Inside Campus</option>
                <option value="pre-registered">Pre-Registered</option>
                <option value="signed-out">Left Campus</option>
              </select>
              <Filter size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-fg pointer-events-none" />
            </div>
          </div>
        </div>
        
        {/* Visitors Table or Empty State */}
        {filteredVisitors.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 sm:py-20 px-4 text-center">
            <User size={44} className="mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-muted-fg text-sm font-medium">
              {visitors.length === 0 ? 'No visitors registered yet.' : 'No visitors match your search criteria.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card List (Phones & Small Devices) */}
            <div className="md:hidden divide-y divide-app-border flex-1">
              {filteredVisitors.map((visitor) => (
                <div 
                  key={visitor.id} 
                  onClick={() => setSelectedVisitor(visitor)}
                  className="p-4 flex flex-col gap-2.5 hover:bg-hover-bg/60 active:bg-hover-bg transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <VisitorAvatar 
                        src={visitor.photo_url || visitor.photoDataUrl || visitor.photo} 
                        alt={visitor.name} 
                        className="w-12 h-12 shrink-0 rounded-full" 
                        iconSize={22} 
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-main-fg truncate">{visitor.name}</h4>
                          <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                            {visitor.idNumber || '-'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-fg truncate mt-0.5">
                          {visitor.visitorType || 'Guest'} {visitor.purpose ? `• ${visitor.purpose}` : ''}
                        </p>
                      </div>
                    </div>

                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                      visitor.status === 'signed-in' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : visitor.status === 'pre-registered'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        : 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20'
                    }`}>
                      {visitor.status === 'signed-in' ? 'Inside' : visitor.status === 'pre-registered' ? 'Pre-Reg' : 'Left'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-label-fg pt-1 border-t border-app-border/40">
                    <span className="text-muted-fg">In: <strong className="text-main-fg font-medium">{formatTime(visitor.signInTime)}</strong></span>
                    <span className="text-muted-fg">Out: <strong className="text-main-fg font-medium">{formatTime(visitor.signOutTime)}</strong></span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold text-[11px]">View Details →</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (Tablets & Desktop) */}
            <div className="hidden md:block flex-1 overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-8 gap-4 px-6 py-3 border-b border-app-border text-xs font-semibold text-muted-fg uppercase tracking-wider bg-th-bg">
                  <div>PHOTO</div>
                  <div>ID NUMBER</div>
                  <div>TIME-IN</div>
                  <div>TIME-OUT</div>
                  <div>NAME</div>
                  <div>TYPE</div>
                  <div>PURPOSE</div>
                  <div>STATUS</div>
                </div>
                <div className="divide-y divide-app-border">
                  {filteredVisitors.map((visitor) => (
                    <div 
                      key={visitor.id} 
                      onClick={() => setSelectedVisitor(visitor)}
                      className="grid grid-cols-8 gap-4 px-6 py-4 items-center hover:bg-hover-bg transition-colors cursor-pointer"
                    >
                      <div>
                        <VisitorAvatar src={visitor.photo_url || visitor.photoDataUrl || visitor.photo} alt={visitor.name} className="w-10 h-10" iconSize={20} />
                      </div>
                      <div className="text-sm font-semibold font-mono text-main-fg truncate">{visitor.idNumber || '-'}</div>
                      <div className="text-sm font-medium text-label-fg">{formatTime(visitor.signInTime)}</div>
                      <div className="text-sm font-medium text-label-fg">{formatTime(visitor.signOutTime)}</div>
                      <div className="text-sm font-semibold text-main-fg truncate">{visitor.name}</div>
                      <div className="text-sm text-muted-fg truncate">{visitor.visitorType || '-'}</div>
                      <div className="text-sm text-muted-fg truncate">{visitor.purpose}</div>
                      <div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold ${
                          visitor.status === 'signed-in' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : visitor.status === 'pre-registered'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20'
                        }`}>
                          {visitor.status === 'signed-in' ? 'Inside Campus' : visitor.status === 'pre-registered' ? 'Pre-Registered' : 'Left Campus'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
