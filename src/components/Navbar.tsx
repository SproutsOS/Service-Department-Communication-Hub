import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Wrench, 
  Bell, 
  Volume2, 
  VolumeX, 
  Plus, 
  RotateCcw, 
  ChevronDown, 
  AlertCircle,
  Clock,
  ShieldCheck,
  Users,
  Search,
  Cloud,
  CheckCircle2,
  Lock,
  X,
  CalendarDays
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatRelativeTime } from '../utils/formatters';
import { UrgentNotification } from '../types';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    activeRoleView,
    users,
    notifications,
    isSoundEnabled,
    pushPermission,
    toggleSound,
    setIsLoginModalOpen,
    setIsStaffManagementOpen,
    shopName,
    isCloudSynced,
    customers,
    setIsCustomerDirectoryOpen,
    resetAllDataToCleanSlateHandler,
    resetToDemoData,
    requestPushPermission,
    setSelectedRO,
    repairOrders,
    markNotificationRead,
    lockWorkstation,
    markAllNotificationsRead,
    staffLeaveEntries,
    setIsStaffCalendarOpen,
  } = useApp();

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const todayAbsencesCount = useMemo(() => {
    return (staffLeaveEntries || []).filter(e => todayStr >= e.startDate && todayStr <= e.endDate).length;
  }, [staffLeaveEntries, todayStr]);

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showNotifMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifMenu(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifMenu]);

  const isTechScreen = activeRoleView === 'TECHNICIAN' || currentUser.role === 'TECHNICIAN';
  const isPartsScreen = activeRoleView === 'PARTS_SPECIALIST' || currentUser.role === 'PARTS_SPECIALIST';

  // Filter notifications so part requests only trigger Urgent Alert on the Parts screen, never on the Tech screen
  const isNotificationRelevant = (n: UrgentNotification) => {
    const isPartsRequest = n.type === 'PARTS_UPDATE' || 
      n.targetRole === 'PARTS_SPECIALIST' || 
      n.title.toLowerCase().includes('parts request') || 
      n.title.toLowerCase().includes('part request');

    // On the Tech screen: part requests do NOT need to say Urgent Alert at the top
    if (isTechScreen && isPartsRequest) {
      return false;
    }

    // Direct user targeting
    if (n.targetUserId && n.targetUserId !== currentUser.id) {
      return false;
    }

    // If targeted to a specific role other than the current screen
    if (n.targetRole) {
      if (n.targetRole === 'PARTS_SPECIALIST' && !isPartsScreen && currentUser.role !== 'SERVICE_MANAGER' && activeRoleView !== 'SERVICE_MANAGER') {
        return false;
      }
      if (n.targetRole === 'TECHNICIAN' && !isTechScreen && currentUser.role !== 'SERVICE_MANAGER' && activeRoleView !== 'SERVICE_MANAGER') {
        return false;
      }
    }

    return true;
  };

  const relevantNotifications = notifications.filter(isNotificationRelevant);
  const unreadUrgentCount = relevantNotifications.filter(n => !n.read && n.isUrgent).length;
  const unreadTotal = relevantNotifications.filter(n => !n.read).length;

  // Real-time capacity calculation
  const TOTAL_SHOP_CAPACITY = 12;
  const totalActive = repairOrders.filter(r => r.status !== 'COMPLETED').length;
  const inRepair = repairOrders.filter(r => r.status === 'IN_BAY' || r.status === 'IN_REPAIR').length;
  const efficiency = totalActive === 0 ? 0 : Math.min(Math.round(((inRepair + 2) / TOTAL_SHOP_CAPACITY) * 100), 100);

  const handleNotificationClick = (roId: string, notifId: string) => {
    markNotificationRead(notifId);
    setShowNotifMenu(false);
    const targetRO = repairOrders.find(r => r.id === roId);
    if (targetRO) {
      setSelectedRO(targetRO);
    }
  };

  return (
    <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 sm:px-6 shadow-md shrink-0 sticky top-0 z-40">
      
      {/* Logo & Department Branding */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg text-white shadow-xs">
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-1.5">
            <span>The HUB</span>
            <span className="text-blue-400 font-extrabold text-xs px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/80">Pro</span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/80 uppercase ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{isCloudSynced ? 'Cloud Synced' : 'Connecting Cloud...'}</span>
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
            Everything Moving. Everyone Connected
          </p>
        </div>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">

        {/* Shop Load Status Widget */}
        <div 
          className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 shadow-xs"
          title={`Shop Load Status: ${efficiency}% Capacity (${inRepair} active repairs)`}
        >
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Shop Load</span>
              <span className="text-slate-500 font-mono text-[9px]">Capacity</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-16 sm:w-20 bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${efficiency}%` }}
                />
              </div>
              <span className="text-[11px] font-black text-emerald-400 font-mono">
                {efficiency}%
              </span>
            </div>
          </div>
        </div>

        {/* Urgent Alerts Pill (Matches Theme) or Bell Button */}
        <div ref={notifRef} className="relative">
          {unreadUrgentCount > 0 ? (
            <button 
              id="navbar-urgent-alerts-btn"
              type="button"
              onClick={() => setShowNotifMenu(prev => !prev)}
              className="cursor-pointer relative flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse uppercase shadow-sm transition-colors"
              title="Urgent Alerts Requiring Immediate Attention"
            >
              <span className="mr-1">{unreadUrgentCount} Urgent Alert{unreadUrgentCount > 1 ? 's' : ''}</span>
            </button>
          ) : (
            <button
              id="navbar-notifications-btn"
              type="button"
              onClick={() => setShowNotifMenu(prev => !prev)}
              className="relative p-2 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Notifications & Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full text-[10px] font-bold text-white bg-blue-500 shadow-xs">
                  {unreadTotal}
                </span>
              )}
            </button>
          )}

          {/* Notification Drawer Popover */}
          {showNotifMenu && (
            <div 
              id="notifications-dropdown-menu"
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-900 overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-sm text-slate-900 truncate">Urgent Shop Alerts</span>
                  {unreadUrgentCount > 0 && (
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0">
                      {unreadUrgentCount} Urgent
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {unreadTotal > 0 && (
                    <button
                      id="urgent-shop-alerts-mark-read-btn"
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    id="urgent-shop-alerts-close-btn"
                    type="button"
                    onClick={() => setShowNotifMenu(false)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer shadow-2xs"
                    title="Close Urgent Alerts"
                    aria-label="Close Urgent Shop Alerts"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Close</span>
                  </button>
                </div>
              </div>

              {pushPermission !== 'granted' && (
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>Enable browser push alerts</span>
                  </div>
                  <button
                    onClick={requestPushPermission}
                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded"
                  >
                    Enable
                  </button>
                </div>
              )}

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {relevantNotifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">
                    No active alerts
                  </div>
                ) : (
                  relevantNotifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.roId, notif.id)}
                      className={`p-3 text-left cursor-pointer transition-colors hover:bg-slate-50 ${
                        !notif.read ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {notif.isUrgent && (
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                          )}
                          <span className="text-xs font-bold text-slate-900">{notif.roNumber}</span>
                          <span className="text-xs font-medium text-slate-600 truncate">{notif.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatRelativeTime(notif.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer with prominent Close button */}
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px] font-medium text-slate-600">
                  {relevantNotifications.length} total alert{relevantNotifications.length === 1 ? '' : 's'}
                </span>
                <button
                  id="urgent-shop-alerts-footer-close-btn"
                  type="button"
                  onClick={() => setShowNotifMenu(false)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-md text-xs transition-colors cursor-pointer border border-slate-300 flex items-center gap-1.5 shadow-2xs"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Close Alerts</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Audio Chime Toggle */}
        <button
          id="sound-chime-toggle-btn"
          onClick={toggleSound}
          className={`p-2 rounded-lg border transition-colors ${
            isSoundEnabled 
              ? 'bg-slate-700/80 text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white' 
              : 'bg-red-950/70 text-red-400 border-red-800'
          }`}
          title={isSoundEnabled ? "Notification sound active (Click to mute)" : "Muted (Click to enable audio alerts)"}
        >
          {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Customer Search Button */}
        <button
          id="navbar-customers-directory-btn"
          onClick={() => setIsCustomerDirectoryOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 shadow-xs"
          title="Customer Search (Look up customer profiles, phone numbers, vehicles, repair history & tax exemptions)"
        >
          <Search className="w-4 h-4 text-blue-400" />
          <span>Customer Search</span>
        </button>

        {/* Staff Directory Button (Service Manager Only) */}
        {currentUser.role === 'SERVICE_MANAGER' && (
          <button
            id="navbar-team-btn"
            onClick={() => setIsStaffManagementOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 transition-colors cursor-pointer"
            title="Manage Dealership Staff & Job Roles"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Staff ({users.length})</span>
          </button>
        )}

        {/* Active User Badge */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600/70 text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[11px] font-bold text-white truncate max-w-[120px]">{currentUser.name}</span>
            <span className="text-[9px] text-slate-400 truncate uppercase tracking-wider">{currentUser.title || currentUser.role.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Lock Terminal / Sign Out Button */}
        <button
          id="navbar-lock-station-btn"
          onClick={lockWorkstation}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-white border border-red-800/60 transition-colors cursor-pointer text-xs font-bold"
          title="Lock Workstation & Sign Out"
        >
          <Lock className="w-3.5 h-3.5 text-red-400" />
          <span className="hidden sm:inline">Lock Station</span>
        </button>

      </div>
    </header>
  );
};
