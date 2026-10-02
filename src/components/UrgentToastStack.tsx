import React from 'react';
import { AlertTriangle, X, ArrowRight, Bell } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const UrgentToastStack: React.FC = () => {
  const { notifications, markNotificationRead, setSelectedRO, repairOrders } = useApp();

  // Show only unread urgent notifications, excluding parts requests completely
  const activeToasts = notifications.filter(n => {
    if (n.read || !n.isUrgent) return false;
    const isParts = n.type === 'PARTS_UPDATE' || 
                    n.targetRole === 'PARTS_SPECIALIST' || 
                    n.title.toLowerCase().includes('part') || 
                    n.message.toLowerCase().includes('part');
    if (isParts) return false;
    // Exclude shop chat alerts: chat has its own dedicated floating launcher & audio chime
    if (n.type === 'SHOP_CHAT') return false;
    return true;
  }).slice(0, 2);

  if (activeToasts.length === 0) return null;

  const handleToastClick = (roId: string, notifId: string) => {
    markNotificationRead(notifId);
    const ro = repairOrders.find(r => r.id === roId);
    if (ro) setSelectedRO(ro);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {activeToasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-900 text-white rounded-xl p-3.5 shadow-2xl border border-red-500/50 flex items-start justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200"
        >
          <div 
            onClick={() => handleToastClick(toast.roId, toast.id)}
            className="flex items-start gap-2.5 flex-1 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-red-600/30 text-red-400 flex items-center justify-center shrink-0 mt-0.5 border border-red-500/40">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                  Urgent Push Alert
                </span>
                <span className="text-xs font-black text-white">[{toast.roNumber}]</span>
              </div>
              <p className="text-xs font-bold text-slate-100 mt-0.5">{toast.title}</p>
              <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">{toast.message}</p>
            </div>
          </div>

          <button
            onClick={() => markNotificationRead(toast.id)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
