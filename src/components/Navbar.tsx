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
  CalendarDays,
  CalendarCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatRelativeTime } from '../utils/formatters';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    activeRoleView,
    users,
    isSoundEnabled,
    toggleSound,
    setIsLoginModalOpen,
    setIsStaffManagementOpen,
    shopName,
    isCloudSynced,
    customers,
    setIsCustomerDirectoryOpen,
    resetAllDataToCleanSlateHandler,
    resetToDemoData,
    setSelectedRO,
    repairOrders,
    lockWorkstation,
    staffLeaveEntries,
    setIsStaffCalendarOpen,
    appointments,
    setIsAppointmentCalendarOpen,
    roChangeAlertsList,
    unreadROChangesCount,
    clearROChangeAlert,
    clearAllROChangeAlerts,
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

  const todayAppointmentsCount = useMemo(() => {
    return (appointments || []).filter(a => a.appointmentDate === todayStr && a.status !== 'CANCELLED').length;
  }, [appointments, todayStr]);

  const [showROChangesMenu, setShowROChangesMenu] = useState(false);
  const roChangesRef = useRef<HTMLDivElement>(null);

  const handleROChangeClick = (roId: string) => {
    clearROChangeAlert(roId);
    setShowROChangesMenu(false);
    const targetRO = repairOrders.find(r => r.id === roId);
    if (targetRO) {
      setSelectedRO(targetRO);
    }
  };

  useEffect(() => {
    if (!showROChangesMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowROChangesMenu(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (roChangesRef.current && !roChangesRef.current.contains(e.target as Node)) {
        setShowROChangesMenu(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showROChangesMenu]);

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

        {/* Red Bell Icon for RO Changes (to the left of Shop Load) */}
        <div ref={roChangesRef} className="relative">
          <button
            id="navbar-ro-changes-bell-btn"
            type="button"
            onClick={() => setShowROChangesMenu(prev => !prev)}
            className={`relative p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
              unreadROChangesCount > 0
                ? 'bg-red-600/25 hover:bg-red-600/35 text-red-500 border-2 border-red-500 ring-2 ring-red-400/40 shadow-sm'
                : 'bg-slate-900/90 hover:bg-slate-700/80 text-red-400/70 hover:text-red-400 border border-slate-700/80'
            }`}
            title={
              unreadROChangesCount > 0
                ? `${unreadROChangesCount} RO update${unreadROChangesCount > 1 ? 's' : ''} on Service Advisor - Click to view ROs`
                : 'Service Advisor RO Updates (Click to view recently updated ROs)'
            }
          >
            <Bell className={`w-4 h-4 text-red-500 fill-red-500 ${unreadROChangesCount > 0 ? 'animate-bounce' : ''}`} />
            {unreadROChangesCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full text-[10px] font-black text-white bg-red-600 ring-2 ring-slate-800 animate-pulse">
                {unreadROChangesCount}
              </span>
            )}
          </button>

          {/* RO Changes Dropdown Menu listing RO numbers */}
          {showROChangesMenu && (
            <div
              id="ro-changes-dropdown-menu"
              className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border-2 border-slate-300 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-900 overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                    <Bell className="w-3.5 h-3.5 fill-red-600" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900">RO Updates & Changes</span>
                    <p className="text-[10px] text-slate-500">Service Advisor RO Activity</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {unreadROChangesCount > 0 && (
                    <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full uppercase shrink-0">
                      {unreadROChangesCount} New
                    </span>
                  )}
                  {unreadROChangesCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        clearAllROChangeAlerts();
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {roChangeAlertsList.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-bold text-slate-700">No Pending RO Changes</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] mx-auto">
                      When a change or update is made on a repair order, the RO number will be listed here with a red alert.
                    </p>
                  </div>
                ) : (
                  roChangeAlertsList.map(alert => (
                    <button
                      key={alert.roId}
                      type="button"
                      onClick={() => handleROChangeClick(alert.roId)}
                      className="w-full text-left p-3 hover:bg-blue-50/70 transition-colors flex items-start gap-3 group cursor-pointer border-l-4 border-red-500"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0 mt-1.5 animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-black text-sm text-blue-600 group-hover:text-blue-800">
                            RO #{alert.roNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatRelativeTime(alert.changedAt)}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                          {alert.changeSummary}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {alert.customerName} • {alert.vehicleDesc}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-blue-600 group-hover:underline shrink-0 mt-1 flex items-center gap-0.5">
                        Open RO →
                      </span>
                    </button>
                  ))
                )}
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

        {/* Appointments Calendar Button (Advisors & Service Manager) */}
        {(currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR') && (
          <button
            id="navbar-appointment-calendar-btn"
            onClick={() => setIsAppointmentCalendarOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer bg-purple-900/60 hover:bg-purple-800 text-purple-200 hover:text-white border border-purple-700 shadow-xs"
            title="Service Appointment Calendar (Customer Check-Ins, Waiters, Loaners)"
          >
            <CalendarCheck className="w-4 h-4 text-purple-300" />
            <span className="hidden sm:inline">Appointments</span>
            {todayAppointmentsCount > 0 && (
              <span className="bg-purple-700 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {todayAppointmentsCount}
              </span>
            )}
          </button>
        )}

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
