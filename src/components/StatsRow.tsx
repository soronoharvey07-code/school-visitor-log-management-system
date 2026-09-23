import React from 'react';
import { Users, Disc, Calendar, Star } from 'lucide-react';
import { Visitor } from '../types';
import { isSameManilaDay } from '../utils/dateUtils';

export function StatsRow({ visitors = [] }: { visitors?: Visitor[] }) {
  const visitorsToday = visitors.filter(v => {
    if (v.signInTime && isSameManilaDay(v.signInTime)) return true;
    if (Array.isArray(v.history) && v.history.some(h => h.signInTime && isSameManilaDay(h.signInTime))) return true;
    return false;
  }).length;
  const currentlyInside = visitors.filter(v => v.status === 'signed-in').length;
  const frequentVisitors = visitors.filter(v => (v.history ? v.history.length : 1) > 1).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-6">
      <div className="bg-card-bg border border-app-border rounded-xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm min-w-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
          <Users size={20} className="sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl sm:text-2xl font-bold text-main-fg truncate">{visitors.length}</h3>
          <p className="text-[11px] sm:text-xs font-semibold text-muted-fg leading-tight truncate">Registered Visitors</p>
        </div>
      </div>
      
      <div className="bg-card-bg border border-app-border rounded-xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm min-w-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <Disc size={20} className="sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl sm:text-2xl font-bold text-main-fg truncate">{currentlyInside}</h3>
          <p className="text-[11px] sm:text-xs font-semibold text-muted-fg leading-tight truncate">Currently Inside</p>
        </div>
      </div>

      <div className="bg-card-bg border border-app-border rounded-xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm min-w-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
          <Calendar size={20} className="sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl sm:text-2xl font-bold text-main-fg truncate">{visitorsToday}</h3>
          <p className="text-[11px] sm:text-xs font-semibold text-muted-fg leading-tight truncate">Today's Visits</p>
        </div>
      </div>

      <div className="bg-card-bg border border-app-border rounded-xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm min-w-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
          <Star size={20} className="sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl sm:text-2xl font-bold text-main-fg truncate">{frequentVisitors}</h3>
          <p className="text-[11px] sm:text-xs font-semibold text-muted-fg leading-tight truncate">Frequent Visitors</p>
        </div>
      </div>
    </div>
  );
}
