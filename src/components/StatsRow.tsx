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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-card-bg border border-app-border rounded-xl p-5 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Users size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-main-fg">{visitors.length}</h3>
          <p className="text-xs font-semibold text-muted-fg">Registered Visitors</p>
        </div>
      </div>
      
      <div className="bg-card-bg border border-app-border rounded-xl p-5 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Disc size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-main-fg">{currentlyInside}</h3>
          <p className="text-xs font-semibold text-muted-fg">Currently Inside</p>
        </div>
      </div>

      <div className="bg-card-bg border border-app-border rounded-xl p-5 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Calendar size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-main-fg">{visitorsToday}</h3>
          <p className="text-xs font-semibold text-muted-fg">Today's Visits</p>
        </div>
      </div>

      <div className="bg-card-bg border border-app-border rounded-xl p-5 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400">
          <Star size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-main-fg">{frequentVisitors}</h3>
          <p className="text-xs font-semibold text-muted-fg">Frequent Visitors</p>
        </div>
      </div>
    </div>
  );
}
