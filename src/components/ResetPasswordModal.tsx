import React, { useState } from 'react';
import { X } from 'lucide-react';
import { User } from '../types';

interface ResetPasswordModalProps {
  user: User;
  onSave: (newPasswordHash: string) => void;
  onClose: () => void;
}

export function ResetPasswordModal({ user, onSave, onClose }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Both password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    onSave(newPassword);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-card-bg border border-app-border rounded-xl w-full max-w-[500px] shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-th-bg">
          <h2 className="text-lg font-bold text-main-fg">Reset Password</h2>
          <button onClick={onClose} className="text-icon-fg hover:text-heading-fg transition-colors p-1 rounded-lg hover:bg-hover-bg">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 text-sm font-medium p-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-label-fg mb-1.5">User</label>
            <div className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm font-medium text-main-fg">
              {user.fullName} ({user.username})
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-label-fg mb-1.5">New Password</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-label-fg mb-1.5">Confirm Password</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg"
            />
          </div>
          
          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-app-border">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-transparent border border-app-border text-label-fg font-medium rounded-lg hover:bg-hover-bg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
            >
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
