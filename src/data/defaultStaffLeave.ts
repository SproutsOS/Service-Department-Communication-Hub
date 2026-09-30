import { StaffLeaveEntry } from '../types';

export function getInitialStaffLeaveEntries(): StaffLeaveEntry[] {
  const today = new Date();
  
  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatDateStr(today);

  // Yesterday
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = formatDateStr(yesterday);

  // Tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = formatDateStr(tomorrow);

  // Next week Monday to Wednesday
  const nextWeekMon = new Date(today);
  nextWeekMon.setDate(today.getDate() + 4);
  const nextWeekWed = new Date(nextWeekMon);
  nextWeekWed.setDate(nextWeekMon.getDate() + 2);

  return [
    {
      id: 'leave_demo_1',
      userId: 'usr_tech_1',
      userName: 'Mike Miller',
      userRole: 'TECHNICIAN',
      employeeNumber: '101',
      leaveType: 'LEFT_EARLY',
      startDate: todayStr,
      endDate: todayStr,
      timeDetails: 'Left early at 1:30 PM',
      notes: 'Doctor appointment for knee. Covered by Dave Martinez on RO diagnostics.',
      createdAt: new Date().toISOString(),
      createdByManagerId: 'usr_mgr_1',
      createdByManagerName: 'Service Manager',
    },
    {
      id: 'leave_demo_2',
      userId: 'usr_adv_1',
      userName: 'Sarah Connor',
      userRole: 'SERVICE_ADVISOR',
      employeeNumber: '102',
      leaveType: 'SICK',
      startDate: todayStr,
      endDate: todayStr,
      timeDetails: 'Full Day Out Sick',
      notes: 'Called in at 6:45 AM with severe migraine / fever. Expected back tomorrow.',
      createdAt: new Date().toISOString(),
      createdByManagerId: 'usr_mgr_1',
      createdByManagerName: 'Service Manager',
    },
    {
      id: 'leave_demo_3',
      userId: 'usr_tech_2',
      userName: 'Dave Martinez',
      userRole: 'TECHNICIAN',
      employeeNumber: '103',
      leaveType: 'VACATION',
      startDate: formatDateStr(nextWeekMon),
      endDate: formatDateStr(nextWeekWed),
      timeDetails: '3-Day Approved PTO',
      notes: 'Pre-scheduled annual family vacation. Approved by Service Manager.',
      createdAt: new Date().toISOString(),
      createdByManagerId: 'usr_mgr_1',
      createdByManagerName: 'Service Manager',
    },
    {
      id: 'leave_demo_4',
      userId: 'usr_parts_1',
      userName: 'Alex Rivera',
      userRole: 'PARTS_SPECIALIST',
      employeeNumber: '104',
      leaveType: 'LEFT_EARLY',
      startDate: yesterdayStr,
      endDate: yesterdayStr,
      timeDetails: 'Left early at 2:00 PM',
      notes: 'Family emergency / school pickup. All pending vendor orders finished prior to departure.',
      createdAt: new Date().toISOString(),
      createdByManagerId: 'usr_mgr_1',
      createdByManagerName: 'Service Manager',
    }
  ];
}
