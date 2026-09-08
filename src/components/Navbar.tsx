import React, { useState } from 'react';
import { 
  Wrench, 
  Bell, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Laptop, 
  Plus, 
  RotateCcw, 
  Trash2,
  Settings,
  ChevronDown, 
  AlertCircle,
  Clock,
  ShieldCheck,
  Users,
  Cloud,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatRelativeTime } from '../utils/formatters';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    users,
    notifications,
    isSoundEnabled,
    isMobileSimulated,
    pushPermission,
    toggleSound,
    setIsMobileSimulated,
    setIsNewROModalOpen,
    setIsLoginModalOpen,
    setIsStaffManagementOpen,
    setIsSetupWizardOpen,
    shopName,
    isCloudSynced,
    resetAllDataToCleanSlateHandler,
    resetToDemoData,
    requestPushPermission,
    setSelectedRO,
    repairOrders,
    markNotificationRead,
    markAllNotificationsRead,
  } = useApp();

  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const unreadUrgentCount = notifications.filter(n => !n.read && n.isUrgent).length;
  const unreadTotal = notifications.filter(n => !n.read).length;

  const canCreateRO = currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR';

  const handleNotificationClick = (roId: string, notifId: string) => {
    markNotificationRead(notifId);
    setShowNotifMenu(false);
    const targetRO = repairOrders.find(r => r.id === roId);
    if (targetRO) {
      setSelectedRO(targetRO);
    }
  };

  const getRoleBadge = () => {
    switch (currentUser.role) {
      case 'SERVICE_MANAGER':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Service Manager</span>;
      case 'SERVICE_ADVISOR':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Service Advisor</span>;
      case 'TECHNICIAN':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Technician</span>;
      case 'PARTS_SPECIALIST':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Parts Specialist</span>;
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
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-1.5">
            <span>{shopName || 'Precision Auto Care'}</span>
            <span className="text-blue-400 font-extrabold text-xs px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/80">Pro</span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/80 uppercase ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{isCloudSynced ? 'Cloud Synced' : 'Connecting Cloud...'}</span>
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Centralized Service Department & Repair Order Hub
          </p>
        </div>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2 sm:gap-4">

        {/* Urgent Alerts Pill (Matches Theme) */}
        {unreadUrgentCount > 0 ? (
          <div 
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="cursor-pointer relative flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse uppercase shadow-sm transition-colors"
            title="Urgent Alerts Requiring Immediate Attention"
          >
            <span className="mr-1">{unreadUrgentCount} Urgent Alert{unreadUrgentCount > 1 ? 's' : ''}</span>
          </div>
        ) : (
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
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
            className="absolute right-4 top-16 mt-1 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-900"
          >
            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">Urgent Shop Alerts</span>
                {unreadUrgentCount > 0 && (
                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                    {unreadUrgentCount} Urgent
                  </span>
                )}
              </div>
              {unreadTotal > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Mark all read
                </button>
              )}
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
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  No active alerts
                </div>
              ) : (
                notifications.map(notif => (
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
          </div>
        )}

        {/* Mobile View Toggle */}
        <button
          id="mobile-view-toggle-btn"
          onClick={() => setIsMobileSimulated(!isMobileSimulated)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            isMobileSimulated
              ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
              : 'bg-slate-700/80 text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white'
          }`}
          title="Toggle Tech Mobile Bay Handheld Simulator"
        >
          {isMobileSimulated ? (
            <>
              <Laptop className="w-3.5 h-3.5 text-white" />
              <span className="hidden lg:inline font-semibold">Desktop Mode</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden lg:inline font-semibold">Tech Mobile</span>
            </>
          )}
        </button>

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

        {/* Create RO Button (for Advisor & Manager) */}
        {canCreateRO && (
          <button
            id="create-ro-btn"
            onClick={() => setIsNewROModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Repair Order</span>
            <span className="sm:hidden">New RO</span>
          </button>
        )}

        {/* Staff & Employee Directory Button */}
        <button
          id="navbar-team-btn"
          onClick={() => setIsStaffManagementOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 transition-colors cursor-pointer"
          title="Manage Dealership Staff & Job Roles"
        >
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden md:inline">Staff ({users.length})</span>
        </button>

        {/* Active User Details (Matches Professional Polish Theme Header) */}
        <button
          id="user-profile-menu-btn"
          onClick={() => setIsLoginModalOpen(true)}
          className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-700/60 transition-colors cursor-pointer group"
          title="Switch User Role & Log In"
        >
          <div className="flex flex-col items-end hidden sm:flex text-right">
            <span className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
              {currentUser.name}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              {currentUser.role === 'SERVICE_MANAGER' && 'Service Manager'}
              {currentUser.role === 'SERVICE_ADVISOR' && 'Service Advisor'}
              {currentUser.role === 'TECHNICIAN' && 'Technician'}
              {currentUser.role === 'PARTS_SPECIALIST' && 'Parts Specialist'}
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-600 border-2 border-slate-500 group-hover:border-blue-400 text-white font-bold text-xs flex items-center justify-center transition-colors">
            {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </div>
        </button>

        {/* Re-run Setup Wizard */}
        <button
          id="navbar-setup-wizard-btn"
          onClick={() => setIsSetupWizardOpen(true)}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
          title="Open Initial Setup Wizard (Configure Shop & Roster)"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Wipe to Clean Slate Button */}
        <button
          id="clear-all-data-btn"
          onClick={() => {
            if (window.confirm('Wipe all sample tickets, employees, and notifications to start with a pure clean slate (0 tickets)?')) {
              resetAllDataToCleanSlateHandler();
            }
          }}
          className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 rounded-lg transition-colors"
          title="Wipe to Clean Slate (0 tickets, fresh shop setup)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

      </div>
    </header>
  );
};
