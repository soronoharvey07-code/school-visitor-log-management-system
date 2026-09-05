/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Shield, LayoutDashboard, UserPlus, Users, Calendar, BarChart2, Settings, LogOut, Eye, EyeOff, AlertCircle, Clock } from 'lucide-react';
import rhmcLogo from './assets/images/rhmc-logo.webp';
import { API } from './api';
import { DashboardView } from './components/views/DashboardView';
import { AdminView } from './components/views/AdminView';
import { RegisterView } from './components/views/RegisterView';
import { AllVisitorsView } from './components/views/AllVisitorsView';
import { EventView } from './components/views/EventView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';
import { EventRegistration } from './components/views/EventRegistration';
import { StatsRow } from './components/StatsRow';
import { User, AutoLogoutSettings } from './types';
import { consolidateVisitors } from './utils/visitorManager';
import { syncIdSequence } from './utils/idSequence';
import { formatManilaTime, formatManilaFullDate, parseToMs, parseOptionalToMs } from './utils/dateUtils';

type Tab = 'dashboard' | 'admin' | 'register' | 'visitors' | 'all-visitors' | 'event' | 'reports' | 'settings';

const initialUsers: User[] = [
  {
    id: '1',
    fullName: 'Admin',
    username: 'Admin2026',
    password: 'RHMC_2026',
    role: 'Admin',
    status: 'Active',
  },
  {
    id: '2',
    fullName: 'Security Personnel',
    username: 'Guard',
    password: '2026_RHMC',
    role: 'Guard',
    status: 'Active',
  }
];

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return true; // default to dark
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const [currentTab, setCurrentTab] = useState<Tab>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAutoLogoutModal, setShowAutoLogoutModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(15);
  const [showInvalidCredentialsModal, setShowInvalidCredentialsModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [time, setTime] = useState(new Date('2026-07-07T13:37:24'));
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('school-users');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.removeItem('school-current-user');
      return null;
    }
    const saved = localStorage.getItem('school-current-user');
    return saved ? JSON.parse(saved) : null;
  });

  // Login timestamp state (used strictly for non-inactivity session timer)
  const [loginTime, setLoginTime] = useState<number | null>(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const saved = localStorage.getItem('auth_login_time');
    if (saved) {
      const parsed = parseInt(saved, 10);
      return !isNaN(parsed) && parsed > 0 ? parsed : Date.now();
    }
    const now = Date.now();
    localStorage.setItem('auth_login_time', String(now));
    return now;
  });

  // Auto-Logout settings state
  const [autoLogoutSettings, setAutoLogoutSettings] = useState<AutoLogoutSettings>(() => {
    const saved = localStorage.getItem('auto_logout_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          enabled: Boolean(parsed.enabled),
          durationValue: Number(parsed.durationValue) || 30,
          durationUnit: parsed.durationUnit === 'hours' ? 'hours' : 'minutes',
          warningDurationValue: Number(parsed.warningDurationValue) || 30,
          warningDurationUnit: parsed.warningDurationUnit === 'minutes' ? 'minutes' : 'seconds'
        };
      } catch (e) {}
    }
    return { enabled: false, durationValue: 30, durationUnit: 'minutes', warningDurationValue: 30, warningDurationUnit: 'seconds' };
  });

  // Public Event Registration route check
  const params = new URLSearchParams(window.location.search);
  let eventIdParam = params.get('event');
  
  if (!eventIdParam && window.location.pathname.startsWith('/register/')) {
    eventIdParam = window.location.pathname.split('/register/')[1];
  }

  const [visitors, setVisitors] = useState<any[]>(() => {
    const saved = localStorage.getItem('school-visitor-log');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return consolidateVisitors(parsed);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('school-visitor-log', JSON.stringify(visitors));
  }, [visitors]);

  useEffect(() => {
    localStorage.setItem('school-users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('school-current-user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('school-current-user');
    }
  }, [currentUser]);

  useEffect(() => {
    const updateFromStorage = () => {
      const saved = localStorage.getItem('school-visitor-log');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const consolidated = consolidateVisitors(parsed);
          setVisitors(consolidated);
          syncIdSequence(consolidated);
        } catch (err) {}
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'school-visitor-log') {
        updateFromStorage();
      }
    };

    const handleDataCleared = () => {
      setVisitors([]);
      localStorage.removeItem('school-visitor-log');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('visitor-registered', updateFromStorage);
    window.addEventListener('data-cleared', handleDataCleared);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('visitor-registered', updateFromStorage);
      window.removeEventListener('data-cleared', handleDataCleared);
    };
  }, []);

  useEffect(() => {
    // For visual parity with the screenshots, keep the clock ticking
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  
  // Fetch and keep Auto-Logout settings up-to-date
  useEffect(() => {
    const syncAutoLogoutSettings = () => {
      API.getAutoLogoutSettings()
        .then((data) => {
          if (data) {
            const normalized: AutoLogoutSettings = {
              enabled: Boolean(data.enabled),
              durationValue: Number(data.durationValue) || 30,
              durationUnit: data.durationUnit === 'hours' ? 'hours' : 'minutes',
              warningDurationValue: Number(data.warningDurationValue) || 30,
              warningDurationUnit: data.warningDurationUnit === 'minutes' ? 'minutes' : 'seconds'
            };
            setAutoLogoutSettings(normalized);
            localStorage.setItem('auto_logout_settings', JSON.stringify(normalized));
          }
        })
        .catch(() => {
          const saved = localStorage.getItem('auto_logout_settings');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setAutoLogoutSettings({
                enabled: Boolean(parsed.enabled),
                durationValue: Number(parsed.durationValue) || 30,
                durationUnit: parsed.durationUnit === 'hours' ? 'hours' : 'minutes',
                warningDurationValue: Number(parsed.warningDurationValue) || 30,
                warningDurationUnit: parsed.warningDurationUnit === 'minutes' ? 'minutes' : 'seconds'
              });
            } catch (e) {}
          }
        });
    };

    if (currentUser) {
      syncAutoLogoutSettings();
    }

    const handleSettingsUpdated = (e: any) => {
      if (e.detail) {
        setAutoLogoutSettings(e.detail);
      } else {
        syncAutoLogoutSettings();
      }
    };

    window.addEventListener('auto-logout-updated', handleSettingsUpdated);
    return () => window.removeEventListener('auto-logout-updated', handleSettingsUpdated);
  }, [currentUser]);

  // Non-inactivity Automatic Logout Timer
  // The timer starts upon login and strictly measures duration from login timestamp.
  // It does NOT reset because of mouse, keyboard, touch, navigation, or other interactions.
  // The warning popup appears configured seconds/minutes BEFORE session expires.
  useEffect(() => {
    if (!currentUser || !autoLogoutSettings.enabled || !loginTime) {
      setShowWarningModal(false);
      return;
    }

    const durationMinutes = autoLogoutSettings.durationUnit === 'hours' 
      ? autoLogoutSettings.durationValue * 60 
      : autoLogoutSettings.durationValue;
    const durationMs = durationMinutes * 60 * 1000;

    const warningDurationSec = autoLogoutSettings.warningDurationUnit === 'minutes'
      ? (autoLogoutSettings.warningDurationValue || 30) * 60
      : (autoLogoutSettings.warningDurationValue || 30);
    const warningDurationMs = Math.min(warningDurationSec * 1000, Math.max(1000, durationMs - 1000));
    const warningThresholdMs = Math.max(0, durationMs - warningDurationMs);

    const checkExpiration = () => {
      const storedTimeStr = localStorage.getItem('auth_login_time');
      const effectiveStart = storedTimeStr ? parseInt(storedTimeStr, 10) : loginTime;
      if (!effectiveStart || isNaN(effectiveStart)) return;

      const elapsed = Date.now() - effectiveStart;

      if (elapsed >= durationMs) {
        // Exceeded total duration -> Automatically log out user and redirect to Login page
        API.logout().catch(() => {});
        localStorage.removeItem('token');
        localStorage.removeItem('school-current-user');
        localStorage.removeItem('auth_login_time');
        setCurrentUser(null);
        setLoginTime(null);
        setShowWarningModal(false);
        setIsMenuOpen(false);
        setShowLogoutModal(false);
        setShowAutoLogoutModal(true);
      } else if (elapsed >= warningThresholdMs) {
        // Within warning window before expiration -> show warning popup with real-time countdown
        setShowWarningModal(true);
        const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
        setWarningCountdown(remaining);
      } else {
        setShowWarningModal(false);
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 500);
    return () => clearInterval(interval);
  }, [currentUser, autoLogoutSettings, loginTime]);

  const handleKeepLoggedIn = () => {
    const newTimestamp = Date.now();
    localStorage.setItem('auth_login_time', String(newTimestamp));
    setLoginTime(newTimestamp);
    setShowWarningModal(false);
    const warningSec = autoLogoutSettings.warningDurationUnit === 'minutes'
      ? (autoLogoutSettings.warningDurationValue || 30) * 60
      : (autoLogoutSettings.warningDurationValue || 30);
    setWarningCountdown(warningSec);
  };

  const handleWarningLogout = () => {
    setShowWarningModal(false);
    handleLogout();
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = (formData.get('username') as string).trim();
    const password = (formData.get('password') as string).trim();
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setShowInvalidCredentialsModal(true);
        return;
      }
      localStorage.setItem('token', data.token);

      // Start new timer from this login
      const loginTimestamp = Date.now();
      localStorage.setItem('auth_login_time', String(loginTimestamp));
      setLoginTime(loginTimestamp);
      setShowAutoLogoutModal(false);

      setCurrentUser(data.user);
      
      const roleLower = (data.user?.role || '').toLowerCase();
      if (roleLower === 'admin' || roleLower === 'administrator') {
        setCurrentTab('admin');
      } else {
        setCurrentTab('dashboard');
      }
    } catch (err) {
      setShowInvalidCredentialsModal(true);
    }
  };

  const handleLogout = () => {
    API.logout().catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('school-current-user');
    localStorage.removeItem('auth_login_time');
    setLoginTime(null);
    setCurrentUser(null);
    setIsMenuOpen(false);
    setShowLogoutModal(false);
  };

  const handleLogoutRequest = () => {
    setIsMenuOpen(false);
    setShowLogoutModal(true);
  };


  const formatTime = (date: Date) => {
    return formatManilaTime(date);
  };

  const formatDate = (date: Date) => {
    return formatManilaFullDate(date);
  };

  const showStats = ['dashboard', 'register', 'visitors', 'all-visitors', 'reports'].includes(currentTab);

  const isAdmin = !currentUser || currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'administrator';

  const menuItems = [
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []),
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'register', label: 'Register', icon: UserPlus },
    { id: 'visitors', label: 'Visitors', icon: Users },
    { id: 'event', label: 'Event', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;


  useEffect(() => {
    if (!currentUser) return;

    if (isAdmin) {
      API.getUsers().then(data => {
        if (Array.isArray(data)) {
          const normalized = data.map((u: any) => {
            const uname = String(u.username || '');
            const unameLower = uname.toLowerCase();
            let fullName = u.fullName;
            if (!fullName) {
              if (unameLower === 'admin2026' || unameLower === 'admin') {
                fullName = 'Admin';
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
          setUsers(normalized);
        }
      }).catch(err => {
        console.warn('Unable to load users:', err);
      });
    }

    const fetchVisitors = () => {
      API.getVisitors().then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map((v: any) => {
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
          const consolidated = consolidateVisitors(mapped);
          setVisitors(consolidated);
          syncIdSequence(consolidated);
        }
      }).catch(err => {
        console.warn('Unable to load visitors:', err);
      });
    };

    fetchVisitors();
    const interval = setInterval(fetchVisitors, 4000);
    return () => clearInterval(interval);
  }, [currentUser, isAdmin]);

  // Protect the admin route
  useEffect(() => {
    if (!isAdmin && currentTab === 'admin') {
      setCurrentTab('dashboard');
    }
  }, [currentTab, isAdmin]);

  if (eventIdParam) {
    return <EventRegistration eventId={eventIdParam} />;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-app-bg font-sans flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-card-bg shadow-sm p-8 rounded-xl border border-app-border w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-20 h-20 mb-3 flex items-center justify-center overflow-hidden">
              <img src={rhmcLogo} alt="Rosemont Hills Montessori College Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-xl font-bold text-heading-fg">School Visitor Log Management System</h2>
            <p className="text-sm text-muted-fg font-medium mt-1">Rosemont Hills Montessori College</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-label-fg mb-1.5">Username</label>
              <input 
                name="username"
                type="text" 
                required
                placeholder="Enter admin or guard"
                className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-label-fg mb-1.5">Password</label>
              <div className="relative">
                <input 
                  name="password"
                  type={showPassword ? "text" : "password"} 
                  className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 pl-3 pr-10 text-sm text-main-fg focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-main-fg transition-colors p-1"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2 shadow-sm">
              Login
            </button>
          </div>
        </form>

        {/* Invalid Credentials Modal Popup */}
        {showInvalidCredentialsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card-bg border border-app-border rounded-xl shadow-2xl p-6 max-w-sm w-full text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle size={26} />
              </div>
              <h3 className="text-lg font-bold text-main-fg mb-2">Invalid Credentials</h3>
              <p className="text-sm text-muted-fg mb-6 font-medium">Username or password is incorrect. Please try again.</p>
              <button
                type="button"
                onClick={() => setShowInvalidCredentialsModal(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-sm"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Automatic Logout / Session Expired Modal */}
        {showAutoLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-card-bg border border-app-border rounded-xl shadow-2xl p-6 max-w-sm w-full text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400 mx-auto mb-4 flex items-center justify-center">
                <Clock size={26} />
              </div>
              <h3 className="text-lg font-bold text-main-fg mb-2">Session Expired</h3>
              <p className="text-sm text-muted-fg mb-6 font-medium">
                You have been automatically logged out because your session duration has expired. Please log in again to access the system.
              </p>
              <button
                type="button"
                onClick={() => setShowAutoLogoutModal(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-sm"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg font-sans text-main-fg">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8">
        
        {/* Header */}
        <header className="bg-card-bg rounded-xl border border-app-border shadow-sm px-6 py-4 mb-6 flex justify-between items-center relative">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center overflow-hidden">
              <img src={rhmcLogo} alt="Rosemont Hills Montessori College Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl sm:text-[22px] leading-tight font-bold text-heading-fg tracking-tight">School Visitor Log Management System</h1>
              <p className="text-sm text-muted-fg font-medium">Rosemont Hills Montessori College</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-right hidden sm:block">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 tracking-wider">{formatTime(time)}</div>
              <div className="text-[13px] text-muted-fg font-medium mt-0.5">{formatDate(time)}</div>
            </div>
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1 hover:bg-hover-bg rounded-lg transition-colors text-label-fg"
              >
                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
              
              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-3 w-[220px] bg-card-bg border border-app-border rounded-xl shadow-2xl py-2 z-50 overflow-hidden">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentTab(item.id as Tab);
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-5 py-3.5 text-[15px] font-medium transition-colors ${
                        currentTab === item.id 
                          ? 'bg-hover-bg text-blue-600 dark:text-blue-400 font-semibold' 
                          : 'text-label-fg hover:bg-hover-bg'
                      }`}
                    >
                      <item.icon size={18} className={currentTab === item.id ? 'text-blue-600 dark:text-blue-400' : 'text-icon-fg'} />
                      {item.label}
                    </button>
                  ))}
                  <div className="h-px bg-app-border my-2 mx-4"></div>
                  <button onClick={handleLogoutRequest} className="w-full flex items-center gap-3 px-5 py-3.5 text-[15px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors">
                    <LogOut size={18} className="text-red-600 dark:text-red-400" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {showStats && <StatsRow visitors={visitors} />}

        <main className="mb-10">
          {currentTab === 'dashboard' && <DashboardView visitors={visitors} setVisitors={setVisitors} />}
          {currentTab === 'admin' && <AdminView users={users} setUsers={setUsers} currentUser={currentUser} onLogout={handleLogout} />}
          {currentTab === 'register' && <RegisterView visitors={visitors} setVisitors={setVisitors} />}
          {(currentTab === 'visitors' || currentTab === 'all-visitors') && <AllVisitorsView visitors={visitors} setVisitors={setVisitors} />}
          {currentTab === 'event' && <EventView />}
          {currentTab === 'reports' && <ReportsView visitors={visitors} />}
          {currentTab === 'settings' && <SettingsView isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} userRole={currentUser.role} />}
        </main>
        
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-bg border border-app-border rounded-xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <LogOut size={20} />
              </div>
              <h3 className="text-lg font-bold text-main-fg">Logout Confirmation</h3>
            </div>
            <p className="text-sm text-muted-fg font-medium">
              Please save your data before logging out.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-app-border">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 border border-app-border hover:bg-hover-bg text-main-fg rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Expiration Warning Modal matching reference design */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#1b2333] border border-[#2d374d] rounded-2xl shadow-2xl max-w-[440px] w-full overflow-hidden animate-in zoom-in-95 duration-150 p-6 sm:p-7 text-center">
            {/* Centered orange clock icon */}
            <div className="w-14 h-14 rounded-full bg-[#252e42] border-2 border-[#d97706]/70 text-[#f59e0b] mx-auto flex items-center justify-center mb-5 shadow-inner">
              <Clock size={28} strokeWidth={2.3} className="text-[#f59e0b]" />
            </div>
            
            {/* Title & Countdown Message */}
            <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 tracking-tight">
              Your session is about to expire.
            </h3>
            <p className="text-sm text-slate-300 font-normal mb-5">
              You will be logged out in{' '}
              <span className="text-[#ef4444] font-semibold">
                {warningCountdown}
              </span>{' '}
              seconds.
            </p>

            {/* Horizontal Divider */}
            <div className="border-t border-[#2a344a] w-full my-5" />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3.5">
              <button
                type="button"
                id="warning-keep-logged-in-btn"
                onClick={handleKeepLoggedIn}
                className="w-full py-3 px-4 bg-[#3b82f6] hover:bg-[#2563eb] active:bg-[#1d4ed8] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              >
                Keep Logged In
              </button>
              <button
                type="button"
                id="warning-logout-btn"
                onClick={handleWarningLogout}
                className="w-full py-3 px-4 bg-[#182030] hover:bg-[#212b3e] active:bg-[#121927] border border-[#2b354d] text-[#f87171] hover:text-[#ef4444] rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
