import React from 'react';
import { X } from 'lucide-react';
import { User } from '../types';
import { formatManilaDateTime } from '../utils/dateUtils';

interface UserDetailsModalProps {
  user: User;
  onClose: () => void;
}

export function UserDetailsModal({ user, onClose }: UserDetailsModalProps) {
  const formatDate = (timestamp?: number) => {
    return formatManilaDateTime(timestamp, 'Never');
  };

  const uname = String(user.username || '');
  const unameLower = uname.toLowerCase();
  const roleLower = String(user.role || '').toLowerCase();
  const isAdmin = roleLower === 'admin' || roleLower === 'administrator' || unameLower.includes('admin');
  const isGuard = unameLower === 'guard' || roleLower === 'guard';

  const fullName = user.fullName || (isAdmin ? 'Administrator' : isGuard ? 'Security Personnel' : uname);
  const displayUsername = (isAdmin && (unameLower === 'admin2026' || unameLower === 'admin')) ? 'Admin' : (isGuard && unameLower === 'guard') ? 'Guard' : uname;
  const displayPassword = user.password || (isAdmin ? 'RHMC_2026' : isGuard ? '2026_RHMC' : '••••••••');
  const displayRole = isAdmin ? 'Admin' : isGuard ? 'Guard' : user.role;
  const displayStatus = user.status || 'Active';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-card-bg border border-app-border rounded-xl w-full max-w-[500px] shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-th-bg">
          <h2 className="text-lg font-bold text-main-fg">User Details</h2>
          <button onClick={onClose} className="text-icon-fg hover:text-heading-fg transition-colors p-1 rounded-lg hover:bg-hover-bg">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <DetailRow label="Full Name" value={fullName} />
            <DetailRow label="Username" value={displayUsername} />
            <DetailRow label="Password" value={displayPassword} />
            <DetailRow 
              label="Role" 
              value={
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md ${isAdmin ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'}`}>
                  {displayRole}
                </span>
              } 
            />
            <DetailRow 
              label="Status" 
              value={
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md ${displayStatus === 'Active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'}`}>
                  {displayStatus}
                </span>
              } 
            />
            <DetailRow label="Last Login" value={formatDate(user.lastLogin)} />
            <DetailRow label="Last Logout" value={formatDate(user.lastLogout)} />
          </div>
          <div className="mt-8 flex justify-end">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-transparent border border-app-border text-label-fg font-medium rounded-lg hover:bg-hover-bg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-app-border/40 last:border-b-0">
      <div className="text-[14px] text-muted-fg font-medium">{label}</div>
      <div className="text-[14px] font-semibold text-main-fg">{value}</div>
    </div>
  );
}
