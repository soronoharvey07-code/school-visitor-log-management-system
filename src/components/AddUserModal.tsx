import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { User } from '../types';

interface AddUserModalProps {
  users: User[];
  onAdd: (user: Omit<User, 'id'>) => void;
  onClose: () => void;
}

export function AddUserModal({ users, onAdd, onClose }: AddUserModalProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Guard');
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

    if (!password.trim()) {
      setError('Password cannot be empty.');
      return;
    }

    const duplicateUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (duplicateUser) {
      setError('Username is already taken.');
      return;
    }

    onAdd({
      fullName: fullName.trim(),
      username: username.trim(),
      password: password.trim(),
      role: role,
      status: 'Active'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-card-bg border border-app-border rounded-xl w-full max-w-[500px] shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-th-bg">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-main-fg">Add New User</h2>
          </div>
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
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Security Personnel"
              className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-label-fg mb-1.5">Username</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Guard_2026"
              className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-label-fg mb-1.5">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-label-fg mb-1.5">Role</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="Guard">Guard</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-app-border rounded-lg text-sm font-medium text-label-fg hover:bg-hover-bg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              Add User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
