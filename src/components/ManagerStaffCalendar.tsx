import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  User, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Palmtree, 
  Thermometer, 
  Briefcase, 
  ShieldCheck, 
  Printer, 
  CalendarDays,
  ListFilter,
  Check,
  ChevronDown,
  Info,
  CalendarCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StaffLeaveEntry, StaffLeaveType, UserRole } from '../types';

interface ManagerStaffCalendarProps {
  asModal?: boolean;
  onClose?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LEAVE_TYPE_CONFIG: Record<StaffLeaveType, {
  label: string;
  shortLabel: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  pillBg: string;
  pillText: string;
  pillBorder: string;
  bannerBg: string;
}> = {
  VACATION: {
    label: 'On Vacation',
    shortLabel: 'Vacation',
    icon: '🌴',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-300',
    pillBg: 'bg-emerald-600',
    pillText: 'text-white',
    pillBorder: 'border-emerald-700',
    bannerBg: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  },
  SICK: {
    label: 'Out Sick',
    shortLabel: 'Sick',
    icon: '🤒',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-900',
    badgeBorder: 'border-rose-300',
    pillBg: 'bg-rose-600',
    pillText: 'text-white',
    pillBorder: 'border-rose-700',
    bannerBg: 'bg-rose-50 border-rose-300 text-rose-900',
  },
  LEFT_EARLY: {
    label: 'Left Early',
    shortLabel: 'Left Early',
    icon: '⏰',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-300',
    pillBg: 'bg-amber-500',
    pillText: 'text-slate-950',
    pillBorder: 'border-amber-600',
    bannerBg: 'bg-amber-50 border-amber-300 text-amber-900',
  },
  LATE_ARRIVAL: {
    label: 'Late Arrival',
    shortLabel: 'Late Arrival',
    icon: '⏱️',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-900',
    badgeBorder: 'border-purple-300',
    pillBg: 'bg-purple-600',
    pillText: 'text-white',
    pillBorder: 'border-purple-700',
    bannerBg: 'bg-purple-50 border-purple-300 text-purple-900',
  },
  PERSONAL: {
    label: 'Personal / Other',
    shortLabel: 'Personal',
    icon: '📋',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-900',
    badgeBorder: 'border-blue-300',
    pillBg: 'bg-blue-600',
    pillText: 'text-white',
    pillBorder: 'border-blue-700',
    bannerBg: 'bg-blue-50 border-blue-300 text-blue-900',
  },
};

const QUICK_TIME_CHIPS = [
  'Left at 11:30 AM',
  'Left at 12:00 PM (Lunch)',
  'Left at 1:00 PM',
  'Left at 1:30 PM',
  'Left at 2:00 PM',
  'Left at 2:30 PM',
  'Left at 3:00 PM',
  'Left at 3:30 PM',
  'Half Day PM',
  'Full Day',
  'Arriving at 10:00 AM',
  'Arriving at 11:00 AM'
];

const QUICK_REASON_CHIPS = [
  'Doctor Appointment',
  'Dentist Appointment',
  'Family Emergency',
  'Fever / Migraine / Flu',
  'Child Care / School',
  'Approved PTO',
  'Personal Matter',
  'Vehicle Repair'
];

export const ManagerStaffCalendar: React.FC<ManagerStaffCalendarProps> = ({ 
  asModal = false, 
  onClose 
}) => {
  const { 
    currentUser, 
    users, 
    staffLeaveEntries, 
    addStaffLeaveEntry, 
    updateStaffLeaveEntry, 
    deleteStaffLeaveEntry 
  } = useApp();

  const isManager = currentUser.role === 'SERVICE_MANAGER';

  // Navigation State
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed (0 = Jan, 8 = Sep)
  const [viewMode, setViewMode] = useState<'MONTH' | 'LIST'>('MONTH');

  // Filters
  const [filterUser, setFilterUser] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<StaffLeaveType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Day Inspector Modal
  const [inspectedDay, setInspectedDay] = useState<string | null>(null);

  // Add/Edit Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [formUserId, setFormUserId] = useState<string>('');
  const [formLeaveType, setFormLeaveType] = useState<StaffLeaveType>('LEFT_EARLY');
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formTimeDetails, setFormTimeDetails] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<{ id: string; name: string } | null>(null);

  // Active staff list (excluding deactivated)
  const activeStaff = useMemo(() => {
    return users.filter(u => !u.isDeactivated);
  }, [users]);

  // Today formatted as YYYY-MM-DD
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Entries active TODAY
  const entriesToday = useMemo(() => {
    return staffLeaveEntries.filter(e => {
      return todayStr >= e.startDate && todayStr <= e.endDate;
    });
  }, [staffLeaveEntries, todayStr]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return staffLeaveEntries.filter(entry => {
      if (filterUser !== 'ALL' && entry.userId !== filterUser) return false;
      if (filterType !== 'ALL' && entry.leaveType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = entry.userName.toLowerCase().includes(q);
        const matchNotes = (entry.notes || '').toLowerCase().includes(q);
        const matchTime = (entry.timeDetails || '').toLowerCase().includes(q);
        const matchRole = entry.userRole.toLowerCase().includes(q);
        if (!matchName && !matchNotes && !matchTime && !matchRole) return false;
      }
      return true;
    });
  }, [staffLeaveEntries, filterUser, filterType, searchQuery]);

  // Calendar Grid Days Calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday
    const daysInMonth = lastDayOfMonth.getDate();

    // Previous month filler days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const days: {
      date: Date;
      dateStr: string;
      isCurrentMonth: boolean;
      dayNumber: number;
    }[] = [];

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const dateObj = new Date(currentYear, currentMonth - 1, d);
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d).padStart(2, '0');
      days.push({
        date: dateObj,
        dateStr: `${dateObj.getFullYear()}-${m}-${dayNum}`,
        isCurrentMonth: false,
        dayNumber: d,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const m = String(currentMonth + 1).padStart(2, '0');
      const dayNum = String(d).padStart(2, '0');
      days.push({
        date: dateObj,
        dateStr: `${currentYear}-${m}-${dayNum}`,
        isCurrentMonth: true,
        dayNumber: d,
      });
    }

    // Next month filler days (fill up to 35 or 42 grid cells)
    const totalCells = days.length > 35 ? 42 : 35;
    const remainingDays = totalCells - days.length;
    for (let d = 1; d <= remainingDays; d++) {
      const dateObj = new Date(currentYear, currentMonth + 1, d);
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d).padStart(2, '0');
      days.push({
        date: dateObj,
        dateStr: `${dateObj.getFullYear()}-${m}-${dayNum}`,
        isCurrentMonth: false,
        dayNumber: d,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Map of date string -> entries on that date
  const dateEntriesMap = useMemo(() => {
    const map: Record<string, StaffLeaveEntry[]> = {};

    filteredEntries.forEach(entry => {
      // Find all days between entry.startDate and entry.endDate
      const start = new Date(entry.startDate + 'T00:00:00');
      const end = new Date(entry.endDate + 'T00:00:00');

      // Loop through dates
      const curr = new Date(start);
      while (curr <= end) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${d}`;
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push(entry);
        curr.setDate(curr.getDate() + 1);
      }
    });

    return map;
  }, [filteredEntries]);

  // Open Add modal with defaults
  const handleOpenAddModal = (presetType?: StaffLeaveType, defaultDate?: string) => {
    const targetDate = defaultDate || todayStr;
    setEditingEntryId(null);
    setFormUserId(activeStaff[0]?.id || '');
    setFormLeaveType(presetType || 'LEFT_EARLY');
    setFormStartDate(targetDate);
    setFormEndDate(targetDate);
    setFormTimeDetails(presetType === 'LEFT_EARLY' ? 'Left early at 1:30 PM' : presetType === 'SICK' ? 'Full Day Out Sick' : presetType === 'VACATION' ? 'Approved PTO' : '');
    setFormNotes('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Edit modal
  const handleOpenEditModal = (entry: StaffLeaveEntry) => {
    setEditingEntryId(entry.id);
    setFormUserId(entry.userId);
    setFormLeaveType(entry.leaveType);
    setFormStartDate(entry.startDate);
    setFormEndDate(entry.endDate);
    setFormTimeDetails(entry.timeDetails || '');
    setFormNotes(entry.notes || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Save Add/Edit
  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formUserId) {
      setFormError('Please select a staff member.');
      return;
    }
    if (!formStartDate) {
      setFormError('Please select a start date.');
      return;
    }
    const end = formEndDate || formStartDate;
    if (end < formStartDate) {
      setFormError('End date cannot be earlier than start date.');
      return;
    }

    const selectedUser = users.find(u => u.id === formUserId);
    if (!selectedUser) {
      setFormError('Selected staff member was not found.');
      return;
    }

    if (editingEntryId) {
      // Update existing
      updateStaffLeaveEntry(editingEntryId, {
        userId: selectedUser.id,
        userName: selectedUser.name,
        userRole: selectedUser.role,
        employeeNumber: selectedUser.employeeNumber,
        leaveType: formLeaveType,
        startDate: formStartDate,
        endDate: end,
        timeDetails: formTimeDetails.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
      setStatusFeedback(`Updated attendance record for ${selectedUser.name}`);
    } else {
      // Create new
      addStaffLeaveEntry({
        userId: selectedUser.id,
        userName: selectedUser.name,
        userRole: selectedUser.role,
        employeeNumber: selectedUser.employeeNumber,
        leaveType: formLeaveType,
        startDate: formStartDate,
        endDate: end,
        timeDetails: formTimeDetails.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
      setStatusFeedback(`Added ${LEAVE_TYPE_CONFIG[formLeaveType].label} record for ${selectedUser.name}`);
    }

    setIsFormOpen(false);
    setTimeout(() => setStatusFeedback(null), 3500);
  };

  // Delete
  const handleDeleteEntry = (id: string, name: string) => {
    setDeleteConfirmEntry({ id, name });
  };

  const confirmDelete = () => {
    if (deleteConfirmEntry) {
      deleteStaffLeaveEntry(deleteConfirmEntry.id);
      setStatusFeedback(`Removed leave record for ${deleteConfirmEntry.name}`);
      setDeleteConfirmEntry(null);
      setTimeout(() => setStatusFeedback(null), 3000);
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleGoToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Print schedule
  const handlePrint = () => {
    window.print();
  };

  // Security Gate: Service Manager only
  if (!isManager) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 bg-white rounded-2xl shadow-xl border-2 border-red-300 text-center space-y-4">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">
          Access Restricted: Service Manager Only
        </h2>
        <p className="text-sm text-slate-600">
          The Staff Attendance & Out-of-Office Calendar (tracking vacation, sick leave, and early departures) is restricted exclusively to the Service Manager.
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  const content = (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {statusFeedback && (
        <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusFeedback}</span>
        </div>
      )}

      {/* Main Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border-2 border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-purple-600/90 rounded-xl text-white shadow-md border border-purple-400/30 shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wider">
                Staff Attendance & Out-of-Office Calendar
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/40">
                Service Manager Only
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Log when technicians, advisors, and parts staff <strong>leave early</strong>, are <strong>on vacation</strong>, or are <strong>out sick</strong> to keep shop workflow, job dispatch, and payroll aligned.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => handleOpenAddModal('LEFT_EARLY')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="Quickly log staff leaving early today"
          >
            <span>⏰</span>
            <span>Log Left Early</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddModal('SICK')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="Log staff out sick today"
          >
            <span>🤒</span>
            <span>Log Out Sick</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddModal('VACATION')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="Schedule staff vacation"
          >
            <span>🌴</span>
            <span>Schedule Vacation</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5 ring-2 ring-blue-400/40 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Log Absence</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 transition-colors cursor-pointer"
            title="Print Attendance Calendar"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Today's Roll Call & Attendance Status Banner */}
      <div className="bg-white rounded-xl border-2 border-slate-300 p-3 sm:p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-blue-100 text-blue-700">
              <CalendarCheck className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Today's Staff Roll Call ({new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })})
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-slate-500">
              {activeStaff.length} Total Staff Active
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-700 font-extrabold">
              {entriesToday.length} Out / Absent Today
            </span>
          </div>
        </div>

        {entriesToday.length === 0 ? (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between text-xs text-emerald-900 font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Full Crew Present: All technicians, service advisors, and staff are active on site today!</span>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddModal('LEFT_EARLY')}
              className="text-[11px] underline text-emerald-700 hover:text-emerald-950 font-black cursor-pointer"
            >
              + Log someone leaving early?
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {entriesToday.map(entry => {
              const config = LEAVE_TYPE_CONFIG[entry.leaveType];
              return (
                <div 
                  key={entry.id}
                  className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 shadow-2xs ${config.bannerBg}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm">{config.icon}</span>
                      <span className="font-black text-slate-900 text-xs truncate">
                        {entry.userName}
                      </span>
                      {entry.employeeNumber && (
                        <span className="text-[10px] font-mono font-bold bg-white/70 px-1 rounded border border-slate-300 text-slate-700">
                          #{entry.employeeNumber}
                        </span>
                      )}
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.2 rounded border ${config.pillBg} ${config.pillText} ${config.pillBorder}`}>
                        {config.shortLabel}
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-slate-800 mt-1">
                      {entry.timeDetails || config.label}
                    </div>

                    {entry.notes && (
                      <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-1 italic">
                        "{entry.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(entry)}
                      className="p-1 rounded hover:bg-white/80 text-slate-700 transition-colors cursor-pointer"
                      title="Edit this record"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id, entry.userName)}
                      className="p-1 rounded hover:bg-white/80 text-rose-700 transition-colors cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter & Calendar Controls Toolbar */}
      <div className="bg-white rounded-xl border-2 border-slate-300 p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Month / Year Navigator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-300">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-md hover:bg-white text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-black text-xs sm:text-sm text-slate-900 min-w-[130px] text-center select-none">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-md hover:bg-white text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoToToday}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Search & Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff, notes..."
              className="pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 w-36 sm:w-44 font-semibold"
            />
          </div>

          {/* User selector filter */}
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="ALL">All Staff Members ({activeStaff.length})</option>
            {activeStaff.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role.replace('_', ' ')})
              </option>
            ))}
          </select>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="ALL">All Leave Types</option>
            <option value="LEFT_EARLY">⏰ Left Early</option>
            <option value="SICK">🤒 Out Sick</option>
            <option value="VACATION">🌴 On Vacation</option>
            <option value="LATE_ARRIVAL">⏱️ Late Arrival</option>
            <option value="PERSONAL">📋 Personal / Other</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-300">
            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'MONTH' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'LIST' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 List ({filteredEntries.length})
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. MONTH CALENDAR GRID VIEW */}
      {/* ============================================================== */}
      {viewMode === 'MONTH' && (
        <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden">
          {/* Day Headers (Sun - Sat) */}
          <div className="grid grid-cols-7 bg-slate-900 text-white text-xs font-black uppercase tracking-wider text-center border-b-2 border-slate-700">
            {DAY_NAMES.map((dayName, idx) => (
              <div 
                key={dayName} 
                className={`py-2.5 ${idx === 0 || idx === 6 ? 'bg-slate-950 text-slate-400' : ''}`}
              >
                <span>{dayName}</span>
              </div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 bg-slate-100 text-xs">
            {calendarDays.map((cell) => {
              const isToday = cell.dateStr === todayStr;
              const entriesOnDay = dateEntriesMap[cell.dateStr] || [];

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setInspectedDay(cell.dateStr)}
                  className={`min-h-[105px] sm:min-h-[120px] p-1.5 flex flex-col justify-between transition-colors cursor-pointer group hover:bg-blue-50/60 ${
                    cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
                  } ${isToday ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/30' : ''}`}
                >
                  {/* Cell Day Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black ${
                      isToday 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : cell.isCurrentMonth 
                        ? 'text-slate-900 group-hover:bg-slate-200' 
                        : 'text-slate-400'
                    }`}>
                      {cell.dayNumber}
                    </span>

                    {/* Quick Add indicator on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddModal('LEFT_EARLY', cell.dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-opacity"
                      title={`Add leave record for ${cell.dateStr}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Badges of staff members out on this day */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[80px]">
                    {entriesOnDay.map((entry) => {
                      const cfg = LEAVE_TYPE_CONFIG[entry.leaveType];
                      return (
                        <div
                          key={entry.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(entry);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border truncate flex items-center gap-1 shadow-2xs transition-all hover:scale-[1.02] ${cfg.pillBg} ${cfg.pillText} ${cfg.pillBorder}`}
                          title={`${entry.userName} - ${cfg.label} (${entry.timeDetails || ''}): ${entry.notes || 'No notes'}`}
                        >
                          <span className="shrink-0">{cfg.icon}</span>
                          <span className="truncate">{entry.userName}</span>
                          {entry.leaveType === 'LEFT_EARLY' && entry.timeDetails && (
                            <span className="text-[9px] opacity-90 shrink-0 font-normal">
                              ({entry.timeDetails.replace('Left early at ', '')})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Counter */}
                  {entriesOnDay.length > 0 && (
                    <div className="text-[9px] font-extrabold text-slate-500 text-right mt-1 pt-0.5 border-t border-slate-100">
                      {entriesOnDay.length} {entriesOnDay.length === 1 ? 'person out' : 'people out'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. LIST / AGENDA VIEW */}
      {/* ============================================================== */}
      {viewMode === 'LIST' && (
        <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden space-y-0">
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between text-xs font-black uppercase tracking-wider">
            <span>Staff Attendance & Leave Records ({filteredEntries.length})</span>
            <span className="text-[11px] font-normal text-slate-400 normal-case">
              Click any record to edit details or delete
            </span>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">No attendance or leave records found</div>
              <p className="text-xs text-slate-500">Try changing your filters or search terms, or click "+ Log Absence" to record one.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredEntries.map(entry => {
                const cfg = LEAVE_TYPE_CONFIG[entry.leaveType];
                const isSingleDay = entry.startDate === entry.endDate;

                return (
                  <div 
                    key={entry.id}
                    className="p-3 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`p-2.5 rounded-xl border text-xl shrink-0 ${cfg.badgeBg} ${cfg.badgeBorder}`}>
                        {cfg.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-sm">
                            {entry.userName}
                          </span>
                          {entry.employeeNumber && (
                            <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-300">
                              #{entry.employeeNumber}
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.2 rounded border border-slate-200">
                            {entry.userRole.replace('_', ' ')}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${cfg.pillBg} ${cfg.pillText} ${cfg.pillBorder}`}>
                            {cfg.label}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                            {isSingleDay ? entry.startDate : `${entry.startDate} to ${entry.endDate}`}
                          </span>

                          {entry.timeDetails && (
                            <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.2 rounded border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {entry.timeDetails}
                            </span>
                          )}
                        </div>

                        {entry.notes && (
                          <div className="mt-1.5 text-xs text-slate-700 pl-2.5 border-l-2 border-slate-400 italic">
                            "{entry.notes}"
                          </div>
                        )}

                        <div className="mt-1 text-[10px] text-slate-400">
                          Logged by {entry.createdByManagerName} on {new Date(entry.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(entry)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry.id, entry.userName)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DAY INSPECTOR MODAL (When clicking any calendar cell) */}
      {/* ============================================================== */}
      {inspectedDay && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto"
          onClick={() => setInspectedDay(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-slate-700 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b-2 border-slate-700">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-600 rounded-lg text-white">
                  <CalendarDays className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    {new Date(inspectedDay + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Day Schedule & Staff Out-of-Office Records
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedDay(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Entries for this day */}
              {(!dateEntriesMap[inspectedDay] || dateEntriesMap[inspectedDay].length === 0) ? (
                <div className="p-6 text-center text-slate-500 space-y-2 bg-slate-50 rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <div className="text-xs font-bold text-slate-700">
                    No staff absent or leaving early on this date
                  </div>
                  <p className="text-[11px] text-slate-500">
                    All technicians, advisors, and staff are scheduled as present.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dateEntriesMap[inspectedDay].map(entry => {
                    const cfg = LEAVE_TYPE_CONFIG[entry.leaveType];
                    return (
                      <div 
                        key={entry.id}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-2 shadow-2xs ${cfg.bannerBg}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-base">{cfg.icon}</span>
                            <span className="font-black text-slate-900 text-xs">
                              {entry.userName}
                            </span>
                            {entry.employeeNumber && (
                              <span className="text-[10px] font-mono font-bold bg-white px-1 rounded border border-slate-300">
                                #{entry.employeeNumber}
                              </span>
                            )}
                            <span className={`text-[10px] font-black uppercase px-2 py-0.2 rounded border ${cfg.pillBg} ${cfg.pillText} ${cfg.pillBorder}`}>
                              {cfg.label}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-slate-800 mt-1">
                            {entry.timeDetails || cfg.label}
                          </div>

                          {entry.startDate !== entry.endDate && (
                            <div className="text-[10px] font-semibold text-slate-600 mt-0.5">
                              Period: {entry.startDate} through {entry.endDate}
                            </div>
                          )}

                          {entry.notes && (
                            <p className="text-[11px] text-slate-700 italic mt-1 pl-2 border-l-2 border-slate-400">
                              "{entry.notes}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectedDay(null);
                              handleOpenEditModal(entry);
                            }}
                            className="p-1.5 rounded hover:bg-white/80 text-slate-700 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(entry.id, entry.userName)}
                            className="p-1.5 rounded hover:bg-white/80 text-rose-700 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action buttons inside Day Inspector */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setInspectedDay(null)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const day = inspectedDay;
                      setInspectedDay(null);
                      handleOpenAddModal('LEFT_EARLY', day);
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    ⏰ Log Left Early
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const day = inspectedDay;
                      setInspectedDay(null);
                      handleOpenAddModal('SICK', day);
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    🤒 Log Out Sick
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const day = inspectedDay;
                      setInspectedDay(null);
                      handleOpenAddModal(undefined, day);
                    }}
                    className="px-3.5 py-1.5 text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    + Add Leave
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. ADD / EDIT LEAVE MODAL DIALOG */}
      {/* ============================================================== */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto"
          onClick={() => setIsFormOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border-2 border-slate-700 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b-2 border-slate-700">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-purple-600 rounded-lg text-white">
                  <CalendarIcon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    {editingEntryId ? 'Edit Staff Absence / Out-of-Office Record' : 'Log Staff Absence / Out-of-Office Record'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Service Manager Schedule & Payroll Documentation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEntry} className="p-4 sm:p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Staff Member Selector */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Staff Member *
                </label>
                <select
                  value={formUserId}
                  onChange={(e) => setFormUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  required
                >
                  <option value="" disabled>-- Select Staff Member --</option>
                  {activeStaff.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.employeeNumber ? `(#${u.employeeNumber})` : ''} — {u.title || u.role.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Leave Category Selector */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Absence / Leave Type *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['LEFT_EARLY', 'SICK', 'VACATION', 'LATE_ARRIVAL', 'PERSONAL'] as StaffLeaveType[]).map((typeKey) => {
                    const cfg = LEAVE_TYPE_CONFIG[typeKey];
                    const isSelected = formLeaveType === typeKey;

                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => {
                          setFormLeaveType(typeKey);
                          if (typeKey === 'LEFT_EARLY' && !formTimeDetails) {
                            setFormTimeDetails('Left early at 1:30 PM');
                          } else if (typeKey === 'SICK' && !formTimeDetails) {
                            setFormTimeDetails('Full Day Out Sick');
                          } else if (typeKey === 'VACATION' && !formTimeDetails) {
                            setFormTimeDetails('Approved PTO');
                          }
                        }}
                        className={`p-2.5 rounded-lg border-2 text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? `${cfg.pillBg} ${cfg.pillText} ${cfg.pillBorder} shadow-sm ring-2 ring-purple-400 scale-[1.02]`
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-base">{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => {
                      setFormStartDate(e.target.value);
                      if (!formEndDate || formEndDate < e.target.value || formLeaveType === 'LEFT_EARLY' || formLeaveType === 'SICK') {
                        setFormEndDate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    End Date (For Vacation / Multi-Day)
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    min={formStartDate}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* 4. Time Details */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Time Details / Departure Time
                  </label>
                  <span className="text-[10px] text-slate-400">e.g. "Left at 1:30 PM"</span>
                </div>
                <input
                  type="text"
                  value={formTimeDetails}
                  onChange={(e) => setFormTimeDetails(e.target.value)}
                  placeholder="e.g. Left early at 1:30 PM, Half Day AM, Left at Lunch"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />

                {/* Quick Chips for Departure Time */}
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  <span className="text-[10px] font-bold text-slate-500">Quick suggestions:</span>
                  {QUICK_TIME_CHIPS.slice(0, 6).map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setFormTimeDetails(chip)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Notes / Reason */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Reason / Notes / Coverage Details
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Doctor appointment for knee. Covered by Dave Martinez on diagnostic tickets."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-semibold resize-none"
                />

                {/* Quick Chips for Common Reasons */}
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  <span className="text-[10px] font-bold text-slate-500">Quick reasons:</span>
                  {QUICK_REASON_CHIPS.map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setFormNotes(prev => prev ? `${prev} - ${chip}` : chip);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5 ring-2 ring-blue-400/40 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingEntryId ? 'Update Record' : 'Save Attendance Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. IN-APP DELETE CONFIRMATION MODAL */}
      {deleteConfirmEntry && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setDeleteConfirmEntry(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-red-300 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Remove Attendance Record?
                </h4>
                <p className="text-xs text-slate-500">
                  This action will permanently delete the absence record.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">Record for: </span>
              <span className="font-bold text-slate-900">{deleteConfirmEntry.name}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmEntry(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (asModal) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div 
          className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden border-2 border-slate-700 animate-in fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Close Header */}
          <div className="p-3 bg-slate-900 text-white flex items-center justify-between border-b-2 border-slate-700 shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-purple-600 rounded-lg text-white">
                <CalendarIcon className="w-4 h-4" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider">
                Service Manager Staff Calendar
              </span>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
};
