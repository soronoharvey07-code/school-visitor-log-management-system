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
    if (setVisitors) {
      setVisitors(prev => prev.filter(v => v.id !== id));
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

  const handleEditVisitor = (updatedVisitor: Visitor) => {
    if (setVisitors) {
      setVisitors(prev => prev.map(v => v.id === updatedVisitor.id ? updatedVisitor : v));
      setSelectedVisitor(updatedVisitor);
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

      <div className="bg-card-bg rounded-xl border border-app-border shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        {/* Header with Title & Stats */}
        <div className="px-6 py-4 border-b border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-th-bg">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-main-fg">Visitors</h2>
            <span className="ml-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {visitors.length} {visitors.length === 1 ? 'visitor' : 'visitors'}
            </span>
          </div>

          {/* Quick Search & Status Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search visitors..."
                className="w-full bg-app-bg border border-app-border rounded-lg py-1.5 pl-9 pr-3 text-xs text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-app-bg border border-app-border rounded-lg py-1.5 px-3 text-xs text-label-fg focus:outline-none focus:border-blue-500 appearance-none pr-7 cursor-pointer font-medium"
              >
                <option value="all">All Status</option>
                <option value="signed-in">Inside Campus</option>
                <option value="pre-registered">Pre-Registered</option>
                <option value="signed-out">Left Campus</option>
              </select>
              <Filter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-fg pointer-events-none" />
            </div>
          </div>
        </div>
        
        {/* Visitors Table or Empty State */}
        {filteredVisitors.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <User size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-muted-fg text-sm font-medium">
              {visitors.length === 0 ? 'No visitors registered yet.' : 'No visitors match your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
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
                  <div className="text-sm font-semibold font-mono text-main-fg">{visitor.idNumber || '-'}</div>
                  <div className="text-sm font-medium text-label-fg">{formatTime(visitor.signInTime)}</div>
                  <div className="text-sm font-medium text-label-fg">{formatTime(visitor.signOutTime)}</div>
                  <div className="text-sm font-semibold text-main-fg">{visitor.name}</div>
                  <div className="text-sm text-muted-fg">{visitor.visitorType || '-'}</div>
                  <div className="text-sm text-muted-fg">{visitor.purpose}</div>
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
        )}
      </div>
    </div>
  );
}
