import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';

interface EditUserModalProps {
  user: User;
  users: User[];
  onSave: (updatedUser: User, newPassword?: string) => void;
  onClose: () => void;
}

export function EditUserModal({ user, users, onSave, onClose }: EditUserModalProps) {
  const [fullName, setFullName] = useState(user.fullName);
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const normalizeRole = (r?: string) => {
    const lower = (r || '').toLowerCase();
    return lower === 'admin' || lower === 'administrator' ? 'Administrator' : 'Guard';
  };
  const [role, setRole] = useState(normalizeRole(user.role));
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Full Name cannot be empty.');
      return;
    }
    
    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }

    const duplicateUser = users.find(u => u.username.trim().toLowerCase() === username.trim().toLowerCase() && String(u.id) !== String(user.id));
    if (duplicateUser) {
      setError('Username is already taken.');
      return;
    }

    const isCurrentAdmin = ['admin', 'administrator'].includes((user.role || '').toLowerCase());
    const isNewAdmin = ['admin', 'administrator'].includes(role.toLowerCase());
    if (isCurrentAdmin && !isNewAdmin) {
      const otherAdmins = users.filter(u => 
        ['admin', 'administrator'].includes((u.role || '').toLowerCase()) && 
        String(u.id) !== String(user.id)
      );
      if (otherAdmins.length === 0) {
        setError('Cannot change role: this is the last remaining Administrator account.');
        return;
      }
    }

    const trimmedPassword = password.trim();

    onSave(
      {
        ...user,
        fullName: fullName.trim(),
        username: username.trim(),
        role: role
      },
      trimmedPassword ? trimmedPassword : undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-card-bg border border-app-border rounded-xl w-full max-w-[500px] shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-th-bg">
          <h2 className="text-lg font-bold text-main-fg">Edit User</h2>
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
            <label className="block text-sm font-semibold text-label-fg mb-1.5">Full Name</label>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-label-fg mb-1.5">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="edit-user-password" className="block text-sm font-semibold text-label-fg">
                Password
              </label>
              <span className="text-xs text-muted-fg font-normal">
                (leave blank to keep current)
              </span>
            </div>
            <div className="relative">
              <input 
                id="edit-user-password"
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (or leave blank)"
                autoComplete="new-password"
                className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 pl-3 pr-10 text-sm text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg"
              />
              <button
                id="edit-user-password-toggle-btn"
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-fg hover:text-main-fg transition-colors p-1.5 rounded-md hover:bg-hover-bg cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-fg">
              Existing passwords are encrypted and cannot be displayed. Enter a new password only if you wish to change it.
            </p>
          </div>
          
          <div className="relative">
            <label className="block text-sm font-semibold text-label-fg mb-1.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 appearance-none font-medium"
            >
              <option value="Administrator">Administrator</option>
              <option value="Guard">Guard</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-[34px] flex items-center">
              <svg className="w-4 h-4 text-icon-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-app-border">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-transparent border border-app-border text-label-fg font-medium rounded-lg hover:bg-hover-bg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
