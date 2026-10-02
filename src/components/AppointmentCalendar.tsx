import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  CalendarDays, 
  Phone, 
  Mail, 
  Car, 
  Check, 
  ExternalLink, 
  FileText, 
  Key, 
  Coffee, 
  Bus, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ServiceAppointment, AppointmentStatus, TransportationType, UserRole } from '../types';

interface AppointmentCalendarProps {
  onBackToDashboard?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIME_SLOTS = [
  '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', 
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM'
];

const QUICK_SERVICE_CHIPS = [
  'Oil & Filter Service',
  'Tire Rotation & Balance',
  'Brake Inspection & Service',
  'Check Engine Light Diagnostics',
  'Multi-Point Courtesy Inspection',
  'Battery Test & Replacement',
  'Four-Wheel Computerized Alignment',
  'A/C & Heating Performance Check',
  'Factory Scheduled Maintenance',
  'Transmission Fluid Service',
  'State Safety & Emissions Inspection',
  'Recall Campaign / Software Flash'
];

const STATUS_CONFIG: Record<AppointmentStatus, {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotBg: string;
}> = {
  SCHEDULED: {
    label: 'Scheduled',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    dotBg: 'bg-slate-500',
  },
  CONFIRMED: {
    label: 'Confirmed',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-900',
    badgeBorder: 'border-blue-300',
    dotBg: 'bg-blue-600',
  },
  ARRIVED: {
    label: 'Arrived / Drive',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-300',
    dotBg: 'bg-amber-600',
  },
  CONVERTED_TO_RO: {
    label: 'RO Active',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-300',
    dotBg: 'bg-emerald-600',
  },
  COMPLETED: {
    label: 'Completed',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-900',
    badgeBorder: 'border-green-300',
    dotBg: 'bg-green-600',
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-900',
    badgeBorder: 'border-rose-300',
    dotBg: 'bg-rose-600',
  },
  NO_SHOW: {
    label: 'No-Show',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-900',
    badgeBorder: 'border-red-300',
    dotBg: 'bg-red-600',
  },
};

const TRANSPORT_CONFIG: Record<TransportationType, {
  label: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}> = {
  WAITER: {
    label: 'Waiter (Lounge)',
    icon: '☕',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-300',
  },
  DROP_OFF: {
    label: 'Drop-Off',
    icon: '🚗',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-900',
    badgeBorder: 'border-blue-300',
  },
  LOANER: {
    label: 'Loaner Vehicle',
    icon: '🔑',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-900',
    badgeBorder: 'border-purple-300',
  },
  SHUTTLE: {
    label: 'Shuttle Service',
    icon: '🚐',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-900',
    badgeBorder: 'border-teal-300',
  },
};

export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({ onBackToDashboard }) => {
  const { 
    currentUser, 
    users, 
    customers, 
    appointments, 
    addAppointment, 
    updateAppointment, 
    deleteAppointment, 
    clearAllAppointments,
    checkInAppointment, 
    convertAppointmentToRO, 
    repairOrders, 
    setSelectedRO,
    shopName
  } = useApp();

  const isManager = currentUser.role === 'SERVICE_MANAGER';
  const isAdvisor = currentUser.role === 'SERVICE_ADVISOR';

  // Navigation & View States
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'MONTH' | 'WEEK' | 'DAY' | 'AGENDA'>('MONTH');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [advisorFilter, setAdvisorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [transportFilter, setTransportFilter] = useState<string>('ALL');

  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<ServiceAppointment | null>(null);
  const [selectedDayInspectDate, setSelectedDayInspectDate] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form State for Booking / Editing
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formCustomerEmail, setFormCustomerEmail] = useState('');
  const [formVehicleYear, setFormVehicleYear] = useState<number | string>('');
  const [formVehicleMake, setFormVehicleMake] = useState('');
  const [formVehicleModel, setFormVehicleModel] = useState('');
  const [formVehicleVin, setFormVehicleVin] = useState('');
  const [formVehicleMileage, setFormVehicleMileage] = useState<number | string>('');
  const [formLicensePlate, setFormLicensePlate] = useState('');
  const [formAppointmentDate, setFormAppointmentDate] = useState('');
  const [formAppointmentTime, setFormAppointmentTime] = useState('');
  const [formDurationMinutes, setFormDurationMinutes] = useState<number>(45);
  const [formAdvisorId, setFormAdvisorId] = useState('');
  const [formPreferredTechId, setFormPreferredTechId] = useState('');
  const [formTransportationType, setFormTransportationType] = useState<TransportationType>('DROP_OFF');
  const [formConcerns, setFormConcerns] = useState<string[]>([]);
  const [formCustomConcernInput, setFormCustomConcernInput] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<AppointmentStatus>('SCHEDULED');
  const [formError, setFormError] = useState<string | null>(null);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Filtered Advisors / Service Writers
  const serviceWriters = useMemo(() => {
    return users.filter(u => (u.role === 'SERVICE_ADVISOR' || u.role === 'SERVICE_MANAGER') && !u.isDeactivated);
  }, [users]);

  // Technicians
  const technicians = useMemo(() => {
    return users.filter(u => u.role === 'TECHNICIAN' && !u.isDeactivated);
  }, [users]);

  // Format Helper YYYY-MM-DD
  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Top Metrics Calculation
  const metrics = useMemo(() => {
    const todayAppts = appointments.filter(a => a.appointmentDate === todayStr);
    const totalToday = todayAppts.length;
    const waitersToday = todayAppts.filter(a => a.transportationType === 'WAITER' && a.status !== 'CANCELLED').length;
    const loanersToday = todayAppts.filter(a => a.transportationType === 'LOANER' && a.status !== 'CANCELLED').length;
    const arrivedOrRO = todayAppts.filter(a => a.status === 'ARRIVED' || a.status === 'CONVERTED_TO_RO').length;
    const pendingConfirm = appointments.filter(a => (a.appointmentDate === todayStr || a.appointmentDate > todayStr) && a.status === 'SCHEDULED').length;

    return {
      totalToday,
      waitersToday,
      loanersToday,
      arrivedOrRO,
      pendingConfirm,
    };
  }, [appointments, todayStr]);

  // Filtered Appointments based on search and dropdown filters
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCustomer = appt.customerName.toLowerCase().includes(q);
        const matchPhone = appt.customerPhone.toLowerCase().includes(q);
        const matchVehicle = `${appt.vehicleYear} ${appt.vehicleMake} ${appt.vehicleModel}`.toLowerCase().includes(q);
        const matchVin = appt.vehicleVin?.toLowerCase().includes(q);
        const matchConcerns = appt.serviceConcerns.some(c => c.toLowerCase().includes(q));
        const matchNotes = appt.notes?.toLowerCase().includes(q);
        const matchRo = appt.createdRoId?.toLowerCase().includes(q);

        if (!matchCustomer && !matchPhone && !matchVehicle && !matchVin && !matchConcerns && !matchNotes && !matchRo) {
          return false;
        }
      }

      // Advisor Filter
      if (advisorFilter !== 'ALL' && appt.advisorId !== advisorFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL' && appt.status !== statusFilter) {
        return false;
      }

      // Transport Filter
      if (transportFilter !== 'ALL' && appt.transportationType !== transportFilter) {
        return false;
      }

      return true;
    });
  }, [appointments, searchQuery, advisorFilter, statusFilter, transportFilter]);

  // Map appointments by date for rapid calendar lookup
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, ServiceAppointment[]>();
    filteredAppointments.forEach(appt => {
      const existing = map.get(appt.appointmentDate) || [];
      existing.push(appt);
      map.set(appt.appointmentDate, existing);
    });
    // Sort each day's appointments by time
    map.forEach(list => {
      list.sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
    });
    return map;
  }, [filteredAppointments]);

  // Calendar Grid Days Calculation (Month View)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      appointments: ServiceAppointment[];
    }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonthDate = new Date(year, month - 1, d);
      const dateStr = formatDateStr(prevMonthDate);
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        appointments: appointmentsByDate.get(dateStr) || [],
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const currentMonthDate = new Date(year, month, d);
      const dateStr = formatDateStr(currentMonthDate);
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        appointments: appointmentsByDate.get(dateStr) || [],
      });
    }

    // Next month padding to fill out 35 or 42 grid cells
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonthDate = new Date(year, month + 1, d);
      const dateStr = formatDateStr(nextMonthDate);
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        appointments: appointmentsByDate.get(dateStr) || [],
      });
    }

    return cells;
  }, [currentDate, todayStr, appointmentsByDate]);

  // Week Days Calculation (Week View)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 = Sun
    const firstDayOfWeek = new Date(curr);
    firstDayOfWeek.setDate(curr.getDate() - dayOfWeek);

    const days: {
      date: Date;
      dateStr: string;
      dayName: string;
      dayNumber: number;
      isToday: boolean;
      appointments: ServiceAppointment[];
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(firstDayOfWeek);
      d.setDate(firstDayOfWeek.getDate() + i);
      const dateStr = formatDateStr(d);
      days.push({
        date: d,
        dateStr,
        dayName: DAY_NAMES[i],
        dayNumber: d.getDate(),
        isToday: dateStr === todayStr,
        appointments: appointmentsByDate.get(dateStr) || [],
      });
    }

    return days;
  }, [currentDate, todayStr, appointmentsByDate]);

  // Selected Day's Appointments (for Day View or Day Inspector Modal)
  const selectedDateStr = useMemo(() => {
    return formatDateStr(currentDate);
  }, [currentDate]);

  const selectedDayAppointments = useMemo(() => {
    const list = appointmentsByDate.get(selectedDayInspectDate || selectedDateStr) || [];
    return [...list].sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
  }, [appointmentsByDate, selectedDayInspectDate, selectedDateStr]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (viewMode === 'WEEK') {
      setCurrentDate(prev => {
        const next = new Date(prev);
        next.setDate(prev.getDate() - 7);
        return next;
      });
    } else if (viewMode === 'DAY') {
      setCurrentDate(prev => {
        const next = new Date(prev);
        next.setDate(prev.getDate() - 1);
        return next;
      });
    }
  };

  const handleNext = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (viewMode === 'WEEK') {
      setCurrentDate(prev => {
        const next = new Date(prev);
        next.setDate(prev.getDate() + 7);
        return next;
      });
    } else if (viewMode === 'DAY') {
      setCurrentDate(prev => {
        const next = new Date(prev);
        next.setDate(prev.getDate() + 1);
        return next;
      });
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open modal to book a new appointment (clears year, date, and time)
  const handleOpenBookModal = (targetDate?: string, targetTime?: string) => {
    setEditingAppointment(null);
    setFormCustomerName('');
    setFormCustomerPhone('');
    setFormCustomerEmail('');
    setFormVehicleYear('');
    setFormVehicleMake('');
    setFormVehicleModel('');
    setFormVehicleVin('');
    setFormVehicleMileage('');
    setFormLicensePlate('');
    setFormAppointmentDate('');
    setFormAppointmentTime('');
    setFormDurationMinutes(45);
    setFormAdvisorId(isAdvisor ? currentUser.id : (serviceWriters[0]?.id || currentUser.id));
    setFormPreferredTechId('');
    setFormTransportationType('DROP_OFF');
    setFormConcerns([]);
    setFormCustomConcernInput('');
    setFormNotes('');
    setFormStatus('SCHEDULED');
    setFormError(null);
    setIsBookModalOpen(true);
  };

  // Open modal to edit an existing appointment
  const handleOpenEditModal = (appt: ServiceAppointment) => {
    setEditingAppointment(appt);
    setFormCustomerName(appt.customerName);
    setFormCustomerPhone(appt.customerPhone);
    setFormCustomerEmail(appt.customerEmail || '');
    setFormVehicleYear(appt.vehicleYear);
    setFormVehicleMake(appt.vehicleMake);
    setFormVehicleModel(appt.vehicleModel);
    setFormVehicleVin(appt.vehicleVin || '');
    setFormVehicleMileage(appt.vehicleMileage || '');
    setFormLicensePlate(appt.licensePlate || '');
    setFormAppointmentDate(appt.appointmentDate);
    setFormAppointmentTime(appt.appointmentTime);
    setFormDurationMinutes(appt.durationMinutes || 45);
    setFormAdvisorId(appt.advisorId);
    setFormPreferredTechId(appt.preferredTechId || '');
    setFormTransportationType(appt.transportationType);
    setFormConcerns([...appt.serviceConcerns]);
    setFormCustomConcernInput('');
    setFormNotes(appt.notes || '');
    setFormStatus(appt.status);
    setFormError(null);
    setIsBookModalOpen(true);
  };

  // Save Booking / Editing
  const handleSaveAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCustomerName.trim()) {
      setFormError('Please enter customer name');
      return;
    }
    if (!formCustomerPhone.trim()) {
      setFormError('Please enter customer phone number');
      return;
    }
    if (!String(formVehicleYear).trim()) {
      setFormError('Please enter vehicle year');
      return;
    }
    if (!formVehicleMake.trim() || !formVehicleModel.trim()) {
      setFormError('Please enter vehicle make and model');
      return;
    }
    if (!formAppointmentDate.trim()) {
      setFormError('Please select an appointment date');
      return;
    }
    if (!formAppointmentTime.trim()) {
      setFormError('Please select an appointment time slot');
      return;
    }

    const assignedAdvisor = users.find(u => u.id === formAdvisorId) || currentUser;
    const assignedTech = users.find(u => u.id === formPreferredTechId);

    const concernsList = [...formConcerns];
    if (formCustomConcernInput.trim()) {
      concernsList.push(formCustomConcernInput.trim());
    }

    if (editingAppointment) {
      updateAppointment(editingAppointment.id, {
        customerName: formCustomerName.trim(),
        customerPhone: formCustomerPhone.trim(),
        customerEmail: formCustomerEmail.trim() || undefined,
        vehicleYear: formVehicleYear,
        vehicleMake: formVehicleMake.trim(),
        vehicleModel: formVehicleModel.trim(),
        vehicleVin: formVehicleVin.trim().toUpperCase() || undefined,
        vehicleMileage: formVehicleMileage || undefined,
        licensePlate: formLicensePlate.trim().toUpperCase() || undefined,
        appointmentDate: formAppointmentDate,
        appointmentTime: formAppointmentTime,
        durationMinutes: formDurationMinutes,
        advisorId: assignedAdvisor.id,
        advisorName: assignedAdvisor.name,
        preferredTechId: assignedTech?.id || undefined,
        preferredTechName: assignedTech?.name || undefined,
        transportationType: formTransportationType,
        serviceConcerns: concernsList.length > 0 ? concernsList : ['General Service Inspection'],
        notes: formNotes.trim() || undefined,
        status: formStatus,
      });
    } else {
      addAppointment({
        customerName: formCustomerName.trim(),
        customerPhone: formCustomerPhone.trim(),
        customerEmail: formCustomerEmail.trim() || undefined,
        vehicleYear: formVehicleYear,
        vehicleMake: formVehicleMake.trim(),
        vehicleModel: formVehicleModel.trim(),
        vehicleVin: formVehicleVin.trim().toUpperCase() || undefined,
        vehicleMileage: formVehicleMileage || undefined,
        licensePlate: formLicensePlate.trim().toUpperCase() || undefined,
        appointmentDate: formAppointmentDate,
        appointmentTime: formAppointmentTime,
        durationMinutes: formDurationMinutes,
        advisorId: assignedAdvisor.id,
        advisorName: assignedAdvisor.name,
        preferredTechId: assignedTech?.id || undefined,
        preferredTechName: assignedTech?.name || undefined,
        transportationType: formTransportationType,
        serviceConcerns: concernsList.length > 0 ? concernsList : ['General Service Inspection'],
        notes: formNotes.trim() || undefined,
        status: formStatus,
      });
    }

    setIsBookModalOpen(false);
    setEditingAppointment(null);
  };

  // Convert Appointment to Repair Order & Open
  const handleCheckInAndCreateRO = (appt: ServiceAppointment) => {
    const createdId = convertAppointmentToRO(appt.id);
    if (createdId) {
      if (selectedDayInspectDate) {
        setSelectedDayInspectDate(null);
      }
    }
  };

  // Delete Appointment
  const handleDeleteAppointment = (id: string, customerName: string) => {
    if (window.confirm(`Are you sure you want to delete the appointment for ${customerName}?`)) {
      deleteAppointment(id);
    }
  };

  // Clear All Appointments
  const handleClearAllAppointments = () => {
    if (appointments.length === 0) {
      alert('The appointment calendar is already empty.');
      return;
    }
    if (window.confirm(`Are you sure you want to clear all ${appointments.length} appointment(s) from the calendar? This will remove all scheduled appointments.`)) {
      clearAllAppointments();
      if (selectedDayInspectDate) {
        setSelectedDayInspectDate(null);
      }
    }
  };

  // Quick Customer Autocomplete helper
  const handleSelectExistingCustomer = (custName: string) => {
    const found = customers.find(c => c.name.toLowerCase() === custName.toLowerCase());
    if (found) {
      setFormCustomerName(found.name);
      setFormCustomerPhone(found.phone || formCustomerPhone);
      setFormCustomerEmail(found.email || formCustomerEmail);
      if (found.vehicles && found.vehicles.length > 0) {
        const v = found.vehicles[0];
        setFormVehicleYear(v.year || '');
        setFormVehicleMake(v.make || '');
        setFormVehicleModel(v.model || '');
        setFormVehicleVin(v.vin || '');
        setFormLicensePlate(v.licensePlate || '');
      }
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Service Appointment Calendar
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                  Advisors & Management
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Customer vehicle check-ins, scheduled services, waiters, and loaners.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-300"
            >
              Dashboard
            </button>
          )}

          {appointments.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllAppointments}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-rose-200 shadow-2xs flex items-center gap-1.5"
              title="Clear all scheduled appointments from the calendar"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear Appointments</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-300 shadow-2xs flex items-center gap-1.5"
            title="Print Today's Service Drive Schedule"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Print Schedule</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenBookModal()}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Empty State Banner when calendar has 0 appointments */}
      {appointments.length === 0 && (
        <div className="p-6 bg-gradient-to-r from-purple-50/70 via-slate-50 to-purple-50/70 border border-purple-200 rounded-xl text-center space-y-2 shadow-2xs">
          <CalendarDays className="w-9 h-9 text-purple-500 mx-auto" />
          <h3 className="text-sm font-black text-slate-900">Appointment Calendar Is Clear</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            There are currently no customer service appointments on the calendar. Click "Book Appointment" to schedule an upcoming vehicle visit.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => handleOpenBookModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Book First Appointment</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Metrics Snapshot Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Today's Schedule
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{metrics.totalToday}</span>
            <span className="text-xs text-slate-500 font-semibold">vehicles</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-amber-200 bg-amber-50/40 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider flex items-center gap-1">
            <span>☕ Waiters (Lounge)</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-900">{metrics.waitersToday}</span>
            <span className="text-xs text-amber-700 font-bold">priority</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-purple-200 bg-purple-50/40 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-purple-800 tracking-wider flex items-center gap-1">
            <span>🔑 Loaners Out</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-purple-900">{metrics.loanersToday}</span>
            <span className="text-xs text-purple-700 font-bold">fleet</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
            <span>✓ Checked-In / RO Active</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-900">{metrics.arrivedOrRO}</span>
            <span className="text-xs text-emerald-700 font-bold">in shop</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-blue-200 bg-blue-50/40 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-blue-800 tracking-wider flex items-center gap-1">
            <span>📞 Pending Confirmation</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-blue-900">{metrics.pendingConfirm}</span>
            <span className="text-xs text-blue-700 font-bold">upcoming</span>
          </div>
        </div>
      </div>

      {/* Calendar Toolbar: Navigation, Views, and Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold hover:bg-slate-200 text-slate-800 border-x border-slate-300 transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm sm:text-base font-extrabold text-slate-900 pl-1">
            {viewMode === 'MONTH' && `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            {viewMode === 'WEEK' && `Week of ${MONTH_NAMES[weekDays[0].date.getMonth()]} ${weekDays[0].dayNumber}, ${weekDays[0].date.getFullYear()}`}
            {viewMode === 'DAY' && `${DAY_NAMES[currentDate.getDay()]}, ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`}
            {viewMode === 'AGENDA' && 'All Scheduled Appointments'}
          </span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'MONTH'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('WEEK')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'WEEK'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode('DAY')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'DAY'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Day Slot
            </button>
            <button
              type="button"
              onClick={() => setViewMode('AGENDA')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'AGENDA'
                  ? 'bg-white text-purple-700 shadow-2xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, vehicle, VIN, concerns..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Advisor Filter */}
        <div>
          <select
            value={advisorFilter}
            onChange={(e) => setAdvisorFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Service Advisors</option>
            {serviceWriters.map(u => (
              <option key={u.id} value={u.id}>Advisor: {u.name}</option>
            ))}
          </select>
        </div>

        {/* Transportation Filter */}
        <div>
          <select
            value={transportFilter}
            onChange={(e) => setTransportFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Transportation Types</option>
            <option value="WAITER">☕ Waiters (Lounge)</option>
            <option value="DROP_OFF">🚗 Drop-Offs</option>
            <option value="LOANER">🔑 Loaner Vehicles</option>
            <option value="SHUTTLE">🚐 Shuttle Rides</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Appointment Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="ARRIVED">Arrived / Drive</option>
            <option value="CONVERTED_TO_RO">RO Active in Shop</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No-Show</option>
          </select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. MONTH VIEW */}
      {/* ======================================================== */}
      {viewMode === 'MONTH' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2 text-xs font-black text-slate-600 uppercase tracking-wider">
            {DAY_NAMES.map((name, i) => (
              <div key={name} className={i === 0 || i === 6 ? 'text-slate-400' : ''}>
                {name}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {calendarDays.map((cell) => {
              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDayInspectDate(cell.dateStr)}
                  className={`min-h-[105px] sm:min-h-[125px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                    cell.isCurrentMonth ? 'bg-white hover:bg-purple-50/30' : 'bg-slate-50/70 hover:bg-slate-100/70 opacity-60'
                  } ${cell.isToday ? 'ring-2 ring-purple-500 ring-inset bg-purple-50/20' : ''}`}
                >
                  {/* Cell Header: Day Number & Badge */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                      cell.isToday 
                        ? 'bg-purple-600 text-white shadow-2xs' 
                        : cell.isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                    }`}>
                      {cell.dayNumber}
                    </span>

                    {cell.appointments.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                        {cell.appointments.length}
                      </span>
                    )}
                  </div>

                  {/* Appointment Chips in Month Cell */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {cell.appointments.slice(0, 3).map((appt) => {
                      const tConfig = TRANSPORT_CONFIG[appt.transportationType];
                      const sConfig = STATUS_CONFIG[appt.status];

                      return (
                        <div
                          key={appt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDayInspectDate(cell.dateStr);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate border flex items-center gap-1 ${
                            appt.transportationType === 'WAITER'
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : appt.status === 'CONVERTED_TO_RO'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                          title={`${appt.appointmentTime} - ${appt.customerName} (${appt.vehicleYear} ${appt.vehicleMake} ${appt.vehicleModel})`}
                        >
                          <span className="shrink-0">{tConfig.icon}</span>
                          <span className="font-extrabold text-[9px] shrink-0">{appt.appointmentTime.split(' ')[0]}</span>
                          <span className="truncate">{appt.customerName.split(' ')[0]}</span>
                        </div>
                      );
                    })}

                    {cell.appointments.length > 3 && (
                      <div className="text-[9px] font-bold text-purple-700 pl-1">
                        +{cell.appointments.length - 3} more
                      </div>
                    )}
                  </div>

                  {/* Hover Quick Action */}
                  <div className="pt-1 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenBookModal(cell.dateStr);
                      }}
                      className="text-[9px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-0.5 bg-white px-1 py-0.5 rounded border border-purple-200 shadow-2xs"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Book</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. WEEK VIEW */}
      {/* ======================================================== */}
      {viewMode === 'WEEK' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            {weekDays.map((col) => (
              <div key={col.dateStr} className={`flex flex-col min-h-[450px] ${col.isToday ? 'bg-purple-50/20' : 'bg-white'}`}>
                {/* Column Header */}
                <div className={`p-2.5 border-b border-slate-200 text-center ${col.isToday ? 'bg-purple-100/50' : 'bg-slate-50'}`}>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{col.dayName}</div>
                  <div className="flex items-center justify-center gap-1.5 mt-0.5">
                    <span className={`text-base font-black ${col.isToday ? 'text-purple-800' : 'text-slate-900'}`}>
                      {col.dayNumber}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                      {col.appointments.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenBookModal(col.dateStr)}
                    className="mt-1.5 w-full py-1 bg-white hover:bg-purple-600 hover:text-white text-purple-700 text-[10px] font-bold rounded border border-purple-200 shadow-2xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Book</span>
                  </button>
                </div>

                {/* Appointments list for the day */}
                <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                  {col.appointments.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 font-medium">
                      No appointments
                    </div>
                  ) : (
                    col.appointments.map((appt) => {
                      const tConfig = TRANSPORT_CONFIG[appt.transportationType];
                      const sConfig = STATUS_CONFIG[appt.status];

                      return (
                        <div
                          key={appt.id}
                          className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5 hover:border-purple-300 transition-colors"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-black text-slate-900 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {appt.appointmentTime}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${tConfig.badgeBg} ${tConfig.badgeText} ${tConfig.badgeBorder}`}>
                              {tConfig.icon} {tConfig.label.split(' ')[0]}
                            </span>
                          </div>

                          <div className="text-xs font-extrabold text-slate-900 leading-tight">
                            {appt.customerName}
                          </div>

                          <div className="text-[11px] text-slate-600 leading-tight">
                            {appt.vehicleYear} {appt.vehicleMake} {appt.vehicleModel}
                          </div>

                          <div className="text-[10px] text-slate-500 line-clamp-1">
                            {appt.serviceConcerns.join(', ')}
                          </div>

                          <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${sConfig.badgeBg} ${sConfig.badgeText} ${sConfig.badgeBorder}`}>
                              {sConfig.label}
                            </span>

                            <div className="flex items-center gap-1">
                              {appt.status !== 'CONVERTED_TO_RO' ? (
                                <button
                                  type="button"
                                  onClick={() => handleCheckInAndCreateRO(appt)}
                                  className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-2xs hover:bg-emerald-700"
                                  title="Check-In & Create Active RO"
                                >
                                  Check In
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matchRO = repairOrders.find(r => r.id === appt.createdRoId);
                                    if (matchRO) setSelectedRO(matchRO);
                                  }}
                                  className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded border border-purple-300"
                                >
                                  {appt.createdRoId || 'View RO'}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(appt)}
                                className="p-0.5 text-slate-400 hover:text-slate-700"
                                title="Edit"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. DAY SCHEDULE (TIME SLOTS) */}
      {/* ======================================================== */}
      {viewMode === 'DAY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700">
              Hour-by-Hour Service Drive Schedule for <span className="font-extrabold text-slate-900">{selectedDateStr}</span>
            </div>
            <button
              type="button"
              onClick={() => handleOpenBookModal(selectedDateStr)}
              className="px-2.5 py-1 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Book Appointment</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {TIME_SLOTS.map((slot) => {
              const slotAppointments = selectedDayAppointments.filter(a => a.appointmentTime === slot);

              return (
                <div key={slot} className="flex flex-col sm:flex-row sm:items-start p-2.5 hover:bg-slate-50/60 transition-colors gap-3">
                  {/* Time label */}
                  <div className="w-24 shrink-0 font-extrabold text-xs text-slate-800 pt-1">
                    {slot}
                  </div>

                  {/* Appointments in this slot */}
                  <div className="flex-1 space-y-2">
                    {slotAppointments.length === 0 ? (
                      <div className="flex items-center justify-between text-xs text-slate-400 py-1">
                        <span>No vehicles booked</span>
                        <button
                          type="button"
                          onClick={() => handleOpenBookModal(selectedDateStr, slot)}
                          className="opacity-0 hover:opacity-100 text-[10px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Book Slot</span>
                        </button>
                      </div>
                    ) : (
                      slotAppointments.map((appt) => {
                        const tConfig = TRANSPORT_CONFIG[appt.transportationType];
                        const sConfig = STATUS_CONFIG[appt.status];

                        return (
                          <div
                            key={appt.id}
                            className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-slate-900 text-sm">{appt.customerName}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tConfig.badgeBg} ${tConfig.badgeText} ${tConfig.badgeBorder}`}>
                                  {tConfig.icon} {tConfig.label}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sConfig.badgeBg} ${sConfig.badgeText} ${sConfig.badgeBorder}`}>
                                  {sConfig.label}
                                </span>
                              </div>

                              <div className="text-xs text-slate-700 font-semibold flex items-center gap-2 flex-wrap">
                                <span>{appt.vehicleYear} {appt.vehicleMake} {appt.vehicleModel}</span>
                                {appt.vehicleVin && <span className="text-slate-400 font-mono text-[11px]">VIN: {appt.vehicleVin}</span>}
                                {appt.vehicleMileage && <span className="text-slate-500 text-[11px]">({appt.vehicleMileage} mi)</span>}
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-600 font-medium">Advisor: {appt.advisorName}</span>
                              </div>

                              <div className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-700">Service:</span>
                                {appt.serviceConcerns.map((c, i) => (
                                  <span key={i} className="bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded text-[10px] font-medium border border-slate-200">
                                    {c}
                                  </span>
                                ))}
                              </div>

                              {appt.notes && (
                                <div className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                                  <span className="font-bold">Note: </span>{appt.notes}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                              {appt.status !== 'CONVERTED_TO_RO' ? (
                                <button
                                  type="button"
                                  onClick={() => handleCheckInAndCreateRO(appt)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Check-In and create live Repair Order for shop dispatch"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Check-In & Create RO</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matchRO = repairOrders.find(r => r.id === appt.createdRoId);
                                    if (matchRO) setSelectedRO(matchRO);
                                  }}
                                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Open {appt.createdRoId}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(appt)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-300"
                                title="Edit Details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteAppointment(appt.id, appt.customerName)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-rose-200"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. AGENDA / LIST VIEW */}
      {/* ======================================================== */}
      {viewMode === 'AGENDA' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700">
              Showing <span className="font-extrabold text-slate-900">{filteredAppointments.length}</span> filtered appointments
            </div>
            <button
              type="button"
              onClick={() => handleOpenBookModal()}
              className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Book Appointment</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredAppointments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CalendarIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-600">No appointments found</p>
                <p className="text-xs text-slate-400 mt-1">Adjust your search or filter options, or book a new appointment.</p>
              </div>
            ) : (
              filteredAppointments.map((appt) => {
                const tConfig = TRANSPORT_CONFIG[appt.transportationType];
                const sConfig = STATUS_CONFIG[appt.status];

                return (
                  <div key={appt.id} className="p-3.5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-black text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-lg border border-purple-200">
                          {appt.appointmentDate} • {appt.appointmentTime}
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm">{appt.customerName}</span>
                        <span className="text-xs text-slate-500 font-medium">({appt.customerPhone})</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tConfig.badgeBg} ${tConfig.badgeText} ${tConfig.badgeBorder}`}>
                          {tConfig.icon} {tConfig.label}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sConfig.badgeBg} ${sConfig.badgeText} ${sConfig.badgeBorder}`}>
                          {sConfig.label}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 font-semibold flex items-center gap-2 flex-wrap">
                        <span>{appt.vehicleYear} {appt.vehicleMake} {appt.vehicleModel}</span>
                        {appt.vehicleVin && <span className="text-slate-400 font-mono text-[11px]">VIN: {appt.vehicleVin}</span>}
                        {appt.licensePlate && <span className="text-slate-500 text-[11px]">Tag: {appt.licensePlate}</span>}
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600 font-medium">Service Advisor: <span className="font-bold text-slate-800">{appt.advisorName}</span></span>
                      </div>

                      <div className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-700">Requested Work:</span>
                        {appt.serviceConcerns.map((c, i) => (
                          <span key={i} className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                            {c}
                          </span>
                        ))}
                      </div>

                      {appt.notes && (
                        <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 inline-block">
                          <span className="font-bold">Instructions: </span>{appt.notes}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {appt.status !== 'CONVERTED_TO_RO' ? (
                        <button
                          type="button"
                          onClick={() => handleCheckInAndCreateRO(appt)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Check-In & Create RO</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const matchRO = repairOrders.find(r => r.id === appt.createdRoId);
                            if (matchRO) setSelectedRO(matchRO);
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open {appt.createdRoId}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(appt)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-300"
                        title="Edit Details"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAppointment(appt.id, appt.customerName)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DAY INSPECTOR MODAL (When clicking any day in Month View) */}
      {/* ======================================================== */}
      {selectedDayInspectDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-purple-400" />
                  <span>Appointments for {selectedDayInspectDate}</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {selectedDayAppointments.length} vehicle(s) scheduled for check-in
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenBookModal(selectedDayInspectDate);
                  }}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Vehicle</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDayInspectDate(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {selectedDayAppointments.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">No appointments scheduled for this date</p>
                  <p className="text-xs text-slate-400">Click below to schedule a service visit.</p>
                  <button
                    type="button"
                    onClick={() => handleOpenBookModal(selectedDayInspectDate)}
                    className="mt-2 px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-xs"
                  >
                    + Book Appointment for {selectedDayInspectDate}
                  </button>
                </div>
              ) : (
                selectedDayAppointments.map((appt) => {
                  const tConfig = TRANSPORT_CONFIG[appt.transportationType];
                  const sConfig = STATUS_CONFIG[appt.status];

                  return (
                    <div
                      key={appt.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {appt.appointmentTime}
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm">{appt.customerName}</span>
                          <span className="text-xs text-slate-500">({appt.customerPhone})</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tConfig.badgeBg} ${tConfig.badgeText} ${tConfig.badgeBorder}`}>
                            {tConfig.icon} {tConfig.label}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sConfig.badgeBg} ${sConfig.badgeText} ${sConfig.badgeBorder}`}>
                            {sConfig.label}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-700 font-semibold flex items-center gap-2">
                        <span>{appt.vehicleYear} {appt.vehicleMake} {appt.vehicleModel}</span>
                        {appt.vehicleVin && <span className="text-slate-400 font-mono text-[11px]">VIN: {appt.vehicleVin}</span>}
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600 font-medium">Advisor: {appt.advisorName}</span>
                      </div>

                      <div className="text-xs text-slate-600 flex items-center gap-1 flex-wrap">
                        <span className="font-bold text-slate-700">Concerns:</span>
                        {appt.serviceConcerns.map((c, i) => (
                          <span key={i} className="bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded text-[10px] font-medium border border-slate-200">
                            {c}
                          </span>
                        ))}
                      </div>

                      {appt.notes && (
                        <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          <span className="font-bold">Note: </span>{appt.notes}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {appt.status !== 'CONVERTED_TO_RO' ? (
                            <button
                              type="button"
                              onClick={() => handleCheckInAndCreateRO(appt)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Check-In & Create RO</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const matchRO = repairOrders.find(r => r.id === appt.createdRoId);
                                if (matchRO) {
                                  setSelectedRO(matchRO);
                                  setSelectedDayInspectDate(null);
                                }
                              }}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open {appt.createdRoId}</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenEditModal(appt);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAppointment(appt.id, appt.customerName)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDayInspectDate(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BOOK / EDIT APPOINTMENT MODAL */}
      {/* ======================================================== */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-purple-400" />
                  <span>{editingAppointment ? 'Edit Service Appointment' : 'Book Customer Service Appointment'}</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Vehicle drop-off, waiter lounge, or loaner scheduling
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBookModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} className="p-4 overflow-y-auto space-y-4 flex-1">
              
              {/* Form validation alert */}
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-bold flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormError(null)}
                    className="text-rose-500 hover:text-rose-800 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Customer Info Section */}
              <div className="space-y-2">
                <div className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  1. Customer Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Customer Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      list="existing-customers-list"
                      required
                      value={formCustomerName}
                      onChange={(e) => {
                        setFormCustomerName(e.target.value);
                        handleSelectExistingCustomer(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="e.g. John Doe"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:border-purple-500 focus:outline-none"
                    />
                    <datalist id="existing-customers-list">
                      {customers.map(c => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formCustomerPhone}
                      onChange={(e) => {
                        setFormCustomerPhone(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="(555) 000-0000"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={formCustomerEmail}
                      onChange={(e) => setFormCustomerEmail(e.target.value)}
                      placeholder="customer@email.com"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Info Section */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  2. Vehicle Information
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Year <span className="text-rose-500">*</span>
                      </label>
                      {formVehicleYear !== '' && (
                        <button
                          type="button"
                          onClick={() => setFormVehicleYear('')}
                          className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                          title="Clear Year box"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      required
                      value={formVehicleYear}
                      onChange={(e) => {
                        setFormVehicleYear(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="e.g. 2024"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Make <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formVehicleMake}
                      onChange={(e) => {
                        setFormVehicleMake(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="e.g. Ford, Toyota"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Model <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formVehicleModel}
                      onChange={(e) => {
                        setFormVehicleModel(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="e.g. F-150, Camry"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Mileage (Optional)
                    </label>
                    <input
                      type="number"
                      value={formVehicleMileage}
                      onChange={(e) => setFormVehicleMileage(e.target.value)}
                      placeholder="e.g. 45000"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      VIN (17 Digits)
                    </label>
                    <input
                      type="text"
                      maxLength={17}
                      value={formVehicleVin}
                      onChange={(e) => setFormVehicleVin(e.target.value.toUpperCase())}
                      placeholder="1FTFW1ED..."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:bg-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      License Plate / Tag
                    </label>
                    <input
                      type="text"
                      value={formLicensePlate}
                      onChange={(e) => setFormLicensePlate(e.target.value.toUpperCase())}
                      placeholder="e.g. ABC-1234"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:bg-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule & Transportation Section */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    3. Timing & Transportation
                  </div>
                  {(formAppointmentDate || formAppointmentTime) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormAppointmentDate('');
                        setFormAppointmentTime('');
                      }}
                      className="text-[10px] text-slate-400 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Clear Appointment Date and Time"
                    >
                      <X className="w-3 h-3" />
                      <span>Clear Date & Time</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Appointment Date <span className="text-rose-500">*</span>
                      </label>
                      {formAppointmentDate !== '' && (
                        <button
                          type="button"
                          onClick={() => setFormAppointmentDate('')}
                          className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                          title="Clear Date"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      required
                      value={formAppointmentDate}
                      onChange={(e) => {
                        setFormAppointmentDate(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Time Slot <span className="text-rose-500">*</span>
                      </label>
                      {formAppointmentTime !== '' && (
                        <button
                          type="button"
                          onClick={() => setFormAppointmentTime('')}
                          className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                          title="Clear Time"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <select
                      required
                      value={formAppointmentTime}
                      onChange={(e) => {
                        setFormAppointmentTime(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">-- Select Time Slot --</option>
                      {TIME_SLOTS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Service Advisor <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formAdvisorId}
                      onChange={(e) => setFormAdvisorId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-purple-500 focus:outline-none"
                    >
                      {serviceWriters.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role === 'SERVICE_MANAGER' ? 'Manager' : 'Advisor'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Transportation selection pills */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Customer Transportation Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['DROP_OFF', 'WAITER', 'LOANER', 'SHUTTLE'] as TransportationType[]).map((type) => {
                      const tConfig = TRANSPORT_CONFIG[type];
                      const isSelected = formTransportationType === type;

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormTransportationType(type)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? `${tConfig.badgeBg} ${tConfig.badgeBorder} ring-2 ring-purple-600 shadow-2xs`
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{tConfig.icon}</span>
                            <span className="text-xs font-bold">{tConfig.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Service Concerns Section */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  4. Requested Service & Customer Concerns
                </div>

                {/* Quick Service Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SERVICE_CHIPS.map((chip) => {
                    const isAdded = formConcerns.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          if (isAdded) {
                            setFormConcerns(prev => prev.filter(c => c !== chip));
                          } else {
                            setFormConcerns(prev => [...prev, chip]);
                          }
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                          isAdded
                            ? 'bg-purple-600 text-white border-purple-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {isAdded ? '✓ ' : '+ '} {chip}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Concern Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={formCustomConcernInput}
                    onChange={(e) => setFormCustomConcernInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (formCustomConcernInput.trim()) {
                          setFormConcerns(prev => [...prev, formCustomConcernInput.trim()]);
                          setFormCustomConcernInput('');
                        }
                      }
                    }}
                    placeholder="Type specific customer complaint or diagnosis..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (formCustomConcernInput.trim()) {
                        setFormConcerns(prev => [...prev, formCustomConcernInput.trim()]);
                        setFormCustomConcernInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold rounded-lg border border-purple-300 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {/* Selected Concerns list */}
                {formConcerns.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {formConcerns.map((concern, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <span className="font-semibold text-slate-800">
                          {idx + 1}. {concern}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormConcerns(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Customer Notes */}
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Special Instructions / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Customer needs vehicle back by 4 PM, requested loaner car, drop off in key box..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                {/* Status Selector */}
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Initial Appointment Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AppointmentStatus)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CONFIRMED">Confirmed with Customer</option>
                    <option value="ARRIVED">Arrived / Customer at Drive</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="NO_SHOW">No-Show</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-lg shadow-md transition-all cursor-pointer"
                >
                  {editingAppointment ? 'Save Changes' : 'Confirm & Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. PRINT SCHEDULE MODAL / SHEET */}
      {/* ======================================================== */}
      {isPrintModalOpen && (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-2xs no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Controls */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-black">
                  Service Drive Daily Check-In Sheet ({selectedDateStr})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    document.body.classList.add('printing-appointment');
                    window.print();
                    setTimeout(() => {
                      document.body.classList.remove('printing-appointment');
                    }, 1000);
                  }}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Screen Preview Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{shopName || 'Precision Auto Service'}</h2>
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">Service Department • Daily Drive Appointment Log</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-slate-900">{selectedDateStr}</div>
                  <div className="text-xs text-slate-500 font-semibold">{selectedDayAppointments.length} Scheduled Appointments</div>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-black">
                    <th className="border border-slate-300 p-2 w-8 text-center">✓</th>
                    <th className="border border-slate-300 p-2 w-20">Time</th>
                    <th className="border border-slate-300 p-2">Customer & Phone</th>
                    <th className="border border-slate-300 p-2">Vehicle & VIN</th>
                    <th className="border border-slate-300 p-2 w-24">Type</th>
                    <th className="border border-slate-300 p-2">Requested Services / Concerns</th>
                    <th className="border border-slate-300 p-2 w-28">Advisor</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDayAppointments.map((appt) => {
                    const tConfig = TRANSPORT_CONFIG[appt.transportationType];
                    return (
                      <tr key={appt.id} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-2 text-center">
                          <input type="checkbox" className="rounded" defaultChecked={appt.status === 'ARRIVED' || appt.status === 'CONVERTED_TO_RO'} />
                        </td>
                        <td className="border border-slate-300 p-2 font-bold whitespace-nowrap">{appt.appointmentTime}</td>
                        <td className="border border-slate-300 p-2">
                          <div className="font-extrabold text-slate-900">{appt.customerName}</div>
                          <div className="text-[11px] text-slate-600">{appt.customerPhone}</div>
                        </td>
                        <td className="border border-slate-300 p-2">
                          <div className="font-bold text-slate-900">
                            {appt.vehicleYear ? `${appt.vehicleYear} ` : ''}{appt.vehicleMake} {appt.vehicleModel}
                          </div>
                          {appt.vehicleVin && <div className="text-[10px] text-slate-500 font-mono">{appt.vehicleVin}</div>}
                        </td>
                        <td className="border border-slate-300 p-2 font-bold">
                          {tConfig.icon} {tConfig.label.split(' ')[0]}
                        </td>
                        <td className="border border-slate-300 p-2">
                          <div className="font-medium text-slate-800">{appt.serviceConcerns.join(', ')}</div>
                          {appt.notes && <div className="text-[10px] text-amber-900 mt-0.5 italic">Note: {appt.notes}</div>}
                        </td>
                        <td className="border border-slate-300 p-2 font-bold text-slate-800">{appt.advisorName}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="pt-4 flex justify-between text-xs text-slate-500">
                <span>Precision Auto Dealership Management System</span>
                <span>{selectedDayAppointments.length} Total Appointments Scheduled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Standalone Printable Document for Service Drive Log */}
        {typeof document !== 'undefined' && createPortal(
          <div 
            id="printable-appointment-document"
            className="bg-white text-black max-w-4xl mx-auto space-y-4 font-sans text-xs"
          >
            {/* Header */}
            <div className="border-b-2 border-black pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-black tracking-tight text-black uppercase">
                    {shopName || 'Precision Dealership Service'}
                  </div>
                  <div className="text-xs font-black text-black tracking-wider uppercase mt-0.5">
                    SERVICE DRIVE DAILY APPOINTMENT & CHECK-IN LOG
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="inline-block px-3 py-1 bg-white text-black font-mono font-black text-sm rounded border-2 border-black">
                    DATE: {selectedDateStr}
                  </div>
                  <div className="text-[11px] text-black font-bold mt-1 font-mono">
                    Total Booked: {selectedDayAppointments.length} Appointments
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Roster Table */}
            <div className="appointment-print-section space-y-1">
              <table className="w-full text-left text-xs border-collapse border-2 border-black">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-black text-[10px] font-black uppercase">
                    <th className="border-r border-black p-1.5 w-8 text-center">✓</th>
                    <th className="border-r border-black p-1.5 w-20">Time</th>
                    <th className="border-r border-black p-1.5 w-36">Customer & Phone</th>
                    <th className="border-r border-black p-1.5 w-40">Vehicle & VIN</th>
                    <th className="border-r border-black p-1.5 w-20">Type</th>
                    <th className="border-r border-black p-1.5">Customer Requested Services / Concerns</th>
                    <th className="p-1.5 w-24">Advisor</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDayAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center italic font-bold">
                        No appointments booked for {selectedDateStr}.
                      </td>
                    </tr>
                  ) : (
                    selectedDayAppointments.map((appt, i) => (
                      <tr key={appt.id || i} className="border-b border-black/40">
                        <td className="border-r border-black/40 p-1.5 text-center font-mono">
                          [ &nbsp; ]
                        </td>
                        <td className="border-r border-black/40 p-1.5 font-mono font-black whitespace-nowrap">
                          {appt.appointmentTime}
                        </td>
                        <td className="border-r border-black/40 p-1.5">
                          <div className="font-black text-black">{appt.customerName}</div>
                          <div className="text-[10px] text-black font-mono font-bold">{appt.customerPhone}</div>
                        </td>
                        <td className="border-r border-black/40 p-1.5">
                          <div className="font-bold text-black">
                            {appt.vehicleYear ? `${appt.vehicleYear} ` : ''}{appt.vehicleMake} {appt.vehicleModel}
                          </div>
                          {appt.vehicleVin && <div className="text-[9px] font-mono text-black">VIN: {appt.vehicleVin}</div>}
                        </td>
                        <td className="border-r border-black/40 p-1.5 font-bold uppercase text-[10px]">
                          {appt.transportationType}
                        </td>
                        <td className="border-r border-black/40 p-1.5">
                          <div className="font-bold text-black">{appt.serviceConcerns.join(', ')}</div>
                          {appt.notes && <div className="text-[10px] italic mt-0.5">Note: {appt.notes}</div>}
                        </td>
                        <td className="p-1.5 font-bold text-black text-[11px]">
                          {appt.advisorName}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Verification Sign-Off Footer */}
            <div className="appointment-print-section pt-3 border-t-2 border-black flex justify-between items-center text-xs">
              <span className="font-bold">Drive Manager / Greeter Signature: ____________________________________</span>
              <span className="font-mono text-[10px]">Printed: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>,
          document.body
        )}
        </>
      )}

    </div>
  );
};
