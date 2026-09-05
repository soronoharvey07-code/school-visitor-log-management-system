import React, { useState } from 'react';
import { Users, Shield, ShieldCheck, ShieldAlert, Eye, Edit2, Key, Power, Trash2, UserPlus, X } from 'lucide-react';
import { User } from '../../types';
import { UserDetailsModal } from '../UserDetailsModal';
import { EditUserModal } from '../EditUserModal';
import { ResetPasswordModal } from '../ResetPasswordModal';
import { AddUserModal } from '../AddUserModal';
import { API } from '../../api';

interface AdminViewProps {
  users?: User[];
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser?: User;
  onLogout?: () => void;
}

export function AdminView({ users = [], setUsers, currentUser, onLogout }: AdminViewProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<User | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdminRole = (role?: string) => {
    const r = (role || '').toLowerCase();
    return r === 'admin' || r === 'administrator';
  };

  const handleDeleteUser = (userToDelete: User) => {
    setNotification(null);
    const isSelf = String(currentUser?.id) === String(userToDelete.id) || 
      (currentUser?.username && userToDelete?.username && currentUser.username.toLowerCase() === userToDelete.username.toLowerCase());

    if (isSelf) {
      setNotification({ type: 'error', message: 'You cannot delete your own account.' });
      return;
    }

    if (isAdminRole(userToDelete.role)) {
      const remainingAdmins = users.filter(u => 
        isAdminRole(u.role) && 
        String(u.id) !== String(userToDelete.id) && 
        u.username?.toLowerCase() !== userToDelete.username?.toLowerCase()
      );
      if (remainingAdmins.length === 0) {
        setNotification({ type: 'error', message: 'At least one Admin account must remain in the system.' });
        return;
      }
    }

    setDeleteCandidate(userToDelete);
  };

  const confirmDeleteUser = async () => {
    if (!deleteCandidate) return;
    const targetUser = deleteCandidate;
    setDeleteCandidate(null);

    try {
      await API.deleteUser(targetUser.id);

      let freshUsers: User[] = [];
      try {
        const data = await API.getUsers();
        if (Array.isArray(data)) {
          freshUsers = data.map((u: any) => {
            const uname = String(u.username || '');
            const unameLower = uname.toLowerCase();
            let fullName = u.fullName;
            if (!fullName) {
              if (unameLower === 'admin2026' || unameLower === 'admin') {
                fullName = 'Administrator';
              } else if (unameLower === 'guard') {
                fullName = 'Security Personnel';
              } else {
                fullName = uname;
              }
            }
            let role = u.role;
            if (role === 'admin' || role === 'Administrator') {
              role = 'Admin';
            }
            let status = u.status;
            if (!status) {
              status = (u.active === 0 || u.active === false) ? 'Inactive' : 'Active';
            }
            return {
              ...u,
              id: String(u.id),
              fullName,
              role,
              status
            };
          });
        }
      } catch (err) {
        freshUsers = users.filter(u => String(u.id) !== String(targetUser.id));
      }

      const updatedUsers = freshUsers.length > 0 ? freshUsers : users.filter(u => String(u.id) !== String(targetUser.id));
      if (setUsers) {
        setUsers(updatedUsers);
      }
      localStorage.setItem('school-users', JSON.stringify(updatedUsers));

      setNotification({
        type: 'success',
        message: `User "${targetUser.fullName || targetUser.username}" deleted successfully.`
      });
    } catch (e: any) {
      console.error('API delete error:', e);
      setNotification({
        type: 'error',
        message: e.message || 'Failed to delete user account.'
      });
    }
  };

  const handleToggleStatus = async (user: User) => {
    setNotification(null);
    const isSelf = String(currentUser?.id) === String(user.id) || (currentUser?.username && user.username && currentUser.username.toLowerCase() === user.username.toLowerCase());

    if (isSelf && user.status === 'Active') {
      setNotification({ type: 'error', message: 'You cannot deactivate your own account.' });
      return;
    }

    if (user.status === 'Active' && isAdminRole(user.role)) {
      const activeAdmins = users.filter(u => isAdminRole(u.role) && u.status === 'Active' && String(u.id) !== String(user.id) && u.username?.toLowerCase() !== user.username?.toLowerCase());
      if (activeAdmins.length === 0) {
        setNotification({ type: 'error', message: 'At least one Admin account must remain Active.' });
        return;
      }
    }

    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const updatedUser = { ...user, status: newStatus as 'Active' | 'Inactive' };

    try {
      await API.updateUser(user.id, { active: newStatus === 'Active' ? 1 : 0 });
    } catch (e: any) {
      console.error('API update error:', e);
    }

    if (setUsers) {
      setUsers(prev => prev.map(u => String(u.id) === String(user.id) ? updatedUser : u));
      setNotification({
        type: 'success',
        message: newStatus === 'Active' ? 'User account has been activated successfully.' : 'User account has been deactivated successfully.'
      });
    }
  };

  const handleSaveUser = async (updatedUser: User, newPassword?: string) => {
    setNotification(null);
    try {
      await API.updateUser(updatedUser.id, {
        role: updatedUser.role === 'Admin' ? 'admin' : 'guard',
        active: updatedUser.status === 'Active' ? 1 : 0,
        ...(newPassword ? { password: newPassword } : {})
      });
    } catch (e: any) {
      console.error('API save user error:', e);
    }

    if (setUsers) {
      const finalUser = newPassword ? { ...updatedUser, password: newPassword } : updatedUser;
      setUsers(prev => prev.map(u => String(u.id) === String(finalUser.id) ? finalUser : u));
      setEditingUser(null);
      setNotification({ type: 'success', message: 'User information updated successfully.' });
    }
  };

  const handleAddUser = async (newUser: Omit<User, 'id'>) => {
    setNotification(null);
    let createdId = String(Date.now());
    try {
      const res = await API.createUser({
        username: newUser.username,
        password: newUser.password,
        role: newUser.role === 'Admin' ? 'admin' : 'guard'
      });
      if (res && res.id) {
        createdId = String(res.id);
      }
    } catch (e: any) {
      console.error('API create user error:', e);
    }

    const createdUser: User = {
      ...newUser,
      id: createdId
    };

    if (setUsers) {
      setUsers(prev => [...prev, createdUser]);
      setIsAddModalOpen(false);
      setNotification({ type: 'success', message: 'User added successfully.' });
    }
  };

  const handleResetPassword = async (newPasswordHash: string) => {
    setNotification(null);
    if (resetPasswordUser) {
      try {
        await API.updateUser(resetPasswordUser.id, { password: newPasswordHash });
      } catch (e: any) {
        console.error('API reset password error:', e);
      }

      if (setUsers) {
        const updatedUser = { ...resetPasswordUser, password: newPasswordHash };
        setUsers(prev => prev.map(u => String(u.id) === String(updatedUser.id) ? updatedUser : u));
        setResetPasswordUser(null);
        setNotification({ type: 'success', message: 'Password has been reset successfully.' });

        const isSelf = String(currentUser?.id) === String(resetPasswordUser.id) || (currentUser?.username && resetPasswordUser.username && currentUser.username.toLowerCase() === resetPasswordUser.username.toLowerCase());
        if (isSelf && onLogout) {
          onLogout();
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`p-4 rounded-xl text-sm flex items-center justify-between transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-2 font-medium">
            {notification.type === 'success' ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-muted-fg hover:text-main-fg">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="bg-card-bg rounded-xl border border-app-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-th-bg flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-main-fg">User Management</h2>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <UserPlus size={16} />
            Add User
          </button>
        </div>
        
        <div>
          <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-app-border text-xs font-semibold text-muted-fg uppercase tracking-wider bg-th-bg">
            <div>Name</div>
            <div>Role</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          
          <div className="divide-y divide-app-border">
            {users.map(user => {
              const isAdminRole = user.role === 'Administrator' || user.role === 'admin' || user.role === 'Admin';
              const uname = String(user.username || '');
              const unameLower = uname.toLowerCase();
              const name = user.fullName || (unameLower === 'admin2026' || unameLower === 'admin' ? 'Administrator' : unameLower === 'guard' ? 'Security Personnel' : uname);
              const status = user.status || ((user as any).active === 0 || (user as any).active === false ? 'Inactive' : 'Active');
              const roleDisplay = isAdminRole ? 'Admin' : user.role === 'guard' || user.role === 'Guard' ? 'Guard' : user.role;
              const normalizedUser: User = {
                ...user,
                fullName: name,
                status: status as 'Active' | 'Inactive',
                role: roleDisplay
              };

              return (
                <div key={user.id} className="grid grid-cols-4 gap-4 px-6 py-4 items-center hover:bg-hover-bg transition-colors">
                  <div className="text-sm text-main-fg font-semibold">{name}</div>
                  <div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${isAdminRole ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                      {roleDisplay}
                    </span>
                  </div>
                  <div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-icon-fg">
                    <button onClick={() => setSelectedUser(normalizedUser)} className="hover:text-main-fg transition-colors" title="View Details"><Eye size={16} /></button>
                    <button onClick={() => setEditingUser(normalizedUser)} className="hover:text-main-fg transition-colors" title="Edit User"><Edit2 size={16} /></button>
                    <button onClick={() => setResetPasswordUser(normalizedUser)} className="hover:text-main-fg transition-colors" title="Change Password"><Key size={16} /></button>
                    <button onClick={() => handleToggleStatus(normalizedUser)} className={status === 'Active' ? "text-yellow-600 dark:text-yellow-400/80 hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors" : "text-emerald-600 dark:text-emerald-400/80 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"} title={status === 'Active' ? "Deactivate" : "Activate"}><Power size={16} /></button>
                    <button onClick={() => handleDeleteUser(normalizedUser)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors" title="Delete User"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-app-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-th-bg">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-main-fg">Role Permissions</h2>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-app-bg border border-app-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-main-fg">Administrator</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-fg list-disc list-inside marker:text-slate-400 dark:marker:text-[#2a344a]">
              <li>Full access to all system features</li>
              <li>Can manage users, settings, visitors, reports, and event registration links</li>
            </ul>
          </div>
          <div className="bg-app-bg border border-app-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={18} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-semibold text-main-fg">Guard</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-fg list-disc list-inside marker:text-slate-400 dark:marker:text-[#2a344a]">
              <li>Register visitors</li>
              <li>View and search visitor records</li>
              <li>Check visitors in and out</li>
              <li>Cannot access User Management or Admin settings</li>
            </ul>
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <AddUserModal
          users={users}
          onAdd={handleAddUser}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {selectedUser && (
        <UserDetailsModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
        />
      )}

      {editingUser && (
        <EditUserModal 
          user={editingUser} 
          users={users}
          onSave={handleSaveUser}
          onClose={() => setEditingUser(null)} 
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onSave={handleResetPassword}
          onClose={() => setResetPasswordUser(null)}
        />
      )}

      {deleteCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-bg border border-app-border rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-main-fg">Delete User Account</h3>
                <p className="text-sm text-muted-fg">
                  Are you sure you want to permanently delete the account for{' '}
                  <strong className="text-main-fg font-medium">
                    {deleteCandidate.fullName || deleteCandidate.username}
                  </strong>
                  ? This action will permanently remove the account from the database and cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setDeleteCandidate(null)}
                  className="px-4 py-2 border border-app-border hover:bg-hover-bg text-main-fg rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteUser}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


