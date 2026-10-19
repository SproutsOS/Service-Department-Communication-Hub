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
  CheckCircle2,
  AlertTriangle,
  PhoneCall,
  PhoneForwarded,
  Printer,
  ChevronDown,
  Building2,
  Users,
  Layers,
  ArrowUpDown,
  Filter,
  CheckCheck,
  Hash,
  Briefcase,
  Store
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InternalExtensionEntry } from '../types';
import { printIsolatedDocument } from '../utils/printUtils';

const COMMON_DEPARTMENTS = [
  'Service',
  'Parts',
  'Sales',
  'Accounting / Office',
  'Management',
  'Body Shop'
];

export const InternalExtensionModal: React.FC = () => {
  const {
    isInternalExtensionModalOpen,
    closeInternalExtensionModal,
    internalExtensions,
    addInternalExtension,
    updateInternalExtension,
    deleteInternalExtension,
    specialParts,
    importantNumbers,
    managerPasswords,
    recallWaitingList,
    shopName,
    openSpecialPartsModal,
    openImportantNumbersModal,
    openManagerPasswordsModal,
    openRecallWaitingModal
  } = useApp();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'GROUPED_BY_DEPT' | 'BY_EXTENSION'>('GROUPED_BY_DEPT');

  // Form State
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [extension, setExtension] = useState('');
  const [department, setDepartment] = useState('Service');
  const [customDept, setCustomDept] = useState('');
  const [directPhone, setDirectPhone] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editExtension, setEditExtension] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDirectPhone, setEditDirectPhone] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Copied indicator
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // Inline delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(prev => prev === key ? null : prev), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handleSwitchTab = (tab: 'parts' | 'numbers' | 'passwords' | 'recalls' | 'extensions') => {
    if (tab === 'parts') {
      closeInternalExtensionModal();
      openSpecialPartsModal();
    } else if (tab === 'numbers') {
      closeInternalExtensionModal();
      openImportantNumbersModal();
    } else if (tab === 'passwords') {
      closeInternalExtensionModal();
      openManagerPasswordsModal();
    } else if (tab === 'recalls') {
      closeInternalExtensionModal();
      openRecallWaitingModal();
    }
  };

  const handlePrint = () => {
    printIsolatedDocument('printable-internal-extensions', `Internal Phone Extensions Directory - ${shopName || 'Dealership'}`);
  };

  // Distinct departments for filter pills
  const distinctDepartments = useMemo(() => {
    const set = new Set<string>();
    internalExtensions.forEach(item => {
      if (item.department) set.add(item.department);
    });
    return Array.from(set).sort();
  }, [internalExtensions]);

  // Submit new extension
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Name / Station is required.');
      return;
    }
    if (!extension.trim()) {
      setFormError('Phone Extension Number is required.');
      return;
    }

    const finalDept = department === 'OTHER' ? (customDept.trim() || 'General') : department;

    addInternalExtension({
      name: name.trim(),
      extension: extension.trim(),
      department: finalDept,
      directPhone: directPhone.trim() || undefined,
      title: title.trim() || undefined,
      notes: notes.trim() || undefined
    });

    // Reset form
    setName('');
    setExtension('');
    setDepartment('Service');
    setCustomDept('');
    setDirectPhone('');
    setTitle('');
    setNotes('');
    setFormError(null);
    setIsAddFormOpen(false);
  };

  // Start editing
  const handleStartEdit = (entry: InternalExtensionEntry) => {
    setEditingId(entry.id);
    setEditName(entry.name);
    setEditExtension(entry.extension);
    setEditDepartment(entry.department || 'Service');
    setEditDirectPhone(entry.directPhone || '');
    setEditTitle(entry.title || '');
    setEditNotes(entry.notes || '');
  };

  // Save edit
  const handleSaveEdit = (id: string) => {
    if (!editName.trim() || !editExtension.trim()) return;

    updateInternalExtension(id, {
      name: editName.trim(),
      extension: editExtension.trim(),
      department: editDepartment.trim(),
      directPhone: editDirectPhone.trim() || undefined,
      title: editTitle.trim() || undefined,
      notes: editNotes.trim() || undefined
    });

    setEditingId(null);
  };

  // Filtered list
  const filteredList = useMemo(() => {
    let result = [...internalExtensions];

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(item => 
        item.name.toLowerCase().includes(q) ||
        item.extension.toLowerCase().includes(q) ||
        (item.department && item.department.toLowerCase().includes(q)) ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.directPhone && item.directPhone.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    }

    // Department filter
    if (selectedDepartmentFilter !== 'ALL') {
      result = result.filter(item => item.department === selectedDepartmentFilter);
    }

    // Sort by Extension number numerically
    return result.sort((a, b) => {
      const numA = parseInt(a.extension.replace(/\D/g, ''), 10);
      const numB = parseInt(b.extension.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return a.extension.localeCompare(b.extension);
    });
  }, [internalExtensions, searchQuery, selectedDepartmentFilter]);

  // Grouped by Department
  const groupedByDepartment = useMemo(() => {
    const map = new Map<string, InternalExtensionEntry[]>();
    filteredList.forEach(item => {
      const dept = item.department || 'General';
      const list = map.get(dept) || [];
      list.push(item);
      map.set(dept, list);
    });

    return Array.from(map.entries()).map(([dept, entries]) => ({
      department: dept,
      entries: entries.sort((a, b) => {
        const numA = parseInt(a.extension.replace(/\D/g, ''), 10);
        const numB = parseInt(b.extension.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
          return numA - numB;
        }
        return a.extension.localeCompare(b.extension);
      })
    })).sort((a, b) => {
      const order = ['Service', 'Parts', 'Sales', 'Accounting / Office', 'Management', 'Body Shop'];
      const idxA = order.indexOf(a.department);
      const idxB = order.indexOf(b.department);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.department.localeCompare(b.department);
    });
  }, [filteredList]);

  // Department Badge Colors
  const getDeptColor = (dept?: string) => {
    switch (dept) {
      case 'Service':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Parts':
        return 'bg-amber-100 text-amber-950 border-amber-300';
      case 'Sales':
        return 'bg-emerald-100 text-emerald-950 border-emerald-300';
      case 'Accounting / Office':
        return 'bg-purple-100 text-purple-950 border-purple-300';
      case 'Management':
        return 'bg-slate-900 text-white border-slate-700';
      case 'Body Shop':
        return 'bg-orange-100 text-orange-950 border-orange-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (!isInternalExtensionModalOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 max-h-[95vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Navigation Tabs Bar (Unified 5-Directory Suite) */}
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
              onClick={() => handleSwitchTab('recalls')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>Recall Waiting List</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-red-300 font-mono">
                {recallWaitingList.length}
              </span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white font-bold shadow-xs cursor-default"
            >
              <PhoneForwarded className="w-3.5 h-3.5 text-teal-200" />
              <span>Phone Extensions</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-800 text-teal-100 font-mono">
                {internalExtensions.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={closeInternalExtensionModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-auto"
            title="Close directory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 border-b border-slate-800 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-sm shrink-0">
              <PhoneForwarded className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Dealership Internal Phone Directory
                </h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/40">
                  {internalExtensions.length} Extensions Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Internal phone directory by employee name, 3-digit phone extension number, and department
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-slate-700 shadow-xs transition-colors cursor-pointer"
              title="Print Internal Extension Directory Sheet (Post on desks & phone stations)"
            >
              <Printer className="w-4 h-4 text-teal-400" />
              <span className="hidden sm:inline">Print Directory</span>
              <span className="sm:hidden">Print</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddFormOpen(!isAddFormOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-black shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddFormOpen ? 'Cancel' : '+ Add Extension'}</span>
            </button>
          </div>
        </div>

        {/* Department Filter Bar & View Toggle */}
        <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[11px] font-black uppercase text-teal-400 mr-1 shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Department:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedDepartmentFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                selectedDepartmentFilter === 'ALL'
                  ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              All ({internalExtensions.length})
            </button>

            {COMMON_DEPARTMENTS.map(dept => {
              const count = internalExtensions.filter(i => i.department === dept).length;
              if (count === 0 && !distinctDepartments.includes(dept)) return null;

              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDepartmentFilter(dept)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border shrink-0 flex items-center gap-1.5 ${
                    selectedDepartmentFilter === dept
                      ? 'bg-teal-600 text-white border-teal-400 shadow-xs'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>{dept}</span>
                  <span className={`text-[10px] px-1.5 py-0.1 rounded-full font-mono font-bold ${
                    selectedDepartmentFilter === dept ? 'bg-teal-950 text-teal-200' : 'bg-slate-900 text-teal-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grouped View vs Numbered View Toggle */}
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 shrink-0 self-end md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('GROUPED_BY_DEPT')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'GROUPED_BY_DEPT'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Group extensions by department"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>By Department</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('BY_EXTENSION')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'BY_EXTENSION'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Numeric list by extension number"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>By Ext. #</span>
            </button>
          </div>
        </div>

        {/* Add Extension Form (Collapsible) */}
        {isAddFormOpen && (
          <form 
            onSubmit={handleAddSubmit}
            className="p-4 sm:p-5 bg-teal-50/70 border-b-2 border-teal-300 space-y-3 animate-in slide-in-from-top-3 duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-teal-950 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-teal-700" />
                <span>Add Internal Phone Extension</span>
              </span>
              <span className="text-[11px] text-teal-800 font-medium">
                Will be available to all dealership departments instantly
              </span>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-100 border border-red-300 text-red-900 text-xs font-bold rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Name / Station */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Name / Station Desk *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Mark Reynolds or Parts Back Counter"
                  className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Phone Extension Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Extension Number *
                </label>
                <input
                  type="text"
                  required
                  value={extension}
                  onChange={e => setExtension(e.target.value)}
                  placeholder="e.g. 202 or 301"
                  className="w-full text-xs font-mono font-black p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Department *
                </label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer"
                >
                  {COMMON_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                  <option value="OTHER">Other / Custom Department</option>
                </select>
                {department === 'OTHER' && (
                  <input
                    type="text"
                    value={customDept}
                    onChange={e => setCustomDept(e.target.value)}
                    placeholder="Enter Custom Department Name"
                    className="w-full text-xs font-bold p-2 mt-1.5 bg-white border border-teal-400 rounded-lg text-slate-900"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Job Title / Role */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Job Title / Function (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Lead Service Advisor"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Direct Dial Outside Line */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Direct Phone / Outside Line (Opt)
                </label>
                <input
                  type="tel"
                  value={directPhone}
                  onChange={e => setDirectPhone(e.target.value)}
                  placeholder="e.g. (555) 330-2202"
                  className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Notes / Location */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Notes / Desk Location (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Service Lane 1, Front Counter"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
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
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save to Phone Directory</span>
              </button>
            </div>
          </form>
        )}

        {/* Search Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search directory by employee name, extension #, department, or job title..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-2xs"
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
          <span className="text-[11px] text-slate-500 font-mono font-bold shrink-0">
            {filteredList.length} of {internalExtensions.length} listed
          </span>
        </div>

        {/* Directory Entries Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-slate-100/70">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border-2 border-dashed border-slate-300 space-y-2">
              <PhoneForwarded className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No Extensions Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || selectedDepartmentFilter !== 'ALL'
                  ? 'No extension entries match your current search or department filter.'
                  : 'There are no internal extensions configured yet.'}
              </p>
              {!isAddFormOpen && (
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Extension</span>
                </button>
              )}
            </div>
          ) : viewMode === 'GROUPED_BY_DEPT' ? (
            /* ========================================================================= */
            /* VIEW 1: GROUPED BY DEPARTMENT                                             */
            /* ========================================================================= */
            <div className="space-y-4">
              {groupedByDepartment.map(group => (
                <div 
                  key={group.department}
                  className="bg-white rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden"
                >
                  {/* Department Section Header */}
                  <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-teal-400" />
                      <h4 className="font-black text-sm text-white tracking-wide uppercase">
                        {group.department} Department
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 border border-slate-700 font-mono">
                        {group.entries.length} Extensions
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDepartment(group.department);
                        setIsAddFormOpen(true);
                      }}
                      className="text-[11px] font-bold text-teal-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      title={`Add extension to ${group.department}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to {group.department}</span>
                    </button>
                  </div>

                  {/* Department Extension Cards */}
                  <div className="divide-y divide-slate-200">
                    {group.entries.map(entry => renderExtensionRow(entry))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW 2: NUMERIC LIST BY EXTENSION NUMBER                                  */
            /* ========================================================================= */
            <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xs divide-y divide-slate-200 overflow-hidden">
              {filteredList.map(entry => renderExtensionRow(entry))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="font-semibold">Dealership Internal Phone Directory & Extension Switchboard</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeInternalExtensionModal}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
        {/* Hidden Printable Document for Isolated Printing */}
        <div id="printable-internal-extensions" className="hidden">
          <div className="p-8 bg-white text-slate-900 font-sans max-w-4xl mx-auto">
            {/* Print Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                  {shopName || 'Dealership'} - Internal Phone & Extension Directory
                </h1>
                <p className="text-xs text-slate-600 mt-1 font-semibold">
                  Official Dealership Extension Listing • Post at Service Desks, Parts Counters & Technicians Floor
                </p>
              </div>
              <div className="text-right text-xs text-slate-500 font-mono">
                <div>Printed: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div className="font-bold text-slate-800">{internalExtensions.length} Active Extensions</div>
              </div>
            </div>

            {/* Department Sections */}
            <div className="space-y-6">
              {groupedByDepartment.map(group => (
                <div key={group.department} className="border border-slate-300 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex justify-between items-center">
                    <span className="font-black text-xs uppercase tracking-wider text-slate-900">
                      {group.department} Department
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 font-mono">
                      {group.entries.length} Extensions
                    </span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-600 border-b border-slate-200">
                        <th className="py-2 px-3 w-20">Ext #</th>
                        <th className="py-2 px-3">Name / Station</th>
                        <th className="py-2 px-3">Role / Title</th>
                        <th className="py-2 px-3">Direct Phone</th>
                        <th className="py-2 px-3">Location / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {group.entries.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-black text-sm text-slate-900">
                            {item.extension}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {item.name}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            {item.title || '—'}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-800">
                            {item.directPhone || '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 italic text-[11px]">
                            {item.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-500 font-mono">
              Confidential • For Internal Dealership Use Only • Keep Updated
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Helper to render an individual extension row / card
  function renderExtensionRow(entry: InternalExtensionEntry) {
    const isEditingThis = editingId === entry.id;

    if (isEditingThis) {
      return (
        <div key={entry.id} className="p-4 bg-teal-50/50 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-black text-teal-900 uppercase">
              Editing Extension {entry.extension}
            </span>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Name / Station *</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Extension Number *</label>
              <input
                type="text"
                value={editExtension}
                onChange={e => setEditExtension(e.target.value)}
                className="w-full text-xs font-mono font-black p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Department</label>
              <input
                type="text"
                value={editDepartment}
                onChange={e => setEditDepartment(e.target.value)}
                className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Job Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Direct Dial Phone</label>
              <input
                type="tel"
                value={editDirectPhone}
                onChange={e => setEditDirectPhone(e.target.value)}
                className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Notes / Location</label>
              <input
                type="text"
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
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
              className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
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
        className="p-3.5 sm:p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        {/* Left: Extension badge, Name, Title, Dept */}
        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
          {/* Big Bold Extension Badge */}
          <div className="flex flex-col items-center justify-center min-w-[70px] bg-slate-950 text-white p-2 rounded-xl border border-slate-800 shadow-2xs shrink-0">
            <span className="text-[9px] uppercase font-bold tracking-wider text-teal-400">EXT.</span>
            <span className="font-mono font-black text-lg text-white tracking-tight leading-none">
              {entry.extension}
            </span>
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-black text-slate-950 tracking-tight">
                {entry.name}
              </h4>

              {/* Department Tag */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getDeptColor(entry.department)}`}>
                {entry.department}
              </span>

              {/* Job Title */}
              {entry.title && (
                <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-slate-400" />
                  <span>{entry.title}</span>
                </span>
              )}
            </div>

            {/* Direct Phone & Notes */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600">
              {entry.directPhone && (
                <div className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-teal-600" />
                  <span>Direct: </span>
                  <a 
                    href={`tel:${entry.directPhone.replace(/[^0-9]/g, '')}`}
                    className="font-bold text-slate-900 hover:text-teal-700 underline"
                  >
                    {entry.directPhone}
                  </a>
                </div>
              )}

              {entry.notes && (
                <span className="text-slate-500 italic">
                  {entry.notes}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Copy Extension Button & Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {/* Copy Extension Button */}
          <button
            type="button"
            onClick={() => handleCopy(entry.extension, `ext_${entry.id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title={`Copy extension ${entry.extension} to clipboard`}
          >
            {copiedKey === `ext_${entry.id}` ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-teal-600" />
                <span>Copy Ext</span>
              </>
            )}
          </button>

          {/* Edit Button */}
          <button
            type="button"
            onClick={() => handleStartEdit(entry)}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 shadow-2xs cursor-pointer"
            title="Edit Extension Entry"
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
                  deleteInternalExtension(entry.id);
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
              title="Delete extension entry"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }
};
