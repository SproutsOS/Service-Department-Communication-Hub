import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Trash2, 
  Edit2, 
  Phone, 
  KeyRound,
  Bookmark,
  ShieldAlert,
  AlertOctagon,
  Clock,
  Calendar,
  Car,
  Tag,
  CheckCircle2,
  AlertTriangle,
  PhoneCall,
  Printer,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowUpDown,
  Filter,
  CheckCheck,
  Layers,
  List,
  RotateCcw,
  Hash,
  PhoneForwarded
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RecallWaitingEntry } from '../types';

interface RecallGroupData {
  recallCode: string;
  commonPartNumber?: string;
  commonNotes?: string;
  totalCount: number;
  waitingCount: number;
  arrivedCount: number;
  needsCallCount: number;
  oldestDate?: string;
  oldestDaysWaiting: number;
  entries: RecallWaitingEntry[];
}

export const RecallWaitingModal: React.FC = () => {
  const {
    isRecallWaitingModalOpen,
    closeRecallWaitingModal,
    recallWaitingList,
    addRecallWaitingEntry,
    updateRecallWaitingEntry,
    deleteRecallWaitingEntry,
    markRecallCustomerCalled,
    specialParts,
    importantNumbers,
    managerPasswords,
    openSpecialPartsModal,
    openImportantNumbersModal,
    openManagerPasswordsModal,
    openInternalExtensionModal,
    internalExtensions
  } = useApp();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WAITING' | 'ARRIVED' | 'NEEDS_CALL' | 'CALLED'>('ALL');
  // Dedicated Recall Number Pull & Filter
  const [selectedRecallFilter, setSelectedRecallFilter] = useState<string>('ALL');
  // Grouping Mode: 'SEPARATED_BY_RECALL' (distinct recall containers) or 'UNIFIED' (single chronological list)
  const [viewGroupingMode, setViewGroupingMode] = useState<'SEPARATED_BY_RECALL' | 'UNIFIED'>('SEPARATED_BY_RECALL');
  // Collapsed state for individual recall sections
  const [collapsedRecalls, setCollapsedRecalls] = useState<Record<string, boolean>>({});

  // Add Form Modal/Drawer State
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  // New Entry Form State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [customerName, setCustomerName] = useState('');
  const [vin, setVin] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [recallNumber, setRecallNumber] = useState('');
  const [datePutOnList, setDatePutOnList] = useState(todayStr);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateCalled, setDateCalled] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editVin, setEditVin] = useState('');
  const [editPartNumber, setEditPartNumber] = useState('');
  const [editRecallNumber, setEditRecallNumber] = useState('');
  const [editDatePutOnList, setEditDatePutOnList] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editDateCalled, setEditDateCalled] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<'WAITING_ON_PART' | 'PART_ARRIVED' | 'SCHEDULED' | 'COMPLETED'>('WAITING_ON_PART');

  // Copied indicator
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // Inline delete confirmation state (prevents window.confirm blocking in iframe)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Helper to calculate days waiting
  const getDaysWaiting = (dateStr?: string) => {
    if (!dateStr) return 0;
    try {
      const target = new Date(dateStr).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - target) / (1000 * 60 * 60 * 24)));
      return isNaN(diff) ? 0 : diff;
    } catch {
      return 0;
    }
  };

  // Format date helper
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      const parsed = new Date(dateStr);
      return !isNaN(parsed.getTime()) 
        ? parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : dateStr;
    } catch {
      return dateStr;
    }
  };

  const handleCopy = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(prev => prev === key ? null : prev), 2000);
    } catch (err) {
      console.warn('Failed to copy:', err);
    }
  };

  const handleSwitchTab = (tab: 'parts' | 'numbers' | 'passwords' | 'recalls' | 'extensions') => {
    if (tab === 'parts') {
      closeRecallWaitingModal();
      openSpecialPartsModal();
    } else if (tab === 'numbers') {
      closeRecallWaitingModal();
      openImportantNumbersModal();
    } else if (tab === 'passwords') {
      closeRecallWaitingModal();
      openManagerPasswordsModal();
    } else if (tab === 'extensions') {
      closeRecallWaitingModal();
      openInternalExtensionModal();
    }
  };

  // Extract all distinct Recall Numbers for the quick pull bar and quick-pick chips
  const distinctRecallList = useMemo(() => {
    const map = new Map<string, { count: number; waitingCount: number; arrivedCount: number; commonPart?: string }>();
    recallWaitingList.forEach(item => {
      const rec = (item.recallNumber || item.campaignCode || 'UNASSIGNED').trim().toUpperCase();
      const current = map.get(rec) || { count: 0, waitingCount: 0, arrivedCount: 0, commonPart: item.partNumber };
      current.count += 1;
      if (item.status === 'PART_ARRIVED') {
        current.arrivedCount += 1;
      } else {
        current.waitingCount += 1;
      }
      if (!current.commonPart && item.partNumber) {
        current.commonPart = item.partNumber;
      }
      map.set(rec, current);
    });

    return Array.from(map.entries())
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  }, [recallWaitingList]);

  // Open add form with a specific recall prefilled
  const handleOpenAddForRecall = (recCode?: string) => {
    if (recCode && recCode !== 'UNASSIGNED') {
      setRecallNumber(recCode);
      const match = distinctRecallList.find(r => r.code === recCode);
      if (match?.commonPart) {
        setPartNumber(match.commonPart);
      }
    }
    setIsAddFormOpen(true);
  };

  // Submit new recall entry
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setFormError('Customer Name is required.');
      return;
    }
    if (!partNumber.trim()) {
      setFormError('Recall Part Number is required.');
      return;
    }
    if (!recallNumber.trim()) {
      setFormError('Recall Number is required (e.g. 66A, 04A, V07).');
      return;
    }

    const cleanRecall = recallNumber.trim().toUpperCase();

    addRecallWaitingEntry({
      customerName: customerName.trim(),
      vin: vin.trim().toUpperCase(),
      partNumber: partNumber.trim().toUpperCase(),
      recallNumber: cleanRecall,
      campaignCode: cleanRecall,
      datePutOnList: datePutOnList || todayStr,
      phoneNumber: phoneNumber.trim(),
      dateCalled: dateCalled.trim() || undefined,
      notes: notes.trim() || undefined,
      status: 'WAITING_ON_PART'
    });

    // Reset form
    setCustomerName('');
    setVin('');
    setPartNumber('');
    setRecallNumber('');
    setDatePutOnList(todayStr);
    setPhoneNumber('');
    setDateCalled('');
    setNotes('');
    setFormError(null);
    setIsAddFormOpen(false);
  };

  // Start editing
  const handleStartEdit = (entry: RecallWaitingEntry) => {
    setEditingId(entry.id);
    setEditCustomerName(entry.customerName);
    setEditVin(entry.vin || '');
    setEditPartNumber(entry.partNumber);
    setEditRecallNumber(entry.recallNumber || entry.campaignCode || '');
    setEditDatePutOnList(entry.datePutOnList || todayStr);
    setEditPhoneNumber(entry.phoneNumber || '');
    setEditDateCalled(entry.dateCalled || '');
    setEditNotes(entry.notes || '');
    setEditStatus(entry.status || 'WAITING_ON_PART');
  };

  // Save edit
  const handleSaveEdit = (id: string) => {
    if (!editCustomerName.trim() || !editPartNumber.trim()) return;

    const cleanRecall = editRecallNumber.trim().toUpperCase();

    updateRecallWaitingEntry(id, {
      customerName: editCustomerName.trim(),
      vin: editVin.trim().toUpperCase(),
      partNumber: editPartNumber.trim().toUpperCase(),
      recallNumber: cleanRecall,
      campaignCode: cleanRecall,
      datePutOnList: editDatePutOnList.trim() || todayStr,
      phoneNumber: editPhoneNumber.trim(),
      dateCalled: editDateCalled.trim() || '',
      notes: editNotes.trim() || undefined,
      status: editStatus
    });

    setEditingId(null);
  };

  // Quick 1-click Log Call Today
  const handleQuickLogCall = (id: string) => {
    markRecallCustomerCalled(id, todayStr);
  };

  // Toggle collapse state for a recall group
  const toggleGroupCollapse = (recallCode: string) => {
    setCollapsedRecalls(prev => ({
      ...prev,
      [recallCode]: !prev[recallCode]
    }));
  };

  // 1. Filter and sort: STRICTLY OLDEST TO NEWEST as requested
  const filteredAndSortedList = useMemo(() => {
    // 1. Sort oldest to newest by datePutOnList
    const sorted = [...recallWaitingList].sort((a, b) => {
      const timeA = new Date(a.datePutOnList || a.createdAt || 0).getTime();
      const timeB = new Date(b.datePutOnList || b.createdAt || 0).getTime();
      return timeA - timeB; // Oldest date first!
    });

    let result = sorted;

    // 2. Filter by pulled Recall Number
    if (selectedRecallFilter !== 'ALL') {
      result = result.filter(item => {
        const itemCode = (item.recallNumber || item.campaignCode || 'UNASSIGNED').trim().toUpperCase();
        return itemCode === selectedRecallFilter.toUpperCase();
      });
    }

    // 3. Filter by search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(item => 
        item.customerName.toLowerCase().includes(q) ||
        item.vin.toLowerCase().includes(q) ||
        item.partNumber.toLowerCase().includes(q) ||
        item.phoneNumber.toLowerCase().includes(q) ||
        ((item.recallNumber || item.campaignCode) && (item.recallNumber || item.campaignCode)!.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    }

    // 4. Status filter
    if (statusFilter === 'WAITING') {
      result = result.filter(item => item.status !== 'PART_ARRIVED' && item.status !== 'COMPLETED');
    } else if (statusFilter === 'ARRIVED') {
      result = result.filter(item => item.status === 'PART_ARRIVED');
    } else if (statusFilter === 'NEEDS_CALL') {
      result = result.filter(item => !item.dateCalled || item.dateCalled.trim() === '');
    } else if (statusFilter === 'CALLED') {
      result = result.filter(item => Boolean(item.dateCalled && item.dateCalled.trim() !== ''));
    }

    return result;
  }, [recallWaitingList, selectedRecallFilter, searchQuery, statusFilter]);

  // 2. Group the filtered list by Recall Number
  const recallGroups = useMemo((): RecallGroupData[] => {
    const map = new Map<string, RecallWaitingEntry[]>();

    filteredAndSortedList.forEach(item => {
      const code = (item.recallNumber || item.campaignCode || 'UNASSIGNED').trim().toUpperCase();
      const list = map.get(code) || [];
      list.push(item);
      map.set(code, list);
    });

    const groups: RecallGroupData[] = [];
    map.forEach((entries, recallCode) => {
      // Ensure entries within group are sorted OLDEST to NEWEST
      entries.sort((a, b) => {
        const timeA = new Date(a.datePutOnList || a.createdAt || 0).getTime();
        const timeB = new Date(b.datePutOnList || b.createdAt || 0).getTime();
        return timeA - timeB;
      });

      const waitingCount = entries.filter(e => e.status !== 'PART_ARRIVED' && e.status !== 'COMPLETED').length;
      const arrivedCount = entries.filter(e => e.status === 'PART_ARRIVED').length;
      const needsCallCount = entries.filter(e => !e.dateCalled || e.dateCalled.trim() === '').length;
      const oldestEntry = entries[0];
      const oldestDays = oldestEntry ? getDaysWaiting(oldestEntry.datePutOnList) : 0;

      // Find most common part number in this recall
      const commonPart = entries.find(e => Boolean(e.partNumber))?.partNumber;
      const commonNotes = entries.find(e => Boolean(e.notes))?.notes;

      groups.push({
        recallCode,
        commonPartNumber: commonPart,
        commonNotes: commonNotes,
        totalCount: entries.length,
        waitingCount,
        arrivedCount,
        needsCallCount,
        oldestDate: oldestEntry?.datePutOnList,
        oldestDaysWaiting: oldestDays,
        entries
      });
    });

    // Sort recall groups by total count descending or oldest waiting
    return groups.sort((a, b) => b.oldestDaysWaiting - a.oldestDaysWaiting || b.totalCount - a.totalCount);
  }, [filteredAndSortedList]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = recallWaitingList.length;
    const waitingOnParts = recallWaitingList.filter(item => item.status !== 'PART_ARRIVED' && item.status !== 'COMPLETED').length;
    const partsArrived = recallWaitingList.filter(item => item.status === 'PART_ARRIVED').length;
    const needsCall = recallWaitingList.filter(item => !item.dateCalled || item.dateCalled.trim() === '').length;
    
    const totalDays = recallWaitingList.reduce((sum, item) => sum + getDaysWaiting(item.datePutOnList), 0);
    const avgDays = total > 0 ? Math.round(totalDays / total) : 0;

    const sorted = [...recallWaitingList].sort((a, b) => {
      return new Date(a.datePutOnList).getTime() - new Date(b.datePutOnList).getTime();
    });
    const longest = sorted[0];

    return { total, waitingOnParts, partsArrived, needsCall, avgDays, longest };
  }, [recallWaitingList]);

  // Render a customer item card (reusable across separated group view and unified list view)
  const renderCustomerRow = (entry: RecallWaitingEntry, queueIndex: number, isGroupedView: boolean) => {
    const daysWaiting = getDaysWaiting(entry.datePutOnList);
    const isEditingThis = editingId === entry.id;
    const hasCalled = Boolean(entry.dateCalled && entry.dateCalled.trim() !== '');
    const isPartArrived = entry.status === 'PART_ARRIVED';
    const recNum = entry.recallNumber || entry.campaignCode || 'UNASSIGNED';

    if (isEditingThis) {
      return (
        <div key={entry.id} className="p-4 rounded-xl bg-white border-2 border-blue-500 shadow-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-black text-blue-900 uppercase">
              Editing Customer #{queueIndex + 1}
            </span>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Customer Name *</label>
              <input
                type="text"
                value={editCustomerName}
                onChange={e => setEditCustomerName(e.target.value)}
                className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Recall Number *</label>
              <input
                type="text"
                value={editRecallNumber}
                onChange={e => setEditRecallNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 66A, 04A, V07"
                className="w-full text-xs font-mono font-bold p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Recall Part # *</label>
              <input
                type="text"
                value={editPartNumber}
                onChange={e => setEditPartNumber(e.target.value.toUpperCase())}
                className="w-full text-xs font-mono font-bold p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">VIN</label>
              <input
                type="text"
                value={editVin}
                onChange={e => setEditVin(e.target.value.toUpperCase())}
                className="w-full text-xs font-mono font-bold p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Date Put On List</label>
              <input
                type="date"
                value={editDatePutOnList}
                onChange={e => setEditDatePutOnList(e.target.value)}
                className="w-full text-xs font-mono font-bold p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Phone Number</label>
              <input
                type="tel"
                value={editPhoneNumber}
                onChange={e => setEditPhoneNumber(e.target.value)}
                className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Date Called</label>
              <input
                type="date"
                value={editDateCalled}
                onChange={e => setEditDateCalled(e.target.value)}
                className="w-full text-xs font-mono font-bold p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Status</label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value as any)}
                className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 cursor-pointer"
              >
                <option value="WAITING_ON_PART">⏳ Waiting on Part</option>
                <option value="PART_ARRIVED">📦 Part Arrived</option>
                <option value="SCHEDULED">📅 Scheduled</option>
                <option value="COMPLETED">✓ Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Vehicle Details & Notes</label>
            <input
              type="text"
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveEdit(entry.id)}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div 
        key={entry.id}
        className={`p-3.5 sm:p-4 rounded-xl border-2 transition-all shadow-2xs ${
          isPartArrived 
            ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-400' 
            : daysWaiting >= 30 
            ? 'bg-white border-rose-300 hover:border-rose-400' 
            : daysWaiting >= 14
            ? 'bg-white border-amber-300 hover:border-amber-400'
            : 'bg-white border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Queue Position, Customer Name & Days Waiting */}
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Chronological Queue Number (#1, #2, etc.) */}
              <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white shadow-2xs">
                #{queueIndex + 1}
              </span>

              {/* Customer Name */}
              <h4 className="text-base font-black text-slate-950 tracking-tight">
                {entry.customerName}
              </h4>

              {/* Recall Number Badge (Always visible, highlighted in unified mode) */}
              <span 
                onClick={() => setSelectedRecallFilter(recNum)}
                className={`font-mono text-xs font-black px-2.5 py-0.5 rounded-md border flex items-center gap-1 cursor-pointer transition-all ${
                  selectedRecallFilter === recNum
                    ? 'bg-red-600 text-white border-red-700 shadow-xs'
                    : 'bg-red-100 hover:bg-red-200 text-red-900 border-red-300'
                }`}
                title={`Click to pull only Recall #${recNum}`}
              >
                <Hash className="w-3 h-3 text-red-700" />
                <span>Recall #{recNum}</span>
              </span>

              {/* Days Waiting Badge */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border font-mono ${
                daysWaiting >= 30
                  ? 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse'
                  : daysWaiting >= 14
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-blue-100 text-blue-900 border-blue-200'
              }`}>
                <Clock className="w-3 h-3" />
                <span>{daysWaiting} Day{daysWaiting === 1 ? '' : 's'} Waiting</span>
              </span>

              {/* Status Tag */}
              {isPartArrived ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  <span>PART ARRIVED</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                  <span>WAITING ON PART</span>
                </span>
              )}
            </div>

            {/* Line 2: VIN, Part Number, Date Put On List */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-slate-700">
              {/* Part Number with copy */}
              <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Part #:</span>
                <span className="font-mono font-bold text-blue-950">{entry.partNumber}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(entry.partNumber, `part_${entry.id}`)}
                  className="text-slate-400 hover:text-blue-700 p-0.5 cursor-pointer ml-1"
                  title="Copy Part Number"
                >
                  {copiedKey === `part_${entry.id}` ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              {/* Date Put On List */}
              <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">On List:</span>
                <span className="font-mono font-bold text-slate-900">{formatDateDisplay(entry.datePutOnList)}</span>
              </div>

              {/* VIN with copy */}
              {entry.vin && (
                <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  <Car className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">VIN:</span>
                  <span className="font-mono font-bold text-slate-900">{entry.vin}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(entry.vin, `vin_${entry.id}`)}
                    className="text-slate-400 hover:text-blue-700 p-0.5 cursor-pointer ml-1"
                    title="Copy VIN"
                  >
                    {copiedKey === `vin_${entry.id}` ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>

            {/* Notes / Vehicle info */}
            {entry.notes && (
              <p className="text-xs text-slate-600 italic">
                {entry.notes}
              </p>
            )}
          </div>

          {/* Right: Phone Number, Date Called Status & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 self-start md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 w-full md:w-auto justify-between md:justify-end">
            {/* Phone & Call Status Box */}
            <div className="space-y-1 text-left sm:text-right">
              {/* Phone Number */}
              {entry.phoneNumber ? (
                <div className="flex items-center sm:justify-end gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                  <a
                    href={`tel:${entry.phoneNumber.replace(/[^0-9]/g, '')}`}
                    className="text-xs font-black text-slate-900 hover:text-blue-700 underline font-mono"
                    title="Click to dial"
                  >
                    {entry.phoneNumber}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(entry.phoneNumber, `phone_${entry.id}`)}
                    className="text-slate-400 hover:text-blue-700 p-0.5 cursor-pointer"
                    title="Copy Phone Number"
                  >
                    {copiedKey === `phone_${entry.id}` ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 italic">No phone logged</span>
              )}

              {/* Date Called Status */}
              <div className="flex items-center sm:justify-end gap-1.5 flex-wrap">
                {hasCalled ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    <Check className="w-3 h-3 text-emerald-700" />
                    <span>Called: {formatDateDisplay(entry.dateCalled)}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>Not Called Yet</span>
                  </span>
                )}

                {/* Quick 1-Click Call Log Button */}
                <button
                  type="button"
                  onClick={() => handleQuickLogCall(entry.id)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300 cursor-pointer transition-colors"
                  title="Log that customer was contacted today"
                >
                  📞 Log Call Today
                </button>
              </div>
            </div>

            {/* Part Arrived Toggle & Edit/Delete Actions */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              {/* Part Arrived Toggle */}
              <button
                type="button"
                onClick={() => {
                  updateRecallWaitingEntry(entry.id, {
                    status: isPartArrived ? 'WAITING_ON_PART' : 'PART_ARRIVED'
                  });
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                  isPartArrived
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white hover:bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                }`}
                title={isPartArrived ? 'Mark as Waiting on Part' : 'Mark as Part Arrived'}
              >
                {isPartArrived ? '✓ Part In' : 'Mark Arrived'}
              </button>

              {/* Edit Button */}
              <button
                type="button"
                onClick={() => handleStartEdit(entry)}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 shadow-2xs cursor-pointer"
                title="Edit Customer Recall Entry"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              {/* Delete Button / Inline Confirmation */}
              {confirmDeleteId === entry.id ? (
                <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-300 animate-in fade-in">
                  <span className="text-[10px] font-bold text-rose-900 px-1">Remove?</span>
                  <button
                    type="button"
                    onClick={() => {
                      deleteRecallWaitingEntry(entry.id);
                      setConfirmDeleteId(null);
                    }}
                    className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black cursor-pointer shadow-xs"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(entry.id)}
                  className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-300 shadow-2xs cursor-pointer transition-colors"
                  title="Remove from waiting list"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isRecallWaitingModalOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 max-h-[95vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Navigation Tabs Bar (Unified Directory Switcher) */}
        <div className="bg-slate-950 px-4 sm:px-6 pt-3 pb-1 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs flex-wrap">
            <button
              type="button"
              onClick={() => handleSwitchTab('parts')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>Special Parts</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-300 font-mono">
                {specialParts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('numbers')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-sky-400" />
              <span>Important Numbers</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-sky-300 font-mono">
                {importantNumbers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('passwords')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Passwords</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-indigo-300 font-mono">
                {managerPasswords.length}
              </span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold shadow-xs cursor-default"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-red-200" />
              <span>Recall Waiting List</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-800 text-red-100 font-mono">
                {recallWaitingList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('extensions')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              <PhoneForwarded className="w-3.5 h-3.5 text-teal-400" />
              <span>Phone Extensions</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-teal-300 font-mono">
                {internalExtensions.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={closeRecallWaitingModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-auto"
            title="Close directory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 border-b border-slate-800 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-sm shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Customers Waiting on Recall Parts
                </h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-400/40">
                  {distinctRecallList.length} Active Recall Campaigns
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Ordered Oldest to Newest</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Separated by Recall Number: Name, VIN, Part Number, Date Put On List, Phone Number, and Date Called
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenAddForRecall()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddFormOpen ? 'Cancel' : '+ Add Customer to List'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PULL LIST BY RECALL NUMBER BAR (QUICK SELECTOR)                          */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-900/95 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs text-slate-200">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <span className="text-[11px] uppercase tracking-wider font-black text-red-400 flex items-center gap-1 shrink-0">
              <Layers className="w-3.5 h-3.5" />
              <span>Pull by Recall #:</span>
            </span>

            {/* All Recalls Button */}
            <button
              type="button"
              onClick={() => setSelectedRecallFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                selectedRecallFilter === 'ALL'
                  ? 'bg-red-600 text-white border-red-500 shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              All Recalls ({recallWaitingList.length})
            </button>

            {/* Individual Recall Number Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
              {distinctRecallList.map(rec => (
                <button
                  key={rec.code}
                  type="button"
                  onClick={() => setSelectedRecallFilter(rec.code)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black font-mono transition-all cursor-pointer border shrink-0 ${
                    selectedRecallFilter === rec.code
                      ? 'bg-red-600 text-white border-red-400 ring-2 ring-red-400/50 shadow-xs'
                      : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={`Pull all customers waiting for Recall #${rec.code}`}
                >
                  <Hash className="w-3 h-3 text-red-400" />
                  <span>Recall #{rec.code}</span>
                  <span className={`text-[10px] px-1.5 py-0.1 rounded-full font-sans font-bold ${
                    selectedRecallFilter === rec.code
                      ? 'bg-red-950 text-red-200'
                      : 'bg-slate-900 text-red-300'
                  }`}>
                    {rec.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* View Mode Toggle: Separated by Recall # vs Unified Queue */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700 shrink-0 self-end md:self-auto">
            <button
              type="button"
              onClick={() => setViewGroupingMode('SEPARATED_BY_RECALL')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewGroupingMode === 'SEPARATED_BY_RECALL'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Separate customers into distinct sections grouped by their Recall Number"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Separated by Recall #</span>
            </button>

            <button
              type="button"
              onClick={() => setViewGroupingMode('UNIFIED')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewGroupingMode === 'UNIFIED'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Continuous chronological queue ordered strictly oldest to newest"
            >
              <List className="w-3.5 h-3.5" />
              <span>Unified Queue</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats Summary Bar */}
        <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total on Waiting List</span>
            <span className="text-base font-black text-slate-900 font-mono">{stats.total} customers</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Waiting on Recall Parts</span>
            <span className="text-base font-black text-amber-900 font-mono">{stats.waitingOnParts} awaiting delivery</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Parts In / Ready to Schedule</span>
            <span className="text-base font-black text-emerald-900 font-mono">{stats.partsArrived} parts arrived</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">Average Wait Time</span>
            <span className="text-base font-black text-rose-950 font-mono">
              {stats.avgDays} days
              {stats.longest && (
                <span className="text-[10px] font-normal text-slate-500 block truncate" title={`Longest: ${stats.longest.customerName} (${getDaysWaiting(stats.longest.datePutOnList)}d)`}>
                  Max: {getDaysWaiting(stats.longest.datePutOnList)}d ({stats.longest.customerName.split(' ')[0]})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Add Customer Form (Collapsible) */}
        {isAddFormOpen && (
          <form 
            onSubmit={handleAddSubmit}
            className="p-4 sm:p-5 bg-red-50/80 border-b-2 border-red-300 space-y-3 animate-in slide-in-from-top-3 duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-red-950 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-red-700" />
                <span>Add Customer Waiting on Recall Part</span>
              </span>
              <span className="text-[11px] text-red-800 font-medium">
                Will be placed in queue chronologically by Date Put On List (Oldest to Newest)
              </span>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-100 border border-red-300 text-red-900 text-xs font-bold rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Recall Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Recall Number *
                </label>
                <input
                  type="text"
                  required
                  value={recallNumber}
                  onChange={e => setRecallNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 66A, 04A, V07"
                  className="w-full text-xs font-mono font-black p-2 bg-white border border-red-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                {/* Existing Recall Quick-Pick Chips */}
                {distinctRecallList.length > 0 && (
                  <div className="mt-1 flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-bold">Pick:</span>
                    {distinctRecallList.slice(0, 5).map(r => (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => {
                          setRecallNumber(r.code);
                          if (r.commonPart) setPartNumber(r.commonPart);
                        }}
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white hover:bg-red-100 text-slate-700 hover:text-red-900 border border-slate-300 cursor-pointer"
                      >
                        {r.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Recall Part Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Recall Part Number *
                </label>
                <input
                  type="text"
                  required
                  value={partNumber}
                  onChange={e => setPartNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 68518241AA"
                  className="w-full text-xs font-mono font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Michael Henderson"
                  className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Vehicle VIN */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Vehicle VIN
                </label>
                <input
                  type="text"
                  value={vin}
                  onChange={e => setVin(e.target.value.toUpperCase())}
                  placeholder="17-Digit VIN"
                  className="w-full text-xs font-mono font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date Put On List */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Date Put On List *
                </label>
                <input
                  type="date"
                  required
                  value={datePutOnList}
                  onChange={e => setDatePutOnList(e.target.value)}
                  className="w-full text-xs font-mono font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="e.g. (555) 234-8910"
                  className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Date Called */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Date Called (Optional)
                </label>
                <input
                  type="date"
                  value={dateCalled}
                  onChange={e => setDateCalled(e.target.value)}
                  className="w-full text-xs font-mono font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            {/* Vehicle Details & Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                Vehicle Details & Recall Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. 2021 Jeep Wrangler 3.0L EcoDiesel high pressure fuel pump recall"
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save to Recall Waiting List</span>
              </button>
            </div>
          </form>
        )}

        {/* Search, Filter Bar and Order Header */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by recall #, customer name, VIN, part #, or phone..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              All ({recallWaitingList.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('WAITING')}
              className={`px-2.5 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                statusFilter === 'WAITING'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50'
              }`}
            >
              ⏳ Waiting ({stats.waitingOnParts})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ARRIVED')}
              className={`px-2.5 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                statusFilter === 'ARRIVED'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              ✓ Part In ({stats.partsArrived})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('NEEDS_CALL')}
              className={`px-2.5 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                statusFilter === 'NEEDS_CALL'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-rose-900 border-rose-300 hover:bg-rose-50'
              }`}
            >
              ⚠️ Needs Call ({stats.needsCall})
            </button>
          </div>
        </div>

        {/* Active Pulled Recall Filter Banner (If a specific recall is pulled) */}
        {selectedRecallFilter !== 'ALL' && (
          <div className="px-5 py-2.5 bg-red-100 border-b border-red-300 flex items-center justify-between gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-red-600 text-white">
                <Hash className="w-3.5 h-3.5" />
              </span>
              <span className="font-bold text-red-950">
                PULLED RECALL <strong>#{selectedRecallFilter}</strong>: Showing customers waiting for this recall, strictly ordered from oldest to newest.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRecallFilter('ALL')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-red-50 text-red-800 text-xs font-bold border border-red-300 cursor-pointer shadow-2xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Show All Recalls</span>
            </button>
          </div>
        )}

        {/* Order Indicator Banner */}
        <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-950 font-bold">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              {viewGroupingMode === 'SEPARATED_BY_RECALL'
                ? 'Separated by Recall Number: Each recall section sorted Oldest to Newest'
                : 'Unified Queue: All customers sorted Oldest to Newest'}
            </span>
          </div>
          <span className="text-[11px] text-amber-800 font-mono font-medium">
            Showing {filteredAndSortedList.length} of {recallWaitingList.length} customers
          </span>
        </div>

        {/* ========================================================================= */}
        {/* CUSTOMER RECALL WAITING LIST BODY                                         */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-slate-100/70">
          {filteredAndSortedList.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border-2 border-dashed border-slate-300 space-y-2">
              <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No Customers Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {selectedRecallFilter !== 'ALL'
                  ? `No customers found under Recall #${selectedRecallFilter} with the current filters.`
                  : searchQuery || statusFilter !== 'ALL'
                  ? 'No recall waiting list entries match your current search or filter criteria.'
                  : 'There are no customers currently logged waiting on recall parts.'}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                {selectedRecallFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedRecallFilter('ALL')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <span>Show All Recalls</span>
                  </button>
                )}
                {!isAddFormOpen && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddForRecall(selectedRecallFilter !== 'ALL' ? selectedRecallFilter : undefined)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Customer to Waiting List</span>
                  </button>
                )}
              </div>
            </div>
          ) : viewGroupingMode === 'SEPARATED_BY_RECALL' ? (
            /* ========================================================================= */
            /* VIEW 1: SEPARATED BY RECALL NUMBER (GROUPED SECTIONS)                     */
            /* ========================================================================= */
            <div className="space-y-4">
              {recallGroups.map(group => {
                const isCollapsed = Boolean(collapsedRecalls[group.recallCode]);

                return (
                  <div 
                    key={group.recallCode}
                    className="bg-white rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden transition-all"
                  >
                    {/* Recall Group Header */}
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-700">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Recall Number Badge */}
                        <div className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1 rounded-xl shadow-xs font-black font-mono text-sm sm:text-base border border-red-400">
                          <Hash className="w-4 h-4 text-red-200" />
                          <span>RECALL #{group.recallCode}</span>
                        </div>

                        {/* Customer Count Badge */}
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700">
                          {group.totalCount} Customer{group.totalCount === 1 ? '' : 's'} on List
                        </span>

                        {/* Common Part Number Pill */}
                        {group.commonPartNumber && (
                          <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
                            <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="text-[10px] uppercase font-bold text-slate-400">Recall Part:</span>
                            <span className="font-mono font-bold text-white">{group.commonPartNumber}</span>
                          </div>
                        )}

                        {/* Wait Duration Highlight */}
                        {group.oldestDaysWaiting > 0 && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black font-mono ${
                            group.oldestDaysWaiting >= 30
                              ? 'bg-rose-950 text-rose-200 border border-rose-700'
                              : 'bg-amber-950 text-amber-200 border border-amber-700'
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>Max Wait: {group.oldestDaysWaiting}d ({formatDateDisplay(group.oldestDate)})</span>
                          </span>
                        )}
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                        {/* Quick filter to pull only this recall */}
                        {selectedRecallFilter !== group.recallCode ? (
                          <button
                            type="button"
                            onClick={() => setSelectedRecallFilter(group.recallCode)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                            title={`Pull only Recall #${group.recallCode}`}
                          >
                            <Filter className="w-3.5 h-3.5 text-red-400" />
                            <span>Pull Only #{group.recallCode}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedRecallFilter('ALL')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Showing This Recall</span>
                          </button>
                        )}

                        {/* Add customer specifically to this recall */}
                        <button
                          type="button"
                          onClick={() => handleOpenAddForRecall(group.recallCode)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          title={`Add another customer waiting on Recall #${group.recallCode}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add to Recall #{group.recallCode}</span>
                        </button>

                        {/* Collapse / Expand Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleGroupCollapse(group.recallCode)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                          title={isCollapsed ? 'Expand recall group' : 'Collapse recall group'}
                        >
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Group Sub-Header (Description & Ordering Note) */}
                    {!isCollapsed && group.commonNotes && (
                      <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 italic flex items-center justify-between">
                        <span>Campaign Details: {group.commonNotes}</span>
                        <span className="text-[10px] font-bold text-slate-500 font-mono">
                          Ordered Oldest to Newest
                        </span>
                      </div>
                    )}

                    {/* Group Customer Cards List */}
                    {!isCollapsed && (
                      <div className="p-3.5 sm:p-4 space-y-3 bg-slate-50/50">
                        {group.entries.map((entry, idx) => renderCustomerRow(entry, idx, true))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW 2: UNIFIED CHRONOLOGICAL QUEUE (OLDEST TO NEWEST)                    */
            /* ========================================================================= */
            <div className="space-y-3">
              {filteredAndSortedList.map((entry, index) => renderCustomerRow(entry, index, false))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">Auto-Synced Across Service & Parts Departments</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeRecallWaitingModal}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
