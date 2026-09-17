import React, { useState, useRef, useEffect } from 'react';
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
  Cloud,
  CheckCircle2,
  Lock,
  MessageSquare,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatRelativeTime } from '../utils/formatters';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    users,
    notifications,
    isSoundEnabled,
    pushPermission,
    toggleSound,
    setIsNewROModalOpen,
    setIsLoginModalOpen,
    setIsStaffManagementOpen,
    isChatBoxOpen,
    setIsChatBoxOpen,
    openShopChat,
    unreadShopCount,
    latestUnreadShopMessage,
    shopMessages,
    shopName,
    isCloudSynced,
    resetAllDataToCleanSlateHandler,
    resetToDemoData,
    requestPushPermission,
    setSelectedRO,
    repairOrders,
    markNotificationRead,
    lockWorkstation,
    markAllNotificationsRead,
  } = useApp();

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

  return (
    <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 sm:px-6 shadow-md shrink-0 sticky top-0 z-40">
      
      {/* Logo & Department Branding */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg text-white shadow-xs">
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-1.5">
            <span>{shopName || 'Woolwine CDJR'}</span>
            <span className="text-blue-400 font-extrabold text-xs px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/80">Pro</span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/80 uppercase ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{isCloudSynced ? 'Cloud Synced' : 'Connecting Cloud...'}</span>
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Service Department & Repair Order Hub
          </p>
        </div>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2 sm:gap-4">

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
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Close Urgent Alerts"
                    aria-label="Close Urgent Shop Alerts"
                  >
                    <X className="w-4 h-4" />
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

              {/* Drawer Footer with Close button */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px]">
                  {notifications.length} total alert{notifications.length === 1 ? '' : 's'}
                </span>
                <button
                  id="urgent-shop-alerts-footer-close-btn"
                  type="button"
                  onClick={() => setShowNotifMenu(false)}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Shop Team Chat Box Launcher */}
        <button
          id="navbar-shop-chat-btn"
          onClick={() => {
            if (isChatBoxOpen) {
              setIsChatBoxOpen(false);
            } else {
              openShopChat();
            }
          }}
          className={`relative p-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            isChatBoxOpen 
              ? 'bg-blue-600 text-white shadow-xs' 
              : unreadShopCount > 0
              ? 'bg-slate-800 text-white ring-2 ring-blue-400/80 shadow-md'
              : 'bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white'
          }`}
          title={
            latestUnreadShopMessage
              ? `New message from ${latestUnreadShopMessage.senderName}: "${latestUnreadShopMessage.content}" - Click to open chat`
              : 'Open Shop Team Chat'
          }
        >
          <MessageSquare className={`w-4 h-4 ${unreadShopCount > 0 ? 'text-amber-300 animate-bounce' : ''}`} />
          <span className="hidden md:inline text-xs font-semibold">Shop Chat</span>
          {unreadShopCount > 0 && (
            <>
              {latestUnreadShopMessage && (
                <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-bold text-amber-200 bg-amber-950/90 border border-amber-500/50 px-2 py-0.5 rounded-full max-w-[170px] truncate shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <span className="truncate">From: {latestUnreadShopMessage.senderName}</span>
                </span>
              )}
              <span className="flex h-4 min-w-[18px] px-1 items-center justify-center rounded-full text-[10px] font-extrabold text-white bg-red-600 shadow-sm animate-pulse">
                {unreadShopCount}
              </span>
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

        {/* Staff & Employee Directory Button (Service Manager Only) */}
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

        {/* Active User Details (Displays signed-in user name & role space) */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600/60 text-xs">
          <span className="font-semibold text-white">{currentUser.name}</span>
          {currentUser.employeeNumber && (
            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
              {currentUser.employeeNumber}
            </span>
          )}
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 uppercase">
            {currentUser.title || currentUser.role}
          </span>
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
