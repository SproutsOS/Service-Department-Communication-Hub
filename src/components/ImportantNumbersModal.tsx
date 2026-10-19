import React, { useState, useMemo } from 'react';
import { 
  X, 
  Phone, 
  PhoneCall, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Trash2, 
  Edit2, 
  CheckCheck,
  Bookmark,
  KeyRound,
  ExternalLink,
  Building2,
  Clock,
  ShieldAlert,
  PhoneForwarded
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ImportantNumberEntry } from '../types';

const COMMON_CATEGORIES = [
  'Warranty Hotlines',
  'Diagnostic Support',
  'Parts Couriers',
  'Towing & Sublet',
  'Sublet Vendors',
  'IT & DMS Support',
  'OEM Reps & District',
  'Insurance Adjusters',
  'Alarm & Security',
  'Emergency & Facilities'
];

export const ImportantNumbersModal: React.FC = () => {
  const { 
    isImportantNumbersModalOpen, 
    closeImportantNumbersModal, 
    importantNumbers, 
    addImportantNumber, 
    updateImportantNumber, 
    deleteImportantNumber,
    openSpecialPartsModal,
    openManagerPasswordsModal,
    openRecallWaitingModal,
    openInternalExtensionModal,
    specialParts,
    managerPasswords,
    recallWaitingList,
    internalExtensions
  } = useApp();

  const [newCategory, setNewCategory] = useState('');
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Extract all unique categories from existing numbers + common presets
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    importantNumbers.forEach(n => {
      if (n.category && n.category.trim()) set.add(n.category.trim());
    });
    COMMON_CATEGORIES.forEach(c => set.add(c));
    return Array.from(set);
  }, [importantNumbers]);

  // Categories currently in use by active numbers
  const activeCategories = useMemo(() => {
    const cats = new Set<string>();
    importantNumbers.forEach(n => {
      if (n.category && n.category.trim()) cats.add(n.category.trim());
    });
    return Array.from(cats);
  }, [importantNumbers]);

  // Filtered numbers based on search and category filter
  const filteredNumbers = useMemo(() => {
    return importantNumbers.filter(n => {
      if (selectedCategoryFilter !== 'ALL' && n.category !== selectedCategoryFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        (n.category && n.category.toLowerCase().includes(q)) ||
        (n.name && n.name.toLowerCase().includes(q)) ||
        (n.number && n.number.toLowerCase().includes(q)) ||
        (n.notes && n.notes.toLowerCase().includes(q))
      );
    });
  }, [importantNumbers, searchQuery, selectedCategoryFilter]);

  // Grouped numbers by category for clean sectioned layout
  const groupedNumbers = useMemo(() => {
    const groups: Record<string, ImportantNumberEntry[]> = {};
    filteredNumbers.forEach(n => {
      const cat = n.category?.trim() || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(n);
    });
    return groups;
  }, [filteredNumbers]);

  if (!isImportantNumbersModalOpen) return null;

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCat = newCategory.trim();
    const cleanName = newName.trim();
    const cleanNum = newNumber.trim();
    const cleanNotes = newNotes.trim();
    if (!cleanCat || !cleanNum) return;

    addImportantNumber(cleanCat, cleanName || cleanCat, cleanNum, cleanNotes || undefined);
    setNewName('');
    setNewNumber('');
    setNewNotes('');
    // Keep category selected for rapid batch entry of same category items
  };

  const handleStartEdit = (entry: ImportantNumberEntry) => {
    setEditingId(entry.id);
    setEditCategory(entry.category || 'General');
    setEditName(entry.name || '');
    setEditNumber(entry.number || '');
    setEditNotes(entry.notes || '');
  };

  const handleSaveEdit = (id: string) => {
    const cleanCat = editCategory.trim();
    const cleanName = editName.trim();
    const cleanNum = editNumber.trim();
    const cleanNotes = editNotes.trim();
    if (!cleanCat || !cleanNum) return;

    updateImportantNumber(id, cleanCat, cleanName || cleanCat, cleanNum, cleanNotes || undefined);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCategory('');
    setEditName('');
    setEditNumber('');
    setEditNotes('');
  };

  const handleCopy = (entry: ImportantNumberEntry) => {
    try {
      navigator.clipboard.writeText(entry.number);
      setCopiedId(entry.id);
      setTimeout(() => {
        setCopiedId(prev => prev === entry.id ? null : prev);
      }, 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handleSwitchTab = (tab: 'parts' | 'numbers' | 'passwords' | 'recalls' | 'extensions') => {
    if (tab === 'parts') {
      closeImportantNumbersModal();
      openSpecialPartsModal();
    } else if (tab === 'passwords') {
      closeImportantNumbersModal();
      openManagerPasswordsModal();
    } else if (tab === 'recalls') {
      closeImportantNumbersModal();
      openRecallWaitingModal();
    } else if (tab === 'extensions') {
      closeImportantNumbersModal();
      openInternalExtensionModal();
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Navigation Tabs Bar */}
        <div className="bg-slate-950 px-5 pt-3 pb-1 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold shadow-xs cursor-default"
            >
              <Phone className="w-3.5 h-3.5 text-blue-200" />
              <span>Important Numbers</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-800 text-blue-100 font-mono">
                {importantNumbers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('passwords')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span>Passwords</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-emerald-300 font-mono">
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
            onClick={closeImportantNumbersModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-auto"
            title="Close directory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500 text-white shadow-sm">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Important Phone Numbers & Hotlines
                </h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40">
                  {importantNumbers.length} Saved
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Service Manager quick-dial phone directory organized by Category, Contact, and Direct Line
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick Add Form */}
          <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>+ Add Category & Phone Number</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Enter category, contact name, and phone number for 1-click clipboard copy and dial
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {/* 1. Category */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="phone-category-suggestions"
                    placeholder="e.g. Warranty Hotlines, Towing..."
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
                  />
                  <datalist id="phone-category-suggestions">
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 2. Contact / Department Name */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Contact / Department <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mopar Warranty Prior Auth"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-950 placeholder:text-slate-400"
                />
              </div>

              {/* 3. Phone / Direct Line */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1-800-442-2666 or (555) 321-4490"
                  value={newNumber}
                  onChange={e => setNewNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-950 placeholder:text-slate-400"
                />
              </div>

              {/* 4. Notes / Extension / Hours */}
              <div className="sm:col-span-12">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Notes / Extension / Hours <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ext. 4, Account #9042, 8am-8pm EST"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {/* Quick Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-[10px]">
                <span className="font-bold text-slate-500 uppercase tracking-wider shrink-0">Quick Pick:</span>
                {COMMON_CATEGORIES.slice(0, 5).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className="px-2 py-0.5 rounded-full bg-slate-200 hover:bg-blue-100 hover:text-blue-900 text-slate-700 font-semibold cursor-pointer shrink-0 transition-colors"
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!newCategory.trim() || !newNumber.trim()}
                className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Number</span>
              </button>
            </div>
          </form>

          {/* Search Bar & Category Filter Pills */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by category, contact name, phone number, or notes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            {activeCategories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer shrink-0 ${
                    selectedCategoryFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  All Categories ({importantNumbers.length})
                </button>
                {activeCategories.map(cat => {
                  const count = importantNumbers.filter(n => n.category === cat).length;
                  const isSelected = selectedCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(isSelected ? 'ALL' : cat)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Numbers List: Grouped by Category */}
          <div className="space-y-4">
            {filteredNumbers.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6 space-y-2">
                <Phone className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  {searchQuery 
                    ? `No phone numbers match "${searchQuery}"` 
                    : selectedCategoryFilter !== 'ALL' 
                    ? `No contacts saved under "${selectedCategoryFilter}"` 
                    : 'No important numbers added yet'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {searchQuery 
                    ? 'Try searching with a different category or contact name.' 
                    : 'Use the form above to add your first department or vendor phone number.'}
                </p>
                {(searchQuery || selectedCategoryFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategoryFilter('ALL');
                    }}
                    className="mt-1 text-xs text-blue-600 hover:underline font-bold cursor-pointer"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            ) : (
              Object.entries(groupedNumbers).map(([categoryName, items]) => (
                <div key={categoryName} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {/* Category Header */}
                  <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <h4 className="font-black text-xs uppercase tracking-wider text-slate-800">
                        {categoryName}
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      {items.length} contact{items.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Category Items */}
                  <div className="divide-y divide-slate-100">
                    {items.map(entry => {
                      const isEditing = editingId === entry.id;
                      const isCopied = copiedId === entry.id;

                      if (isEditing) {
                        return (
                          <div key={entry.id} className="p-3 bg-blue-50/60 flex flex-col sm:flex-row items-center gap-2">
                            <input
                              type="text"
                              value={editCategory}
                              onChange={e => setEditCategory(e.target.value)}
                              placeholder="Category"
                              className="w-full sm:w-36 px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white border border-blue-400 rounded-lg focus:outline-none"
                              autoFocus
                            />
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              placeholder="Contact / Department Name"
                              className="w-full sm:w-44 px-2.5 py-1.5 text-xs font-bold text-slate-950 bg-white border border-blue-400 rounded-lg focus:outline-none"
                            />
                            <input
                              type="text"
                              value={editNumber}
                              onChange={e => setEditNumber(e.target.value)}
                              placeholder="Phone Number"
                              className="w-full sm:w-36 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-950 bg-white border border-blue-400 rounded-lg focus:outline-none"
                            />
                            <input
                              type="text"
                              value={editNotes}
                              onChange={e => setEditNotes(e.target.value)}
                              placeholder="Optional Notes / Ext."
                              className="flex-1 w-full px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-blue-400 rounded-lg focus:outline-none"
                            />
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(entry.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // Clean digits for tel link
                      const dialNumber = entry.number.replace(/[^0-9+]/g, '');

                      return (
                        <div 
                          key={entry.id}
                          className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* Name and Notes */}
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300 shrink-0">
                              {entry.category}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={entry.name}>
                                {entry.name}
                              </div>
                              {entry.notes && (
                                <div className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1" title={entry.notes}>
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0 inline" />
                                  <span>{entry.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Phone Number & Actions */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            {/* Click to Call link if valid tel format */}
                            {dialNumber && (
                              <a
                                href={`tel:${dialNumber}`}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                title={`Click to dial ${entry.number}`}
                              >
                                <PhoneCall className="w-4 h-4" />
                              </a>
                            )}

                            {/* 1-Click Copy Phone Number Button */}
                            <button
                              type="button"
                              onClick={() => handleCopy(entry)}
                              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                isCopied
                                  ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-300'
                                  : 'bg-slate-900 hover:bg-slate-800 text-blue-300 border-slate-950 hover:border-slate-800'
                              }`}
                              title="Click to copy phone number to clipboard"
                            >
                              {isCopied ? (
                                <>
                                  <CheckCheck className="w-4 h-4 text-white" />
                                  <span>COPIED!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
                                  <span>{entry.number}</span>
                                </>
                              )}
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(entry)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit contact, category, or number"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => deleteImportantNumber(entry.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete this phone number"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              Showing {filteredNumbers.length} of {importantNumbers.length} contact{importantNumbers.length === 1 ? '' : 's'} across {activeCategories.length} categor{activeCategories.length === 1 ? 'y' : 'ies'}
            </span>
          </div>

          <button
            type="button"
            onClick={closeImportantNumbersModal}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
