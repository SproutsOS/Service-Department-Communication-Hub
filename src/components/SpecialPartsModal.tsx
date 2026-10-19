import React, { useState, useMemo } from 'react';
import { 
  X, 
  Tag, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Trash2, 
  Edit2, 
  CheckCheck,
  Bookmark,
  Layers,
  Sparkles,
  Filter,
  Phone,
  KeyRound,
  ShieldAlert,
  PhoneForwarded
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SpecialPartNumber } from '../types';

const COMMON_CATEGORIES = [
  'Oil Filters',
  'Drain Plugs & Gaskets',
  'Cabin & Air Filters',
  'Batteries & Key Fobs',
  'Wipers & Blades',
  'Fluids & Chemicals',
  'Brakes & Hardware',
  'Bulbs & Electrical',
  'Fasteners & Clips',
  'Shop Supplies'
];

export const SpecialPartsModal: React.FC = () => {
  const { 
    isSpecialPartsModalOpen, 
    closeSpecialPartsModal, 
    specialParts, 
    addSpecialPart, 
    updateSpecialPart, 
    deleteSpecialPart,
    openImportantNumbersModal,
    openManagerPasswordsModal,
    openRecallWaitingModal,
    openInternalExtensionModal,
    importantNumbers,
    managerPasswords,
    recallWaitingList,
    internalExtensions
  } = useApp();

  const [newCategory, setNewCategory] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editPartNumber, setEditPartNumber] = useState('');
  const [editName, setEditName] = useState('');

  // Extract all unique categories from existing parts + common presets
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    specialParts.forEach(p => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    COMMON_CATEGORIES.forEach(c => set.add(c));
    return Array.from(set);
  }, [specialParts]);

  // Categories currently in use by active parts
  const activeCategories = useMemo(() => {
    const cats = new Set<string>();
    specialParts.forEach(p => {
      if (p.category && p.category.trim()) cats.add(p.category.trim());
    });
    return Array.from(cats);
  }, [specialParts]);

  // Filtered parts based on search and category filter
  const filteredParts = useMemo(() => {
    return specialParts.filter(p => {
      if (selectedCategoryFilter !== 'ALL' && p.category !== selectedCategoryFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.partNumber && p.partNumber.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q))
      );
    });
  }, [specialParts, searchQuery, selectedCategoryFilter]);

  // Grouped parts by category for clean sectioned layout
  const groupedParts = useMemo(() => {
    const groups: Record<string, SpecialPartNumber[]> = {};
    filteredParts.forEach(p => {
      const cat = p.category?.trim() || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredParts]);

  if (!isSpecialPartsModalOpen) return null;

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCat = newCategory.trim();
    const cleanPn = newPartNumber.trim().toUpperCase();
    const cleanName = newName.trim();
    if (!cleanCat || !cleanPn) return;

    addSpecialPart(cleanCat, cleanPn, cleanName || undefined);
    setNewPartNumber('');
    setNewName('');
    // Keep category for rapid batch entry of same category items
  };

  const handleStartEdit = (part: SpecialPartNumber) => {
    setEditingId(part.id);
    setEditCategory(part.category || 'General');
    setEditPartNumber(part.partNumber);
    setEditName(part.name || '');
  };

  const handleSaveEdit = (id: string) => {
    const cleanCat = editCategory.trim();
    const cleanPn = editPartNumber.trim().toUpperCase();
    const cleanName = editName.trim();
    if (!cleanCat || !cleanPn) return;

    updateSpecialPart(id, cleanCat, cleanPn, cleanName || undefined);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCategory('');
    setEditPartNumber('');
    setEditName('');
  };

  const handleCopy = (part: SpecialPartNumber) => {
    try {
      navigator.clipboard.writeText(part.partNumber);
      setCopiedId(part.id);
      setTimeout(() => {
        setCopiedId(prev => prev === part.id ? null : prev);
      }, 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handleSwitchTab = (tab: 'parts' | 'numbers' | 'passwords' | 'recalls' | 'extensions') => {
    if (tab === 'numbers') {
      closeSpecialPartsModal();
      openImportantNumbersModal();
    } else if (tab === 'passwords') {
      closeSpecialPartsModal();
      openManagerPasswordsModal();
    } else if (tab === 'recalls') {
      closeSpecialPartsModal();
      openRecallWaitingModal();
    } else if (tab === 'extensions') {
      closeSpecialPartsModal();
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold shadow-xs cursor-default"
            >
              <Bookmark className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
              <span>Special Parts</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-amber-300 font-mono">
                {specialParts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('numbers')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              <span>Important Numbers</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-blue-300 font-mono">
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
            onClick={closeSpecialPartsModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-auto"
            title="Close directory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shadow-sm">
              <Bookmark className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Special Part Numbers by Category
                </h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                  {specialParts.length} Saved
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Service Manager quick-reference directory organized by Category and Part Number
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick Add Form: Category and Part Number */}
          <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>+ Add Category & Part Number</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Enter category and part number for instant 1-click clipboard copy
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {/* 1. Category */}
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="category-suggestions"
                    placeholder="e.g. Oil Filters, Gaskets, Batteries..."
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
                  />
                  <datalist id="category-suggestions">
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 2. Part Number */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Part Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 68191349AC"
                  value={newPartNumber}
                  onChange={e => setNewPartNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono font-black bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-950 uppercase placeholder:text-slate-400"
                />
              </div>

              {/* 3. Optional Description */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3.6L Pentastar"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
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
                disabled={!newCategory.trim() || !newPartNumber.trim()}
                className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Part</span>
              </button>
            </div>
          </form>

          {/* Search Bar & Category Filter Pills */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by category, part number, or description..."
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
                  All Categories ({specialParts.length})
                </button>
                {activeCategories.map(cat => {
                  const count = specialParts.filter(p => p.category === cat).length;
                  const isSelected = selectedCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(isSelected ? 'ALL' : cat)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-amber-800 text-amber-100' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Parts List: Grouped by Category */}
          <div className="space-y-4">
            {filteredParts.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6 space-y-2">
                <Tag className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  {searchQuery 
                    ? `No part numbers match "${searchQuery}"` 
                    : selectedCategoryFilter !== 'ALL' 
                    ? `No parts saved under "${selectedCategoryFilter}"` 
                    : 'No special part numbers added yet'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {searchQuery 
                    ? 'Try searching with a different category or part number.' 
                    : 'Use the form above to add your first category and part number.'}
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
              Object.entries(groupedParts).map(([categoryName, items]) => (
                <div key={categoryName} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {/* Category Header */}
                  <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-3.5 h-3.5 text-amber-600 fill-amber-600/30" />
                      <h4 className="font-black text-xs uppercase tracking-wider text-slate-800">
                        {categoryName}
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      {items.length} part{items.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Category Items */}
                  <div className="divide-y divide-slate-100">
                    {items.map(part => {
                      const isEditing = editingId === part.id;
                      const isCopied = copiedId === part.id;

                      if (isEditing) {
                        return (
                          <div key={part.id} className="p-3 bg-blue-50/60 flex flex-col sm:flex-row items-center gap-2">
                            <input
                              type="text"
                              value={editCategory}
                              onChange={e => setEditCategory(e.target.value)}
                              placeholder="Category"
                              className="w-full sm:w-44 px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white border border-blue-400 rounded-lg focus:outline-none"
                              autoFocus
                            />
                            <input
                              type="text"
                              value={editPartNumber}
                              onChange={e => setEditPartNumber(e.target.value.toUpperCase())}
                              placeholder="Part Number"
                              className="w-full sm:w-40 px-2.5 py-1.5 text-xs font-mono font-black text-slate-950 bg-white border border-blue-400 rounded-lg focus:outline-none uppercase"
                            />
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              placeholder="Optional Description"
                              className="flex-1 w-full px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-blue-400 rounded-lg focus:outline-none"
                            />
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(part.id)}
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

                      return (
                        <div 
                          key={part.id}
                          className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* Category and Name / Description */}
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300 shrink-0">
                              {part.category}
                            </span>
                            {part.name ? (
                              <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate" title={part.name}>
                                {part.name}
                              </span>
                            ) : null}
                          </div>

                          {/* Part Number & Actions */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            {/* 1-Click Copy Part Number Button */}
                            <button
                              type="button"
                              onClick={() => handleCopy(part)}
                              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono font-black text-xs sm:text-sm transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                isCopied
                                  ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-300'
                                  : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-950 hover:border-slate-800'
                              }`}
                              title="Click to copy part number to clipboard"
                            >
                              {isCopied ? (
                                <>
                                  <CheckCheck className="w-4 h-4 text-white" />
                                  <span>COPIED!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
                                  <span>{part.partNumber}</span>
                                </>
                              )}
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(part)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit category, part number, or description"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => deleteSpecialPart(part.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete this part"
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
              Showing {filteredParts.length} of {specialParts.length} part{specialParts.length === 1 ? '' : 's'} across {activeCategories.length} categor{activeCategories.length === 1 ? 'y' : 'ies'}
            </span>
          </div>

          <button
            type="button"
            onClick={closeSpecialPartsModal}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
